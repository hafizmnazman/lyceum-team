// The Lyceum Loop (plan Section 4): Setup opens the course, six steps follow,
// and History keeps the record. One list, read by the step path, the ring, the
// hash routes (#/course/:id/<step>) and the step headers, so the names, the
// questions and the handoffs are the same everywhere.
//
// The loop is per course and per term. A step is done only when the record it
// produces exists inside the current term's window (the "Done when" column of
// Section 4); a loop closed last term stays in the history and never certifies
// the new one. Seeded examples never count as the lecturer's work.

import { SEED_RESULT_UPLOADS } from "../data/seed.ts";
import { briefDecisionState, type BriefDecisionState } from "../lib/decisions.ts";
import type { EvidenceBrief } from "../types.ts";
import type { Screen } from "./roles.ts";
import type { AppState } from "./store.ts";

export type CourseStep = "course" | "watch" | "report" | "decide" | "update" | "teach" | "learn" | "history";
/** The Report step's sub-steps (plan Section 5.3), in this order. */
export type ReportTab = "quote" | "review" | "count" | "map" | "brief";
export const REPORT_TABS: ReportTab[] = ["quote", "review", "count", "map", "brief"];
export const REPORT_TAB_LABEL: Record<ReportTab, string> = { quote: "Quote", review: "Review", count: "Count", map: "Map", brief: "Brief" };
export type StudioTab = AppState["studioTab"];

export interface LoopStepDef {
  id: CourseStep;
  label: string;
  number: number | null; // 1 to 6 for the loop's steps; Course is setup and History the record
  question: string; // the one line under the step's title (Section 4)
  helper: string; // who assists at this step (Section 7.1); people decide at Decide
  handoff: string; // the line that ends the step and the question the next one answers (Section 4.1)
  screen: Screen;
  tab?: StudioTab;
}

export const LOOP_STEPS: LoopStepDef[] = [
  { id: "course", label: "Course", number: null, question: "What does this course promise today?", helper: "Folio, the course reader",
    handoff: "A course is a promise, not evidence. Next: Watch what employers ask for.", screen: "studio", tab: "overview" },
  { id: "watch", label: "Watch", number: 1, question: "What are employers asking for, right now and over time?", helper: "Scout, the industry researcher",
    handoff: "Postings are not evidence until someone reads them. Next: Report.", screen: "watch" },
  { id: "report", label: "Report", number: 2, question: "What exactly do they ask, how often, and what does the course do about it?", helper: "Atlas, Lens and Steward",
    handoff: "A count is not a decision. Next: Decide.", screen: "report" },
  { id: "decide", label: "Decide", number: 3, question: "What will we do, and who said so?", helper: "People decide; the sandbox can try a change on a mock cohort",
    handoff: "A decision is not a course. Next: Update.", screen: "decide" },
  { id: "update", label: "Update", number: 4, question: "What does the approved change look like, within our hours and rules?", helper: "Quill, the course designer",
    handoff: "A course is not a class. Next: Teach.", screen: "studio", tab: "curriculum" },
  { id: "teach", label: "Teach", number: 5, question: "What will the class do, and with what?", helper: "Prism, the teaching-material creator",
    handoff: "A class is not proof. Next: Learn.", screen: "studio", tab: "plan" },
  { id: "learn", label: "Learn", number: 6, question: "Did it work, as far as we can honestly tell?", helper: "Lens, the evidence analyst",
    handoff: "Next semester the loop runs again.", screen: "learn" },
  { id: "history", label: "History", number: null, question: "Versions and decisions on one timeline.", helper: "Folio, the course reader",
    handoff: "", screen: "studio", tab: "history" },
];

export const COURSE_STEPS = LOOP_STEPS.map((s) => s.id);
/** The steps the ring shows: Course plus the six. */
export const RING_STEPS: CourseStep[] = ["course", "watch", "report", "decide", "update", "teach", "learn"];

export function stepDef(id: CourseStep): LoopStepDef {
  return LOOP_STEPS.find((s) => s.id === id)!;
}

export function isCourseStep(value: string): value is CourseStep {
  return (COURSE_STEPS as string[]).includes(value);
}

/** The step a Studio panel belongs to. */
export function stepForTab(tab: StudioTab, current: CourseStep | null): CourseStep {
  if (current && stepDef(current).tab === tab) return current;
  return tab === "curriculum" ? "update" : tab === "plan" ? "teach" : tab === "history" ? "history" : "course";
}

// ---------- the term ----------

export interface TermWindow { term: string; since: string }

/** The course's current term: the teaching plan's term, or failing that the latest adopted version's
 *  effective term. The window restarts only when the term changes from one stated value to another
 *  (a "term-set" event); setting a term for the first time keeps the work already done. */
