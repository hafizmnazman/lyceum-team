// The local door's core (plan Section 11): read one exported Lyceum workspace,
// validate it exactly as the app does before a restore, and answer six tools
// from it with the same deterministic engines the app uses. Nothing here writes
// to the workspace: five tools only read, and the teaching pack tool writes one
// PPTX to a path the user names, never over an existing file. Every answer says
// when the workspace was exported, so the door and the screen can be compared.

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute } from "node:path";
import { PEOPLE, SEED_RESULT_UPLOADS } from "../src/data/seed.ts";
import { DEMO_LINE } from "../src/data/sample-course/index.ts";
import { loopState, termWindow } from "../src/app/loop.ts";
import { obeReport } from "../src/lib/attainment.ts";
import { courseInformationMarkdown, manifestMarkdown, obeReportMarkdown, type CourseFileInput, type CourseFilePack } from "../src/lib/courseFile.ts";
import type { AppState } from "../src/app/store.ts";
import { courseDefinition, curriculumMarkdown } from "../src/lib/curriculum.ts";
import { evidenceMarkdown, evidenceReport, meetingBriefMarkdown, RECOMMENDATION_LABEL } from "../src/lib/evidence.ts";
import { brandFor, deckBuffer, sessionDeck } from "../src/lib/slides.ts";
import { MAX_BACKUP_BYTES, parseWorkspaceBackup, type WorkspaceBackup } from "../src/lib/workspaceBackup.ts";
import type { BriefRecommendation, Person, Subject } from "../src/types.ts";

export type Loaded = { ok: true; backup: WorkspaceBackup; path: string } | { ok: false; error: string };

/** Read and validate the workspace named by a path, as the app's restore does. Read again on every call,
 *  so a fresh export from the app is what the door reads next, without restarting the server. */
export function loadWorkspace(path: string | undefined): Loaded {
  if (!path) return { ok: false, error: "Set LYCEUM_WORKSPACE to the path of a workspace backup exported from Lyceum (Guide & progress, Download workspace backup)." };
  if (!existsSync(path)) return { ok: false, error: "No workspace backup at " + path + ". Export one from Lyceum and point LYCEUM_WORKSPACE at it." };
  if (statSync(path).size > MAX_BACKUP_BYTES) return { ok: false, error: "The workspace backup is larger than Lyceum accepts." };
  const parsed = parseWorkspaceBackup(readFileSync(path, "utf8"), PEOPLE.map((p) => p.id));
  return parsed.ok ? { ok: true, backup: parsed.backup, path } : { ok: false, error: "The workspace backup did not validate: " + parsed.error };
}

/** The backup's records as the app state the engines read. People are the app's own reference list. */
function asState(backup: WorkspaceBackup): AppState {
  return { ...backup.data, people: PEOPLE } as unknown as AppState;
}

const stamp = (backup: WorkspaceBackup) => "From the Lyceum workspace exported at " + backup.exportedAt + ". Read-only: nothing was changed in the workspace.";

export interface ToolText { text: string; isError?: boolean; records: string[] }
const fail = (text: string): ToolText => ({ text, isError: true, records: [] });

function course(backup: WorkspaceBackup, id: string): Subject | ToolText {
  const subject = backup.data.subjects.find((s) => s.id.toUpperCase() === id.trim().toUpperCase());
  return subject ?? fail("No course " + id + " in this workspace. Known courses: " + backup.data.subjects.map((s) => s.id).join(", ") + ".");
}

/** lyceum_courses: every course with its loop for the current term. */
export function listCourses(backup: WorkspaceBackup): ToolText {
  const state = asState(backup);
  const lines = backup.data.subjects.map((s) => {
    const loop = loopState(state, s.id);
    const outcomes = backup.data.clos.filter((c) => c.subjectId === s.id).length;
    const sources = backup.data.evidenceSources.filter((x) => x.subjectId === s.id);
    return "- " + s.id + " " + s.title + " (year " + s.year + ", semester " + s.semester + "; version " + s.currentVersionId + "): " + outcomes + " outcomes, "
      + sources.length + " sources (" + sources.filter((x) => x.reviewed && !x.duplicateOf).length + " reviewed). " + loop.summary;
  });
  return { text: stamp(backup) + "\n\n# Courses\n\n" + lines.join("\n"), records: backup.data.subjects.map((s) => s.id) };
}

