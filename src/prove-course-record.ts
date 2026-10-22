// The course record proofs (depth plan Sections 4 and 12): the sample course validates in both states, its learning
// time adds up as Section 4.3 states, its assessment weights and allocations sum, every outcome is assessed, every
// topic's lecture and lab hours add to its contact hours, the matrix has a level in every linked cell, the references
// gap is flagged until supplied, and the course file lists its parts with a manifest that marks what is sample, not yet
// built or not included. Run with `node --test`.

import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import { DEMO_INSTITUTION } from "./data/institution.ts";
import { DEMO_LINE } from "./data/sample-course/index.ts";
import { CLO5, CLO5_TOUR_APPEND, CS310_BEFORE, CS310_RUBRICS, DASHBOARD_TOPIC_TITLE, DEMO_PLOS, cs310After } from "./data/sample-course/cs310.ts";
import { PEOPLE_IDS } from "./data/seed.ts";
import { adoptCurriculumRevision, checkCurriculumRevision, definitionForCourse, getState, login, obeReportFor, resetDemoState, saveCurriculumRevision, startCurriculumRevision } from "./app/store.ts";
import { buildCourseFile, courseFileManifest, MARK_FILE, OBE_FILE, type CourseFileInput } from "./lib/courseFile.ts";
import { curriculumChanges, learningTime, nextFreeSlot, splitForSlot, tableOfSpecifications, validateCourseDefinition, withDerivedFields } from "./lib/curriculum.ts";
import { institutionError } from "./lib/institution.ts";
import { parseWorkspaceBackup } from "./lib/workspaceBackup.ts";
import type { CourseDefinition } from "./types.ts";

const YEAR = 2026; // the year the sample was written; the reference check is pinned to it so the proof never drifts
const errors = (def: CourseDefinition) => validateCourseDefinition(def, "CS310", undefined, YEAR).filter((i) => i.severity === "error");
const codes = (def: CourseDefinition) => validateCourseDefinition(def, "CS310", undefined, YEAR).map((i) => i.code);
const AFTER = withDerivedFields(cs310After());

test("the sample record validates in both states, and the workspace opens CS310 on it", () => {
  assert.deepEqual(errors(CS310_BEFORE), [], "the outline as the term begins");
  assert.deepEqual(errors(AFTER), [], "the outline after the tour's revision");
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.deepEqual(definitionForCourse("CS310"), CS310_BEFORE, "the Course step shows the record before any revision");
  const s = getState();
  assert.deepEqual(s.subjects.find((x) => x.id === "CS310")!.cloIds, ["CS310-1", "CS310-2", "CS310-3", "CS310-4", CLO5], "CLO5 keeps its id beside the four new outcomes");
  assert.deepEqual(s.subjectVersions.find((v) => v.id === "CS310-v1")?.definition, CS310_BEFORE, "the record is the current version's definition");
  assert.equal(s.subjectVersions.find((v) => v.id === "CS310-v1")?.effectiveTerm, undefined, "the baseline sets no term, so the course's term is the one the lecturer sets");
  assert.ok(CS310_BEFORE.sample && /labelled sample/.test(CS310_BEFORE.source ?? ""), "the record says it is a sample written for the prototype");
  assert.ok(!/TFB3133/.test(JSON.stringify(CS310_BEFORE)), "the real UTP course is named in the research note and nowhere in the app");
  assert.ok(parseWorkspaceBackup(JSON.stringify({ application: "Lyceum", schemaVersion: 6, exportedAt: "2026-10-22T10:00:00Z", data: Object.fromEntries(Object.entries(s).filter(([k]) => ["programme", "assignments", "subjects", "clos", "survey", "institution", "proposals", "notifications", "predictions", "resultUploads", "dataSources", "subjectVersions", "testDrafts", "teachingPlans", "courseDefinitions", "rubrics", "curriculumDrafts", "evidenceSources", "skillMentions", "skillMappings", "evidenceBriefs", "evidenceSnapshots", "briefDecisions", "events", "skillLexicon", "relevanceRatings", "idSeq"].includes(k))) }), s.people.map((p) => p.id)).ok, "the seeded workspace is a valid backup");
});

