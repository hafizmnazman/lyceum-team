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

import type { CLO, CollectedPosting, CollectionProvider, DraftItem, IntakeInterpretation, SlideDraft, ParsedDoc, Subject, UploadedFileKind } from "../types.ts";
import { SOURCE_POLICIES, filterPostings } from "../lib/collect.ts";
import { interpretLocally } from "./intakeLocal.ts";
import type { OutlineProposal } from "../lib/outline.ts";
import type { RevisionRequest, RevisionSuggestion } from "../lib/revision.ts";
import type { MappingRequest, MappingSuggestion, QuoteRequest } from "../lib/proposals.ts";
import type { MentionProposal } from "../lib/evidence.ts";
import type { ItemRequest } from "../lib/items.ts";
import type { SlideRequest } from "../lib/slides.ts";

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
const AGENT_TIMEOUT_MS_TOTAL = 7 * 60 * 1000;
/** Agent web search: the local API streams one JSON object per line, log lines as the agent works and then the result. */
async function fetchAgentCollection(request: CollectionRequest, onLog: (line: string) => void): Promise<CollectionOutcome> {
  const res = await withTimeout(fetch("/api/agent-search", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ brief: request.board, q: request.query, scope: request.inText ? "text" : "title" }) }), AGENT_TIMEOUT_MS_TOTAL);
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: body?.error ?? (res.status === 404 ? "The local API is not running. Start it with npm run dev to use agent search." : "Agent search failed (HTTP " + res.status + ").") };
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  const deadline = Date.now() + AGENT_TIMEOUT_MS_TOTAL;
  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as { type: string; line?: string; error?: string; postings?: CollectedPosting[]; total?: number; retrievedAt?: string; durationMs?: number; endpoint?: string; summary?: string };
      if (event.type === "log" && event.line) onLog(event.line);
      else if (event.type === "error") return { ok: false, error: event.error ?? "Agent search failed." };
      else if (event.type === "done" && Array.isArray(event.postings)) {
        return { ok: true, postings: event.postings, retrievedAt: event.retrievedAt ?? new Date().toISOString(), cached: false, total: event.total ?? event.postings.length,
          label: SOURCE_POLICIES.agent.name + " \"" + request.board + "\"", endpoint: event.endpoint ?? "/api/agent-search", bytes: null, durationMs: event.durationMs ?? null };
      }
    }
  }
  await reader.cancel().catch(() => undefined);
  return { ok: false, error: "The agent search ended without a result." };
}

export async function fetchCollection(request: CollectionRequest, onLog: (line: string) => void = () => undefined): Promise<CollectionOutcome> {
  try {
    if (request.provider === "agent") return await fetchAgentCollection(request, onLog);
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

// ---------- Update: Quill's suggestions on an open revision (src/lib/revision.ts) ----------
/** Ask the model in .env for suggestions on a revision. Nothing is applied here; the lecturer applies each one. */
export async function fetchRevisionSuggestions(request: RevisionRequest): Promise<{ ok: true; suggestions: RevisionSuggestion[] } | { ok: false; error: string }> {
  try {
    const res = await withTimeout(fetch("/api/agent/revision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) }), OUTLINE_TIMEOUT_MS);
    const body = (await res.json().catch(() => null)) as { suggestions?: RevisionSuggestion[]; error?: string } | null;
    if (!res.ok || !body?.suggestions) return { ok: false, error: body?.error ?? "No suggestions came back (HTTP " + res.status + ")." };
    return { ok: true, suggestions: body.suggestions };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === "timeout" ? "The model took too long. Try again." : "The local API is not reachable. Start it with npm run dev." };
  }
}

// ---------- Report: Lens's quotations and Atlas's mappings (src/lib/proposals.ts) ----------
async function postProposals<T>(path: "quotes" | "mappings" | "items" | "slides", request: unknown): Promise<{ ok: true; list: T[] } | { ok: false; error: string }> {
  try {
    const res = await withTimeout(fetch("/api/agent/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) }), OUTLINE_TIMEOUT_MS);
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const list = body?.[path];
    if (!res.ok || !Array.isArray(list)) return { ok: false, error: typeof body?.error === "string" ? body.error : "Nothing came back (HTTP " + res.status + ")." };
    return { ok: true, list: list as T[] };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === "timeout" ? "The model took too long. Try again." : "The local API is not reachable. Start it with npm run dev." };
  }
}
export const fetchQuoteProposals = (request: QuoteRequest) => postProposals<MentionProposal>("quotes", request);
export const fetchMappingSuggestions = (request: MappingRequest) => postProposals<MappingSuggestion>("mappings", request);
export const fetchModelItems = (request: ItemRequest) => postProposals<DraftItem>("items", request);
export const fetchModelSlides = (request: SlideRequest) => postProposals<SlideDraft>("slides", request);

// ---------- Watch on a schedule (server/watch.ts): the signed-in account's schedule and runs for one course ----------
export interface WatchSchedule { subjectId: string; provider: "greenhouse" | "lever" | "agent"; board: string; query: string; inText: boolean; everyDays: number; nextRunAt: string }
export interface WatchRun { id: number; subjectId: string; ranAt: string; provider: string; board: string; status: "ok" | "failed"; error: string | null; total: number; postings: CollectedPosting[] }
type WatchAnswer = { schedule?: WatchSchedule | null; runs?: WatchRun[]; run?: WatchRun; error?: string };
/** One call to the watch API; any failure comes back as an error to show, never thrown. */
export async function watchApi(subjectId: string, method: "GET" | "PUT" | "DELETE" | "POST", path = "", body?: unknown, timeoutMs = 30000): Promise<WatchAnswer & { ok: boolean }> {
  try {
    const res = await withTimeout(fetch("/api/watch/" + encodeURIComponent(subjectId) + path, { method, headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined }), timeoutMs);
    const answer = ((await res.json().catch(() => null)) ?? {}) as WatchAnswer;
    return { ...answer, ok: res.ok, error: res.ok ? undefined : answer.error ?? "Watching answered HTTP " + res.status + "." };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === "timeout" ? "The run is taking long; it continues on the server. Refresh in a while." : "The local API is not reachable. Start it with npm run dev." };
  }
}

// ---------- onboarding: read a course outline (server/outline.ts) ----------
const OUTLINE_TIMEOUT_MS = 180000;
/** Parse the lecturer's outline on the local API, then ask the model in .env what it states. The proposal is reviewed before anything saves. */
export async function readOutlineFile(file: File): Promise<{ ok: true; outline: OutlineProposal; truncated: boolean } | { ok: false; error: string }> {
  const parsed = await parseFile(file);
  if (!parsed.doc) return { ok: false, error: parsed.error ?? "The file could not be read." };
  const text = [...parsed.doc.pages.map((p) => p.text), ...parsed.doc.tables.map((t) => t.rows.map((r) => r.join("  |  ")).join("\n"))].join("\n\n");
  try {
    const res = await withTimeout(fetch("/api/agent/outline", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, fileName: file.name }) }), OUTLINE_TIMEOUT_MS);
    const body = (await res.json().catch(() => null)) as { outline?: OutlineProposal; truncated?: boolean; error?: string } | null;
    if (!res.ok || !body?.outline) return { ok: false, error: body?.error ?? "The outline could not be read (HTTP " + res.status + ")." };
    return { ok: true, outline: body.outline, truncated: Boolean(body.truncated) };
  } catch (err) {
    return { ok: false, error: err instanceof Error && err.message === "timeout" ? "Reading the outline took too long. Try again, or type the outcomes." : "The local API is not reachable. Start it with npm run dev." };
  }
}
