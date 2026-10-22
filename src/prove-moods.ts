// Proofs for the moods (plan Section 7.2): each mood is a pure function of the
// workspace state, the requests in flight and the clock, and no character is
// "working" unless a real request is in flight.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import {
  adoptCurriculumRevision, beginRequest, checkCurriculumRevision, confirmProposals, createCourseWorkspace, endRequest, getState, importCollectedPostings,
  login, nowIso, prepareEvidenceBrief, recordDecision, resetDemoState, runCollection, saveCurriculumRevision, saveTeachingSession, scanForRequirements,
  sendEvidenceBrief, setSkillLexicon, setSkillMapping, setSourcesReviewed, startCurriculumRevision, trackRequest, uploadResults, type AppState, type InFlightRequest,
} from "./app/store.ts";
import { DONE_WINDOW_MS, HELPER_ROLES, moodsFor, type CourseMoods } from "./app/moods.ts";
import type { CollectedPosting, CourseDefinition } from "./types.ts";

const NOW = () => Date.parse(nowIso()); // the store's clock is pinned outside the browser, so a record saved now is "just saved"
const LATER = () => NOW() + DONE_WINDOW_MS * 3;
const posting = (n: number, text: string): CollectedPosting => ({ id: "sample:moods:" + n, provider: "sample", board: "moods", title: "Data Analyst " + n, organisation: "Org " + n,
  location: "KL", url: "https://example.org/" + n, publishedAt: "", updatedAt: "", text, retrievedAt: "2026-10-01T00:00:00.000Z" });
const POSTINGS = [posting(1, "SQL is required for this role. Python is preferred."), posting(2, "Strong SQL is essential."), posting(3, "You will need Excel and SQL every day.")];
const loader = (ok: boolean) => async () => ok
  ? { ok: true as const, postings: POSTINGS, retrievedAt: "2026-10-01T00:00:00.000Z", cached: false, total: POSTINGS.length, label: "Test sample" }
  : { ok: false as const, error: "The board did not answer." };
const SAMPLE = { provider: "sample" as const, board: "", query: "", inText: false };

function allMoods(requests: InFlightRequest[] = [], now = LATER()): Array<{ subjectId: string; moods: CourseMoods }> {
  const s = getState();
  return s.subjects.map((x) => ({ subjectId: x.id, moods: moodsFor(s, requests, x.id, now) }));
}
function assertNothingWorking(stage: string) {
  for (const now of [NOW(), LATER()]) for (const { subjectId, moods } of allMoods([], now)) for (const role of HELPER_ROLES)
    assert.notEqual(moods.helpers[role], "working", stage + ": " + role + " on " + subjectId + " works with no request in flight");
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const v of Object.values(value as object)) deepFreeze(v); }
  return value;
}

test("no character works without a request in flight, at every stage of a research run", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assertNothingWorking("the seed");
  setSkillLexicon("CS310", ["SQL", "Python", "Excel"]);
  let during: CourseMoods | null = null;
  const fetched = await runCollection("CS310", SAMPLE, async () => { const s = getState(); during = moodsFor(s, s.requests, "CS310", NOW()); return loader(true)(); });
  assert.equal(fetched.ok, true);
  assert.equal(during!.helpers.scout, "working", "Scout works while the fetch is really in flight");
  assert.equal(getState().requests.length, 0, "the request is cleared when the fetch returns");
  assertNothingWorking("after the fetch");
  importCollectedPostings("CS310", POSTINGS.map((p) => p.id)); assertNothingWorking("after keeping postings");
  scanForRequirements("CS310"); assertNothingWorking("with proposals awaiting confirmation");
  confirmProposals("CS310", getState().scanProposals); assertNothingWorking("after confirming");
  setSourcesReviewed("CS310", getState().evidenceSources.filter((s) => s.subjectId === "CS310").map((s) => s.id), true); assertNothingWorking("after review");
  setSkillMapping("CS310", { skill: "SQL", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 4 lab." }); assertNothingWorking("after mapping");
  const brief = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "" }); assertNothingWorking("with a prepared brief");
  sendEvidenceBrief(brief.briefId!, [PEOPLE_IDS.rahman]); assertNothingWorking("after sending");
});

