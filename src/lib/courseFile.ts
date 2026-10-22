// The course file in one click (depth plan Section 4.4): the course record as a zip, in the order EAC lists a course
// file (Engineering Programme Accreditation Standard 2020, item viii, in docs/research/course-records-and-surveys-
// 2026-10-22.md), with a manifest that marks each item present, sample, not yet built (naming the package that builds
// it) or not included, so the file shows its own gaps. Course-file shape, not accreditation: nothing here claims the
// course is accredited or accreditable. jszip is loaded on demand, like pptxgenjs, so the main bundle stays small.

import type { BriefDecision, CourseDefinition, CqiNote, EvidenceBrief, InstitutionProfile, ObeReport, Person, ProgrammeOutcome, Rubric, Subject, SubjectVersion, TeachingSession } from "../types.ts";
import { NON_RESPONSE_LABEL, PLO_LINE, constructsLine, methodLine, pctText } from "./attainment.ts";
import { assessmentOf, capitalise, learningTime, listText, tableOfSpecifications, topicHours } from "./curriculum.ts";
import { LEARN_CLAIM } from "./learn.ts";
import { courseMisconceptions, itemsMarkdown, lintItem, moodleXml, passes, reviewLine, rubricRows, type ItemContext } from "./items.ts";

export type ManifestStatus = "present" | "sample" | "not yet built" | "not included";
export interface ManifestEntry { item: string; status: ManifestStatus; detail: string; files: string[] }
export interface CourseFilePack { fileName: string; week: number; bytes: Uint8Array; sample?: boolean; full?: boolean }
export interface CourseFileInput {
  subject: Subject; definition: CourseDefinition; versionId: string; rubrics: Rubric[]; plos: ProgrammeOutcome[];
  versions: SubjectVersion[]; decisions: BriefDecision[]; briefs: EvidenceBrief[]; people: Person[];
  packs: CourseFilePack[]; sessions?: TeachingSession[]; institution: InstitutionProfile; mark: Uint8Array | null; demoLine: string | null; generatedAt: string;
  // D4a: the latest OBE course report saved for the course, as printed, and the CQI note it carries.
  obeReport?: ObeReport | null; cqiNote?: CqiNote | null;
}

export const MARK_FILE = "institution-mark.png";
const pipe = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const row = (cells: Array<string | number>) => "| " + cells.map((c) => pipe(String(c))).join(" | ") + " |";
const table = (header: string[], rows: Array<Array<string | number>>) => [row(header), "|" + header.map(() => ":--").join("|") + "|", ...rows.map(row)].join("\n");
const personName = (people: Person[], id: string) => people.find((p) => p.id === id)?.name ?? id;
const rubricFile = (r: Rubric) => "rubrics/" + r.id + ".md";
const labFile = (subject: Subject, s: TeachingSession) => "lab-sheets/" + subject.id + "-week-" + s.week + "-lab-sheet.md";
const briefFile = (subject: Subject, s: TeachingSession) => "project/" + subject.id + "-week-" + s.week + "-project-brief.md";
export const OBE_FILE = "obe-course-report.md";
const rubricSheet = (r: Rubric) => "rubrics/" + r.id + ".xlsx";
const itemsFile = (subject: Subject, s: TeachingSession, ext: string) => "items/" + subject.id + "-week-" + s.week + "-items." + ext;
const itemContext = (input: CourseFileInput, s: TeachingSession): ItemContext => ({ subjectId: input.subject.id, week: s.week, topic: s.topic,
  labels: (id) => input.definition.outcomes.find((o) => o.id === id)?.label ?? id, people: input.people, demoLine: input.demoLine });
const count = (n: number, noun: string) => n + " " + noun + (n === 1 ? "" : "s");

