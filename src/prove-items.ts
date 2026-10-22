// Proof: the check's items (depth plan Section 10). The templates draft from the outcome's words and the recorded
// misconceptions and leave every key to the lecturer; the lint names each rule and catches what a rule can; the week 7 sample
// quiz passes it; the Moodle XML and the QTI 2.1 package are well-formed and carry the documented elements, labelled with
// what they have not been checked against; the rubric reads back as a spreadsheet; the store keeps a person's review as a
// record and clears it on a change; and backups carry the items.
//
// Run with:  node --test src/prove-items.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { draftSessionItems, exportWorkspaceBackup, getState, login, markItemsReviewed, resetDemoState, saveSessionItem, saveTeachingSession } from "./app/store.ts";
import { CS310_BEFORE, CS310_RUBRICS } from "./data/sample-course/cs310.ts";
import { DEMO_LINE } from "./data/sample-course/index.ts";
import { WEEK_7_QUIZ } from "./data/sample-course/quiz.ts";
import { PEOPLE, PEOPLE_IDS } from "./data/seed.ts";
import { BLOOM_VERBS, LINT_LIMIT, MOODLE_LABEL, QTI_LABEL, RULES, courseMisconceptions, lintItem, lintSet, moodleXml, passes, qtiPackage, rubricRows, templateItems, type ItemContext } from "./lib/items.ts";
import { parseWorkspaceBackup } from "./lib/workspaceBackup.ts";
import { wellFormed } from "./lib/xmlCheck.ts";
import type { DraftItem, TeachingSession } from "./types.ts";

const MISCONCEPTIONS = courseMisconceptions(CS310_BEFORE);
const label = (id: string) => CS310_BEFORE.outcomes.find((o) => o.id === id)?.label ?? id;
const CTX: ItemContext = { subjectId: "CS310", week: 7, topic: "Mid-semester quiz", labels: label, people: PEOPLE, demoLine: DEMO_LINE };
const failing = (item: DraftItem) => lintItem(item, MISCONCEPTIONS).filter((c) => !c.ok).map((c) => c.rule);

test("the Arkansas verbs by level; the templates draft from the outcome's words and the recorded misconceptions, every key left to the lecturer", () => {
  assert.deepEqual(BLOOM_VERBS.Analyse, ["classify", "categorise", "diagram", "break down"]);
  assert.deepEqual(BLOOM_VERBS.Evaluate, ["judge", "defend", "justify", "argue"]);
  const week6 = CS310_BEFORE.topics.find((t) => t.week === 6)!;
  const session: TeachingSession = { id: "TS-x", week: 6, topic: "Dashboard lab: from a messy dataset to a decision", minutes: 90, cloIds: ["CLO5"], activity: "", learningCheck: "", resources: "", status: "ready", updatedAt: "", updatedBy: PEOPLE_IDS.sobri };
  let n = 0;
  const items = templateItems(CS310_BEFORE, session, CS310_BEFORE.outcomes, () => "T" + ++n);
  assert.deepEqual(items.map((i) => [i.kind, i.cloId, i.source, i.reviewedBy]), [["multichoice", "CLO5", "template", null], ["shortanswer", "CLO5", "template", null], ["essay", "CLO5", "template", null]]);
  const mcq = items[0];
  assert.deepEqual(mcq.options!.filter((o) => !o.correct).map((o) => o.text).slice(0, 2), week6.misconceptions, "the week's own misconceptions first, as distractors");
  assert.equal(mcq.options!.find((o) => o.correct)!.text, "", "the key is the lecturer's to write: a template cannot know what is true");
  assert.ok(items[2].stem.startsWith("Demonstrate how you would use charts to tell a data story to a stakeholder audience"), "the outcome's words in the stem, with a verb from its level (Apply): " + items[2].stem);
  assert.ok(failing(mcq).includes(RULES.key) && failing(items[1]).includes(RULES.answers), "the lint says what is left to write");
  assert.deepEqual(failing(items[2]), [], "the essay carries its outcome for the marker");
});

