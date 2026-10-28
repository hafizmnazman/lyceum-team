// Section 4.2, cohort generation.
//
// v1 bootstrap (default, most defensible, zero matrix maths): each simulated
// student is a real student row, resampled with replacement. Every simulated
// profile is a real profile, so "grounded, not roleplay" is literally true.
//
// Hydration turns the raw survey rows (ratings only, the shape the real survey
// arrives in) into full Student objects with theta filled, using one shared
// grand mean across the whole cohort (Section 4.1).

import type { CLOId, Cohort, Student } from "../../types.ts";
import type { Rng } from "../rng.ts";
import { abilityFromRatings, grandMean } from "./ability.ts";

/** The raw survey shape: one row per real student, ratings only. Loading real
 *  data later is swapping the JSON source for this exact shape, nothing else. */
export interface RawStudent {
  id: string;
  cohortId: string;
  ratings: Record<CLOId, number>;
}

export interface RawCohort {
  id: string;
  intake: string;
  programmeId: string;
  students: RawStudent[];
}

/** Hydrate raw survey rows into a Cohort, computing theta per CLO from the
 *  grand mean over every rating in the batch (Section 4.1).
 *
 *  referenceGrandMean lets a caller pin theta to a FIXED external reference
 *  (e.g. the grand mean of a baseline batch) instead of this cohort's own mean.
 *  The default per-cohort centring makes one what-if readable but is blind to
 *  uniform shifts in absolute ability: a cohort that improved everywhere has
 *  the same internal structure and so the same theta. The backtest (Section 11)
 *  predicts one batch from another, so it must share one reference mean for the
 *  prediction to reflect a real absolute change rather than only relative shape. */
export function hydrateCohort(raw: RawCohort, referenceGrandMean?: number): Cohort {
  const gm =
    typeof referenceGrandMean === "number"
      ? referenceGrandMean
      : grandMean(raw.students);
  const students: Student[] = raw.students.map((s) => ({
    id: s.id,
    cohortId: s.cohortId,
    ratings: s.ratings,
    ability: abilityFromRatings(s.ratings, gm),
  }));
  return {
    id: raw.id,
    intake: raw.intake,
    programmeId: raw.programmeId,
    students,
  };
}

/** v1 bootstrap: sample n students with replacement from real rows. */
export function sampleCohort(students: Student[], n: number, rng: Rng): Student[] {
  const out: Student[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(students[rng.int(0, students.length)]);
  }
  return out;
}