/** The files the zip holds, by path. */
function files(input: CourseFileInput): Map<string, string | Uint8Array> {
  const out = new Map<string, string | Uint8Array>();
  out.set("course-information.md", courseInformationMarkdown(input));
  const exams = (input.definition.assessment ?? []).filter((a) => a.kind === "exam");
  if (exams.length) out.set("final-examination-outline.md", examMarkdown(input));
  for (const r of input.rubrics) out.set(rubricFile(r), rubricMarkdown(input, r));
  // Each session's items: the Moodle XML of those that pass the lint, and every item listed with its lint (depth plan Section 10).
  const misconceptions = courseMisconceptions(input.definition);
  for (const s of (input.sessions ?? []).filter((x) => x.items?.length)) {
    const ctx = itemContext(input, s);
    out.set(itemsFile(input.subject, s, "xml"), moodleXml(s.items!.filter((i) => passes(lintItem(i, misconceptions))), ctx));
    out.set(itemsFile(input.subject, s, "md"), itemsMarkdown(s.items!, ctx, misconceptions));
  }
  if (input.obeReport) out.set(OBE_FILE, obeReportMarkdown({ title: input.definition.title, demoLine: input.demoLine, people: input.people, cqiNote: input.cqiNote ?? null, institution: input.institution, saved: true }, input.obeReport));
  out.set("decisions-and-versions.md", decisionsMarkdown(input));
  for (const p of input.packs) out.set("packs/" + p.fileName, p.bytes);
  for (const s of input.sessions ?? []) {
    if (s.labSheet) out.set(labFile(input.subject, s), s.labSheet);
    if (s.projectBrief) out.set(briefFile(input.subject, s), s.projectBrief);
  }
  if (input.mark && input.institution.showMark) out.set(MARK_FILE, input.mark);
  return out;
}

/** The manifest in EAC's course-file order, then what Lyceum adds. Each status says what is in the zip today. */
export function courseFileManifest(input: CourseFileInput): ManifestEntry[] {
  const d = input.definition, sample = Boolean(d.sample);
  const have = (ok: boolean): ManifestStatus => (ok ? (sample ? "sample" : "present") : "not included");
  const linked = d.outcomes.some((o) => (o.ploLinks ?? []).length || o.ploIds.length);
  const exams = (d.assessment ?? []).filter((a) => a.kind === "exam");
  const info = ["course-information.md"];
  const labs = (input.sessions ?? []).filter((s) => s.labSheet), briefs = (input.sessions ?? []).filter((s) => s.projectBrief);
  const samplePacks = input.packs.filter((p) => p.sample), ownPacks = input.packs.filter((p) => !p.sample);
  const fromSample = (list: TeachingSession[]) => (list.some((s) => s.sample) ? "sample" : "present") as ManifestStatus;
  const withItems = (input.sessions ?? []).filter((s) => s.items?.length);
  return [
    { item: "Course learning outcomes", status: have(d.outcomes.length > 0), files: info, detail: d.outcomes.length + " outcomes, each with its Bloom level" + (d.outcomes.some((o) => o.mqfCluster) ? ", MQF cluster" : "") + " and the assessment that evidences it" },
    { item: "The matrix linking course outcomes to programme outcomes", status: have(linked), files: linked ? info : [], detail: linked ? "A level, H, M or L, in every linked cell; the levels are strengths, not scores" : "No programme outcome mapping is recorded for this course" },
    { item: "Course synopsis and syllabus", status: have(Boolean(d.synopsis) || d.topics.length > 0), files: info, detail: [d.synopsis ? "the synopsis" : "", d.topics.length ? "a " + d.topics.length + "-topic schedule" : "", d.slt ? "student learning time" : "", d.assessment?.length ? "the assessment plan and its table of specifications" : ""].filter(Boolean).join(", ") || "Not recorded" },
    { item: "List of references", status: have((d.references ?? []).length > 0), files: (d.references ?? []).length ? info : [], detail: count((d.references ?? []).length, "reference") + (d.referencesGap ? "; " + d.referencesGap.charAt(0).toLowerCase() + d.referencesGap.slice(1) : "") },
    { item: "Examination papers with marking schemes: the final examination's outline", status: have(exams.length > 0), files: exams.length ? ["final-examination-outline.md"] : [], detail: exams.length ? "Its sections, marks by outcome and Bloom level, and the marking scheme" : "No examination is recorded" },
    { item: "Examination papers with marking schemes: the quiz items", status: withItems.length ? fromSample(withItems) : "not included", files: withItems.flatMap((s) => [itemsFile(input.subject, s, "xml"), itemsFile(input.subject, s, "md")]),
      detail: withItems.length ? withItems.map((s) => count(s.items!.length, "item") + " for week " + s.week + " (" + reviewLine(s.items!, input.people).replace(/\.$/, "").toLowerCase() + ")").join("; ")
        + ", each listed with the surface lint, and as Moodle XML of the items that pass it, not yet imported into a Moodle" : "No session carries items yet; the templates draft them on Teach" },
    { item: "Graded examination papers at low, medium and high grades", status: "not included", files: [], detail: "Synthetic student work would be one step too far from honest" },
    { item: "Projects: the project brief", status: briefs.length ? fromSample(briefs) : "not included", files: briefs.map((s) => briefFile(input.subject, s)),
      detail: briefs.length ? "Released in week " + briefs.map((s) => s.week).join(", ") + ": the task, what is handed in, the defence, the dates and the marking" : "No project brief is saved" },
    { item: "Tutorial questions and assignments: the lab sheets", status: labs.length ? fromSample(labs) : "not included", files: labs.map((s) => labFile(input.subject, s)),
      detail: labs.length ? count(labs.length, "lab sheet") + ", for week" + (labs.length > 1 ? "s " : " ") + listText(labs.map((s) => String(s.week))) + "; every lab's task is in the schedule" : "No lab sheet is saved; each lab's task is in the schedule" },
    { item: "Copies of the course notes: the teaching packs", status: samplePacks.length ? "sample" : ownPacks.length ? "present" : "not included", files: input.packs.map((p) => "packs/" + p.fileName),
      detail: input.packs.length ? [samplePacks.length ? count(samplePacks.length, "sample pack") + " (" + samplePacks.filter((p) => p.full).length + " with full slides, the rest outline packs that say the lecturer's slides are not written yet)" : "",
        ownPacks.length ? count(ownPacks.length, "pack") + " from the lecturer's own sessions" : ""].filter(Boolean).join(" and ") : "No session is saved yet" },
    { item: "Samples of projects at low, medium and high grades", status: "not included", files: [], detail: "Synthetic student work would be one step too far from honest" },
    { item: "Assessment rubrics", status: have(input.rubrics.length > 0), files: input.rubrics.flatMap((r) => [rubricFile(r), rubricSheet(r)]), detail: input.rubrics.length ? count(input.rubrics.length, "rubric") + " with marks per criterion and the outcomes each evidences, as Markdown and as a spreadsheet" : "No rubric is recorded" },
    { item: "The OBE course report with its CQI note", status: input.obeReport ? (input.obeReport.sample || sample ? "sample" : "present") : "not included", files: input.obeReport ? [OBE_FILE] : [],
      detail: input.obeReport ? "Saved on " + input.obeReport.printedAt.slice(0, 10) + " for " + input.obeReport.term + " at a pass mark of " + input.obeReport.passMark + " and a KPI of " + pctText(input.obeReport.studentShare)
        + " of students, on " + (input.obeReport.versionId ?? "a version not recorded") + (input.cqiNote ? ", with its CQI note" : "; no CQI note was saved with it")
        : "No OBE report is saved for this course yet; Learn builds it from the term's results and saves it as printed" },
    { item: "Decisions and versions", status: "present", files: ["decisions-and-versions.md"], detail: count(input.versions.length, "version") + " and " + count(input.decisions.length, "decision") + " on record" },
    { item: "The external examiner's report", status: "not included", files: [], detail: "No external examiner has reviewed this course" },
  ];
}

