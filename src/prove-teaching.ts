import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import { deleteTeachingSession, getState, login, logout, resetDemoState, saveTeachingPlanDetails, saveTeachingSession, startDraft } from "./app/store.ts";
import { planSummary, teachingPlanMarkdown, type SessionInput } from "./lib/teachingPlan.ts";
import { SECTION_GUIDES } from "./app/sectionGuides.ts";
import { navFor } from "./app/roles.ts";

const session = (patch: Partial<SessionInput> = {}): SessionInput => ({
  week: 1, topic: "Model evaluation", minutes: 90, cloIds: ["CLO4"],
  activity: "Compare two confusion matrices.", learningCheck: "Explain when recall matters more than precision.",
  resources: "Two worked examples; a short slide brief.", status: "ready", ...patch,
});
function setup() { resetDemoState(); login(PEOPLE_IDS.sobri); }

test("only assigned academics can change teaching plans, including through direct actions", () => {
  setup();
  for (const actor of [PEOPLE_IDS.lim, PEOPLE_IDS.rahman, PEOPLE_IDS.tan, PEOPLE_IDS.devan, null]) {
    if (actor) login(actor); else logout();
    assert.equal(saveTeachingSession("CS220", session()).ok, false);
    assert.equal(saveTeachingPlanDetails("CS220", { term: "T1", notes: "Wrong actor" }).ok, false);
    assert.equal(deleteTeachingSession("CS220", "anything").ok, false);
    assert.deepEqual(getState().teachingPlans, []);
  }
});

test("invalid week/duration and cross-course outcomes are rejected before state changes", () => {
  setup();
  for (const input of [session({ week: 0 }), session({ week: 1.5 }), session({ week: 53 }), session({ minutes: NaN }), session({ minutes: 0 }), session({ minutes: 601 }), session({ cloIds: ["CLO5"] }), session({ topic: "  " })]) {
    assert.equal(saveTeachingSession("CS220", input).ok, false);
    assert.deepEqual(getState().teachingPlans, []);
  }
  assert.equal(saveTeachingSession("unknown", session()).ok, false);
});

test("drafts can be incomplete, but ready and delivered sessions require preparation", () => {
  setup();
  const incomplete = session({ status: "draft", cloIds: [], activity: "", learningCheck: "" });
  assert.equal(saveTeachingSession("CS220", incomplete).ok, true);
  for (const status of ["ready", "delivered"] as const)
    assert.equal(saveTeachingSession("CS220", { ...incomplete, status }).ok, false);
  assert.equal(saveTeachingSession("CS220", session({ activity: " " })).ok, false);
  assert.equal(saveTeachingSession("CS220", session({ learningCheck: " " })).ok, false);
  assert.equal(getState().teachingPlans[0].sessions.length, 1);
});

test("editing replaces a session, deduplicates CLO links and stamps the real author", () => {
  setup();
  saveTeachingSession("CS220", session({ cloIds: ["CLO4", "CLO4"] }));
  const saved = getState().teachingPlans[0].sessions[0];
  assert.deepEqual(saved.cloIds, ["CLO4"]);
  assert.equal(saveTeachingSession("CS220", { ...saved, topic: "  Revised topic  ", status: "delivered" }).ok, true);
  const plan = getState().teachingPlans[0];
  assert.equal(plan.sessions.length, 1);
  assert.equal(plan.sessions[0].topic, "Revised topic");
  assert.equal(plan.sessions[0].status, "delivered");
  assert.equal(plan.updatedBy, PEOPLE_IDS.sobri);
  assert.equal(saveTeachingSession("CS220", session({ id: "missing" })).ok, false);
});

test("course plans are isolated and never mutate curriculum or proposals", () => {
  setup();
  const before = JSON.stringify({ subjects: getState().subjects, clos: getState().clos, proposals: getState().proposals });
  saveTeachingSession("CS220", session());
  login(PEOPLE_IDS.tan);
  saveTeachingSession("CS310", session({ cloIds: ["CLO5"], topic: "Chart critique" }));
  const own = getState().teachingPlans.find((p) => p.subjectId === "CS310")!;
  assert.equal(saveTeachingSession("CS220", session({ id: own.sessions[0].id })).ok, false);
  assert.equal(getState().teachingPlans.length, 2);
  assert.equal(JSON.stringify({ subjects: getState().subjects, clos: getState().clos, proposals: getState().proposals }), before);
});

test("preparation summary shows actual minutes, distinct mappings and the next unfinished session", () => {
  setup();
  saveTeachingSession("CS220", session({ week: 3, status: "draft" }));
  saveTeachingSession("CS220", session({ week: 1, status: "delivered", minutes: 45 }));
  saveTeachingSession("CS220", session({ week: 2, status: "ready", minutes: 60 }));
  const clos = getState().clos.filter((c) => c.subjectId === "CS220");
  const summary = planSummary(getState().teachingPlans[0], clos);
  assert.deepEqual(summary.sessions.map((s) => s.week), [1, 2, 3]);
  assert.equal(summary.minutes, 195);
  assert.equal(summary.ready, 1);
  assert.equal(summary.delivered, 1);
  assert.equal(summary.next?.week, 2);
  assert.equal(summary.unmapped.length, 0);
  assert.equal(planSummary(undefined, clos).unmapped.length, 1);
});

test("export includes saved content, scope limits, CLO text, checks and teaching order", () => {
  setup();
  saveTeachingPlanDetails("CS220", { term: "September 2026", notes: "Check prerequisite knowledge." });
  saveTeachingSession("CS220", session({ week: 3 }));
  saveTeachingSession("CS220", session({ week: 1, topic: "First session" }));
  const text = teachingPlanMarkdown(getState().subjects.find((s) => s.id === "CS220")!, getState().teachingPlans[0], getState().clos.filter((c) => c.subjectId === "CS220"));
  for (const expected of ["September 2026", "Check prerequisite knowledge.", "CLO4", "Machine learning", "recall matters", "short slide brief", "not demonstrated mastery", "does not change the approved curriculum"])
    assert.ok(text.includes(expected), expected);
  assert.ok(text.indexOf("### Week 1") < text.indexOf("### Week 3"));
});

test("deletion updates coverage and repeated deletion fails safely", () => {
  setup();
  saveTeachingSession("CS220", session());
  const id = getState().teachingPlans[0].sessions[0].id;
  assert.equal(deleteTeachingSession("CS310", id).ok, false);
  assert.equal(deleteTeachingSession("CS220", id).ok, true);
  assert.equal(deleteTeachingSession("CS220", id).ok, false);
  assert.equal(planSummary(getState().teachingPlans[0], getState().clos.filter((c) => c.subjectId === "CS220")).unmapped.length, 1);
});

test("a fresh proposal cannot be created on someone else's course", () => {
  setup();
  const before = getState().proposals.length;
  assert.equal(startDraft("CS230"), null);
  assert.equal(startDraft("unknown"), null);
  assert.equal(getState().proposals.length, before);
});

test("every functional navigation section has a guide and all roles can read progress", () => {
  setup();
  assert.equal(new Set(SECTION_GUIDES.map((g) => g.screen)).size, SECTION_GUIDES.length);
  for (const person of getState().people) {
    const nav = navFor(person, getState().assignments);
    assert.ok(nav.includes("guide"));
    for (const screen of nav.filter((s) => s !== "guide" && s !== "login"))
      assert.ok(SECTION_GUIDES.some((g) => g.screen === screen), screen);
  }
});
