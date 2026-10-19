// Staged acceptance-test reveal (spec Section 7). The real result is computed up
// front by runAcceptanceWithDistribution; this state machine reveals it at human
// pace over ~16s, deterministically (fixed ticks, no randomness), so every run is
// identical:
//   drawing  (2s): "Sampling N learners from the CLO mastery survey." count climbs
//   running  (12s): "Running CLO items." learner counter + histogram fill in
//   settling (2s): the mastery figure animates to its final value; verdict appears
//   done:           unlock the drill-down
// Total 16s, inside the 12-20s window the spec requires.

import type { VerdictReport } from "../types.ts";
import type { AcceptanceDistribution } from "../agents/acceptance.ts";

export type SimPhase = "idle" | "drawing" | "running" | "settling" | "done";

export const SIM_TICK_MS = 200;
const DRAW_MS = 2000;
const RUN_MS = 12000;
const SETTLE_MS = 2000;
export const SIM_TOTAL_MS = DRAW_MS + RUN_MS + SETTLE_MS; // 16000
export const SIM_BINS = 12;

export interface SimState {
  phase: SimPhase;
  proposalId: string;
  elapsedMs: number;
  totalLearners: number;
  learnersDrawn: number;
  learnersRun: number;
  bins: number[]; // current histogram counts (fill incrementally)
  finalBins: number[]; // the completed histogram
  displayedMastery: number; // animates current -> projected during settling
  report: VerdictReport;
  distribution: AcceptanceDistribution;
  caption: string;
}

/** Bucket the per-student means into SIM_BINS over [0, 1]. */
function histogram(means: number[]): number[] {
  const bins = new Array(SIM_BINS).fill(0);
  for (const m of means) {
    let i = Math.floor(m * SIM_BINS);
    if (i < 0) i = 0;
    if (i >= SIM_BINS) i = SIM_BINS - 1;
    bins[i] += 1;
  }
  return bins;
}

export function initSim(
  proposalId: string,
  report: VerdictReport,
  distribution: AcceptanceDistribution,
): SimState {
  const finalBins = histogram(distribution.studentMeans);
  return {
    phase: "drawing",
    proposalId,
    elapsedMs: 0,
    totalLearners: report.groundedOnLearners,
    learnersDrawn: 0,
    learnersRun: 0,
    bins: new Array(SIM_BINS).fill(0),
    finalBins,
    displayedMastery: report.currentMastery,
    report,
    distribution,
    caption: `Sampling ${report.groundedOnLearners} learners from the CLO mastery survey.`,
  };
}

/** Advance one tick. Pure: same input, same output. */
export function stepSim(s: SimState): SimState {
  const elapsed = Math.min(s.elapsedMs + SIM_TICK_MS, SIM_TOTAL_MS);
  const { totalLearners, finalBins, report } = s;

  if (elapsed <= DRAW_MS) {
    const f = elapsed / DRAW_MS;
    return {
      ...s,
      elapsedMs: elapsed,
      phase: "drawing",
      learnersDrawn: Math.round(totalLearners * f),
      caption: `Sampling ${report.groundedOnLearners} learners from the CLO mastery survey.`,
    };
  }
  if (elapsed <= DRAW_MS + RUN_MS) {
    const f = (elapsed - DRAW_MS) / RUN_MS;
    return {
      ...s,
      elapsedMs: elapsed,
      phase: "running",
      learnersDrawn: totalLearners,
      learnersRun: Math.round(totalLearners * f),
      bins: finalBins.map((b) => Math.round(b * f)),
      caption: `Running CLO items: ${Math.round(totalLearners * f)} of ${totalLearners} learners.`,
    };
  }
  if (elapsed < SIM_TOTAL_MS) {
    const f = (elapsed - DRAW_MS - RUN_MS) / SETTLE_MS;
    const displayed = report.currentMastery + (report.projectedMastery - report.currentMastery) * f;
    return {
      ...s,
      elapsedMs: elapsed,
      phase: "settling",
      learnersRun: totalLearners,
      bins: finalBins,
      displayedMastery: displayed,
      caption: "Settling the verdict.",
    };
  }
  return {
    ...s,
    elapsedMs: SIM_TOTAL_MS,
    phase: "done",
    learnersDrawn: totalLearners,
    learnersRun: totalLearners,
    bins: finalBins,
    displayedMastery: report.projectedMastery,
    caption: report.summary,
  };
}
