// Generate the sample intake files (spec Section 10) into public/demo/:
//   results.xlsx          CS310 term results for 38 students, five outcomes, three
//                         without a mark on CLO3: sample, synthetic (depth plan 8.4)
//   results-prior.xlsx    CS310's results for the prior term, the same shape
//   clo-survey.csv        CS220 per-student CLO mastery survey export
//   syllabus.pdf          the CS220 official syllabus (supply-side truth)
//   lecture-slides.pptx   five slides of CS220 lecture content
//   course-outcome-survey-forms.xlsx  CS310's prior-term Course Outcome Survey as
//                         a Microsoft Forms export: sample, synthetic (depth plan 7.4)
//   course-outcome-survey-google.csv  the same survey as Google Forms downloads it
//
// All four are real files built with Node built-ins only: the OOXML zips are
// STORED archives with genuine CRC32s (zlib.crc32, Node 22.2+); the pdf is
// hand-built PDF 1.4 with a correct xref table. These are sample inputs, not
// the only inputs: the intake pipeline parses arbitrary files of these types.
//
// Run with:  npm run gen:demo

import { writeFileSync, mkdirSync } from "node:fs";
import { crc32 } from "node:zlib";
import { PRIOR_COS, PRIOR_SURVEY_RESPONSES } from "../src/data/sample-course/surveys.ts";
import { SCALE_LABELS } from "../src/lib/surveys.ts";
import { RESULTS_HEADER, RESULTS_NOW, RESULTS_PRIOR } from "../src/data/sample-course/results.ts";

const OUT = "public/demo";
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- stored zip
function storedZip(files) {
  const DOS_TIME = 0;
  const DOS_DATE = 0x21;
  const enc = (s) => Buffer.from(s, "utf8");
  const locals = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = enc(f.name);
    const dataBuf = enc(f.data);
    const crc = crc32(dataBuf) >>> 0;
    const size = dataBuf.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, dataBuf);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(DOS_TIME, 12);
    cd.writeUInt16LE(DOS_DATE, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + dataBuf.length;
  }
  const localPart = Buffer.concat(locals);
  const centralPart = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralPart.length, 12);
  eocd.writeUInt32LE(localPart.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localPart, centralPart, eocd]);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------- results.xlsx, results-prior.xlsx