test("student learning time: 117 of 120 hours before the revision with 3 unallocated, 120 after; lecture, lab and self-study follow the topics", () => {
  const before = learningTime(CS310_BEFORE)!, after = learningTime(AFTER)!;
  assert.deepEqual([before.lecture, before.lab, before.selfStudy, before.assessment, before.exam, before.total, before.capacity, before.unallocated], [27, 26, 40, 21, 3, 117, 120, 3]);
  assert.deepEqual([after.lecture, after.lab, after.selfStudy, after.assessment, after.exam, after.total, after.capacity, after.unallocated], [28, 28, 40, 21, 3, 120, 120, 0]);
  assert.deepEqual([CS310_BEFORE.slt!.lecture, CS310_BEFORE.slt!.lab, CS310_BEFORE.slt!.selfStudy], [27, 26, 40], "the stored record agrees with its topics");
  assert.deepEqual([AFTER.slt!.lecture, AFTER.slt!.lab, AFTER.slt!.selfStudy], [28, 28, 40], "and so does the revision's");
  assert.equal(CS310_BEFORE.topics.reduce((n, t) => n + t.contactHours, 0), 53, "53 of the 56 contact hours are allocated before");
  assert.equal(AFTER.topics.reduce((n, t) => n + t.contactHours, 0), 56, "56 of 56 after");
  assert.ok(codes(CS310_BEFORE).includes("slt-unallocated") && !codes(AFTER).includes("slt-unallocated"), "the unallocated hours are said, then gone");
  const over = structuredClone(CS310_BEFORE); over.slt!.assessmentWork.project += 10;
  assert.ok(errors(over).some((i) => i.code === "slt-total"), "learning time over credits times 40 is an error");
  const drift = structuredClone(CS310_BEFORE); drift.slt!.lab = 30;
  assert.ok(errors(drift).some((i) => i.code === "slt-lab"), "a stored lab total that disagrees with the topics is an error");
});

test("the assessment plan: weights add to 100, each allocation adds to its weight, every outcome is assessed, and the table of specifications is their sum", () => {
  const plan = CS310_BEFORE.assessment!;
  assert.equal(plan.reduce((n, a) => n + a.weight, 0), 100);
  assert.equal(plan.filter((a) => a.kind !== "exam").reduce((n, a) => n + a.weight, 0), 60, "continuous 60, inside the 50 to 70 range");
  for (const a of plan) assert.equal(a.allocation.reduce((n, x) => n + x.marks, 0), a.weight, a.title);
  const byOutcome = Object.fromEntries(CS310_BEFORE.outcomes.map((o) => [o.label, tableOfSpecifications(CS310_BEFORE).filter((r) => r.cloId === o.id).reduce((n, r) => n + r.marks, 0)]));
  assert.deepEqual(byOutcome, { CLO1: 18, CLO2: 32, CLO3: 14, CLO4: 26, CLO5: 10 });
  assert.equal(plan.find((a) => a.id === "CS310-A4")!.individual, true, "each student's CLO4 evidence is their own");
  for (const o of CS310_BEFORE.outcomes) assert.ok(o.assessmentEvidence.length > 0 && plan.some((a) => a.allocation.some((x) => x.cloId === o.id)), o.label + " is assessed");
  const weights = structuredClone(CS310_BEFORE); weights.assessment![0].weight = 15;
  assert.ok(codes(weights).includes("assessment-weights") && codes(weights).includes("assessment-allocation"));
  const unassessed = structuredClone(CS310_BEFORE); unassessed.assessment = unassessed.assessment!.map((a) => ({ ...a, allocation: a.allocation.map((x) => (x.cloId === CLO5 ? { ...x, cloId: "CS310-2" } : x)) }));
  assert.ok(codes(unassessed).includes("assessment-coverage"), "an outcome no component assesses is an error");
});

