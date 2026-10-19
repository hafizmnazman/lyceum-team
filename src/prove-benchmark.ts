// The benchmark proofs: the labelled scan set is well formed, the metrics add
// up, the scan is strong on direct mentions and provably misses indirect ones
// (a perfect score would say nothing), and the live workspace checks catch a
// quotation that is not in its source. Run with `node --test`.

import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import { addEvidenceSource, addSkillMention, getState, login, resetDemoState, setEvidenceSourceReviewed } from "./app/store.ts";
import { BENCHMARK_LEXICON, SCAN_BENCHMARK } from "./data/scanBenchmark.ts";
import { runScanBenchmark, workspaceChecks } from "./lib/benchmark.ts";
import { skillKey } from "./lib/evidence.ts";

test("the labelled set is well formed: unique sentences, every labelled skill is a lexicon term", () => {
  const texts = SCAN_BENCHMARK.map((s) => s.text);
  assert.equal(new Set(texts).size, texts.length);
  const terms = new Set(BENCHMARK_LEXICON.map((t) => skillKey(t.split("|")[0])));
  for (const s of SCAN_BENCHMARK) {
    assert.equal(new Set(s.skills).size, s.skills.length, s.text);
    for (const skill of s.skills) assert.ok(terms.has(skillKey(skill)), skill + " is not in the lexicon: " + s.text);
    assert.ok(["required", "preferred", "unclear"].includes(s.level));
  }
  assert.ok(SCAN_BENCHMARK.length >= 30);
  assert.ok(SCAN_BENCHMARK.some((s) => s.skills.length === 0), "the set needs sentences with nothing to find");
});

test("precision, recall, F1 and level accuracy are reported with the counts behind them", () => {
  const r = runScanBenchmark();
  assert.equal(r.sentences, SCAN_BENCHMARK.length);
  assert.equal(r.goldMentions, SCAN_BENCHMARK.reduce((n, s) => n + s.skills.length, 0));
  assert.equal(r.truePositives + r.falseNegatives, r.goldMentions);
  assert.equal(r.truePositives + r.falsePositives, r.proposed);
  assert.ok(r.precision !== null && r.recall !== null && r.f1 !== null && r.levelAccuracy !== null);
  assert.ok(Math.abs(r.f1 - (2 * r.precision * r.recall) / (r.precision + r.recall)) < 1e-9);
  for (const v of [r.precision, r.recall, r.f1, r.levelAccuracy]) assert.ok(v >= 0 && v <= 1);
  assert.ok(r.levelCorrect <= r.truePositives);
});

test("the scan is strong on direct mentions, misses indirect ones, and lists every disagreement", () => {
  const r = runScanBenchmark();
  assert.ok(r.precision! >= 0.85, "precision " + r.precision);
  assert.ok(r.recall! >= 0.75, "recall " + r.recall);
  assert.ok(r.recall! < 1, "a labelled set the scan reads perfectly would say nothing about its limits");
  assert.ok(r.misses.length >= 4, "misses " + r.misses.length);
  for (const m of r.misses) assert.ok([...m.expected].map(skillKey).sort().join("|") !== [...m.got].sort().join("|") || m.gotLevels.some((l) => l !== m.expectedLevel), m.text);
  const notExpected = r.misses.find((m) => m.text.startsWith("R is welcome"));
  assert.ok(notExpected && notExpected.gotLevels.length > 0 && notExpected.gotLevels.some((l) => l !== "preferred"), "a negated requirement word is read at the wrong level, by design of a word heuristic");
  const postgres = r.misses.find((m) => m.text.includes("Postgres"));
  assert.ok(postgres && postgres.expected.includes("SQL") && !postgres.got.includes(skillKey("SQL")), "an indirect SQL mention is a miss, by design");
  const title = r.misses.find((m) => m.text.startsWith("Machine Learning Engineer"));
  assert.ok(title && title.expected.length === 0 && title.got.length === 1, "a job title is a false positive the lecturer has to dismiss");
  const negated = r.misses.find((m) => m.text.startsWith("No SQL"));
  assert.ok(negated && negated.expected.length === 0 && negated.got.includes(skillKey("SQL")), "a negation is a false positive the lecturer has to dismiss");
});