/** lyceum_sources: the kept sources for one course, each with its receipt. */
export function listSources(backup: WorkspaceBackup, courseId: string, reviewedOnly = false): ToolText {
  const subject = course(backup, courseId);
  if ("text" in subject) return subject;
  const sources = backup.data.evidenceSources.filter((s) => s.subjectId === subject.id && (!reviewedOnly || (s.reviewed && !s.duplicateOf)));
  const lines = sources.map((s) => "- " + s.title + " (" + (s.organisation || "organisation not named") + "): " + (s.url || "no link") + "; published " + (s.sourceDate || "date not supplied")
    + (s.collection ? "; retrieved " + s.collection.retrievedAt + " from " + s.collection.label : "; pasted by a person") + "; " + (s.duplicateOf ? "duplicate, counts once" : s.reviewed ? "reviewed, counted" : "unreviewed, not counted")
    + "; fingerprint " + s.textHash + ".");
  return { text: stamp(backup) + "\n\n# Sources for " + subject.id + "\n\n" + (lines.join("\n") || "No source kept for this course yet."), records: sources.map((s) => s.id) };
}

/** lyceum_evidence_report: what employers ask for, with the denominator, the intervals and every quotation. */
export function evidenceReportText(backup: WorkspaceBackup, courseId: string): ToolText {
  const subject = course(backup, courseId);
  if ("text" in subject) return subject;
  const d = backup.data, outcomes = d.clos.filter((c) => c.subjectId === subject.id);
  const report = evidenceReport(subject.id, d.evidenceSources, d.skillMentions, d.skillMappings, outcomes);
  const markdown = evidenceMarkdown(subject, report, d.evidenceSources, d.skillMentions, outcomes, PEOPLE, backup.exportedAt);
  return { text: stamp(backup) + "\n\n" + markdown, records: d.skillMentions.filter((m) => m.subjectId === subject.id).map((m) => m.id) };
}

/** lyceum_course_outline: the current version's outline. */
export function courseOutlineText(backup: WorkspaceBackup, courseId: string): ToolText {
  const subject = course(backup, courseId);
  if ("text" in subject) return subject;
  const definition = backup.data.courseDefinitions[subject.id] ?? courseDefinition(subject, backup.data.clos, backup.data.programme.title);
  return { text: stamp(backup) + "\n\n" + curriculumMarkdown(subject, definition, subject.currentVersionId), records: [subject.currentVersionId] };
}

/** lyceum_course_record: the course record in the shape of a course file, its course information and the manifest of the
 *  zip the app exports, every item marked present, sample, not yet built or not included. The packs are named as the app's
 *  zip names them; the door writes none of them (lyceum_teaching_pack writes one). */