test("a mood is a pure function of the state, the requests and the clock", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  await runCollection("CS310", SAMPLE, loader(true));
  importCollectedPostings("CS310", [POSTINGS[0].id]);
  const requests: InFlightRequest[] = [{ id: "REQ-test", kind: "pack", subjectId: "CS310", startedAt: nowIso() }];
  const copy = structuredClone(getState()) as AppState;
  const frozen = deepFreeze(structuredClone(getState()) as AppState);
  const first = moodsFor(frozen, deepFreeze(structuredClone(requests)), "CS310", NOW());
  assert.deepEqual(moodsFor(frozen, requests, "CS310", NOW()), first, "the same inputs give the same moods");
  assert.deepEqual(moodsFor(copy, requests, "CS310", NOW()), first, "a copy of the state gives the same moods");
  assert.deepEqual(copy, structuredClone(getState()), "nothing in the state was changed");
});

test("a request moves only its own helper, on its own course", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const pack = beginRequest("pack", "CS310");
  const s = getState();
  assert.equal(moodsFor(s, s.requests, "CS310", LATER()).helpers.prism, "working");
  assert.equal(moodsFor(s, s.requests, "CS220", LATER()).helpers.prism, "resting", "a pack for CS310 does not make CS220's Prism work");
  for (const role of HELPER_ROLES.filter((r) => r !== "prism")) assert.notEqual(moodsFor(s, s.requests, "CS310", LATER()).helpers[role], "working", role);
  endRequest(pack);
  assert.equal(moodsFor(getState(), getState().requests, "CS310", LATER()).helpers.prism, "resting", "the render ended, so Prism rests");
  const parse = beginRequest("parse", null);
  assert.equal(moodsFor(getState(), getState().requests, "CS310", LATER()).helpers.folio, "working", "Folio reads a file while it is parsed");
  endRequest(parse);
  assert.equal(getState().requests.length, 0);
});

test("waiting comes only from a proposal that needs the lecturer, and done fades back to rest", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const m = (now = LATER()) => moodsFor(getState(), [], "CS310", now).helpers;
  await runCollection("CS310", SAMPLE, loader(true));
  assert.equal(m().scout, "waiting", "fetched postings wait to be kept");
  importCollectedPostings("CS310", POSTINGS.map((p) => p.id));
  assert.equal(m(NOW()).scout, "done", "a source was just kept");
  assert.equal(m().scout, "resting", "a few seconds later Scout rests");
  setSkillLexicon("CS310", ["SQL"]); scanForRequirements("CS310");
  assert.equal(m().atlas, "waiting", "proposed quotations wait for confirmation");
  confirmProposals("CS310", getState().scanProposals);
  assert.notEqual(m().atlas, "waiting");
  setSkillMapping("CS310", { skill: "SQL", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 4 lab." });
  assert.equal(m(NOW()).atlas, "done"); assert.equal(m().atlas, "resting");
  const brief = prepareEvidenceBrief("CS310", { recommendation: "keep", notes: "" });
  assert.equal(m().steward, "waiting", "a prepared brief waits to be sent");
  sendEvidenceBrief(brief.briefId!, [PEOPLE_IDS.rahman]);
  assert.equal(m(NOW()).steward, "done"); assert.equal(m().steward, "resting");
});

test("Quill waits on a checked revision and is done when it is adopted", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(createCourseWorkspace({ code: "BUS205", title: "Financial Planning", programmeTitle: "Business Studies", year: 2, semester: 1 }).ok, true);
  const draft = getState().curriculumDrafts.find((d) => d.subjectId === "BUS205")!;
  const definition: CourseDefinition = { ...structuredClone(draft.definition),
    brief: { ...draft.definition.brief, teachingWeeks: 12, contactHours: 8, selfStudyHours: 12, programmeOutcomes: ["PLO1"] },
    outcomes: [{ id: "BUS205-outcome-1", subjectId: "BUS205", label: "CLO1", text: "Prepare and justify a cash-flow plan for a small business.", bloomLevel: "Apply", assessmentEvidence: "Worked case.", ploIds: ["PLO1"] }],
    topics: [{ id: "BUS205-topic-1", title: "Cash-flow foundations", week: 1, contactHours: 3, selfStudyHours: 4, cloIds: ["BUS205-outcome-1"], prerequisiteTopicIds: [], protected: true, resources: "Case material." }] };
  const q = (now = LATER()) => moodsFor(getState(), [], "BUS205", now).helpers.quill;
  assert.equal(q(), "resting");
  assert.equal(saveCurriculumRevision(draft.id, draft.revision, { definition, reason: "Align the case with the outcome.", effectiveTerm: "2026-S2" }).ok, true);
  const saved = getState().curriculumDrafts.find((d) => d.id === draft.id)!;
  assert.equal(q(), "resting", "a saved but unchecked revision does not wait");
  assert.equal(checkCurriculumRevision(saved.id, saved.revision).ok, true);
  assert.equal(q(), "waiting", "a checked revision waits for the lecturer to adopt it");
  assert.equal(adoptCurriculumRevision(saved.id, saved.revision, true).ok, true);
  assert.equal(q(NOW()), "done"); assert.equal(q(), "resting");
});

