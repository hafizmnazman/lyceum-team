// Calibration knobs (implementation.md Section 10). One file so tuning is trivial.
// Build on the defaults. SCALE is the one to check against real pass rates
// (Section 4.8); the Bloom values are a sensible starting spread.
//
// Two values are explicit judgement calls, marked [KNOB] in the spec:
//   - SCALE: ability spread on the logistic scale (Section 4.1)
//   - the confidence formula f (Section 4.7)

import type { BloomLevel } from "./types.ts";

export const config = {
  // Section 4.1, ability spread on the logistic scale. [KNOB]
  // theta = (rating - grandMean) / SCALE. Larger SCALE compresses the cohort
  // toward the average student (probabilities toward 0.5); smaller SCALE
  // spreads them out. Calibrate so per-CLO mean P lands roughly 0.2..0.8.
  SCALE: 2,

  // Section 4.3, item difficulty (b) by cognitive level. Read straight off
  // the Bloom level each item is written at; never fitted (no IRT history).
  bloomLadder: {
    Remember: -1.0,
    Understand: -0.5,
    Apply: 0.0,
    Analyse: 0.5,
    Evaluate: 1.0,
    Create: 1.5,
  } satisfies Record<BloomLevel, number>,

  // Section 4.5, seeded RNG so the demo is reproducible: same seed, same
  // failed items, every run.
  seed: 42,

  // Section 4.7, confidence formula params. [KNOB]
  // confidence = clamp01( seTerm * batchTerm ) where
  //   seTerm    = 1 / (1 + seWeight * se)            (tighter mean -> higher)
  //   batchTerm = batchSupport / (batchSupport + batchHalf)  (more batches -> higher)
  // Monotone and bounded in 0..1, so it never needs a hard threshold.
  confidence: {
    seWeight: 2.5,
    batchHalf: 1,
  },

  // Prerequisite penalty. [KNOB] When a course is scheduled before a
  // prerequisite it depends on, the cohort meets it without the assumed maths,
  // so their ability on that outcome drops. This is the mechanism behind the
  // verdict: the Curriculum agent's conflict directly causes the readiness
  // drop the spine then measures. Expressed as a theta reduction.
  //   prereqPenalty: applied to the directly conflicted outcome (CLO4)
  //   cascadeFactor: fraction of the penalty applied to downstream outcomes
  //                  (e.g. deep learning, which builds on machine learning)
  prereqPenalty: 0.55,
  cascadeFactor: 0.7,

  // Material generation (Section 9). [KNOB] A material that teaches a target
  // outcome lifts the cohort's ability on it (the inverse of the prerequisite
  // penalty: the cohort now meets the outcome with the support it needs).
  //   uplift:        theta gain on a well-covered target CLO
  //   masteryTarget: the bar the cohort must clear for the material to pass
  material: {
    uplift: 0.65,
    masteryTarget: 0.55,
  },
} as const;

export type Config = typeof config;
