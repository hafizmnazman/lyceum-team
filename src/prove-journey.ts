// The loop proofs (plan Section 4): the receipts ring marks a step done only
// when its record exists in this term's window, seeded examples never count, a
// decision is an immutable record that the brief's author cannot make alone, a
// new term restarts the loop without erasing the last one, and the How it works
// timeline reads the event log first and labels every derived line. The last
// test keeps the landing page's figures sourced. Run with `node --test`.

import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import {
  adoptCurriculumRevision, checkCurriculumRevision, confirmProposals, createCourseWorkspace, getState, importCollectedPostings, login, openNotification,
  prepareEvidenceBrief, recordDecision, removeEvidenceSnapshot, resetDemoState, runCollection, saveCurriculumRevision, saveTeachingPlanDetails,
  saveTeachingSession, scanForRequirements, sendEvidenceBrief, setSkillLexicon, setSkillMapping, setSourcesReviewed, startCurriculumRevision,
  takeEvidenceSnapshot, uploadResults, exportWorkspaceBackup, stagePendingIntake, confirmPendingIntake, SEED_NOW, type AppState, type CollectRun,
} from "./app/store.ts";
import { attainment, LEARN_CLAIM } from "./lib/learn.ts";
import { parseWorkspaceBackup } from "./lib/workspaceBackup.ts";
import { LOOP_STEPS, REPORT_TABS, loopState, ringTermLines, stepDef, taughtVersionId, termWindow, type CourseStep } from "./app/loop.ts";
import { hashFor, parseRoute } from "./app/routes.ts";
import { runTimeline } from "./app/runs.ts";
import { briefDecisionState, decisionStatusText, evidenceChangedAt } from "./lib/decisions.ts";
import { readFileSync } from "node:fs";
import { ACCREDITOR_MAPPING } from "./data/accreditors.ts";
import { PAIN_STATS } from "./data/painStats.ts";
import { PROOF } from "./data/proof.ts";
import { SUITE_TOTAL } from "./data/suites.ts";
import { tourMinutes } from "./demo/script.ts";
import type { CollectedPosting, CourseDefinition, DecisionOutcome } from "./types.ts";

const RETRIEVED = "2026-10-09T03:00:00.000Z";
const SAMPLE: CollectedPosting[] = [
  { id: "sample:x:1", provider: "sample", board: "x", title: "Data Analyst", organisation: "Acme", location: "KL", url: "https://x/1", publishedAt: "2026-09-01T00:00:00.000Z", updatedAt: "", text: "We need SQL and Python. Dashboards are a plus. Communicate with stakeholders weekly.", retrievedAt: RETRIEVED },
  { id: "sample:x:2", provider: "sample", board: "x", title: "Data Analyst, Intern", organisation: "Acme", location: "Toronto", url: "https://x/2", publishedAt: "2026-10-01T00:00:00.000Z", updatedAt: "", text: "Build dashboards for stakeholders. SQL required. Unique intern text.", retrievedAt: RETRIEVED },
];
const loader = async (_run: Pick<CollectRun, "query">) => ({ ok: true as const, postings: SAMPLE, retrievedAt: RETRIEVED, cached: false, total: 2, label: "Test sample" });
const step = (subjectId: string, id: CourseStep, state: AppState = getState()) => loopState(state, subjectId).steps.find((s) => s.id === id)!;
const doneSteps = (subjectId: string, state: AppState = getState()) => loopState(state, subjectId).steps.filter((s) => s.done).map((s) => s.id);
const name = (id: string) => getState().people.find((p) => p.id === id)?.name ?? id;
const sources = (subjectId: string) => getState().evidenceSources.filter((s) => s.subjectId === subjectId).map((s) => s.id);
/** The proofs run on the pinned clock, so every record shares one time; a moment a day either side is built by hand. */
const DAY = 86_400_000;
const LATER = new Date(Date.parse(SEED_NOW) + DAY).toISOString();
const EARLIER = new Date(Date.parse(SEED_NOW) - DAY).toISOString();

async function evidence(subjectId: string, outcomeId: string) {
  assert.equal((await runCollection(subjectId, { provider: "sample", board: "", query: "", inText: false }, loader)).ok, true);
  assert.equal(importCollectedPostings(subjectId, ["sample:x:1", "sample:x:2"]).ok, true);
  assert.equal(setSourcesReviewed(subjectId, sources(subjectId), true).ok, true);
  setSkillLexicon(subjectId, ["SQL", "dashboards|dashboard"]); scanForRequirements(subjectId); confirmProposals(subjectId, getState().scanProposals);
  assert.equal(setSkillMapping(subjectId, { skill: "dashboards", cloIds: [outcomeId], stage: "introduced", target: "practised", evidence: "Week 6 lab covers charts." }).ok, true);
}