test("live checks re-verify every stored quotation against its source and catch a tampered one", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const base = workspaceChecks(getState());
  const text = "Data analyst. You must be fluent in SQL and comfortable writing complex joins. Familiarity with Tableau dashboards is a plus. Hybrid working.";
  const added = addEvidenceSource("CS310", { kind: "job-posting", title: "Data Analyst", organisation: "Acme", url: "https://example.org/1", sourceDate: "2026-09-01", text });
  assert.equal(added.ok, true, JSON.stringify(added));
  const sourceId = added.sourceId!;
  assert.equal(addSkillMention(sourceId, { skill: "SQL", excerpt: "You must be fluent in SQL and comfortable writing complex joins.", requirement: "required" }).ok, true);
  assert.equal(addSkillMention(sourceId, { skill: "Tableau", excerpt: "Familiarity with Tableau dashboards is a plus.", requirement: "preferred" }).ok, true);
  assert.equal(setEvidenceSourceReviewed(sourceId, true).ok, true);
  const state = getState();
  const checks = workspaceChecks(state);
  assert.equal(checks.quotations, base.quotations + 2);
  assert.equal(checks.verified, checks.quotations);
  assert.equal(checks.eligible, base.eligible + 1);
  assert.ok(checks.eligible <= checks.sources);
  // A quotation that is not in its source text is caught, even if it slipped past the store.
  const tampered = { ...state, skillMentions: state.skillMentions.map((m) => (m.sourceId === sourceId && m.skill === "Tableau" ? { ...m, excerpt: "Tableau is mandatory." } : m)) };
  const after = workspaceChecks(tampered);
  assert.equal(after.quotations, checks.quotations);
  assert.equal(after.verified, checks.verified - 1);
});

test("duplicate copies and unreviewed postings stay out of the eligible denominator", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const base = workspaceChecks(getState());
  const text = "Business analyst. Advanced Excel modelling is preferred but not mandatory. You will present findings to senior stakeholders every week.";
  const first = addEvidenceSource("CS310", { kind: "job-posting", title: "Business Analyst", organisation: "Beta", url: "", sourceDate: "", text });
  const copy = addEvidenceSource("CS310", { kind: "job-posting", title: "Business Analyst (repost)", organisation: "Beta", url: "", sourceDate: "", text });
  const other = addEvidenceSource("CS310", { kind: "job-posting", title: "Analyst", organisation: "Gamma", url: "", sourceDate: "", text: "Analyst role. Knowledge of R is a bonus; most of our work is in Python. Build dashboards that leaders use daily." });
  assert.ok(first.ok && copy.ok && other.ok, JSON.stringify([first, copy, other]));
  assert.equal(getState().evidenceSources.find((s) => s.id === copy.sourceId)!.duplicateOf, first.sourceId);
  let checks = workspaceChecks(getState());
  assert.equal(checks.sources, base.sources + 3);
  assert.equal(checks.duplicates, base.duplicates + 1);
  assert.equal(checks.eligible, base.eligible, "nothing is reviewed yet, so nothing is eligible");
  setEvidenceSourceReviewed(first.sourceId!, true);
  checks = workspaceChecks(getState());
  assert.equal(checks.eligible, base.eligible + 1);
  setEvidenceSourceReviewed(copy.sourceId!, true);
  checks = workspaceChecks(getState());
  assert.equal(checks.eligible, base.eligible + 1, "a duplicate copy never counts twice");
  setEvidenceSourceReviewed(other.sourceId!, true);
  checks = workspaceChecks(getState());
  assert.equal(checks.eligible, base.eligible + 2);
  assert.equal(checks.reviewed, base.reviewed + 2);
});
