import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeSourceAgreement } from "./lib/sourceAgreement.ts";
import {
  agreementFor,
  computeRelevanceRatings,
  evidenceForSkill,
  hasSourceDisagreement,
  MARKET_SOURCES,
} from "./data/market.ts";
import { CANONICAL_PROPOSAL, PEOPLE_IDS, SUBJECTS } from "./data/seed.ts";
import {
  approveProposal,
  getState,
  login,
  logout,
  rejectProposal,
  resetDemoState,
  runAcceptanceImmediate,
} from "./app/store.ts";

test("absent evidence cannot claim agreement", () => {
  assert.equal(summarizeSourceAgreement([]).fraction, null);
  assert.equal(agreementFor([]), null);
  assert.equal(agreementFor(["a skill with no evidence"]), null);
  assert.equal(agreementFor(["machine learning", "a skill with no evidence"]), null);
});

test("duplicate rows from one source cannot create corroboration", () => {
  const summary = summarizeSourceAgreement([
    { sourceId: "one", delta12m: 0.1 },
    { sourceId: "one", delta12m: 0.2 },
  ]);
  assert.equal(summary.sourceCount, 1);
  assert.equal(summary.fraction, null);
  assert.equal(summary.status, "insufficient");
});

test("a two-two split is visible as disagreement", () => {
  const evidence = evidenceForSkill("data visualisation");
  assert.equal(summarizeSourceAgreement(evidence).status, "split");
  assert.equal(agreementFor(["data visualisation"]), 0.5);
  assert.equal(hasSourceDisagreement(evidence), true);
});

test("unanimous directions are descriptive agreement", () => {
  const summary = summarizeSourceAgreement(evidenceForSkill("machine learning"));
  assert.equal(summary.sourceCount, 4);
  assert.equal(summary.fraction, 1);
  assert.equal(summary.status, "unanimous");
});

test("flat, rising and falling are distinct directions", () => {
  const summary = summarizeSourceAgreement([
    { sourceId: "one", delta12m: 0 },
    { sourceId: "two", delta12m: 0.1 },
    { sourceId: "three", delta12m: -0.1 },
  ]);
  assert.equal(summary.fraction, 1 / 3);
  assert.equal(summary.status, "split");
});

test("non-finite and unidentified observations do not count", () => {
  const summary = summarizeSourceAgreement([
    { sourceId: "one", delta12m: NaN },
    { sourceId: "two", delta12m: Infinity },
    { sourceId: "", delta12m: 0.1 },
  ]);
  assert.equal(summary.sourceCount, 0);
  assert.equal(summary.fraction, null);
});

test("conflicting observations from one source require review", () => {
  const summary = summarizeSourceAgreement([
    { sourceId: "one", delta12m: 0.1 },
    { sourceId: "one", delta12m: -0.1 },
    { sourceId: "two", delta12m: 0.1 },
    { sourceId: "three", delta12m: 0.1 },
  ]);
  assert.equal(summary.conflictingSourceCount, 1);
  assert.equal(summary.fraction, null);
});

test("averaging skills does not hide a split or overweight duplicate skills", () => {
  assert.equal(agreementFor(["machine learning", "data visualisation"]), 0.75);
  assert.equal(agreementFor(["machine learning", "machine learning", "data visualisation"]), 0.75);
  assert.equal(hasSourceDisagreement([
    ...evidenceForSkill("machine learning"),
    ...evidenceForSkill("data visualisation"),
  ]), true);
});

test("an unrated course has unknown agreement", () => {
  const rating = computeRelevanceRatings([SUBJECTS[0]], [], "2026-10-05T00:00:00Z")[0];
  assert.equal(rating.band, "unrated");
  assert.equal(rating.agreement, null);
});

test("all shipped market sources identify synthetic records", () => {
  assert.ok(MARKET_SOURCES.length > 0);
  assert.ok(MARKET_SOURCES.every((source) => source.isSynthetic));
});

function awaitingManagement() {
  resetDemoState();
  login(PEOPLE_IDS.sobri);
  runAcceptanceImmediate(CANONICAL_PROPOSAL.id);
  assert.equal(getState().proposals.find((p) => p.id === CANONICAL_PROPOSAL.id)?.status, "management-approval");
}

function mutationSnapshot() {
  const s = getState();
  return JSON.stringify({
    proposals: s.proposals,
    predictions: s.predictions,
    versions: s.subjectVersions,
    notifications: s.notifications,
    agents: s.agentStates,
    toast: s.toast,
  });
}

test("direct approval and rejection calls deny every non-management actor and signed-out use", () => {
  awaitingManagement();
  const actors = getState().people.filter((p) => p.orgRole !== "management").map((p) => p.id);
  for (const actorId of [...actors, null]) {
    awaitingManagement();
    if (actorId) login(actorId);
    else logout();
    const before = mutationSnapshot();
    approveProposal(CANONICAL_PROPOSAL.id);
    rejectProposal(CANONICAL_PROPOSAL.id, "Unauthorized request");
    assert.equal(mutationSnapshot(), before, `Actor ${actorId ?? "signed out"} changed state`);
  }
});

test("management can approve once and the audit records the actual actor", () => {
  awaitingManagement();
  login(PEOPLE_IDS.lim);
  approveProposal(CANONICAL_PROPOSAL.id);
  const approved = mutationSnapshot();
  approveProposal(CANONICAL_PROPOSAL.id);
  assert.equal(mutationSnapshot(), approved);
  const proposal = getState().proposals.find((p) => p.id === CANONICAL_PROPOSAL.id)!;
  assert.equal(proposal.status, "approved");
  assert.equal(proposal.history.at(-1)?.byPersonId, PEOPLE_IDS.lim);
  assert.equal(getState().predictions.length, 1);
});

test("management can return a proposal without recording a prediction", () => {
  awaitingManagement();
  login(PEOPLE_IDS.lim);
  rejectProposal(CANONICAL_PROPOSAL.id, "Revise the teaching plan");
  const proposal = getState().proposals.find((p) => p.id === CANONICAL_PROPOSAL.id)!;
  assert.equal(proposal.status, "drafting");
  assert.equal(proposal.history.at(-1)?.byPersonId, PEOPLE_IDS.lim);
  assert.equal(proposal.history.at(-1)?.note, "Revise the teaching plan");
  assert.equal(getState().predictions.length, 0);
});