test("the lint names each rule and catches what a rule can: each fixture fails exactly its rule", () => {
  const good: DraftItem = structuredClone(WEEK_7_QUIZ[0]);
  assert.deepEqual(failing(good), [], "a clean item passes every rule");
  const variant = (change: (i: DraftItem) => void) => { const i = structuredClone(good); change(i); return failing(i); };
  assert.deepEqual(variant((i) => { i.stem = "Which statement is not accurate about marks and channels?"; }), [RULES.stem], "a negative stem");
  assert.deepEqual(variant((i) => { i.options = i.options!.slice(0, 2); }), [RULES.options], "two options");
  assert.deepEqual(variant((i) => { i.options![0].correct = true; }), [RULES.key], "two keys");
  assert.deepEqual(variant((i) => { i.options![1].text = "Position along one common, aligned scale is read far more accurately than angle, area or colour hue."; }), [RULES.length], "a key much longer than the rest");
  assert.deepEqual(variant((i) => { i.options![2].text = "All of the above statements are accurate."; }), [RULES.allNone, RULES.absolutes, RULES.misconceptions], "all of the above (an absolute, and no recorded misconception)");
  assert.deepEqual(variant((i) => { i.options![1].text = "Position is always read more accurately than angle."; }), [RULES.absolutes]);
  assert.deepEqual(variant((i) => { i.stem = "People read position on a common scale more accurately than an"; i.options![1].text = "Angle on a pie chart."; }).includes(RULES.grammar), true, "a stem ending in \"an\" before an option that starts with a vowel and one that does not");
  assert.deepEqual(variant((i) => { i.options![0].text = "Angle and area are read as well as position on a scale."; }), [RULES.misconceptions], "a distractor that is not a recorded misconception");
  assert.ok(LINT_LIMIT.includes("cannot judge whether the key is defensible or the distractors plausible"), "and the screen says what no rule can judge");
});

test("short answers and essays have their own rules, and a set's keys vary in position", () => {
  const sa = structuredClone(WEEK_7_QUIZ[5]);
  assert.deepEqual(failing({ ...sa, answers: [] }), [RULES.answers]);
  assert.deepEqual(failing({ ...sa, answers: ["position on a common aligned scale"] }), [RULES.shortAnswers], "five words is more than Moodle's exact match should carry");
  assert.deepEqual(failing({ ...structuredClone(WEEK_7_QUIZ[8]), graderInfo: "" }), [RULES.grader]);
  const sameSlot = WEEK_7_QUIZ.slice(0, 5).map((i) => { const c = structuredClone(i); const key = c.options!.find((o) => o.correct)!; c.options = [key, ...c.options!.filter((o) => !o.correct)]; return c; });
  assert.equal(lintSet(sameSlot).ok, false, "five keys in the first position");
  assert.equal(lintSet(WEEK_7_QUIZ).ok, true, "the sample's keys sit in three positions");
});

test("the week 7 sample quiz: ten drafted items on the quiz's outcomes, each passing the lint, its distractors word for word from the record, not reviewed", () => {
  assert.equal(WEEK_7_QUIZ.length, 10);
  assert.deepEqual([...new Set(WEEK_7_QUIZ.map((i) => i.cloId))].sort(), ["CS310-1", "CS310-3"], "the quiz's share of the assessment plan");
  assert.deepEqual(CS310_BEFORE.assessment!.find((a) => a.kind === "quiz")!.allocation.map((a) => a.cloId).sort(), ["CS310-1", "CS310-3"]);
  for (const item of WEEK_7_QUIZ) assert.deepEqual(failing(item), [], item.id);
  const distractors = WEEK_7_QUIZ.flatMap((i) => (i.options ?? []).filter((o) => !o.correct).map((o) => o.text));
  assert.equal(distractors.length, 10);
  assert.ok(distractors.every((d) => MISCONCEPTIONS.includes(d)), "every distractor is a misconception the course records");
  assert.ok(WEEK_7_QUIZ.every((i) => i.source === "sample" && i.reviewedBy === null), "labelled sample, and no person has reviewed them");
  const s7 = getState().teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => s.week === 7 && s.sample)!;
  assert.equal(s7.items?.length, 10, "the week 7 sample session carries them");
});

