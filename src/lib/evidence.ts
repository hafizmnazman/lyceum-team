// Lecturer-supplied evidence (plan Sections 7 and 8, manual path). Pure functions:
// citation validation, duplicate fingerprints, observed-requirement counts with
// explicit denominators, Wilson intervals and reviewed coverage stages. Nothing
// here fetches, scores employability or changes a course.

import type {
  BriefRecommendation, CLO, CoverageStage, EvidenceKind, EvidenceSource, MentionRequirement, Person, SkillMapping, SkillMention, Subject,
} from "../types.ts";

export const EVIDENCE_KINDS = ["job-posting", "professional-standard", "advisory-note", "other"] as const;
export const COVERAGE_STAGES = ["unknown", "absent", "introduced", "practised", "assessed"] as const;
export const REQUIREMENT_LEVELS = ["required", "preferred", "unclear"] as const;
export const KIND_LABEL: Record<EvidenceKind, string> = {
  "job-posting": "Job posting", "professional-standard": "Professional standard", "advisory-note": "Industry advisory note", other: "Other document",
};
export const STAGE_LABEL: Record<CoverageStage, string> = {
  unknown: "Unknown", absent: "Absent", introduced: "Introduced", practised: "Practised", assessed: "Assessed",
};
/** Ordinal review aid only: a stage difference is not an equal-interval measure. */
export const STAGE_RANK: Record<CoverageStage, number | null> = { unknown: null, absent: 0, introduced: 1, practised: 2, assessed: 3 };

export function normaliseWhitespace(text: string): string { return text.replace(/\s+/g, " ").trim(); }
export function skillKey(skill: string): string { return normaliseWhitespace(skill).toLowerCase(); }
/** FNV-1a over the normalised, lower-cased text plus its length. Duplicate detection, not security. */
export function textFingerprint(text: string): string {
  const s = normaliseWhitespace(text).toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return "fnv1a-" + h.toString(16).padStart(8, "0") + "-" + s.length.toString(16);
}

export type ExcerptLocation =
  | { ok: true; match: "exact" | "whitespace"; start: number; end: number }
  | { ok: false; error: string };
/** The citation validator: the quotation must exist in the retained text. Only spacing may differ. */
export function locateExcerpt(sourceText: string, excerpt: string): ExcerptLocation {
  const quote = excerpt.trim();
  if (!quote) return { ok: false, error: "Quote the exact requirement text from the source." };
  const exact = sourceText.indexOf(quote);
  if (exact >= 0) return { ok: true, match: "exact", start: exact, end: exact + quote.length };
  const normalisedSource = normaliseWhitespace(sourceText), normalisedQuote = normaliseWhitespace(quote);
  const loose = normalisedSource.indexOf(normalisedQuote);
  if (loose >= 0) return { ok: true, match: "whitespace", start: loose, end: loose + normalisedQuote.length };
  return { ok: false, error: "That excerpt was not found in the saved source text. Quote it exactly; only spacing differences are tolerated." };
}

