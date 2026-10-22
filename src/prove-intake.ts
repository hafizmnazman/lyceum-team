// Proof: the real intake path end to end, no UI and no network. Each shipped
// demo file goes through the actual server parser and the deterministic local
// interpreter, and must classify, map, and file correctly. This is the spec's
// acceptance criterion "dropping each of the four demo files parses,
// interprets, and files correctly" for the offline path.
//
// Run with:  npm run prove:intake

import { readFileSync } from "node:fs";
import { parseSheet } from "../server/parse/sheet.ts";
import { parsePdf } from "../server/parse/pdf.ts";
import { parsePptx } from "../server/parse/office.ts";
import { interpretLocally } from "./agents/intakeLocal.ts";
import { CLOS, SEED_CLOS, SEED_SUBJECTS, SUBJECTS } from "./data/seed.ts";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? `  (${detail})` : ""}`);
  }
}

// ---- results.xlsx: CS310 percent marks for 38 students -> five outcome rows that keep their marks (depth plan 8.2) ----
{
  const doc = parseSheet(readFileSync("public/demo/results.xlsx"), "CS310-results.xlsx", "xlsx");
  check("xlsx parses with one table", doc.tables.length === 1);
  // The app passes its own outcomes: CS310's five, labelled CLO1 to CLO5, beside the other courses' global ids.
  const interp = interpretLocally(doc, SEED_SUBJECTS, SEED_CLOS);
  check("xlsx reads as results", interp.docType === "results", interp.docType);
  check("xlsx guesses CS310", interp.subjectGuess === "CS310", String(interp.subjectGuess));
  check("xlsx guesses the term the file names", interp.termGuess === "2025-S1", String(interp.termGuess));
  const rows = interp.mappedRows ?? [];
  check("xlsx maps each column to CS310's outcome by its label", rows.map((r) => r.cloId).join() === "CS310-1,CS310-2,CS310-3,CS310-4,CLO5", rows.map((r) => r.cloId).join());
  const row = rows.find((r) => r.cloId === "CLO5");
  check("xlsx normalises percents into 0..1", row !== undefined && row.meanScore > 0.5 && row.meanScore < 0.75, row ? row.meanScore.toFixed(3) : "no row");
  check("xlsx lists 38 students on every outcome", rows.length === 5 && rows.every((r) => r.n + (r.missing ?? -99) === 38), rows.map((r) => r.n + "+" + r.missing).join());
  const clo3 = rows.find((r) => r.cloId === "CS310-3");
  check("xlsx keeps CLO3's 35 marks and counts the 3 without one", clo3?.n === 35 && clo3.missing === 3 && clo3.marks?.length === 35, JSON.stringify(clo3 && [clo3.n, clo3.missing]));
  check("xlsx keeps each outcome's marks sorted, out of 100, with no identifier",
    rows.every((r) => r.marks!.every((m, i) => m >= 0 && m <= 100 && (i === 0 || m >= r.marks![i - 1]))) && !/A2[56]\d{3}/.test(JSON.stringify(interp)));
  // With Track A's global ids, CLO1 is CS101's: the course's columns must never land on another course's outcome.
  const global = interpretLocally(doc, SUBJECTS, CLOS);
  check("xlsx never reads a column into another course's outcome", (global.mappedRows ?? []).map((r) => r.cloId).join() === "CLO5" && global.notes.some((n) => n.includes("matches no outcome of CS310")));
}

// ---- results-prior.xlsx: last term's file, the same shape and no gaps ----
{
  const doc = parseSheet(readFileSync("public/demo/results-prior.xlsx"), "results-prior.xlsx", "xlsx");
  const rows = interpretLocally(doc, SEED_SUBJECTS, SEED_CLOS).mappedRows ?? [];
  check("the prior file reads 38 students with a mark on each of the five outcomes", rows.length === 5 && rows.every((r) => r.n === 38 && r.missing === 0), rows.map((r) => r.n + "+" + r.missing).join());
}

// ---- clo-survey.csv: per-student 1..10 ratings -> survey records ----
{
  const doc = parseSheet(readFileSync("public/demo/clo-survey.csv"), "CS220-clo-survey.csv", "csv");
  const interp = interpretLocally(doc, SUBJECTS, CLOS);
  check("csv reads as a survey", interp.docType === "clo-survey", interp.docType);
  check("csv guesses CS220", interp.subjectGuess === "CS220", String(interp.subjectGuess));
  check("csv yields 22 records", interp.surveyRecords?.length === 22, String(interp.surveyRecords?.length));
  const first = interp.surveyRecords?.[0];
  check(
    "csv ratings are 1..10 integers on CLO4",
    first !== undefined && Number.isInteger(first.cloRatings.CLO4) && first.cloRatings.CLO4 >= 1 && first.cloRatings.CLO4 <= 10,
  );
}

// ---- syllabus.pdf: the supply-side truth document ----
{
  const doc = await parsePdf(readFileSync("public/demo/syllabus.pdf"), "syllabus.pdf");
  check("pdf extracts a page of text", doc.pages.length === 1 && doc.pages[0].text.length > 100);
  const interp = interpretLocally(doc, SUBJECTS, CLOS);
  check("pdf reads as a syllabus", interp.docType === "syllabus", interp.docType);
  check("pdf guesses CS220", interp.subjectGuess === "CS220", String(interp.subjectGuess));
}

// ---- lecture-slides.pptx ----
{
  const doc = await parsePptx(readFileSync("public/demo/lecture-slides.pptx"), "lecture-slides.pptx");
  check("pptx extracts five slides", doc.pages.length === 5, String(doc.pages.length));
  check("pptx slide text survives", doc.pages[2].text.includes("Cross-validation"));
  const interp = interpretLocally(doc, SUBJECTS, CLOS);
  check("pptx reads as slides", interp.docType === "slides", interp.docType);
  check("pptx guesses CS220", interp.subjectGuess === "CS220", String(interp.subjectGuess));
}

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