export function termWindow(state: AppState, subjectId: string): TermWindow {
  const plan = state.teachingPlans.find((p) => p.subjectId === subjectId);
  const adopted = state.subjectVersions.filter((v) => v.subjectId === subjectId && v.effectiveTerm).sort((a, b) => a.changedAt.localeCompare(b.changedAt)).at(-1);
  const term = plan?.term || adopted?.effectiveTerm || "";
  const restart = state.events.filter((e) => e.kind === "term-set" && e.refs.subjectId === subjectId && e.refs.previousTerm && e.refs.term && e.refs.previousTerm !== e.refs.term)
    .map((e) => e.at).sort().at(-1) ?? "";
  return { term, since: restart };
}

/** The course version taught this term: the version this term's sessions were saved on (the latest
 *  session decides), or the current version when no session is saved yet. */
export function taughtVersionId(state: AppState, subjectId: string): string | null {
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!subject) return null;
  const since = termWindow(state, subjectId).since;
  const sessions = (state.teachingPlans.find((p) => p.subjectId === subjectId)?.sessions ?? [])
    .filter((s) => s.courseVersionId && s.updatedAt >= since).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return sessions.at(-1)?.courseVersionId ?? subject.currentVersionId;
}

/** Every version this course has had, the current one included. */
export function courseVersionIds(state: AppState, subjectId: string): Set<string> {
  const subject = state.subjects.find((s) => s.id === subjectId);
  return new Set([...state.subjectVersions.filter((v) => v.subjectId === subjectId).map((v) => v.id), ...(subject ? [subject.currentVersionId] : [])]);
}

// ---------- the done rules ----------

export interface LoopStepStatus { id: CourseStep; done: boolean; count: string; note?: string }
export interface LoopState {
  window: TermWindow;
  steps: LoopStepStatus[];
  next: CourseStep | null; // the first step of the ring not done
  closed: boolean; // Course and all six steps done this term
  adoptedSinceDecision: number; // versions adopted at or after the governing decision, whatever it was
  latestBrief: EvidenceBrief | null;
  decision: BriefDecisionState | null;
  singleOwner: boolean;
  summary: string; // literal and scoped; never "approved", "ready" or "good"
}

export const plural = (n: number, one: string, many: string) => n + " " + (n === 1 ? one : many);