export interface EvidenceSourceInput { kind: EvidenceKind; title: string; organisation: string; url: string; sourceDate: string; text: string }
export function evidenceSourceError(input: EvidenceSourceInput): string | null {
  if (!input || !EVIDENCE_KINDS.includes(input.kind)) return "Choose a supported evidence type.";
  for (const key of ["title", "organisation", "url", "sourceDate", "text"] as const) if (typeof input[key] !== "string") return "Invalid evidence source.";
  const title = normaliseWhitespace(input.title), organisation = normaliseWhitespace(input.organisation);
  const url = input.url.trim(), date = input.sourceDate.trim(), text = input.text.trim();
  if (!title || title.length > 200) return "Give the source a title of up to 200 characters.";
  if (organisation.length > 200) return "Keep the organisation name within 200 characters.";
  if (input.kind === "job-posting" && !organisation) return "Name the employer for a job posting.";
  if (url && (url.length > 2000 || !/^https?:\/\/\S+$/i.test(url))) return "Use a full http or https link, or leave the link empty.";
  if (date.length > 40) return "Keep the source date within 40 characters.";
  if (text.length < 20) return "Paste the source text (at least 20 characters).";
  if (text.length > 200000) return "Source text is limited to 200,000 characters.";
  return null;
}
export interface MentionInput { skill: string; excerpt: string; requirement: MentionRequirement }
export function mentionError(input: MentionInput, sourceText: string): string | null {
  if (!input || typeof input.skill !== "string" || typeof input.excerpt !== "string") return "Invalid quotation.";
  const skill = normaliseWhitespace(input.skill);
  if (!skill || skill.length > 120) return "Name the requirement or skill (up to 120 characters).";
  if (!REQUIREMENT_LEVELS.includes(input.requirement)) return "Choose whether the source requires or prefers this skill.";
  const excerpt = input.excerpt.trim();
  if (excerpt.length < 3 || excerpt.length > 2000) return "Quote between 3 and 2,000 characters from the source.";
  const located = locateExcerpt(sourceText, excerpt);
  return located.ok ? null : located.error;
}
export interface MappingInput { skill: string; cloIds: string[]; stage: CoverageStage; target: CoverageStage; evidence: string }
export function mappingError(input: MappingInput, outcomeIds: string[]): string | null {
  if (!input || typeof input.skill !== "string" || !skillKey(input.skill) || input.skill.length > 120) return "Name the skill to map.";
  if (!Array.isArray(input.cloIds) || input.cloIds.some((id) => !outcomeIds.includes(id))) return "Map only to outcomes in the current version of this course.";
  if (new Set(input.cloIds).size !== input.cloIds.length) return "Each outcome can be linked once.";
  if (!COVERAGE_STAGES.includes(input.stage) || !COVERAGE_STAGES.includes(input.target)) return "Choose a valid coverage stage.";
  if (typeof input.evidence !== "string" || input.evidence.length > 5000) return "Keep the coverage evidence within 5,000 characters.";
  if (["introduced", "practised", "assessed"].includes(input.stage) && !input.evidence.trim())
    return "Cite the course evidence (topic, session, assessment or syllabus locator) that shows this stage.";
  return null;
}

