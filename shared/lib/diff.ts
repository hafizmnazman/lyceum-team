// Before and after (depth plan Section 6.1): one deterministic library for every comparison the app shows. It reads
// records only and never guesses: a word diff of two texts, the hours of each topic in two versions, what changed
// between two teaching packs built from records, the change in an outcome's results between two terms, a summary
// in words, and each version against the one it replaced. The views in ui/primitives/compare.tsx draw what these return.

import type { CourseDefinition, CourseTopic, CurriculumDraft, LoopEvent, PersonId, SubjectVersion, TeachingSession } from "../types.ts";
import { previousVersionOf } from "./decisions.ts";
import type { DeckSlide, DeckSpec } from "./slides.ts";
import { changedOutcomeWeek, sessionInWeek } from "./teachingPlan.ts";

// ---------- words ----------

export type DiffRun = { kind: "kept" | "deleted" | "inserted"; text: string };

/** Above this many token pairs the diff gives up on alignment and shows the old text deleted and the new inserted. */
const MAX_CELLS = 4_000_000;
const tokens = (text: string) => text.match(/\s+|[^\s]+/g) ?? [];

/** A word-level diff: a longest common subsequence over words and the spaces between them, as runs of kept, deleted
 *  and inserted text in reading order. Joining the kept and deleted runs gives the old text; kept and inserted, the new. */
export function wordDiff(a: string, b: string): DiffRun[] {
  const x = tokens(a), y = tokens(b);
  if (x.length * y.length > MAX_CELLS) return merge([{ kind: "deleted", text: a }, { kind: "inserted", text: b }]);
  // lengths[i][j]: the common subsequence of x[i..] and y[j..], filled from the end.
  const lengths = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      lengths[i][j] = x[i] === y[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const runs: DiffRun[] = [];
  let i = 0, j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { runs.push({ kind: "kept", text: x[i] }); i++; j++; }
    else if (lengths[i + 1][j] >= lengths[i][j + 1]) runs.push({ kind: "deleted", text: x[i++] });
    else runs.push({ kind: "inserted", text: y[j++] });
  }
  while (i < x.length) runs.push({ kind: "deleted", text: x[i++] });
  while (j < y.length) runs.push({ kind: "inserted", text: y[j++] });
  return merge(tidy(runs));
}

/** A space kept alone between two changes reads as part of the change: "a b" to "c d" is one deletion and one insertion. */
function tidy(runs: DiffRun[]): DiffRun[] {
  const out: DiffRun[] = [];
  for (let k = 0; k < runs.length; k++) {
    const r = runs[k], prev = out[out.length - 1], next = runs[k + 1];
    if (r.kind === "kept" && !r.text.trim() && prev && next && prev.kind !== "kept" && next.kind !== "kept") {
      out.push({ kind: "deleted", text: r.text }, { kind: "inserted", text: r.text });
    } else out.push(r);
  }
  // Deletions before insertions inside each changed stretch, so a reader sees what went, then what came.
  const sorted: DiffRun[] = [];
  for (let k = 0; k < out.length;) {
    if (out[k].kind === "kept") { sorted.push(out[k++]); continue; }
    const stretch: DiffRun[] = [];
    while (k < out.length && out[k].kind !== "kept") stretch.push(out[k++]);
    sorted.push(...stretch.filter((r) => r.kind === "deleted"), ...stretch.filter((r) => r.kind === "inserted"));
  }
  return sorted;
}

function merge(runs: DiffRun[]): DiffRun[] {
  const out: DiffRun[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const last = out[out.length - 1];
    if (last && last.kind === r.kind) last.text += r.text; else out.push({ ...r });
  }
  return out;
}

// ---------- topics and hours ----------

export interface TopicHours { contact: number; lecture: number | null; lab: number | null }
export type TopicCell = "title" | "week" | "contact" | "lecture" | "lab";
export interface TopicDelta {
  id: string; title: string;
  week: { before: number | null; after: number | null } | null; // null when the topic exists in one version only
  before: TopicHours | null; after: TopicHours | null;          // null when it was added or removed
  delta: number;                                                 // contact hours, after minus before
  status: "added" | "removed" | "changed" | "moved" | "unchanged";
  changed: TopicCell[];                                          // the cells that differ, to outline
}

const hoursOf = (t: CourseTopic): TopicHours => ({ contact: t.contactHours, lecture: t.lectureHours ?? null, lab: t.labHours ?? null });

/** Each topic's hours in two versions, in the new version's order with removed topics after: lecture and lab hours before
 *  and after, the change in contact hours, and whether it was added, removed, changed or moved (a new week or place). */
