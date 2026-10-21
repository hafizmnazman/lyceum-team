// Watching the evidence over time (the "Watch" step). Pure functions: freeze the
// reviewed evidence for a course at a moment, and compare two frozen windows.
//
// The comparison is deliberately conservative. A skill is called rising or
// falling only when the two 95% Wilson intervals do not overlap; anything else
// is "no clear change at this sample size". Non-overlap is stricter than a
// formal two-proportion test, so a real shift can be reported as no clear
// change, but a reported change is never a small-sample accident like 3 of 10
// becoming 4 of 10. A skill that was not looked for in one window is not
// comparable, because an absent count there means "not scanned", not "zero".
// Nothing here changes a course.

import type { CoverageStage, EvidenceSnapshot, EvidenceSource, SkillMention, SnapshotPosting, SnapshotSkill } from "../types.ts";
import { STAGE_LABEL, normaliseWhitespace, skillKey, wilsonInterval, type EvidenceReport } from "./evidence.ts";

export const SNAPSHOT_LABEL_MAX = 80;
export const CURRENT_ID = "current";

/** A posting's identity across windows: the board posting id when collected, otherwise the source record. */
export function postingIdentity(source: EvidenceSource): string {
  return source.collection?.postingId ? "posting:" + source.collection.postingId : "source:" + source.id;
}

export function snapshotLabelError(label: string, existing: EvidenceSnapshot[]): string | null {
  if (typeof label !== "string") return "Name the snapshot.";
  const clean = normaliseWhitespace(label);
  if (!clean) return "Name the snapshot, for example the semester it describes.";
  if (clean.length > SNAPSHOT_LABEL_MAX) return "Keep the snapshot name within " + SNAPSHOT_LABEL_MAX + " characters.";
  if (existing.some((s) => s.label.toLowerCase() === clean.toLowerCase())) return "A snapshot with that name already exists for this course.";
  return null;
}

/** Freeze the reviewed evidence. `report` must be the evidenceReport for the same course, sources and mentions. */
export function buildSnapshot(
  meta: { id: string; subjectId: string; label: string; takenBy: string; takenAt: string },
  report: EvidenceReport, sources: EvidenceSource[], mentions: SkillMention[], lexicon: string[],
): EvidenceSnapshot {
  const courseSources = sources.filter((s) => s.subjectId === meta.subjectId);
  const byId = new Map(courseSources.map((s) => [s.id, s]));
  const canonical = (s: EvidenceSource) => (s.duplicateOf && byId.get(s.duplicateOf)) || s;
  const eligible = courseSources.filter((s) => s.kind === "job-posting" && !s.duplicateOf && s.reviewed);
  const eligibleIds = new Set(eligible.map((s) => s.id));
  const behind = new Map<string, Set<string>>();
  const courseMentions = mentions.filter((m) => m.subjectId === meta.subjectId);
  for (const mention of courseMentions) {
    const source = byId.get(mention.sourceId);
    if (!source) continue;
    const cluster = canonical(source);
    if (!eligibleIds.has(cluster.id)) continue;
    const key = skillKey(mention.skill);
    const set = behind.get(key) ?? new Set<string>();
    set.add(cluster.id); behind.set(key, set);
  }
  const lookedFor = new Set<string>();
  for (const term of lexicon) { const key = skillKey(term.split("|")[0] ?? ""); if (key) lookedFor.add(key); }
  for (const mention of courseMentions) lookedFor.add(skillKey(mention.skill));
  const skills: SnapshotSkill[] = report.rows.map((r) => ({
    key: r.key, skill: r.skill, postings: r.postings, required: r.required, preferred: r.preferred,
    stage: r.stage, target: r.target, sourceIds: [...(behind.get(r.key) ?? [])].sort(),
  }));
  const postings: SnapshotPosting[] = eligible.map((s) => ({
    id: s.id, identity: postingIdentity(s), title: s.title, organisation: s.organisation, url: s.url, sourceDate: s.sourceDate, textHash: s.textHash,
  }));
  return {
    id: meta.id, subjectId: meta.subjectId, label: normaliseWhitespace(meta.label), takenBy: meta.takenBy, takenAt: meta.takenAt,
    eligible: report.eligible, organisations: report.organisations, unreviewed: report.unreviewed, duplicates: report.duplicates, contextual: report.contextual,
    lookedFor: [...lookedFor].sort(), skills, postings,
  };
}