// CS310 Data Visualisation, one row per student, headers a lecturer would actually write (percent marks, a remarks column
// the intake ignores), from src/data/sample-course/results.ts. A student without a mark has a blank or "ABS" in the cell;
// a blank is written as no cell at all, as a spreadsheet saves it.
function resultsWorkbook(sheetName, header, rows) {
  const colRef = (c) => String.fromCharCode(65 + c);
  const cell = (c, r, v) =>
    typeof v === "number"
      ? `<c r="${colRef(c)}${r}"><v>${v}</v></c>`
      : v === "" ? "" : `<c r="${colRef(c)}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  const row = (vals, r) => `<row r="${r}">${vals.map((v, i) => cell(i, r, v)).join("")}</row>`;
  const sheetRows = [row(header, 1), ...rows.map((v, i) => row(v, i + 2))].join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  return storedZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml },
  ]);
}
for (const file of [RESULTS_NOW, RESULTS_PRIOR]) {
  const zip = resultsWorkbook(file.sheetName, RESULTS_HEADER, file.rows);
  writeFileSync(`${OUT}/${file.fileName}`, zip);
  console.log(`Wrote ${OUT}/${file.fileName} (${zip.length} bytes, ${file.rows.length} students)`);
}

// ---------------------------------------------------------------- course-outcome-survey-forms.xlsx
// The prior term's Course Outcome Survey for CS310 (sample, synthetic) as Microsoft Forms exports it: ID, Start time,
// Completion time, Email and Name, then one column per question, headed by the question's text with its id ("Q1.").
// Email and Name are blank, as an anonymous form leaves them; one row is repeated, as a double submission would be, so
// the importer's duplicate rule has something to drop.
{
  const questions = PRIOR_COS.questions;
  const header = ["ID", "Start time", "Completion time", "Email", "Name", ...questions.map((q) => q.text)];
  const answer = (v) => v === undefined ? "" : v === "cannot-say" ? "Cannot say" : typeof v === "number" ? SCALE_LABELS[v - 1] : v;
  const responses = PRIOR_SURVEY_RESPONSES.filter((r) => r.formId === PRIOR_COS.id);
  const time = (k, extra) => "2026-06-0" + (1 + (k % 5)) + " " + String(9 + (k % 8)).padStart(2, "0") + ":" + String((k * 7) % 60).padStart(2, "0") + ":" + String(extra).padStart(2, "0");
  const rows = responses.map((r, k) => [k + 1, time(k, 0), time(k, 41), "", "", ...questions.map((q) => answer(r.answers[q.id]))]);
  rows.push([rows.length + 1, ...rows[4].slice(1)]); // a double submission: the same times and answers, a new ID
  const colRef = (c) => String.fromCharCode(65 + c);
  const cell = (c, r, v) =>
    typeof v === "number"
      ? `<c r="${colRef(c)}${r}"><v>${v}</v></c>`
      : v === "" ? "" : `<c r="${colRef(c)}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  const row = (vals, r) => `<row r="${r}">${vals.map((v, i) => cell(i, r, v)).join("")}</row>`;
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${[row(header, 1), ...rows.map((v, i) => row(v, i + 2))].join("")}</sheetData></worksheet>`;
  const zip = storedZip([
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml },
  ]);
  writeFileSync(`${OUT}/course-outcome-survey-forms.xlsx`, zip);
  console.log(`Wrote ${OUT}/course-outcome-survey-forms.xlsx (${zip.length} bytes, ${rows.length} rows, one of them repeated)`);
}

// ---------------------------------------------------------------- course-outcome-survey-google.csv
// The same prior-term survey as Google Forms downloads its responses (depth plan Section 7.4, D3b): Timestamp first, no
// Email Address column since the form collected none, each header the question's text with its id, a linear scale's number
// as the answer, and one row repeated, as a double submission would be.
{
  const questions = PRIOR_COS.questions;
  const responses = PRIOR_SURVEY_RESPONSES.filter((r) => r.formId === PRIOR_COS.id);
  const csvCell = (v) => { const s = String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const stamp = (k) => String(1 + (k % 5)).padStart(2, "0") + "/06/2026 " + String(9 + (k % 8)).padStart(2, "0") + ":" + String((k * 7) % 60).padStart(2, "0") + ":41";
  const answer = (v) => v === undefined ? "" : v === "cannot-say" ? "Cannot say" : v;
  const rows = responses.map((r, k) => [stamp(k), ...questions.map((q) => answer(r.answers[q.id]))]);
  rows.push(rows[7].slice()); // a double submission: the same timestamp and answers
  const csv = [["Timestamp", ...questions.map((q) => q.text)], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  writeFileSync(`${OUT}/course-outcome-survey-google.csv`, csv);
  console.log(`Wrote ${OUT}/course-outcome-survey-google.csv (${csv.length} bytes, ${rows.length} rows, one of them repeated)`);
}

// ---------------------------------------------------------------- clo-survey.csv
// CS220 per-student CLO mastery survey: integer 1..10 self-ratings.
{
  const lines = ["student_id,CLO4 self-rating"];
  const ratings = [6, 7, 4, 5, 8, 6, 5, 7, 3, 6, 5, 4, 7, 6, 5, 8, 4, 6, 5, 7, 6, 5];
  ratings.forEach((r, i) => lines.push(`S-2${String(i + 1).padStart(3, "0")},${r}`));
  const csv = lines.join("\n") + "\n";
  writeFileSync(`${OUT}/clo-survey.csv`, `# CS220 CLO mastery survey export, 2025-S1\n${csv}`);
  console.log(`Wrote ${OUT}/clo-survey.csv (${csv.length} bytes)`);
}

