// The two student surveys (depth plan Section 7), as pure functions over records: the instruments built from the course
// record and the institution profile, the form carried in the student's link, the booth collector's token, the importers
// for Microsoft Forms, Google Forms and Moodle Feedback exports, the document for Microsoft Forms Quick Import, the paste
// code, and the rules on screen: the floor (a count and a share of the class, the stricter applied) and the release
// (nothing for the term, aggregates and comments alike, until grades are released). Nothing here identifies a student;
// the store and the screens call these.

import LZString from "lz-string";
import type { CLO, InstitutionProfile, LoopEvent, Subject, SurveyAnswer, SurveyDefinition, SurveyKind, SurveyQuestion, SurveyResponse } from "../types.ts";

export const SCALE_LABELS = ["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"];
export const CANNOT_SAY = "Cannot say";
export const SSRT_NOTE = "A demo instrument written for this prototype, unvalidated: not SEEQ and not UTP's instrument; a campus loads its own.";
export const STUDENT_COMMENT_WARNING = "Comments stay confidential unless you identify yourself in them: write nothing that names you or anyone else.";
export const LECTURER_COMMENT_WARNING = "A comment may identify a student who named themselves in it. Read comments for what they say, never to find who wrote them.";
export const CONSENT_LINE = "Answering is voluntary, and nothing you submit identifies you. Skip any question you prefer not to answer.";
/** The paste way's consent line: the code holds nothing that identifies the student, but where it is pasted does. */
export const PASTE_CONSENT_LINE = "Answering is voluntary; skip any question you prefer not to answer. Your code holds only your answers and a random id from this device.";
export const MAX_COMMENT = 2000;

const lowerFirst = (text: string) => /^[A-Z]{2,}\b/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
const asSentence = (text: string) => lowerFirst(text.trim().replace(/\.+$/, ""));

/** The Course Outcome Survey: one item per outcome, "I can ..." in the outcome's words, and one open comment. */
export function courseOutcomeSurvey(input: { id: string; subject: Pick<Subject, "id" | "title">; outcomes: CLO[]; institution: InstitutionProfile; term: string; versionId: string | null;
  classSize: number | null; at: string; by: string; sample?: boolean }): SurveyDefinition {
  const items: SurveyQuestion[] = input.outcomes.map((o, i) => ({ id: "Q" + (i + 1), kind: "scale", cloId: o.id,
    text: "Q" + (i + 1) + ". I can " + asSentence(o.text) + " (" + (o.label ?? o.id) + ")." }));
  const n = items.length + 1;
  return { id: input.id, subjectId: input.subject.id, kind: "course-outcome", title: input.subject.id + " Course Outcome Survey", term: input.term, versionId: input.versionId,
    scale: { ...input.institution.surveyScale, labels: SCALE_LABELS }, instrumentNote: null, classSize: input.classSize, formToken: null, readerSecret: null,
    questions: [...items, { id: "Q" + n, kind: "comment", text: "Q" + n + ". Is there anything about these outcomes you want your lecturer to know?" }],
    createdAt: input.at, createdBy: input.by, ...(input.sample ? { sample: true } : {}) };
}

/** The SSRT, as a demo instrument: twelve items in this prototype's own words across five dimensions SEEQ names, and two
 *  open comments, labelled unvalidated (UTP names the survey in a job advertisement and publishes no instrument). */
const SSRT_ITEMS: Array<[string, string]> = [
  ["learning", "This course challenged me to think, not only to remember."],
  ["learning", "I learned things in this course that I value."],
  ["learning", "My interest in the subject grew during the course."],
  ["organisation", "The explanations in class were clear."],
  ["organisation", "The course materials were well prepared and easy to follow."],
  ["organisation", "Each class had a purpose I could see."],
  ["breadth", "The course showed how the subject connects to work outside the classroom."],
  ["breadth", "The course showed more than one way to approach a problem."],
  ["assessment", "The assessments tested what the course taught."],
  ["assessment", "Feedback on my work helped me improve."],
  ["workload", "The workload was reasonable for the credit hours."],
  ["workload", "The pace of the course let me keep up."],
];
export function ssrtSurvey(input: { id: string; subject: Pick<Subject, "id" | "title">; institution: InstitutionProfile; term: string; versionId: string | null; classSize: number | null;
  at: string; by: string; sample?: boolean }): SurveyDefinition {
  const items: SurveyQuestion[] = SSRT_ITEMS.map(([dimension, text], i) => ({ id: "Q" + (i + 1), kind: "scale", dimension, text: "Q" + (i + 1) + ". " + text }));
  return { id: input.id, subjectId: input.subject.id, kind: "ssrt", title: input.subject.id + " Student Self Reflection Tools Survey (SSRT, demo instrument)", term: input.term,
    versionId: input.versionId, scale: { ...input.institution.surveyScale, labels: SCALE_LABELS }, instrumentNote: SSRT_NOTE, classSize: input.classSize, formToken: null, readerSecret: null,
    questions: [...items,
      { id: "Q13", kind: "comment", text: "Q13. What helped you learn most in this course?" },
      { id: "Q14", kind: "comment", text: "Q14. What one change would most improve this course?" }],
    createdAt: input.at, createdBy: input.by, ...(input.sample ? { sample: true } : {}) };
}

