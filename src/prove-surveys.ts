// Proof of the two student surveys (depth plan Sections 7 and 12): the instruments built from the record and the profile,
// the link that carries the form (under 2,000 characters), the collector's token against the server's own hash, the floor
// and the release rule, the booth's rules through the store (one response per device, never course evidence), the Microsoft
// Forms importer on its fixture, backups that carry the surveys, the sample's counts, and D3b's four: the Google Forms
// importer on its CSV fixture, the Moodle Feedback importer, the document for Microsoft Forms Quick Import, and the paste way.
//   node --test src/prove-surveys.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import LZString from "lz-string";
import * as XLSX from "xlsx";
import { recapFor } from "./app/recap.ts";
import { collectBoothResponses, createCourseSurveys, exportWorkspaceBackup, getState, login, openSurveyForCollection, recordGradesReleased, resetDemoState,
  saveTeachingPlanDetails } from "./app/store.ts";
import { DEMO_INSTITUTION } from "./data/institution.ts";
import { DEMO_LINE } from "./data/sample-course/index.ts";
import { CS310_BEFORE } from "./data/sample-course/cs310.ts";
import { PRIOR_COS, PRIOR_SSRT, PRIOR_SURVEY_RESPONSES } from "./data/sample-course/surveys.ts";
import { PEOPLE, PEOPLE_IDS } from "./data/seed.ts";
import { FORMS_DOCX_LABEL, PASTE_WARNING, decodeForm, encodeForm, formTokenFor, formsDocumentLines, formsDocx, gradesReleased, importFormat, importFormsRows, importResponseRows, newReaderSecret,
  pasteCode, readPasteCodes, respondents, studentForm, surveyFloor, surveyLink, surveyReleased, surveySummary } from "./lib/surveys.ts";
import { wellFormed } from "./lib/xmlCheck.ts";
import { parseWorkspaceBackup } from "./lib/workspaceBackup.ts";
import type { SurveyResponse } from "./types.ts";

const CS310 = { id: "CS310", title: "Data Visualisation" };
const TERM = "2026/2027 semester 1";
const serverToken = (reader: string) => createHash("sha256").update(reader).digest("base64url").slice(0, 22); // server/index.ts tokenOf

