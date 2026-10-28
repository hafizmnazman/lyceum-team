// Watching on a schedule. A signed-in lecturer asks Lyceum to watch a course: every few days the server collects from the
// chosen board, or runs agent web search on the brief, and keeps the run. The workspace itself is the browser's to save
// (version-checked), so a run never writes into it: Watch lists the runs, says how many postings are new, and the
// lecturer opens one and imports what it wants, exactly as after a run by hand. Tables: server/migrations/002_watch.sql.

import type { Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { Db } from "./db.ts";
import { type AuthStore, originGuard, SESSION_COOKIE } from "./auth.ts";
import { collectBoard } from "./collect.ts";
import { liveDeps, loadAgentSettings, runAgentSearch } from "./agentSearch.ts";
import { BOARD_TOKEN, filterPostings } from "../src/lib/collect.ts";
import { missingSettings } from "../src/lib/agentSettings.ts";
import type { CollectedPosting } from "../src/types.ts";

export type WatchProvider = "greenhouse" | "lever" | "agent";
export interface WatchSchedule { subjectId: string; provider: WatchProvider; board: string; query: string; inText: boolean; everyDays: number; nextRunAt: string }
export interface WatchRun { id: number; subjectId: string; ranAt: string; provider: string; board: string; status: "ok" | "failed"; error: string | null; total: number; postings: CollectedPosting[] }
/** Fetch one schedule's postings: the source's total and the postings its keywords keep. */
export type Collector = (s: WatchSchedule) => Promise<{ total: number; postings: CollectedPosting[] }>;

export const KEEP_RUNS = 10;
export const TICK_MS = 15 * 60 * 1000;
const AGENT_RUN_MS = 6 * 60 * 1000;
const DAY_MS = 86400000;
type Row = Record<string, unknown>;
const iso = (v: unknown) => new Date(v as string).toISOString();
const toSchedule = (r: Row): WatchSchedule => ({ subjectId: String(r.subject_id), provider: r.provider as WatchProvider, board: String(r.board), query: String(r.query),
  inText: Boolean(r.in_text), everyDays: Number(r.every_days), nextRunAt: iso(r.next_run_at) });
const toRun = (r: Row): WatchRun => ({ id: Number(r.id), subjectId: String(r.subject_id), ranAt: iso(r.ran_at), provider: String(r.provider), board: String(r.board),
  status: r.status as "ok" | "failed", error: (r.error as string | null) ?? null, total: Number(r.total),
  postings: (typeof r.postings === "string" ? JSON.parse(r.postings) : r.postings) as CollectedPosting[] });

/** What a schedule may hold: a permitted board token, or an agent brief; keywords; every 1 to 90 days. */
export function scheduleError(input: { provider?: unknown; board?: unknown; query?: unknown; everyDays?: unknown }): string | null {
  if (!["greenhouse", "lever", "agent"].includes(input.provider as string)) return "Watch a Greenhouse or Lever board, or an agent search.";
  const board = typeof input.board === "string" ? input.board.trim() : "";
  if (input.provider === "agent" ? board.length < 3 || board.length > 300 : !BOARD_TOKEN.test(board)) return input.provider === "agent" ? "Describe what the agent should look for." : "Enter the employer's board token.";
  if (typeof input.query !== "string" || input.query.length > 300) return "Keep the keywords within 300 characters.";
  if (!Number.isInteger(input.everyDays) || (input.everyDays as number) < 1 || (input.everyDays as number) > 90) return "Watch every 1 to 90 days.";
  return null;
}

export async function getSchedule(db: Db, userId: string, subjectId: string): Promise<WatchSchedule | null> {
  const r = (await db.query("SELECT * FROM watch_schedules WHERE user_id = $1 AND subject_id = $2", [userId, subjectId])).rows[0];
  return r ? toSchedule(r) : null;
}
/** Save the schedule; its first run is due now, so the lecturer sees a result on the next tick. */
export async function setSchedule(db: Db, userId: string, s: Omit<WatchSchedule, "nextRunAt">, now = new Date()): Promise<WatchSchedule> {
  await db.query(`INSERT INTO watch_schedules (user_id, subject_id, provider, board, query, in_text, every_days, next_run_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
    ON CONFLICT (user_id, subject_id) DO UPDATE SET provider = $3, board = $4, query = $5, in_text = $6, every_days = $7, next_run_at = $8`,
    [userId, s.subjectId, s.provider, s.board.trim(), s.query.trim(), s.inText, s.everyDays, now]);
  return (await getSchedule(db, userId, s.subjectId))!;
}
export async function stopSchedule(db: Db, userId: string, subjectId: string) {
  await db.query("DELETE FROM watch_schedules WHERE user_id = $1 AND subject_id = $2", [userId, subjectId]);
}
/** The newest runs first; only the newest carries its postings, the rest their counts. */
export async function listRuns(db: Db, userId: string, subjectId: string): Promise<WatchRun[]> {
  const rows = (await db.query("SELECT * FROM watch_runs WHERE user_id = $1 AND subject_id = $2 ORDER BY ran_at DESC, id DESC LIMIT $3", [userId, subjectId, KEEP_RUNS])).rows;
  return rows.map((r, i) => ({ ...toRun(r), postings: i === 0 ? toRun(r).postings : [] }));
}
export async function getRun(db: Db, userId: string, id: number): Promise<WatchRun | null> {
  const r = (await db.query("SELECT * FROM watch_runs WHERE user_id = $1 AND id = $2", [userId, id])).rows[0];
  return r ? toRun(r) : null;
}

/** Run every schedule that is due, one at a time. Each is claimed by moving its next run on first, so two servers, or a tick
 *  overlapping a slow run, never run it twice. A failure is kept as a run too, so the lecturer sees it. */
export async function runDue(db: Db, collect: Collector, now = new Date(), onlyUser?: string): Promise<number> {
  const due = (await db.query("SELECT * FROM watch_schedules WHERE next_run_at <= $1" + (onlyUser ? " AND user_id = $2" : "") + " ORDER BY next_run_at",
    onlyUser ? [now, onlyUser] : [now])).rows;
  let ran = 0;
  for (const row of due) {
    const s = toSchedule(row), userId = String(row.user_id);
    const claimed = await db.query("UPDATE watch_schedules SET next_run_at = $1 WHERE user_id = $2 AND subject_id = $3 AND next_run_at = $4",
      [new Date(now.getTime() + s.everyDays * DAY_MS), userId, s.subjectId, row.next_run_at]);
    if (!claimed.count) continue;
    let result: { total: number; postings: CollectedPosting[] } | null = null, error: string | null = null;
    try { result = await collect(s); } catch (err) { error = (err instanceof Error ? err.message : String(err)).slice(0, 500); }
    await db.query("INSERT INTO watch_runs (user_id, subject_id, ran_at, provider, board, status, error, total, postings) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [userId, s.subjectId, now, s.provider, s.board, result ? "ok" : "failed", error, result?.total ?? 0, JSON.stringify(result?.postings ?? [])]);
    await db.query(`DELETE FROM watch_runs WHERE user_id = $1 AND subject_id = $2 AND id NOT IN
      (SELECT id FROM watch_runs WHERE user_id = $1 AND subject_id = $2 ORDER BY ran_at DESC, id DESC LIMIT $3)`, [userId, s.subjectId, KEEP_RUNS]);
    ran += 1;
  }
  return ran;
}

/** The real sources: the permitted board collector, or agent web search on the model and search provider in .env. */
export const liveCollector: Collector = async (s) => {
  if (s.provider === "agent") {
    const settings = await loadAgentSettings(), missing = missingSettings(settings);
    if (missing.length) throw new Error("Agent search is not set up: add " + missing.join(", ") + " to .env.");
    // ponytail: shares no lock with a search run by hand; two at once only cost two model runs.
    const result = await runAgentSearch(s.board, liveDeps(settings), settings, () => undefined, AbortSignal.timeout(AGENT_RUN_MS));
    return { total: result.postings.length, postings: filterPostings(result.postings, s.query, s.inText) };
  }
  const result = await collectBoard(s.provider, s.board);
  return { total: result.postings.length, postings: filterPostings(result.postings, s.query, s.inText).slice(0, 300) };
};

/** Check for due schedules now and every tick after. A tick that finds the database down tries again on the next. */
export function startWatching(db: Db, collect: Collector = liveCollector, everyMs = TICK_MS): () => void {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try { const ran = await runDue(db, collect); if (ran) console.log("watch: ran " + ran + " scheduled " + (ran === 1 ? "run" : "runs")); }
    catch (err) { console.error("watch tick failed:", err instanceof Error ? err.message : err); }
    finally { busy = false; }
  };
  void tick();
  const timer = setInterval(() => void tick(), everyMs);
  return () => clearInterval(timer);
}

/** The signed-in account's schedules and runs. A demo person has no account, so watching needs a sign in. */
export function watchRoutes(app: Hono, getStore: () => Promise<AuthStore>, db: Db, collect: Collector = liveCollector) {
  app.use("/api/watch/*", originGuard);
  const course = (c: Context) => c.req.param("subjectId") ?? "";
  const route = (fn: (c: Context, userId: string) => Promise<Response>) => async (c: Context) => {
    try {
      const user = await (await getStore()).userForSession(getCookie(c, SESSION_COOKIE));
      if (!user) return c.json({ error: "Sign in to an account to watch on a schedule." }, 401);
      return await fn(c, user.id);
    } catch (err) {
      console.error("watch failed:", err);
      return c.json({ error: "Watching is unavailable: the database is not reachable." }, 503);
    }
  };
  app.get("/api/watch/:subjectId", route(async (c, userId) =>
    c.json({ schedule: await getSchedule(db, userId, course(c)), runs: await listRuns(db, userId, course(c)) })));
  app.put("/api/watch/:subjectId", route(async (c, userId) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const error = scheduleError(body);
    if (error) return c.json({ error }, 400);
    return c.json({ schedule: await setSchedule(db, userId, { subjectId: course(c), provider: body.provider as WatchProvider, board: String(body.board),
      query: String(body.query), inText: body.inText === true, everyDays: body.everyDays as number }) });
  }));
  app.delete("/api/watch/:subjectId", route(async (c, userId) => { await stopSchedule(db, userId, course(c)); return c.json({ ok: true }); }));
  app.get("/api/watch/:subjectId/runs/:id", route(async (c, userId) => {
    const run = await getRun(db, userId, Number(c.req.param("id") ?? ""));
    return run && run.subjectId === course(c) ? c.json({ run }) : c.json({ error: "No such run." }, 404);
  }));
  // Run now: the schedule is made due and this account's due runs run before the answer, so the lecturer sees the result.
  app.post("/api/watch/:subjectId/run", route(async (c, userId) => {
    const now = new Date();
    await db.query("UPDATE watch_schedules SET next_run_at = $1 WHERE user_id = $2 AND subject_id = $3", [now, userId, course(c)]);
    await runDue(db, collect, now, userId);
    return c.json({ runs: await listRuns(db, userId, course(c)) });
  }));
}
