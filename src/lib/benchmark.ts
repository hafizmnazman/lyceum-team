// Runs the labelled scan benchmark through the real scan, and the live
// self-checks over a workspace. Deterministic; the numbers are what they are.

import type { AppState } from "../app/store.ts";
import { BENCHMARK_LEXICON, SCAN_BENCHMARK } from "../data/scanBenchmark.ts";
import type { EvidenceSource, MentionRequirement } from "../types.ts";
import { locateExcerpt, proposeMentions, skillKey } from "./evidence.ts";

export interface ScanBenchmarkResult {
  sentences: number; goldMentions: number; proposed: number; truePositives: number; falsePositives: number; falseNegatives: number;
  precision: number | null; recall: number | null; f1: number | null;
  levelAccuracy: number | null; levelCorrect: number;
  misses: Array<{ text: string; expected: string[]; got: string[]; expectedLevel: MentionRequirement; gotLevels: MentionRequirement[] }>;
}

export function runScanBenchmark(): ScanBenchmarkResult {
  const sources: EvidenceSource[] = SCAN_BENCHMARK.map((s, i) => ({
    id: "bench-" + i, subjectId: "BENCH", kind: "job-posting", title: "Sentence " + (i + 1), organisation: "Benchmark", url: "", sourceDate: "", text: s.text,
    textHash: "bench", duplicateOf: null, provenance: "lecturer-supplied", reviewed: true, addedBy: "bench", addedAt: "2026-10-11T00:00:00Z",
  }));
  const proposals = proposeMentions(sources, BENCHMARK_LEXICON, []);
  const gold = new Map<string, Set<string>>();
  SCAN_BENCHMARK.forEach((s, i) => gold.set("bench-" + i, new Set(s.skills.map(skillKey))));
  let tp = 0, fp = 0, levelCorrect = 0;
  const got = new Map<string, Set<string>>();
  const gotLevels = new Map<string, Set<MentionRequirement>>();
  for (const p of proposals) {
    const key = skillKey(p.skill);
    got.set(p.sourceId, (got.get(p.sourceId) ?? new Set()).add(key));
    gotLevels.set(p.sourceId, (gotLevels.get(p.sourceId) ?? new Set()).add(p.requirement));
    if (gold.get(p.sourceId)?.has(key)) {
      tp += 1;
      const index = Number(p.sourceId.slice(6));
      if (SCAN_BENCHMARK[index].level === p.requirement) levelCorrect += 1;
    } else fp += 1;
  }
  const goldMentions = SCAN_BENCHMARK.reduce((n, s) => n + s.skills.length, 0);
  const fn = goldMentions - tp;
  const precision = proposals.length ? tp / proposals.length : null, recall = goldMentions ? tp / goldMentions : null;
  const f1 = precision !== null && recall !== null ? (precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0) : null;
  // A disagreement is a skill found or missed, or a true positive read at the wrong level.
  const misses = SCAN_BENCHMARK.map((s, i) => ({ text: s.text, expected: s.skills, got: [...(got.get("bench-" + i) ?? [])].sort(), expectedLevel: s.level, gotLevels: [...(gotLevels.get("bench-" + i) ?? [])] }))
    .filter((m) => [...m.expected].map(skillKey).sort().join("|") !== m.got.join("|") || (m.got.length > 0 && m.gotLevels.some((l) => l !== m.expectedLevel)));
  return { sentences: SCAN_BENCHMARK.length, goldMentions, proposed: proposals.length, truePositives: tp, falsePositives: fp, falseNegatives: fn,
    precision, recall, f1, levelAccuracy: tp ? levelCorrect / tp : null, levelCorrect, misses };
}

export interface WorkspaceChecks {
  quotations: number; verified: number; duplicates: number; reviewed: number; eligible: number; sourcesWithLinks: number; sources: number;
}
/** Live checks over what this browser holds: every quotation is re-verified against its source text right now. */
export function workspaceChecks(state: AppState): WorkspaceChecks {
  const sources = state.evidenceSources;
  const byId = new Map(sources.map((s) => [s.id, s]));
  let verified = 0;
  for (const m of state.skillMentions) { const s = byId.get(m.sourceId); if (s && locateExcerpt(s.text, m.excerpt).ok) verified += 1; }
  return {
    quotations: state.skillMentions.length, verified, duplicates: sources.filter((s) => s.duplicateOf).length,
    reviewed: sources.filter((s) => s.reviewed && !s.duplicateOf).length, eligible: sources.filter((s) => s.kind === "job-posting" && s.reviewed && !s.duplicateOf).length,
    sourcesWithLinks: sources.filter((s) => s.url).length, sources: sources.length,
  };
}
