// Evaluation: how Lyceum is tested, what passes right now in this browser, the
// labelled scan benchmark, and the protocol for the student-agent benchmark
// against course outcomes and surveys. Numbers here are computed live or
// quoted with their date; none is a projection.

import { useMemo } from "react";
import { runScanBenchmark, workspaceChecks } from "../../lib/benchmark.ts";
import { BENCHMARK_LEXICON } from "../../data/scanBenchmark.ts";
import { parseWorkspaceBackup } from "../../lib/workspaceBackup.ts";
import { exportWorkspaceBackup, navigate, useStore } from "../../app/store.ts";
import { Button, Page, PageHead, Tag } from "../primitives/index.tsx";
import { BarList } from "../primitives/ShareBar.tsx";

const SUITES: Array<[string, number, string]> = [
  ["Acceptance scenario (illustrative spine)", 12, "canonical numbers of the synthetic scenario"],
  ["Backtest (synthetic)", 4, "closed-loop arithmetic on synthetic data"],
  ["Flow and roles", 28, "store, permissions, state machine"],
  ["Signal reveal (fixture)", 12, "the staged fixture reveal"],
  ["Intake parsing", 18, "xlsx, csv, pdf, pptx parse and interpret"],
  ["Integrity", 13, "evidence edge cases, approval guards"],
  ["Teaching plans", 10, "scope, validation, export"],
  ["Curriculum", 28, "revisions, constraints, adoption, recovery"],
  ["Evidence", 13, "citations, duplicates, Wilson intervals, mappings, backups"],
  ["Collector", 6, "text extraction, cache, rate limits, timeouts"],
  ["Research run", 5, "import on request, exact proposals, briefs"],
  ["Slides", 3, "decks unzipped and read back, chart part included"],
  ["Benchmark and self-checks", 5, "labelled scan set, metric arithmetic, live quotation re-verification, denominator rules"],
  ["Journey and record", 3, "strict completion rules, the derived timeline in saved order, every landing figure sourced"],
];

