// The local door's core (plan Section 11): read one exported Lyceum workspace,
// validate it exactly as the app does before a restore, and answer six tools
// from it with the same deterministic engines the app uses. Nothing here writes
// to the workspace: five tools only read, and the teaching pack tool writes one
// PPTX to a path the user names, never over an existing file. Every answer says
// when the workspace was exported, so the door and the screen can be compared.

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute } from "node:path";
import { PEOPLE } from "../src/data/seed.ts";
import { loopState } from "../src/app/loop.ts";
import type { AppState } from "../src/app/store.ts";
import { courseDefinition, curriculumMarkdown } from "../src/lib/curriculum.ts";
import { evidenceMarkdown, evidenceReport, meetingBriefMarkdown, RECOMMENDATION_LABEL } from "../src/lib/evidence.ts";
import { deckBuffer, sessionDeck } from "../src/lib/slides.ts";
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
  const chosen = sessions.find((s) => s.id === session) ?? sessions.find((s) => String(s.week) === session.replace(/^week\s*/i, ""));
  if (!chosen) return fail("No session " + session + " in " + subject.id + ". Sessions: " + (sessions.map((s) => s.id + " (week " + s.week + ", " + s.topic + ")").join("; ") || "none saved") + ".");
  const report = evidenceReport(subject.id, d.evidenceSources, d.skillMentions, d.skillMappings, clos);
  const spec = sessionDeck(subject, chosen, clos, report, d.skillMentions, d.evidenceSources, PEOPLE, backup.exportedAt);
  const bytes = await deckBuffer(spec);
  writeFileSync(path, bytes, { flag: "wx" });
  return { text: stamp(backup) + "\n\nWrote the teaching pack for week " + chosen.week + ", " + chosen.topic + ": " + spec.slides.length + " editable slides, " + bytes.length + " bytes, at " + path
    + ". It is generated from the saved session and the evidence linked to its outcomes; no model wrote a word.", records: [chosen.id] };
}
