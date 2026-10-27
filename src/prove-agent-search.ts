// Agent web search, with a scripted model and no network: the loop runs the tools the model calls, a kept posting's text is
// the page as fetched and never the model's words, saving needs a page read or a board listed first, the limits hold, the
// fetch guard refuses private addresses, structured job data is read from the page, and keys never leave the settings.
// Run: node --test src/prove-agent-search.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgentSearch, type AgentDeps, type Chat, type ToolCall } from "../server/agentSearch.ts";
import { assertPublicUrl, extractJobPosting, isPublicAddress, readPage, ToolError, type ReadPage } from "../server/webTools.ts";
import { missingSettings, publicSettings, settingsFromEnv } from "./lib/agentSettings.ts";
import type { CollectedPosting } from "./types.ts";

const call = (id: string, name: string, args: Record<string, unknown>): ToolCall => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
/** A model that plays a fixed script: each reply in turn, and records the tool results it was shown. */
function scripted(replies: Array<ToolCall[] | string>): Chat & { seen: string[] } {
  let turn = 0;
  const seen: string[] = [];
  const chat = (async (messages: Parameters<Chat>[0]) => {
    for (const m of messages) if (m.role === "tool" && !seen.includes(m.tool_call_id + m.content)) seen.push(m.tool_call_id + m.content);
    const r = replies[Math.min(turn++, replies.length - 1)];
    return typeof r === "string" ? { content: r } : { content: null, tool_calls: r };
  }) as unknown as Chat & { seen: string[] };
  chat.seen = seen;
  return chat;
}
const PAGE_TEXT = "Data Analyst. We are hiring a data analyst in Kuala Lumpur. You will write SQL every day and build dashboards in Power BI. Requirements: a degree in computing or statistics, strong SQL, and clear writing. Nice to have: Python for data cleaning.";
const page: ReadPage = { url: "https://careers.example.com/jobs/42", title: "Data Analyst | Example", text: PAGE_TEXT,
  job: { title: "Data Analyst", organisation: "Example Sdn Bhd", location: "Kuala Lumpur, MY", datePosted: "2026-10-01T00:00:00.000Z", description: PAGE_TEXT } };
const boardPosting: CollectedPosting = { id: "greenhouse:acme:7", provider: "greenhouse", board: "acme", title: "Analytics Intern", organisation: "Acme", location: "Remote",
  url: "https://boards.greenhouse.io/acme/jobs/7", publishedAt: "2026-09-20T00:00:00.000Z", updatedAt: "", text: "Analytics intern. " + PAGE_TEXT, retrievedAt: "2026-10-27T00:00:00.000Z" };
function deps(chat: Chat, overrides: Partial<AgentDeps> = {}): AgentDeps {
  return { chat, search: async () => [{ title: "Data Analyst | Example", url: page.url, snippet: "Hiring a data analyst" }], fetchPage: async () => page,
    collect: async () => [boardPosting], now: () => new Date("2026-10-27T08:00:00Z"), ...overrides };
}
const limits = { maxSteps: 10, maxPostings: 5 };

test("the loop searches, reads and keeps a posting whose text is the page as fetched", async () => {
  const chat = scripted([
    [call("1", "web_search", { query: "data analyst Kuala Lumpur" })],
    [call("2", "web_fetch", { url: page.url })],
    [call("3", "save_posting", { url: page.url, title: "A title the model made up", organisation: "Made up" })],
    "I searched for data analyst roles and kept one posting.",
  ]);
  const log: string[] = [];
  const r = await runAgentSearch("data analyst roles in Malaysia", deps(chat), limits, (l) => log.push(l));
  assert.equal(r.postings.length, 1);
  const p = r.postings[0];
  assert.equal(p.provider, "agent");
  assert.equal(p.text, PAGE_TEXT, "the text is the fetched page, word for word");
  assert.equal(p.title, "Data Analyst", "the page's structured title wins over the model's");
  assert.equal(p.organisation, "Example Sdn Bhd");
  assert.equal(p.publishedAt, "2026-10-01T00:00:00.000Z", "the date comes from the page, never the model");
  assert.equal(p.board, "careers.example.com");
  assert.equal(r.searches, 1); assert.equal(r.pagesRead, 1);
  assert.match(r.summary, /kept one posting/);
  assert.ok(log.some((l) => l.startsWith("Kept: Data Analyst")), "each step is logged");
});