export type ChangeKind = "rising" | "falling" | "steady" | "not-comparable";
export interface WindowCount { postings: number; eligible: number; share: number | null; interval: { low: number; high: number } | null }
export interface SkillChange {
  key: string; skill: string; kind: ChangeKind; reason: string;
  before: WindowCount; after: WindowCount;
  newlyQuoted: boolean; // quoted in the later window, not in the earlier
  noLongerQuoted: boolean; // quoted in the earlier window, not in the later
  stageBefore: CoverageStage; stageAfter: CoverageStage; targetBefore: CoverageStage; targetAfter: CoverageStage;
  coverageChanged: boolean;
}
export interface SnapshotComparison {
  before: { id: string; label: string; takenAt: string; eligible: number; organisations: number };
  after: { id: string; label: string; takenAt: string; eligible: number; organisations: number };
  comparable: boolean;
  skills: SkillChange[];
  postingsAdded: SnapshotPosting[];
  postingsGone: SnapshotPosting[];
  textChanged: Array<{ before: SnapshotPosting; after: SnapshotPosting }>;
  carried: number; // postings present in both windows with the same text
  counts: Record<ChangeKind, number>;
  note: string;
}

const ORDER: Record<ChangeKind, number> = { rising: 0, falling: 1, steady: 2, "not-comparable": 3 };

function windowCount(postings: number, eligible: number): WindowCount {
  return { postings, eligible, share: eligible > 0 ? postings / eligible : null, interval: eligible > 0 ? wilsonInterval(postings, eligible) : null };
}

/** Compare an earlier window with a later one. Order matters: `before` is the earlier. */
export function compareSnapshots(before: EvidenceSnapshot, after: EvidenceSnapshot): SnapshotComparison {
  const comparable = before.eligible > 0 && after.eligible > 0;
  const keys = new Map<string, string>();
  for (const s of before.skills) keys.set(s.key, s.skill);
  for (const s of after.skills) keys.set(s.key, s.skill); // the later spelling wins for display
  const lookedBefore = new Set(before.lookedFor), lookedAfter = new Set(after.lookedFor);
  const skills: SkillChange[] = [...keys.entries()].map(([key, skill]) => {
    const a = before.skills.find((s) => s.key === key), b = after.skills.find((s) => s.key === key);
    const pa = a?.postings ?? 0, pb = b?.postings ?? 0;
    const w1 = windowCount(pa, before.eligible), w2 = windowCount(pb, after.eligible);
    const stageBefore = a?.stage ?? "unknown", stageAfter = b?.stage ?? "unknown", targetBefore = a?.target ?? "unknown", targetAfter = b?.target ?? "unknown";
    let kind: ChangeKind, reason: string;
    if (!comparable) { kind = "not-comparable"; reason = "One window has no reviewed postings, so there is no denominator to compare."; }
    else if (pa === 0 && !lookedBefore.has(key)) { kind = "not-comparable"; reason = "Not looked for in " + before.label + ", so its earlier count is unknown rather than zero."; }
    else if (pb === 0 && !lookedAfter.has(key)) { kind = "not-comparable"; reason = "Not looked for in " + after.label + ", so its later count is unknown rather than zero."; }
    else if (w2.interval!.low > w1.interval!.high) { kind = "rising"; reason = "The later interval sits wholly above the earlier one."; }
    else if (w2.interval!.high < w1.interval!.low) { kind = "falling"; reason = "The later interval sits wholly below the earlier one."; }
    else { kind = "steady"; reason = "The intervals overlap: no clear change at this sample size."; }
    return {
      key, skill, kind, reason, before: w1, after: w2,
      newlyQuoted: pa === 0 && pb > 0, noLongerQuoted: pa > 0 && pb === 0,
      stageBefore, stageAfter, targetBefore, targetAfter, coverageChanged: stageBefore !== stageAfter || targetBefore !== targetAfter,
    };
  }).sort((x, y) => ORDER[x.kind] - ORDER[y.kind] || y.after.postings - x.after.postings || y.before.postings - x.before.postings || x.skill.localeCompare(y.skill));

  const earlier = new Map(before.postings.map((p) => [p.identity, p]));
  const later = new Map(after.postings.map((p) => [p.identity, p]));
  const postingsAdded = after.postings.filter((p) => !earlier.has(p.identity));
  const postingsGone = before.postings.filter((p) => !later.has(p.identity));
  const textChanged = after.postings.filter((p) => earlier.has(p.identity) && earlier.get(p.identity)!.textHash !== p.textHash).map((p) => ({ before: earlier.get(p.identity)!, after: p }));
  const carried = after.postings.filter((p) => earlier.has(p.identity) && earlier.get(p.identity)!.textHash === p.textHash).length;
  const counts: Record<ChangeKind, number> = { rising: 0, falling: 0, steady: 0, "not-comparable": 0 };
  for (const s of skills) counts[s.kind] += 1;

  let note: string;
  if (!comparable) note = "Not comparable: " + (before.eligible === 0 ? before.label : after.label) + " has no reviewed postings.";
  else if (!counts.rising && !counts.falling) note = "No clear change between " + before.label + " (" + before.eligible + " reviewed postings) and " + after.label + " (" + after.eligible + "): every compared skill's intervals overlap.";
  else note = counts.rising + (counts.rising === 1 ? " skill" : " skills") + " rising and " + counts.falling + " falling between " + before.label + " (" + before.eligible + " reviewed postings) and " + after.label + " (" + after.eligible + "), where the 95% intervals do not overlap.";
  return {
    before: { id: before.id, label: before.label, takenAt: before.takenAt, eligible: before.eligible, organisations: before.organisations },
    after: { id: after.id, label: after.label, takenAt: after.takenAt, eligible: after.eligible, organisations: after.organisations },
    comparable, skills, postingsAdded, postingsGone, textChanged, carried, counts, note,
  };
}

