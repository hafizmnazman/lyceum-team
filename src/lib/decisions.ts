// The decision record (plan Sections 4 and 4.2), as pure functions over saved
// records. A decision is never edited: an amendment is a new record, and a
// person's latest record on a brief is their standing decision. The brief's
// author cannot be its sole decider, so the author's own decision is labelled
// self-recorded and the step stays open until a second person decides, unless
// the course is single-owner (a personal course workspace). A newer brief for
// the same course supersedes the decisions on an older one, and a decision taken
// before the evidence changed is shown with that fact rather than deleted.

import type { BriefDecision, CurriculumDraft, DecisionOutcome, EvidenceBrief, EvidenceSource, LoopEvent, SkillMapping, SkillMention, SubjectVersion } from "../types.ts";

export const DECISION_OUTCOMES: DecisionOutcome[] = ["adopt", "retain", "defer", "return"];
export const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  adopt: "Adopt the change",
  retain: "Retain the course as it is",
  defer: "Defer the decision",
  return: "Return to the evidence",
};
export const OUTCOME_HELP: Record<DecisionOutcome, string> = {
  adopt: "The recommended change goes ahead; Update prepares the checked revision.",
  retain: "The course stays as it is this term; Update shows no change and the loop continues to Teach.",
  defer: "No decision yet; the step stays open.",
  return: "The evidence needs more work; the brief goes back to Report.",
};
export const NOTE_MAX = 2000;

export type DecisionStatus = "open" | "self-recorded" | "decided";
export interface BriefDecisionState {
  brief: EvidenceBrief;
  records: BriefDecision[]; // every record on this brief, oldest first
  standing: BriefDecision[]; // each person's latest record
  byAuthor: BriefDecision | null;
  independent: BriefDecision | null; // the latest standing decision by someone other than the author
  governing: BriefDecision | null; // the decision that sets the step: the independent one, or the author's on a single-owner course
  status: DecisionStatus;
  supersededBy: EvidenceBrief | null; // a newer brief for the same course
}

// Records are appended, so the order they were saved in breaks a tie between equal times (the pinned demo clock).
function inOrder<T>(list: T[], at: (x: T) => string): T[] {
  return list.map((x, i) => ({ x, i })).sort((a, b) => at(a.x).localeCompare(at(b.x)) || a.i - b.i).map(({ x }) => x);
}

export function briefDecisionState(brief: EvidenceBrief, briefs: EvidenceBrief[], decisions: BriefDecision[], singleOwner: boolean): BriefDecisionState {
  const records = inOrder(decisions.filter((d) => d.briefId === brief.id), (d) => d.at);
  const latest = new Map<string, BriefDecision>();
  for (const d of records) { latest.delete(d.byPersonId); latest.set(d.byPersonId, d); }
  const standing = [...latest.values()]; // in the order each person's standing record was made
  const byAuthor = latest.get(brief.createdBy) ?? null;
  const independent = standing.filter((d) => d.byPersonId !== brief.createdBy).at(-1) ?? null;
  const governing = independent ?? (singleOwner ? byAuthor : null);
  const status: DecisionStatus = governing ? "decided" : byAuthor ? "self-recorded" : "open";
  const course = inOrder(briefs.filter((b) => b.subjectId === brief.subjectId), (b) => b.createdAt);
  const supersededBy = course.at(-1) && course.at(-1)!.id !== brief.id ? course.at(-1)! : null;
  return { brief, records, standing, byAuthor, independent, governing, status, supersededBy };
}

/** When the course's evidence last changed: a source kept, a quotation confirmed or a mapping saved. */
export function evidenceChangedAt(subjectId: string, sources: EvidenceSource[], mentions: SkillMention[], mappings: SkillMapping[]): string {
  const times = [
    ...sources.filter((s) => s.subjectId === subjectId).map((s) => s.addedAt),
    ...mentions.filter((m) => m.subjectId === subjectId).map((m) => m.addedAt),
    ...mappings.filter((m) => m.subjectId === subjectId).map((m) => m.updatedAt),
  ];
  return times.sort().at(-1) ?? "";
}

/** The words for a brief's decision state, literal and scoped (never "approved" or "ready"). */
export function decisionStatusText(s: BriefDecisionState, name: (id: string) => string, singleOwner: boolean): string {
  if (s.supersededBy) return "Superseded by the newer brief of " + s.supersededBy.createdAt.slice(0, 10) + "; its decisions stay on record.";
  if (s.status === "open") return "Open: no decision recorded yet.";
  if (s.status === "self-recorded") return "Decision recorded by the author; a second person's confirmation is open.";
  const g = s.governing!;
  if (singleOwner && g.byPersonId === s.brief.createdBy) return OUTCOME_LABEL[g.outcome] + ", recorded by the author on a single-owner course.";
  const confirms = s.byAuthor && s.byAuthor.outcome === g.outcome ? ", confirming the author's own decision" : s.byAuthor ? "; the author's self-recorded " + s.byAuthor.outcome + " stays on record" : "";
  return OUTCOME_LABEL[g.outcome] + ", recorded by " + name(g.byPersonId) + confirms + ".";
}

/** The decision that authorised a course version (depth plan Section 6.2), read from the event log: among the decisions
 *  recorded on the course before the version was adopted, each person's standing decision on each brief, the latest one
 *  to adopt a change, bound to the version the revision started from. Null when there is none, and the screen says so. */
export function authorisingDecision(versionId: string, events: LoopEvent[], decisions: BriefDecision[], drafts: CurriculumDraft[]): BriefDecision | null {
  const adoptedAt = events.findIndex((e) => e.kind === "version-adopted" && e.refs.versionId === versionId);
  if (adoptedAt < 0) return null;
  const adopted = events[adoptedAt];
  const baseline = drafts.find((d) => d.id === adopted.refs.draftId)?.baselineVersionId;
  if (!baseline) return null;
  const standing = new Map<string, { decision: BriefDecision; order: number }>();
  events.slice(0, adoptedAt).forEach((e, order) => {
    if (e.kind !== "decision-recorded" || e.refs.subjectId !== adopted.refs.subjectId) return;
    const decision = decisions.find((d) => d.id === e.refs.decisionId);
    if (decision) standing.set(decision.briefId + "|" + decision.byPersonId, { decision, order });
  });
  const adopting = [...standing.values()].filter((s) => s.decision.outcome === "adopt" && s.decision.courseVersionId === baseline).sort((x, y) => x.order - y.order);
  return adopting.at(-1)?.decision ?? null;
}

/** The version a version replaced: the baseline its revision started from (through the version-adopted event), otherwise the
 *  one before it in time; null for the first version on record. */
export function previousVersionOf(version: SubjectVersion, versions: SubjectVersion[], events: LoopEvent[], drafts: CurriculumDraft[]): SubjectVersion | null {
  const adopted = events.find((e) => e.kind === "version-adopted" && e.refs.versionId === version.id);
  const baseline = adopted && drafts.find((d) => d.id === adopted.refs.draftId)?.baselineVersionId;
  const byId = baseline ? versions.find((v) => v.id === baseline) : undefined;
  if (byId) return byId;
  const ordered = versions.filter((v) => v.subjectId === version.subjectId).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  const at = ordered.findIndex((v) => v.id === version.id);
  return at > 0 ? ordered[at - 1] : null;
}
