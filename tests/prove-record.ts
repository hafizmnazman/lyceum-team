// The helpers' record (api/record.ts, supabase/migrations/20261029090000_agent_records.sql), on the real migrations in
// PGlite with a scripted model: each call's row and how it ended, tokens and cost from the reply, proposals with ids, the
// lecturer's verdicts (own proposals only), the 30-day clearing of content, the two metric views, and a database that is
// down never costing the helper its answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb, migrate, type Db } from "../api/db.ts";
import { clearOldContent, describePosting, newContext, recordedChat, recordProposals, recordVerdict, resumeRecording } from "../api/record.ts";
import { openAiChat, type Chat } from "../api/agentSearch.ts";
import { settingsFromEnv } from "../shared/lib/agentSettings.ts";

const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
const s = settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "openrouter", LYCEUM_AGENT_MODEL: "some/model", LYCEUM_AGENT_API_KEY: "k" });
const usage = { promptTokens: 120, completionTokens: 30, cost: 0.0004 };

async function setup() {
  resumeRecording();
  const db = await memoryDb();
  await migrate(db);
  for (const id of [A, B]) await db.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [id, id.slice(-1) + "@x.edu"]);
  const calls = async () => (await db.query<Record<string, unknown>>("SELECT * FROM agent_calls ORDER BY id")).rows;
  return { db, calls };
}

test("every call is a row: who, which helper, the model, tokens, cost, time, and how it ended", async () => {
  const { db, calls } = await setup();
  const ctx = newContext("prism", "/api/agent/items", A, "CS310");
  const replies: Array<Parameters<Chat> extends unknown ? Awaited<ReturnType<Chat>> | Error : never> = [
    { content: '{"items":[]}', usage }, { content: "Sorry, I cannot help with that." }, new Error("The model endpoint could not be reached in time."), new Error("HTTP 401: bad key")];
  const chat = recordedChat(db, s, ctx, async () => { const r = replies.shift()!; if (r instanceof Error) throw r; return r; });
  const ask = () => chat([{ role: "user", content: "draft" }], []);
  assert.equal((await ask()).content, '{"items":[]}');
  await ask();
  await assert.rejects(ask(), /in time/, "the error still reaches the helper");
  await assert.rejects(ask(), /401/);
  const rows = await calls();
  assert.deepEqual(rows.map((r) => r.status), ["ok", "unreadable", "timeout", "error"]);
  assert.ok(rows.every((r) => r.request_id === ctx.requestId && r.helper === "prism" && r.user_id === A && r.demo === false && r.subject_id === "CS310"));
  assert.deepEqual([rows[0].provider, rows[0].model, rows[0].prompt_tokens, rows[0].completion_tokens, Number(rows[0].cost)], ["openrouter", "some/model", 120, 30, 0.0004]);
  assert.equal(rows[2].cost, null, "no cost the provider did not report");
  assert.match(String(rows[3].error), /401/);
  assert.deepEqual(rows[0].prompt, [{ role: "user", content: "draft" }]);
  assert.ok(rows.every((r) => typeof r.duration_ms === "number"));
  const scout = recordedChat(db, s, newContext("scout", "/api/agent-search", null, null), async () => ({ content: null, tool_calls: [{ id: "1", type: "function", function: { name: "web_search", arguments: "{}" } }] }));
  await scout([{ role: "user", content: "find" }], [{ type: "function", function: { name: "web_search", description: "", parameters: {} } }]);
  const last = (await calls()).at(-1)!;
  assert.deepEqual([last.status, last.demo, last.user_id], ["ok", true, null], "a tool call is not judged unreadable; no account is a demo call");
});

test("tokens and cost come from the provider's reply; OpenRouter is asked to report cost", async () => {
  const real = globalThis.fetch;
  let sent: Record<string, unknown> = {};
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }], usage: { prompt_tokens: 9, completion_tokens: 2, cost: 0.00001 } }));
  }) as typeof fetch;
  try {
    const r = await openAiChat(s)([{ role: "user", content: "x" }], []);
    assert.deepEqual(r.usage, { promptTokens: 9, completionTokens: 2, cost: 0.00001 });
    assert.deepEqual(sent.usage, { include: true });
    await openAiChat(settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "m" }))([{ role: "user", content: "x" }], []);
    assert.equal(sent.usage, undefined, "only OpenRouter takes the usage flag");
  } finally {
    globalThis.fetch = real;
  }
});