test("saving a page that was never read is refused and nothing is kept", async () => {
  const chat = scripted([[call("1", "save_posting", { url: "https://elsewhere.example.org/job" })], "done"]);
  const r = await runAgentSearch("anything", deps(chat), limits, () => undefined);
  assert.equal(r.postings.length, 0);
  assert.ok(chat.seen.some((s) => s.includes("Read the page with web_fetch")), "the model is told why");
});

test("a board's postings are listed and kept by their own URL, with the board's text", async () => {
  const chat = scripted([[call("1", "collect_board", { provider: "greenhouse", board: "ACME" })], [call("2", "save_posting", { url: boardPosting.url + "#apply" })], "done"]);
  let asked = "";
  const r = await runAgentSearch("interns", deps(chat, { collect: async (_p, b) => { asked = b; return [boardPosting]; } }), limits, () => undefined);
  assert.equal(asked, "acme", "board tokens are lower-cased");
  assert.deepEqual(r.postings, [boardPosting]);
});

test("tool errors go back to the model and the run carries on; bad JSON is an error, not a crash", async () => {
  const chat = scripted([[{ id: "1", type: "function", function: { name: "web_fetch", arguments: "{not json" } }, call("2", "web_fetch", { url: page.url })],
    [call("3", "nope", {})], "finished"]);
  const r = await runAgentSearch("x", deps(chat, { fetchPage: async (u) => { if (u !== page.url) throw new ToolError("blocked"); return page; } }), limits, () => undefined);
  assert.equal(r.pagesRead, 1);
  assert.ok(chat.seen.some((s) => s.startsWith("1Error:")) && chat.seen.some((s) => s.includes("Unknown tool nope")));
  assert.equal(r.summary, "finished");
});

test("the limits hold: postings kept and model turns", async () => {
  const urls = ["https://a.example.com/1", "https://a.example.com/2", "https://a.example.com/3"];
  const fetchAll = urls.map((u, i) => call("f" + i, "web_fetch", { url: u }));
  const saveAll = urls.map((u, i) => call("s" + i, "save_posting", { url: u }));
  const r = await runAgentSearch("x", deps(scripted([fetchAll, saveAll, "done"]), { fetchPage: async (u) => ({ ...page, url: u, job: null }) }), { maxSteps: 10, maxPostings: 2 }, () => undefined);
  assert.equal(r.postings.length, 2);
  assert.match(r.summary, /limit of 2 postings/);
  const loop = await runAgentSearch("x", deps(scripted([[call("1", "web_search", { query: "again" })]])), { maxSteps: 3, maxPostings: 5 }, () => undefined);
  assert.equal(loop.steps, 3); assert.equal(loop.searches, 3);
  assert.match(loop.summary, /Stopped after 3 model turns/);
});

test("an aborted run stops before its next model turn", async () => {
  const stop = new AbortController();
  stop.abort(new Error("stopped"));
  await assert.rejects(runAgentSearch("x", deps(scripted(["done"])), limits, () => undefined, stop.signal), /stopped/);
});

test("the fetch guard refuses private, loopback and odd addresses and allows public ones", async () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])
    assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ["8.8.8.8", "172.32.0.1", "93.184.216.34", "2606:4700::1111", "::ffff:8.8.8.8"]) assert.equal(isPublicAddress(ip), true, ip);
  for (const url of ["http://127.0.0.1/", "http://[::1]:8787/api", "http://169.254.169.254/latest/meta-data", "file:///etc/passwd", "ftp://example.com/", "https://user:pw@8.8.8.8/", "not a url"])
    await assert.rejects(assertPublicUrl(url), ToolError, url);
  assert.equal((await assertPublicUrl("https://8.8.8.8/jobs")).hostname, "8.8.8.8");
});

