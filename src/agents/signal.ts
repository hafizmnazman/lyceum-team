// Signal agent (spec Section 3). Programme -> employer/skills demand per CLO plus
// a per-subject drift flag. LLM-backed in live mode; replays a curated fixture
// for the demo (carried from v1's market fixture: CLO4 machine learning is the
// widest demand-vs-coverage gap, which is what flags CS220 for update).

import type { CLOId, ProgrammeId, SubjectId } from "../types.ts";
import type { AgentMode } from "./mode.ts";
import { DEFAULT_MODE, liveNotImplemented } from "./mode.ts";

export interface SignalResult {
  cloDemand: Record<CLOId, number>;
  subjectDrift: Array<{ subjectId: SubjectId; gap: number; flag: "fine" | "update" | "new-subject" }>;
}

// Demand and coverage per CLO (0..1); gap = demand - coverage. Carried from v1's
// audited market fixture so the demo's flagged subject (CS220) is the same.
const DEMAND: Record<CLOId, number> = {
  CLO1: 0.4,
  CLO2: 0.62,
  CLO3: 0.48,
  CLO4: 0.88,
  CLO5: 0.71,
  CLO6: 0.7,
  CLO7: 0.82,
};

const COVERAGE: Record<CLOId, number> = {
  CLO1: 0.24,
  CLO2: 0.29,
  CLO3: 0.27,
  CLO4: 0.26,
  CLO5: 0.27,
  CLO6: 0.22,
  CLO7: 0.25,
};

// CLO -> subject (the assessed outcome each subject owns).
const CLO_SUBJECT: Record<CLOId, SubjectId> = {
  CLO1: "CS101",
  CLO2: "ST201",
  CLO3: "MA201",
  CLO4: "CS220",
  CLO5: "CS310",
  CLO6: "CS230",
  CLO7: "CS340",
};

export const SIGNAL_FIXTURE: SignalResult = {
  cloDemand: DEMAND,
  subjectDrift: (Object.keys(DEMAND) as CLOId[]).map((cloId) => {
    const gap = DEMAND[cloId] - COVERAGE[cloId];
    // Widest demand gaps flag the subject for an update. CS220 (CLO4, gap 0.62)
    // is the headline; nothing here is so far off the map it needs a new subject.
    const flag: "fine" | "update" | "new-subject" = gap >= 0.5 ? "update" : "fine";
    return { subjectId: CLO_SUBJECT[cloId], gap, flag };
  }),
};

/** Per-CLO demand and per-subject drift for a programme. */
export function runSignal(_programmeId: ProgrammeId, mode: AgentMode = DEFAULT_MODE): SignalResult {
  if (mode === "fixture") return SIGNAL_FIXTURE;
  return liveNotImplemented("Signal agent");
}

/** Demand - coverage per CLO, for the dual-gap chart and the trends view. */
export function marketGapByCLO(): Record<CLOId, { demand: number; coverage: number; gap: number }> {
  const out: Record<CLOId, { demand: number; coverage: number; gap: number }> = {};
  for (const cloId of Object.keys(DEMAND) as CLOId[]) {
    out[cloId] = { demand: DEMAND[cloId], coverage: COVERAGE[cloId], gap: DEMAND[cloId] - COVERAGE[cloId] };
  }
  return out;
}