test("a failed fetch is stuck, so the screen shows the error instead of a mascot", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const result = await runCollection("CS310", SAMPLE, loader(false));
  assert.equal(result.ok, false);
  assert.equal(moodsFor(getState(), [], "CS310", LATER()).helpers.scout, "stuck");
  assert.equal(moodsFor(getState(), [], "CS220", LATER()).helpers.scout, "resting", "the failure belongs to CS310 only");
});

test("the host follows the loop, not activity", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(moodsFor(getState(), [], "CS310", LATER()).host, "greeting", "before any step is done the host greets");
  assert.equal(moodsFor(getState(), [{ id: "REQ-x", kind: "collect", subjectId: "CS310", startedAt: nowIso() }], "CS310", LATER()).host, "greeting", "a request in flight does not move the host");
  await runCollection("CS310", SAMPLE, loader(true));
  importCollectedPostings("CS310", POSTINGS.map((p) => p.id));
  setSourcesReviewed("CS310", getState().evidenceSources.filter((s) => s.subjectId === "CS310").map((s) => s.id), true);
  assert.equal(moodsFor(getState(), [], "CS310", LATER()).host, "resting", "mid-loop the host rests");

  // Close the loop: quote, map, brief, a second person decides, adopt, teach, file results.
  setSkillLexicon("CS310", ["SQL"]); scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
  setSkillMapping("CS310", { skill: "SQL", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 3 lab." });
  const briefId = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a SQL lab." }).briefId!;
  sendEvidenceBrief(briefId, [PEOPLE_IDS.rahman]);
  login(PEOPLE_IDS.rahman); recordDecision(briefId, "adopt", "Add the SQL lab."); login(PEOPLE_IDS.sobri);
  assert.equal(moodsFor(getState(), [], "CS310", LATER()).host, "resting", "a recorded decision alone does not close the loop");
  const draftId = startCurriculumRevision("CS310").draftId;
  const draft = getState().curriculumDrafts.find((d) => d.id === draftId)!;
  const definition = structuredClone(draft.definition); definition.outcomes[0].text += " with SQL";
  saveCurriculumRevision(draft.id, draft.revision, { definition, reason: "Add the SQL lab.", effectiveTerm: "2026-S2" });
  checkCurriculumRevision(draft.id, draft.revision + 1); adoptCurriculumRevision(draft.id, draft.revision + 1, true);
  saveTeachingSession("CS310", { week: 3, topic: "SQL lab", minutes: 90, cloIds: ["CLO5"], activity: "Query a sales table.", learningCheck: "Explain one join.", resources: "", status: "ready" });
  uploadResults("CS310");
  assert.equal(moodsFor(getState(), [], "CS310", NOW()).host, "celebrating", "the moments after the loop closes");
  assert.equal(moodsFor(getState(), [], "CS310", LATER()).host, "reflecting", "once closed, the host reflects");
});

test("a tracked request is cleared even when the work fails", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  await assert.rejects(trackRequest("pack", "CS310", async () => { assert.equal(getState().requests.length, 1); throw new Error("render failed"); }));
  assert.equal(getState().requests.length, 0);
  assert.equal(await trackRequest("parse", null, async () => getState().requests[0].kind), "parse");
  assert.equal(getState().requests.length, 0);
});