// ---------- the form in the link, and the collector's token ----------

/** What the student's page needs, and nothing more: no reader secret, no responses, no lecturer. `m: "paste"` marks the
 *  paste way's link, where the page gives the student a code instead of sending the answers (Section 7.2). */
export interface StudentForm {
  v: 1; id: string; f: string; k: SurveyKind; t: string; c: string; term: string;
  q: Array<[string, string, "scale" | "comment"]>; s: [number, number]; note: string | null;
  inst: string; mark: string | null; alt: string | null; ctl: string; priv: string; demo: string | null; m?: "paste";
}
export function studentForm(def: SurveyDefinition, subject: Pick<Subject, "id" | "title">, institution: InstitutionProfile, demoLine: string | null, way?: "paste"): StudentForm {
  if (!def.formToken) throw new Error("Open the survey for collection first.");
  return { v: 1, id: def.id, f: def.formToken, k: def.kind, t: def.title, c: subject.id + " " + subject.title, term: def.term,
    q: def.questions.map((q) => [q.id, q.text, q.kind]), s: [def.scale.min, def.scale.max], note: def.instrumentNote,
    inst: institution.name, mark: institution.showMark && demoLine ? institution.mark.pngSmall : null, alt: institution.showMark && demoLine ? institution.mark.alt : null,
    ctl: institution.controller, priv: institution.privacyNoticeUrl, demo: demoLine, ...(way ? { m: way } : {}) };
}
export const encodeForm = (form: StudentForm) => LZString.compressToEncodedURIComponent(JSON.stringify(form));
export const surveyLink = (origin: string, form: StudentForm) => origin.replace(/\/+$/, "") + "/#/survey/" + encodeForm(form);
/** The form from a link's fragment, or null when the fragment is not one this build wrote. */
export function decodeForm(encoded: string): StudentForm | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded);
    return raw ? validForm(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
/** A form as this build writes it, from a link or from the collector, or null. */
export function validForm(x: unknown): StudentForm | null {
  const f = x as StudentForm;
  const ok = !!f && typeof f === "object" && f.v === 1 && typeof f.f === "string" && /^[A-Za-z0-9_-]{22}$/.test(f.f) && typeof f.t === "string" && typeof f.c === "string" &&
    Array.isArray(f.q) && f.q.length > 0 && f.q.length <= 60 &&
    f.q.every((q) => Array.isArray(q) && typeof q[0] === "string" && /^Q\d{1,2}$/.test(q[0]) && typeof q[1] === "string" && (q[2] === "scale" || q[2] === "comment")) &&
    Array.isArray(f.s) && Number.isInteger(f.s[0]) && Number.isInteger(f.s[1]) && f.s[0] < f.s[1] && f.s[1] - f.s[0] <= 10 && (f.m === undefined || f.m === "paste");
  return ok ? f : null;
}
/** The short link the QR carries: the token only; the page fetches the form from the collector that holds it. */
export const shortSurveyLink = (origin: string, formToken: string) => origin.replace(/\/+$/, "") + "/#/survey/t/" + formToken;

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/** A new reader secret: 24 random bytes. It never leaves the lecturer's workspace except to read the responses. */
export function newReaderSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}
/** The submission token in the student's link: the first 22 characters of the secret's SHA-256, base64url. The collector
 *  checks a reader against it, so it needs to keep no secret, and the token cannot be turned back into one. */
export async function formTokenFor(readerSecret: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(readerSecret)));
  return b64url(digest).slice(0, 22);
}