function adoptRevision(subjectId: string, term: string) {
  const started = startCurriculumRevision(subjectId);
  assert.equal(started.ok, true);
  const draft = getState().curriculumDrafts.find((d) => d.id === started.draftId)!;
  const definition = structuredClone(draft.definition);
  definition.outcomes[0].text = definition.outcomes[0].text + " that answer a stakeholder's question";
  assert.equal(saveCurriculumRevision(draft.id, draft.revision, { definition, reason: "Add the dashboard lab the decision asked for.", effectiveTerm: term }).ok, true);
  const saved = getState().curriculumDrafts.find((d) => d.id === draft.id)!;
  assert.equal(checkCurriculumRevision(saved.id, saved.revision).ok, true);
  return saved;
}

const dashboardLab = { week: 6, topic: "Dashboard lab", minutes: 90, cloIds: ["CLO5"], activity: "Build a dashboard in pairs.", learningCheck: "Explain one design choice.", resources: "", status: "ready" as const };

/** One full loop on CS310: Ms Tan watches, reports and briefs; Dr Sobri, the coordinator, decides and adopts. */
async function closedLoop() {
  resetDemoState(); login(PEOPLE_IDS.tan);
  await evidence("CS310", "CLO5");
  const briefId = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard lab in week 6." }).briefId!;
  assert.equal(sendEvidenceBrief(briefId, [PEOPLE_IDS.sobri, PEOPLE_IDS.rahman]).ok, true);
  login(PEOPLE_IDS.sobri);
  assert.equal(recordDecision(briefId, "adopt", "Add the dashboard lab; it fits the hours.").ok, true);
  const saved = adoptRevision("CS310", "2026-S2");
  assert.equal(adoptCurriculumRevision(saved.id, saved.revision, true).ok, true);
  assert.equal(saveTeachingSession("CS310", dashboardLab).ok, true);
  uploadResults("CS310");
  return briefId;
}