export function topicDeltas(before: CourseDefinition, after: CourseDefinition): TopicDelta[] {
  const out: TopicDelta[] = [];
  after.topics.forEach((t, index) => {
    const old = before.topics.find((b) => b.id === t.id);
    if (!old) { out.push({ id: t.id, title: t.title, week: null, before: null, after: hoursOf(t), delta: t.contactHours, status: "added", changed: ["title", "week", "contact", "lecture", "lab"] }); return; }
    const a = hoursOf(old), b = hoursOf(t);
    const changed: TopicCell[] = [];
    if (old.title !== t.title) changed.push("title");
    if (old.week !== t.week) changed.push("week");
    if (a.contact !== b.contact) changed.push("contact");
    if (a.lecture !== b.lecture) changed.push("lecture");
    if (a.lab !== b.lab) changed.push("lab");
    const hours = changed.some((c) => c === "contact" || c === "lecture" || c === "lab" || c === "title");
    const moved = changed.includes("week") || before.topics.indexOf(old) !== index;
    out.push({ id: t.id, title: t.title, week: { before: old.week, after: t.week }, before: a, after: b, delta: b.contact - a.contact,
      status: hours ? "changed" : moved ? "moved" : "unchanged", changed });
  });
  for (const old of before.topics) if (!after.topics.some((t) => t.id === old.id))
    out.push({ id: old.id, title: old.title, week: null, before: hoursOf(old), after: null, delta: -old.contactHours, status: "removed", changed: ["title", "week", "contact", "lecture", "lab"] });
  return out;
}

/** "+3 h", "-2 h" or "no change": a change in hours in words, never only an arrow. */
export function hoursDelta(delta: number): string {
  const n = Math.round(delta * 100) / 100;
  return n === 0 ? "no change" : (n > 0 ? "+" : "-") + Math.abs(n) + " h";
}

// ---------- teaching packs ----------

export type SlidePart = "title" | "body" | "right" | "figure" | "notes";
export interface PartChange { part: SlidePart; removed: string[]; added: string[] }
export interface SlideChange {
  kind: "added" | "removed" | "changed";
  title: string;
  beforeIndex: number | null; afterIndex: number | null; // positions in each pack, from 0
  parts: PartChange[];                                   // empty for an added or removed slide
}

const bodyLines = (s: DeckSlide) => [...(s.subtitle ? [s.subtitle] : []), ...(s.paragraphs ?? []), ...(s.bullets ?? [])];
const figureLines = (s: DeckSlide) => s.table ? [s.table.header.join(" | "), ...s.table.rows.map((r) => r.join(" | "))]
  : s.chart ? s.chart.categories.map((c, i) => c + ": " + s.chart!.values[i]) : s.placeholder ? [s.placeholder] : [];
const PARTS: Array<[SlidePart, (s: DeckSlide) => string[]]> = [
  ["title", (s) => [s.title]], ["body", bodyLines], ["right", (s) => s.right ?? []], ["figure", figureLines], ["notes", (s) => (s.notes ? [s.notes] : [])],
];

/** What changed between two packs built from records: slides matched by title (a pack's titles are unique), then a renamed
 *  slide by its position when it keeps some of its content; for each matched slide, the lines removed and added in its title,
 *  body, second column, figure and notes. A slide with a new title and nothing in common is a removal and an addition. */
export function deckDiff(a: DeckSpec, b: DeckSpec): SlideChange[] {
  const used = new Set<number>();
  const content = (s: DeckSlide) => [...bodyLines(s), ...(s.right ?? []), ...figureLines(s)];
  const match = (slide: DeckSlide, index: number) => {
    let at = b.slides.findIndex((s, i) => !used.has(i) && s.title === slide.title);
    const there = b.slides[index];
    if (at < 0 && there && !used.has(index) && !a.slides.some((s) => s.title === there.title) && content(slide).some((l) => content(there).includes(l))) at = index;
    return at;
  };
  const out: SlideChange[] = [];
  a.slides.forEach((slide, i) => {
    const at = match(slide, i);
    if (at < 0) { out.push({ kind: "removed", title: slide.title, beforeIndex: i, afterIndex: null, parts: [] }); return; }
    used.add(at);
    const next = b.slides[at];
    const parts = PARTS.map(([part, read]): PartChange => {
      const was = read(slide), now = read(next);
      return { part, removed: was.filter((l) => !now.includes(l)), added: now.filter((l) => !was.includes(l)) };
    }).filter((p) => p.removed.length || p.added.length);
    if (parts.length) out.push({ kind: "changed", title: next.title, beforeIndex: i, afterIndex: at, parts });
  });
  b.slides.forEach((slide, i) => { if (!used.has(i)) out.push({ kind: "added", title: slide.title, beforeIndex: null, afterIndex: i, parts: [] }); });
  return out.sort((x, y) => (x.afterIndex ?? x.beforeIndex ?? 0) - (y.afterIndex ?? y.beforeIndex ?? 0));
}

// ---------- results between terms ----------

/** One outcome's result in one term, with the wording it was assessed against. */
export interface OutcomeResult { cloId: string; label: string; text: string; share: number | null }
export interface ResultDelta {
  cloId: string; label: string;
  before: number | null; after: number | null; // shares from 0 to 1
  points: number | null;                       // the change in percentage points, when comparable
  comparable: boolean; reason: string | null;  // why not, in words
}

const sameWords = (x: string, y: string) => x.trim().replace(/\s+/g, " ") === y.trim().replace(/\s+/g, " ");