export function loopState(state: AppState, subjectId: string): LoopState {
  const window = termWindow(state, subjectId);
  const inWindow = (at: string | null | undefined) => Boolean(at) && at! >= window.since;
  const subject = state.subjects.find((s) => s.id === subjectId);
  const singleOwner = Boolean(subject?.workspaceOnly);
  const outcomes = state.clos.filter((c) => c.subjectId === subjectId);
  const current = new Set(outcomes.map((c) => c.id));
  const sources = state.evidenceSources.filter((s) => s.subjectId === subjectId);
  const reviewed = sources.filter((s) => s.reviewed && !s.duplicateOf && inWindow(s.addedAt));
  const mentions = state.skillMentions.filter((m) => m.subjectId === subjectId && inWindow(m.addedAt));
  const mappings = state.skillMappings.filter((m) => m.subjectId === subjectId && inWindow(m.updatedAt));
  const briefs = state.evidenceBriefs.filter((b) => b.subjectId === subjectId);
  const latestBrief = briefs.filter((b) => inWindow(b.createdAt)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1) ?? null;
  const decision = latestBrief ? briefDecisionState(latestBrief, briefs, state.briefDecisions, singleOwner) : null;
  const governing = decision?.governing && inWindow(decision.governing.at) ? decision.governing : null;
  // Update follows the decision: an adoption counts only under an adopt decision, and only from its time on, so a
  // new course's first outline, or a revision adopted before anyone decided, is history and not this term's update.
  // "After the decision" is by time; at the same moment (the pinned demo clock) the event log's order decides.
  const decisionEvent = governing ? state.events.findIndex((e) => e.kind === "decision-recorded" && e.refs.decisionId === governing.id) : -1;
  const afterDecision = (draftId: string, at: string) => {
    if (at !== governing!.at) return at > governing!.at;
    const adoptionEvent = state.events.findIndex((e) => e.kind === "version-adopted" && e.refs.draftId === draftId);
    return decisionEvent < 0 || adoptionEvent < 0 || adoptionEvent > decisionEvent;
  };
  const adoptedSince = governing ? state.curriculumDrafts.filter((d) => d.subjectId === subjectId).flatMap((d) => d.history.filter((h) => h.action === "adopted" && inWindow(h.at) && afterDecision(d.id, h.at))) : [];
  const adoptions = governing?.outcome === "adopt" ? adoptedSince : [];
  const versions = state.subjectVersions.filter((v) => v.subjectId === subjectId);
  const sessions = (state.teachingPlans.find((p) => p.subjectId === subjectId)?.sessions ?? []).filter((s) => inWindow(s.updatedAt));
  const seeded = new Set(SEED_RESULT_UPLOADS.map((u) => u.id));
  const versionsOfCourse = courseVersionIds(state, subjectId);
  const filedThisTerm = state.resultUploads.filter((u) => u.subjectId === subjectId && !seeded.has(u.id) && inWindow(u.filedAt));
  // Learn: a term's results are filed and matched to the taught version (Section 4).
  const filed = filedThisTerm.filter((u) => u.courseVersionId && versionsOfCourse.has(u.courseVersionId));

  const quoted = reviewed.some((s) => mentions.some((m) => m.sourceId === s.id));
  const mapped = mappings.some((m) => m.cloIds.some((id) => current.has(id)));
  const returned = governing?.outcome === "return";
  const decided = Boolean(governing && (governing.outcome === "adopt" || governing.outcome === "retain"));
  const retained = governing?.outcome === "retain";
  const decideNote = !latestBrief ? undefined
    : decision!.status === "self-recorded" ? "Decision recorded by the author; a second person's confirmation is open"
    : governing?.outcome === "defer" ? "Deferred; the step stays open"
    : returned ? "Returned to Report" : undefined;
  const steps: LoopStepStatus[] = [
    { id: "course", done: Boolean(subject) && outcomes.length > 0, count: plural(outcomes.length, "outcome", "outcomes") },
    { id: "watch", done: reviewed.length > 0, count: plural(sources.length, "source", "sources") },
    { id: "report", done: quoted && mapped && Boolean(latestBrief) && !returned, count: plural(mentions.length, "quotation", "quotations"), note: returned ? "Returned by the decision; prepare a new brief" : undefined },
    { id: "decide", done: decided, count: latestBrief ? plural(decision!.standing.length, "decision", "decisions") : "no brief yet", note: decideNote },
    // Retain completes Update; if a version was adopted after it anyway, the count says so rather than "no change".
    { id: "update", done: adoptions.length > 0 || retained, count: retained ? (adoptedSince.length ? plural(adoptedSince.length, "version", "versions") + " adopted after a retain decision" : "no change this term") : plural(adoptions.length, "adopted version", "adopted versions") },
    { id: "teach", done: sessions.some((s) => s.cloIds.some((id) => current.has(id))), count: plural(sessions.length, "session", "sessions") },
    { id: "learn", done: filed.length > 0, count: plural(filed.length, "result file", "result files"),
      note: !filed.length && filedThisTerm.length ? "Results filed without a course version; file them again with the version taught" : undefined },
    { id: "history", done: false, count: plural(versions.length, "version", "versions") },
  ];
  const ring = steps.filter((s) => RING_STEPS.includes(s.id));
  const next = ring.find((s) => !s.done)?.id ?? null;
  const closed = !next;
  const termText = window.term || "this term";
  const summary = closed
    ? "Loop closed for " + termText + ": " + plural(reviewed.length, "posting", "postings") + " reviewed, " + plural(decision?.standing.length ?? 0, "decision", "decisions") + ", "
      + (adoptedSince.length ? plural(adoptedSince.length, "version", "versions") : "no change to the outline") + ", " + plural(sessions.length, "session", "sessions") + (singleOwner && governing?.byPersonId === latestBrief?.createdBy ? ". Closed on the author's own decision: this is a single-owner course." : ".")
    : ring.filter((s) => s.done).length + " of " + ring.length + " done for " + termText + ". Next: " + stepDef(next!).label + ".";
  return { window, steps, next, closed, adoptedSinceDecision: adoptedSince.length, latestBrief, decision, singleOwner, summary };
}

/** The term on at most two lines that fit inside the ring (the mono face is about 0.6 em a character),
 *  split at spaces; a word too long for a line is shortened with three dots. */
export function ringTermLines(term: string, maxChars: number): string[] {
  const fit = (s: string) => (s.length <= maxChars ? s : s.slice(0, Math.max(1, maxChars - 3)) + "...");
  if (term.length <= maxChars) return [term];
  const words = term.split(/\s+/).filter(Boolean);
  let first = "";
  while (words.length && (first ? first + " " + words[0] : words[0]).length <= maxChars) first = first ? first + " " + words.shift() : words.shift()!;
  if (!first) first = fit(words.shift()!);
  return words.length ? [first, fit(words.join(" "))] : [first];
}

/** Done marks and counts for each step of one course, from saved records only. */
export function loopStatus(state: AppState, subjectId: string): LoopStepStatus[] {
  return loopState(state, subjectId).steps;
}
