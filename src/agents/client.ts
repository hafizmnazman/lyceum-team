// The client side of the live agents: parse a file, interpret it, stream an
// agent. Every call has a timeout and a deterministic fallback, so the app
// never hangs on the network (spec Section 1: "Never block on the LLM").
//
// Paths:
//  - parseFile: POST /api/parse. If the server is unreachable, xlsx/csv parse
//    in the browser (dynamic import of SheetJS, code-split); pdf/pptx/docx
//    need the server and say so plainly.
//  - interpretDoc: POST /api/agent/intake for the LLM read; falls back to the
//    local heuristic interpreter (same answer shape, honest "offline" label).
//  - streamAgent: SSE from /api/agent/:name for the free-text agents
//    (authoring, evaluator, analogy explainer), yielding chunks.

import type { CLO, CollectedPosting, CollectionProvider, IntakeInterpretation, ParsedDoc, Subject, UploadedFileKind } from "../types.ts";
import { SOURCE_POLICIES, filterPostings } from "../lib/collect.ts";
import { interpretLocally } from "./intakeLocal.ts";

const PARSE_TIMEOUT_MS = 20000;
const AGENT_TIMEOUT_MS = 30000;

export function fileKind(fileName: string): UploadedFileKind | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "csv") return "csv";
  if (ext === "pdf") return "pdf";
  if (ext === "pptx") return "pptx";
  if (ext === "docx") return "docx";
  return null;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** Browser-side xlsx/csv parsing (the no-server fallback). Code-split so the
 *  SheetJS bundle only loads if it is actually needed. */
async function parseSheetLocally(file: File, kind: UploadedFileKind): Promise<ParsedDoc> {
  const XLSX = await import("xlsx");
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });
  const tables = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as unknown as string[][];
    return { name, rows: rows.map((r) => r.map((c) => String(c ?? ""))) };
  });
  return { fileName: file.name, kind, pages: [], tables };
}

export interface ParseOutcome {
  doc: ParsedDoc | null;
  error?: string;
  via: "server" | "local";
}

