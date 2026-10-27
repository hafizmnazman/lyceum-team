// The agent's two web tools, run on the local API: a search through the provider chain set in .env (the primary, then
// each fallback in turn when one fails or finds nothing, as Odysseus does), and a guarded page fetch. Everything either
// returns is untrusted text: the agent reads it, but only text fetched here can become a posting.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { decodeEntities, htmlToText } from "../src/lib/collect.ts";
import { SEARCH_PROVIDERS, searchChain, type SearchProviderId, type SearchSettings, type TimeFilter } from "../src/lib/agentSettings.ts";

export interface SearchHit { title: string; url: string; snippet: string }
export class ToolError extends Error {}

const SEARCH_TIMEOUT_MS = 20_000, FETCH_TIMEOUT_MS = 20_000, MAX_PAGE_BYTES = 3 * 1024 * 1024, MAX_REDIRECTS = 5;
const UA = "Mozilla/5.0 (compatible; Lyceum local prototype; lecturer-initiated agent search, low volume)";

async function getJson(url: string, init: RequestInit, what: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
  } catch (err) {
    throw new ToolError(what + " could not be reached" + (err instanceof Error && err.name === "TimeoutError" ? " in time." : "."));
  }
  const text = await res.text();
  if (!res.ok) throw new ToolError(what + " answered HTTP " + res.status + ": " + text.slice(0, 200));
  try { return JSON.parse(text); } catch { throw new ToolError(what + " returned something other than JSON."); }
}

type Row = Record<string, unknown>;
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v.filter((x): x is Row => !!x && typeof x === "object") : []);
const hit = (title: unknown, url: unknown, snippet: unknown): SearchHit | null =>
  typeof url === "string" && /^https?:\/\//.test(url) ? { title: String(title ?? "").slice(0, 300), url, snippet: String(snippet ?? "").slice(0, 500) } : null;

/** How each provider names a time window. */
const WINDOW: Record<Exclude<SearchProviderId, "searxng" | "tavily">, Record<TimeFilter, string>> = {
  duckduckgo: { day: "d", week: "w", month: "m", year: "y" },
  brave: { day: "pd", week: "pw", month: "pm", year: "py" },
  serper: { day: "qdr:d", week: "qdr:w", month: "qdr:m", year: "qdr:y" },
  google: { day: "d1", week: "w1", month: "m1", year: "y1" },
};