export function EvaluationScreen() {
  const state = useStore();
  const bench = useMemo(() => runScanBenchmark(), []);
  const checks = workspaceChecks(state);
  const backup = useMemo(() => parseWorkspaceBackup(exportWorkspaceBackup(), state.people.map((p) => p.id)), [state]);
  const total = SUITES.reduce((n, s) => n + s[1], 0);
  const pass = (ok: boolean) => <Tag tone={ok ? "ok" : "danger"}>{ok ? "Pass" : "Check"}</Tag>;
  return <Page wide>
    <PageHead title="Evaluation" context="How Lyceum is tested, what passes right now in this browser, and the benchmark we will run with real course data." />

    <section className="workspace-panel" aria-labelledby="live-checks">
      <div className="section-heading"><div><h2 id="live-checks">Live checks on this workspace</h2><p className="muted">Recomputed every time this page renders, over the data in this browser.</p></div></div>
      <div className="stat-grid">
        <div className="stat-tile"><span className="stat-value">{checks.verified} of {checks.quotations}</span><span className="stat-label">stored quotations found verbatim in their source text right now</span>{pass(checks.verified === checks.quotations)}</div>
        <div className="stat-tile"><span className="stat-value">{checks.duplicates}</span><span className="stat-label">duplicate copies recorded by text fingerprint; each counts once in the denominator</span><Tag>Recorded</Tag></div>
        <div className="stat-tile"><span className="stat-value">{checks.eligible}</span><span className="stat-label">reviewed postings in the denominator, out of {checks.sources} sources</span>{pass(checks.eligible <= checks.sources)}</div>
        <div className="stat-tile"><span className="stat-value">{backup.ok ? "Valid" : "Invalid"}</span><span className="stat-label">workspace backup re-validated: every record, link and quotation</span>{pass(backup.ok)}</div>
      </div>
    </section>

    <section className="workspace-panel" aria-labelledby="scan-bench">
      <div className="section-heading"><div><h2 id="scan-bench">Requirement scan benchmark</h2><p className="muted">{bench.sentences} hand-labelled sentences in job-posting style, a fixed lexicon of {BENCHMARK_LEXICON.length} terms, scored against the deterministic scan. The lecturer still confirms every proposal; this measures how much help the scan gives.</p></div></div>
      <BarList caption="Scan detection on the labelled set. Precision: proposals that were right. Recall: labelled skills that were found. Level accuracy: required or preferred read correctly among true positives." width={260} rows={[
        { label: "Precision", share: bench.precision, note: bench.truePositives + " of " + bench.proposed },
        { label: "Recall", share: bench.recall, note: bench.truePositives + " of " + bench.goldMentions },
        { label: "F1", share: bench.f1 },
        { label: "Level accuracy", share: bench.levelAccuracy, note: bench.levelCorrect + " of " + bench.truePositives },
      ]} />
      {bench.misses.length ? <details><summary>{bench.misses.length} sentences where the scan and the label disagree</summary><ul className="bench-misses">{bench.misses.map((m) => <li key={m.text}><span>{m.text}</span><span className="muted">expected {m.expected.join(", ") || "nothing"} ({m.expectedLevel}); got {m.got.join(", ") || "nothing"}{m.gotLevels.length ? " (" + m.gotLevels.join(", ") + ")" : ""}</span></li>)}</ul></details> : <p className="muted">The scan matches every label in this set.</p>}
      <p className="muted">Limits: a small set written by one person; whole-word matching cannot find a skill named indirectly. Extend the set in <code>src/data/scanBenchmark.ts</code>; the proofs re-run it.</p>
    </section>

    <section className="workspace-panel" aria-labelledby="suites">
      <div className="section-heading"><div><h2 id="suites">Automated checks on the current code</h2><p className="muted">{total} checks across {SUITES.length} suites, plus four headless browser runs and the full-tour demo. Last run 11 October 2026. Reproduce with <code>npm run prove:all</code> and the smoke scripts.</p></div></div>
      <div className="table-scroll"><table className="evidence-table"><thead><tr><th scope="col">Suite</th><th scope="col">Checks</th><th scope="col">Covers</th></tr></thead>
        <tbody>{SUITES.map(([name, n, covers]) => <tr key={name}><th scope="row">{name}</th><td className="num">{n}</td><td>{covers}</td></tr>)}</tbody></table></div>
    </section>

    <section className="workspace-panel" aria-labelledby="student-bench">
      <div className="section-heading"><div><h2 id="student-bench">Student-agent benchmark: the protocol</h2><p className="muted">The earlier Cohort agent simulates learners to estimate the effect of a course change. Its numbers are not evidence until they are benchmarked against real outcomes. This is how we will do it.</p></div></div>
      <ol className="protocol">
        <li><strong>Ground truth.</strong> One course, one term: per-outcome attainment from the filed results (earned marks over available marks per CLO, with the allocation rules stated) and the CLO self-rating survey, kept separate from marks.</li>
        <li><strong>Prediction before the term.</strong> The simulation's predicted mastery per CLO is frozen with the course version, cohort, term and model version, before results exist. Upload time is never teaching time.</li>
        <li><strong>Scoring.</strong> Mean absolute error and calibration of predicted against actual attainment per CLO; correlation with the survey; a naive baseline (last term's attainment) that the model must beat.</li>
        <li><strong>Transparency.</strong> Sample sizes, missingness and subgroup results reported; a learning-impact claim is made only after a held-out term, not from a fit.</li>
      </ol>
      <div className="stat-grid">
        <div className="stat-tile"><span className="stat-value">0.009</span><span className="stat-label">mean absolute error of the simulation on its synthetic backtest. Synthetic data; not evidence of real accuracy.</span><Tag tone="warn">Synthetic</Tag></div>
        <div className="stat-tile"><span className="stat-value">0</span><span className="stat-label">real terms benchmarked so far. The protocol needs one course and one term of results.</span><Tag tone="warn">Not yet run</Tag></div>
      </div>
      <p className="muted">Until that benchmark runs, the acceptance scenario stays in the research sandbox, labelled illustrative, and no learning gain is claimed anywhere in the product.</p>
    </section>

    <section className="workspace-panel" aria-labelledby="pilot">
      <div className="section-heading"><div><h2 id="pilot">Pilot measures with lecturers</h2></div></div>
      <ul className="proof-list">
        <li>Task completion without coaching, and time to an accepted brief.</li>
        <li>Citation fidelity: zero fabricated quotations in a checked sample, by construction and by audit.</li>
        <li>Educational alignment judged by a lecturer rubric; constraints never violated silently.</li>
        <li>Repeat use next week and next term, and the actual cost per accepted pack.</li>
      </ul>
      <Button variant="quiet" onClick={() => navigate("office")}>Back to How Lyceum works</Button>
    </section>
  </Page>;
}