test("fourteen weeks, every topic linked to an outcome, its lecture and lab hours adding to its contact hours", () => {
  assert.deepEqual(CS310_BEFORE.topics.map((t) => t.week), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  for (const t of AFTER.topics) {
    assert.ok(t.cloIds.length > 0, t.title + " links an outcome");
    assert.equal(t.lectureHours! + t.labHours!, t.contactHours, t.title);
    assert.ok(t.misconceptions === undefined || t.misconceptions.length >= 2, t.title + " names its misconceptions");
  }
  const bad = structuredClone(CS310_BEFORE); bad.topics[0].labHours = 3;
  assert.ok(codes(bad).includes("topic-split"), "a split that does not add up is an error");
});

test("the matrix has a level in every linked cell, and a link without one is an error", () => {
  for (const o of CS310_BEFORE.outcomes) assert.deepEqual(o.ploIds, o.ploLinks!.map((l) => l.ploId), o.label);
  assert.equal(CS310_BEFORE.outcomes.flatMap((o) => o.ploLinks!).filter((l) => l.level === "H").length, 5, "each outcome has one high link");
  assert.ok(CS310_BEFORE.outcomes.every((o) => o.ploIds.every((id) => DEMO_PLOS.some((p) => p.id === id))));
  const unlevelled = structuredClone(CS310_BEFORE); unlevelled.outcomes[0].ploIds.push("PLO3");
  assert.ok(errors(unlevelled).some((i) => i.code === "plo-level"), "a linked cell with no level is refused");
  assert.equal(withDerivedFields({ ...unlevelled, outcomes: unlevelled.outcomes.map((o, i) => (i === 0 ? { ...o, ploIds: ["PLO1"] } : o)) }).outcomes[0].ploLinks!.length, 1, "dropping a PLO drops its level");
});

test("the references gap is flagged until two recent references are supplied", () => {
  assert.ok(codes(CS310_BEFORE).includes("references-recent"), "Munzner 2014 and Few 2013 alone leave the gap open");
  assert.match(validateCourseDefinition(CS310_BEFORE, "CS310", undefined, YEAR).find((i) => i.code === "references-recent")!.message, /recent references to be supplied by the lecturer/i);
  const supplied = { ...CS310_BEFORE, references: [...CS310_BEFORE.references!, { citation: "A recent text (2024).", year: 2024 }, { citation: "Another recent text (2025).", year: 2025 }] };
  assert.ok(!codes(supplied).includes("references-recent"), "the warning closes once two are under five years old");
});

test("the rubrics: criteria marks add to their component's weight and to each outcome's allocation, four levels each", () => {
  for (const r of CS310_RUBRICS) {
    const component = CS310_BEFORE.assessment!.find((a) => a.id === r.componentId)!;
    assert.equal(component.rubricId, r.id);
    assert.equal(r.criteria.reduce((n, c) => n + c.marks, 0), component.weight, r.title);
    for (const x of component.allocation) assert.equal(r.criteria.filter((c) => c.cloIds.includes(x.cloId)).reduce((n, c) => n + c.marks, 0), x.marks, r.title + " for " + x.cloId);
    for (const c of r.criteria) assert.ok(c.levels.length === 4 && c.levels.every((l) => l.trim().length > 10), c.name);
    assert.equal(r.sample, true);
  }
});

test("the tour's change fits the record: the free slot is week 14, the topic takes one lecture and two lab hours, CLO5 keeps its id and level", () => {
  assert.deepEqual(nextFreeSlot(CS310_BEFORE), { week: 14, lecture: 1, lab: 2 }, "the next free slot");
  assert.deepEqual(splitForSlot({ lecture: 1 }, 3), { lectureHours: 1, labHours: 2 }, "three hours typed: lecture first, then the lab");
  const clo5 = AFTER.outcomes.find((o) => o.id === CLO5)!;
  assert.ok(clo5.text.endsWith(CLO5_TOUR_APPEND) && clo5.bloomLevel === "Apply", "reworded by the tour's words; still Apply");
  const added = AFTER.topics.find((t) => t.title === DASHBOARD_TOPIC_TITLE)!;
  assert.deepEqual([added.week, added.lectureHours, added.labHours, added.contactHours], [14, 1, 2, 3]);
  assert.equal(nextFreeSlot(AFTER), null, "the schedule is full after it");
  const changes = curriculumChanges(CS310_BEFORE, AFTER);
  assert.deepEqual(changes.map((c) => c.area + " " + c.kind + " " + c.label), ["Course edit Student learning time", "Outcome edit CLO5", "Topic add " + DASHBOARD_TOPIC_TITLE]);
  assert.deepEqual(AFTER.assessment, CS310_BEFORE.assessment, "the assessment plan is not changed by this revision");
  const mentions = JSON.stringify({ outcomes: CS310_BEFORE.outcomes, topics: CS310_BEFORE.topics.map((t) => ({ ...t, readings: t.week === 12 ? "" : t.readings })), assessment: CS310_BEFORE.assessment, synopsis: CS310_BEFORE.synopsis });
  assert.ok(!/dashboard/i.test(mentions), "before the revision, dashboards appear only in week 12's reading");
  assert.match(CS310_BEFORE.topics.find((t) => t.week === 12)!.readings!, /dashboards/);
});

test("the store saves and adopts the tour's revision through its real actions, with the learning time following the topics", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const started = startCurriculumRevision("CS310");
  assert.equal(started.ok, true);
  const draft = getState().curriculumDrafts.find((d) => d.id === started.draftId)!;
  const edited = structuredClone(draft.definition);
  edited.outcomes = edited.outcomes.map((o) => (o.id === CLO5 ? { ...o, text: o.text + CLO5_TOUR_APPEND } : o));
  edited.topics.push({ id: "CS310-topic-test", title: DASHBOARD_TOPIC_TITLE, week: 14, kind: "mixed", ...splitForSlot(nextFreeSlot(edited)!, 3), contactHours: 3, selfStudyHours: 0, cloIds: [CLO5], prerequisiteTopicIds: [], protected: false, resources: "" });
  assert.equal(saveCurriculumRevision(draft.id, draft.revision, { definition: edited, reason: "The tour's revision.", effectiveTerm: "2026/2027 semester 1" }).ok, true);
  const saved = getState().curriculumDrafts.find((d) => d.id === draft.id)!;
  assert.deepEqual([saved.definition.slt!.lecture, saved.definition.slt!.lab], [28, 28], "the stored learning time follows the new topic without anyone typing it");
  assert.equal(checkCurriculumRevision(saved.id, saved.revision).ok, true);
  assert.equal(adoptCurriculumRevision(saved.id, saved.revision, true).ok, true);
  assert.equal(definitionForCourse("CS310")!.topics.length, 15);
  assert.equal(getState().subjectVersions.filter((v) => v.subjectId === "CS310").length, 2, "the baseline version is kept beside the new one");
});