/** DuckDuckGo's plain HTML results page: each result's link goes through its /l/?uddg= redirect, the real URL inside. */
export function parseDuckDuckGo(html: string): Array<SearchHit | null> {
  const hits: Array<SearchHit | null> = [];
  // Split on each result's opening div, keeping its class (the capture) so an ad can be told apart and left out.
  const parts = html.split(/<div[^>]+class="([^"]*\bresult\b[^"]*)"/);
  for (let i = 1; i < parts.length; i += 2) {
    const block = parts[i + 1] ?? "";
    if (/\bresult--ad\b/.test(parts[i])) continue;
    const link = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    if (!link) continue;
    let url = decodeEntities(link[1]);
    const wrapped = /[?&]uddg=([^&]+)/.exec(url);
    if (wrapped) url = decodeURIComponent(wrapped[1]);
    else if (url.startsWith("//")) url = "https:" + url;
    const snippet = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/.exec(block)?.[1] ?? "";
    // Titles and snippets hold inline tags only (<b> around the matched words), so they go without leaving a space.
    const inline = (h: string) => decodeEntities(h.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    hits.push(hit(inline(link[2]), url, inline(snippet)));
  }
  return hits;
}

/** One web search through one provider, within a time window when one is given. */
export async function searchOne(provider: SearchProviderId, s: SearchSettings, query: string, time: TimeFilter | null, count = 8): Promise<SearchHit[]> {
  const k = s.keys;
  let hits: Array<SearchHit | null>;
  if (provider === "searxng") {
    const base = k.searxngUrl.replace(/\/+$/, "");
    if (!/^https?:\/\//.test(base)) throw new ToolError("SEARXNG_URL must start with http:// or https://.");
    const body = await getJson(base + "/search?" + new URLSearchParams({ q: query, format: "json", ...(time ? { time_range: time } : {}) }), { headers: { accept: "application/json" } }, "SearXNG") as Row;
    hits = rows(body.results).map((r) => hit(r.title, r.url, r.content));
  } else if (provider === "duckduckgo") {
    let res: Response;
    try {
      res = await fetch("https://html.duckduckgo.com/html/", { method: "POST", signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": UA }, body: new URLSearchParams({ q: query, ...(time ? { df: WINDOW.duckduckgo[time] } : {}) }) });
    } catch { throw new ToolError("DuckDuckGo could not be reached."); }
    if (!res.ok) throw new ToolError("DuckDuckGo answered HTTP " + res.status + (res.status === 202 || res.status === 403 ? " (it is limiting automated searches for now)." : "."));
    hits = parseDuckDuckGo(await res.text());
  } else if (provider === "tavily") {
    const body = await getJson("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + k.tavily },
      body: JSON.stringify({ api_key: k.tavily, query, max_results: count, ...(time ? { time_range: time } : {}) }) }, "Tavily") as Row;
    hits = rows(body.results).map((r) => hit(r.title, r.url, r.content));
  } else if (provider === "brave") {
    const body = await getJson("https://api.search.brave.com/res/v1/web/search?" + new URLSearchParams({ q: query, count: String(count), ...(time ? { freshness: WINDOW.brave[time] } : {}) }),
      { headers: { accept: "application/json", "x-subscription-token": k.brave } }, "Brave Search") as Row;
    hits = rows((body.web as Row | undefined)?.results).map((r) => hit(r.title, r.url, r.description));
  } else if (provider === "serper") {
    const body = await getJson("https://google.serper.dev/search", { method: "POST", headers: { "content-type": "application/json", "x-api-key": k.serper },
      body: JSON.stringify({ q: query, num: count, ...(time ? { tbs: WINDOW.serper[time] } : {}) }) }, "Serper") as Row;
    hits = rows(body.organic).map((r) => hit(r.title, r.link, r.snippet));
  } else {
    const body = await getJson("https://www.googleapis.com/customsearch/v1?" + new URLSearchParams({ key: k.google, cx: k.googleCx, q: query, num: String(Math.min(count, 10)), ...(time ? { dateRestrict: WINDOW.google[time] } : {}) }),
      {}, "Google Programmable Search") as Row;
    hits = rows(body.items).map((r) => hit(r.title, r.link, r.snippet));
  }
  return hits.filter((h): h is SearchHit => h !== null).slice(0, count);
}

export interface ChainResult { hits: SearchHit[]; provider: SearchProviderId | null; skipped: Array<{ provider: SearchProviderId; why: string }> }
/** The chain: the primary, then each fallback, skipping those missing a key and moving on when one fails or finds
 *  nothing. Fails only when every usable provider failed. */
export async function searchWeb(s: SearchSettings, query: string, time: TimeFilter | null, count = 8, one: typeof searchOne = searchOne): Promise<ChainResult> {
  const skipped: ChainResult["skipped"] = [];
  let answered = false; // a provider that worked but found nothing: the search ran, there is just nothing to show
  for (const link of searchChain(s)) {
    if (!link.usable) { skipped.push({ provider: link.id, why: "needs " + link.missing.join(", ") }); continue; }
    try {
      const hits = await one(link.id, s, query, time, count);
      if (hits.length) return { hits, provider: link.id, skipped };
      answered = true;
      skipped.push({ provider: link.id, why: "no results" });
    } catch (err) {
      skipped.push({ provider: link.id, why: err instanceof Error ? err.message : String(err) });
    }
  }
  if (answered) return { hits: [], provider: null, skipped };
  throw new ToolError("Every search provider failed. " + skipped.map((x) => SEARCH_PROVIDERS[x.provider].label + ": " + x.why).join("; "));
}

// ---------- the guarded fetch: public http(s) hosts only, every redirect re-checked, size and time capped ----------

/** True for an address on the public internet: not loopback, private, link-local, carrier-grade NAT, multicast or reserved. */
export function isPublicAddress(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return isPublicAddress(mapped[1]);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)));
  }
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return !(v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff") || v.startsWith("64:ff9b:"));
  }
  return false;
}