export const CHANGE_LABEL: Record<ChangeKind, string> = { rising: "Rising", falling: "Falling", steady: "No clear change", "not-comparable": "Not comparable" };
const percent = (x: number | null) => (x === null ? "Unknown" : Math.round(x * 1000) / 10 + "%");
const countText = (w: WindowCount) => w.postings + " of " + w.eligible + " (" + percent(w.share) + (w.interval ? ", " + percent(w.interval.low) + " to " + percent(w.interval.high) : "") + ")";
const coverageText = (c: SkillChange) => c.coverageChanged
  ? STAGE_LABEL[c.stageBefore] + " (target " + STAGE_LABEL[c.targetBefore] + ") to " + STAGE_LABEL[c.stageAfter] + " (target " + STAGE_LABEL[c.targetAfter] + ")"
  : "Unchanged";

/** The comparison as Markdown lines, for the meeting brief or a standalone download. */
export function comparisonMarkdown(c: SnapshotComparison): string[] {
  const lines = [
    "Earlier: " + c.before.label + ", frozen " + c.before.takenAt + ", " + c.before.eligible + " reviewed postings from " + c.before.organisations + " employers.",
    "Later: " + c.after.label + (c.after.id === CURRENT_ID ? ", the evidence as it stands now" : ", frozen " + c.after.takenAt) + ", " + c.after.eligible + " reviewed postings from " + c.after.organisations + " employers.", "",
    c.note, "",
  ];
  if (c.skills.length) {
    lines.push("| Skill | " + c.before.label + " | " + c.after.label + " | Change | Coverage |", "|---|---|---|---|---|",
      ...c.skills.map((s) => "| " + [s.skill, countText(s.before), countText(s.after), CHANGE_LABEL[s.kind] + (s.newlyQuoted ? " (newly quoted)" : s.noLongerQuoted ? " (no longer quoted)" : ""), coverageText(s)].join(" | ") + " |"), "");
  } else lines.push("No skill has been quoted in either window.", "");
  lines.push("Postings: " + c.carried + " carried over unchanged, " + c.postingsAdded.length + " new, " + c.postingsGone.length + " no longer in the reviewed set, " + c.textChanged.length + " with changed text.");
  for (const p of c.textChanged) lines.push("- Text changed: " + p.after.title + (p.after.organisation ? " (" + p.after.organisation + ")" : "") + ", fingerprint " + p.before.textHash + " to " + p.after.textHash + ".");
  lines.push("",
    "Rule: a skill is rising or falling only when the two 95% Wilson intervals do not overlap. This is stricter than a formal test, so a real shift can read as no clear change. Both windows are convenience samples chosen by the lecturer; a change describes the recorded sets, not the labour market.");
  return lines;
}

export function comparisonDocument(subject: { id: string; title: string }, c: SnapshotComparison, generatedAt: string): string {
  return ["# " + subject.id + " evidence over time", "", "Course: " + subject.title, "Generated: " + generatedAt, "", ...comparisonMarkdown(c)].join("\n");
}