test("the two instruments: one item per outcome in its words, the SSRT's twelve over five dimensions, ids at the start of every question", () => {
  assert.deepEqual(PRIOR_COS.questions.map((q) => [q.id, q.kind, q.cloId ?? null]).slice(0, 2), [["Q1", "scale", "CS310-1"], ["Q2", "scale", "CS310-2"]]);
  const label = (cloId?: string) => CS310_BEFORE.outcomes.find((o) => o.id === cloId)!.label;
  assert.equal(PRIOR_COS.questions.filter((q) => q.kind === "scale").length, 5, "five outcomes, five items");
  assert.ok(PRIOR_COS.questions.filter((q) => q.kind === "scale").every((q) => q.text.startsWith(q.id + ". I can ") && q.text.endsWith("(" + label(q.cloId) + ").")), "in the outcome's words, with its label");
  assert.equal(PRIOR_COS.questions.at(-1)!.kind, "comment");
  const ssrt = PRIOR_SSRT.questions;
  assert.equal(ssrt.filter((q) => q.kind === "scale").length, 12);
  assert.deepEqual([...new Set(ssrt.filter((q) => q.dimension).map((q) => q.dimension))], ["learning", "organisation", "breadth", "assessment", "workload"]);
  assert.equal(ssrt.filter((q) => q.kind === "comment").length, 2);
  assert.match(PRIOR_SSRT.instrumentNote!, /demo instrument .* unvalidated: not SEEQ and not UTP's instrument/);
  for (const def of [PRIOR_COS, PRIOR_SSRT]) {
    assert.ok(def.questions.every((q) => q.text.startsWith(q.id + ".")), "every question carries its id at the start of its text");
    assert.equal(new Set(def.questions.map((q) => q.id)).size, def.questions.length);
    assert.deepEqual([def.scale.min, def.scale.max, def.scale.target], [1, 5, 4], "the profile's scale and target");
  }
});

test("the link carries the form and nothing else, stays under 2,000 characters, and a damaged one opens nothing", () => {
  const secret = newReaderSecret();
  for (const def of [PRIOR_COS, PRIOR_SSRT]) {
    const form = studentForm({ ...def, formToken: serverToken(secret), readerSecret: secret }, CS310, DEMO_INSTITUTION, DEMO_LINE);
    const link = surveyLink("http://192.168.137.120:5173", form);
    assert.ok(link.length < 2000, def.kind + " link is " + link.length + " characters");
    assert.deepEqual(decodeForm(link.split("#/survey/")[1]), form, "the form comes back whole");
    assert.ok(!link.includes(secret) && !JSON.stringify(form).includes(secret), "the reader secret never travels in the link");
    assert.equal(form.mark, DEMO_INSTITUTION.mark.pngSmall, "the demo course's form shows the mark, with the demo line");
    assert.equal(form.demo, DEMO_LINE);
  }
  const plain = studentForm({ ...PRIOR_COS, formToken: serverToken(secret) }, CS310, DEMO_INSTITUTION, null);
  assert.deepEqual([plain.mark, plain.demo], [null, null], "a lecturer's own course shows neither");
  assert.equal(decodeForm("not-a-form"), null);
  assert.equal(decodeForm(encodeForm({ ...plain, f: "short" })), null, "a form without a well-formed token opens nothing");
  assert.equal(decodeForm(encodeForm({ ...plain, q: [["name", "Your name?", "comment"]] })), null, "nor one whose questions are not the survey's ids");
});

test("the submission token is the reader secret's hash as the collector computes it, and cannot read", async () => {
  const secret = newReaderSecret(), token = await formTokenFor(secret);
  assert.equal(token, serverToken(secret), "the browser and the collector agree");
  assert.match(token, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(serverToken(token), token, "the token is not a reader of itself");
  assert.notEqual(await formTokenFor(newReaderSecret()), token);
});

test("the floor is a count and a share, the stricter applied; nothing but the count shows below it or before grades are released", () => {
  assert.deepEqual([surveyFloor(DEMO_INSTITUTION, 38).required, surveyFloor(DEMO_INSTITUTION, 12).required, surveyFloor(DEMO_INSTITUTION, null).required], [10, 5, 5]);
  const few = PRIOR_SURVEY_RESPONSES.filter((r) => r.formId === PRIOR_COS.id).slice(0, 9);
  const closed = surveySummary(PRIOR_COS, few, DEMO_INSTITUTION, true);
  assert.deepEqual([closed.respondents, closed.floorMet, closed.open, closed.items.length, closed.comments.length], [9, false, false, 0, 0], "below the floor: the count only");
  const unreleased = surveySummary(PRIOR_COS, PRIOR_SURVEY_RESPONSES, DEMO_INSTITUTION, false);
  assert.deepEqual([unreleased.respondents, unreleased.floorMet, unreleased.open, unreleased.items.length, unreleased.comments.length], [31, true, false, 0, 0], "before the release: the count only, comments included");
  const open = surveySummary(PRIOR_COS, PRIOR_SURVEY_RESPONSES, DEMO_INSTITUTION, true);
  assert.equal(open.rate, "31 of 38, 82%");
  const q5 = open.items.find((it) => it.id === "Q5")!;
  const raw = PRIOR_SURVEY_RESPONSES.filter((r) => r.formId === PRIOR_COS.id).map((r) => r.answers.Q5);
  assert.deepEqual([q5.n, q5.cannotSay, q5.atTarget], [raw.filter((v) => typeof v === "number").length, raw.filter((v) => v === "cannot-say").length, raw.filter((v) => typeof v === "number" && v >= 4).length],
    "n excludes cannot say, which is counted beside it");
  const device = (id: string, clientId: string): SurveyResponse => ({ id, formId: "F", term: TERM, answers: {}, collectedAt: "", clientId, source: "booth" });
  assert.equal(respondents([device("a", "dev-00000001"), device("b", "dev-00000001"), device("c", "dev-00000002")]), 2, "a device counts once");
});

test("through the store: surveys need a term, a device answers once, booth responses never count, and only the coordinator releases grades", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(createCourseSurveys("CS310").ok, false, "no term, no survey");
  assert.equal(saveTeachingPlanDetails("CS310", { term: TERM, notes: "" }).ok, true);
  assert.equal(createCourseSurveys("CS310").ok, true);
  assert.equal(createCourseSurveys("CS310").ok, false, "once per course and term");
  const cos = getState().surveys.find((x) => x.subjectId === "CS310" && x.kind === "course-outcome" && x.term === TERM)!;
  assert.equal(cos.questions.filter((q) => q.kind === "scale").length, 5, "built from the course record's five outcomes");
  assert.equal((await openSurveyForCollection(cos.id, 38)).ok, true);
  const opened = getState().surveys.find((x) => x.id === cos.id)!;
  assert.equal(opened.formToken, serverToken(opened.readerSecret!));
  assert.ok(getState().events.some((e) => e.kind === "survey-opened" && e.refs.formId === cos.id));
  const collector = { responses: [
    { clientId: "device-0000000a", answers: { Q1: 4, Q2: 5, Q6: "Clear." } },
    { clientId: "device-0000000b", answers: { Q1: 3, Q5: "cannot-say" } },
    { clientId: "device-0000000a", answers: { Q1: 1 } },
    { clientId: "device-0000000c", answers: { Q1: 9 } },
    { clientId: "device-0000000d", answers: { name: "Aisyah" } },
  ] };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    assert.ok(String(url).includes("/api/survey/" + opened.formToken + "/responses?reader="), "the reader secret reads, through the token's path");
    return new Response(JSON.stringify(collector), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const first = await collectBoothResponses(cos.id);
    assert.deepEqual([first.ok, first.ok && first.added], [true, 2], "two devices; a repeated device, an answer off the scale and an unknown question are refused");
    const again = await collectBoothResponses(cos.id);
    assert.deepEqual([again.ok, again.ok && again.added], [true, 0], "collecting again adds nothing");
  } finally {
    globalThis.fetch = realFetch;
  }
  const booth = getState().surveyResponses.filter((r) => r.formId === cos.id);
  assert.deepEqual(booth.map((r) => [r.source, r.clientId]), [["booth", "device-0000000a"], ["booth", "device-0000000b"]]);
  assert.ok(booth.every((r) => Object.keys(r.answers).every((k) => cos.questions.some((q) => q.id === k))), "nothing kept but answers to the questions");
  login(PEOPLE_IDS.tan);
  assert.equal(recordGradesReleased("CS310", TERM).ok, false, "a lecturer does not release grades");
  login(PEOPLE_IDS.sobri);
  assert.equal(recordGradesReleased("CS310", TERM).ok, true);
  assert.ok(gradesReleased(getState().events, "CS310", TERM));
  assert.equal(surveyReleased(cos, getState().events), true);
  const recap = recapFor(getState(), "CS310", "2026-10-22T10:00:00Z")!;
  assert.deepEqual([recap.survey?.respondents, recap.survey?.booth, recap.survey?.open], [0, 2, false], "the recap counts no booth response, and says how many it left out");
});

test("the Microsoft Forms importer on its fixture: 31 responses, the repeated row and the identity columns dropped, answers matched on the ids", () => {
  const book = XLSX.read(readFileSync(new URL("../public/demo/course-outcome-survey-forms.xlsx", import.meta.url)), { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, raw: true, defval: null }) as unknown[][];
  let n = 0;
  const result = importFormsRows(rows, PRIOR_COS, "2026-10-22T10:00:00Z", () => "IMP-" + ++n);
  assert.deepEqual([result.rows, result.responses.length, result.duplicates, result.skippedAnswers, result.unmatched], [32, 31, 1, 0, []]);
  assert.deepEqual(result.dropped, ["ID", "Start time", "Completion time", "Email", "Name"]);
  const sample = PRIOR_SURVEY_RESPONSES.filter((r) => r.formId === PRIOR_COS.id);
  assert.deepEqual(result.responses.map((r) => r.answers), sample.map((r) => r.answers), "every answer as the sample holds it");
  assert.ok(result.responses.every((r) => r.source === "imported" && r.clientId === null));
  const reworded = rows.map((row, i) => (i === 0 ? row.map((h) => (typeof h === "string" ? h.replace(/I can /, "I am able to ") : h)) : row));
  assert.equal(importFormsRows(reworded, PRIOR_COS, "x", () => "R").responses.length, 31, "a reworded question still matches on its id");
});

test("backups carry the surveys, and refuse a response whose answer fits no question", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const raw = exportWorkspaceBackup();
  const people = PEOPLE.map((p) => p.id);
  const parsed = parseWorkspaceBackup(raw, people);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.ok && [parsed.backup.data.surveys.length, parsed.backup.data.surveyResponses.length], [2, 60]);
  const broken = JSON.parse(raw);
  broken.data.surveyResponses[0].answers.Q1 = 9;
  assert.equal(parseWorkspaceBackup(JSON.stringify(broken), people).ok, false);
  const older = JSON.parse(raw);
  delete older.data.surveys; delete older.data.surveyResponses;
  const restored = parseWorkspaceBackup(JSON.stringify(older), people);
  assert.deepEqual(restored.ok && [restored.backup.data.surveys.length, restored.backup.data.surveyResponses.length], [0, 0], "an earlier schema 6 file restores without them");
  // A response read from a pasted code, with its device id, and the event that records it, restore like any other (D3b).
  const pasted = JSON.parse(raw);
  pasted.data.surveyResponses.push({ id: "SR-PASTE-1", formId: PRIOR_COS.id, term: PRIOR_COS.term, answers: { Q1: 4, Q2: "cannot-say" }, collectedAt: "2026-10-23T01:00:00Z", clientId: "1a2b3c4d-5e6", source: "pasted" });
  pasted.data.events.push({ id: "EV-PASTE-1", at: "2026-10-23T01:00:00Z", byPersonId: PEOPLE_IDS.sobri, kind: "survey-collected", refs: { subjectId: "CS310", formId: PRIOR_COS.id, term: PRIOR_COS.term, count: 1, source: "pasted" } });
  const withPasted = parseWorkspaceBackup(JSON.stringify(pasted), people);
  assert.ok(withPasted.ok && withPasted.backup.data.surveyResponses.some((r) => r.source === "pasted" && r.clientId === "1a2b3c4d-5e6")
    && withPasted.backup.data.events.some((e) => e.refs.source === "pasted"), "a pasted response restores with its device id, and its event with its source");
});

