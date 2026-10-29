// The thin Lyceum server (spec Section 1). Its jobs:
//   POST /api/parse            file bytes in, ParsedDoc out (xlsx/csv/pdf/pptx/docx)
//   POST /api/agent/:name      LLM proxy on the LYCEUM_AGENT_* model: intake
//                              returns JSON; the free-text agents answer as SSE
//   /api/collect, /api/survey  the research run's board collection, and the
//                              booth's survey collector (depth plan Section 7.2)
// No model or an LLM error never breaks the client: routes answer with
// { fallback: true } or an error status and the client falls back to its
// deterministic local path.

import "./env.ts"; // first: loads api/.env before any other module reads its settings
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { serve, type HttpBindings } from "@hono/node-server";
import { parseSheet } from "./parse/sheet.ts";
import { parsePdf } from "./parse/pdf.ts";
import { parseDocx, parsePptx } from "./parse/office.ts";
import { startWatching, watchRoutes } from "./watch.ts";
import { agentModel, outlineModel, draftModelItems, proposeMappings, suggestSlides, proposeQuotes, runIntakeLLM, streamAgentLLM, suggestRevision } from "./llm.ts";
import { CollectError, collectBoard } from "./collect.ts";
import { filterPostings } from "../shared/lib/collect.ts";
import { missingSettings, publicSettings, type AgentSettings } from "../shared/lib/agentSettings.ts";
import type { MappingRequest, QuoteRequest } from "../shared/lib/proposals.ts";
import type { ItemRequest } from "../shared/lib/items.ts";
import type { SuggestionRequest } from "../shared/lib/slides.ts";
import { ENV_PATH, liveDeps, loadAgentSettings, runAgentSearch, TOOLS, type Chat } from "./agentSearch.ts";
import { searchWeb } from "./webTools.ts";
import { readOutline, MAX_OUTLINE_CHARS } from "./outline.ts";
import { AccountStore, accountRoutes, requireUser, signedInAs, supabaseDeps, type AuthDeps } from "./account.ts";
import { aiCitation, withoutStudentIdentity } from "../shared/lib/compliance.ts";
import { clearOldContent, countryOf, newContext, recordedChat, describePosting, recordProposals, recordVerdict, VERDICTS, type Helper, type Offer, type Verdict } from "./record.ts";
import type { MentionProposal } from "../shared/lib/evidence.ts";
import type { MappingSuggestion } from "../shared/lib/proposals.ts";
import type { RevisionSuggestion } from "../shared/lib/revision.ts";
import type { DraftItem, SlideSuggestion } from "../shared/types.ts";
import { DATABASE_URL, postgresDb } from "./db.ts";
import { forgetUploads, keepUpload, r2FromEnv } from "./storage.ts";
import { createHash } from "node:crypto";
import { networkInterfaces } from "node:os";

const app = new Hono();

// The API answers the laptop it runs on. A phone on the booth's network reaches two routes only, through the web server's
// proxy or directly: posting an answer and reading a form by its token. So nobody on that network can call the model route
// (which spends from a key in .env), parse a file, open a form or read the collector's responses; the guard runs before CORS.
const LOOPBACK = /^(127\.|::1$|::ffff:127\.)/;
const phoneRoute = (method: string, path: string) =>
  (method === "POST" && /^\/api\/survey\/[A-Za-z0-9_-]{22}$/.test(path)) || (method === "GET" && /^\/api\/survey\/[A-Za-z0-9_-]{22}\/form$/.test(path));
// Online (LYCEUM_ONLINE=1, on Render) every request comes from elsewhere, the host's health check and the web app's
// proxy included, so the guard is off there. LYCEUM_REQUIRE_SIGN_IN=1 also limits the routes that spend to signed-in
// people (below), and on its own still means online.
const REQUIRE_SIGN_IN = process.env.LYCEUM_REQUIRE_SIGN_IN === "1";
const ONLINE = process.env.LYCEUM_ONLINE === "1" || REQUIRE_SIGN_IN;
app.use("/api/*", async (c, next) => {
  const from = (c.env as HttpBindings | undefined)?.incoming?.socket?.remoteAddress ?? "";
  if (!ONLINE && !LOOPBACK.test(from) && !phoneRoute(c.req.method, c.req.path)) return c.json({ error: "this API answers the laptop it runs on" }, 403);
  await next();
});
app.use("/api/*", cors());

