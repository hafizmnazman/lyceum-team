// Model-proposed evidence work on Report, checked before a person sees it. Lens reads the kept postings and proposes
// quotations: each must be found word for word in its posting (locateExcerpt), or it is dropped. Atlas reads the quoted
// skills the course has not mapped and proposes which outcomes each belongs to, by label; the coverage stage and target
// stay the lecturer's, since no model can see what the course actually teaches. Nothing is recorded by either: Lens's
// proposals join the scan's list to be confirmed, and Atlas's are applied one at a time. Shared by the API and Report.

import { z } from "zod";
import type { EvidenceSource, MentionRequirement, SkillMention } from "../types.ts";
import { locateExcerpt, normaliseWhitespace, skillKey, type EvidenceReport, type MentionProposal } from "./evidence.ts";

// ---------- Lens: quotations ----------
export interface QuoteRequest { skills: string[]; postings: Array<{ id: string; title: string; text: string; quoted: string[] }> }
// ponytail: the 10 least-quoted postings, each cut short; page through the rest if courses keep many more.
export const MAX_QUOTE_POSTINGS = 10, MAX_POSTING_CHARS = 3000;

/** The postings Lens reads: kept and not duplicates, least quoted first, each with the skills already quoted from it so
 *  they are not proposed again, and the course's skill terms as preferred names. */
export function quoteRequest(sources: EvidenceSource[], mentions: SkillMention[], terms: string[]): QuoteRequest {
  const quotedFrom = (id: string) => [...new Set(mentions.filter((m) => m.sourceId === id).map((m) => m.skill))];
  const postings = sources.filter((s) => s.kind === "job-posting" && !s.duplicateOf)
    .map((s) => ({ id: s.id, title: s.title, text: s.text.slice(0, MAX_POSTING_CHARS), quoted: quotedFrom(s.id) }))
    .sort((a, b) => a.quoted.length - b.quoted.length).slice(0, MAX_QUOTE_POSTINGS);
  return { skills: terms.map((t) => t.split("|")[0].trim()).filter(Boolean), postings };
}

const LEVELS: MentionRequirement[] = ["required", "preferred", "unclear"];
const Quote = z.object({ posting: z.string(), skill: z.string().trim().min(1).max(120), excerpt: z.string().trim().min(3).max(2000), requirement: z.unknown() });
/** Keep only what can be shown as a receipt: a posting that was sent, an excerpt found in its saved text, a skill not already
 *  quoted from that posting. One proposal per posting and skill. */
export function readQuotes(raw: unknown, sources: Array<Pick<EvidenceSource, "id" | "title" | "text">>, existing: Array<Pick<SkillMention, "sourceId" | "skill">>): MentionProposal[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { quotes?: unknown }).quotes) ? (raw as { quotes: unknown[] }).quotes : [];
  const byId = new Map(sources.map((s) => [s.id, s]));
  const seen = new Set(existing.map((m) => m.sourceId + "\n" + skillKey(m.skill)));
  const out: MentionProposal[] = [];
  for (const item of list.slice(0, 200)) {
    const q = Quote.safeParse(item);
    const source = q.success ? byId.get(q.data.posting) : undefined;
    if (!q.success || !source || !locateExcerpt(source.text, q.data.excerpt).ok) continue;
    const skill = normaliseWhitespace(q.data.skill), key = source.id + "\n" + skillKey(skill);
    if (seen.has(key)) continue;
    seen.add(key);
    const level = String(q.data.requirement ?? "").toLowerCase() as MentionRequirement;
    out.push({ sourceId: source.id, sourceTitle: source.title, term: skill, skill, excerpt: q.data.excerpt, requirement: LEVELS.includes(level) ? level : "unclear" });
  }
  return out;
}

// ---------- Atlas: mappings ----------
export interface MappingRequest { outcomes: Array<{ label: string; text: string }>; skills: Array<{ skill: string; postings: number; quote: string }> }
export interface MappingSuggestion { skill: string; outcomes: string[]; reason: string }
/** How an outcome is named to the model and shown: its label, or its id where it has none (the demo programme's CLOs). */
export const outcomeLabel = (c: { id: string; label?: string }) => c.label ?? c.id;

/** The quoted skills with no mapping yet, most asked first, each with one quotation, and the outcomes by label. */
export function mappingRequest(subjectId: string, report: EvidenceReport, mentions: SkillMention[], outcomes: Array<{ id: string; label?: string; text: string }>): MappingRequest {
  return {
    outcomes: outcomes.map((c) => ({ label: outcomeLabel(c), text: c.text })),
    skills: report.rows.filter((r) => r.postings > 0 && !r.mapping).slice(0, 20).map((r) => ({ skill: r.skill, postings: r.postings,
      quote: mentions.find((m) => m.subjectId === subjectId && skillKey(m.skill) === r.key)?.excerpt ?? "" })),
  };
}
const Mapping = z.object({ skill: z.string(), outcomes: z.array(z.string()).max(10), reason: z.string().trim().min(3).max(600) });
/** Only skills that were sent and outcome labels the course has; a skill that fits no outcome comes back with none. */
export function readMappings(raw: unknown, request: MappingRequest): MappingSuggestion[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { mappings?: unknown }).mappings) ? (raw as { mappings: unknown[] }).mappings : [];
  const skills = new Map(request.skills.map((s) => [skillKey(s.skill), s.skill])), labels = new Set(request.outcomes.map((o) => o.label));
  const out: MappingSuggestion[] = [], seen = new Set<string>();
  for (const item of list) {
    const m = Mapping.safeParse(item);
    const skill = m.success ? skills.get(skillKey(m.data.skill)) : undefined;
    if (!m.success || !skill || seen.has(skill)) continue;
    seen.add(skill);
    out.push({ skill, outcomes: [...new Set(m.data.outcomes.filter((l) => labels.has(l)))], reason: m.data.reason });
  }
  return out;
}