export async function parseFile(file: File): Promise<ParseOutcome> {
  const kind = fileKind(file.name);
  if (!kind) {
    return { doc: null, error: "Unsupported file type. Drop xlsx, csv, pdf, pptx, or docx.", via: "local" };
  }
  try {
    const res = await withTimeout(
      fetch(`/api/parse?name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: file,
      }),
      PARSE_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`parse ${res.status}`);
    const doc = (await res.json()) as ParsedDoc;
    return { doc, via: "server" };
  } catch {
    if (kind === "xlsx" || kind === "csv") {
      try {
        const doc = await parseSheetLocally(file, kind);
        return { doc, via: "local" };
      } catch {
        return { doc: null, error: "Could not read this spreadsheet.", via: "local" };
      }
    }
    return {
      doc: null,
      error:
        "Reading pdf, pptx and docx needs the api server (npm run dev). Spreadsheets still work offline.",
      via: "local",
    };
  }
}

export interface InterpretOutcome {
  interp: IntakeInterpretation;
  via: "live" | "fallback";
}

export async function interpretDoc(
  doc: ParsedDoc,
  subjects: Subject[],
  clos: CLO[],
): Promise<InterpretOutcome> {
  try {
    const res = await withTimeout(
      fetch("/api/agent/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          doc,
          subjects: subjects.map((s) => ({ id: s.id, title: s.title, cloIds: s.cloIds })),
          clos: clos.map((c) => ({ id: c.id, subjectId: c.subjectId, text: c.text })),
        }),
      }),
      AGENT_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`agent ${res.status}`);
    const body = (await res.json()) as { interpretation?: IntakeInterpretation; fallback?: boolean };
    if (!body.interpretation) throw new Error("no interpretation");
    return { interp: body.interpretation, via: body.fallback ? "fallback" : "live" };
  } catch {
    return { interp: interpretLocally(doc, subjects, clos), via: "fallback" };
  }
}

/** Stream a free-text agent over SSE. Calls onChunk as text arrives; resolves
 *  with the full text, or null on failure (callers fall back to fixtures). */
export async function streamAgent(
  name: "authoring" | "evaluator" | "analogy" | "signal",
  payload: unknown,
  onChunk: (text: string) => void,
): Promise<string | null> {
  try {
    const res = await withTimeout(
      fetch(`/api/agent/${name}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify(payload),
      }),
      AGENT_TIMEOUT_MS,
    );
    if (!res.ok || !res.body) throw new Error(`agent ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    // A per-read inactivity timeout so a stalled stream cannot hang the UI.
    for (;;) {
      const { done, value } = await withTimeout(reader.read(), AGENT_TIMEOUT_MS);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const evt of events) {
        for (const line of evt.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as { text?: string };
              if (parsed.text) {
                full += parsed.text;
                onChunk(parsed.text);
              }
            } catch {
              // Ignore malformed chunks; the stream carries on.
            }
          }
        }
      }
    }
    return full.length > 0 ? full : null;
  } catch {
    return null;
  }
}

// ---------- the research run: a permitted board through the local API, or the saved sample ----------
const COLLECT_TIMEOUT_MS = 45000;
export interface CollectionRequest { provider: CollectionProvider; board: string; query: string; inText: boolean }
export type CollectionOutcome =
  | { ok: true; postings: CollectedPosting[]; retrievedAt: string; cached: boolean; total: number; label: string; endpoint?: string; bytes?: number | null; durationMs?: number | null }
  | { ok: false; error: string };
export async function fetchCollection(request: CollectionRequest): Promise<CollectionOutcome> {
  try {
    if (request.provider === "sample") {
      const started = Date.now();
      const res = await withTimeout(fetch("/demo/collected-sample.json"), COLLECT_TIMEOUT_MS);
      if (!res.ok) return { ok: false, error: "The saved sample could not be loaded." };
      const text = await res.text();
      const sample = JSON.parse(text) as { label: string; retrievedAt: string; postings: CollectedPosting[] };
      return { ok: true, postings: filterPostings(sample.postings, request.query, request.inText), retrievedAt: sample.retrievedAt, cached: false, total: sample.postings.length, label: sample.label,
        endpoint: "/demo/collected-sample.json (shipped with the app, no network request)", bytes: text.length, durationMs: Date.now() - started };
    }
    const params = new URLSearchParams({ q: request.query, scope: request.inText ? "text" : "title" });
    const started = Date.now();
    const res = await withTimeout(fetch("/api/collect/" + request.provider + "/" + encodeURIComponent(request.board) + "?" + params.toString()), COLLECT_TIMEOUT_MS);
    const body = (await res.json().catch(() => null)) as { error?: string; postings?: CollectedPosting[]; retrievedAt?: string; cached?: boolean; total?: number; endpoint?: string; bytes?: number; durationMs?: number } | null;
    if (!res.ok || !body || !Array.isArray(body.postings)) {
      return { ok: false, error: body?.error ?? (res.status === 404 ? "The local API is not running. Start it with npm run dev to collect from a live board." : "The board could not be collected (HTTP " + res.status + ").") };
    }
    return { ok: true, postings: body.postings, retrievedAt: body.retrievedAt ?? new Date().toISOString(), cached: Boolean(body.cached), total: body.total ?? body.postings.length,
      label: SOURCE_POLICIES[request.provider].name + " \"" + request.board + "\"", endpoint: body.endpoint ?? "/api/collect/" + request.provider + "/" + request.board,
      bytes: typeof body.bytes === "number" ? body.bytes : null, durationMs: typeof body.durationMs === "number" ? body.durationMs : Date.now() - started };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === "timeout" ? "The collection timed out. Try again, or narrow the keywords." : "The local API is not reachable. Start it with npm run dev to collect from a live board." };
  }
}