// Accounts: Supabase Auth signs people in (email and password, or Google) and issues the token each request carries;
// api/account.ts checks it and keeps each account's profile and workspace in the Supabase database at DATABASE_URL.
const database = postgresDb(DATABASE_URL); // one pool; it connects when first asked and again after the database restarts
// Uploads are kept in R2 when S3_* is set (api/storage.ts). Deleting an account deletes its files first, so a cancelled
// sign-up leaves nothing behind; if the bucket is unreachable the account waits for the next hourly purge.
const bucket = r2FromEnv();
const supabase = supabaseDeps();
const authDeps: AuthDeps = { ...supabase, async deleteUser(id) { if (bucket) await forgetUploads(database, bucket, id); await supabase.deleteUser(id); } };
const accounts = new AccountStore(database, authDeps);
accountRoutes(app, accounts, authDeps);
// Online, the model, search, settings and parse routes spend money or CPU, so LYCEUM_REQUIRE_SIGN_IN=1 limits them to
// signed-in people. Off by default: on a laptop the loopback guard above already protects them, and the demo's people
// (who have no Supabase account) still use them. Registered before those routes, as Hono runs handlers in order.
if (REQUIRE_SIGN_IN)
  for (const path of ["/api/agent/*", "/api/agent-search", "/api/agent-settings", "/api/agent-settings/*", "/api/parse", "/api/collect/*"]) app.use(path, requireUser(authDeps));
// Sign-ups left unfinished for a day are deleted, at start and then hourly.
const purgePending = () => accounts.purgePending().catch((err) => console.error("purging unfinished sign-ups failed:", err instanceof Error ? err.message : err));
void purgePending();
setInterval(purgePending, 60 * 60 * 1000).unref();
// Every model call is recorded (api/record.ts): by whom (the session's token, or nobody for a demo persona), for which
// course (the x-lyceum-course header the browser sends), through which helper. What was sent and came back is cleared
// after 30 days, hourly; the rest stays for the metrics.
const callContext = async (c: Context, helper: Helper) => {
  const userId = (await signedInAs(c, authDeps).catch(() => null))?.id ?? null;
  return newContext(helper, c.req.path, userId, c.req.header("x-lyceum-course") ?? null, await countryOf(database, userId));
};
const chatFor = async (c: Context, helper: Helper, s: AgentSettings) => recordedChat(database, s, await callContext(c, helper));
/** A route's recorded context and model client together, when the route also records what the helper offers. */
const recording = async (c: Context, helper: Helper, s: AgentSettings) => { const ctx = await callContext(c, helper); return { ctx, chat: recordedChat(database, s, ctx) }; };
// The lecturer's verdict on one proposal: accepted, edited (then accepted) or dismissed with an optional reason. Only an
// account's own proposals; a demo persona's are recorded without an account and take no verdicts.
app.post("/api/proposals/:id/verdict", async (c) => {
  const who = await signedInAs(c, authDeps).catch(() => null);
  if (!who) return c.json({ error: "Sign in first." }, 401);
  const body = (await c.req.json().catch(() => ({}))) as { verdict?: unknown; reason?: unknown };
  if (!VERDICTS.includes(body.verdict as Verdict)) return c.json({ error: "The verdict is accepted, edited or dismissed." }, 400);
  try {
    const found = await recordVerdict(database, who.id, c.req.param("id") ?? "", body.verdict as Verdict, typeof body.reason === "string" ? body.reason : null);
    return found ? c.json({ ok: true }) : c.json({ error: "No such proposal of yours." }, 404);
  } catch (err) {
    console.error("verdict failed:", err);
    return c.json({ error: "The verdict could not be recorded." }, 503);
  }
});
const clearContent = () => clearOldContent(database).catch((err) => console.error("clearing old model content failed:", err instanceof Error ? err.message : err));
void clearContent();
setInterval(clearContent, 60 * 60 * 1000).unref();
// Watching on a schedule (api/watch.ts): each signed-in account's courses, checked every 15 minutes.
watchRoutes(app, authDeps, database);
if (process.env.LYCEUM_WATCH !== "off") startWatching(database);

