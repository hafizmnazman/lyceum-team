// Proof: attainment against a stated threshold (depth plan Section 8). The direct line against a hand-computed fixture
// with missing marks; the census rule and the finite population correction; the recomputation after a change to the pass
// mark, and the saved report that keeps the threshold it was printed with; the survey beside the marks as a second construct,
// never averaged, booth responses never counted; the programme outcomes listed with no index; the intake's marks without an
// identifier and the pass mark at filing; the CQI note; Lens's moods; and backups.
//
// Run with:  node --test src/prove-attainment.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { parseSheet } from "../server/parse/sheet.ts";
import { interpretLocally } from "./agents/intakeLocal.ts";
import { moodsFor } from "./app/moods.ts";
import { recapFor } from "./app/recap.ts";
import { collectBoothResponses, confirmPendingIntake, exportWorkspaceBackup, getState, login, obeReportFor, openSurveyForCollection, createCourseSurveys, resetDemoState,
  saveCqiNote, saveInstitutionProfile, saveObeReport, saveTeachingPlanDetails, stagePendingIntake } from "./app/store.ts";
import { DEMO_PLOS, CS310_BEFORE } from "./data/sample-course/cs310.ts";
import { RESULTS_PRIOR } from "./data/sample-course/results.ts";
import { PRIOR_COS, PRIOR_SURVEY_RESPONSES } from "./data/sample-course/surveys.ts";
import { DEMO_INSTITUTION } from "./data/institution.ts";
import { PEOPLE, PEOPLE_IDS, SEED_RESULT_UPLOADS } from "./data/seed.ts";
import { NOT_FILED, directRows, directSentence, finiteWilson, indirectFor, listedStudents, ploListing } from "./lib/attainment.ts";
import { wilsonInterval } from "./lib/evidence.ts";
import { parseWorkspaceBackup } from "./lib/workspaceBackup.ts";
import type { CLO, ResultUpload, SurveyResponse } from "./types.ts";

const TERM = "2026/2027 semester 1";
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// Ten students listed. A: eight with a mark, two without; B: all ten (a census).
const FIXTURE: ResultUpload = { id: "RU-FIX", subjectId: "CS310", uploadedBy: PEOPLE_IDS.sobri, term: TERM, filedAt: "2026-10-22T09:00:00Z", rows: [
  { cloId: "A", meanScore: 0.6275, sd: 0.1455, n: 8, marks: [40, 50, 55, 60, 62, 70, 75, 90], missing: 2, passMarkAtFiling: 55 },
  { cloId: "B", meanScore: 0.624, sd: 0.18, n: 10, marks: [30, 45, 55, 56, 60, 61, 70, 72, 80, 95], missing: 0, passMarkAtFiling: 55 },
] };
const FIXTURE_CLOS: CLO[] = [{ id: "A", subjectId: "CS310", label: "CLO-A", text: "Outcome A", bloomLevel: "Apply" }, { id: "B", subjectId: "CS310", label: "CLO-B", text: "Outcome B", bloomLevel: "Apply" }];

/** File the sample results file through the real parser, the local intake and the store, as the tour does. */
function fileSampleResults() {
  const doc = parseSheet(readFileSync("public/demo/results.xlsx"), "results.xlsx", "xlsx");
  stagePendingIntake({ ...doc, sample: true }, { ...interpretLocally(doc, getState().subjects, getState().clos), termGuess: TERM });
  return confirmPendingIntake();
}

test("the direct line against a hand-computed fixture: n of N stated, the share over n, an interval only below N", () => {
  assert.equal(listedStudents(FIXTURE), 10, "N is the students listed: those with a mark and those without");
  const [a, b] = directRows(FIXTURE, FIXTURE_CLOS, 55, 0.5);
  // A: 55, 60, 62, 70, 75 and 90 are at or above 55: 6 of the 8 with a mark; the mean 502 / 8.
  assert.deepEqual([a.N, a.n, a.missing, a.atOrAbove, a.share, a.kpiMet, a.mean], [10, 8, 2, 6, 0.75, true, 62.75]);
  assert.ok(near(a.sd!, 14.549485), "the spread, population form, as the intake computes it: " + a.sd);
  // Wilson for 6 of 8 (centre 0.668898, half-width 0.259623), the half-width times sqrt(2 / 9) = 0.471405.
  assert.ok(a.interval && near(a.interval.low, 0.546511) && near(a.interval.high, 0.791285), "the finite-population interval: " + JSON.stringify(a.interval));
  // B: every listed student has a mark, so the share is the cohort's and has no interval.
  assert.deepEqual([b.N, b.n, b.missing, b.atOrAbove, b.share, b.interval], [10, 10, 0, 8, 0.8, null]);
  assert.equal(directSentence(b, 55, 0.5), "CLO-B: 8 of 10 students at 55 or above, 80%; KPI 50% met", "the plan's own shape");
  assert.equal(directSentence(a, 55, 0.5), "CLO-A: 6 of 8 students with a mark (2 of 10 without one) at 55 or above, 75%; KPI 50% met");
});