test("Moodle XML: the declaration alone on line 1, well-formed, the documented elements for each kind, labelled not yet imported", () => {
  const text = moodleXml(WEEK_7_QUIZ, CTX);
  assert.equal(wellFormed(text), null);
  assert.equal(wellFormed(text.replace("</quiz>", "")), "<quiz> is not closed", "and the checker catches a broken document");
  assert.equal(wellFormed(text.replace("<quiz>", "\n<quiz>").replace('encoding="UTF-8"?>', 'encoding="UTF-8"?> <!-- x -->')), "the declaration is not alone on line 1");
  const count = (kind: string) => text.split('<question type="' + kind + '">').length - 1;
  assert.deepEqual([count("category"), count("multichoice"), count("shortanswer"), count("essay")], [1, 5, 3, 2]);
  for (const element of ["<single>true</single>", "<shuffleanswers>true</shuffleanswers>", "<answernumbering>abc</answernumbering>", "<correctfeedback", "<partiallycorrectfeedback", "<incorrectfeedback",
    "<usecase>0</usecase>", "<responseformat>editor</responseformat>", "<responserequired>1</responserequired>", "<responsefieldlines>12</responsefieldlines>", "<attachments>0</attachments>", "<graderinfo format=\"html\">", "<responsetemplate format=\"html\">"])
    assert.ok(text.includes(element), element);
  const multichoice = text.split('<question type="multichoice">').slice(1).map((q) => q.split("</question>")[0]);
  assert.ok(multichoice.every((q) => q.split('fraction="100"').length - 1 === 1), "one keyed answer each");
  assert.ok(text.includes(MOODLE_LABEL) && text.includes("Drafted, not reviewed by a person.") && text.includes("<tag><text>not-reviewed</text></tag>"), "labelled, and no review claimed");
  assert.ok(text.includes("<category><text>$course$/top/CS310 week 7</text></category>"));
  const reviewed = moodleXml(WEEK_7_QUIZ.map((i) => ({ ...i, reviewedBy: PEOPLE_IDS.sobri, reviewedAt: "2026-10-23T02:00:00Z" })), CTX);
  assert.ok(reviewed.includes("Reviewed by Dr Sobri on 2026-10-23.") && !reviewed.includes("not-reviewed"), "a person's review is named once it is recorded");
});

test("QTI 2.1: each item and the manifest well-formed, in the QTI 2.1 namespace, matched or mapped to its key, labelled unvalidated", () => {
  const files = qtiPackage(WEEK_7_QUIZ, CTX);
  assert.equal(files.size, 11, "ten items and the manifest");
  for (const [path, text] of files) assert.equal(wellFormed(text), null, path);
  const manifest = files.get("imsmanifest.xml")!;
  assert.equal(manifest.split('type="imsqti_item_xmlv2p1"').length - 1, 10, "the manifest lists every item");
  const items = [...files.entries()].filter(([p]) => p.startsWith("items/")).map(([, t]) => t);
  assert.ok(items.every((t) => t.includes('xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"')));
  assert.equal(items.filter((t) => t.includes("rptemplates/match_correct") && t.includes("<choiceInteraction")).length, 5);
  assert.equal(items.filter((t) => t.includes("rptemplates/map_response") && t.includes("<textEntryInteraction")).length, 3);
  assert.equal(items.filter((t) => t.includes("<extendedTextInteraction") && t.includes('<rubricBlock view="scorer">') && !t.includes("responseProcessing")).length, 2, "essays are scored by a person");
  assert.ok(QTI_LABEL.startsWith("Unvalidated"), "the 1EdTech schema is not on this machine, and the label says so");
});

test("the rubric as a spreadsheet reads back as the grid on the Course step", () => {
  const rubric = CS310_RUBRICS[0];
  const rows = rubricRows(rubric, label, DEMO_LINE);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "Rubric");
  const back = XLSX.utils.sheet_to_json<Array<string | number>>(XLSX.read(XLSX.write(book, { type: "array", bookType: "xlsx" }), { type: "array" }).Sheets.Rubric, { header: 1, blankrows: true });
  assert.equal(back[0][0], rubric.title);
  assert.equal(back[1][0], DEMO_LINE, "the demo line on a sample");
  assert.deepEqual(back[3], ["Criterion", "Marks", "Outcomes", "Capstone", "Milestone 2", "Milestone 1", "Benchmark"]);
  rubric.criteria.forEach((c, k) => assert.deepEqual(back[4 + k], [c.name, c.marks, c.cloIds.map(label).join(", "), ...c.levels], c.name));
  assert.deepEqual(back.at(-1), ["Total", rubric.criteria.reduce((n, c) => n + c.marks, 0)]);
});

