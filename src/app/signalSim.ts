// Signal agent staged reveal (demo spec Section 5a). Mirrors the acceptance-test
// reveal in `sim.ts`: the answer is fixed (the Signal fixture), but the agent is
// shown doing its work before the gap appears. Deterministic, fixed 200ms ticks,
// no randomness, identical every run:
//   reading    (4s / 20 ticks): demand source-types populate one by one
//   extracting (4s / 20 ticks): rising skills surface, ranked, machine-learning
//                               ones climbing to the top
//   mapping    (4s / 20 ticks): the skills map onto the CLOs, the demand bars
//                               fill, and CS220 / CLO4 resolves to the widest
//                               gap, 0.62
//   done:                       the existing Trends focal state (gap 0.62 and
//                               the "Route this" action)
// Total ~12s. The final gap and the flagged subject match the Signal fixture
// exactly, so nothing downstream changes.

import { marketGapByCLO } from "../agents/signal.ts";
import { CLOS, CLO_NAMES } from "../data/seed.ts";

export type SignalPhase = "reading" | "extracting" | "mapping" | "done";

export const SIGNAL_TICK_MS = 200;
const READ_TICKS = 20; // 4s
const EXTRACT_TICKS = 20; // 4s
const MAP_TICKS = 20; // 4s
export const SIGNAL_TOTAL_TICKS = READ_TICKS + EXTRACT_TICKS + MAP_TICKS; // 60
export const SIGNAL_TOTAL_MS = SIGNAL_TOTAL_TICKS * SIGNAL_TICK_MS; // 12000

// The demand source-types the agent reads, then the rising skills it extracts.
// Machine-learning-adjacent skills lead the ranking, which is what surfaces CLO4.
export const SIGNAL_SOURCES: string[] = [
  "Employer job postings",
  "Job-market skill signals",
  "Industry skills-demand feeds",
];

export const SIGNAL_SKILLS: string[] = [
  "Machine learning",
  "Applied ML / model deployment",
  "Data-driven decision making",
  "Statistical modelling",
];

export interface SignalCloRow {
  cloId: string;
  subjectId: string;
  name: string;
  demand: number;
  coverage: number;
  gap: number;
}

// The seven outcomes with demand / coverage / gap, widest gap first. Derived from
// the same Signal fixture the Trends focal state renders, so the reveal maps
// straight into it. The top row is CS220 / CLO4, gap 0.62.
export const SIGNAL_CLO_ROWS: SignalCloRow[] = (() => {
  const gaps = marketGapByCLO();
  return CLOS.map((c) => ({
    cloId: c.id,
    subjectId: c.subjectId,
    name: CLO_NAMES[c.id] ?? c.id,
    demand: gaps[c.id]?.demand ?? 0,
    coverage: gaps[c.id]?.coverage ?? 0,
    gap: gaps[c.id]?.gap ?? 0,
  })).sort((a, b) => b.gap - a.gap);
})();

export const SIGNAL_TOP: SignalCloRow = SIGNAL_CLO_ROWS[0];

export interface SignalSimState {
  phase: SignalPhase;
  tick: number;
  sources: string[]; // revealed source-types so far
  skills: string[]; // revealed rising skills so far (ranked)
  mapProgress: number; // 0..1 how far the demand bars have filled during mapping
  gapDisplayed: number; // the top gap counting up towards 0.62 during mapping
  clatched: boolean; // CS220 / CLO4 has resolved to its final gap
  caption: string;
}

const easeOut = (x: number): number => 1 - Math.pow(1 - x, 3);

export function initSignalSim(): SignalSimState {
  return {
    phase: "reading",
    tick: 0,
    sources: [],
    skills: [],
    mapProgress: 0,
    gapDisplayed: 0,
    clatched: false,
    caption: "The signal agent is reading employer demand.",
  };
}

/** Advance one tick. Pure: same input, same output, no randomness. */
export function stepSignal(s: SignalSimState): SignalSimState {
  const tick = Math.min(s.tick + 1, SIGNAL_TOTAL_TICKS);

  // reading: the source-types populate one by one.
  if (tick <= READ_TICKS) {
    const n = Math.ceil((tick / READ_TICKS) * SIGNAL_SOURCES.length);
    return {
      ...s,
      tick,
      phase: "reading",
      sources: SIGNAL_SOURCES.slice(0, n),
      skills: [],
      caption: "The signal agent is reading employer demand.",
    };
  }

  // extracting: the rising skills surface, ranked, machine learning at the top.
  if (tick <= READ_TICKS + EXTRACT_TICKS) {
    const f = (tick - READ_TICKS) / EXTRACT_TICKS;
    const n = Math.ceil(f * SIGNAL_SKILLS.length);
    return {
      ...s,
      tick,
      phase: "extracting",
      sources: SIGNAL_SOURCES,
      skills: SIGNAL_SKILLS.slice(0, n),
      caption: "Extracting the rising skills. Machine learning is climbing.",
    };
  }

  // mapping: the skills map onto the CLOs; the bars fill; CLO4 resolves to 0.62.
  if (tick < SIGNAL_TOTAL_TICKS) {
    const f = (tick - READ_TICKS - EXTRACT_TICKS) / MAP_TICKS;
    const e = easeOut(f);
    return {
      ...s,
      tick,
      phase: "mapping",
      sources: SIGNAL_SOURCES,
      skills: SIGNAL_SKILLS,
      mapProgress: e,
      gapDisplayed: SIGNAL_TOP.gap * e,
      clatched: false,
      caption: "Mapping demand onto your outcomes.",
    };
  }

  // done: settle onto the Trends focal state.
  return {
    ...s,
    tick: SIGNAL_TOTAL_TICKS,
    phase: "done",
    sources: SIGNAL_SOURCES,
    skills: SIGNAL_SKILLS,
    mapProgress: 1,
    gapDisplayed: SIGNAL_TOP.gap,
    clatched: true,
    caption: `${SIGNAL_TOP.subjectId} (${SIGNAL_TOP.cloId}, ${SIGNAL_TOP.name.toLowerCase()}) is drifting from demand, gap ${SIGNAL_TOP.gap.toFixed(2)}.`,
  };
}