test("proposals get ids; a verdict is the account's own, replaces an earlier one, and keeps a reason only for a dismissal", async () => {
  const { db } = await setup();
  const ctx = newContext("scout", "/api/agent-search", A, "CS310");
  const posting = { id: "p1", provider: "agent", board: "b", title: "Data analyst", organisation: "Grab", location: "", url: "https://x/1", publishedAt: "", updatedAt: "", text: "SQL", retrievedAt: "" } as const;
  const [offered] = await recordProposals(db, ctx, [posting], describePosting);
  assert.match(offered.proposalId!, /^[0-9a-f-]{36}$/);
  assert.equal(offered.title, "Data analyst", "the offer itself goes out unchanged");
  const row = async () => (await db.query<Record<string, unknown>>("SELECT * FROM agent_proposals WHERE id = $1", [offered.proposalId])).rows[0];
  assert.deepEqual([(await row()).kind, (await row()).summary, (await row()).status], ["posting", "Data analyst (Grab)", "proposed"]);
  assert.equal(await recordVerdict(db, B, offered.proposalId!, "accepted", null), false, "another account's proposal");
  assert.equal(await recordVerdict(db, A, "not-an-id", "accepted", null), false);
  assert.equal(await recordVerdict(db, A, offered.proposalId!, "dismissed", "  not relevant  "), true);
  assert.deepEqual([(await row()).status, (await row()).reason], ["dismissed", "not relevant"]);
  assert.equal(await recordVerdict(db, A, offered.proposalId!, "accepted", "ignored"), true);
  assert.deepEqual([(await row()).status, (await row()).reason], ["accepted", null], "taken after all; a reason is only for a dismissal");
  assert.deepEqual(await recordProposals(db, ctx, [], describePosting), []);
});

test("what was sent and came back is cleared after 30 days; the metrics stay", async () => {
  const { db, calls } = await setup();
  const chat = recordedChat(db, s, newContext("atlas", "/api/agent/mappings", A, null), async () => ({ content: "{}", usage }));
  await chat([{ role: "user", content: "old" }], []);
  await chat([{ role: "user", content: "new" }], []);
  const [old] = await calls();
  await db.query("UPDATE agent_calls SET at = now() - interval '31 days' WHERE id = $1", [old.id]);
  assert.equal(await clearOldContent(db), 1);
  assert.equal(await clearOldContent(db), 0, "already cleared");
  const rows = await calls();
  assert.deepEqual(rows.map((r) => [r.prompt === null, r.reply === null, r.prompt_tokens]), [[true, true, 120], [false, false, 120]]);
});

test("the metric views: calls per day by helper and model, and how often lecturers take each helper's proposals", async () => {
  const { db } = await setup();
  const ctx = newContext("atlas", "/api/agent/mappings", A, "CS310");
  let n = 0;
  const chat = recordedChat(db, s, ctx, async () => (++n === 2 ? { content: "nope" } : { content: "{}", usage }));
  for (let i = 0; i < 3; i++) await chat([{ role: "user", content: "x" }], []);
  const offers = await recordProposals(db, ctx, [{ skill: "SQL" }, { skill: "Tableau" }, { skill: "Excel" }, { skill: "R" }], (m) => ({ kind: "mapping", summary: m.skill, payload: m }));
  await recordVerdict(db, A, offers[0].proposalId!, "accepted", null);
  await recordVerdict(db, A, offers[1].proposalId!, "edited", null);
  await recordVerdict(db, A, offers[2].proposalId!, "dismissed", null);
  const daily = (await db.query<Record<string, unknown>>("SELECT * FROM agent_calls_daily")).rows;
  assert.equal(daily.length, 1);
  assert.deepEqual([daily[0].helper, Number(daily[0].calls), Number(daily[0].unreadable), Number(daily[0].failure_pct), Number(daily[0].prompt_tokens)], ["atlas", 3, 1, 33.3, 240]);
  const taken = (await db.query<Record<string, unknown>>("SELECT * FROM agent_acceptance")).rows;
  assert.deepEqual([taken[0].kind, Number(taken[0].proposed), Number(taken[0].undecided), Number(taken[0].taken_pct)], ["mapping", 4, 1, 66.7], "two of the three decided were taken");
});

test("a database that is down never costs the helper its answer, and is not asked again for a minute", async () => {
  resumeRecording();
  let tries = 0;
  const down = { query: async () => { tries++; throw new Error("connect ECONNREFUSED"); } } as unknown as Db;
  const warn = console.warn;
  console.warn = () => undefined;
  try {
    const chat = recordedChat(down, s, newContext("lens", "/api/agent/quotes", null, null), async () => ({ content: '{"quotes":[]}' }));
    assert.equal((await chat([{ role: "user", content: "x" }], [])).content, '{"quotes":[]}');
    assert.equal((await chat([{ role: "user", content: "x" }], [])).content, '{"quotes":[]}');
    assert.equal(tries, 1, "paused after the first failure");
    const offers = await recordProposals(down, newContext("lens", "/api/agent/quotes", null, null), [{ skill: "SQL" }], (m) => ({ kind: "quote", summary: m.skill, payload: m }));
    assert.deepEqual(offers, [{ skill: "SQL" }], "the offers still go out, without ids");
  } finally {
    console.warn = warn;
    resumeRecording();
  }
});