test("the sample: last term's two surveys, 31 and 29 of 38, released with the sample, and nothing in them identifies anyone", () => {
  const s = getState();
  for (const [def, count] of [[PRIOR_COS, 31], [PRIOR_SSRT, 29]] as const) {
    const answers = PRIOR_SURVEY_RESPONSES.filter((r) => r.formId === def.id);
    assert.equal(answers.length, count);
    assert.ok(def.sample && def.sampleReleasedAt && surveyReleased(def, []), "released with the sample, not through the event log");
    assert.ok(answers.every((r) => r.source === "sample" && r.clientId === null && r.term === def.term));
  }
  const comments = PRIOR_SURVEY_RESPONSES.flatMap((r) => Object.entries(r.answers).filter(([, v]) => typeof v === "string" && v !== "cannot-say"));
  assert.equal(comments.length, 12, "a dozen short comments, written for the prototype");
  assert.ok(!s.events.some((e) => e.kind === "grades-released"), "a fresh workspace has no release on its event log");
});

test("the Google Forms importer on its CSV fixture: 31 responses, the Timestamp read for repeats and dropped, an email column dropped and nothing of it kept", () => {
  const book = XLSX.read(readFileSync(new URL("../public/demo/course-outcome-survey-google.csv", import.meta.url), "utf8"), { type: "string", raw: true });
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, raw: true, defval: null }) as unknown[][];
  assert.equal(importFormat(rows[0].map(String)), "google-forms");
  let n = 0;
  const r = importResponseRows(rows, PRIOR_COS, "2026-10-23T01:00:00Z", () => "G-" + ++n);
  assert.deepEqual([r.format, r.rows, r.responses.length, r.duplicates, r.timed, r.skippedAnswers, r.dropped, r.unmatched], ["google-forms", 32, 31, 1, true, 0, ["Timestamp"], []]);
  const sample = PRIOR_SURVEY_RESPONSES.filter((x) => x.formId === PRIOR_COS.id);
  assert.deepEqual(r.responses.map((x) => x.answers), sample.map((x) => x.answers), "every answer as the sample holds it");
  const withEmail = rows.map((row, i) => [row[0], i === 0 ? "Email Address" : "s" + i + "@example.edu", ...row.slice(1)]);
  const e = importResponseRows(withEmail, PRIOR_COS, "x", () => "E");
  assert.deepEqual([e.responses.length, e.duplicates, e.dropped], [31, 1, ["Timestamp", "Email Address"]], "a repeat is the same time and answers, whatever else the row holds");
  assert.ok(!JSON.stringify(e.responses).includes("@example.edu"), "nothing of the email column is kept");
});

