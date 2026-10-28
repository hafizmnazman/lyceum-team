// The helpers' record (supabase/migrations/20261029090000_agent_records.sql): every call to the model in agent_calls, and
// every thing a helper offers in agent_proposals, with what the lecturer then did. The API writes both; nothing here
// changes what a helper answers. While the database cannot be reached, recording pauses for a minute at a time and the
// helpers carry on: a lost log row never costs the lecturer a suggestion.
import { randomUUID } from "node:crypto";
import type { Db } from "./db.ts";
import { openAiChat, type Chat } from "./agentSearch.ts";
import type { AgentSettings } from "../shared/lib/agentSettings.ts";
import type { CollectedPosting } from "../shared/types.ts";

export type Helper = "folio" | "scout" | "atlas" | "lens" | "quill" | "prism" | "sandbox" | "settings";
/** Who asked, for what: one per API request. userId is null for a demo persona (no account). */
export interface CallContext { requestId: string; helper: Helper; route: string; userId: string | null; subjectId: string | null }
export const newContext = (helper: Helper, route: string, userId: string | null, subjectId: string | null): CallContext =>
  ({ requestId: randomUUID(), helper, route, userId, subjectId: subjectId?.trim().slice(0, 40) || null });

const PAUSE_MS = 60_000;
const KEEP_CONTENT_DAYS = 30;
let pausedUntil = 0;
/** Run one write; on failure, say so once and stop trying for a minute, so a missing database does not slow every call. */
async function write(db: Db | null, sql: string, params: unknown[]): Promise<void> {
  if (!db || Date.now() < pausedUntil) return;
  try {
    await db.query(sql, params);
  } catch (err) {
    pausedUntil = Date.now() + PAUSE_MS;
    console.warn("recording paused for a minute, the database did not take a row:", err instanceof Error ? err.message : err);
  }
}
/** For the proofs: record again straight away. */
export const resumeRecording = () => { pausedUntil = 0; };

/** A reply a JSON-answering helper cannot use at all: no braces anywhere. A reply with JSON of the wrong shape is "ok" here
 *  and shows up as a call with no proposals. Calls with tools (Scout) answer with tool calls, so they are never judged. */
const unreadable = (content: string | null) => !/\{[\s\S]*\}/.test(content ?? "");

/** The model client, recording each call it makes under ctx. */
export function recordedChat(db: Db | null, s: AgentSettings, ctx: CallContext, chat: Chat = openAiChat(s)): Chat {
  return async (messages, tools) => {
    const started = Date.now();
    const row = (status: string, error: string | null, reply: unknown, usage?: { promptTokens: number | null; completionTokens: number | null; cost: number | null }) =>
      write(db, "INSERT INTO agent_calls (request_id, helper, route, user_id, demo, subject_id, provider, model, prompt_tokens, completion_tokens, cost, duration_ms, status, error, prompt, reply) "
        + "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)",
      [ctx.requestId, ctx.helper, ctx.route, ctx.userId, ctx.userId === null, ctx.subjectId, s.model.provider, s.model.model,
        usage?.promptTokens ?? null, usage?.completionTokens ?? null, usage?.cost ?? null, Date.now() - started, status, error,
        JSON.stringify(messages), reply === undefined ? null : JSON.stringify(reply)]);
    try {
      const reply = await chat(messages, tools);
      await row(!tools.length && unreadable(reply.content) ? "unreadable" : "ok", null, { content: reply.content, tool_calls: reply.tool_calls }, reply.usage);
      return reply;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await row(/in time|timeout|timed out|aborted/i.test(message) ? "timeout" : "error", message.slice(0, 1000), undefined);
      throw err;
    }
  };
}

/** One thing a helper offered. summary is the line a person reads in the dashboard; payload is the proposal itself. */
export interface Offer { kind: string; summary: string; payload: unknown }
/** Record what a helper offered and give each its id, which the browser sends back with the lecturer's verdict. Without a
 *  database the offers still go out, without ids. */
export async function recordProposals<T extends object>(db: Db | null, ctx: CallContext, offers: T[], describe: (offer: T) => Offer): Promise<Array<T & { proposalId?: string }>> {
  if (!db || Date.now() < pausedUntil || !offers.length) return offers;
  try {
    const ids: string[] = [];
    for (const offer of offers) {
      const d = describe(offer), id = randomUUID();
      await db.query("INSERT INTO agent_proposals (id, request_id, helper, kind, user_id, demo, subject_id, summary, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [id, ctx.requestId, ctx.helper, d.kind, ctx.userId, ctx.userId === null, ctx.subjectId, d.summary.slice(0, 300), JSON.stringify(d.payload)]);
      ids.push(id);
    }
    return offers.map((offer, i) => ({ ...offer, proposalId: ids[i] }));
  } catch (err) {
    pausedUntil = Date.now() + PAUSE_MS;
    console.warn("recording paused for a minute, the database did not take the proposals:", err instanceof Error ? err.message : err);
    return offers;
  }
}

/** Scout's postings, from a search run by hand or on a schedule: importing one is taking it. */
export const describePosting = (p: CollectedPosting): Offer =>
  ({ kind: "posting", summary: p.title + (p.organisation ? " (" + p.organisation + ")" : ""), payload: { url: p.url, title: p.title, organisation: p.organisation } });

export type Verdict = "accepted" | "edited" | "dismissed";
export const VERDICTS: readonly Verdict[] = ["accepted", "edited", "dismissed"];
/** The lecturer's verdict on one proposal, by its own account only. A later verdict replaces an earlier one (a dismissed
 *  suggestion can still be taken). False when there is no such proposal of theirs. */
export async function recordVerdict(db: Db, userId: string, proposalId: string, verdict: Verdict, reason: string | null, now = new Date()): Promise<boolean> {
  const r = await db.query("UPDATE agent_proposals SET status = $1, reason = $2, decided_at = $3 WHERE id::text = $4 AND user_id = $5 RETURNING id",
    [verdict, verdict === "dismissed" ? reason?.trim().slice(0, 500) || null : null, now, proposalId, userId]);
  return r.rows.length > 0;
}

/** What was sent and what came back is kept for 30 days, then cleared; the rest of the row stays for the metrics. */
export async function clearOldContent(db: Db, now = Date.now()): Promise<number> {
  const r = await db.query("UPDATE agent_calls SET prompt = NULL, reply = NULL WHERE at < $1 AND (prompt IS NOT NULL OR reply IS NOT NULL) RETURNING id",
    [new Date(now - KEEP_CONTENT_DAYS * 24 * 3600 * 1000)]);
  return r.rows.length;
}
