// The local API's collector: fetches one permitted employer board on request,
// caches it for an hour, refuses rapid repeats, and never follows a lecturer-
// supplied URL. Two fixed hosts only (plan Section 7, collection boundaries).

import { BOARD_TOKEN, normaliseGreenhouseJob, normaliseLeverPosting } from "../src/lib/collect.ts";
import type { CollectedPosting } from "../src/types.ts";

export type LiveProvider = "greenhouse" | "lever";
export interface CollectResult { provider: LiveProvider; board: string; retrievedAt: string; cached: boolean; postings: CollectedPosting[]; endpoint: string; bytes: number; durationMs: number }
export class CollectError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export type Fetcher = (url: string, signal: AbortSignal) => Promise<{ status: number; text: () => Promise<string> }>;

export const CACHE_MS = 60 * 60 * 1000;
export const MIN_GAP_MS = 15 * 1000;
export const WINDOW_MS = 10 * 60 * 1000;
export const WINDOW_MAX = 20;
export const MAX_BYTES = 15 * 1024 * 1024;
export const TIMEOUT_MS = 20 * 1000;

const ENDPOINTS: Record<LiveProvider, (board: string) => string> = {
  greenhouse: (board) => "https://boards-api.greenhouse.io/v1/boards/" + encodeURIComponent(board) + "/jobs?content=true",
  lever: (site) => "https://api.lever.co/v0/postings/" + encodeURIComponent(site) + "?mode=json",
};

const cache = new Map<string, CollectResult & { expiresAt: number }>();
const lastFetch = new Map<string, number>();
let windowStart = 0, windowCount = 0;
export function resetCollectState() { cache.clear(); lastFetch.clear(); windowStart = 0; windowCount = 0; }

const defaultFetcher: Fetcher = async (url, signal) => {
  const res = await fetch(url, { signal, headers: { accept: "application/json", "user-agent": "Lyceum local prototype (lecturer-initiated, low volume)" } });
  return { status: res.status, text: () => res.text() };
};

export async function collectBoard(provider: string, board: string, options: { fetcher?: Fetcher; now?: () => number; timeoutMs?: number } = {}): Promise<CollectResult> {
  if (provider !== "greenhouse" && provider !== "lever") throw new CollectError(404, "Unknown source. Only the Greenhouse and Lever board APIs are supported.");
  if (!BOARD_TOKEN.test(board)) throw new CollectError(400, "Invalid board token. Use letters, digits, hyphens or underscores.");
  const now = options.now ?? Date.now, fetcher = options.fetcher ?? defaultFetcher;
  const key = provider + ":" + board.toLowerCase(), at = now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > at) return { provider: hit.provider, board: hit.board, retrievedAt: hit.retrievedAt, cached: true, postings: hit.postings, endpoint: hit.endpoint, bytes: hit.bytes, durationMs: hit.durationMs };
  const previous = lastFetch.get(key) ?? 0;
  if (at - previous < MIN_GAP_MS) throw new CollectError(429, "This board was fetched " + Math.round((at - previous) / 1000) + " seconds ago. Wait " + Math.ceil((MIN_GAP_MS - (at - previous)) / 1000) + " seconds, or use the cached result.");
  if (at - windowStart > WINDOW_MS) { windowStart = at; windowCount = 0; }
  if (windowCount >= WINDOW_MAX) throw new CollectError(429, "Collection limit reached: at most " + WINDOW_MAX + " board fetches every ten minutes. Try again later.");
  windowCount += 1; lastFetch.set(key, at);
  const endpoint = ENDPOINTS[provider](board), started = at;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let raw: string;
  try {
    const res = await fetcher(endpoint, controller.signal);
    if (res.status === 404) throw new CollectError(404, "No public board named \"" + board + "\" was found on " + provider + ".");
    if (res.status !== 200) throw new CollectError(502, "The board responded with HTTP " + res.status + ".");
    raw = await res.text();
  } catch (err) {
    if (err instanceof CollectError) throw err;
    throw new CollectError(controller.signal.aborted ? 504 : 502, controller.signal.aborted ? "The board did not respond within " + timeoutMs / 1000 + " seconds." : "The board could not be reached from this machine.");
  } finally { clearTimeout(timer); }
  if (raw.length > MAX_BYTES) throw new CollectError(502, "The board response is larger than the " + MAX_BYTES / (1024 * 1024) + " MB limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new CollectError(502, "The board returned something other than JSON."); }
  const retrievedAt = new Date(at).toISOString();
  const entries = provider === "greenhouse"
    ? (parsed && typeof parsed === "object" && Array.isArray((parsed as { jobs?: unknown }).jobs) ? (parsed as { jobs: unknown[] }).jobs : null)
    : (Array.isArray(parsed) ? parsed : null);
  if (!entries) throw new CollectError(502, "The board returned an unexpected shape.");
  const postings = entries
    .map((entry) => (entry && typeof entry === "object" ? (provider === "greenhouse" ? normaliseGreenhouseJob(entry as Record<string, unknown>, board, retrievedAt) : normaliseLeverPosting(entry as Record<string, unknown>, board, retrievedAt)) : null))
    .filter((p): p is CollectedPosting => p !== null)
    .sort((a, b) => (b.updatedAt || b.publishedAt).localeCompare(a.updatedAt || a.publishedAt));
  const result: CollectResult = { provider, board, retrievedAt, cached: false, postings, endpoint, bytes: raw.length, durationMs: Math.max(0, now() - started) };
  cache.set(key, { ...result, expiresAt: at + CACHE_MS });
  return result;
}