test("the Moodle Feedback importer: identity columns dropped, numbers and labels both read, the response number for repeats; without a time column nothing is a repeat", () => {
  const head = ["Response number", "Course", "Date", ...PRIOR_COS.questions.map((q) => "(" + q.id.toLowerCase() + ") " + q.text)];
  const rows = [head,
    [1, "CS310", "1 June 2026, 9:07 AM", "(4) Agree", "Agree", "5", "Cannot say", "Strongly disagree", "Clearer rubrics, please."],
    [2, "CS310", "1 June 2026, 9:20 AM", "(2) Disagree", "3", "", "4", "4", ""],
    [2, "CS310", "1 June 2026, 9:20 AM", "(2) Disagree", "3", "", "4", "4", ""],
    [3, "CS310", "1 June 2026, 9:31 AM", "Agree", "Agree", "Agree", "Agree", "Maybe", ""]];
  const r = importResponseRows(rows, PRIOR_COS, "x", () => "M");
  assert.deepEqual([r.format, r.rows, r.responses.length, r.duplicates, r.skippedAnswers, r.dropped, r.unmatched], ["moodle-feedback", 4, 3, 1, 1, ["Response number", "Course", "Date"], []]);
  assert.deepEqual(r.responses.map((x) => x.answers), [{ Q1: 4, Q2: 4, Q3: 5, Q4: "cannot-say", Q5: 1, Q6: "Clearer rubrics, please." }, { Q1: 2, Q2: 3, Q4: 4, Q5: 4 }, { Q1: 4, Q2: 4, Q3: 4, Q4: 4 }]);
  const untimed = [PRIOR_COS.questions.map((q) => q.text), ["4", "4", "4", "4", "4", ""], ["4", "4", "4", "4", "4", ""]];
  const u = importResponseRows(untimed, PRIOR_COS, "x", () => "U");
  assert.deepEqual([u.format, u.timed, u.responses.length, u.duplicates], ["spreadsheet", false, 2, 0], "two students who answered alike both count");
});

