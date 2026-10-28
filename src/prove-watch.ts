// Watching on a schedule (server/watch.ts) on PGlite with a scripted collector: a schedule is due at once and then every
// N days, a run is claimed so it never runs twice, a failure is kept as a run, old runs are trimmed, and only the account's
// own schedules run when it asks to run now. Run: node --test src/prove-watch.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb, migrate } from "../server/db.ts";
import { KEEP_RUNS, getSchedule, listRuns, runDue, scheduleError, setSchedule, stopSchedule, type Collector } from "../server/watch.ts";
import type { CollectedPosting } from "./types.ts";

const posting = (id: string): CollectedPosting => ({ id, provider: "greenhouse", board: "stripe", title: "Data analyst " + id, organisation: "Stripe", location: "",
  url: "https://example.org/" + id, publishedAt: "2026-10-01", retrievedAt: "2026-10-28T00:00:00Z", text: "SQL is required." }) as CollectedPosting;
async function setup() {
  const db = await memoryDb();
  await migrate(db);
  for (const id of ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"])
    await db.query("INSERT INTO users (id, email, name, created_at, onboarded_at) VALUES ($1, $2, 'L', now(), now())", [id, id + "@x.edu"]);
  return { db, a: "00000000-0000-0000-0000-000000000001", b: "00000000-0000-0000-0000-000000000002" };
}
const day = (n: number) => new Date(Date.UTC(2026, 9, 28 + n));

test("what a schedule may hold", () => {
  assert.equal(scheduleError({ provider: "greenhouse", board: "stripe", query: "", everyDays: 7 }), null);
  assert.equal(scheduleError({ provider: "agent", board: "data analyst jobs in Malaysia", query: "", everyDays: 1 }), null);
  assert.match(scheduleError({ provider: "sample", board: "x", query: "", everyDays: 7 })!, /Greenhouse or Lever/);
  assert.match(scheduleError({ provider: "lever", board: "not a token!", query: "", everyDays: 7 })!, /board token/);
  assert.match(scheduleError({ provider: "lever", board: "acme", query: "", everyDays: 0 })!, /1 to 90/);
});

test("a schedule runs when due, then every N days; a run is claimed once; a failure is kept", async () => {
  const { db, a, b } = await setup();
  await setSchedule(db, a, { subjectId: "CS310", provider: "greenhouse", board: "stripe", query: "analyst", inText: false, everyDays: 7 }, day(0));
  await setSchedule(db, b, { subjectId: "CS310", provider: "lever", board: "acme", query: "", inText: false, everyDays: 1 }, day(0));
  let calls = 0;
  const collect: Collector = async (s) => { calls++; if (s.board === "acme") throw new Error("Lever answered 503"); return { total: 5, postings: [posting("p" + calls)] }; };
  assert.equal(await runDue(db, collect, day(0), a), 1, "run now: only this account's schedules");
  assert.equal(calls, 1);
  assert.equal(await runDue(db, collect, day(0)), 1, "the other account's is still due; this one has moved on");
  assert.equal((await getSchedule(db, a, "CS310"))!.nextRunAt, day(7).toISOString(), "next run in 7 days");
  assert.equal(await runDue(db, collect, day(3)), 1, "a daily schedule is due again; the weekly one is not");
  const [latest] = await listRuns(db, a, "CS310");
  assert.deepEqual([latest.status, latest.total, latest.postings.map((p) => p.id)], ["ok", 5, ["p1"]]);
  const failed = await listRuns(db, b, "CS310");
  assert.deepEqual(failed.map((r) => [r.status, r.error]), [["failed", "Lever answered 503"], ["failed", "Lever answered 503"]], "kept so the lecturer sees it");
});

test("only the newest run carries its postings; old runs are trimmed; stopping keeps the runs", async () => {
  const { db, a } = await setup();
  await setSchedule(db, a, { subjectId: "CS310", provider: "greenhouse", board: "stripe", query: "", inText: false, everyDays: 1 }, day(0));
  let n = 0;
  const collect: Collector = async () => ({ total: 1, postings: [posting("r" + ++n)] });
  for (let i = 0; i < KEEP_RUNS + 3; i++) await runDue(db, collect, day(i));
  const runs = await listRuns(db, a, "CS310");
  assert.equal(runs.length, KEEP_RUNS);
  assert.deepEqual(runs[0].postings.map((p) => p.id), ["r" + (KEEP_RUNS + 3)], "newest first, with its postings");
  assert.equal(runs[1].postings.length, 0, "older runs only their counts");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM watch_runs")).rows[0].n, KEEP_RUNS, "older runs deleted");
  await stopSchedule(db, a, "CS310");
  assert.equal(await getSchedule(db, a, "CS310"), null);
  assert.equal((await listRuns(db, a, "CS310")).length, KEEP_RUNS);
});