test("the ring marks a step done only when its record exists, seeded data never counts, and the next step is the first one not done", async () => {
  resetDemoState(); login(PEOPLE_IDS.tan);
  const unknown = loopState(getState(), "ZZ999");
  assert.equal(unknown.steps[0].done, false, "an unknown course id is not an open course");
  assert.equal(unknown.next, "course");
  assert.deepEqual(doneSteps("CS310"), ["course"], "a seeded course with an outcome is open, and nothing else is done");
  assert.equal(loopState(getState(), "CS310").next, "watch");
  assert.ok(getState().resultUploads.some((u) => u.subjectId === "CS220"));
  assert.equal(step("CS220", "learn").done, false, "the seeded results file is an example, not this term's results");

  await runCollection("CS310", { provider: "sample", board: "", query: "", inText: false }, loader);
  assert.equal(step("CS310", "watch").done, false, "fetching alone keeps nothing");
  importCollectedPostings("CS310", ["sample:x:1", "sample:x:2"]);
  assert.equal(step("CS310", "watch").done, false, "a kept posting nobody has reviewed is not evidence yet");
  setSkillLexicon("CS310", ["SQL", "dashboards|dashboard"]); scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
  assert.ok(getState().skillMentions.some((m) => m.subjectId === "CS310"));
  setSourcesReviewed("CS310", sources("CS310"), true);
  assert.equal(step("CS310", "watch").done, true);
  assert.equal(step("CS310", "report").done, false, "quoted and reviewed, but nothing mapped and no brief");
  setSkillMapping("CS310", { skill: "dashboards", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 6 lab covers charts." });
  assert.equal(step("CS310", "report").done, false, "mapped, but no brief prepared");
  const briefId = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard lab in week 6." }).briefId!;
  assert.equal(step("CS310", "report").done, true);
  const s = getState();
  const staleMapping = { ...s, skillMappings: s.skillMappings.map((m) => (m.subjectId === "CS310" ? { ...m, cloIds: ["CLO-GONE"] } : m)) };
  assert.equal(step("CS310", "report", staleMapping).done, false, "a mapping must reach an outcome the course still has");
  assert.equal(loopState(getState(), "CS310").next, "decide");
  assert.equal(step("CS310", "decide").count, "0 decisions");

  assert.equal(recordDecision(briefId, "adopt", "Agreed.").ok, false, "a lecturer briefs but does not decide");
  sendEvidenceBrief(briefId, [PEOPLE_IDS.sobri, PEOPLE_IDS.rahman]);
  login(PEOPLE_IDS.sobri);
  assert.equal(recordDecision(briefId, "adopt", "   ").ok, false, "the reason is required");
  const early = adoptRevision("CS310", "2026-S2");
  const beforeDecision = { ...getState(), curriculumDrafts: getState().curriculumDrafts.map((d) => (d.id === early.id ? { ...d, history: [...d.history, { at: EARLIER, byPersonId: PEOPLE_IDS.sobri, action: "adopted" as const, note: "Adopted before any decision.", revision: d.revision }] } : d)) };
  assert.equal(recordDecision(briefId, "adopt", "Add the dashboard lab; it fits the hours.").ok, true);
  assert.equal(step("CS310", "decide").done, true);
  assert.equal(step("CS310", "update").done, false, "the decision is recorded, the change is not made yet");
  const decidedLater = { ...beforeDecision, briefDecisions: getState().briefDecisions, events: getState().events };
  assert.equal(step("CS310", "update", decidedLater).done, false, "a revision adopted before the decision is not this decision's update");
  assert.equal(adoptCurriculumRevision(early.id, early.revision, true).ok, true);
  assert.equal(step("CS310", "update").done, true);
  assert.equal(step("CS310", "update").count, "1 adopted version");

  assert.equal(saveTeachingSession("CS310", { week: 2, topic: "Orientation", minutes: 60, cloIds: [], activity: "", learningCheck: "", resources: "", status: "draft" }).ok, true);
  assert.equal(step("CS310", "teach").done, false, "a session with no outcome is not a planned class");
  assert.equal(saveTeachingSession("CS310", dashboardLab).ok, true);
  assert.equal(step("CS310", "teach").done, true);
  const t = getState();
  const staleSession = { ...t, teachingPlans: t.teachingPlans.map((p) => (p.subjectId === "CS310" ? { ...p, sessions: p.sessions.map((x) => ({ ...x, cloIds: ["CLO-GONE"] })) } : p)) };
  assert.equal(step("CS310", "teach", staleSession).done, false, "a session counts only when its outcome is current");

  assert.equal(step("CS310", "learn").done, false);
  uploadResults("CS310");
  assert.equal(step("CS310", "learn").done, true);
  const loop = loopState(getState(), "CS310");
  assert.equal(loop.closed, true); assert.equal(loop.next, null);
  assert.equal(loop.window.term, "2026-S2", "the term is the adopted version's effective term until the teaching plan states one");
  assert.equal(loop.summary, "Loop closed for 2026-S2: 2 postings reviewed, 1 decision, 1 version, 2 sessions.");
  for (const word of ["approved", "ready", "good"]) assert.ok(!loop.summary.toLowerCase().includes(word), "the summary never says " + word);
});

test("a decision is a record: the author cannot decide alone, amendments are new records, retain closes Update and return reopens Report", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  await evidence("CS310", "CLO5");
  const b1 = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard lab." }).briefId!;
  assert.equal(recordDecision(b1, "adopt", "I recommend the lab.").ok, true);
  let loop = loopState(getState(), "CS310");
  assert.equal(loop.decision!.status, "self-recorded");
  assert.equal(step("CS310", "decide").done, false, "the author's own decision leaves the step open");
  assert.equal(step("CS310", "decide").note, "Decision recorded by the author; a second person's confirmation is open");
  assert.match(getState().toast ?? "", /self-recorded/);
  assert.equal(decisionStatusText(loop.decision!, name, false), "Decision recorded by the author; a second person's confirmation is open.");

  login(PEOPLE_IDS.rahman);
  assert.equal(recordDecision(b1, "adopt", "Yes.").ok, false, "the programme owner decides only on a brief sent to him");
  login(PEOPLE_IDS.sobri);
  assert.equal(sendEvidenceBrief(b1, [PEOPLE_IDS.rahman, PEOPLE_IDS.tan]).ok, true);
  login(PEOPLE_IDS.tan);
  assert.equal(recordDecision(b1, "adopt", "Yes.").ok, false, "a lecturer receives the brief but does not decide");
  login(PEOPLE_IDS.lim);
  assert.equal(recordDecision(b1, "adopt", "Yes.").ok, false, "management has no part in the loop");

  login(PEOPLE_IDS.rahman);
  const arrived = getState().notifications.find((n) => n.kind === "evidence-brief" && n.toPersonId === PEOPLE_IDS.rahman && n.briefId === b1)!;
  openNotification(arrived.id); openNotification(arrived.id);
  assert.equal(getState().events.filter((e) => e.kind === "brief-read" && e.byPersonId === PEOPLE_IDS.rahman && e.refs.briefId === b1).length, 1, "a brief is read once");
  assert.equal(recordDecision(b1, "maybe" as DecisionOutcome, "Unsure.").ok, false);
  assert.equal(recordDecision(b1, "defer", "x".repeat(2001)).ok, false);
  assert.equal(recordDecision(b1, "defer", "Wait for the committee on 4 November.").ok, true);
  assert.equal(step("CS310", "decide").done, false);
  assert.equal(step("CS310", "decide").note, "Deferred; the step stays open");

  const first = structuredClone(getState().briefDecisions.find((d) => d.byPersonId === PEOPLE_IDS.rahman)!);
  assert.equal(recordDecision(b1, "retain", "The committee keeps the course as it is this term.").ok, true);
  assert.deepEqual(getState().briefDecisions.find((d) => d.id === first.id), first, "an amendment never edits the earlier record");
  loop = loopState(getState(), "CS310");
  assert.equal(loop.decision!.records.length, 3); assert.equal(loop.decision!.standing.length, 2);
  assert.equal(loop.decision!.governing!.outcome, "retain"); assert.equal(loop.decision!.governing!.byPersonId, PEOPLE_IDS.rahman);
  assert.equal(loop.decision!.governing!.courseVersionId, getState().subjects.find((x) => x.id === "CS310")!.currentVersionId, "bound to the course version");
  assert.equal(step("CS310", "decide").done, true);
  assert.equal(step("CS310", "update").done, true, "retain is a completed outcome");
  assert.equal(step("CS310", "update").count, "no change this term");
  const r = getState(), lab = r.curriculumDrafts;
  const adoptedAnyway = { ...r, curriculumDrafts: [...lab, { ...structuredClone(r.curriculumDrafts[0] ?? { id: "REV-x", subjectId: "CS310", history: [] }), id: "REV-anyway", subjectId: "CS310", status: "adopted" as const,
    history: [{ at: LATER, byPersonId: PEOPLE_IDS.sobri, action: "adopted" as const, note: "Adopted after the retain decision.", revision: 1 }] }] } as AppState;
  assert.equal(step("CS310", "update", adoptedAnyway).count, "1 version adopted after a retain decision", "never 'no change' once a version was adopted after it");
  assert.equal(loopState(adoptedAnyway, "CS310").adoptedSinceDecision, 1);
  assert.equal(decisionStatusText(loop.decision!, name, false), "Retain the course as it is, recorded by Dr Rahman; the author's self-recorded adopt stays on record.");
  const atDecision = getState(), standing = loop.decision!.governing!;
  assert.equal(evidenceChangedAt("CS310", atDecision.evidenceSources, atDecision.skillMentions, atDecision.skillMappings) > standing.at, false, "nothing changed after the decision");
  const quotedLater = atDecision.skillMentions.map((m, i) => (i === 0 ? { ...m, addedAt: LATER } : m));
  assert.ok(evidenceChangedAt("CS310", atDecision.evidenceSources, quotedLater, atDecision.skillMappings) > standing.at, "a quotation confirmed after the decision marks it: evidence changed since");

  login(PEOPLE_IDS.sobri);
  const told = getState().notifications.find((n) => n.kind === "brief-decision" && n.toPersonId === PEOPLE_IDS.sobri)!;
  assert.ok(told, "the author hears about a decision on their brief");
  openNotification(told.id);
  assert.equal(getState().screen, "decide"); assert.equal(getState().courseStep, "decide"); assert.equal(getState().selectedSubjectId, "CS310");

  login(PEOPLE_IDS.rahman);
  assert.equal(recordDecision(b1, "return", "Quote the stakeholder requirement before we decide.").ok, true);
  assert.equal(step("CS310", "report").done, false, "return sends the brief back to Report");
  assert.equal(step("CS310", "report").note, "Returned by the decision; prepare a new brief");
  assert.equal(step("CS310", "decide").done, false); assert.equal(step("CS310", "decide").note, "Returned to Report");
  assert.equal(step("CS310", "update").done, false);

  login(PEOPLE_IDS.sobri);
  const b2 = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "The stakeholder requirement is now quoted." }).briefId!;
  const s = getState();
  const old = briefDecisionState(s.evidenceBriefs.find((b) => b.id === b1)!, s.evidenceBriefs, s.briefDecisions, false);
  assert.equal(old.supersededBy?.id, b2, "a newer brief for the course supersedes the older one, even at the same recorded time");
  assert.match(decisionStatusText(old, name, false), new RegExp("^Superseded by the newer brief of " + SEED_NOW.slice(0, 10) + "; its decisions stay on record\\.$"));
  login(PEOPLE_IDS.rahman);
  assert.equal(recordDecision(b1, "adopt", "Go ahead.").ok, false, "decisions go on the latest brief");
  assert.equal(getState().briefDecisions.filter((d) => d.briefId === b1).length, 4, "the older brief's decisions stay on record");
  loop = loopState(getState(), "CS310");
  assert.equal(loop.latestBrief!.id, b2);
  assert.equal(step("CS310", "report").done, true); assert.equal(step("CS310", "decide").done, false);
});

