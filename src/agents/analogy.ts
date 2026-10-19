// Analogy agent (spec Section 3, Section 12). A new subject has no cohort of its
// own. To test it, the agent stands in a proxy cohort: for each new outcome it
// borrows the real survey ratings from the most similar existing outcome (same
// Bloom level, breaking ties by demand), and remaps them onto the new CLO. The
// acceptance test then runs the unchanged spine over this proxy survey and marks
// the verdict isProxyCohort: true, so the provenance line stays honest.

import type { CLO, Subject, SubjectId, SurveyRecord } from "../types.ts";
import { CLOS, TERM } from "../data/seed.ts";
import { marketGapByCLO } from "./signal.ts";

export interface AnalogyResult {
  proxySurvey: SurveyRecord[];
  borrowedFrom: SubjectId[];
}

/** Pick the existing CLO most similar to a new one: same Bloom level first, then
 *  the highest-demand among the candidates (a reasonable "closest skill"). */
function mostSimilarCLO(newCLO: CLO, existing: CLO[]): CLO | undefined {
  const demand = marketGapByCLO();
  const sameLevel = existing.filter((c) => c.bloomLevel === newCLO.bloomLevel);
  const pool = sameLevel.length > 0 ? sameLevel : existing;
  return [...pool].sort((a, b) => (demand[b.id]?.demand ?? 0) - (demand[a.id]?.demand ?? 0))[0];
}

export function runAnalogy(
  newSubjectCLOs: CLO[],
  _allSubjects: Subject[],
  allSurvey: SurveyRecord[],
): AnalogyResult {
  const newSubjectId = newSubjectCLOs[0]?.subjectId;
  const existing = CLOS; // the catalogue of outcomes that have real ratings

  // For each new CLO, the existing CLO we borrow from.
  const borrowMap = new Map<string, string>(); // newCloId -> existingCloId
  const borrowedSubjects = new Set<SubjectId>();
  for (const nc of newSubjectCLOs) {
    const match = mostSimilarCLO(nc, existing);
    if (match) {
      borrowMap.set(nc.id, match.id);
      borrowedSubjects.add(match.subjectId);
    }
  }

  // Gather each student's rating on the borrowed CLOs from the real survey.
  const ratingByStudentCLO = new Map<string, Record<string, number>>();
  for (const rec of allSurvey) {
    let bucket = ratingByStudentCLO.get(rec.studentId);
    if (!bucket) {
      bucket = {};
      ratingByStudentCLO.set(rec.studentId, bucket);
    }
    Object.assign(bucket, rec.cloRatings);
  }

  // Build one proxy SurveyRecord per student for the new subject.
  const proxySurvey: SurveyRecord[] = [];
  for (const [studentId, ratings] of ratingByStudentCLO) {
    const cloRatings: Record<string, number> = {};
    for (const [newCloId, existingCloId] of borrowMap) {
      const r = ratings[existingCloId];
      if (typeof r === "number") cloRatings[newCloId] = r;
    }
    if (Object.keys(cloRatings).length > 0) {
      proxySurvey.push({ studentId, subjectId: newSubjectId, term: TERM, cloRatings });
    }
  }

  return { proxySurvey, borrowedFrom: [...borrowedSubjects] };
}