export function courseRecordText(backup: WorkspaceBackup, courseId: string): ToolText {
  const subject = course(backup, courseId);
  if ("text" in subject) return subject;
  const d = backup.data, definition = d.courseDefinitions[subject.id];
  if (!definition) return { text: stamp(backup) + "\n\n" + subject.id + " has no course record in this workspace yet; lyceum_course_outline gives its outline.", records: [] };
  const clos = d.clos.filter((c) => c.subjectId === subject.id);
  const report = evidenceReport(subject.id, d.evidenceSources, d.skillMentions, d.skillMappings, clos);
  const sessions = d.teachingPlans.find((p) => p.subjectId === subject.id)?.sessions ?? [];
  const packs: CourseFilePack[] = [];
  for (const session of sessions) {
    const spec = sessionDeck(subject, session, clos, report, d.skillMentions, d.evidenceSources, PEOPLE, backup.exportedAt, { definition, brand: brandFor(d.institution, definition, subject, session.week, null) });
    let fileName = session.sample ? spec.fileName.replace("-teaching-pack", "-sample-teaching-pack") : spec.fileName;
    if (packs.some((p) => p.fileName === fileName)) fileName = fileName.replace(".pptx", "-" + session.id + ".pptx");
    packs.push({ fileName, week: session.week, bytes: new Uint8Array(0), sample: Boolean(session.sample), full: Boolean(session.slides?.length) });
  }
  const saved = d.obeReports.filter((r) => r.subjectId === subject.id).sort((a, b) => a.printedAt.localeCompare(b.printedAt)).at(-1) ?? null;
  const input: CourseFileInput = { subject, definition, versionId: subject.currentVersionId, rubrics: d.rubrics.filter((r) => r.subjectId === subject.id), plos: d.programme.plos ?? [],
    versions: d.subjectVersions.filter((v) => v.subjectId === subject.id), decisions: d.briefDecisions.filter((x) => x.subjectId === subject.id), briefs: d.evidenceBriefs.filter((b) => b.subjectId === subject.id),
    people: PEOPLE, packs, sessions, institution: d.institution, mark: null, demoLine: definition.sample ? DEMO_LINE : null, generatedAt: backup.exportedAt,
    obeReport: saved, cqiNote: saved?.cqiNoteId ? d.cqiNotes.find((n) => n.id === saved.cqiNoteId) ?? null : null };
  return { text: stamp(backup) + "\n\nThe course record, as the course file the app exports holds it: its course information, then the manifest of the whole zip.\n\n"
    + courseInformationMarkdown(input) + "\n\n" + manifestMarkdown(input), records: [subject.currentVersionId, ...(saved ? [saved.id] : [])] };
}

/** lyceum_attainment: the OBE course report for a course and term (the loop's term unless one is named): the report saved
 *  as printed if there is one, otherwise the report as the records stand, read from the term's results file and its Course
 *  Outcome Survey, booth responses never counted. A seeded example is never counted. */
export function attainmentText(backup: WorkspaceBackup, courseId: string, term?: string): ToolText {
  const subject = course(backup, courseId);
  if ("text" in subject) return subject;
  const d = backup.data, state = asState(backup), definition = d.courseDefinitions[subject.id];
  const t = term?.trim() || termWindow(state, subject.id).term;
  if (!t) return { text: stamp(backup) + "\n\n" + subject.id + " has no term set; name one, for example 2026/2027 semester 1.", records: [] };
  const saved = d.obeReports.filter((r) => r.subjectId === subject.id && r.term === t).sort((a, b) => a.printedAt.localeCompare(b.printedAt)).at(-1);
  const seeded = new Set(SEED_RESULT_UPLOADS.map((u) => u.id));
  const upload = d.resultUploads.filter((u) => u.subjectId === subject.id && u.term === t && !seeded.has(u.id)).sort((a, b) => a.filedAt.localeCompare(b.filedAt)).at(-1);
  const report = saved ?? (upload ? obeReport({ id: "OBE-preview", subjectId: subject.id, term: t, upload, clos: d.clos.filter((c) => c.subjectId === subject.id), outcomes: definition?.outcomes ?? [],
    plos: d.programme.plos ?? [], institution: d.institution, survey: d.surveys.find((x) => x.subjectId === subject.id && x.term === t && x.kind === "course-outcome") ?? null,
    responses: d.surveyResponses, events: d.events, cqiNoteId: d.cqiNotes.filter((n) => n.subjectId === subject.id && n.term === t).at(-1)?.id ?? null, at: backup.exportedAt, by: DOOR_AUTHOR.id }) : null);
  if (!report) return { text: stamp(backup) + "\n\nNo results are filed for " + subject.id + " in " + t + ", so there is no report to read. A seeded example is never counted.", records: [] };
  const cqiNote = report.cqiNoteId ? d.cqiNotes.find((n) => n.id === report.cqiNoteId) ?? null : null;
  const markdown = obeReportMarkdown({ title: definition?.title ?? subject.title, demoLine: definition?.sample ? DEMO_LINE : null, people: PEOPLE, cqiNote, institution: d.institution, saved: Boolean(saved) }, report);
  return { text: stamp(backup) + "\n\n" + (saved ? "The report saved as printed; a later change to the settings does not change it." : "The report as the records stand; nobody has saved it.") + "\n\n" + markdown,
    records: [report.uploadId, ...(saved ? [saved.id] : []), ...(report.surveyId ? [report.surveyId] : [])] };
}