test("on a single-owner course the owner's own decision governs, and the summary says so", async () => {
  resetDemoState(); login(PEOPLE_IDS.tan);
  assert.equal(createCourseWorkspace({ code: "BUS205", title: "Financial Planning", programmeTitle: "Business Studies", year: 2, semester: 1 }).ok, true);
  assert.equal(step("BUS205", "course").done, false, "a course with no outcome is not open yet");
  const draft = getState().curriculumDrafts.find((d) => d.subjectId === "BUS205")!;
  const definition: CourseDefinition = { ...structuredClone(draft.definition),
    brief: { ...draft.definition.brief, teachingWeeks: 12, contactHours: 8, selfStudyHours: 12, programmeOutcomes: ["PLO1"] },
    outcomes: [{ id: "BUS205-outcome-1", subjectId: "BUS205", label: "CLO1", text: "Prepare and justify a cash-flow plan for a small business.", bloomLevel: "Apply", assessmentEvidence: "Worked cash-flow case and explanation rubric.", ploIds: ["PLO1"] }],
    topics: [{ id: "BUS205-topic-1", title: "Cash-flow foundations", week: 1, contactHours: 3, selfStudyHours: 4, cloIds: ["BUS205-outcome-1"], prerequisiteTopicIds: [], protected: true, resources: "Lecturer-selected case material." }] };
  assert.equal(saveCurriculumRevision(draft.id, draft.revision, { definition, reason: "State the first outcome.", effectiveTerm: "2026-S2" }).ok, true);
  const saved = getState().curriculumDrafts.find((d) => d.id === draft.id)!;
  assert.equal(checkCurriculumRevision(saved.id, saved.revision).ok, true);
  assert.equal(adoptCurriculumRevision(saved.id, saved.revision, true).ok, true, "the owner of a personal course adopts");
  assert.deepEqual(doneSteps("BUS205"), ["course"], "the first outline opens the course; it is not this term's update");

  await evidence("BUS205", "BUS205-outcome-1");
  const briefId = prepareEvidenceBrief("BUS205", { recommendation: "keep", notes: "The case activity already covers it." }).briefId!;
  assert.equal(recordDecision(briefId, "retain", "Keep the course as it is this term.").ok, true);
  const loop = loopState(getState(), "BUS205");
  assert.equal(loop.singleOwner, true); assert.equal(loop.decision!.status, "decided");
  assert.equal(decisionStatusText(loop.decision!, name, true), "Retain the course as it is, recorded by the author on a single-owner course.");
  assert.equal(saveTeachingSession("BUS205", { week: 1, topic: "Cash-flow case", minutes: 90, cloIds: ["BUS205-outcome-1"], activity: "Plan a cash flow in pairs.", learningCheck: "Justify one assumption.", resources: "", status: "ready" }).ok, true);
  uploadResults("BUS205");
  const closed = loopState(getState(), "BUS205");
  assert.equal(closed.closed, true);
  assert.equal(closed.summary, "Loop closed for 2026-S2: 2 postings reviewed, 1 decision, no change to the outline, 1 session. Closed on the author's own decision: this is a single-owner course.");
});

