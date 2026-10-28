// Agent web search, with a scripted model and no network: the loop runs the tools the model calls, a kept posting's text is
// the page as fetched and never the model's words, saving needs a page read or a board listed first, the limits hold, the
// fetch guard refuses private addresses, structured job data is read from the page, and keys never leave the settings.
// Run: node --test src/prove-agent-search.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgentSearch, type AgentDeps, type Chat, type ToolCall } from "../server/agentSearch.ts";
import { assertPublicUrl, extractJobPosting, isPublicAddress, parseDuckDuckGo, readPage, searchWeb, ToolError, type ReadPage } from "../server/webTools.ts";
import { missingSettings, publicSettings, settingsFromEnv, type TimeFilter } from "./lib/agentSettings.ts";
import type { CollectedPosting } from "./types.ts";
import { runIntakeLLM, streamAgentLLM } from "../server/llm.ts";

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
  return { chat, search: async () => ({ hits: [{ title: "Data Analyst | Example", url: page.url, snippet: "Hiring a data analyst" }], provider: "searxng", skipped: [] }), fetchPage: async () => page,
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

test("settings come from .env: provider names fill the base URL, the search chain defaults to SearXNG then DuckDuckGo, keys never shown", () => {
  const s = settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "Groq", LYCEUM_AGENT_MODEL: "some-model", LYCEUM_AGENT_API_KEY: "gsk_secret_1234",
    LYCEUM_SEARCH_PROVIDER: "brave", LYCEUM_SEARCH_FALLBACK: "tavily, duckduckgo, nope, brave", BRAVE_API_KEY: "brave-secret-9876", LYCEUM_AGENT_MAX_STEPS: "999" });
  assert.equal(s.model.baseUrl, "https://api.groq.com/openai/v1");
  assert.equal(s.maxSteps, 40, "limits are clamped");
  assert.deepEqual(s.search.fallback, ["tavily", "duckduckgo"], "unknown names and the primary itself are dropped from the fallback");
  assert.equal(s.search.timeFilter, "month", "searches default to the past month");
  assert.deepEqual(missingSettings(s), [], "Tavily has no key, but Brave and DuckDuckGo can search");
  const shown = JSON.stringify(publicSettings(s));
  assert.ok(!shown.includes("secret"), "no key in what the browser sees");
  assert.match(shown, /ends in 1234/); assert.match(shown, /ends in 9876/);
  assert.deepEqual(publicSettings(s).search.chain.map((c) => c.id + ":" + c.usable), ["brave:true", "tavily:false", "duckduckgo:true"]);
  const bare = settingsFromEnv({});
  assert.deepEqual([bare.search.provider, ...bare.search.fallback], ["searxng", "duckduckgo"], "with nothing set: SearXNG, then DuckDuckGo");
  assert.equal(bare.search.keys.searxngUrl, "http://localhost:8080", "where npm run search:up puts it");
  assert.deepEqual(missingSettings(bare), ["LYCEUM_AGENT_MODEL", "LYCEUM_AGENT_API_KEY"], "only the model is left to set up");
  assert.deepEqual(missingSettings(settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "llama", LYCEUM_SEARCH_PROVIDER: "tavily", LYCEUM_SEARCH_FALLBACK: "" })),
    ["TAVILY_API_KEY"], "Ollama needs no key; a chain with no usable provider names what its first one needs");
  assert.equal(settingsFromEnv({ LYCEUM_SEARCH_TIME: "any" }).search.timeFilter, null);
});