// ponytail: the host is resolved and checked before each hop but the socket resolves it again, so DNS rebinding could slip
// a private address through; pin the checked address with an undici dispatcher if this ever runs anywhere but a laptop.
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ToolError("Not a valid URL: " + raw.slice(0, 200)); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ToolError("Only http and https pages can be read.");
  if (url.username || url.password) throw new ToolError("URLs with credentials are refused.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  try { addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address); } catch { throw new ToolError("The host " + host + " could not be resolved."); }
  if (!addresses.length || !addresses.every(isPublicAddress)) throw new ToolError("The host " + host + " is not on the public internet, so it is refused.");
  return url;
}

export interface FetchedPage { url: string; status: number; contentType: string; body: string }
export async function safeFetch(raw: string): Promise<FetchedPage> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; ; hop++) {
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8" } });
    } catch (err) {
      throw new ToolError("The page could not be fetched" + (err instanceof Error && err.name === "TimeoutError" ? " within " + FETCH_TIMEOUT_MS / 1000 + " seconds." : "."));
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      if (hop >= MAX_REDIRECTS) throw new ToolError("Too many redirects.");
      await res.body?.cancel();
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) { await res.body?.cancel(); throw new ToolError("The page answered HTTP " + res.status + (res.status === 403 || res.status === 429 ? " (the site may block automated reading)." : ".")); }
    const contentType = res.headers.get("content-type") ?? "";
    if (!/html|json|text\/plain|xml/i.test(contentType)) { await res.body?.cancel(); throw new ToolError("Not a readable page (" + (contentType || "unknown type") + "). PDFs and images are not read."); }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PAGE_BYTES) { await reader.cancel(); throw new ToolError("The page is larger than " + MAX_PAGE_BYTES / 1048576 + " MB."); }
      chunks.push(value);
    }
    return { url: url.toString(), status: res.status, contentType, body: Buffer.concat(chunks).toString("utf8") };
  }
}

// ---------- reading a page: its title, its text, and a schema.org JobPosting when the page publishes one ----------

export interface JobPostingData { title: string; organisation: string; location: string; datePosted: string; description: string }
export interface ReadPage { url: string; title: string; text: string; job: JobPostingData | null }

const asText = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const typeIs = (node: Row, t: string) => (Array.isArray(node["@type"]) ? (node["@type"] as unknown[]).includes(t) : node["@type"] === t);
function findJobPosting(node: unknown, depth = 0): Row | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findJobPosting(n, depth + 1); if (f) return f; } return null; }
  const row = node as Row;
  if (typeIs(row, "JobPosting")) return row;
  return findJobPosting(row["@graph"], depth + 1);
}
function placeOf(loc: unknown): string {
  const first = Array.isArray(loc) ? loc[0] : loc;
  const address = first && typeof first === "object" ? (first as Row).address : null;
  if (typeof address === "string") return address;
  if (!address || typeof address !== "object") return "";
  const a = address as Row;
  const country = typeof a.addressCountry === "object" && a.addressCountry ? asText((a.addressCountry as Row).name) : asText(a.addressCountry);
  return [asText(a.addressLocality), asText(a.addressRegion), country].filter(Boolean).join(", ");
}
export function extractJobPosting(html: string): JobPostingData | null {
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try { parsed = JSON.parse(m[1].trim()); } catch { continue; }
    const job = findJobPosting(parsed);
    if (!job) continue;
    const org = job.hiringOrganization;
    const date = asText(job.datePosted);
    return {
      title: asText(job.title), organisation: typeof org === "string" ? org.trim() : org && typeof org === "object" ? asText((org as Row).name) : "",
      location: job.jobLocationType === "TELECOMMUTE" ? "Remote" : placeOf(job.jobLocation),
      datePosted: Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : "", description: htmlToText(asText(job.description)),
    };
  }
  return null;
}
export function readPage(page: FetchedPage): ReadPage {
  if (!/html|xml/i.test(page.contentType)) return { url: page.url, title: "", text: page.body.trim(), job: null };
  const title = htmlToText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(page.body)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const job = extractJobPosting(page.body);
  // A published JobPosting's description is the posting itself; otherwise the page's text, without its chrome.
  const body = page.body.replace(/<\s*(nav|header|footer|aside|form|noscript|svg)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ");
  return { url: page.url, title, text: job?.description && job.description.length > 200 ? job.description : htmlToText(body), job };
}