test("a new term restarts the loop, a first term keeps the work, and last term's loop never certifies the new one", async () => {
  const briefId = await closedLoop();
  assert.equal(loopState(getState(), "CS310").closed, true);
  assert.equal(saveTeachingPlanDetails("CS310", { term: "2026-S2", notes: "" }).ok, true);
  const firstTerm = getState().events.filter((e) => e.kind === "term-set").at(-1)!;
  assert.equal(firstTerm.refs.term, "2026-S2"); assert.equal(firstTerm.refs.previousTerm, undefined);
  assert.equal(termWindow(getState(), "CS310").since, "", "stating a term for the first time keeps the work already done");
  assert.equal(loopState(getState(), "CS310").closed, true);

  assert.equal(saveTeachingPlanDetails("CS310", { term: "2027-S1", notes: "" }).ok, true);
  const change = getState().events.filter((e) => e.kind === "term-set").at(-1)!;
  assert.equal(change.refs.term, "2027-S1"); assert.equal(change.refs.previousTerm, "2026-S2");
  assert.equal(termWindow(getState(), "CS310").term, "2027-S1", "the teaching plan's term leads");
  const s = getState();
  const nextTerm = { ...s, events: s.events.map((e) => (e.id === change.id ? { ...e, at: LATER } : e)) };
  const fresh = loopState(nextTerm, "CS310");
  assert.deepEqual(fresh.steps.filter((x) => x.done).map((x) => x.id), ["course"], "last term's records do not count in the new term");
  assert.equal(fresh.latestBrief, null); assert.equal(fresh.steps.find((x) => x.id === "decide")!.count, "no brief yet");
  assert.equal(fresh.summary, "1 of 7 done for 2027-S1. Next: Watch.");
  const recap = runTimeline(nextTerm, "CS310");
  assert.ok(recap.some((e) => e.role === "people" && e.title.startsWith("Adopt the change, recorded by Dr Sobri")), "last term's decision stays on the record");
  assert.ok(recap.some((e) => e.title === "Teaching term set to 2027-S1" && e.detail === "Was 2026-S2; a new loop starts for the new term"));
  const records = getState().briefDecisions.filter((d) => d.briefId === briefId);
  assert.equal(records[0].term, "", "decided before any term was stated, and it says so");
  assert.equal(recordDecision(briefId, "adopt", "Confirmed for the stated term.").ok, true);
  assert.equal(getState().briefDecisions.at(-1)!.term, "2027-S1", "a decision carries the term it was made in");
});