export function manifestMarkdown(input: CourseFileInput, manifest = courseFileManifest(input)): string {
  return ["# Course file manifest: " + input.subject.id + " " + input.definition.title, "",
    "Generated by Lyceum on " + input.generatedAt + " from version " + input.versionId + ". The items follow the order EAC lists a course file (Engineering Programme Accreditation Standard 2020, item viii); the demo's frame is MQA's. This is the shape of a course file, not an accreditation. No accreditation is claimed.", "",
    "Status: present; sample (written for this prototype and synthetic); not yet built (the package that builds it); not included (and why).", "",
    table(["#", "Item", "Status", "Files", "Detail"], manifest.map((m, i) => [i + 1, m.item, m.status, m.files.join(", ") || "none", m.detail])),
    ...(input.demoLine ? ["", input.demoLine] : []), ""].join("\n");
}

export function courseInformationMarkdown(input: CourseFileInput): string {
  const { subject, definition: d, institution } = input;
  const label = (id: string) => d.outcomes.find((o) => o.id === id)?.label ?? id;
  const time = learningTime(d);
  const lines: string[] = ["# " + subject.id + " " + d.title + ": course information", ""];
  if (input.mark && institution.showMark) lines.push("![" + institution.mark.alt + "](" + MARK_FILE + ")", "");
  lines.push(institution.name + " · " + (d.brief.programmeTitle || "Programme not recorded") + " · version " + input.versionId + " · generated " + input.generatedAt, "");
  if (input.demoLine) lines.push("> " + input.demoLine, "");
  if (d.source) lines.push(d.source, "");
  lines.push("## 1. Course information", "", table(["Field", "Value"], [
    ["Credits", d.brief.credits ?? "Not recorded"], ["Teaching weeks", d.brief.teachingWeeks ?? "Not recorded"], ["Level", d.brief.level || "Not recorded"],
    ["Language", d.brief.language || "Not recorded"], ["Contact-hour budget", d.brief.contactHours ?? "Not recorded"], ["Self-study budget", d.brief.selfStudyHours ?? "Not recorded"],
    ["Teaching and learning methods", capitalise(listText(d.methods ?? [])) || "Not recorded"], ["Framework", d.brief.framework || "Not recorded"], ["Roles", d.brief.targetRoles || "Not recorded"],
  ]), "");
  lines.push("## 2. Synopsis", "", d.synopsis || "No synopsis recorded.", "");
  lines.push("## 3. Course learning outcomes", "", table(["Label", "Outcome", "Bloom", "MQF cluster", "Assessed by"],
    d.outcomes.map((o) => [o.label, o.text, o.bloomLevel, o.mqfCluster ?? "Not recorded", assessmentOf(d, o.id).map((a) => a.title + " (" + a.marks + ")").join("; ") || o.assessmentEvidence || "Not recorded"])), "");
  const plos = input.plos.filter((p) => d.outcomes.some((o) => o.ploIds.includes(p.id)));
  lines.push("## 4. The CLO to PLO matrix", "");
  if (plos.length) {
    lines.push(table(["Outcome", ...plos.map((p) => p.id)], d.outcomes.map((o) => [o.label, ...plos.map((p) => o.ploLinks?.find((l) => l.ploId === p.id)?.level ?? (o.ploIds.includes(p.id) ? "linked, no level" : ""))])), "",
      "H, M and L are the strength of each link, not scores; no PLO index is computed from them.", "", "Programme outcomes" + (d.sample ? " (demo outcomes, synthetic)" : "") + ":", "",
      ...plos.map((p) => "- " + p.id + " (" + p.cluster + "): " + p.text), "");
  } else lines.push("No programme outcome mapping is recorded.", "");
  lines.push("## 5. Student learning time", "");
  if (time) lines.push(table(["Part", "Hours"], [["Lecture", time.lecture], ["Lab", time.lab], ...(time.unsplit ? [["Contact, not split", time.unsplit]] : []), ["Self-study", time.selfStudy], ["Assessment work", time.assessment], ["Final examination", time.exam], ["Total", time.total]]), "",
    time.capacity !== null ? time.total + " of the " + time.capacity + " hours that " + d.brief.credits + " credits carry at 40 hours a credit" + (time.unallocated ? "; " + time.unallocated + " unallocated." : ".") : "Credits not recorded.", "");
  else lines.push("Not recorded.", "");
  lines.push("## 6. Assessment plan", "");
  if (d.assessment?.length) {
    const exam = d.assessment.filter((a) => a.kind === "exam").reduce((n, a) => n + a.weight, 0);
    lines.push(table(["Component", "Weight", "When", "Individual", "Assesses (marks)"], d.assessment.map((a) => [a.title, a.weight + "%", a.week, a.individual ? "Yes" : "Team", a.allocation.map((x) => label(x.cloId) + " " + x.bloomLevel + " " + x.marks).join("; ")])), "",
      "Continuous assessment " + (100 - exam) + "%, final examination " + exam + "%.", "", "### Table of specifications", "",
      table(["Outcome", "Bloom level", "Marks", "From"], tableOfSpecifications(d).map((r) => [label(r.cloId), r.bloomLevel, r.marks, r.components.join("; ")])), "",
      ...d.assessment.flatMap((a) => ["### " + a.title, "", a.description, ""]));
  } else lines.push("Not recorded.", "");
  lines.push("## 7. Schedule", "", table(["Week", "Kind", "Topic", "Hours", "Self-study", "Outcomes"], d.topics.map((t) => [t.week ?? "Not set", t.kind ?? "", t.title, topicHours(t), t.selfStudyHours, t.cloIds.map(label).join(", ")])), "");
  for (const t of d.topics.filter((x) => x.activities || x.readings || x.misconceptions?.length))
    lines.push("### Week " + (t.week ?? "not set") + ": " + t.title, "", ...(t.activities ? [t.activities, ""] : []), ...(t.readings ? ["Reading: " + t.readings, ""] : []),
      ...(t.misconceptions?.length ? ["Misconceptions to address:", "", ...t.misconceptions.map((m) => "- " + m), ""] : []));
  lines.push("## 8. References", "", ...((d.references ?? []).length ? d.references!.map((r) => "- " + r.citation) : ["None recorded."]), "", ...(d.referencesGap ? [d.referencesGap, ""] : []));
  lines.push("## 9. What this file is", "", "The record as it stood in version " + input.versionId + ", in the shape of a course file. MANIFEST.md lists what is present, what is sample, what is not yet built and what is not included. No accreditation is claimed.", "");
  return lines.join("\n");
}

