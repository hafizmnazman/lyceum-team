// Moods from records only (plan Section 7.2). A pure function of the workspace
// state, the requests actually in flight and the clock: nothing here can make a
// character look busy. A helper is "working" only while a real request for its
// step runs, "waiting" only while a proposal of its own needs the lecturer,
// "done" only in the few seconds after its record was saved, and "stuck" only
// when a request failed, in which case the screen shows the error, not a mascot.
// The host's moods follow the loop for the course (the ring), not activity.

import { loopState } from "./loop.ts";
import type { AppState, InFlightRequest } from "./store.ts";

export type HelperRole = "folio" | "scout" | "atlas" | "lens" | "quill" | "prism" | "steward";
export type HelperMood = "resting" | "working" | "waiting" | "done" | "stuck";
export type HostMood = "greeting" | "resting" | "celebrating" | "reflecting";
export interface CourseMoods { host: HostMood; helpers: Record<HelperRole, HelperMood> }

export const HELPER_ROLES: HelperRole[] = ["folio", "scout", "atlas", "lens", "quill", "prism", "steward"];
/** How long a saved record shows as "done" before the character rests again. */
export const DONE_WINDOW_MS = 4000;

const within = (iso: string | null | undefined, now: number) => {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t <= now && now - t <= DONE_WINDOW_MS;
};

export function moodsFor(state: AppState, requests: readonly InFlightRequest[], subjectId: string, now: number): CourseMoods {
  const forCourse = (kind: InFlightRequest["kind"]) => requests.some((r) => r.kind === kind && (r.subjectId === subjectId || r.subjectId === null));
  const run = state.collectRun && state.collectRun.subjectId === subjectId ? state.collectRun : null;
  const sources = state.evidenceSources.filter((s) => s.subjectId === subjectId);
  const keptIds = new Set(sources.map((s) => s.collection?.postingId).filter(Boolean));
  const mappings = state.skillMappings.filter((m) => m.subjectId === subjectId);
  const briefs = state.evidenceBriefs.filter((b) => b.subjectId === subjectId);
  const drafts = state.curriculumDrafts.filter((d) => d.subjectId === subjectId);
  const sessions = (state.teachingPlans.find((p) => p.subjectId === subjectId)?.sessions ?? []).filter((s) => !s.sample); // the term's samples were never saved here
  const uploads = state.resultUploads.filter((u) => u.subjectId === subjectId);
  const filed = state.dataSources.filter((d) => d.subjectId === subjectId);
  const pending = state.pendingIntake?.interp;
  const pendingResults = Boolean(pending && (pending.docType === "results" || pending.docType === "clo-survey"));
  const pendingCourseDocs = Boolean(pending && (pending.docType === "syllabus" || pending.docType === "slides"));
  const courseSourceIds = new Set(sources.map((s) => s.id));
  const surveyAwaiting = state.surveys.some((f) => f.subjectId === subjectId && !f.sample && f.formToken
    && !state.events.some((e) => e.kind === "survey-collected" && e.refs.formId === f.id));

  const mood = (working: boolean, waiting: boolean, done: boolean, stuck = false): HelperMood =>
    stuck ? "stuck" : working ? "working" : waiting ? "waiting" : done ? "done" : "resting";

  const helpers: Record<HelperRole, HelperMood> = {
    // Folio reads the course (uploaded syllabi and slides) and keeps its file: working while the course file builds.
    folio: mood((forCourse("parse") && !pendingResults) || forCourse("course-file"), pendingCourseDocs, filed.some((d) => (d.kind === "syllabus" || d.kind === "material") && within(d.ingestedAt, now))),
    // Scout collects: working while a fetch runs, waiting while fetched postings are not yet kept.
    scout: mood(forCourse("collect"), Boolean(run && run.status === "done" && run.postings.some((p) => !keptIds.has(p.id))),
      sources.some((s) => within(s.addedAt, now)), Boolean(run && run.status === "failed")),
    // Atlas maps: waiting while proposed quotations await confirmation.
    atlas: mood(false, state.scanProposals.some((p) => courseSourceIds.has(p.sourceId)), mappings.some((m) => within(m.updatedAt, now))),
    // Lens counts and, in Learn, reads results: waiting while a results file awaits confirmation, or while a survey of the
    // course is open for the collector with nothing collected since (depth plan Section 11); done after a filing, a saved
    // OBE report or a CQI note. (No request of its own yet, so never "working": counting and filing are instant.)
    lens: mood(false, pendingResults || surveyAwaiting,
      uploads.some((u) => within(u.filedAt, now)) || filed.some((d) => (d.kind === "results" || d.kind === "clo-survey" || d.kind === "ssrt") && within(d.ingestedAt, now))
        || state.obeReports.some((r) => r.subjectId === subjectId && within(r.printedAt, now)) || state.cqiNotes.some((n) => n.subjectId === subjectId && within(n.at, now))),
    // Quill drafts the revision: waiting while a checked revision awaits adoption.
    quill: mood(false, drafts.some((d) => d.status === "drafting" && d.checkedRevision === d.revision),
      drafts.some((d) => d.history.some((h) => h.action === "adopted" && within(h.at, now)))),
    // Prism makes teaching material: working while a pack renders.
    prism: mood(forCourse("pack"), false, sessions.some((s) => within(s.updatedAt, now))),
    // Steward prepares the brief: waiting while a prepared brief is not yet sent.
    steward: mood(false, briefs.some((b) => !b.sentAt), briefs.some((b) => within(b.sentAt, now))),
  };

  // The host follows the loop the ring shows: greeting before any of the six steps is done this term,
  // celebrating in the moments after the loop closes, reflecting once it has closed, resting mid-loop.
  const loop = loopState(state, subjectId);
  const doneCount = loop.steps.filter((s) => s.id !== "course" && s.id !== "history" && s.done).length;
  const closedJustNow = loop.closed && Object.values(helpers).includes("done");
  const host: HostMood = doneCount === 0 ? "greeting" : loop.closed ? (closedJustNow ? "celebrating" : "reflecting") : "resting";
  return { host, helpers };
}
