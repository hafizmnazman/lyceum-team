// Hash routes (plan Section 5.2): #/<screen> for the app's screens and
// #/course/<id>/<step> for a course's loop, with the Report step's sub-step
// as #/course/<id>/report/<tab>, so deep links, refresh and the back button keep
// working inside a course.

import { REPORT_TABS, isCourseStep, stepDef, stepForTab, type CourseStep, type ReportTab } from "./loop.ts";
import type { Screen } from "./roles.ts";
import type { AppState } from "./store.ts";

export const HASH_SCREENS: Screen[] = [
  "login", "index", "inbox", "trends", "approval", "programme", "new-subject", "assignments", "courses",
  "studio", "watch", "report", "decide", "proposal", "acceptance", "upload", "learn", "backtest", "dataroom", "office", "evaluation", "guide",
];

export interface CourseRoute { subjectId: string; step: CourseStep; reportTab?: ReportTab }
export type Route = { screen: Screen } | { course: CourseRoute };

const isReportTab = (x: string): x is ReportTab => (REPORT_TABS as string[]).includes(x);

export function parseRoute(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, "");
  const course = /^course\/([^/]+)(?:\/([a-z]+))?(?:\/([a-z]+))?\/?$/.exec(path);
  if (course) {
    const step = course[2] ?? "course";
    if (!isCourseStep(step)) return null;
    const sub = course[3];
    if (sub !== undefined && (step !== "report" || !isReportTab(sub))) return null;
    return { course: { subjectId: decodeURIComponent(course[1]), step, ...(sub ? { reportTab: sub as ReportTab } : {}) } };
  }
  return (HASH_SCREENS as string[]).includes(path) ? { screen: path as Screen } : null;
}

type RouteState = Pick<AppState, "screen" | "courseStep" | "selectedSubjectId" | "studioTab" | "reportTab">;

/** The loop step in view: the chosen rail step when the screen and panel still match it, otherwise the step the screen or the Studio panel belongs to. */
export function effectiveStep(s: RouteState): CourseStep | null {
  if (s.courseStep) {
    const def = stepDef(s.courseStep);
    if (def.screen === s.screen && (!def.tab || def.tab === s.studioTab)) return s.courseStep;
  }
  if (s.screen === "watch" || s.screen === "report" || s.screen === "decide" || s.screen === "learn") return s.screen;
  return s.screen === "studio" ? stepForTab(s.studioTab, null) : null;
}

export function hashFor(s: RouteState): string {
  const step = effectiveStep(s);
  if (!step || !s.selectedSubjectId) return "#/" + s.screen;
  // Setup is the course itself (#/course/:id, plan Section 4); "#/course/:id/course" still parses.
  return "#/course/" + encodeURIComponent(s.selectedSubjectId) + (step === "course" ? "" : "/" + step) + (step === "report" ? "/" + s.reportTab : "");
}