test("the census rule and the finite population correction", () => {
  assert.equal(finiteWilson(8, 10, 10), null, "a census has no sampling noise to show");
  assert.equal(finiteWilson(0, 0, 10), null, "nothing known, nothing shown");
  const plain = wilsonInterval(6, 8)!;
  assert.ok(near(plain.low, 0.409275) && near(plain.high, 0.928521), "plain Wilson for 6 of 8");
  const vast = finiteWilson(6, 8, 1_000_000_000)!;
  assert.ok(near(vast.low, plain.low, 1e-6) && near(vast.high, plain.high, 1e-6), "as N grows the correction vanishes into plain Wilson");
  const narrow = finiteWilson(6, 8, 10)!;
  assert.ok(narrow.high - narrow.low < plain.high - plain.low, "with two of ten missing the interval is narrower than plain Wilson's");
});

test("a change to the pass mark recomputes from the kept marks, and a saved report keeps the threshold it was printed with", async () => {
  const at60 = directRows(FIXTURE, FIXTURE_CLOS, 60, 0.5);
  assert.deepEqual(at60.map((r) => [r.atOrAbove, r.n]), [[5, 8], [6, 10]], "at 60: 5 of 8 and 6 of 10, from the same marks");
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveTeachingPlanDetails("CS310", { term: TERM, notes: "" }).ok, true);
  assert.equal(saveObeReport("CS310").ok, false, "no results filed for the term, no report");
  assert.ok(fileSampleResults(), "the sample file files");
  assert.equal(saveObeReport("CS310").ok, true);
  const first = getState().obeReports.at(-1)!;
  assert.deepEqual([first.passMark, first.studentShare, first.method, first.term], [55, 0.5, "share-above-mark", TERM]);
  const clo2 = first.direct.find((r) => r.label === "CLO2")!;
  assert.deepEqual([clo2.atOrAbove, clo2.n, clo2.N, clo2.kpiMet], [29, 38, 38, true], "CLO2: 29 of 38 students at 55 or above, 76%; KPI 50% met");
  const clo3 = first.direct.find((r) => r.label === "CLO3")!;
  assert.deepEqual([clo3.atOrAbove, clo3.n, clo3.N, clo3.missing, Boolean(clo3.interval)], [22, 35, 38, 3, true], "CLO3 has three without a mark, so it carries an interval");
  assert.equal(first.direct.find((r) => r.label === "CLO4")!.kpiMet, false, "CLO4 is below the KPI and says so");
  assert.equal(saveInstitutionProfile({ ...getState().institution, kpi: { ...getState().institution.kpi, passMark: 60 } }).ok, true);
  const kept = getState().obeReports.find((r) => r.id === first.id)!;
  assert.deepEqual([kept.passMark, kept.direct.find((r) => r.label === "CLO2")!.atOrAbove], [55, 29], "the saved report keeps what it was printed with");
  const upload = getState().resultUploads.filter((u) => u.subjectId === "CS310" && u.term === TERM).at(-1)!;
  assert.ok(upload.rows.every((r) => r.passMarkAtFiling === 55), "each row keeps the pass mark the profile held at filing");
  const now = obeReportFor(getState(), "CS310", TERM, upload, "2026-10-22T10:00:00Z", PEOPLE_IDS.sobri);
  const marks2 = upload.rows.find((r) => r.cloId === "CS310-2")!.marks!;
  assert.equal(now.passMark, 60);
  assert.equal(now.direct.find((r) => r.label === "CLO2")!.atOrAbove, marks2.filter((m) => m >= 60).length, "a new report recomputes at 60 from the same marks");
  assert.equal(saveObeReport("CS310").ok, true);
  assert.equal(getState().obeReports.at(-1)!.passMark, 60, "and saves at the threshold it was printed with");
  const recap = recapFor(getState(), "CS310", "2026-10-22T11:00:00Z")!;
  assert.deepEqual([recap.obe?.passMark, recap.obe?.rows.find((r) => r.label === "CLO2")?.atOrAbove], [60, now.direct.find((r) => r.label === "CLO2")!.atOrAbove], "the recap reads the latest saved report");
});

test("a row without its marks says the distribution was not filed, and computes nothing from marks it does not hold", () => {
  const older: ResultUpload = { ...FIXTURE, rows: [{ cloId: "A", meanScore: 0.62, sd: 0.1, n: 30 }] };
  const [row] = directRows(older, FIXTURE_CLOS, 55, 0.5);
  assert.deepEqual([row.filed, row.share, row.atOrAbove, row.kpiMet, row.interval, row.mean], [false, null, null, null, null, null]);
  assert.ok(directSentence(row, 55, 0.5).includes(NOT_FILED), "the sentence of Section 8.2");
});

