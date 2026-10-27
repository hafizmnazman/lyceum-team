// The thin Lyceum server (spec Section 1). Its jobs:
//   POST /api/parse            file bytes in, ParsedDoc out (xlsx/csv/pdf/pptx/docx)
//   POST /api/agent/:name      LLM proxy: intake returns forced JSON; the
//                              free-text agents stream SSE
//   /api/collect, /api/survey  the research run's board collection, and the
//                              booth's survey collector (depth plan Section 7.2)
// No key or an LLM error never breaks the client: routes answer with
// { fallback: true } or an error status and the client falls back to its
// deterministic local path.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve, type HttpBindings } from "@hono/node-server";
import { parseSheet } from "./parse/sheet.ts";
import { parsePdf } from "./parse/pdf.ts";
import { parseDocx, parsePptx } from "./parse/office.ts";
import { hasKey, MODEL, runIntakeLLM, streamAgentLLM } from "./llm.ts";
import { CollectError, collectBoard } from "./collect.ts";
import { filterPostings } from "../src/lib/collect.ts";
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

app.get("/api/health", (c) =>
  c.json({ ok: true, live: hasKey(), model: hasKey() ? MODEL : null }),
);

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
  if (!hasKey()) return c.json({ fallback: true });
  try {
    const payload = (await c.req.json()) as Parameters<typeof runIntakeLLM>[0];
    const interpretation = await runIntakeLLM(payload);
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
  if (!hasKey()) return c.json({ fallback: true }, 503);
  const payload = await c.req.json();
  c.header("content-type", "text/event-stream");
  c.header("cache-control", "no-cache");
  return c.body(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          await streamAgentLLM(name, payload, (text) => {
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
  console.log(
    `lyceum api on http://localhost:${port}  (${hasKey() ? `live agents: ${MODEL}` : "no key: fixture mode"})`,
  );
});
