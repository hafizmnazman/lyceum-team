// The lecturer's journey, computed from real state so the guide never lies:
// a step is done only when the workspace holds the specific result it produces
// (an adopted version, a reviewed posting with a confirmed quotation, a mapping
// to a current outcome, a session linked to an outcome, a prepared brief).
// Seeded examples do not count as the lecturer's work.

import type { AppState } from "./store.ts";
import type { Screen } from "./roles.ts";

export interface JourneyStep {
  id: string;
  title: string; // two or three words
  help: string; // one sentence: what to do
  done: boolean;
  count: string; // what exists, for example "3 sources"
  screen: Screen;
  tab?: AppState["studioTab"];
}

export function journeyFor(state: AppState, subjectId: string | null): JourneyStep[] {
  const id = subjectId ?? "";
  const definition = id ? state.courseDefinitions[id] : undefined;
  const adopted = state.curriculumDrafts.some((d) => d.subjectId === id && d.status === "adopted");
  const sources = state.evidenceSources.filter((s) => s.subjectId === id);
  const reviewed = sources.filter((s) => s.reviewed && !s.duplicateOf);
  const mentions = state.skillMentions.filter((m) => m.subjectId === id);
  const mappings = state.skillMappings.filter((m) => m.subjectId === id);
  const sessions = state.teachingPlans.find((p) => p.subjectId === id)?.sessions ?? [];
  const briefs = state.evidenceBriefs.filter((b) => b.subjectId === id);
  const outcomes = state.clos.filter((c) => c.subjectId === id);
  return [
    { id: "course", title: "Open a course", help: "Pick an assigned course or create a personal workspace.", done: Boolean(id) && state.subjects.some((s) => s.id === id), count: id || "none yet", screen: "courses" },
    { id: "outline", title: "Confirm the outline", help: "Start a revision, check the outcomes and topics against the hours, and adopt the version.",
      done: adopted, count: outcomes.length + " outcomes, " + (definition?.topics.length ?? 0) + " topics", screen: "studio", tab: "curriculum" },
    { id: "collect", title: "Collect evidence", help: "Fetch postings from an employer board and keep the ones worth reading.", done: sources.length > 0,
      count: sources.length + " sources", screen: "studio", tab: "evidence" },
    { id: "confirm", title: "Confirm quotations", help: "Scan for the skills you name, confirm each exact quotation, mark the postings reviewed.",
      done: reviewed.some((s) => mentions.some((m) => m.sourceId === s.id)), count: mentions.length + " quotations, " + reviewed.length + " reviewed", screen: "studio", tab: "evidence" },
    { id: "map", title: "Map to outcomes", help: "Say what the course does about each skill today and what it should reach.", done: mappings.some((m) => m.cloIds.some((cloId) => outcomes.some((c) => c.id === cloId))),
      count: mappings.length + " mapped", screen: "studio", tab: "evidence" },
    { id: "plan", title: "Plan a class", help: "Save a session linked to an outcome and download its teaching pack.", done: sessions.some((s) => s.cloIds.length > 0),
      count: sessions.length + " sessions", screen: "studio", tab: "plan" },
    { id: "brief", title: "Brief the meeting", help: "Prepare the brief, download it as slides, or send it to a colleague.", done: briefs.length > 0,
      count: briefs.filter((b) => b.sentAt).length + " sent of " + briefs.length, screen: "studio", tab: "evidence" },
  ];
}

export function nextJourneyStep(steps: JourneyStep[]): JourneyStep | null {
  return steps.find((s) => !s.done) ?? null;
}
