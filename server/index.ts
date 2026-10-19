// The thin Lyceum server (spec Section 1). Two jobs only:
//   POST /api/parse            file bytes in, ParsedDoc out (xlsx/csv/pdf/pptx/docx)
//   POST /api/agent/:name      LLM proxy: intake returns forced JSON; the
//                              free-text agents stream SSE
// No key or an LLM error never breaks the client: routes answer with
// { fallback: true } or an error status and the client falls back to its
// deterministic local path.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { parseSheet } from "./parse/sheet.ts";
import { parsePdf } from "./parse/pdf.ts";
import { parseDocx, parsePptx } from "./parse/office.ts";
import { hasKey, MODEL, runIntakeLLM, streamAgentLLM } from "./llm.ts";
import { CollectError, collectBoard } from "./collect.ts";
import { filterPostings } from "../src/lib/collect.ts";

// Load .env when present (Node 21.7+). Absent file is fine.
try {
  process.loadEnvFile?.();
} catch {
  // no .env: fixture mode
}

const app = new Hono();
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