test("through the store: templates for the lecturer's own session, an edit clears its review, a review is a person's record, samples stay as written", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveTeachingSession("CS310", { week: 6, topic: "Dashboard lab", minutes: 90, cloIds: ["CLO5"], activity: "Build a dashboard in pairs.", learningCheck: "Exit question.", resources: "", status: "ready" }).ok, true);
  const own = () => getState().teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => !s.sample && s.week === 6)!;
  assert.equal(draftSessionItems("CS310", own().id).ok, true);
  assert.equal(own().items!.length, 3);
  const mcq = own().items![0];
  const written = { ...mcq, options: mcq.options!.map((o) => (o.correct ? { ...o, text: "One shared y-axis lets a reader compare two series." } : o)) };
  assert.equal(saveSessionItem("CS310", own().id, written).ok, true);
  assert.equal(passes(lintItem(own().items![0], courseMisconceptions(CS310_BEFORE))), true, "with its key written, the template's item passes");
  assert.equal(markItemsReviewed("CS310", own().id).ok, true);
  assert.ok(own().items!.every((i) => i.reviewedBy === PEOPLE_IDS.sobri && i.reviewedAt), "the person and the date, on every item");
  assert.equal(saveSessionItem("CS310", own().id, { ...own().items![1], answers: ["dashboard"] }).ok, true);
  assert.deepEqual(own().items!.map((i) => Boolean(i.reviewedBy)), [true, false, true], "a changed item's review is cleared; the others keep theirs");
  assert.equal(saveSessionItem("CS310", own().id, { ...own().items![0] }).ok, true);
  assert.equal(own().items![0].reviewedBy, PEOPLE_IDS.sobri, "saving it unchanged keeps the review");
  assert.equal(saveTeachingSession("CS310", { ...own(), topic: "Dashboard lab, revised" }).ok, true);
  assert.equal(own().items!.length, 3, "editing the session keeps its items");
  const sample = getState().teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => s.week === 7 && s.sample)!;
  assert.equal(draftSessionItems("CS310", sample.id).ok, false, "samples stay as written");
  assert.equal(saveSessionItem("CS310", sample.id, sample.items![0]).ok, false);
  assert.equal(markItemsReviewed("CS310", sample.id).ok, true, "a person on the team can mark the sample quiz reviewed");
  const outsider = PEOPLE.find((p) => !getState().assignments.some((a) => a.personId === p.id && a.subjectId === "CS310"))!;
  login(outsider.id);
  assert.equal(markItemsReviewed("CS310", sample.id).ok, false, "a person not assigned to the course cannot");
});

test("backups carry the items; an unknown reviewer and a repeated item id are refused", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const sample = getState().teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => s.week === 7 && s.sample)!;
  assert.equal(markItemsReviewed("CS310", sample.id).ok, true);
  const people = getState().people.map((p) => p.id), raw = exportWorkspaceBackup();
  const parsed = parseWorkspaceBackup(raw, people);
  assert.ok(parsed.ok && parsed.backup.data.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => s.id === sample.id)!.items!.every((i) => i.reviewedBy === PEOPLE_IDS.sobri));
  const sessionsOf = (d: { data: { teachingPlans: Array<{ subjectId: string; sessions: TeachingSession[] }> } }) => d.data.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => s.id === sample.id)!;
  const stranger = JSON.parse(raw); sessionsOf(stranger).items![0].reviewedBy = "P-NOBODY";
  assert.equal(parseWorkspaceBackup(JSON.stringify(stranger), people).ok, false, "an unknown reviewer");
  const twice = JSON.parse(raw); sessionsOf(twice).items![1].id = sessionsOf(twice).items![0].id;
  assert.equal(parseWorkspaceBackup(JSON.stringify(twice), people).ok, false, "a repeated item id");
});