app.get("/api/health", async (c) => {
  const { s, missing } = await agentModel();
  return c.json({ ok: true, live: !missing.length, model: missing.length ? null : s.model.model });
});

app.post("/api/parse", async (c) => {
  const name = c.req.query("name") ?? "upload.bin";
  const ext = name.split(".").pop()?.toLowerCase();
  const buf = Buffer.from(await c.req.arrayBuffer());
  if (buf.length === 0) return c.json({ error: "empty file" }, 400);
  if (buf.length > 20 * 1024 * 1024) return c.json({ error: "file too large (20 MB cap)" }, 413);
  // An account's original is kept before it is read, so a file with no text to read (a scanned outline) is still there
  // for OCR later. Keeping it never blocks reading it: a bucket that fails is logged and the upload carries on.
  const who = bucket ? await signedInAs(c, authDeps).catch(() => null) : null;
  const kept = bucket && who ? await keepUpload(database, bucket, who.id, name, buf).catch((err) => { console.error("keeping the upload failed:", name, err); return null; }) : null;
  const reply = (doc: object) => c.json(kept ? { ...doc, fileId: kept.id } : doc);
  try {
    if (ext === "xlsx" || ext === "xls") return reply(parseSheet(buf, name, "xlsx"));
    if (ext === "csv") return reply(parseSheet(buf, name, "csv"));
    if (ext === "pdf") return reply(await parsePdf(buf, name));
    if (ext === "pptx") return reply(await parsePptx(buf, name));
    if (ext === "docx") return reply(await parseDocx(buf, name));
    return c.json({ error: `unsupported extension .${ext}` }, 415);
  } catch (err) {
    console.error("parse failed:", name, err);
    return c.json({ error: "could not read this file" }, 422);
  }
});

// The research run: one permitted employer board, fetched on request, cached an hour, rate limited.
app.get("/api/collect/:provider/:board", async (c) => {
  const query = c.req.query("q") ?? "", inText = c.req.query("scope") === "text";
  try {
    const result = await collectBoard(c.req.param("provider"), c.req.param("board"));
    const postings = filterPostings(result.postings, query, inText).slice(0, 300);
    return c.json({ provider: result.provider, board: result.board, retrievedAt: result.retrievedAt, cached: result.cached, total: result.postings.length, postings,
      endpoint: result.endpoint, bytes: result.bytes, durationMs: result.durationMs });
  } catch (err) {
    if (err instanceof CollectError) {
      const status = err.status === 400 ? 400 : err.status === 404 ? 404 : err.status === 429 ? 429 : err.status === 504 ? 504 : 502;
      return c.json({ error: err.message }, status);
    }
    console.error("collect failed:", err);
    return c.json({ error: "The board could not be collected." }, 502);
  }
});