test("the timeline reads the event log first, labels derived lines, and the log only grows", async () => {
  resetDemoState(); login(PEOPLE_IDS.tan);
  assert.deepEqual(runTimeline(getState(), null), []);
  assert.deepEqual(runTimeline(getState(), "ZZ999"), [], "a course with no records has no timeline");
  await evidence("CS310", "CLO5");
  assert.equal(takeEvidenceSnapshot("CS310", "Before the brief").ok, true);
  const briefId = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard lab in week 6." }).briefId!;
  sendEvidenceBrief(briefId, [PEOPLE_IDS.sobri]);
  login(PEOPLE_IDS.sobri);
  openNotification(getState().notifications.find((n) => n.kind === "evidence-brief" && n.toPersonId === PEOPLE_IDS.sobri)!.id);
  const logged = structuredClone(getState().events);
  recordDecision(briefId, "adopt", "Add the dashboard lab; it fits the hours.");
  const saved = adoptRevision("CS310", "2026-S2");
  adoptCurriculumRevision(saved.id, saved.revision, true);
  saveTeachingSession("CS310", dashboardLab);
  assert.deepEqual(getState().events.slice(0, logged.length), logged, "earlier events are never edited or removed");
  assert.deepEqual(getState().events.map((e) => e.kind), ["snapshot-frozen", "brief-prepared", "brief-sent", "brief-read", "decision-recorded", "version-adopted"]);

  const events = runTimeline(getState(), "CS310");
  for (let i = 1; i < events.length; i += 1) assert.ok(events[i - 1].at <= events[i].at, "events are in time order");
  for (const e of events) assert.ok(e.at && e.title && e.detail, "every line has a time, a title and a detail");
  const recorded = events.filter((e) => !e.derived).map((e) => e.title);
  assert.deepEqual(recorded, ["Evidence snapshot frozen: Before the brief", "Meeting brief prepared", "Brief sent to Dr Sobri", "Brief read by Dr Sobri",
    "Adopt the change, recorded by Dr Sobri", "Version adopted: " + getState().subjects.find((x) => x.id === "CS310")!.currentVersionId]);
  for (let i = 1; i < events.length; i += 1)
    if (events[i].at === events[i - 1].at) assert.ok(!(events[i - 1].derived && !events[i].derived), "at one moment, recorded lines come before derived ones");
  assert.equal(events.filter((e) => e.title === "Meeting brief prepared").length, 1, "a brief with an event is not also derived");
  assert.equal(events.filter((e) => e.title.startsWith("Version adopted")).length, 1, "an adoption with an event is not also derived");
  const scout = events.find((e) => e.role === "scout" && e.derived)!;
  assert.ok(scout.title.startsWith("Imported from the dated saved sample, 2 postings kept"), scout.title);
  const count = events.find((e) => e.role === "lens")!;
  assert.ok(count.derived && count.title.startsWith("Current count over 2 reviewed postings") && count.detail.endsWith("The count as the records stand now."));
  const quotations = events.find((e) => e.role === "atlas" && e.title.includes("exact quotations confirmed"))!;
  assert.equal(quotations.at, getState().skillMentions.filter((m) => m.subjectId === "CS310").map((m) => m.addedAt).sort()[0], "a quotation group carries its first quotation's time");
  assert.ok(events.some((e) => e.role === "atlas" && e.title === "Mapped dashboards to CLO5" && e.derived));
  assert.ok(events.some((e) => e.role === "prism" && e.title === "Session saved: week 6, Dashboard lab" && e.derived));
  assert.ok(!events.some((e) => e.title.startsWith("Fetched live")), "nothing was fetched live, so nothing says so");

  removeEvidenceSnapshot(getState().evidenceSnapshots[0].id);
  const kept = runTimeline(getState(), "CS310").find((e) => e.title === "Evidence snapshot frozen")!;
  assert.equal(kept.detail, "The snapshot was later removed; its event stays");
});