test("the document for Microsoft Forms Quick Import: well-formed parts, each question numbered with its id kept first, the scale lettered under it, labelled untried", async () => {
  const lines = formsDocumentLines(PRIOR_COS, "CS310 Data Visualisation");
  const questions = lines.filter((l) => l.style === "Question").map((l) => l.text);
  assert.deepEqual(questions, PRIOR_COS.questions.map((q, i) => i + 1 + ". " + q.text));
  const q1 = lines.findIndex((l) => l.text.startsWith("1. Q1. "));
  assert.deepEqual(lines.slice(q1 + 1, q1 + 7).map((l) => l.text), ["A. Strongly disagree", "B. Disagree", "C. Neither agree nor disagree", "D. Agree", "E. Strongly agree", "F. Cannot say"]);
  assert.equal(lines.at(-1)!.style, "Question", "the open comment has no options");
  const zip = await JSZip.loadAsync(await formsDocx(PRIOR_COS, "CS310 Data Visualisation"));
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
  assert.deepEqual(names, ["[Content_Types].xml", "_rels/.rels", "word/_rels/document.xml.rels", "word/document.xml", "word/styles.xml"]);
  for (const name of names) assert.equal(wellFormed(await zip.file(name)!.async("string"), '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'), null, name);
  const doc = await zip.file("word/document.xml")!.async("string");
  assert.ok(PRIOR_COS.questions.every((q, i) => doc.includes(">" + (i + 1) + ". " + q.id + ". ")), "every question in the body with its id");
  assert.match(FORMS_DOCX_LABEL, /not yet imported into Forms/);
  // The way back: a Forms export headed by the questions as the document numbers them, an option letter kept or not.
  const back = importResponseRows([["ID", "Start time", "Completion time", "Email", "Name", ...questions], [1, "a", "t1", "", "", "D. Agree", "Agree", "4", "(4) Agree", "E. Strongly agree", ""]], PRIOR_COS, "x", () => "D");
  assert.deepEqual([back.format, back.responses[0].answers], ["microsoft-forms", { Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 5 }]);
});