/** Each outcome's share before and after, in points, and "not comparable" when the outcome was reworded between the two
 *  versions (the two terms assessed different promises) or either term has no result for it. */
export function resultDeltas(prior: OutcomeResult[], current: OutcomeResult[]): ResultDelta[] {
  const ids = [...new Set([...current.map((r) => r.cloId), ...prior.map((r) => r.cloId)])];
  return ids.map((id) => {
    const p = prior.find((r) => r.cloId === id), c = current.find((r) => r.cloId === id);
    const label = c?.label ?? p?.label ?? id, before = p?.share ?? null, after = c?.share ?? null;
    const reason = !p ? "not assessed in the earlier term" : !c ? "not assessed in this term" : !sameWords(p.text, c.text) ? "reworded between terms; not comparable"
      : before === null || after === null ? "no result in one of the terms" : null;
    return { cloId: id, label, before, after, comparable: reason === null, reason, points: reason === null ? Math.round((after! - before!) * 1000) / 10 : null };
  });
}

// ---------- the summary in words ----------

const count = (n: number, one: string, many: string) => n + " " + (n === 1 ? one : many);

/** "1 outcome reworded, 1 topic added, 3 h added, 1 slide changed", from the diffs; "no change" when there is none. */
export function changeSummary(before: CourseDefinition, after: CourseDefinition, slides: SlideChange[] = []): string {
  const parts: string[] = [];
  const reworded = after.outcomes.filter((o) => { const b = before.outcomes.find((x) => x.id === o.id); return b && !sameWords(b.text, o.text); }).length;
  const relevelled = after.outcomes.filter((o) => { const b = before.outcomes.find((x) => x.id === o.id); return b && b.bloomLevel !== o.bloomLevel; }).length;
  const outcomesAdded = after.outcomes.filter((o) => !before.outcomes.some((b) => b.id === o.id)).length;
  const outcomesRemoved = before.outcomes.filter((b) => !after.outcomes.some((o) => o.id === b.id)).length;
  if (reworded) parts.push(count(reworded, "outcome reworded", "outcomes reworded"));
  if (relevelled) parts.push(count(relevelled, "outcome at a new Bloom level", "outcomes at a new Bloom level"));
  if (outcomesAdded) parts.push(count(outcomesAdded, "outcome added", "outcomes added"));
  if (outcomesRemoved) parts.push(count(outcomesRemoved, "outcome removed", "outcomes removed"));
  const topics = topicDeltas(before, after);
  const by = (status: TopicDelta["status"]) => topics.filter((t) => t.status === status).length;
  if (by("added")) parts.push(count(by("added"), "topic added", "topics added"));
  if (by("removed")) parts.push(count(by("removed"), "topic removed", "topics removed"));
  if (by("changed")) parts.push(count(by("changed"), "topic changed", "topics changed"));
  if (by("moved")) parts.push(count(by("moved"), "topic moved", "topics moved"));
  const hours = Math.round(topics.reduce((n, t) => n + t.delta, 0) * 100) / 100;
  if (hours) parts.push(Math.abs(hours) + " h " + (hours > 0 ? "added" : "removed"));
  if (JSON.stringify(before.assessment ?? []) !== JSON.stringify(after.assessment ?? [])) parts.push("the assessment plan changed");
  const changedSlides = slides.length;
  if (changedSlides) parts.push(count(changedSlides, "slide changed", "slides changed"));
  return parts.length ? parts.join(", ") : "no change";
}

// ---------- a version against the one it replaced ----------

/** A version's change against the version it replaced: the two outlines, the pack of the first week that teaches a
 *  reworded outcome built under both, and the summary in words; nulls where there is nothing to compare. */
export function versionChange(version: SubjectVersion, versions: SubjectVersion[], events: LoopEvent[], drafts: CurriculumDraft[],
  sessions: TeachingSession[], makePack: (session: TeachingSession, version: SubjectVersion) => DeckSpec) {
  const prev = previousVersionOf(version, versions, events, drafts);
  const compare = prev?.definition && version.definition ? { before: prev.definition, after: version.definition } : null;
  const packSession = compare ? sessionInWeek(sessions, changedOutcomeWeek(compare.after, compare.before)) : null;
  const packs = compare && packSession ? { before: makePack(packSession, prev!), after: makePack(packSession, version) } : null;
  return { prev, compare, packSession, packs, summary: compare ? changeSummary(compare.before, compare.after, packs ? deckDiff(packs.before, packs.after) : []) : null };
}

/** The scrubber's named stops (depth plan Section 6.2, pattern 7): every version oldest first, each with the day it was
 *  saved, who saved it and its change in words, null for the first on record. */
export function versionStops(versions: SubjectVersion[], summaryOf: (v: SubjectVersion) => string | null): Array<{ id: string; by: PersonId; when: string; summary: string | null }> {
  return [...versions].sort((a, b) => a.changedAt.localeCompare(b.changedAt))
    .map((v) => ({ id: v.id, by: v.changedBy, when: v.changedAt.slice(0, 10), summary: summaryOf(v) }));
}
