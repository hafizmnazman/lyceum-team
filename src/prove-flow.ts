// Flow proof (spec Section 12, the criteria that are behaviour, not numbers).
// Drives the REAL store and the role resolver to check:
//   - permissions match Section 2 (management can't author; department can't approve; lecturer can't review)
//   - a lecturer-drafted change cannot reach management without coordinator review (state machine)
//   - a new subject routes through the Analogy agent and the verdict is isProxyCohort: true
//   - on approval a Prediction is written; a later upload fills actualMastery + residual
//   - the staged reveal runs 12-20s, is deterministic, and ends settled
//
// Run with:  node src/prove-flow.ts

import { can } from "./app/roles.ts";
import { initSim, stepSim, SIM_TICK_MS } from "./app/sim.ts";
import {
  approveProposal,
  canRunTest,
  createSubject,
  getState,
  login,
  proposalById,
  reviewApprove,
  runAcceptanceImmediate,
  startDraft,
  submitForReview,
  switchUser,
  uploadResults,
  useStore as _useStore,
} from "./app/store.ts";
import { runAcceptanceWithDistribution } from "./agents/acceptance.ts";
import { PEOPLE, PEOPLE_IDS, ROLE_ASSIGNMENTS, SUBJECTS_BY_ID, CANONICAL_PROPOSAL } from "./data/seed.ts";
import { ITEMS } from "./data/items.ts";

void _useStore; // referenced for type side-effects only

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

const sobri = PEOPLE.find((p) => p.id === PEOPLE_IDS.sobri)!;
const lim = PEOPLE.find((p) => p.id === PEOPLE_IDS.lim)!;
const rahman = PEOPLE.find((p) => p.id === PEOPLE_IDS.rahman)!;
const tan = PEOPLE.find((p) => p.id === PEOPLE_IDS.tan)!;
const A = ROLE_ASSIGNMENTS;

console.log("LYCEUM v2 FLOW PROOF  (store + roles, fixture mode)");
console.log("==================================================");

rule("Permissions (Section 2)");
check(can(lim, "approve", { assignments: A }), "management can approve");
check(!can(lim, "draft-change", { subjectId: "CS220", assignments: A }), "management cannot author");
check(!can(lim, "upload-results", { subjectId: "CS220", assignments: A }), "management cannot upload");
check(can(rahman, "create-subject", { assignments: A }), "department can create a subject");
check(!can(rahman, "approve", { assignments: A }), "department cannot approve");
check(can(sobri, "review-draft", { subjectId: "CS220", assignments: A }), "coordinator can review a draft");
check(can(sobri, "run-test", { subjectId: "CS220", assignments: A }), "coordinator can run the test");
check(!can(tan, "review-draft", { subjectId: "CS310", assignments: A }), "a lecturer cannot review a draft");
check(can(tan, "upload-results", { subjectId: "CS310", assignments: A }), "a lecturer can upload results");

rule("State machine: a lecturer draft cannot reach management without review");
login(tan.id); // lecturer on CS310, where Sobri is coordinator
const draftId = startDraft("CS310")!;
check(proposalById(draftId)?.authorId === tan.id, "draft is lecturer-authored");
check(!canRunTest(draftId), "lecturer-authored draft cannot be tested directly (gate holds)");
submitForReview(draftId);
check(proposalById(draftId)?.status === "coordinator-review", "submitting moves it to coordinator-review, not testing");
switchUser(sobri.id); // coordinator on CS310
reviewApprove(draftId);
check(proposalById(draftId)?.status === "testing" && canRunTest(draftId), "after coordinator review it can be tested");

rule("New subject -> Analogy proxy cohort -> verdict isProxyCohort: true");
switchUser(rahman.id); // department creates and assigns
const newId = createSubject({ id: "CS450", title: "Reinforcement Learning", year: 3, semester: 1, coordinatorId: sobri.id, cloText: "Apply reinforcement-learning methods to a sequential decision problem." });
const newProposalId = `CP-${newId}-001`;
check(!canRunTest(newProposalId), "department cannot run the test (permission gate holds)");
switchUser(sobri.id); // the assigned coordinator runs it
check(canRunTest(newProposalId), "the assigned coordinator can run the proxy test");
runAcceptanceImmediate(newProposalId);
const proxyReport = proposalById(newProposalId)?.acceptanceResult;
check(proxyReport?.isProxyCohort === true, "new-subject verdict is marked isProxyCohort: true");
check((proxyReport?.cloMastery.length ?? 0) > 0, "the proxy run still produced a real verdict");

rule("Closed loop: approval writes a Prediction; a later upload scores it");
login(sobri.id);
runAcceptanceImmediate(CANONICAL_PROPOSAL.id);
check(proposalById(CANONICAL_PROPOSAL.id)?.status === "management-approval", "tested proposal awaits management");
switchUser(lim.id);
approveProposal(CANONICAL_PROPOSAL.id);
approveProposal(CANONICAL_PROPOSAL.id); // a second call must be a no-op (idempotent)
const preds = getState().predictions.filter((p) => p.proposalId === CANONICAL_PROPOSAL.id);
check(preds.length === 1, "exactly one Prediction is written on approval (idempotent, no double-write)");
const predBefore = preds[0];
check(!!predBefore, "a Prediction is written on approval");
check(predBefore?.actualMastery === undefined, "prediction is open after approval (scored by next term, not prior results)");
switchUser(sobri.id);
uploadResults("CS220");
const predAfter = getState().predictions.find((p) => p.proposalId === CANONICAL_PROPOSAL.id);
check(predAfter?.actualMastery !== undefined, "a later upload fills actualMastery");
check(typeof predAfter?.residual === "number", "the residual is computed");
console.log(`  predicted ${predAfter?.predictedMastery.toFixed(3)} vs actual ${predAfter?.actualMastery?.toFixed(3)} -> residual ${predAfter?.residual?.toFixed(3)}`);

rule("Staged reveal: 12-20s, deterministic, ends settled");
const { report, distribution } = runAcceptanceWithDistribution(CANONICAL_PROPOSAL, SUBJECTS_BY_ID.CS220, getState().survey, ITEMS, {});
function runSim() {
  let st = initSim(CANONICAL_PROPOSAL.id, report, distribution);
  let ticks = 0;
  const captions: string[] = [];
  while (st.phase !== "done" && ticks < 1000) {
    st = stepSim(st);
    ticks += 1;
    captions.push(st.caption);
  }
  return { ticks, st, captions };
}
const run1 = runSim();
const run2 = runSim();
const ms = run1.ticks * SIM_TICK_MS;
check(ms >= 12000 && ms <= 20000, `reveal takes ${(ms / 1000).toFixed(1)}s (12-20s window)`);
check(run1.st.phase === "done", "reveal ends in the done phase");
check(Math.abs(run1.st.displayedMastery - report.projectedMastery) < 1e-9, "settled mastery equals the projected figure");
check(run1.st.bins.reduce((a, b) => a + b, 0) === report.groundedOnLearners, "histogram covers all learners");
check(JSON.stringify(run1.captions) === JSON.stringify(run2.captions), "two runs are identical (seeded/deterministic)");

console.log("");
console.log(`${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