test("a page's schema.org JobPosting is read, inside @graph too, and the page chrome is dropped", () => {
  const description = "<p>" + PAGE_TEXT + "</p><ul><li>SQL</li><li>Power BI</li></ul>";
  const html = `<html><head><title>Jobs | Example</title><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "WebPage" },
    { "@type": "JobPosting", title: "Data Analyst", datePosted: "2026-10-01", hiringOrganization: { "@type": "Organization", name: "Example Sdn Bhd" },
      jobLocation: { "@type": "Place", address: { addressLocality: "Kuala Lumpur", addressCountry: "MY" } }, description }] })}</script></head>
    <body><nav>Home Jobs Login</nav><main>${description}</main><footer>Cookie policy</footer></body></html>`;
  const job = extractJobPosting(html);
  assert.ok(job);
  assert.equal(job.title, "Data Analyst"); assert.equal(job.organisation, "Example Sdn Bhd"); assert.equal(job.location, "Kuala Lumpur, MY");
  assert.equal(job.datePosted, "2026-10-01T00:00:00.000Z");
  const read = readPage({ url: "https://x.example.com/j", status: 200, contentType: "text/html", body: html });
  assert.equal(read.title, "Jobs | Example");
  assert.ok(read.text.startsWith(PAGE_TEXT) && read.text.includes("- SQL"), "the posting's own description is the text");
  const plain = readPage({ url: "https://x.example.com/k", status: 200, contentType: "text/html", body: "<nav>Menu</nav><main><p>" + PAGE_TEXT + "</p></main><footer>Footer</footer>" });
  assert.equal(plain.job, null);
  assert.ok(!plain.text.includes("Menu") && !plain.text.includes("Footer") && plain.text.includes("strong SQL"));
  assert.equal(extractJobPosting('<script type="application/ld+json">{broken</script>'), null);
});

test("settings come from .env: provider names fill the base URL, limits are clamped, keys are never shown", () => {
  const s = settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "Groq", LYCEUM_AGENT_MODEL: "some-model", LYCEUM_AGENT_API_KEY: "gsk_secret_1234",
    LYCEUM_SEARCH_PROVIDER: "brave", LYCEUM_SEARCH_API_KEY: "brave-secret-9876", LYCEUM_AGENT_MAX_STEPS: "999" });
  assert.equal(s.model.baseUrl, "https://api.groq.com/openai/v1");
  assert.equal(s.maxSteps, 40, "limits are clamped");
  assert.equal(s.maxPostings, 20, "an unset limit takes its default");
  assert.deepEqual(missingSettings(s), []);
  const shown = JSON.stringify(publicSettings(s));
  assert.ok(!shown.includes("secret"), "no key in what the browser sees");
  assert.match(shown, /ends in 1234/);
  assert.deepEqual(missingSettings(settingsFromEnv({})), ["LYCEUM_AGENT_MODEL", "LYCEUM_AGENT_API_KEY", "LYCEUM_SEARCH_API_KEY"], "nothing set: OpenRouter and Tavily by default, each line named");
  assert.deepEqual(missingSettings(settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "llama", LYCEUM_SEARCH_PROVIDER: "searxng" })), ["LYCEUM_SEARCH_URL"], "Ollama needs no key; SearXNG needs its address");
  const custom = settingsFromEnv({ LYCEUM_AGENT_BASE_URL: "http://localhost:1234/v1", LYCEUM_AGENT_MODEL: "m", LYCEUM_SEARCH_PROVIDER: "nope", LYCEUM_SEARCH_API_KEY: "k" });
  assert.equal(custom.model.provider, "custom", "a base URL without a known provider is a custom endpoint");
  assert.equal(custom.search.provider, "tavily", "an unknown search provider falls back to Tavily");
  assert.deepEqual(missingSettings(custom), []);
});
