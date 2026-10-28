// Importing a course outline at onboarding. The model reads the lecturer's own outline (PDF or DOCX, parsed by the local
// API) and proposes what it found: the course's code and title, its learning outcomes with Bloom levels, its topics with
// hours, its hours, weeks and credits, and the programme outcomes it names. Nothing is saved from a proposal: the
// lecturer edits and accepts each row first. Each outcome says whether its words are in the document or were reworded
// by the model, so an invented outcome cannot pass for one the lecturer wrote. Shared by the API, which checks what the
// model returned, and onboarding, which turns the accepted rows into the course's first version.

import { z } from "zod";
import type { BloomLevel, CourseDefinition, CourseOutcome, CourseTopic } from "../types.ts";

export const BLOOM_LEVELS: BloomLevel[] = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"];
export const bloomOf = (v: unknown): BloomLevel => {
  const s = String(v ?? "").trim().toLowerCase().replace(/^analyz/, "analys");
  return BLOOM_LEVELS.find((b) => b.toLowerCase() === s || s.startsWith(b.toLowerCase().slice(0, 5))) ?? "Understand";
};
const positive = (max: number) => z.preprocess((v) => (v === null || v === "" ? null : Number(v)), z.number().positive().max(max).nullable().catch(null));

/** What the model is asked for (server/outline.ts states it in the prompt). Loose on purpose: a field it cannot fill comes back empty. */
export const OutlineSchema = z.object({
  code: z.string().max(40).catch(""),
  title: z.string().max(200).catch(""),
  credits: positive(100).default(null),
  teachingWeeks: positive(52).default(null),
  contactHours: positive(2000).default(null),
  outcomes: z.array(z.object({ text: z.string().min(3).max(600), bloom: z.unknown() }).catch(null as never)).max(20).catch([]),
  topics: z.array(z.object({ title: z.string().min(1).max(200), hours: positive(200).default(null), week: positive(60).default(null),
    outcomes: z.array(z.number().int().positive().max(20)).max(20).catch([]) }).catch(null as never)).max(40).catch([]),
  programmeOutcomes: z.array(z.string().min(3).max(400)).max(20).catch([]),
});

export interface OutlineOutcome { text: string; bloom: BloomLevel; inDocument: boolean }
export interface OutlineTopic { title: string; hours: number | null; week: number | null; outcomes: number[] } // outcomes: 1-based, into the outcomes list
export interface OutlineProposal {
  code: string; title: string; credits: number | null; teachingWeeks: number | null; contactHours: number | null;
  outcomes: OutlineOutcome[]; topics: OutlineTopic[]; programmeOutcomes: string[]; source: string;
}

const flat = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/** True when the outcome's words appear in the document in order, numbering and punctuation aside. */
export function inDocument(text: string, document: string): boolean {
  const needle = flat(text).replace(/^(clo|co|lo)?\s*\d+\s*/, "");
  return needle.length >= 12 && flat(document).includes(needle);
}

/** Check and tidy what the model returned, against the document it read. Anything malformed is dropped, never repaired by guessing. */
export function readProposal(raw: unknown, document: string, source: string): OutlineProposal {
  const p = OutlineSchema.parse(raw ?? {});
  const outcomes = p.outcomes.filter(Boolean).map((o) => ({ text: o.text.trim().replace(/\s+/g, " "), bloom: bloomOf(o.bloom), inDocument: inDocument(o.text, document) }));
  return {
    code: p.code.trim().toUpperCase().replace(/\s+/g, ""), title: p.title.trim(), credits: p.credits, teachingWeeks: p.teachingWeeks, contactHours: p.contactHours,
    outcomes,
    topics: p.topics.filter(Boolean).map((t) => ({ title: t.title.trim(), hours: t.hours, week: t.week, outcomes: t.outcomes.filter((n) => n <= outcomes.length) })),
    programmeOutcomes: p.programmeOutcomes.map((s) => s.trim()), source,
  };
}

/** Pull a JSON object out of a model's reply, which may wrap it in a code fence or a sentence. */
export function jsonFromReply(reply: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(reply)?.[1] ?? reply;
  const start = fenced.indexOf("{"), end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model did not return an outline.");
  return JSON.parse(fenced.slice(start, end + 1));
}

/** The accepted rows as the course's first definition: outcomes CLO1, CLO2..., topics in order, the hours and the roles graduates go into. */
export function outlineDefinition(base: CourseDefinition, subjectId: string, rows: {
  outcomes: Array<{ text: string; bloom: BloomLevel }>; topics: Array<{ title: string; hours: number | null; week: number | null; outcomes: number[] }>;
  credits: number | null; teachingWeeks: number | null; contactHours: number | null; programmeOutcomes: string[]; targetRoles: string;
}): CourseDefinition {
  const outcomes: CourseOutcome[] = rows.outcomes.map((o, i) => ({ id: subjectId + "-CLO" + (i + 1), subjectId, label: "CLO" + (i + 1), text: o.text.trim(), bloomLevel: o.bloom, assessmentEvidence: "", ploIds: [] }));
  const topics: CourseTopic[] = rows.topics.map((t, i) => ({ id: subjectId + "-T" + (i + 1), title: t.title.trim(), week: t.week, contactHours: t.hours ?? 0, selfStudyHours: 0,
    cloIds: t.outcomes.filter((n) => n >= 1 && n <= outcomes.length).map((n) => outcomes[n - 1].id), prerequisiteTopicIds: [], protected: false, resources: "" }));
  return { ...base, outcomes, topics,
    brief: { ...base.brief, credits: rows.credits, teachingWeeks: rows.teachingWeeks, contactHours: rows.contactHours, targetRoles: rows.targetRoles.trim(),
      programmeOutcomes: rows.programmeOutcomes.map((s) => s.trim()).filter(Boolean) } };
}