function examMarkdown(input: CourseFileInput): string {
  const d = input.definition;
  const label = (id: string) => d.outcomes.find((o) => o.id === id)?.label ?? id;
  return ["# " + input.subject.id + ": the final examination's outline and marking scheme", "", ...(input.demoLine ? ["> " + input.demoLine, ""] : []),
    ...(d.assessment ?? []).filter((a) => a.kind === "exam").flatMap((a) => ["## " + a.title + " (" + a.weight + "%)", "", a.description, "",
      table(["Outcome", "Bloom level", "Marks"], a.allocation.map((x) => [label(x.cloId), x.bloomLevel, x.marks])), ""])].join("\n");
}

function rubricMarkdown(input: CourseFileInput, r: Rubric): string {
  const d = input.definition, component = d.assessment?.find((a) => a.id === r.componentId);
  const label = (id: string) => d.outcomes.find((o) => o.id === id)?.label ?? id;
  return ["# " + r.title, "", ...(input.demoLine ? ["> " + input.demoLine, ""] : []),
    "For " + (component ? component.title + " (" + component.weight + "%)" : r.componentId) + ". Four levels in the grid shape of the AAC&U VALUE rubrics, with descriptors written for this course; the VALUE text itself is not reproduced.", "",
    table(["Criterion", "Marks", "Outcomes", "Capstone", "Milestone 2", "Milestone 1", "Benchmark"], r.criteria.map((c) => [c.name, c.marks, c.cloIds.map(label).join(", "), ...c.levels])),
    "", "Marks: " + r.criteria.reduce((n, c) => n + c.marks, 0) + ".", ""].join("\n");
}

