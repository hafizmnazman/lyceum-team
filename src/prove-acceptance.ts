// Stage 1 + 2 proof (spec build order 1-3, acceptance Section 12). No UI: run
// runAcceptanceTest on the canonical CS220-before-MA201 proposal over the seeded
// survey, print the verdict, and check it hits the canonical numbers exactly:
//   projected mastery 0.58, current 0.60, CLO4 mean 0.45, drill-down P = 0.43.
//
// Run with:  node src/prove-acceptance.ts   (Node 24 type-strips TS directly)

import { runAcceptanceTest } from "./agents/acceptance.ts";
import { runCurriculum } from "./agents/curriculum.ts";
import { runSignal } from "./agents/signal.ts";
import { ITEMS } from "./data/items.ts";
import {
  CANONICAL_PROPOSAL,
  CLO_NAMES,
  PROGRAMME_ID,
  SUBJECTS_BY_ID,
  SURVEY,
} from "./data/seed.ts";

const f2 = (x: number) => x.toFixed(2);
const f3 = (x: number) => x.toFixed(3);

let passed = 0;
let failed = 0;
function check(ok: boolean, msg: string): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (ok) passed += 1;
  else failed += 1;
}
function rule(label: string): void {
  console.log("\n" + label);
  console.log("-".repeat(label.length));
}

console.log("LYCEUM v2 ACCEPTANCE PROOF  (the spine, fixture mode)");
console.log("=====================================================");

const subject = SUBJECTS_BY_ID[CANONICAL_PROPOSAL.subjectId];
const report = runAcceptanceTest(CANONICAL_PROPOSAL, subject, SURVEY, ITEMS);

rule("Stage 1: runCohort runs on the seeded survey");
console.log(`survey records      ${SURVEY.length}  (200 students x assessed subjects)`);
console.log(`grounded on learners ${report.groundedOnLearners}`);
check(report.groundedOnLearners === 200, "cohort hydrated from the survey: 200 learners");
check(report.cloMastery.length === 7, "spine produced mastery for all 7 outcomes");

rule("Verdict");
console.log(`summary    ${report.summary}`);
console.log(`current    cohort mastery ${f3(report.currentMastery)}  (shown ${f2(report.currentMastery)})`);
console.log(`projected  cohort mastery ${f3(report.projectedMastery)}  (shown ${f2(report.projectedMastery)})`);
const weakest = [...report.cloMastery].sort((a, b) => a.meanP - b.meanP)[0];
console.log(`weakest    ${weakest.cloId} ${CLO_NAMES[weakest.cloId]} at ${f3(weakest.meanP)}`);

rule("Per-CLO mastery (proposed)");
for (const m of report.cloMastery) {
  console.log(
    `  ${m.cloId}  ${(CLO_NAMES[m.cloId] ?? "").padEnd(28)}  mean ${f3(m.meanP)}  spread ${f3(m.spread)}  conf ${f2(m.confidence)}`,
  );
}

rule("Curriculum agent annotations");
const annotations = runCurriculum(PROGRAMME_ID, runSignal(PROGRAMME_ID));
for (const a of annotations.filter((x) => x.annotation !== "fine")) {
  console.log(`  ${a.subjectId}  [${a.annotation}]  ${a.detail}`);
}

rule("Prerequisite conflict");
for (const c of report.prerequisiteConflicts) {
  console.log(`  ${c.edge[0]} -> depends on ${c.edge[1]}`);
}

rule("Canonical drill-down (computed by the spine link, not hard-coded)");
const d = report.drillRoot;
console.log(`  learner    ${d.studentId}  theta ${f2(d.theta)} on ${d.cloId}`);
console.log(`  item       ${d.itemId}  b ${f2(d.b)}`);
console.log(`  P(correct) = sigma(${f2(d.theta)} - ${f2(d.b)}) = ${d.p.toFixed(4)} -> ${f2(d.p)}`);
console.log(`  root cause ${d.cause}`);

rule("Acceptance checks (Section 12)");
const clo4 = report.cloMastery.find((m) => m.cloId === "CLO4")!;
check(f2(report.currentMastery) === "0.60", "current mastery is 0.60");
check(f2(report.projectedMastery) === "0.58", "projected mastery is 0.58");
check(f2(clo4.meanP) === "0.45", "CLO4 mean mastery is 0.45");
check(weakest.cloId === "CLO4", "CLO4 is the weakest outcome under the proposal");
check(report.projectedMastery < report.currentMastery, "the proposal lowers projected mastery");
check(report.prerequisiteConflicts.length === 1, "exactly one sequencing conflict detected");
check(
  report.prerequisiteConflicts[0]?.edge[0] === "CS220" && report.prerequisiteConflicts[0]?.edge[1] === "MA201",
  "conflict edge is CS220 -> MA201",
);
check(f2(report.drillRoot.p) === "0.43", "drill-down P = 0.43");
check(report.failedItems.length > 0, "verdict carries real failed-item evidence");
check(report.isProxyCohort === false, "real cohort (not a proxy)");

console.log("");
console.log(`${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
