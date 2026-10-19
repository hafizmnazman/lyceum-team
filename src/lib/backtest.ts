// The backtest (implementation.md Section 11). Predict a past cohort's recorded
// outcome from its before-ratings alone, then compare to the held-out actual.
// The predictor is the spine, unchanged: predicted mastery per CLO is exactly
// the Cohort agent's CLOMastery over the historical before-ratings. The actual
// is the recorded outcome the model never saw.

import type { CLOId, Item } from "../types.ts";
import type { RawCohort } from "./spine/cohort.ts";
import { hydrateCohort } from "./spine/cohort.ts";
import { runCohort } from "./spine/index.ts";
import { mean } from "./stats.ts";

export interface BacktestData extends RawCohort {
  /** Recorded mastery per CLO after the cohort progressed (the held-out truth). */
  recordedMastery: Record<CLOId, number>;
  /** Calibration anchor (rating at theta = 0). Shared across cohorts so the
   *  prediction recovers ABSOLUTE ability, not just this cohort's relative
   *  shape. Without it, per-cohort centring would be blind to a uniformly
   *  stronger or weaker cohort (see src/lib/spine/cohort.ts). */
  referenceGrandMean?: number;
}

export interface BacktestPoint {
  cloId: CLOId;
  predicted: number;
  actual: number;
  residual: number; // predicted - actual
}

export interface BacktestResult {
  points: BacktestPoint[];
  overallPredicted: number;
  overallActual: number;
  mae: number; // mean absolute residual across CLOs
  maxAbsResidual: number;
  tolerance: number;
  withinTolerance: number; // CLOs whose residual is within tolerance
  n: number; // historical cohort size
}

export function runBacktest(data: BacktestData, items: Item[], tolerance = 0.05): BacktestResult {
  const cohort = hydrateCohort(
    {
      id: data.id,
      intake: data.intake,
      programmeId: data.programmeId,
      students: data.students,
    },
    data.referenceGrandMean,
  );
  const result = runCohort(cohort, items);
  const predictedByCLO = new Map(result.cloMastery.map((m) => [m.cloId, m.meanP]));

  const cloIds = Object.keys(data.recordedMastery) as CLOId[];
  const points: BacktestPoint[] = cloIds.map((cloId) => {
    const predicted = predictedByCLO.get(cloId) ?? 0;
    const actual = data.recordedMastery[cloId];
    return { cloId, predicted, actual, residual: predicted - actual };
  });

  const absResiduals = points.map((p) => Math.abs(p.residual));
  return {
    points,
    overallPredicted: mean(points.map((p) => p.predicted)),
    overallActual: mean(points.map((p) => p.actual)),
    mae: mean(absResiduals),
    maxAbsResidual: absResiduals.length ? Math.max(...absResiduals) : 0,
    tolerance,
    withinTolerance: absResiduals.filter((r) => r <= tolerance).length,
    n: cohort.students.length,
  };
}
