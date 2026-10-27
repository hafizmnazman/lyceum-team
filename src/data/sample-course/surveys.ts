// Sample, synthetic: the prior term's two student surveys for CS310 (depth plan Section 7.4), written for this prototype.
// The Course Outcome Survey drew 31 of 38 and the SSRT 29 of 38, in 2025/2026 semester 2, on version CS310-v1, a term whose
// grades are recorded as released with the sample (a real term's release is a grades-released event), so its results show. The answers come from a seeded generator, the same on every run,
// and the twelve comments were written for the prototype; nothing here is a student's.

import { DEMO_INSTITUTION } from "../institution.ts";
import { courseOutcomeSurvey, ssrtSurvey } from "../../lib/surveys.ts";
import type { SurveyAnswer, SurveyDefinition, SurveyResponse } from "../../types.ts";
import { CS310_BEFORE } from "./cs310.ts";

export const PRIOR_SURVEY_TERM = "2025/2026 semester 2";
const SUBJECT = { id: "CS310", title: CS310_BEFORE.title };
const BY = "P-SOBRI";
const OPENED = "2026-05-25T00:00:00Z", COLLECTED = "2026-06-05T00:00:00Z", RELEASED = "2026-07-10T02:00:00Z";

export const PRIOR_COS: SurveyDefinition = { ...courseOutcomeSurvey({ id: "SURV-CS310-COS-PRIOR", subject: SUBJECT, outcomes: CS310_BEFORE.outcomes,
  institution: DEMO_INSTITUTION, term: PRIOR_SURVEY_TERM, versionId: "CS310-v1", classSize: 38, at: OPENED, by: BY, sample: true }), sampleReleasedAt: RELEASED };
export const PRIOR_SSRT: SurveyDefinition = { ...ssrtSurvey({ id: "SURV-CS310-SSRT-PRIOR", subject: SUBJECT, institution: DEMO_INSTITUTION,
  term: PRIOR_SURVEY_TERM, versionId: "CS310-v1", classSize: 38, at: OPENED, by: BY, sample: true }), sampleReleasedAt: RELEASED };

/** mulberry32: a small seeded generator, so the sample is the same on every run. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** One answer drawn from a distribution over 1 to 5, with a small chance of "cannot say" and of no answer. */
function draw(next: () => number, weights: number[]): SurveyAnswer | undefined {
  const r = next();
  if (r < 0.04) return "cannot-say";
  if (r < 0.06) return undefined;
  let u = (r - 0.06) / 0.94, i = 0;
  while (i < weights.length - 1 && u >= weights[i]) { u -= weights[i]; i++; }
  return i + 1;
}

// CLO5, the outcome the next revision rewords, sits lowest, as a term's surveys might show.
const COS_WEIGHTS = [[0.03, 0.07, 0.16, 0.45, 0.29], [0.03, 0.1, 0.19, 0.42, 0.26], [0.06, 0.13, 0.26, 0.36, 0.19], [0.06, 0.16, 0.26, 0.35, 0.17], [0.1, 0.16, 0.29, 0.29, 0.16]];
const SSRT_WEIGHTS = [0.04, 0.1, 0.22, 0.4, 0.24];
const COS_COMMENTS = [
  "The dashboard project made the outcomes feel real.",
  "I can make the charts, but explaining them to a client is still hard.",
  "More practice with messy data before the project, please.",
  "The critique essay helped me see how a chart can mislead.",
  "The week 7 quiz came too soon after the lab.",
  "I would like an example of a finished stakeholder report.",
];
const SSRT_HELPED = ["The weekly labs with real datasets.", "Feedback on the first draft of the report.", "Seeing weak charts redrawn in class."];
const SSRT_CHANGE = ["Release the project brief earlier.", "Fewer slides and more time in the lab.", "Explain how the rubric is applied before the defence."];

function responses(def: SurveyDefinition, count: number, seed: number, scale: (i: number) => number[], comments: Array<[string, string[]]>): SurveyResponse[] {
  const next = seeded(seed);
  return Array.from({ length: count }, (_, k): SurveyResponse => {
    const answers: Record<string, SurveyAnswer> = {};
    def.questions.filter((q) => q.kind === "scale").forEach((q, i) => { const a = draw(next, scale(i)); if (a !== undefined) answers[q.id] = a; });
    for (const [id, texts] of comments) if (k < texts.length) answers[id] = texts[k];
    return { id: def.id.replace("SURV-", "SR-") + "-" + String(k + 1).padStart(2, "0"), formId: def.id, term: def.term, answers, collectedAt: COLLECTED, clientId: null, source: "sample" };
  });
}

export const PRIOR_SURVEY_RESPONSES: SurveyResponse[] = [
  ...responses(PRIOR_COS, 31, 310, (i) => COS_WEIGHTS[i], [["Q6", COS_COMMENTS]]),
  ...responses(PRIOR_SSRT, 29, 311, () => SSRT_WEIGHTS, [["Q13", SSRT_HELPED], ["Q14", SSRT_CHANGE]]),
];
export const PRIOR_SURVEYS: SurveyDefinition[] = [PRIOR_COS, PRIOR_SSRT];
