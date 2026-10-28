// Permitted employer job-board collection (plan Section 7, source order step 2).
// Shared by the local API, which fetches, and the client, which filters and
// imports. Only two documented, keyless board APIs plus a dated saved sample are
// supported, each behind a source policy the lecturer can read. Nothing here
// fetches an arbitrary URL, and nothing runs on a schedule.

import type { CollectedPosting, CollectionProvider } from "../types.ts";

export interface SourcePolicy {
  name: string; owner: string; method: string; retention: string; refresh: string; policyReviewedOn: string; enabled: boolean; note: string;
}
export const SOURCE_POLICIES: Record<CollectionProvider, SourcePolicy> = {
  sample: {
    name: "Saved sample (Stripe board, 9 October 2026)", owner: "Lyceum demo fixture built from the public Greenhouse board of one employer",
    method: "A dated snapshot shipped with the app; no network request", retention: "Shipped with the app, truncated for the demo, each posting linked to its original",
    refresh: "Never; it is a dated sample", policyReviewedOn: "2026-10-09", enabled: true,
    note: "For demonstrations and rehearsals without network access. Labelled as a sample wherever it appears; it is real posting text, not a synthetic fixture.",
  },
  greenhouse: {
    name: "Greenhouse job board", owner: "Greenhouse Software, boards-api.greenhouse.io",
    method: "Documented public Job Board API: a keyless GET of one employer's board token, fetched only when you ask",
    retention: "Posting text, link, publication date and retrieval time are kept in this browser for your review",
    refresh: "On request; the local API caches a board for one hour and refuses rapid repeat fetches", policyReviewedOn: "2026-10-09", enabled: true,
    note: "Greenhouse documents this API for employers' career sites. Lyceum reads a named employer's board at low volume on request. Confirm intended use with the employer or Greenhouse before any scheduled or bulk collection.",
  },
  lever: {
    name: "Lever postings API", owner: "Lever, api.lever.co",
    method: "Documented public postings API: a keyless GET of one employer's site token, fetched only when you ask",
    retention: "Posting text, link, publication date and retrieval time are kept in this browser for your review",
    refresh: "On request; the local API caches a site for one hour and refuses rapid repeat fetches", policyReviewedOn: "2026-10-09", enabled: true,
    note: "Lever publishes this API for employers' own job pages. The employer name is the site token because the API does not state it. Confirm intended use before any scheduled or bulk collection.",
  },
  agent: {
    name: "Agent web search", owner: "The model and search provider chosen in Settings, through the local API",
    method: "A tool-calling model searches the web, reads pages and lists Greenhouse or Lever boards, then keeps postings; each kept posting's text is the page as fetched, never the model's words",
    retention: "Posting text, link, publication date when the page states it, and retrieval time are kept in this browser for your review",
    refresh: "On request only; each run spends from the keys in Settings", policyReviewedOn: "2026-10-27", enabled: true,
    note: "Pages are read only from public addresses and only when the agent asks. Many job sites forbid automated reading in their terms or block it; check a site's terms before relying on it, and prefer employers' own pages and boards.",
  },
};
export const BOARD_TOKEN = /^[a-z0-9][a-z0-9_-]{0,79}$/i;
export const MAX_POSTING_CHARS = 20000;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "-", mdash: "-", hellip: "...", rsquo: "'", lsquo: "'",
  rdquo: "\"", ldquo: "\"", bull: "*", middot: "*", copy: "(c)", reg: "(R)", trade: "(TM)", times: "x", deg: " degrees", euro: "EUR", pound: "GBP",
};
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    const lower = code.toLowerCase();
    try {
      if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
      if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    } catch { return match; }
    return NAMED_ENTITIES[lower] ?? match;
  });
}
/** HTML (escaped or not) to readable text, keeping paragraph and list breaks. */
export function htmlToText(html: string): string {
  let text = html;
  if (/&lt;\s*\/?\s*[a-z]/i.test(text) && !/<\s*\/?\s*[a-z]/i.test(text)) text = decodeEntities(text);
  text = text.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ");
  text = text.replace(/<\s*br\s*\/?\s*>/gi, "\n").replace(/<\s*\/\s*(p|div|li|h[1-6]|tr|ul|ol|section|article|blockquote|table)\s*>/gi, "\n").replace(/<\s*li[^>]*>/gi, "- ");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  return text.replace(/\r/g, "").split("\n").map((line) => line.replace(/[ \t ]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
export function truncateText(text: string, max = MAX_POSTING_CHARS): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf("\n", max);
  return text.slice(0, cut > max * 0.6 ? cut : max).trimEnd() + "\n\n[Text truncated at " + max + " characters. The full posting is at the link.]";
}
const isoDate = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  return "";
};

/** One Greenhouse Job Board API job (jobs?content=true) into a posting; null when it lacks an id or title. */
export function normaliseGreenhouseJob(job: Record<string, unknown>, board: string, retrievedAt: string): CollectedPosting | null {
  const id = job.id, title = typeof job.title === "string" ? job.title.trim() : "";
  if ((typeof id !== "number" && typeof id !== "string") || !title) return null;
  const location = job.location && typeof job.location === "object" ? String((job.location as { name?: unknown }).name ?? "") : "";
  return {
    id: "greenhouse:" + board + ":" + id, provider: "greenhouse", board, title,
    organisation: typeof job.company_name === "string" && job.company_name.trim() ? job.company_name.trim() : board,
    location: location.trim(), url: typeof job.absolute_url === "string" ? job.absolute_url : "",
    publishedAt: isoDate(job.first_published), updatedAt: isoDate(job.updated_at),
    text: truncateText(htmlToText(typeof job.content === "string" ? job.content : "")), retrievedAt,
  };
}
/** One Lever postings API entry (mode=json) into a posting; null when it lacks an id or title. */
export function normaliseLeverPosting(posting: Record<string, unknown>, site: string, retrievedAt: string): CollectedPosting | null {
  const id = posting.id, title = typeof posting.text === "string" ? posting.text.trim() : "";
  if (typeof id !== "string" || !title) return null;
  const categories = (posting.categories && typeof posting.categories === "object" ? posting.categories : {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof posting.descriptionPlain === "string") parts.push(posting.descriptionPlain);
  else if (typeof posting.description === "string") parts.push(htmlToText(posting.description));
  for (const entry of Array.isArray(posting.lists) ? posting.lists : []) {
    const list = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    if (typeof list.text === "string") parts.push(list.text + ":");
    if (typeof list.content === "string") parts.push(htmlToText(list.content));
  }
  if (typeof posting.additionalPlain === "string") parts.push(posting.additionalPlain);
  return {
    id: "lever:" + site + ":" + id, provider: "lever", board: site, title, organisation: site,
    location: typeof categories.location === "string" ? categories.location : "", url: typeof posting.hostedUrl === "string" ? posting.hostedUrl : "",
    publishedAt: isoDate(posting.createdAt), updatedAt: "", text: truncateText(parts.join("\n\n").trim()), retrievedAt,
  };
}

export function parseKeywords(query: string): string[] {
  return [...new Set(query.split(/[,\n;]+/).map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 2))].slice(0, 20);
}
export function matchedKeywords(posting: Pick<CollectedPosting, "title" | "text">, keywords: string[], inText = true): string[] {
  const hay = (inText ? posting.title + "\n" + posting.text : posting.title).toLowerCase();
  return keywords.filter((k) => hay.includes(k));
}
/** Keyword filter: titles by default, posting text too when asked. No keywords means every posting. */
export function filterPostings(postings: CollectedPosting[], query: string, inText = false): CollectedPosting[] {
  const keywords = parseKeywords(query);
  if (!keywords.length) return postings;
  return postings.filter((p) => matchedKeywords(p, keywords, inText).length > 0);
}
