// Section 4.1, ability (grounded input).
//
// Each student's ability on a CLO comes straight from their 1..10 self-rating,
// mapped onto the logistic scale with ONE global transform, identical for every
// CLO. Centring on the grand mean puts theta = 0 at the average student on the
// average outcome, which is what makes the downstream probabilities readable.

import type { CLOId } from "../../types.ts";
import { config } from "../../config.ts";

/** Grand mean: mean of every rating across all students and all CLOs. */
export function grandMean(rows: { ratings: Record<CLOId, number> }[]): number {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    for (const key in row.ratings) {
      sum += row.ratings[key];
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

/** theta(student, clo) = (rating - grandMean) / SCALE. */
export function thetaFromRating(rating: number, gm: number): number {
  return (rating - gm) / config.SCALE;
}

/** Map a full rating record to a theta record using the shared grand mean. */
export function abilityFromRatings(
  ratings: Record<CLOId, number>,
  gm: number,
): Record<CLOId, number> {
  const out: Record<CLOId, number> = {};
  for (const key in ratings) out[key] = thetaFromRating(ratings[key], gm);
  return out;
}