// Agent web search (api/agentSearch.ts). Its settings come from .env; the browser only ever sees key hints.
app.get("/api/agent-settings", async (c) => {
  const s = await loadAgentSettings();
  return c.json({ settings: publicSettings(s), missing: missingSettings(s), path: ENV_PATH });
});
app.post("/api/agent-settings/test/:target", async (c) => {
  const s = await loadAgentSettings(), target = c.req.param("target");
  try {
    if (target === "model") {
      if (!s.model.baseUrl || !s.model.model) return c.json({ ok: false, error: "Set LYCEUM_AGENT_MODEL (and LYCEUM_AGENT_BASE_URL for a custom endpoint) in .env first." });
      const reply = await (await chatFor(c, "settings", s))([{ role: "user", content: "Call the web_search tool with the query \"connection test\". Do nothing else." }], TOOLS);
      const called = reply.tool_calls?.some((t) => t.function.name === "web_search");
      return c.json({ ok: true, detail: called ? "The model answered and called a tool, so tool calling works." : "The model answered but did not call the tool. It may not support tool calling well; try another model.", toolCalling: Boolean(called) });
    }
    if (target === "search") {
      const r = await searchWeb(s.search, "software engineer job posting", s.search.timeFilter, 5);
      const skipped = r.skipped.map((x) => x.provider + " skipped (" + x.why + ")").join("; ");
      return c.json({ ok: r.hits.length > 0, detail: r.hits.length + " results from " + (r.provider ?? "no provider") + (r.hits[0] ? ", the first: " + r.hits[0].title + " (" + r.hits[0].url + ")" : "") + (skipped ? ". " + skipped : ""),
        error: r.hits.length ? undefined : "No provider found results. " + skipped });
    }
    return c.json({ error: "unknown test" }, 404);
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
// Onboarding's outline import (api/outline.ts): a parsed document's text in, the model's proposal out, checked against
// the text. Uses the model in .env; without one it says so, and the lecturer types the outline instead.
app.post("/api/agent/outline", async (c) => {
  let body: { text?: unknown; fileName?: unknown };
  try { body = await c.req.json(); } catch { return c.json({ error: "Send the outline's text as JSON." }, 400); }
  const text = typeof body.text === "string" ? body.text : "", fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 200) : "outline";
  if (text.trim().length < 40) return c.json({ error: "That file has too little text to read an outline from. Is it a scanned image?" }, 400);
  const { s, missing: needs } = await outlineModel();
  if (needs.length) return c.json({ error: "Reading an outline needs the model set up: add " + needs.join(", ") + " to .env (see Settings). You can type the outcomes below instead." }, 400);
  try {
    let { ctx, chat } = await recording(c, "folio", s), outline;
    try { outline = await readOutline(text, fileName, s, chat); }
    catch (err) {
      // The dedicated outline model refused (a free tier's rate limit) or failed: the agent model reads it instead.
      const main = await agentModel();
      if (main.s.model.model === s.model.model || main.missing.length) throw err;
      console.warn("outline model failed, reading with the agent model:", err instanceof Error ? err.message.slice(0, 200) : err);
      ({ ctx, chat } = await recording(c, "folio", main.s));
      outline = await readOutline(text, fileName, main.s, chat);
    }
    const outcomes = await recordProposals(database, ctx, outline.outcomes, (o) => ({ kind: "outcome", summary: o.text, payload: o }));
    const topics = await recordProposals(database, ctx, outline.topics, (t) => ({ kind: "topic", summary: t.title, payload: t }));
    return c.json({ outline: { ...outline, outcomes, topics }, truncated: text.length > MAX_OUTLINE_CHARS });
  } catch (err) {
    console.error("outline read failed:", err);
    return c.json({ error: "The model could not read this outline: " + (err instanceof Error ? err.message : String(err)).slice(0, 300) + " You can type the outcomes below instead." }, 502);
  }
});

// Quill's suggestions on an open revision (shared/lib/revision.ts): the outline and the gaps in, checked suggestions out.
app.post("/api/agent/revision", async (c) => {
  let request: Parameters<typeof suggestRevision>[1];
  try { request = await c.req.json(); } catch { return c.json({ error: "Send the revision as JSON." }, 400); }
  if (!request?.course || !Array.isArray(request.course.outcomes) || !Array.isArray(request.gaps)) return c.json({ error: "Send the course outline and its gaps." }, 400);
  const { s, missing } = await agentModel();
  if (missing.length) return c.json({ error: "Suggestions need the model set up: add " + missing.join(", ") + " to .env (see Settings)." }, 400);
  try {
    const { ctx, chat } = await recording(c, "quill", s);
    const suggestions = await recordProposals(database, ctx, await suggestRevision(s, request, chat), (r: RevisionSuggestion) =>
      ({ kind: "revision", summary: r.kind + ": " + (r.kind === "add-topic" ? r.title : r.text), payload: r }));
    return c.json({ suggestions: suggestions.map((r) => ({ ...r, aiUse: aiCitation(s.model, new Date()) })) });
  } catch (err) {
    console.error("revision suggestions failed:", err);
    return c.json({ error: "The model could not suggest changes: " + (err instanceof Error ? err.message : String(err)).slice(0, 300) }, 502);
  }
});

// Lens's quotations and Atlas's mappings on Report (shared/lib/proposals.ts): checked proposals out, nothing recorded.
function proposalRoute<B, T extends object>(path: string, helper: Helper, valid: (body: B) => boolean, run: (s: AgentSettings, body: B, chat: Chat) => Promise<T[]>,
  describe: ((offer: T) => Offer) | null) {
  app.post("/api/agent/" + path, async (c) => {
    let body: B;
    try { body = await c.req.json(); } catch { return c.json({ error: "Send the request as JSON." }, 400); }
    if (!valid(body)) return c.json({ error: "That request is missing what the agent reads." }, 400);
    const { s, missing } = await agentModel();
    if (missing.length) return c.json({ error: "This needs the model set up: add " + missing.join(", ") + " to .env (see Settings)." }, 400);
    try {
      const { ctx, chat } = await recording(c, helper, s);
      const offers = await run(s, body, chat), kept = describe ? await recordProposals(database, ctx, offers, describe) : offers;
      // What Prism drafts goes to students, so each carries the citation the lecturer declares it with.
      return c.json({ [path]: helper === "prism" ? kept.map((o) => ({ ...o, aiUse: aiCitation(s.model, new Date()) })) : kept });
    } catch (err) {
      console.error(path + " proposals failed:", err);
      return c.json({ error: "The model could not propose " + path + ": " + (err instanceof Error ? err.message : String(err)).slice(0, 300) }, 502);
    }
  });
}
proposalRoute<QuoteRequest, MentionProposal>("quotes", "lens", (b) => Array.isArray(b?.postings), proposeQuotes,
  (q) => ({ kind: "quote", summary: q.skill + ": \"" + q.excerpt + "\"", payload: q }));
proposalRoute<MappingRequest, MappingSuggestion>("mappings", "atlas", (b) => Array.isArray(b?.skills) && Array.isArray(b?.outcomes), proposeMappings,
  (m) => ({ kind: "mapping", summary: m.skill + " -> " + (m.outcomes.join(", ") || "no outcome (a gap)"), payload: m }));
proposalRoute<SuggestionRequest, Omit<SlideSuggestion, "id" | "status">>("slide-suggestions", "prism",
  (b) => typeof b?.topic === "string" && Array.isArray(b?.outcomes) && (b.deck === null || (Array.isArray(b.deck) && b.deck.every((t) => typeof t === "string"))) && Array.isArray(b?.toAdd),
  suggestSlides, (x) => ({ kind: "slide", summary: (x.slide === null ? (x.minutes ? x.minutes + " min" : "the session") : (x.after ? "after slide " : "slide ") + x.slide) + ": " + x.text, payload: x }));
proposalRoute<ItemRequest, DraftItem>("items", "prism", (b) => Array.isArray(b?.outcomes) && b.outcomes.length > 0 && Array.isArray(b?.misconceptions), draftModelItems,
  (i) => ({ kind: "item", summary: i.kind + ": " + i.stem, payload: i }));

// One agent run, streamed as lines of JSON: {type:"log"} as it works, then {type:"done"} with the postings or {type:"error"}.
const AGENT_RUN_MS = 6 * 60 * 1000;
let agentRunning = false;
app.post("/api/agent-search", async (c) => {
  let body: { brief?: unknown; q?: unknown; scope?: unknown };
  try { body = await c.req.json(); } catch { return c.json({ error: "send the brief as JSON" }, 400); }
  const brief = typeof body.brief === "string" ? body.brief.trim().slice(0, 300) : "";
  if (brief.length < 3) return c.json({ error: "Describe what the agent should look for." }, 400);
  const s = await loadAgentSettings(), missing = missingSettings(s);
  if (missing.length) return c.json({ error: "Agent search is not set up yet. Add " + missing.join(", ") + " to .env (see .env.example and Settings)." }, 400);
  if (agentRunning) return c.json({ error: "An agent search is already running. Wait for it to finish." }, 429);
  agentRunning = true;
  const { ctx, chat } = await recording(c, "scout", s);
  const started = Date.now(), enc = new TextEncoder();
  c.header("content-type", "application/x-ndjson");
  c.header("cache-control", "no-cache");
  return c.body(new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (event: Record<string, unknown>) => { if (open) controller.enqueue(enc.encode(JSON.stringify(event) + "\n")); };
      const stop = new AbortController();
      const timer = setTimeout(() => stop.abort(new Error("The agent did not finish within " + AGENT_RUN_MS / 60000 + " minutes.")), AGENT_RUN_MS);
      try {
        const result = await runAgentSearch(brief, liveDeps(s, chat), s, (line) => send({ type: "log", line }), stop.signal);
        const query = typeof body.q === "string" ? body.q : "";
        send({ type: "done", postings: await recordProposals(database, ctx, filterPostings(result.postings, query, body.scope === "text"), describePosting), total: result.postings.length, retrievedAt: new Date(started).toISOString(),
          durationMs: Date.now() - started, summary: result.summary, pagesRead: result.pagesRead, searches: result.searches,
          endpoint: "/api/agent-search (" + s.model.model + ", " + s.search.provider + ")" });
      } catch (err) {
        console.error("agent search failed:", err);
        send({ type: "error", error: err instanceof Error ? err.message : "The agent search failed." });
      } finally {
        clearTimeout(timer);
        agentRunning = false;
        open = false;
        controller.close();
      }
    },
  }));
});