const input = (overrides: Partial<CourseFileInput> = {}): CourseFileInput => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const s = getState(), subject = s.subjects.find((x) => x.id === "CS310")!;
  return { subject, definition: CS310_BEFORE, versionId: subject.currentVersionId, rubrics: s.rubrics, plos: s.programme.plos!, versions: s.subjectVersions.filter((v) => v.subjectId === "CS310"),
    decisions: [], briefs: [], people: s.people, packs: [], sessions: s.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions, institution: DEMO_INSTITUTION, mark: new Uint8Array([137, 80, 78, 71]), demoLine: DEMO_LINE, generatedAt: "2026-10-22T10:00:00Z", ...overrides };
};

test("the course file lists its parts, and the manifest marks what is sample, not yet built and not included", async () => {
  const built = await buildCourseFile(input());
  const zip = await JSZip.loadAsync(built.bytes);
  const names = Object.values(zip.files).filter((f) => !f.dir).map((f) => f.name).sort();
  assert.deepEqual(names, ["MANIFEST.md", "course-information.md", "decisions-and-versions.md", "final-examination-outline.md", MARK_FILE, "rubrics/CS310-R1.md", "rubrics/CS310-R2.md",
    "rubrics/CS310-R1.xlsx", "rubrics/CS310-R2.xlsx", "items/CS310-week-7-items.xml", "items/CS310-week-7-items.md",
    "lab-sheets/CS310-week-1-lab-sheet.md", "lab-sheets/CS310-week-6-lab-sheet.md", "lab-sheets/CS310-week-7-lab-sheet.md", "project/CS310-week-8-project-brief.md"].sort());
  const manifest = await zip.file("MANIFEST.md")!.async("string");
  for (const m of built.manifest) assert.ok(manifest.includes(m.item) && manifest.includes(m.status), m.item);
  const status = (item: RegExp) => built.manifest.find((m) => item.test(m.item))!.status;
  assert.equal(status(/^Course learning outcomes/), "sample", "the sample course's parts say sample");
  assert.equal(status(/project brief/), "sample", "the week 8 brief, written for the prototype");
  assert.equal(status(/lab sheets/), "sample");
  assert.equal(built.manifest.find((m) => /lab sheets/.test(m.item))!.files.length, 3, "lab sheets for weeks 1, 6 and 7");
  assert.equal(status(/quiz items/), "sample", "the week 7 quiz, drafted for the prototype");
  assert.match(built.manifest.find((m) => /quiz items/.test(m.item))!.detail, /10 items for week 7 \(drafted, not reviewed by a person\)/);
  assert.equal(status(/OBE course report/), "not included", "no report saved yet, and it says so");
  assert.match(built.manifest.find((m) => /OBE course report/.test(m.item))!.detail, /No OBE report is saved/);
  assert.equal(status(/^Graded examination papers/), "not included");
  assert.equal(status(/external examiner/), "not included");
  assert.ok(built.manifest.every((m) => (m.status === "not yet built" || m.status === "not included") === (m.files.length === 0) || m.item === "Decisions and versions"), "a listed file exists exactly when the item is in the zip");
  const info = await zip.file("course-information.md")!.async("string");
  assert.ok(info.includes(DEMO_LINE), "the honesty line on the cover");
  assert.ok(info.includes("](" + MARK_FILE + ")") && info.includes(DEMO_INSTITUTION.mark.alt), "the mark, with its alt text, beside the demo line");
  assert.ok(info.includes("| CLO1 | H | M |") && /not scores; no PLO index/.test(info), "the matrix with its levels in text, and no index");
  assert.ok(/No accreditation is claimed/.test(info) && /No accreditation is claimed/.test(manifest));
  assert.ok(info.includes("117 of the 120 hours") && info.includes("3 unallocated"), "the learning time, with the unallocated hours");
  const again = await buildCourseFile(input());
  assert.deepEqual(again.bytes, built.bytes, "the same record makes the same zip");
});

