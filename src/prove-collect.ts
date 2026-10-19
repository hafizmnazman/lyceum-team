import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeEntities, filterPostings, htmlToText, matchedKeywords, normaliseGreenhouseJob, normaliseLeverPosting, parseKeywords, truncateText,
} from "./lib/collect.ts";
import { CACHE_MS, CollectError, MIN_GAP_MS, WINDOW_MAX, collectBoard, resetCollectState, type Fetcher } from "../server/collect.ts";

const RETRIEVED = "2026-10-09T03:00:00.000Z";

test("escaped Greenhouse HTML becomes readable text with list and paragraph breaks", () => {
  const text = htmlToText("&lt;h2&gt;What you&#39;ll do&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;Build &amp;amp; ship&lt;/li&gt;&lt;li&gt;Use SQL&lt;/li&gt;&lt;/ul&gt;");
  assert.equal(text, "What you'll do\n- Build & ship\n- Use SQL");
  assert.equal(htmlToText("<p>Plain &nbsp; html</p><script>x()</script><p>Second</p>"), "Plain html\nSecond");
  assert.equal(decodeEntities("&#x41;&#66;&unknown;"), "AB&unknown;");
  assert.ok(truncateText("a".repeat(30000)).endsWith("The full posting is at the link.]"));
  assert.equal(truncateText("short"), "short");
});

test("board payloads normalise into postings with their own dates and links", () => {
  const job = normaliseGreenhouseJob({ id: 81, title: " Data Analyst ", content: "&lt;p&gt;Use SQL daily.&lt;/p&gt;", absolute_url: "https://example.com/jobs/81",
    first_published: "2026-09-01T10:00:00-04:00", updated_at: "2026-09-02T10:00:00-04:00", location: { name: "Kuala Lumpur" }, company_name: "Acme" }, "acme", RETRIEVED)!;
  assert.equal(job.id, "greenhouse:acme:81"); assert.equal(job.title, "Data Analyst"); assert.equal(job.text, "Use SQL daily.");
  assert.equal(job.publishedAt, "2026-09-01T14:00:00.000Z"); assert.equal(job.location, "Kuala Lumpur"); assert.equal(job.organisation, "Acme"); assert.equal(job.retrievedAt, RETRIEVED);
  assert.equal(normaliseGreenhouseJob({ id: 1, title: "" }, "acme", RETRIEVED), null);
  assert.equal(normaliseGreenhouseJob({ title: "No id" }, "acme", RETRIEVED), null);
  const lever = normaliseLeverPosting({ id: "abc", text: "Analyst", categories: { location: "Singapore" }, descriptionPlain: "Intro.", lists: [{ text: "What we require", content: "<li>SQL</li><li>Python</li>" }],
    additionalPlain: "Extra.", hostedUrl: "https://jobs.lever.co/x/abc", createdAt: 1786469891368 }, "x", RETRIEVED)!;
  assert.equal(lever.id, "lever:x:abc"); assert.equal(lever.organisation, "x"); assert.equal(lever.location, "Singapore");
  assert.equal(lever.text, "Intro.\n\nWhat we require:\n\n- SQL\n- Python\n\nExtra."); assert.equal(lever.publishedAt, new Date(1786469891368).toISOString());
  assert.equal(normaliseLeverPosting({ id: 5, text: "Numeric id" }, "x", RETRIEVED), null);
});

test("keyword filters match titles by default and posting text on request", () => {
  assert.deepEqual(parseKeywords(" Data Analyst, sql;; x\nSQL "), ["data analyst", "sql"]);
  const postings = [
    normaliseGreenhouseJob({ id: 1, title: "Data Analyst", content: "Python and SQL" }, "b", RETRIEVED)!,
    normaliseGreenhouseJob({ id: 2, title: "Backend Engineer", content: "Writes SQL migrations" }, "b", RETRIEVED)!,
  ];
  assert.deepEqual(filterPostings(postings, "analyst").map((p) => p.id), ["greenhouse:b:1"]);
  assert.deepEqual(filterPostings(postings, "sql").map((p) => p.id), []);
  assert.deepEqual(filterPostings(postings, "sql", true).map((p) => p.id), ["greenhouse:b:1", "greenhouse:b:2"]);
  assert.equal(filterPostings(postings, "").length, 2);
  assert.deepEqual(matchedKeywords(postings[1], ["sql", "python"]), ["sql"]);
});