/** A response the booth collector returned, kept only when every answer fits its question; null otherwise. */
export function boothAnswers(def: SurveyDefinition, raw: unknown): Record<string, SurveyAnswer> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, SurveyAnswer> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const q = def.questions.find((x) => x.id === id);
    if (!q) return null;
    if (q.kind === "scale") {
      if (value === "cannot-say" || (typeof value === "number" && Number.isInteger(value) && value >= def.scale.min && value <= def.scale.max)) out[id] = value as SurveyAnswer;
      else return null;
    } else if (typeof value === "string") {
      if (value.trim()) out[id] = value.trim().slice(0, MAX_COMMENT);
    } else return null;
  }
  return out;
}

// ---------- the rules on screen ----------

/** The floor from the profile: a count and a share of the class, the stricter applied; the share needs the class size. */
export function surveyFloor(institution: InstitutionProfile, classSize: number | null) {
  const share = classSize ? Math.ceil(institution.surveyFloorShare * classSize) : null;
  return { count: institution.surveyFloor, sharePercent: Math.round(institution.surveyFloorShare * 100), share, classSize, required: Math.max(institution.surveyFloor, share ?? 0) };
}
/** The coordinator's record that the term's grades are released, which opens the term's survey results. */
export function gradesReleased(events: LoopEvent[], subjectId: string, term: string): LoopEvent | null {
  return events.filter((e) => e.kind === "grades-released" && e.refs.subjectId === subjectId && e.refs.term === term).at(-1) ?? null;
}
/** Whether a survey's term is released: its grades-released event, or for a sample term the release recorded with it. */
export function surveyReleased(def: SurveyDefinition, events: LoopEvent[]): boolean {
  return Boolean(gradesReleased(events, def.subjectId, def.term)) || Boolean(def.sample && def.sampleReleasedAt);
}
/** How many answered: booth responses by the distinct devices that sent them, the others one each. */
export function respondents(responses: SurveyResponse[]): number {
  const devices = new Set(responses.filter((r) => r.clientId).map((r) => r.clientId));
  return devices.size + responses.filter((r) => !r.clientId).length;
}

export interface ItemSummary { id: string; text: string; cloId?: string; dimension?: string; n: number; cannotSay: number; unanswered: number; mean: number | null; atTarget: number; share: number | null; counts: number[] }
export interface SurveySummary {
  respondents: number; floor: ReturnType<typeof surveyFloor>; floorMet: boolean; released: boolean;
  open: boolean;                      // the floor is met and grades are released: only then are results shown
  items: ItemSummary[];               // empty unless open
  comments: Array<{ id: string; text: string; answers: string[] }>; // empty unless open
  rate: string | null;                // "31 of 38, 82%", when the class size is known
}
/** A survey's results under the rules: nothing but the count until the floor is met and grades are released. Booth
 *  responses never reach this function from a report; the caller passes the responses that count. */
export function surveySummary(def: SurveyDefinition, responses: SurveyResponse[], institution: InstitutionProfile, released: boolean): SurveySummary {
  const mine = responses.filter((r) => r.formId === def.id);
  const n = respondents(mine), floor = surveyFloor(institution, def.classSize);
  const floorMet = n >= floor.required, open = floorMet && released;
  const rate = def.classSize ? n + " of " + def.classSize + ", " + Math.round((n / def.classSize) * 100) + "%" : null;
  if (!open) return { respondents: n, floor, floorMet, released, open, items: [], comments: [], rate };
  const points = def.scale.max - def.scale.min + 1;
  const items = def.questions.filter((q) => q.kind === "scale").map((q): ItemSummary => {
    const values = mine.map((r) => r.answers[q.id]);
    const scores = values.filter((v): v is number => typeof v === "number");
    const counts = Array.from({ length: points }, (_, i) => scores.filter((v) => v === def.scale.min + i).length);
    const atTarget = scores.filter((v) => v >= def.scale.target).length;
    return { id: q.id, text: q.text, cloId: q.cloId, dimension: q.dimension, n: scores.length, cannotSay: values.filter((v) => v === "cannot-say").length,
      unanswered: values.filter((v) => v === undefined || v === "").length, mean: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null,
      atTarget, share: scores.length ? atTarget / scores.length : null, counts };
  });
  const comments = def.questions.filter((q) => q.kind === "comment").map((q) => ({ id: q.id, text: q.text,
    answers: mine.map((r) => r.answers[q.id]).filter((v): v is string => typeof v === "string" && v !== "cannot-say" && v.trim() !== "") }));
  return { respondents: n, floor, floorMet, released, open, items, comments, rate };
}