// The booth's survey collector (depth plan Section 7.2): append-only, in memory, one response per device, and nothing that
// identifies a student: no address, no header, no arrival time, only the random id the device drew and its answers. The
// token in the student's link is the first 22 characters of the reader secret's SHA-256, so the collector keeps no secret:
// a reader proves itself by hashing to the token, and the token alone can post but never read.
const BOOTH_FORMS = 200, BOOTH_PER_FORM = 500;
const booth = new Map<string, Map<string, { clientId: string; answers: Record<string, unknown> }>>();
const tokenOf = (reader: string) => createHash("sha256").update(reader).digest("base64url").slice(0, 22);
const TOKEN = /^[A-Za-z0-9_-]{22}$/, CLIENT = /^[A-Za-z0-9-]{8,64}$/;

// The laptop's addresses, for the link the lecturer shows, named by adapter and ranked by how likely a phone can reach them:
// Wi-Fi first, then the adapter Windows' mobile hotspot runs on, then wired, and virtual adapters (WSL, Hyper-V, VirtualBox,
// VMware, Docker, VPNs) last, marked, since a phone on the hotspot never reaches them.
const VIRTUAL = /vEthernet|WSL|Hyper-V|VirtualBox|vbox|VMware|vmnet|docker|^veth|virbr|^br-|Loopback|Bluetooth|Tailscale|ZeroTier|^utun|^tun|^tap/i;
const rankOf = (name: string) => (VIRTUAL.test(name) ? 3 : /wi-?fi|wlan|wireless|^wl|^en0$/i.test(name) ? 0 : /Local Area Connection\*/i.test(name) ? 1 : 2);
app.get("/api/survey/address", (c) => c.json({
  addresses: Object.entries(networkInterfaces())
    .flatMap(([name, list]) => (list ?? []).filter((a) => a.family === "IPv4" && !a.internal).map((a) => ({ name, address: a.address, virtual: rankOf(name) === 3, rank: rankOf(name) })))
    .sort((a, b) => a.rank - b.rank)
    .map(({ name, address, virtual }) => ({ name, address, virtual })),
}));

