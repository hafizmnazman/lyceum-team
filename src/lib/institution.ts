// The institution profile's rules (depth plan Section 3.1): one check for the Guide page's form, the store and
// the backup, so a profile that shapes a figure is always one a person could have saved.

import type { InstitutionProfile } from "../types.ts";

const text = (x: unknown, max: number) => typeof x === "string" && x.trim().length > 0 && x.length <= max;
const share = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x > 0 && x <= 1;

/** The first problem with a profile, or null when it can be saved. */
export function institutionError(p: unknown): string | null {
  if (typeof p !== "object" || p === null || Array.isArray(p)) return "Invalid institution profile.";
  const x = p as Partial<InstitutionProfile>;
  if (!text(x.name, 200) || !text(x.shortName, 40)) return "Give the institution a name and a short name.";
  if (x.demo === true && !/\bdemo\b/i.test(x.name!)) return "A demo profile keeps the word demo in its name.";
  if (typeof x.showMark !== "boolean" || typeof x.demo !== "boolean") return "Invalid institution profile.";
  const m = x.mark;
  if (!m || ![m.svg, m.png, m.pngSmall, m.wide ?? m.png].every(path => typeof path === "string" && /^\/brand\/partners\/[\w.-]+$/.test(path)) || !text(m.alt, 200))
    return "The mark must be a file under /brand/partners/ with alt text.";
  const k = x.kpi;
  if (!k || typeof k.passMark !== "number" || !Number.isFinite(k.passMark) || k.passMark <= 0 || k.passMark > 100) return "Use a pass mark above 0 and at most 100.";
  if (!share(k.studentShare)) return "Use a KPI share of students above 0% and at most 100%.";
  if (k.method !== "share-above-mark") return "Share above the mark is the only attainment method the filed results support.";
  const s = x.surveyScale;
  if (!s || ![s.min, s.max, s.target].every(Number.isInteger) || s.min < 0 || s.max <= s.min || s.max > 10 || s.target <= s.min || s.target > s.max)
    return "Use a survey scale with a target point inside it.";
  if (!Number.isInteger(x.surveyFloor) || x.surveyFloor! < 1 || x.surveyFloor! > 1000) return "Use a response floor of at least 1.";
  if (!share(x.surveyFloorShare)) return "Use a response share above 0% and at most 100%.";
  if (x.releaseRule !== "all-results-after-grades") return "Survey results are released only after grades.";
  if (!text(x.lms, 100) || !text(x.controller, 1000) || !text(x.termPattern, 100)) return "Name the LMS, the data controller and the term pattern.";
  if (typeof x.privacyNoticeUrl !== "string" || !/^https:\/\/\S+$/.test(x.privacyNoticeUrl)) return "Link the privacy notice with an https address.";
  return null;
}