function decisionsMarkdown(input: CourseFileInput): string {
  const lines = ["# " + input.subject.id + ": decisions and versions", "", "A local version keeps the outline, the reason and the term; it does not attest university approval.", "", "## Versions", ""];
  lines.push(input.versions.length ? table(["Version", "Saved", "By", "Term", "Reason"], input.versions.map((v) => [v.id + (v.id === input.versionId ? " (current)" : ""), v.changedAt.slice(0, 10), personName(input.people, v.changedBy), v.effectiveTerm || "Not recorded", v.reason])) : "No version recorded.", "", "## Decisions", "");
  lines.push(input.decisions.length ? table(["Recorded", "By", "Decision", "Reason", "On the brief of", "Course version"], input.decisions.map((x) => [x.at.slice(0, 16).replace("T", " "), personName(input.people, x.byPersonId), x.outcome, x.note,
    input.briefs.find((b) => b.id === x.briefId)?.createdAt.slice(0, 10) ?? "an earlier date", x.courseVersionId])) : "No decision recorded.", "");
  return lines.join("\n");
}

export interface ObeReportContext { title: string; demoLine: string | null; people: Person[]; cqiNote: CqiNote | null; institution: InstitutionProfile; saved: boolean }

/** The OBE course report in Markdown (depth plan Section 8.3): the settings it was printed with, the direct and indirect
 *  lines, the programme outcomes listed with no index, the CQI note and the sentence that stays. A report not saved says
 *  so, and is dated as the records stood. */