test("the course file follows the institution: no mark when showMark is off, and the manifest grows with the packs and a saved OBE report", async () => {
  const off = await buildCourseFile(input({ institution: { ...DEMO_INSTITUTION, showMark: false } }));
  const zip = await JSZip.loadAsync(off.bytes);
  assert.ok(!zip.file(MARK_FILE), "no mark in the zip");
  assert.ok(!(await zip.file("course-information.md")!.async("string")).includes("](" + MARK_FILE + ")"), "no image line on the cover");
  const withPack = courseFileManifest(input({ packs: [{ fileName: "CS310-week-6-teaching-pack.pptx", week: 6, bytes: new Uint8Array([1]) }] }));
  assert.equal(withPack.find((m) => /teaching packs/.test(m.item))!.status, "present");
  assert.deepEqual(withPack.find((m) => /teaching packs/.test(m.item))!.files, ["packs/CS310-week-6-teaching-pack.pptx"]);
  // A saved OBE report (depth plan Section 8.3) goes into the zip as printed, and the manifest says so.
  const base = input(), st = getState(), prior = st.resultUploads.find((u) => u.subjectId === "CS310" && u.sample)!;
  const report = { ...obeReportFor(st, "CS310", prior.term, prior, "2026-10-22T10:00:00Z", PEOPLE_IDS.sobri), id: "OBE-CS310-1" };
  const withReport = await buildCourseFile({ ...base, obeReport: report });
  const entry = withReport.manifest.find((m) => /OBE course report/.test(m.item))!;
  assert.deepEqual([entry.status, entry.files], ["sample", [OBE_FILE]], "synthetic marks make the report a sample");
  const text = await (await JSZip.loadAsync(withReport.bytes)).file(OBE_FILE)!.async("string");
  assert.ok(text.includes("Pass mark and KPI | 55, and 50% of students") && text.includes("No learning gain is claimed") && text.includes(DEMO_LINE), "the settings it was printed with, the sentence that stays, the honesty line");
});

test("the demo institution says demo, and the honesty line is the plan's", () => {
  assert.equal(institutionError(DEMO_INSTITUTION), null);
  assert.ok(DEMO_INSTITUTION.name.includes("(demo)") && DEMO_INSTITUTION.showMark && DEMO_INSTITUTION.demo);
  assert.equal(DEMO_LINE, "A demo course at UTP, written for this prototype. CS310 is not a UTP course outline, and these marks, responses and slides are synthetic.");
  assert.equal(institutionError({ ...DEMO_INSTITUTION, name: "Universiti Teknologi PETRONAS" }), "A demo profile keeps the word demo in its name.");
});
