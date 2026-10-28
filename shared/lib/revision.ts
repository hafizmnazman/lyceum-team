// Quill's suggestions on an open course revision (the Update step). The model reads the outline and the employer evidence
// the course is behind on, and proposes single changes: reword an outcome, add one, or add a topic, each with its reason
// and the skill it answers. Nothing is applied by the model: the lecturer applies or dismisses each suggestion into the
// open revision, which still goes through the course's own check and adoption. Shared by the API, which checks what the
// model returned, and the Update step, which applies an accepted suggestion.

import { z } from "zod";
import type { BloomLevel, CourseDefinition, SkillMention } from "../types.ts";
import type { EvidenceReport } from "./evidence.ts";
import { nextFreeSlot } from "./curriculum.ts";
import { bloomOf } from "./outline.ts";

/** One skill the course is behind on (or has not mapped), with its count and one exact quotation as the receipt. */
export interface RevisionGap { skill: string; postings: number; eligible: number; stage: string; target: string; outcomes: string[]; quote: string }
export interface RevisionRequest {
  course: { code: string; title: string; contactHours: number | null;
    outcomes: Array<{ label: string; text: string; bloom: BloomLevel }>; topics: Array<{ title: string; contactHours: number; outcomes: string[] }> };
  gaps: RevisionGap[];
}
export type RevisionSuggestion =
  | { kind: "edit-outcome"; outcome: string; text: string; bloom: BloomLevel; skill: string; reason: string }
  | { kind: "add-outcome"; text: string; bloom: BloomLevel; skill: string; reason: string }
  | { kind: "add-topic"; title: string; hours: number; outcomes: string[]; skill: string; reason: string };

export const MAX_GAPS = 8;
/** What the model is sent: the outline by outcome label, and the quoted skills below target or not yet mapped, most asked first. */
export function revisionRequest(subjectId: string, definition: CourseDefinition, report: EvidenceReport, mentions: SkillMention[]): RevisionRequest {
  const label = new Map(definition.outcomes.map((c) => [c.id, c.label]));
  const gaps = report.rows.filter((r) => r.postings > 0 && (r.shortfall === true || !r.mapping)).slice(0, MAX_GAPS).map((r) => ({
    skill: r.skill, postings: r.postings, eligible: report.eligible, stage: r.stage, target: r.target,
    outcomes: (r.mapping?.cloIds ?? []).map((id) => label.get(id)).filter((l): l is string => Boolean(l)),
    quote: mentions.find((m) => m.subjectId === subjectId && m.skill.trim().toLowerCase() === r.key)?.excerpt ?? "",
  }));
  return {
    course: { code: subjectId, title: definition.title, contactHours: definition.brief.contactHours,
      outcomes: definition.outcomes.map((c) => ({ label: c.label, text: c.text, bloom: c.bloomLevel })),
      topics: definition.topics.map((t) => ({ title: t.title, contactHours: t.contactHours, outcomes: t.cloIds.map((id) => label.get(id) ?? id) })) },
    gaps,
  };
}

const text = (max: number) => z.string().trim().min(3).max(max);
const Suggestion = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("edit-outcome"), outcome: z.string(), text: text(600), bloom: z.unknown(), skill: z.string().catch(""), reason: text(600) }),
  z.object({ kind: z.literal("add-outcome"), text: text(600), bloom: z.unknown(), skill: z.string().catch(""), reason: text(600) }),
  z.object({ kind: z.literal("add-topic"), title: text(200), hours: z.coerce.number().positive().max(60), outcomes: z.array(z.string()).max(20).catch([]),
    skill: z.string().catch(""), reason: text(600) }),
]);
/** Check what the model returned against the request. A suggestion naming an outcome the course does not have, or a skill it
 *  was not shown, is dropped or loses that link; nothing malformed is repaired by guessing. */
export function readSuggestions(raw: unknown, request: RevisionRequest): RevisionSuggestion[] {
  const list = (raw && typeof raw === "object" && Array.isArray((raw as { suggestions?: unknown }).suggestions)) ? (raw as { suggestions: unknown[] }).suggestions : [];
  const labels = new Set(request.course.outcomes.map((o) => o.label)), skills = new Set(request.gaps.map((g) => g.skill));
  const out: RevisionSuggestion[] = [];
  for (const item of list.slice(0, 12)) {
    const s = Suggestion.safeParse(item);
    if (!s.success) continue;
    const skill = skills.has(s.data.skill) ? s.data.skill : "";
    if (s.data.kind === "edit-outcome") { if (labels.has(s.data.outcome)) out.push({ ...s.data, bloom: bloomOf(s.data.bloom), skill }); }
    else if (s.data.kind === "add-outcome") out.push({ ...s.data, bloom: bloomOf(s.data.bloom), skill });
    else out.push({ ...s.data, outcomes: s.data.outcomes.filter((l) => labels.has(l)), skill });
  }
  return out;
}

/** The revision with one suggestion applied. `newId` names a new outcome or topic. */
export function applySuggestion(definition: CourseDefinition, s: RevisionSuggestion, subjectId: string, newId: string): CourseDefinition {
  if (s.kind === "edit-outcome")
    return { ...definition, outcomes: definition.outcomes.map((c) => (c.label === s.outcome ? { ...c, text: s.text, bloomLevel: s.bloom } : c)) };
  if (s.kind === "add-outcome") {
    let n = 1; while (definition.outcomes.some((c) => c.label === "CLO" + n)) n++;
    return { ...definition, outcomes: [...definition.outcomes, { id: subjectId + "-outcome-" + newId, subjectId, label: "CLO" + n, text: s.text,
      bloomLevel: s.bloom, assessmentEvidence: "", ploIds: [] }] };
  }
  const slot = nextFreeSlot(definition), byLabel = new Map(definition.outcomes.map((c) => [c.label, c.id]));
  return { ...definition, topics: [...definition.topics, { id: subjectId + "-topic-" + newId, title: s.title, week: slot?.week ?? null,
    contactHours: s.hours, selfStudyHours: 0, cloIds: s.outcomes.map((l) => byLabel.get(l)).filter((id): id is string => Boolean(id)),
    prerequisiteTopicIds: [], protected: false, resources: "", ...(slot ? { kind: "mixed" as const } : {}) }] };
}