/** The response rate's context, as the research note reports it, never as a standard. */
export const RATE_CONTEXT = "Nulty's figures, reported by Ahmad (2018), are about 58% for a class under 20 and 35% for one over 50; online surveys at Monash drew 31% (Nair et al. 2008).";

// ---------- the importers (depth plan Section 7.2): Microsoft Forms, Google Forms and Moodle Feedback ----------

export type ImportFormat = "microsoft-forms" | "google-forms" | "moodle-feedback" | "spreadsheet";
export const FORMAT_LABEL: Record<ImportFormat, string> = {
  "microsoft-forms": "a Microsoft Forms export", "google-forms": "a Google Forms export", "moodle-feedback": "a Moodle Feedback export",
  spreadsheet: "a table with the question ids in its headers",
};
/** Each format's identity and bookkeeping columns, dropped at import so nothing of them is kept, and the column that times a
 *  response, which the repeat rule reads. Moodle Feedback's columns are not in the research note, so they are the names
 *  Moodle's response tables use, and that importer has not been tried on a Moodle export. */
const FORMATS: Record<ImportFormat, { drop: RegExp; time: RegExp | null }> = {
  "microsoft-forms": { drop: /^(id|start time|completion time|email|name|last modified time|total points|quiz feedback)$/i, time: /^completion time$/i },
  "google-forms": { drop: /^(timestamp|email address|score)$/i, time: /^timestamp$/i },
  "moodle-feedback": { drop: /^(response number|user picture|full name|first name|surname|last name|username|user|email address|id number|groups?|course|date|time modified|completed)$/i,
    time: /^(response number|date|time modified|completed)$/i },
  spreadsheet: { drop: /^(id|timestamp|email|email address|name|full name|username)$/i, time: null },
};
/** A column's question id: "Q3." at the start of its header, after a list number or a bracketed label if a tool added one. */
const QUESTION_ID = /^(?:\d+[.)]\s*)?(?:\([^)]*\)\s*)?(Q\d{1,2})\.\s/;

/** Which export a header row comes from. */
export function importFormat(header: string[]): ImportFormat {
  const h = header.map((x) => x.trim().toLowerCase());
  if (h.includes("start time") && h.includes("completion time")) return "microsoft-forms";
  if (h[0] === "timestamp") return "google-forms";
  if (h.some((x) => /^(response number|user picture|time modified|full name|surname)$/.test(x))) return "moodle-feedback";
  return "spreadsheet";
}

/** A scale answer from an export's cell: the point's number alone or before its label, the label itself, either after an
 *  option letter a tool kept ("D. Agree"), or Cannot say; null when it fits no point. */
export function scalePoint(cell: unknown, def: Pick<SurveyDefinition, "scale">): SurveyAnswer | null {
  if (typeof cell === "number") return Number.isInteger(cell) && cell >= def.scale.min && cell <= def.scale.max ? cell : null;
  const text = String(cell).trim().replace(/^[A-Z][.)]\s+/, "");
  if (text.toLowerCase() === CANNOT_SAY.toLowerCase()) return "cannot-say";
  const lead = /^\(?(\d+)\)?(?:\s|$)/.exec(text);
  const n = lead ? Number(lead[1]) : def.scale.min + def.scale.labels.findIndex((l) => l.toLowerCase() === text.toLowerCase());
  return Number.isInteger(n) && n >= def.scale.min && n <= def.scale.max ? n : null;
}

export interface ImportResult {
  format: ImportFormat; responses: SurveyResponse[]; rows: number; duplicates: number;
  timed: boolean; // whether the file has a time column, without which no row is taken for a repeat
  dropped: string[]; unmatched: string[]; skippedAnswers: number;
}

/** Rows of an export (the header row first), matched to the survey on the question id at the start of each column's text,
 *  not the wording. The format's identity columns are dropped; a repeated row (the same time and the same answers) is
 *  counted and dropped, and in a file without a time column nothing is dropped as a repeat, since two students may answer
 *  alike; an answer that fits no scale point is counted and left out. */
