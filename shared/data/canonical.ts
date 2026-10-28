// The canonical worked example (implementation.md Section 16), pinned as a
// calibrated fixture for the drill-down beat. The spine is the live engine for
// the cohort aggregates; the drill-down's headline learner and item are a
// pinned illustrative case so the audit trail computes the exact design numbers
// (theta 0.40, b 0.70, P 0.43), which the raw spine cannot hit because theta is
// quantised by integer self-ratings and b 0.70 is off the Bloom ladder.
//
// The probability is still COMPUTED from these inputs by the spine's link, not
// hard-coded, so the drill-down shows real maths over a calibrated case:
//   sigma(0.40 - 0.70) = sigma(-0.30) = 0.4256 -> 0.43  (the design shows 0.42; this corrects it).

import type { Item, Student } from "../types.ts";

/** Pinned drill-down learner, ability theta = 0.40 on CLO4. Note: with CLO4 the
 *  weakest outcome, theta 0.40 sits above the cohort's CLO4 median; the low
 *  P(correct) comes from the hard item ML-14 (b 0.70), not from a weak learner,
 *  so the drill-down copy must not claim below-average standing. */
export const CANONICAL_LEARNER: Student = {
  id: "S-0488",
  cohortId: "C-2023-S1",
  ratings: { CLO4: 6 },
  ability: { CLO4: 0.4 },
};

/** Pinned drill-down item: derive the gradient of the logistic loss. Calibrated
 *  difficulty b = 0.70, carried on Item.difficulty (off the Bloom ladder). */
export const CANONICAL_ITEM: Item = {
  id: "ML-14",
  text: "Derive the gradient of the logistic loss.",
  targetCLO: "CLO4",
  bloomLevel: "Analyse",
  difficulty: 0.7,
};

export const CANONICAL = {
  cloId: "CLO4",
  cloName: "Machine learning",
  course: "CS220",
  prerequisite: "MA201",
} as const;