/** The author of a draft from the door: a label, not a person, so the brief never claims someone prepared it. */
const DOOR_AUTHOR: Person = { id: "P-DOOR", name: "the local door, as a draft for a lecturer to review", orgRole: "academic", email: "", verified: false };

/** lyceum_brief_draft: a meeting brief drafted from the evidence; not saved, not sent, not a decision. */
export function briefDraftText(backup: WorkspaceBackup, courseId: string, recommendation: BriefRecommendation, notes: string, now: string): ToolText {
  const subject = course(backup, courseId);
  if ("text" in subject) return subject;
  if (!(recommendation in RECOMMENDATION_LABEL)) return fail("Choose a recommendation: keep, refresh, revise or undecided.");
  const d = backup.data, outcomes = d.clos.filter((c) => c.subjectId === subject.id);
  const report = evidenceReport(subject.id, d.evidenceSources, d.skillMentions, d.skillMappings, outcomes);
  const markdown = meetingBriefMarkdown(subject, report, d.evidenceSources, d.skillMentions, outcomes, PEOPLE, DOOR_AUTHOR, { recommendation, notes: notes.trim() }, now);
  return { text: stamp(backup) + "\n\nDRAFT. Prepare and send a brief in the Lyceum workspace; a draft here is not a brief on record and decides nothing.\n\n" + markdown,
    records: d.skillMentions.filter((m) => m.subjectId === subject.id).map((m) => m.id) };
}

/** lyceum_teaching_pack: the same editable deck the app downloads, written to a new .pptx file. */
export async function writeTeachingPack(backup: WorkspaceBackup, courseId: string, session: string, path: string): Promise<ToolText> {
  const subject = course(backup, courseId);
  if ("text" in subject) return subject;
  if (!isAbsolute(path) || extname(path).toLowerCase() !== ".pptx") return fail("Give an absolute path ending in .pptx for the teaching pack.");
  if (existsSync(path)) return fail("A file already exists at " + path + ". The door never overwrites a file; choose a new path.");
  if (!existsSync(dirname(path))) return fail("The folder " + dirname(path) + " does not exist.");
  const d = backup.data, clos = d.clos.filter((c) => c.subjectId === subject.id);
  const sessions = d.teachingPlans.find((p) => p.subjectId === subject.id)?.sessions ?? [];
  // A week names the lecturer's own session before a sample one (depth plan Section 5.1: the sample is a labelled fixture).
  const inWeek = (list: typeof sessions) => list.find((s) => String(s.week) === session.replace(/^week\s*/i, ""));
  const chosen = sessions.find((s) => s.id === session) ?? inWeek(sessions.filter((s) => !s.sample)) ?? inWeek(sessions);
  if (!chosen) return fail("No session " + session + " in " + subject.id + ". Sessions: " + (sessions.map((s) => s.id + " (week " + s.week + ", " + s.topic + ")").join("; ") || "none saved") + ".");
  const report = evidenceReport(subject.id, d.evidenceSources, d.skillMentions, d.skillMappings, clos);
  const definition = d.courseDefinitions[subject.id] ?? null;
  const markFile = new URL("../public" + (d.institution.mark.wide ?? d.institution.mark.png), import.meta.url);
  const markData = existsSync(markFile) ? readFileSync(markFile).toString("base64") : null;
  const spec = sessionDeck(subject, chosen, clos, report, d.skillMentions, d.evidenceSources, PEOPLE, backup.exportedAt,
    { definition, brand: brandFor(d.institution, definition, subject, chosen.week, markData) });
  const bytes = await deckBuffer(spec);
  writeFileSync(path, bytes, { flag: "wx" });
  return { text: stamp(backup) + "\n\nWrote the teaching pack for week " + chosen.week + ", " + chosen.topic + ": " + spec.slides.length + " editable slides, " + bytes.length + " bytes, at " + path
    + (chosen.sample ? ". A sample session, written for this prototype and labelled synthetic on every slide; the generator adds no text of its own."
      : ". It is generated from the saved session, the course record and the evidence linked to its outcomes; the generator adds no text of its own" + (definition?.sample ? ", and the course record is a sample written for this prototype." : ".")), records: [chosen.id] };
}