// The form itself, held under its token so the QR on the laptop's screen can carry a short link: the lecturer's workspace
// leaves it here with the reader secret, and any phone with the token fetches it. A form holds questions, never answers, and
// an answer is taken only for a form left here, checked against its questions and scale.
interface BoothForm { q: Array<[string, string, "scale" | "comment"]>; s: [number, number] }
const boothForms = new Map<string, BoothForm & Record<string, unknown>>();
const isBoothForm = (f: unknown): f is BoothForm & Record<string, unknown> => {
  const x = f as { q?: unknown; s?: unknown } | null;
  return !!x && typeof x === "object" && Array.isArray(x.q) && x.q.length > 0 && x.q.length <= 60 &&
    x.q.every((q) => Array.isArray(q) && typeof q[0] === "string" && /^Q\d{1,2}$/.test(q[0]) && typeof q[1] === "string" && (q[2] === "scale" || q[2] === "comment")) &&
    Array.isArray(x.s) && x.s.length === 2 && x.s.every((n) => Number.isInteger(n)) && (x.s[0] as number) < (x.s[1] as number) && (x.s[1] as number) <= 10;
};
app.post("/api/survey/:formToken/form", async (c) => {
  const token = c.req.param("formToken");
  let body: { reader?: unknown; form?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "send the form as JSON" }, 400);
  }
  if (!TOKEN.test(token) || typeof body.reader !== "string" || tokenOf(body.reader) !== token) return c.json({ error: "this reader cannot open this form" }, 403);
  if (!isBoothForm(body.form) || JSON.stringify(body.form).length > 20000) return c.json({ error: "the form is missing, malformed or too large" }, 400);
  if (!boothForms.has(token) && boothForms.size >= BOOTH_FORMS) return c.json({ error: "the collector is full" }, 503);
  boothForms.set(token, body.form);
  return c.json({ ok: true });
});
app.get("/api/survey/:formToken/form", (c) => {
  const form = boothForms.get(c.req.param("formToken"));
  return form ? c.json({ form }) : c.json({ error: "no form is open under this link" }, 404);
});