test("the chain: a failing or empty provider falls through to the next, one missing its key is skipped, all failing is an error", async () => {
  const s = settingsFromEnv({ LYCEUM_SEARCH_PROVIDER: "searxng", LYCEUM_SEARCH_FALLBACK: "tavily,duckduckgo,brave", BRAVE_API_KEY: "k" });
  const calls: string[] = [];
  const hitsFor = (id: string) => [{ title: id, url: "https://" + id + ".example/job", snippet: "" }];
  const r = await searchWeb(s.search, "q", "week", 8, async (id, _s, _q, time) => {
    calls.push(id + ":" + time);
    if (id === "searxng") throw new ToolError("SearXNG could not be reached.");
    return hitsFor(id);
  });
  assert.deepEqual(calls, ["searxng:week", "duckduckgo:week"], "Tavily without a key is never called; the window is passed on");
  assert.equal(r.provider, "duckduckgo");
  assert.deepEqual(r.skipped.map((x) => x.provider), ["searxng", "tavily"]);
  const empty = await searchWeb(s.search, "q", null, 8, async (id) => (id === "brave" ? hitsFor("brave") : []));
  assert.equal(empty.provider, "brave", "no results moves on too");
  await assert.rejects(searchWeb(s.search, "q", null, 8, async () => { throw new ToolError("down"); }), /Every search provider failed/);
  assert.deepEqual((await searchWeb(s.search, "q", null, 8, async () => [])).hits, [], "nothing found anywhere is an empty answer, not an error");
});

test("the agent's time_filter reaches the search: a window, any, or the default from .env", async () => {
  const asked: Array<TimeFilter | null | undefined> = [];
  const chat = scripted([[call("1", "web_search", { query: "a", time_filter: "week" }), call("2", "web_search", { query: "b", time_filter: "any" }), call("3", "web_search", { query: "c" })], "done"]);
  await runAgentSearch("x", deps(chat, { search: async (_q, time) => { asked.push(time); return { hits: [], provider: null, skipped: [] }; } }), limits, () => undefined);
  assert.deepEqual(asked, ["week", null, undefined]);
});

test("DuckDuckGo's HTML results: the real URL out of its redirect, title and snippet as text, ads left out", () => {
  const html = `<div class="result results_links result--ad"><a class="result__a" href="https://duckduckgo.com/y.js?ad=1">Ad</a></div>
    <div class="result results_links results_links_deep web-result"><h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fjobs.example.com%2Fdata%2Danalyst&amp;rut=abc">Data <b>Analyst</b> &amp; BI</a></h2>
    <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x">Hiring in <b>Kuala Lumpur</b>.</a></div>`;
  const hits = parseDuckDuckGo(html).filter(Boolean);
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0], { title: "Data Analyst & BI", url: "https://jobs.example.com/data-analyst", snippet: "Hiring in Kuala Lumpur." });
});

test("intake and the free-text agents run on the same model as agent web search", async () => {
  const s = settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "llama" });
  const payload = { doc: { pages: ["CLO1 mean 72%"] }, subjects: [{ id: "CS220", title: "ML" }], clos: [{ id: "CLO4", subjectId: "CS220", text: "Apply ML" }] };
  const tool: Chat = async (_m, tools) => {
    assert.equal(tools[0].function.name, "file_interpretation", "intake offers its tool");
    return { content: null, tool_calls: [{ id: "1", type: "function", function: { name: "file_interpretation", arguments: '{"docType":"results","confidence":0.8,"notes":["read column B"]}' } }] };
  };
  assert.deepEqual(await runIntakeLLM(s, payload, tool), { docType: "results", confidence: 0.8, notes: ["read column B"] });
  const text: Chat = async () => ({ content: 'Here it is: ```json\n{"docType":"syllabus","confidence":0.5,"notes":[]}\n```' });
  assert.equal((await runIntakeLLM(s, payload, text))?.docType, "syllabus", "a model that answers in text still reads");
  const other: Chat = async () => ({ content: '{"docType":"slides","confidence":0.4,"notes":[]}', tool_calls: [{ id: "2", type: "function", function: { name: "something_else", arguments: "{}" } }] });
  assert.equal((await runIntakeLLM(s, payload, other))?.docType, "slides", "a call to some other tool is ignored");
  assert.equal(await runIntakeLLM(s, payload, async () => ({ content: "no idea" })), null, "no JSON is no interpretation, so the client falls back");
  const chunks: string[] = [];
  await streamAgentLLM(s, "evaluator", { x: 1 }, (t) => { chunks.push(t); }, async (m) => {
    assert.match(m[0].content ?? "", /Evaluator agent/);
    return { content: "Recommendation: adopt." };
  });
  assert.deepEqual(chunks, ["Recommendation: adopt."]);
  await assert.rejects(streamAgentLLM(s, "nope", {}, () => undefined, async () => ({ content: "" })), /unknown agent/);
});