test("the paste way: a code holds the survey's binding, a device id and the answers, nothing else; read back once per device, another survey's code refused", () => {
  const def = { ...PRIOR_COS, formToken: "AbCdEfGhIjKlMnOpQrStUv" };
  const form = studentForm(def, CS310, DEMO_INSTITUTION, DEMO_LINE, "paste");
  const link = surveyLink("http://192.168.137.1:4173", form);
  assert.ok(link.length < 2000, "the paste link stays under 2,000 characters: " + link.length);
  assert.equal(decodeForm(link.split("#/survey/")[1])?.m, "paste", "and opens the student page in paste mode");
  assert.equal(PASTE_WARNING, "Not anonymous: the channel you paste it into identifies you.");
  assert.ok(readFileSync(new URL("./ui/screens/SurveyPage.tsx", import.meta.url), "utf8").includes("{PASTE_WARNING}"), "the student page says so");
  const code = pasteCode(form, "1a2b3c4d-5e6", { Q1: 4, Q2: "cannot-say", Q3: 5, Q6: "More examples, please." });
  assert.match(code, /^LYC1-[A-Za-z0-9+$-]+$/);
  assert.deepEqual(JSON.parse(LZString.decompressFromEncodedURIComponent(code.slice(5))!), ["AbCdEfGh", "1a2b3c4d-5e6", [4, "c", 5, 0, 0, "More examples, please."]],
    "the binding, the device id and the answers in question order, and nothing that names anyone");
  const other = pasteCode({ ...form, f: "ZZZZZZZZIjKlMnOpQrStUv" }, "9f8e7d6c-5b4", { Q1: 4 });
  let n = 0;
  const r = readPasteCodes("From the forum:\n" + code + "\nagain " + code + "\n" + pasteCode(form, "0a0b0c0d-0e0", { Q1: 2 }) + "\n" + other + "\nLYC1-garbage", def, "2026-10-23T01:00:00Z", () => "P-" + ++n);
  assert.deepEqual([r.codes, r.responses.length, r.repeated, r.otherSurvey, r.unreadable], [5, 2, 1, 1, 1]);
  assert.deepEqual(r.responses.map((x) => x.answers), [{ Q1: 4, Q2: "cannot-say", Q3: 5, Q6: "More examples, please." }, { Q1: 2 }]);
  assert.ok(r.responses.every((x) => x.source === "pasted" && x.formId === def.id && x.clientId !== null));
  assert.equal(readPasteCodes(code, def, "x", () => "Q", ["1a2b3c4d-5e6"]).repeated, 1, "a device read in an earlier paste counts once");
  assert.equal(readPasteCodes(pasteCode(form, "1a2b3c4d-5e7", { Q1: 9 }), def, "x", () => "T").unreadable, 1, "an answer that fits no point reads as nothing");
});
