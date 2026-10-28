// The thin Lyceum server (spec Section 1). Its jobs:
//   POST /api/parse            file bytes in, ParsedDoc out (xlsx/csv/pdf/pptx/docx)
//   POST /api/agent/:name      LLM proxy on the LYCEUM_AGENT_* model: intake
//                              returns JSON; the free-text agents answer as SSE
//   /api/collect, /api/survey  the research run's board collection, and the
//                              booth's survey collector (depth plan Section 7.2)
// No model or an LLM error never breaks the client: routes answer with
// { fallback: true } or an error status and the client falls back to its
// deterministic local path.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve, type HttpBindings } from "@hono/node-server";
import { parseSheet } from "./parse/sheet.ts";
import { parsePdf } from "./parse/pdf.ts";
import { parseDocx, parsePptx } from "./parse/office.ts";
import { startWatching, watchRoutes } from "./watch.ts";
import { agentModel, draftModelItems, draftSlides, proposeMappings, proposeQuotes, runIntakeLLM, streamAgentLLM, suggestRevision } from "./llm.ts";
import { CollectError, collectBoard } from "./collect.ts";
import { filterPostings } from "../src/lib/collect.ts";
import { missingSettings, publicSettings, type AgentSettings } from "../src/lib/agentSettings.ts";
import type { MappingRequest, QuoteRequest } from "../src/lib/proposals.ts";
import type { ItemRequest } from "../src/lib/items.ts";
import type { SlideRequest } from "../src/lib/slides.ts";
import { ENV_PATH, liveDeps, loadAgentSettings, openAiChat, runAgentSearch, TOOLS } from "./agentSearch.ts";
import { searchWeb } from "./webTools.ts";
import { readOutline, MAX_OUTLINE_CHARS } from "./outline.ts";
import { AuthStore, authRoutes } from "./auth.ts";
import { DATABASE_URL, postgresDb } from "./db.ts";
import { createHash } from "node:crypto";
import { networkInterfaces } from "node:os";

// Load .env when present (Node 21.7+). Absent file is fine.
try {
  process.loadEnvFile?.();
} catch {
  // no .env: fixture mode
}

const app = new Hono();

// The API answers the laptop it runs on. A phone on the booth's network reaches two routes only, through the web server's
// proxy or directly: posting an answer and reading a form by its token. So nobody on that network can call the model route
// (which spends from a key in .env), parse a file, open a form or read the collector's responses; the guard runs before CORS.
const LOOPBACK = /^(127\.|::1$|::ffff:127\.)/;
const phoneRoute = (method: string, path: string) =>
  (method === "POST" && /^\/api\/survey\/[A-Za-z0-9_-]{22}$/.test(path)) || (method === "GET" && /^\/api\/survey\/[A-Za-z0-9_-]{22}\/form$/.test(path));
app.use("/api/*", async (c, next) => {
  const from = (c.env as HttpBindings | undefined)?.incoming?.socket?.remoteAddress ?? "";
  if (!LOOPBACK.test(from) && !phoneRoute(c.req.method, c.req.path)) return c.json({ error: "this API answers the laptop it runs on" }, 403);
  await next();
});
app.use("/api/*", cors());