app.post("/api/survey/:formToken", async (c) => {
  const token = c.req.param("formToken");
  const published = TOKEN.test(token) ? boothForms.get(token) : undefined;
  if (!published) return c.json({ error: "this survey is not open on the laptop that showed the link" }, 404);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "send the answers as JSON" }, 400);
  }
  const { clientId, answers } = (body ?? {}) as { clientId?: unknown; answers?: unknown };
  if (typeof clientId !== "string" || !CLIENT.test(clientId)) return c.json({ error: "missing device id" }, 400);
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return c.json({ error: "missing answers" }, 400);
  const kinds = new Map(published.q.map(([id, , kind]) => [id, kind]));
  const [min, max] = published.s;
  const entries = Object.entries(answers as Record<string, unknown>);
  if (entries.some(([k, v]) => kinds.get(k) === "scale" ? !(v === "cannot-say" || (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max))
    : kinds.get(k) === "comment" ? !(typeof v === "string" && v.length <= 2000) : true))
    return c.json({ error: "the answers do not fit this survey" }, 400);
  let form = booth.get(token);
  if (!form) {
    form = new Map();
    booth.set(token, form);
  }
  if (form.has(clientId)) return c.json({ error: "this device has already answered" }, 409);
  if (form.size >= BOOTH_PER_FORM) return c.json({ error: "this form is full" }, 503);
  form.set(clientId, { clientId, answers: Object.fromEntries(entries) });
  return c.json({ ok: true, count: form.size });
});

app.get("/api/survey/:formToken/responses", (c) => {
  const token = c.req.param("formToken"), reader = c.req.query("reader") ?? "";
  if (!TOKEN.test(token) || !reader || tokenOf(reader) !== token) return c.json({ error: "this reader cannot read this form" }, 403);
  return c.json({ responses: [...(booth.get(token)?.values() ?? [])] });
});

app.post("/api/agent/intake", async (c) => {
  const { s, missing } = await agentModel();
  if (missing.length) return c.json({ fallback: true });
  try {
    const payload = (await c.req.json()) as Parameters<typeof runIntakeLLM>[1];
    // The browser already strips student identity; a caller that did not is stripped here too (shared/lib/compliance.ts).
    const doc = payload.doc as { pages?: unknown; tables?: unknown } | null;
    if (doc && Array.isArray(doc.pages) && Array.isArray(doc.tables)) payload.doc = withoutStudentIdentity(doc as Parameters<typeof withoutStudentIdentity>[0]).doc;
    const interpretation = await runIntakeLLM(s, payload, await chatFor(c, "folio", s));
    if (!interpretation) return c.json({ fallback: true });
    return c.json({ interpretation });
  } catch (err) {
    console.error("intake agent failed:", err);
    return c.json({ fallback: true });
  }
});

app.post("/api/agent/:name", async (c) => {
  const name = c.req.param("name");
  if (!["authoring", "evaluator", "analogy", "signal"].includes(name)) {
    return c.json({ error: "unknown agent" }, 404);
  }
  const { s, missing } = await agentModel();
  if (missing.length) return c.json({ fallback: true }, 503);
  const payload = await c.req.json();
  const chat = await chatFor(c, "sandbox", s);
  c.header("content-type", "text/event-stream");
  c.header("cache-control", "no-cache");
  return c.body(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          await streamAgentLLM(s, name, payload, (text) => {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }, chat);
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("agent stream failed:", name, err);
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "agent failed" })}\n\n`));
        } finally {
          controller.close();
        }
      },
    }),
  );
});

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port }, () => {
  void agentModel().then(({ s, missing }) => console.log(
    `lyceum api on http://localhost:${port}  (${missing.length ? "no model: fixture mode" : `live agents: ${s.model.model}`})`,
  ));
});