// ---------------------------------------------------------------- syllabus.pdf
// Hand-built PDF 1.4: one page of Helvetica text with a correct xref table.
{
  const lines = [
    "CS220 Applied Machine Learning",
    "Course Syllabus, Semester 1 2025 (2025-S1)",
    "",
    "Course Learning Outcome",
    "CLO4: Analyse and apply core machine learning methods, including",
    "supervised learning, model evaluation, and regularisation.",
    "",
    "Topics",
    "1. Supervised learning: regression and classification",
    "2. Model evaluation: cross-validation, bias and variance",
    "3. Regularisation and feature engineering",
    "4. Tree ensembles and gradient boosting",
    "5. Neural networks: an introduction",
    "",
    "Prerequisite: MA201 Linear Algebra",
    "Assessment: coursework 40 percent, final examination 60 percent",
    "Course coordinator: Dr Sobri (verified on the faculty course page)",
  ];
  const escapePdf = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content = `BT /F1 11 Tf 56 748 Td 16 TL ${lines
    .map((l, i) => `(${escapePdf(l)}) Tj${i < lines.length - 1 ? " T*" : ""}`)
    .join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  writeFileSync(`${OUT}/syllabus.pdf`, Buffer.from(pdf, "utf8"));
  console.log(`Wrote ${OUT}/syllabus.pdf (${pdf.length} bytes)`);
}

// ---------------------------------------------------------------- lecture-slides.pptx
// Five slides of CS220 lecture content. Minimal PresentationML: the intake
// parser reads ppt/slides/slideN.xml; LibreOffice opens it; PowerPoint may
// offer a repair on so spartan a deck, which is fine for a parsing sample.
{
  const slides = [
    ["CS220 Applied Machine Learning", "Week 7: Model evaluation", "Semester 1 2025"],
    ["Why evaluation matters", "A model that memorises is not a model that learns", "Train, validate, test: three different questions"],
    ["Cross-validation", "K-fold: every observation gets a turn as the judge", "Variance of the estimate falls as folds rise"],
    ["Bias and variance", "Underfit: wrong on average", "Overfit: right on average, wrong in practice", "Regularisation trades one for the other"],
    ["This week's lab", "Evaluate three classifiers on the shared dataset", "Report accuracy with confidence intervals", "Maps to CLO4: machine learning"],
  ];
  const slideXml = (items) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="5715000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${items
    .map((t) => `<a:p><a:r><a:rPr lang="en-US"/><a:t>${esc(t)}</a:t></a:r></a:p>`)
    .join("")}</p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr></p:sld>`;

  const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Min"><a:themeElements><a:clrScheme name="Min"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Min"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Min"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

  const master = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`;

  const layout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

  const relsFor = (target) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${target}"/></Relationships>`;

  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides
        .map(
          (_, i) =>
            `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
        )
        .join("")}</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
    },
    {
      name: "ppt/presentation.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides
        .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`)
        .join("")}</p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    },
    {
      name: "ppt/_rels/presentation.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
        )
        .join("")}</Relationships>`,
    },
    { name: "ppt/slideMasters/slideMaster1.xml", data: master },
    {
      name: "ppt/slideMasters/_rels/slideMaster1.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`,
    },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: layout },
    {
      name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
    },
    { name: "ppt/theme/theme1.xml", data: theme },
    ...slides.flatMap((items, i) => [
      { name: `ppt/slides/slide${i + 1}.xml`, data: slideXml(items) },
      { name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, data: relsFor("../slideLayouts/slideLayout1.xml") },
    ]),
  ];
  const zip = storedZip(files);
  writeFileSync(`${OUT}/lecture-slides.pptx`, zip);
  console.log(`Wrote ${OUT}/lecture-slides.pptx (${zip.length} bytes, ${files.length} parts)`);
}