// Accounts (email and password, and Google when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set), sessions and each
// account's workspace (server/auth.ts), in PostgreSQL at DATABASE_URL (server/db.ts; npm run db:up starts one). The store
// opens on first use; while the database is down the account routes answer 503 and everything else still works.
const database = postgresDb(DATABASE_URL); // one pool; it connects when first asked and again after Postgres restarts
let opening: Promise<AuthStore> | null = null;
const getStore = () => (opening ??= AuthStore.open(database).catch((err) => { opening = null; throw err; }));
// Watching on a schedule (server/watch.ts): each signed-in account's courses, checked every 15 minutes.
watchRoutes(app, getStore, database);
if (process.env.LYCEUM_WATCH !== "off") startWatching(database);
authRoutes(app, getStore, {
  appUrl: process.env.APP_URL || "http://localhost:5173",
  google: { clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" },
});

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
  try {
    if (ext === "xlsx" || ext === "xls") return c.json(parseSheet(buf, name, "xlsx"));
    if (ext === "csv") return c.json(parseSheet(buf, name, "csv"));
    if (ext === "pdf") return c.json(await parsePdf(buf, name));
    if (ext === "pptx") return c.json(await parsePptx(buf, name));
    if (ext === "docx") return c.json(await parseDocx(buf, name));
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

// Agent web search (server/agentSearch.ts). Its settings come from .env; the browser only ever sees key hints.
app.get("/api/agent-settings", async (c) => {
  const s = await loadAgentSettings();
  return c.json({ settings: publicSettings(s), missing: missingSettings(s), path: ENV_PATH });
});
app.post("/api/agent-settings/test/:target", async (c) => {
  const s = await loadAgentSettings(), target = c.req.param("target");
  try {
    if (target === "model") {
      if (!s.model.baseUrl || !s.model.model) return c.json({ ok: false, error: "Set LYCEUM_AGENT_MODEL (and LYCEUM_AGENT_BASE_URL for a custom endpoint) in .env first." });
      const reply = await openAiChat(s)([{ role: "user", content: "Call the web_search tool with the query \"connection test\". Do nothing else." }], TOOLS);
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
// Onboarding's outline import (server/outline.ts): a parsed document's text in, the model's proposal out, checked against
// the text. Uses the model in .env; without one it says so, and the lecturer types the outline instead.
app.post("/api/agent/outline", async (c) => {
  let body: { text?: unknown; fileName?: unknown };
  try { body = await c.req.json(); } catch { return c.json({ error: "Send the outline's text as JSON." }, 400); }
  const text = typeof body.text === "string" ? body.text : "", fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 200) : "outline";
  if (text.trim().length < 40) return c.json({ error: "That file has too little text to read an outline from. Is it a scanned image?" }, 400);
  const { s, missing: needs } = await agentModel();
  if (needs.length) return c.json({ error: "Reading an outline needs the model set up: add " + needs.join(", ") + " to .env (see Settings). You can type the outcomes below instead." }, 400);
  try {
    return c.json({ outline: await readOutline(text, fileName, s), truncated: text.length > MAX_OUTLINE_CHARS });
  } catch (err) {
    console.error("outline read failed:", err);
    return c.json({ error: "The model could not read this outline: " + (err instanceof Error ? err.message : String(err)).slice(0, 300) + " You can type the outcomes below instead." }, 502);
  }
});

// Quill's suggestions on an open revision (src/lib/revision.ts): the outline and the gaps in, checked suggestions out.
app.post("/api/agent/revision", async (c) => {
  let request: Parameters<typeof suggestRevision>[1];
  try { request = await c.req.json(); } catch { return c.json({ error: "Send the revision as JSON." }, 400); }
  if (!request?.course || !Array.isArray(request.course.outcomes) || !Array.isArray(request.gaps)) return c.json({ error: "Send the course outline and its gaps." }, 400);
  const { s, missing } = await agentModel();
  if (missing.length) return c.json({ error: "Suggestions need the model set up: add " + missing.join(", ") + " to .env (see Settings)." }, 400);
  try {
    return c.json({ suggestions: await suggestRevision(s, request) });
  } catch (err) {
    console.error("revision suggestions failed:", err);
    return c.json({ error: "The model could not suggest changes: " + (err instanceof Error ? err.message : String(err)).slice(0, 300) }, 502);
  }
});

// Lens's quotations and Atlas's mappings on Report (src/lib/proposals.ts): checked proposals out, nothing recorded.
function proposalRoute<B>(path: string, valid: (body: B) => boolean, run: (s: AgentSettings, body: B) => Promise<unknown>) {
  app.post("/api/agent/" + path, async (c) => {
    let body: B;
    try { body = await c.req.json(); } catch { return c.json({ error: "Send the request as JSON." }, 400); }
    if (!valid(body)) return c.json({ error: "That request is missing what the agent reads." }, 400);
    const { s, missing } = await agentModel();
    if (missing.length) return c.json({ error: "This needs the model set up: add " + missing.join(", ") + " to .env (see Settings)." }, 400);
    try {
      return c.json({ [path]: await run(s, body) });
    } catch (err) {
      console.error(path + " proposals failed:", err);
      return c.json({ error: "The model could not propose " + path + ": " + (err instanceof Error ? err.message : String(err)).slice(0, 300) }, 502);
    }
  });
}
proposalRoute<QuoteRequest>("quotes", (b) => Array.isArray(b?.postings), proposeQuotes);
proposalRoute<MappingRequest>("mappings", (b) => Array.isArray(b?.skills) && Array.isArray(b?.outcomes), proposeMappings);
proposalRoute<SlideRequest>("slides", (b) => typeof b?.topic === "string" && Array.isArray(b?.outcomes), draftSlides);
proposalRoute<ItemRequest>("items", (b) => Array.isArray(b?.outcomes) && b.outcomes.length > 0 && Array.isArray(b?.misconceptions), draftModelItems);

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
        const result = await runAgentSearch(brief, liveDeps(s), s, (line) => send({ type: "log", line }), stop.signal);
        const query = typeof body.q === "string" ? body.q : "";
        send({ type: "done", postings: filterPostings(result.postings, query, body.scope === "text"), total: result.postings.length, retrievedAt: new Date(started).toISOString(),
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
    const interpretation = await runIntakeLLM(s, payload);
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
  c.header("content-type", "text/event-stream");
  c.header("cache-control", "no-cache");
  return c.body(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          await streamAgentLLM(s, name, payload, (text) => {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`));
          });
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