/** 95% Wilson score interval by default. It describes sampling noise only; it does not repair a convenience sample. */
export function wilsonInterval(successes: number, trials: number, z = 1.959964): { low: number; high: number } | null {
  if (!Number.isFinite(successes) || !Number.isFinite(trials) || trials <= 0 || successes < 0 || successes > trials) return null;
  const p = successes / trials, z2 = z * z, denominator = 1 + z2 / trials;
  const centre = (p + z2 / (2 * trials)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denominator;
  // Clamp to the unit interval and absorb floating-point dust at the bounds (10 of 10 reads exactly 1).
  const clamp = (x: number) => (x < 1e-12 ? 0 : x > 1 - 1e-12 ? 1 : x);
  return { low: clamp(centre - half), high: clamp(centre + half) };
}

export interface SkillRow {
  key: string; skill: string;
  postings: number; // eligible vacancy clusters quoting the skill (numerator)
  share: number | null; // postings / eligible, unknown when the denominator is empty
  interval: { low: number; high: number } | null;
  required: number; preferred: number; unclear: number; // clusters by their strongest requirement wording
  organisations: string[];
  contextualSources: number; // standards and advisory documents quoting it; never in the denominator
  mapping: SkillMapping | null;
  stage: CoverageStage; target: CoverageStage;
  shortfall: boolean | null; // null until both stage and target are reviewed
  retiredOutcomeIds: string[]; // mapped outcomes no longer in the current course version
}
export interface EvidenceReport {
  eligible: number; // J: reviewed, de-duplicated job postings
  unreviewed: number; duplicates: number; contextual: number; organisations: number;
  rows: SkillRow[];
  targetCoverage: { value: number; unknownWeightShare: number; knownSkills: number } | null;
  coverageNote: string;
  trendNote: string;
}
const STRENGTH: Record<MentionRequirement, number> = { required: 3, preferred: 2, unclear: 1 };

export function evidenceReport(subjectId: string, sources: EvidenceSource[], mentions: SkillMention[], mappings: SkillMapping[], outcomes: CLO[]): EvidenceReport {
  const courseSources = sources.filter((s) => s.subjectId === subjectId);
  const byId = new Map(courseSources.map((s) => [s.id, s]));
  const canonicalOf = (s: EvidenceSource) => (s.duplicateOf && byId.get(s.duplicateOf)) || s;
  const canonicals = courseSources.filter((s) => !s.duplicateOf);
  const postings = canonicals.filter((s) => s.kind === "job-posting");
  const eligibleIds = new Set(postings.filter((s) => s.reviewed).map((s) => s.id));
  const contextualIds = new Set(canonicals.filter((s) => s.kind !== "job-posting").map((s) => s.id));
  const J = eligibleIds.size;
  const outcomeIds = new Set(outcomes.map((c) => c.id));
  const groups = new Map<string, { skill: string; clusters: Map<string, MentionRequirement>; contextual: Set<string> }>();
  for (const mention of mentions.filter((m) => m.subjectId === subjectId)) {
    const source = byId.get(mention.sourceId);
    if (!source) continue;
    const cluster = canonicalOf(source), key = skillKey(mention.skill);
    const group = groups.get(key) ?? { skill: normaliseWhitespace(mention.skill), clusters: new Map<string, MentionRequirement>(), contextual: new Set<string>() };
    if (eligibleIds.has(cluster.id)) {
      const previous = group.clusters.get(cluster.id);
      if (!previous || STRENGTH[mention.requirement] > STRENGTH[previous]) group.clusters.set(cluster.id, mention.requirement);
    } else if (contextualIds.has(cluster.id)) group.contextual.add(cluster.id);
    groups.set(key, group);
  }
  const courseMappings = mappings.filter((m) => m.subjectId === subjectId);
  for (const mapping of courseMappings) {
    const key = skillKey(mapping.skill);
    if (!groups.has(key)) groups.set(key, { skill: normaliseWhitespace(mapping.skill), clusters: new Map<string, MentionRequirement>(), contextual: new Set<string>() });
  }
  const rows: SkillRow[] = [...groups.entries()].map(([key, group]) => {
    const n = group.clusters.size, requirements = [...group.clusters.values()];
    const mapping = courseMappings.find((m) => skillKey(m.skill) === key) ?? null;
    const stage = mapping?.stage ?? "unknown", target = mapping?.target ?? "unknown";
    const stageRank = STAGE_RANK[stage], targetRank = STAGE_RANK[target];
    return {
      key, skill: group.skill, postings: n, share: J > 0 ? n / J : null, interval: J > 0 ? wilsonInterval(n, J) : null,
      required: requirements.filter((r) => r === "required").length, preferred: requirements.filter((r) => r === "preferred").length,
      unclear: requirements.filter((r) => r === "unclear").length,
      organisations: [...new Set([...group.clusters.keys()].map((id) => normaliseWhitespace(byId.get(id)?.organisation ?? "")).filter(Boolean))],
      contextualSources: group.contextual.size, mapping, stage, target,
      shortfall: stageRank === null || targetRank === null ? null : stageRank < targetRank,
      retiredOutcomeIds: (mapping?.cloIds ?? []).filter((id) => !outcomeIds.has(id)),
    };
  }).sort((a, b) => b.postings - a.postings || a.skill.localeCompare(b.skill));

  let targetCoverage: EvidenceReport["targetCoverage"] = null;
  let coverageNote: string;
  const weighted = rows.filter((r) => r.share !== null && r.share > 0);
  const total = weighted.reduce((sum, r) => sum + (r.share ?? 0), 0);
  if (J === 0) coverageNote = "No reviewed job posting yet, so coverage against observed demand cannot be summarised.";
  else if (!total) coverageNote = "No requirement has been quoted from a reviewed posting yet.";
  else {
    const known = weighted.filter((r) => r.shortfall !== null);
    const knownWeight = known.reduce((sum, r) => sum + (r.share ?? 0), 0);
    if (!knownWeight) coverageNote = "Record a reviewed coverage stage and a target for at least one quoted skill to summarise coverage.";
    else {
      targetCoverage = {
        value: known.filter((r) => !r.shortfall).reduce((sum, r) => sum + (r.share ?? 0), 0) / knownWeight,
        unknownWeightShare: (total - knownWeight) / total, knownSkills: known.length,
      };
      coverageNote = "Demand-weighted share of reviewed skills at or above their target stage. It is an index over quoted skills, not a share of jobs, students or employability.";
    }
  }
  return {
    eligible: J, unreviewed: postings.filter((s) => !s.reviewed).length, duplicates: courseSources.filter((s) => s.duplicateOf).length,
    contextual: contextualIds.size,
    organisations: new Set(postings.filter((s) => eligibleIds.has(s.id)).map((s) => skillKey(s.organisation)).filter(Boolean)).size,
    rows, targetCoverage, coverageNote,
    trendNote: "Trend unavailable: no comparable earlier evidence window has been recorded.",
  };
}

const percent = (x: number | null) => (x === null ? "Unknown" : Math.round(x * 1000) / 10 + "%");

/** A portable report with receipts. Deterministic, no model call. */
export function evidenceMarkdown(subject: Subject, report: EvidenceReport, sources: EvidenceSource[], mentions: SkillMention[], outcomes: CLO[], people: Person[], generatedAt: string): string {
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? id;
  const label = (id: string) => outcomes.find((c) => c.id === id)?.label ?? id;
  const courseSources = sources.filter((s) => s.subjectId === subject.id);
  const lines = [
    "# " + subject.id + " evidence report", "",
    "Course: " + subject.title, "Generated: " + generatedAt,
    "Scope: lecturer-supplied documents recorded in this workspace. Nothing was collected from the web.", "",
    "## Observed requirements", "",
    "Reviewed job postings in the denominator: " + report.eligible,
    "Excluded: " + report.unreviewed + " unreviewed postings, " + report.duplicates + " duplicate copies, " + report.contextual + " contextual documents (standards and advisory notes are listed, never counted as postings).",
    "Distinct employers among reviewed postings: " + report.organisations,
    report.trendNote, "",
    "| Skill | Postings | Share | 95% interval | Required | Preferred | Employers | Coverage stage | Target | Status |", "|---|---|---|---|---|---|---|---|---|---|",
    ...report.rows.map((r) => "| " + [r.skill, r.postings + " of " + report.eligible, percent(r.share),
      r.interval ? percent(r.interval.low) + " to " + percent(r.interval.high) : "Unknown", r.required, r.preferred, r.organisations.length,
      STAGE_LABEL[r.stage], STAGE_LABEL[r.target], r.shortfall === null ? "Not assessed" : r.shortfall ? "Below target" : "At or above target"].join(" | ") + " |"),
    "",
    report.targetCoverage
      ? "Target coverage index: " + percent(report.targetCoverage.value) + " over " + report.targetCoverage.knownSkills + " skills with a reviewed stage and target. " +
        percent(report.targetCoverage.unknownWeightShare) + " of the quoted demand weight has an unknown stage or target. " + report.coverageNote
      : report.coverageNote,
    "", "## Coverage mappings", "",
    ...(report.rows.some((r) => r.mapping) ? report.rows.filter((r) => r.mapping).map((r) =>
      "- " + r.skill + ": " + STAGE_LABEL[r.stage] + " (target " + STAGE_LABEL[r.target] + "). Outcomes: " +
      (r.mapping!.cloIds.map((id) => label(id) + (r.retiredOutcomeIds.includes(id) ? " (retired)" : "")).join(", ") || "none") +
      ". Evidence: " + (r.mapping!.evidence || "not cited") + ".") : ["No coverage mapping recorded."]),
    "", "## Limitations", "",
    "- This is a convenience sample chosen by the lecturer; shares and intervals describe the recorded set, not the labour market.",
    "- A posting counts once however many sites repeat it; a skill counts once however often one posting repeats it.",
    "- Coverage stages are the lecturer's reviewed judgement with cited course evidence. They are ordinal review aids, not mastery.",
    "- No learning impact is estimated. Nothing in this report changes the course by itself.",
    "", "## Receipts", "",
  ];
  for (const source of courseSources.filter((s) => !s.duplicateOf)) {
    const copies = courseSources.filter((c) => c.duplicateOf === source.id);
    lines.push("### " + source.title + (source.organisation ? " (" + source.organisation + ")" : ""), "",
      "Type: " + KIND_LABEL[source.kind], "Source date: " + (source.sourceDate || "not supplied"), "Link: " + (source.url || "not supplied"),
      "Recorded: " + source.addedAt + " by " + name(source.addedBy) + (source.collection ? ", from " + source.collection.label + ", retrieved " + source.collection.retrievedAt : ", lecturer-supplied"),
      "Text fingerprint: " + source.textHash,
      "Extraction: " + (source.kind === "job-posting" ? (source.reviewed ? "reviewed, counted" : "not yet reviewed, excluded") : "contextual document"),
      "Duplicate copies recorded: " + copies.length, "", "Quoted requirements:", "");
    const quotes = mentions.filter((m) => m.sourceId === source.id || copies.some((c) => c.id === m.sourceId));
    lines.push(...(quotes.length ? quotes.map((m) => "- " + m.skill + " (" + m.requirement + "): \"" + m.excerpt.replace(/\s+/g, " ") + "\"") : ["- None quoted yet."]), "");
  }
  if (!courseSources.length) lines.push("No source recorded.", "");
  return lines.join("\n");
}

// ---------- requirement scan: lexicon-assisted proposals the lecturer confirms ----------
/** Comma or newline separated terms; `|` separates aliases. Duplicates by first alias are dropped. */
export function parseLexicon(text: string): string[] {
  const seen = new Set<string>(), terms: string[] = [];
  for (const raw of text.split(/[,\n;]+/)) {
    const term = normaliseWhitespace(raw);
    if (!term || term.length > 60) continue;
    const key = skillKey(term.split("|")[0] ?? "");
    if (!key || seen.has(key)) continue;
    seen.add(key); terms.push(term);
    if (terms.length >= 100) break;
  }
  return terms;
}
export interface MentionProposal { sourceId: string; sourceTitle: string; term: string; skill: string; excerpt: string; requirement: MentionRequirement }
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const REQUIRED_WORDS = /\b(must|required|require[sd]?|essential|need(?:s|ed)?|minimum|mandatory|expected)\b/i;
const PREFERRED_WORDS = /\b(preferred|preferably|nice to have|bonus|a plus|desirable|ideally|advantage)\b/i;
/** A heuristic reading of one sentence. The lecturer can change it before confirming. */
export function classifyRequirement(sentence: string): MentionRequirement {
  if (PREFERRED_WORDS.test(sentence)) return "preferred";
  if (REQUIRED_WORDS.test(sentence)) return "required";
  return "unclear";
}
function clipExcerpt(sentence: string, pattern: RegExp): string {
  if (sentence.length <= 240) return sentence;
  const at = Math.max(0, sentence.search(pattern));
  const start = Math.max(0, at - 110), end = Math.min(sentence.length, at + 130);
  let clip = sentence.slice(start, end);
  if (start > 0 && clip.includes(" ")) clip = clip.slice(clip.indexOf(" ") + 1);
  if (end < sentence.length && clip.includes(" ")) clip = clip.slice(0, clip.lastIndexOf(" "));
  return clip.trim();
}
/** One proposal per original source and term: the first sentence that uses the term or an alias, as an exact substring.
 *  Sources already quoted for that skill are skipped. The scan records nothing; the lecturer confirms. */
export function proposeMentions(sources: EvidenceSource[], terms: string[], existing: SkillMention[]): MentionProposal[] {
  const proposals: MentionProposal[] = [];
  const recorded = new Set(existing.map((m) => m.sourceId + "\n" + skillKey(m.skill)));
  for (const source of sources.filter((s) => !s.duplicateOf)) {
    const sentences = source.text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 3);
    for (const term of terms) {
      const aliases = term.split("|").map((a) => normaliseWhitespace(a)).filter(Boolean);
      const skill = aliases[0];
      if (!skill || recorded.has(source.id + "\n" + skillKey(skill))) continue;
      const pattern = new RegExp("(?<![\\p{L}\\p{N}])(?:" + aliases.map(escapeRegExp).join("|") + ")(?![\\p{L}\\p{N}])", "iu");
      const sentence = sentences.find((s) => pattern.test(s));
      if (!sentence) continue;
      proposals.push({ sourceId: source.id, sourceTitle: source.title, term, skill, excerpt: clipExcerpt(sentence, pattern), requirement: classifyRequirement(sentence) });
    }
  }
  return proposals;
}