test("the survey sits beside the marks as a second construct, never averaged, and booth responses never count", () => {
  const state = getState();
  const prior = SEED_RESULT_UPLOADS.find((u) => u.subjectId === "CS310")!;
  assert.deepEqual([prior.term, prior.sample, prior.courseVersionId], [RESULTS_PRIOR.term, true, "CS310-v1"], "last term's file is seeded as a labelled sample on version CS310-v1");
  const report = obeReportFor(state, "CS310", prior.term, prior, "2026-10-22T10:00:00Z", PEOPLE_IDS.sobri, "OBE-sample");
  assert.equal(report.surveyId, PRIOR_COS.id, "the term's Course Outcome Survey");
  assert.equal(report.surveyOpen, true, "released, and above its floor");
  // By hand from the sample responses to this survey (the SSRT has a Q5 too): the outcome's item, answers of 4 or 5 over
  // those who chose a point.
  const item = PRIOR_COS.questions.find((q) => q.cloId === "CLO5")!;
  const chose = PRIOR_SURVEY_RESPONSES.filter((r) => r.formId === PRIOR_COS.id).map((r) => r.answers[item.id]).filter((v): v is number => typeof v === "number");
  const ind = report.indirect.find((r) => r.cloId === "CLO5")!;
  assert.deepEqual([ind.n, ind.atTarget], [chose.length, chose.filter((v) => v >= 4).length]);
  assert.ok(report.direct.every((d) => !Object.keys(d).some((k) => /indirect|average|gap|combined/i.test(k))) && !("gap" in report), "no field combines the two");
  const booth: SurveyResponse[] = [1, 2, 3, 4, 5, 6].map((i) => ({ id: "B" + i, formId: PRIOR_COS.id, term: PRIOR_COS.term, answers: { [item.id]: 1 }, collectedAt: "", clientId: "device-0000000" + i, source: "booth" }));
  const without = indirectFor(PRIOR_COS, PRIOR_SURVEY_RESPONSES, DEMO_INSTITUTION, []);
  const withBooth = indirectFor(PRIOR_COS, [...PRIOR_SURVEY_RESPONSES, ...booth], DEMO_INSTITUTION, []);
  assert.deepEqual(withBooth.rows, without.rows, "six booth answers of 1 change nothing");
  assert.equal(withBooth.summary!.respondents, without.summary!.respondents, "nor the count");
});

test("the programme outcomes are listed with their linked course outcomes and strengths, and no index", () => {
  const upload = SEED_RESULT_UPLOADS.find((u) => u.subjectId === "CS310")!;
  const clos = getState().clos.filter((c) => c.subjectId === "CS310");
  const direct = directRows(upload, clos, 55, 0.5);
  const plos = ploListing(CS310_BEFORE.outcomes, DEMO_PLOS, direct);
  const plo2 = plos.find((p) => p.ploId === "PLO2")!;
  assert.deepEqual(plo2.links.map((l) => [l.label, l.level]), [["CLO1", "M"], ["CLO3", "H"], ["CLO4", "H"]], "every course outcome linked to PLO2, with its strength");
  assert.ok(plo2.links.every((l) => l.share === direct.find((d) => d.cloId === l.cloId)!.share), "each with its own direct share");
  assert.ok(plos.every((p) => Object.keys(p).join() === "ploId,text,links"), "no index, no weighted average, no comparison with a PLO target");
  assert.ok(!plos.some((p) => p.ploId === "PLO3" || p.ploId === "PLO8"), "a programme outcome this course does not link is not listed");
});

test("the intake keeps each outcome's marks without an identifier, and the class size is the students listed", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveTeachingPlanDetails("CS310", { term: TERM, notes: "" }).ok, true);
  const id = fileSampleResults()!;
  const upload = getState().resultUploads.find((u) => u.id === id)!;
  assert.deepEqual(upload.rows.map((r) => [r.cloId, r.n, r.missing]), [["CS310-1", 38, 0], ["CS310-2", 38, 0], ["CS310-3", 35, 3], ["CS310-4", 38, 0], ["CLO5", 38, 0]]);
  assert.ok(!/A26\d{3}/.test(JSON.stringify(getState())), "no student identifier anywhere in the workspace");
  assert.equal(createCourseSurveys("CS310").ok, true);
  assert.equal(getState().surveys.find((x) => x.term === TERM && x.kind === "course-outcome")!.classSize, 38, "the class size the surveys start from is the 38 listed, not a column's 35");
});