const json = (body: unknown, status = 200): Fetcher => async () => ({ status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

test("the collector accepts only the two permitted hosts and valid board tokens", async () => {
  resetCollectState();
  await assert.rejects(collectBoard("linkedin", "x"), (e: unknown) => e instanceof CollectError && e.status === 404);
  await assert.rejects(collectBoard("greenhouse", "../etc/passwd"), (e: unknown) => e instanceof CollectError && e.status === 400);
  await assert.rejects(collectBoard("greenhouse", "a".repeat(81)), (e: unknown) => e instanceof CollectError && e.status === 400);
});

test("the collector caches a board, refuses rapid retries after a failure and caps the window", async () => {
  resetCollectState();
  let t = 1_000_000; const now = () => t; let calls = 0;
  const body = { jobs: [{ id: 1, title: "Data Analyst", content: "&lt;p&gt;Use SQL&lt;/p&gt;", absolute_url: "https://x/1", first_published: "2026-09-01T00:00:00Z", updated_at: "2026-09-02T00:00:00Z", location: { name: "KL" }, company_name: "Acme" }, { id: 2, title: "" }] };
  const fetcher: Fetcher = async (url) => { calls += 1; assert.match(url, /^https:\/\/boards-api\.greenhouse\.io\/v1\/boards\/acme\/jobs/); return { status: 200, text: async () => JSON.stringify(body) }; };
  const first = await collectBoard("greenhouse", "acme", { fetcher, now });
  assert.equal(first.postings.length, 1); assert.equal(first.cached, false); assert.equal(first.postings[0].text, "Use SQL"); assert.equal(first.retrievedAt, new Date(t).toISOString());
  assert.match(first.endpoint, /^https:\/\/boards-api\.greenhouse\.io\/v1\/boards\/acme\/jobs/); assert.ok(first.bytes > 100); assert.equal(first.durationMs, 0);
  t += 5000;
  const second = await collectBoard("greenhouse", "ACME", { fetcher, now });
  assert.equal(second.cached, true); assert.equal(calls, 1);
  t += CACHE_MS;
  const third = await collectBoard("greenhouse", "acme", { fetcher, now });
  assert.equal(third.cached, false); assert.equal(calls, 2);
  await assert.rejects(collectBoard("greenhouse", "broken", { fetcher: json("oops", 500), now }), (e: unknown) => e instanceof CollectError && e.status === 502);
  await assert.rejects(collectBoard("greenhouse", "broken", { fetcher: json(body), now }), (e: unknown) => e instanceof CollectError && e.status === 429 && /seconds/.test(e.message));
  t += MIN_GAP_MS;
  assert.equal((await collectBoard("greenhouse", "broken", { fetcher: json(body), now })).postings.length, 1);
  await assert.rejects(collectBoard("greenhouse", "missing", { fetcher: json("", 404), now }), (e: unknown) => e instanceof CollectError && e.status === 404);
  await assert.rejects(collectBoard("greenhouse", "odd", { fetcher: json({ nope: true }), now }), (e: unknown) => e instanceof CollectError && e.status === 502);
  await assert.rejects(collectBoard("lever", "odd", { fetcher: json({ nope: true }), now }), (e: unknown) => e instanceof CollectError && e.status === 502);
  await assert.rejects(collectBoard("greenhouse", "huge", { fetcher: json("x".repeat(15 * 1024 * 1024 + 1)), now }), (e: unknown) => e instanceof CollectError && e.status === 502 && /limit/.test(e.message));
  await assert.rejects(collectBoard("greenhouse", "notjson", { fetcher: json("{bad"), now }), (e: unknown) => e instanceof CollectError && e.status === 502);
  resetCollectState();
  for (let i = 0; i < WINDOW_MAX; i += 1) await collectBoard("lever", "site" + i, { fetcher: json([{ id: "p" + i, text: "Analyst " + i }]), now });
  await assert.rejects(collectBoard("lever", "one-too-many", { fetcher: json([]), now }), (e: unknown) => e instanceof CollectError && e.status === 429 && /limit/.test(e.message));
});

test("a timeout surfaces as a 504 rather than a hang", async () => {
  resetCollectState();
  const fetcher: Fetcher = (_url, signal) => new Promise((_resolve, reject) => { signal.addEventListener("abort", () => reject(new Error("aborted"))); });
  await assert.rejects(collectBoard("greenhouse", "slow", { fetcher, timeoutMs: 50 }), (e: unknown) => e instanceof CollectError && e.status === 504 && /0\.05 seconds/.test(e.message));
});