// ---------- meeting brief: the evidence as a document for people ----------
export const RECOMMENDATION_LABEL: Record<BriefRecommendation, string> = {
  keep: "Keep the course unchanged this term", refresh: "Small refresh within existing hours", revise: "Propose a formal revision", undecided: "No recommendation yet; discussion requested",
};
const OPTION_NOTE: Record<BriefRecommendation, string> = {
  keep: "no change to outcomes, topics or hours; revisit next term with refreshed evidence.",
  refresh: "adjust activities, examples or one topic within the existing hours and outcomes; private preparation needs no formal approval.",
  revise: "change outcomes or topics through the institution's review process, stating the hours and prerequisites it affects.",
  undecided: "the lecturer asks the meeting to weigh the options above.",
};
/** Optional "changes since" section, built by lib/snapshots from a frozen window and the current evidence. */
export interface BriefChanges { since: string; note: string; lines: string[] }
export function meetingBriefMarkdown(subject: Subject, report: EvidenceReport, sources: EvidenceSource[], mentions: SkillMention[], outcomes: CLO[], people: Person[], author: Person, input: { recommendation: BriefRecommendation; notes: string }, generatedAt: string, changes?: BriefChanges): string {
  const courseSources = sources.filter((s) => s.subjectId === subject.id && !s.duplicateOf);
  const postings = courseSources.filter((s) => s.kind === "job-posting");
  const dates = postings.map((s) => s.sourceDate).filter(Boolean).sort();
  const collected = postings.filter((s) => s.provenance === "collected");
  const labels = [...new Set(collected.map((s) => s.collection?.label ?? "collected on request"))];
  const top = report.rows.filter((r) => r.postings > 0).slice(0, 10);
  const status = (r: SkillRow) => (r.shortfall === null ? "Not assessed" : r.shortfall ? "Below target" : "At or above target");
  const options: BriefRecommendation[] = ["keep", "refresh", "revise", ...(input.recommendation === "undecided" ? ["undecided" as const] : [])];
  return [
    "# Meeting brief: " + subject.id + " " + subject.title, "",
    "Prepared by " + author.name + " on " + generatedAt + ". Lecturer-controlled preparation; this brief does not attest institutional approval.", "",
    "## Decision requested", "", RECOMMENDATION_LABEL[input.recommendation] + ".", "",
    "## Evidence base", "",
    "- Reviewed job postings in the denominator: " + report.eligible + ", from " + report.organisations + " employers.",
    "- Publication dates as supplied: " + (dates.length ? dates[0] + " to " + dates[dates.length - 1] : "not supplied") + ".",
    "- Sources: " + collected.length + " collected on request (" + (labels.join("; ") || "none") + "), " + (postings.length - collected.length) + " lecturer-supplied, " + report.contextual + " contextual documents.",
    "- Excluded from the denominator: " + report.unreviewed + " unreviewed postings and " + report.duplicates + " duplicate copies.",
    "- " + (changes ? changes.note : report.trendNote), "",
    "## What employers ask for", "",
    ...(top.length ? ["| Skill | Postings | Share | 95% interval | Coverage today | Target | Status |", "|---|---|---|---|---|---|---|",
      ...top.map((r) => "| " + [r.skill, r.postings + " of " + report.eligible, percent(r.share), r.interval ? percent(r.interval.low) + " to " + percent(r.interval.high) : "Unknown",
        STAGE_LABEL[r.stage], STAGE_LABEL[r.target], status(r)].join(" | ") + " |")] : ["No requirement has been quoted from a reviewed posting yet."]), "",
    ...(changes ? ["## Changes since " + changes.since, "", ...changes.lines, ""] : []),
    "## Coverage against targets", "",
    report.targetCoverage
      ? "Target coverage index: " + percent(report.targetCoverage.value) + " over " + report.targetCoverage.knownSkills + " skills with a reviewed stage and target; " + percent(report.targetCoverage.unknownWeightShare) + " of the quoted demand weight has an unknown stage or target. " + report.coverageNote
      : report.coverageNote, "",
    "## Options considered", "",
    ...options.map((o) => "- " + RECOMMENDATION_LABEL[o] + (o === input.recommendation ? " (recommended)" : "") + ": " + OPTION_NOTE[o]), "",
    "## Lecturer's notes", "", input.notes || "None recorded.", "",
    "## Limitations", "",
    "- A convenience sample chosen by the lecturer; shares and intervals describe the recorded set, not the labour market.",
    "- Coverage stages are the lecturer's reviewed judgement with cited course evidence; they are ordinal review aids, not mastery.",
    "- No learning impact is estimated, and nothing in this brief changes the course by itself.", "",
    "## Appendix: evidence report with receipts", "",
    evidenceMarkdown(subject, changes ? { ...report, trendNote: changes.note } : report, sources, mentions, outcomes, people, generatedAt),
  ].join("\n");
}