test("a CQI note is a saved record with its term, version and date, logged for History, and only an assigned person writes it", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveCqiNote("CS310", "More dashboard practice").ok, false, "no term, no note");
  assert.equal(saveTeachingPlanDetails("CS310", { term: TERM, notes: "" }).ok, true);
  assert.equal(saveCqiNote("CS310", "   ").ok, false, "an empty note is refused");
  assert.equal(saveCqiNote("CS310", "Move the critique before the dashboard project; CLO4 sat below the KPI.").ok, true);
  const note = getState().cqiNotes.at(-1)!;
  assert.deepEqual([note.subjectId, note.term, note.byPersonId, Boolean(note.versionId), Boolean(note.at)], ["CS310", TERM, PEOPLE_IDS.sobri, true, true]);
  assert.ok(getState().events.some((e) => e.kind === "cqi-noted" && e.refs.noteId === note.id && e.refs.term === TERM), "History and the timeline read it from the log");
  assert.ok(fileSampleResults());
  assert.equal(saveObeReport("CS310").ok, true);
  assert.equal(getState().obeReports.at(-1)!.cqiNoteId, note.id, "the next saved report carries the note");
  const outsider = PEOPLE.find((p) => !getState().assignments.some((a) => a.personId === p.id && a.subjectId === "CS310"))!;
  login(outsider.id);
  assert.equal(saveCqiNote("CS310", "Not mine to write.").ok, false, "a person not assigned to the course cannot write its note");
});

test("Lens waits while a survey is open and nothing is collected, and shows done after a report or a note", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveTeachingPlanDetails("CS310", { term: TERM, notes: "" }).ok, true);
  assert.equal(createCourseSurveys("CS310").ok, true);
  const cos = getState().surveys.find((x) => x.term === TERM && x.kind === "course-outcome")!;
  const later = Date.parse("2030-01-01T00:00:00Z");
  assert.equal(moodsFor(getState(), [], "CS310", later).helpers.lens, "resting");
  assert.equal((await openSurveyForCollection(cos.id, 38)).ok, true);
  assert.equal(moodsFor(getState(), [], "CS310", later).helpers.lens, "waiting", "the survey is open and nothing is collected");
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ responses: [{ clientId: "device-0000000a", answers: { Q1: 4 } }] }), { status: 200 })) as typeof fetch;
  try { assert.equal((await collectBoothResponses(cos.id)).ok, true); } finally { globalThis.fetch = realFetch; }
  assert.equal(getState().events.at(-1)!.refs.source, "booth", "the collection names its source, so the timeline can say it never counts");
  assert.equal(moodsFor(getState(), [], "CS310", later).helpers.lens, "resting", "collected: no longer waiting");
  assert.equal(saveCqiNote("CS310", "Run the survey in week 13.").ok, true);
  const at = Date.parse(getState().cqiNotes.at(-1)!.at);
  assert.equal(moodsFor(getState(), [], "CS310", at + 1000).helpers.lens, "done", "done just after the note");
  assert.equal(moodsFor(getState(), [], "CS310", at + 60_000).helpers.lens, "resting", "and rests again");
});

test("backups carry the reports and the notes; older backups and rows without marks restore; marks that do not match n are refused", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveTeachingPlanDetails("CS310", { term: TERM, notes: "" }).ok, true);
  assert.ok(fileSampleResults());
  assert.equal(saveCqiNote("CS310", "A note to carry.").ok, true);
  assert.equal(saveObeReport("CS310").ok, true);
  const people = getState().people.map((p) => p.id);
  const raw = exportWorkspaceBackup();
  const parsed = parseWorkspaceBackup(raw, people);
  assert.ok(parsed.ok && parsed.backup.data.obeReports.length === 1 && parsed.backup.data.cqiNotes.length === 1, parsed.ok ? "" : parsed.error);
  const older = JSON.parse(raw);
  delete older.data.obeReports; delete older.data.cqiNotes;
  older.data.resultUploads = older.data.resultUploads.map((u: ResultUpload) => ({ ...u, rows: u.rows.map(({ cloId, meanScore, sd, n }) => ({ cloId, meanScore, sd, n })) }));
  const restored = parseWorkspaceBackup(JSON.stringify(older), people);
  assert.ok(restored.ok && restored.backup.data.obeReports.length === 0 && restored.backup.data.cqiNotes.length === 0, "an earlier schema 6 file restores with empty reports and notes");
  const bad = JSON.parse(raw);
  bad.data.resultUploads.at(-1).rows[0].marks.pop();
  assert.equal(parseWorkspaceBackup(JSON.stringify(bad), people).ok, false, "a row whose marks are not its n is refused");
  const orphan = JSON.parse(raw);
  orphan.data.obeReports[0].uploadId = "RU-missing";
  assert.equal(parseWorkspaceBackup(JSON.stringify(orphan), people).ok, false, "a report must read a results file the backup holds");
});