export function importResponseRows(rows: unknown[][], def: SurveyDefinition, at: string, nextId: () => string, format?: ImportFormat): ImportResult {
  const header = (rows[0] ?? []).map((h) => String(h ?? "").trim());
  const kind = format ?? importFormat(header), rule = FORMATS[kind];
  const columns = header.map((h) => { const m = QUESTION_ID.exec(h); return m && def.questions.some((q) => q.id === m[1]) ? m[1] : null; });
  const dropped = header.filter((h, i) => !columns[i] && rule.drop.test(h));
  const unmatched = header.filter((h, i) => h && !columns[i] && !rule.drop.test(h));
  const time = rule.time ? header.findIndex((h) => rule.time!.test(h)) : -1;
  const seen = new Set<string>();
  const responses: SurveyResponse[] = [];
  let duplicates = 0, skippedAnswers = 0, rowCount = 0;
  for (const row of rows.slice(1)) {
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    rowCount++;
    const answers: Record<string, SurveyAnswer> = {};
    columns.forEach((id, i) => {
      if (!id) return;
      const q = def.questions.find((x) => x.id === id)!;
      const cell = row[i];
      if (cell === null || cell === undefined || String(cell).trim() === "") return;
      if (q.kind === "comment") { answers[id] = String(cell).trim().slice(0, MAX_COMMENT); return; }
      const point = scalePoint(cell, def);
      if (point === null) skippedAnswers++;
      else answers[id] = point;
    });
    if (time >= 0) {
      const key = String(row[time] ?? "") + "|" + JSON.stringify(answers);
      if (seen.has(key)) { duplicates++; continue; }
      seen.add(key);
    }
    responses.push({ id: nextId(), formId: def.id, term: def.term, answers, collectedAt: at, clientId: null, source: "imported" });
  }
  return { format: kind, responses, rows: rowCount, duplicates, timed: time >= 0, dropped, unmatched, skippedAnswers };
}
/** D3a's Microsoft Forms importer, by its name. */
export const importFormsRows = (rows: unknown[][], def: SurveyDefinition, at: string, nextId: () => string) => importResponseRows(rows, def, at, nextId, "microsoft-forms");

// ---------- the paste way (Section 7.2) ----------

export const PASTE_WARNING = "Not anonymous: the channel you paste it into identifies you.";
const PASTE_PREFIX = "LYC1-";
const PASTE_CODE = /LYC1-[A-Za-z0-9+$-]+/g;

/** The student's code: the survey's binding (its token's first eight characters), a random id drawn on the device, and the
 *  answers in the form's question order, compressed. Nothing else is in it. */
export function pasteCode(form: Pick<StudentForm, "f" | "q">, device: string, answers: Record<string, SurveyAnswer>): string {
  const values = form.q.map(([id]) => { const a = answers[id]; return a === undefined ? 0 : a === "cannot-say" ? "c" : a; });
  return PASTE_PREFIX + LZString.compressToEncodedURIComponent(JSON.stringify([form.f.slice(0, 8), device.slice(0, 12), values]));
}

export interface PasteResult { responses: SurveyResponse[]; codes: number; repeated: number; otherSurvey: number; unreadable: number }

/** Codes pasted from a course page or an email, read into the survey: each checked against its questions, a code from a
 *  device already read (in this paste or an earlier one) counted and dropped, a code for another survey refused, one that
 *  does not read counted. The device's random id is kept as the response's client id, so a device counts once, as at the
 *  booth; the code never says who pasted it. */
export function readPasteCodes(text: string, def: SurveyDefinition, at: string, nextId: () => string, knownDevices: Iterable<string> = []): PasteResult {
  const codes = text.match(PASTE_CODE) ?? [];
  const devices = new Set(knownDevices);
  const responses: SurveyResponse[] = [];
  let repeated = 0, otherSurvey = 0, unreadable = 0;
  for (const code of codes) {
    let parsed: unknown = null;
    try { parsed = JSON.parse(LZString.decompressFromEncodedURIComponent(code.slice(PASTE_PREFIX.length)) || "null"); } catch { parsed = null; }
    if (!Array.isArray(parsed) || parsed.length !== 3 || typeof parsed[0] !== "string" || typeof parsed[1] !== "string" || !Array.isArray(parsed[2])) { unreadable++; continue; }
    const [binding, device, values] = parsed as [string, string, unknown[]];
    if (!def.formToken || binding !== def.formToken.slice(0, 8)) { otherSurvey++; continue; }
    if (!/^[A-Za-z0-9-]{8,12}$/.test(device) || values.length !== def.questions.length) { unreadable++; continue; }
    const answers = boothAnswers(def, Object.fromEntries(def.questions.flatMap((q, i) => (values[i] === 0 ? [] : [[q.id, values[i] === "c" ? "cannot-say" : values[i]]]))));
    if (!answers) { unreadable++; continue; }
    if (devices.has(device)) { repeated++; continue; }
    devices.add(device);
    responses.push({ id: nextId(), formId: def.id, term: def.term, answers, collectedAt: at, clientId: device, source: "pasted" });
  }
  return { responses, codes: codes.length, repeated, otherSurvey, unreadable };
}

