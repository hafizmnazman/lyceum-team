// The spine, assembled (implementation.md Section 4 + the Cohort agent of
// Section 5). In: a Cohort plus Item[]. Out: a CohortResult with every
// ItemResult (full provenance, every student x every item) and the aggregated
// CLOMastery[]. Deterministic given the seed. No LLM.

import type {
  CLOId,
  Cohort,
  CLOMastery,
  CohortResult,
  Item,
  ItemResult,
} from "../../types.ts";
import { config } from "../../config.ts";
import { makeRng } from "../rng.ts";
import { difficulty } from "./difficulty.ts";
import { pCorrect } from "./link.ts";
import { drawOutcome } from "./outcome.ts";
import { cloMastery } from "./mastery.ts";

export interface RunOptions {
  /** Override the global seed (Section 4.5). Defaults to config.seed. */
  seed?: number;
  /** Historical cohorts available per CLO, feeding confidence (Section 4.7). */
  batchSupport?: Record<CLOId, number>;
}

/** Distinct target CLOs in stable first-seen order, so output is reproducible. */
function targetCLOs(items: Item[]): CLOId[] {
  const seen = new Set<CLOId>();
  const out: CLOId[] = [];
  for (const it of items) {
    if (!seen.has(it.targetCLO)) {
      seen.add(it.targetCLO);
      out.push(it.targetCLO);
    }
  }
  return out;
}

export function runCohort(
  cohort: Cohort,
  items: Item[],
  opts: RunOptions = {},
): CohortResult {
  // One seeded stream, drawn in a fixed order (students x items), so the same
  // seed yields the same failed items every run.
  const rng = makeRng(opts.seed ?? config.seed);
  const batchSupport = opts.batchSupport ?? {};

  const itemResults: ItemResult[] = [];
  for (const s of cohort.students) {
    for (const it of items) {
      const theta = s.ability[it.targetCLO];
      // No grounding for this CLO (a real survey can skip a CLO; a Layer 4
      // material check can target one the cohort never rated). Emit no row,
      // exactly as cloMastery skips it, so the provenance trail and the
      // aggregate describe the same (student, item) set and we never write a
      // NaN probability or a fabricated fail into the drill-down's evidence.
      if (typeof theta !== "number") continue;
      const p = pCorrect(theta, difficulty(it));
      const outcome = drawOutcome(p, rng);
      itemResults.push({ studentId: s.id, itemId: it.id, p, outcome });
    }
  }

  const cloMasteryArr: CLOMastery[] = targetCLOs(items).map((cloId) =>
    cloMastery(cloId, cohort.students, items, batchSupport[cloId] ?? 0),
  );

  return {
    cohortId: cohort.id,
    itemResults,
    cloMastery: cloMasteryArr,
  };
}

// Re-export the spine pieces so callers (and the UI) import from one place.
export { grandMean, thetaFromRating, abilityFromRatings } from "./ability.ts";
export { difficulty, difficultyForLevel } from "./difficulty.ts";
export { sigma, pCorrect } from "./link.ts";
export { drawOutcome } from "./outcome.ts";
export { cloMastery } from "./mastery.ts";
export { groundingConfidence } from "./confidence.ts";
export { hydrateCohort, sampleCohort } from "./cohort.ts";
export type { RawCohort, RawStudent } from "./cohort.ts";
export { applyScenario, CURRENT_SCENARIO } from "./scenario.ts";
export type { Scenario } from "./scenario.ts";
