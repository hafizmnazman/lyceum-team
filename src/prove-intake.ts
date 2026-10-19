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
import { CLOS, SUBJECTS } from "./data/seed.ts";

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

// ---- results.xlsx: CS310 percent marks -> results rows on CLO5 ----
{
  const doc = parseSheet(readFileSync("public/demo/results.xlsx"), "CS310-results.xlsx", "xlsx");
  check("xlsx parses with one table", doc.tables.length === 1);
  const interp = interpretLocally(doc, SUBJECTS, CLOS);
  check("xlsx reads as results", interp.docType === "results", interp.docType);
  check("xlsx guesses CS310", interp.subjectGuess === "CS310", String(interp.subjectGuess));
  check("xlsx guesses the term", interp.termGuess === "2025-S1", String(interp.termGuess));
  const row = interp.mappedRows?.find((r) => r.cloId === "CLO5");
  check("xlsx maps CLO5", Boolean(row));
  check(
    "xlsx normalises percents into 0..1",
    row !== undefined && row.meanScore > 0.5 && row.meanScore < 0.75,
    row ? row.meanScore.toFixed(3) : "no row",
  );
  check("xlsx counts 24 students", row?.n === 24, String(row?.n));
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