test("Learn counts a term's results only when they are matched to the version taught, and says what it cannot claim", async () => {
  await closedLoop();
  const s = getState();
  const taught = taughtVersionId(s, "CS310")!;
  assert.equal(taught, s.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.at(-1)!.courseVersionId, "the version the term's sessions were saved on");
  const upload = s.resultUploads.find((u) => u.subjectId === "CS310")!;
  assert.equal(upload.courseVersionId, taught, "filed results are bound to the version taught");
  assert.equal(step("CS310", "learn").done, true);
  const unmatched = { ...s, resultUploads: s.resultUploads.map((u) => (u.id === upload.id ? { ...u, courseVersionId: undefined } : u)) };
  assert.equal(step("CS310", "learn", unmatched).done, false, "results with no course version do not count");
  assert.match(step("CS310", "learn", unmatched).note ?? "", /without a course version/);
  const foreign = { ...s, resultUploads: s.resultUploads.map((u) => (u.id === upload.id ? { ...u, courseVersionId: "CS220-v1" } : u)) };
  assert.equal(step("CS310", "learn", foreign).done, false, "a version of another course does not count");
  const raw = JSON.parse(exportWorkspaceBackup());
  raw.data.resultUploads.find((u: { id: string }) => u.id === upload.id).courseVersionId = "CS220-v1";
  assert.equal(parseWorkspaceBackup(JSON.stringify(raw), s.people.map((p) => p.id)).ok, false, "a backup cannot bind results to another course's version");

  // The real intake: the person filing confirms the version; another course's version is refused.
  const doc = { fileName: "CS310-results.xlsx", kind: "xlsx" as const, pages: [], tables: [] };
  stagePendingIntake(doc, { docType: "results", subjectGuess: "CS310", termGuess: "2026-S2", mappedRows: [{ cloId: "CLO5", meanScore: 0.62, sd: 0.12, n: 42 }, { cloId: "CLO4", meanScore: 0.5, sd: 0.1, n: 45 }], confidence: 0.9, notes: [], courseVersionId: "CS220-v1" });
  assert.equal(confirmPendingIntake(), null, "another course's version is refused");
  stagePendingIntake(doc, { docType: "results", subjectGuess: "CS310", termGuess: "2026-S2", mappedRows: [{ cloId: "CLO5", meanScore: 0.62, sd: 0.12, n: 42 }, { cloId: "CLO4", meanScore: 0.5, sd: 0.1, n: 45 }], confidence: 0.9, notes: [] });
  const filedId = confirmPendingIntake()!;
  const filed = getState().resultUploads.find((u) => u.id === filedId)!;
  assert.equal(filed.courseVersionId, taught, "with no choice made, the version taught");
  const { N, rows } = attainment(filed, getState().clos.filter((c) => c.subjectId === "CS310"));
  assert.equal(N, 45, "N is the most students the file records for any one outcome");
  assert.deepEqual(rows.map((r) => [r.cloId, r.n, Boolean(r.clo)]), [["CLO5", 42, true], ["CLO4", 45, false]], "a row for an outcome the course does not have is kept and shown as such");
  assert.equal(LEARN_CLAIM, "No learning gain is claimed; the benchmark has not been run.", "the sentence of plan Section 9.8");
});

test("the ring prints the term on at most two lines that fit inside it", () => {
  assert.deepEqual(ringTermLines("2026-S2", 12), ["2026-S2"]);
  assert.deepEqual(ringTermLines("Term not set", 12), ["Term not set"]);
  assert.deepEqual(ringTermLines("2026/2027 semester 1", 12), ["2026/2027", "semester 1"]);
  for (const term of ["2026/2027 semester 1 intake A", "Semester1of2026and2027", "a b c d e f g h i j k l m n"]) {
    const lines = ringTermLines(term, 12);
    assert.ok(lines.length <= 2 && lines.every((l) => l.length <= 12), term + ": " + JSON.stringify(lines));
  }
});

