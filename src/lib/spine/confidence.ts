// Section 4.7, confidence.
//
// Tied to how much real data backs this CLO. Simple, monotone, shown. Wider
// rating spread or fewer historical batches lowers it, which lets the system
// honestly say "not enough to call this".
//
//   se          = sd(ratings on clo) / sqrt(n students)   (tighter mean -> higher)
//   batchSupport = historical cohorts available for this CLO / transition
//   confidence   = clamp01( f(se, batchSupport) )          [KNOB] on the exact f

import type { CLOId, Student } from "../../types.ts";
import { config } from "../../config.ts";
import { clamp01, mean, sd } from "../stats.ts";

export function groundingConfidence(
  cloId: CLOId,
  students: Student[],
  batchSupport: number,
): number {
  const ratings: number[] = [];
  for (const s of students) {
    const r = s.ratings[cloId];
    if (typeof r === "number") ratings.push(r);
  }
  const n = ratings.length;
  const m = mean(ratings);
  const spread = sd(ratings, m);
  const se = n > 0 ? spread / Math.sqrt(n) : 1;

  const seTerm = 1 / (1 + config.confidence.seWeight * se);
  const batchTerm = batchSupport / (batchSupport + config.confidence.batchHalf);
  return clamp01(seTerm * batchTerm);
}