// ---------- the document for Microsoft Forms Quick Import (Section 7.2) ----------

export const FORMS_DOCX_LABEL = "Shaped for Microsoft Forms Quick Import, which builds a form from a Word file; not yet imported into Forms, so that test is planned.";
const LETTERS = "ABCDEFGHIJKLMNOP";
export type DocLine = { text: string; style: "Title" | "Normal" | "Question" | "Option" };

/** The survey as the document's lines: the title, the course and the term, the consent line, the comment warning and any
 *  instrument note, then each question numbered with its id kept at the start of its text, and under a scale question its
 *  points (the labels when the scale has one for each point) and Cannot say, lettered. */
export function formsDocumentLines(def: SurveyDefinition, courseLine: string): DocLine[] {
  const span = def.scale.max - def.scale.min + 1;
  const points = def.scale.labels.length === span ? def.scale.labels : Array.from({ length: span }, (_, i) => String(def.scale.min + i));
  const lines: DocLine[] = [{ text: def.title, style: "Title" }, { text: courseLine + " · " + def.term, style: "Normal" },
    { text: CONSENT_LINE, style: "Normal" }, { text: STUDENT_COMMENT_WARNING, style: "Normal" }];
  if (def.instrumentNote) lines.push({ text: def.instrumentNote, style: "Normal" });
  def.questions.forEach((q, i) => {
    lines.push({ text: i + 1 + ". " + q.text, style: "Question" });
    if (q.kind === "scale") [...points, CANNOT_SAY].forEach((p, k) => lines.push({ text: LETTERS[k] + ". " + p, style: "Option" }));
  });
  return lines;
}

const xmlText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
/** The four parts of a minimal Word document: the package's content types and relationships, the styles and the body. */
export function formsDocumentParts(lines: DocLine[]): Record<string, string> {
  const style = (id: string, name: string, run: string, para = "") => '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/><w:basedOn w:val="Normal"/><w:qFormat/>'
    + (para ? "<w:pPr>" + para + "</w:pPr>" : "") + "<w:rPr>" + run + "</w:rPr></w:style>";
  return {
    "[Content_Types].xml": DECLARATION + "\n" + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    "_rels/.rels": DECLARATION + "\n" + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    "word/_rels/document.xml.rels": DECLARATION + "\n" + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "word/styles.xml": DECLARATION + "\n" + "<w:styles " + W + '><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:style>'
      + style("Title", "Title", '<w:b/><w:sz w:val="36"/>') + style("Question", "Question", '<w:b/>', '<w:spacing w:before="240" w:after="80"/>') + style("Option", "Option", "", '<w:ind w:left="360"/><w:spacing w:after="40"/>') + "</w:styles>",
    "word/document.xml": DECLARATION + "\n" + "<w:document " + W + "><w:body>"
      + lines.map((l) => '<w:p><w:pPr><w:pStyle w:val="' + l.style + '"/></w:pPr><w:r><w:t xml:space="preserve">' + xmlText(l.text) + "</w:t></w:r></w:p>").join("")
      + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>',
  };
}

interface ZipInstance { file: (path: string, content: string, options?: { date?: Date }) => void; generateAsync: (options: { type: "uint8array"; compression?: string }) => Promise<Uint8Array> }
type ZipCtor = new () => ZipInstance;
/** The .docx itself, written with jszip loaded on demand, every entry at the survey's own date so the same survey makes the same file. */
export async function formsDocx(def: SurveyDefinition, courseLine: string): Promise<Uint8Array> {
  const mod = (await import("jszip")) as unknown as { default?: ZipCtor } & ZipCtor;
  const JSZip = (mod.default ?? mod) as ZipCtor;
  const zip = new JSZip();
  const date = new Date(Date.parse(def.createdAt) || 0);
  for (const [path, content] of Object.entries(formsDocumentParts(formsDocumentLines(def, courseLine)))) zip.file(path, content, { date });
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