test("each step has one address, the Report sub-step lives in the URL, and a bad path opens nothing", () => {
  const courseOf = (hash: string) => { const route = parseRoute(hash); assert.ok(route && "course" in route, hash); return route.course; };
  assert.deepEqual(parseRoute("#/course/CS310"), { course: { subjectId: "CS310", step: "course" } });
  assert.deepEqual(parseRoute("#/course/CS310/course"), { course: { subjectId: "CS310", step: "course" } }, "the long form still opens the course");
  for (const step of LOOP_STEPS) {
    const def = stepDef(step.id);
    const routeState = { screen: def.screen, courseStep: step.id, selectedSubjectId: "CS310", studioTab: def.tab ?? "overview", reportTab: "map" as const };
    const hash = hashFor(routeState);
    assert.equal(hash, step.id === "course" ? "#/course/CS310" : step.id === "report" ? "#/course/CS310/report/map" : "#/course/CS310/" + step.id);
    assert.equal(courseOf(hash).step, step.id, hash);
  }
  for (const tab of REPORT_TABS) assert.equal(courseOf("#/course/CS310/report/" + tab).reportTab, tab);
  for (const bad of ["#/course/CS310/report/nope", "#/course/CS310/decide/quote", "#/course/CS310/grades", "#/nowhere"]) assert.equal(parseRoute(bad), null, bad);
  assert.equal(courseOf("#/course/BUS%20205/watch").subjectId, "BUS 205");
});

test("every landing figure is in the claims register with its source, and every quoted clause is word for word in its note", () => {
  const claims = readFileSync(new URL("../docs/claims.md", import.meta.url), "utf8");
  const note = (file: string) => readFileSync(new URL("../docs/research/" + file, import.meta.url), "utf8");
  const row = (id: string) => claims.split("\n").find((line) => line.startsWith("| `" + id + "` |"));
  const dash = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
  assert.deepEqual(PAIN_STATS.map((s) => s.scope), ["World", "Asia", "Malaysia"], "the problem at three levels, one comparison each");
  for (const s of PAIN_STATS) {
    const r = row(s.claim);
    assert.ok(r, s.claim + " is registered in docs/claims.md");
    assert.ok(r.includes(s.value), s.claim + " carries its figure");
    for (const src of s.sources) { assert.ok(src.url.startsWith("https://"), src.url); assert.ok(r.includes(src.url), src.url + " is the registered link"); }
    assert.ok(!dash.test(s.label + s.sources.map((x) => x.name).join(" ")), "no dashes");
  }
  assert.ok(note("curriculum-latency-global-2026-10-22.md").includes("two-fifths (39%)"), "the WEF figure is in its note");
  assert.ok(note("curriculum-latency-global-2026-10-22.md").includes("twelve to eighteen months"), "the approval time is in its note");
  assert.ok(note("pain-and-market-2026-10-11.md").includes("77% of 10,095 Asia Pacific employers"), "the ManpowerGroup figure is in its note");
  assert.ok(note("pain-and-market-2026-10-11.md").includes("32.2%; 1.60 million"), "the DOSM figure is in its note");
  assert.ok(PAIN_STATS.find((s) => s.scope === "Asia")!.vendor, "the vendor survey says so");
  for (const p of PROOF) { const r = row(p.claim); assert.ok(r && r.includes("| " + p.value + " |"), p.claim + " is registered with its figure"); }
  assert.ok(row("tour-length")?.includes("| about " + tourMinutes() + " minutes |"), "the tour's stated length is the one the script computes");
  assert.equal(PROOF.find((p) => p.claim === "proof-checks")!.value, String(SUITE_TOTAL), "the landing's check count is the Evaluation table's total");
  for (const step of ACCREDITOR_MAPPING) for (const c of step.clauses) {
    assert.ok(c.url.startsWith("https://") && claims.includes(c.url), c.body + " has its link registered");
    const file = c.note.split(",")[0].split(" (")[0];
    if (!c.paraphrase) assert.ok(note(file).includes(c.quote), c.body + " is quoted word for word from " + file);
  }
  assert.deepEqual(ACCREDITOR_MAPPING.map((m) => m.step), ["Watch", "Report", "Decide", "Update", "Teach", "Learn"], "the six steps, in order");
});
