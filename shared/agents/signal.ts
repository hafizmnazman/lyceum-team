// Signal agent (spec Section 3). Programme -> employer/skills demand per CLO plus
// a per-subject drift flag. LLM-backed in live mode; replays a curated fixture
// for the demo (carried from v1's market fixture: CLO4 machine learning is the
// widest demand-vs-coverage gap, which is what flags CS220 for update).

import type { CLOId, ProgrammeId, SubjectId } from "../types.ts";
import type { EvidenceReport } from "../lib/evidence.ts";
import type { AgentMode } from "./mode.ts";
import { DEFAULT_MODE, liveNotImplemented } from "./mode.ts";

export interface SignalResult {
  cloDemand: Record<CLOId, number>;
  subjectDrift: Array<{ subjectId: SubjectId; gap: number; flag: "fine" | "update" | "new-subject" }>;
}

/** The gap at which a subject is flagged for an update, in the fixture and the live signal alike. */
export const UPDATE_GAP = 0.5;

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
    const flag: "fine" | "update" | "new-subject" = gap >= UPDATE_GAP ? "update" : "fine";
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

// ---------- live: Signal from a course's own evidence ----------
// Demand on an outcome is the share of reviewed postings asking for its most-asked mapped skill; coverage is the
// demand-weighted share of its mapped skills at or above their reviewed target (the report's coverage index, per
// outcome). The flag uses the share's 95% lower bound, so a handful of postings cannot flag a course on its own.

export interface OutcomeSignal {
  cloId: CLOId;
  skill: string; // the most-asked skill mapped to the outcome
  postings: number; eligible: number;
  demand: number; demandLow: number;
  coverage: number | null; // null until a mapped skill has a reviewed stage and target
  gap: number | null;
}

/** Per-outcome demand, coverage and gap from a course's evidence report, and the course's drift flag; drift is null
 *  until at least one outcome has both a demand and a coverage. */
export function signalFromEvidence(subjectId: SubjectId, report: EvidenceReport, outcomeIds: CLOId[]): {
  outcomes: OutcomeSignal[]; drift: SignalResult["subjectDrift"][number] | null;
} {
  const outcomes: OutcomeSignal[] = [];
  for (const cloId of outcomeIds) {
    const rows = report.rows.filter((r) => r.share !== null && r.share > 0 && r.mapping?.cloIds.includes(cloId));
    if (!rows.length) continue;
    const top = rows.reduce((a, b) => (b.share! > a.share! ? b : a));
    const known = rows.filter((r) => r.shortfall !== null), weight = known.reduce((s, r) => s + r.share!, 0);
    const coverage = weight ? known.filter((r) => !r.shortfall).reduce((s, r) => s + r.share!, 0) / weight : null;
    outcomes.push({ cloId, skill: top.skill, postings: top.postings, eligible: report.eligible, demand: top.share!,
      demandLow: top.interval?.low ?? 0, coverage, gap: coverage === null ? null : top.share! - coverage });
  }
  const judged = outcomes.filter((o) => o.coverage !== null);
  if (!judged.length) return { outcomes, drift: null };
  const gap = Math.max(...judged.map((o) => o.gap!));
  const flag = judged.some((o) => o.demandLow - o.coverage! >= UPDATE_GAP) ? "update" : "fine";
  return { outcomes, drift: { subjectId, gap, flag } };
}