export function obeReportMarkdown(ctx: ObeReportContext, r: ObeReport): string {
  const target = r.surveyTarget ?? ctx.institution.surveyScale.target;
  const ind = new Map(r.indirect.map((x) => [x.cloId, x]));
  const lines = ["# " + r.subjectId + " " + ctx.title + ": OBE course report, " + r.term, ""];
  if (ctx.demoLine) lines.push("> " + ctx.demoLine, "");
  lines.push(table(["Field", "Value"], [["Version taught", r.versionId ?? "Not recorded"], ["Pass mark and KPI", r.passMark + ", and " + pctText(r.studentShare) + " of students"], ["Method", "Share of students at or above the pass mark"],
    ["Results", (r.sourceFileName ?? "The results file") + (r.sample ? ", synthetic marks" : "")], ["Survey wording", r.surveyTitle ? r.surveyTitle + ", on " + (r.surveyVersionId ?? "a version not recorded") : "No Course Outcome Survey"],
    ["Saved", ctx.saved ? r.printedAt.slice(0, 16).replace("T", " ") + " by " + personName(ctx.people, r.printedBy) : "Not saved: the records as they stood at " + r.printedAt.slice(0, 16).replace("T", " ")]]), "");
  lines.push(methodLine(r.passMark, r.studentShare), "", table(["Outcome", "n of N", "Mean", "At " + r.passMark + " or above", "KPI " + pctText(r.studentShare), "Survey, " + target + " or higher"],
    r.direct.map((d) => [d.label, d.n + " of " + d.N + (d.filed && d.missing ? " (" + d.missing + " without a mark)" : ""), d.mean === null ? "not filed" : d.mean.toFixed(1),
      d.share === null ? "distribution not filed" : d.atOrAbove + ", " + pctText(d.share) + (d.interval ? "; 95% interval " + pctText(d.interval.low) + " to " + pctText(d.interval.high) + ", " + NON_RESPONSE_LABEL : ""),
      d.kpiMet === null ? "not computed" : d.kpiMet ? "met" : "not met", ind.get(d.cloId) ? ind.get(d.cloId)!.atTarget + " of " + ind.get(d.cloId)!.n + ", " + pctText(ind.get(d.cloId)!.share) : r.surveyOpen ? "no item" : "not open"])), "");
  lines.push(constructsLine(r.passMark, target), "");
  if (r.surveyNote) lines.push(r.surveyNote, "");
  if (r.respondents !== null) lines.push("The survey's response rate: " + (r.rate ?? r.respondents + " responses, the class size not recorded") + "; its floor is " + r.floorRequired + " responses.", "");
  lines.push("## Programme outcomes, listed", "", ...(r.plos.length ? r.plos.map((p) => "- " + p.ploId + " (" + p.text + "): " + p.links.map((l) => l.label + " (" + l.level + ") " + pctText(l.share)).join("; ")) : ["The course record links no programme outcome."]), "", PLO_LINE, "");
  lines.push("## CQI note", "", ctx.cqiNote ? ctx.cqiNote.text + " (" + personName(ctx.people, ctx.cqiNote.byPersonId) + ", " + ctx.cqiNote.at.slice(0, 10) + ")" : ctx.saved ? "No CQI note was saved with this report." : "No CQI note for this term yet.", "");
  lines.push(LEARN_CLAIM, "");
  return lines.join("\n");
}

/** The zip: MANIFEST.md first, then the record's files. */
export async function buildCourseFile(input: CourseFileInput): Promise<{ bytes: Uint8Array; manifest: ManifestEntry[]; paths: string[] }> {
  const mod = (await import("jszip")) as unknown as { default?: JSZipCtor } & JSZipCtor;
  const JSZip = (mod.default ?? mod) as JSZipCtor;
  const zip = new JSZip();
  const manifest = courseFileManifest(input);
  const all = new Map<string, string | Uint8Array>([["MANIFEST.md", manifestMarkdown(input, manifest)], ...files(input)]);
  // Each rubric as a spreadsheet through SheetJS, loaded on demand like jszip.
  if (input.rubrics.length) {
    const XLSX = await import("xlsx");
    const label = (id: string) => input.definition.outcomes.find((o) => o.id === id)?.label ?? id;
    for (const r of input.rubrics) {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rubricRows(r, label, input.demoLine)), "Rubric");
      all.set(rubricSheet(r), new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer));
    }
  }
  // A fixed date on every entry, so the same record always makes the same zip.
  const date = new Date(Date.parse(input.generatedAt) || 0);
  for (const [path, content] of all) zip.file(path, content, { date });
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { bytes, manifest, paths: [...all.keys()] };
}
interface JSZipInstance { file: (path: string, content: string | Uint8Array, options?: { date?: Date }) => void; generateAsync: (options: { type: "uint8array"; compression?: string }) => Promise<Uint8Array> }
type JSZipCtor = new () => JSZipInstance;
