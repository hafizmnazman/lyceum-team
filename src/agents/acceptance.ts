// Cohort agent (spec Section 3): THE SPINE. runAcceptanceTest wraps v1's audited
// runCohort to turn a proposal into a VerdictReport. It never calls an LLM; it is
// pure maths over the real survey.
//
// The mechanism (unchanged from v1): the Curriculum agent's detected conflict is
// turned into a per-CLO ability penalty (buildProposedScenario); the spine runs
// the cohort current vs proposed; the readiness drop the spine measures is caused
// by the same conflict the verdict reports. That is the chain the drill-down
// walks back. Reusing the same survey, items, penalties, seed and batch support
// as v1 reproduces the proven numbers exactly (0.60 -> 0.58, CLO4 0.45, P 0.43).

import type { ChangeProposal, Item, Subject, SurveyRecord, VerdictReport } from "../types.ts";
import type { Scenario } from "../lib/spine/scenario.ts";
import { config } from "../config.ts";
import { hydrateCohort } from "../lib/spine/cohort.ts";
import { runCohort } from "../lib/spine/index.ts";
import { applyScenario, CURRENT_SCENARIO } from "../lib/spine/scenario.ts";
import { difficulty } from "../lib/spine/difficulty.ts";
import { pCorrect } from "../lib/spine/link.ts";
import { mean, quantile, sd } from "../lib/stats.ts";
import {
  BATCH_SUPPORT,
  CLO_NAMES,
  SUBJECTS,
  SUBJECTS_BY_ID,
  cohortFromSurvey,
} from "../data/seed.ts";
import { CANONICAL, CANONICAL_ITEM, CANONICAL_LEARNER } from "../data/canonical.ts";
import { detectPrerequisiteConflicts } from "./curriculum.ts";
import type { PrerequisiteConflict } from "./curriculum.ts";

const MAX_FAILED_ITEMS = 12;

/** Turn detected conflicts into ability deltas: a full penalty on each directly
 *  conflicted outcome, and a cascade penalty on outcomes whose subject depends
 *  (transitively) on a conflicted subject (e.g. deep learning downstream of a
 *  broken machine-learning sequence). Carried from v1's buildProposedScenario,
 *  adapted to Subjects. */
export function buildProposedScenario(
  conflicts: PrerequisiteConflict[],
  subjects: Subject[] = SUBJECTS,
): Scenario {
  if (conflicts.length === 0) {
    return { id: "proposed", label: "Proposed change", description: "No conflicts.", abilityDeltas: {} };
  }

  const deltas: Record<string, number> = {};
  const conflictedSubjects = new Set<string>();
  for (const c of conflicts) {
    conflictedSubjects.add(c.subjectId);
    const subject = subjects.find((s) => s.id === c.subjectId);
    for (const cloId of subject?.cloIds ?? []) deltas[cloId] = -config.prereqPenalty;
  }

  // Reverse edges: subject -> subjects that list it as a prerequisite.
  const dependents = new Map<string, string[]>();
  for (const s of subjects) {
    for (const pre of s.prerequisiteSubjectIds) {
      dependents.set(pre, [...(dependents.get(pre) ?? []), s.id]);
    }
  }

  // BFS downstream from the conflicted subjects; cascade-penalise their CLOs.
  const downstream = new Set<string>();
  const queue = [...conflictedSubjects];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const dep of dependents.get(cur) ?? []) {
      if (!downstream.has(dep) && !conflictedSubjects.has(dep)) {
        downstream.add(dep);
        queue.push(dep);
      }
    }
  }
  const byId = new Map(subjects.map((s) => [s.id, s]));
  for (const subjectId of downstream) {
    for (const cloId of byId.get(subjectId)?.cloIds ?? []) {
      deltas[cloId] = (deltas[cloId] ?? 0) - config.prereqPenalty * config.cascadeFactor;
    }
  }

  const head = conflicts[0];
  return {
    id: "proposed",
    label: `Proposed: ${head.subjectId} before ${head.missingPrereqId}`,
    description: `${head.subjectId} meets the cohort before its ${head.missingPrereqId} prerequisite.`,
    abilityDeltas: deltas,
  };
}

export interface AcceptanceOptions {
  /** Override the subject graph used for conflict detection (defaults to all). */
  subjects?: Subject[];
  /** Mark the cohort as a stand-in (Analogy agent). */
  isProxyCohort?: boolean;
  /** Subjects the proxy cohort borrowed from, for the provenance line. */
  borrowedFrom?: string[];
}

/** Per-student spread of the proposed cohort, for the mastery strip and the
 *  staged-run histogram. Not part of the VerdictReport contract; computed
 *  alongside it so the chart and the headline share one run. */
export interface AcceptanceDistribution {
  studentMeans: number[]; // sorted ascending, one mean P per student
  iqr: [number, number]; // [p25, p75]
  sd: number;
}

export interface AcceptanceComputation {
  report: VerdictReport;
  distribution: AcceptanceDistribution;
}

/** Run the acceptance test: real spine, revealed-at-pace in the UI (Section 7),
 *  but computed in full here. Returns the VerdictReport the proposal carries. */
export function runAcceptanceTest(
  proposal: ChangeProposal,
  subject: Subject,
  survey: SurveyRecord[],
  items: Item[],
  opts: AcceptanceOptions = {},
): VerdictReport {
  return computeAcceptance(proposal, subject, survey, items, opts).report;
}

/** The report plus the per-student distribution, for the UI (one shared run). */
export function runAcceptanceWithDistribution(
  proposal: ChangeProposal,
  subject: Subject,
  survey: SurveyRecord[],
  items: Item[],
  opts: AcceptanceOptions = {},
): AcceptanceComputation {
  return computeAcceptance(proposal, subject, survey, items, opts);
}

function computeAcceptance(
  proposal: ChangeProposal,
  subject: Subject,
  survey: SurveyRecord[],
  items: Item[],
  opts: AcceptanceOptions = {},
): AcceptanceComputation {
  const subjects = opts.subjects ?? SUBJECTS;
  // A new-subject proposal with no cohort of its own is tested on a proxy
  // (the Analogy agent stands in); opts can force it either way.
  const isProxyCohort = opts.isProxyCohort ?? proposal.kind === "new-subject";
  const raw = cohortFromSurvey(survey);
  const cohort = hydrateCohort(raw);

  // Order conflicts so the one on the subject under test leads the verdict copy.
  const conflicts = detectPrerequisiteConflicts(subjects).sort(
    (a, b) => Number(b.subjectId === subject.id) - Number(a.subjectId === subject.id),
  );
  const proposedScenario = buildProposedScenario(conflicts, subjects);

  const current = runCohort(applyScenario(cohort, CURRENT_SCENARIO), items, { batchSupport: BATCH_SUPPORT });
  const proposed = runCohort(applyScenario(cohort, proposedScenario), items, { batchSupport: BATCH_SUPPORT });

  const currentMastery = mean(current.itemResults.map((r) => r.p));
  const projectedMastery = mean(proposed.itemResults.map((r) => r.p));

  // Weakest outcome under the proposal (CLO4 in the canonical case).
  const weakest = [...proposed.cloMastery].sort((a, b) => a.meanP - b.meanP)[0];

  // Failed-item evidence: real recorded fails on the weakest outcome, straight
  // from the proposed run's provenance (no generation).
  const itemsOnWeakest = new Set(items.filter((it) => it.targetCLO === weakest.cloId).map((it) => it.id));
  const failedItems = proposed.itemResults
    .filter((r) => r.outcome === 0 && itemsOnWeakest.has(r.itemId))
    .slice(0, MAX_FAILED_ITEMS)
    .map((r) => ({ studentId: r.studentId, itemId: r.itemId, p: r.p }));

  // Canonical drill-down: the pinned calibrated case, computed live by the link.
  const theta = CANONICAL_LEARNER.ability[CANONICAL.cloId];
  const b = difficulty(CANONICAL_ITEM);
  const drillP = pCorrect(theta, b);
  const headConflict = conflicts[0];
  const drillRoot = {
    studentId: CANONICAL_LEARNER.id,
    cloId: CANONICAL.cloId,
    theta,
    itemId: CANONICAL_ITEM.id,
    b,
    p: drillP,
    cause: headConflict
      ? `${headConflict.subjectId} meets the cohort before ${headConflict.missingPrereqId}, so ${CANONICAL.cloId} ability drops by ${config.prereqPenalty} (theta), the readiness penalty the verdict reports.`
      : `${CANONICAL_ITEM.id} is a hard item (b ${b.toFixed(2)}) relative to the learner's ability.`,
  };

  const prerequisiteConflicts = conflicts.map((c) => ({
    subjectId: c.subjectId,
    missingPrereqId: c.missingPrereqId,
    edge: c.edge,
  }));

  const summary = buildSummary({
    currentMastery,
    projectedMastery,
    weakestCloId: weakest.cloId,
    conflict: headConflict,
    isProxyCohort,
  });

  const report: VerdictReport = {
    summary,
    projectedMastery,
    currentMastery,
    cloMastery: proposed.cloMastery.map((m) => ({
      cloId: m.cloId,
      meanP: m.meanP,
      spread: m.spread,
      confidence: m.confidence,
    })),
    failedItems,
    drillRoot,
    prerequisiteConflicts,
    groundedOnLearners: cohort.students.length,
    isProxyCohort,
  };

  // Per-student spread under the proposal, for the strip and the histogram.
  const byStudent = new Map<string, number[]>();
  for (const r of proposed.itemResults) {
    const arr = byStudent.get(r.studentId) ?? [];
    arr.push(r.p);
    byStudent.set(r.studentId, arr);
  }
  const studentMeans = [...byStudent.values()].map((ps) => mean(ps)).sort((a, b) => a - b);
  const distribution: AcceptanceDistribution = {
    studentMeans,
    iqr: [quantile(studentMeans, 0.25), quantile(studentMeans, 0.75)],
    sd: sd(studentMeans),
  };

  return { report, distribution };
}

function buildSummary(args: {
  currentMastery: number;
  projectedMastery: number;
  weakestCloId: string;
  conflict?: PrerequisiteConflict;
  isProxyCohort: boolean;
}): string {
  const cur = args.currentMastery.toFixed(2);
  const proj = args.projectedMastery.toFixed(2);
  const weakestName = CLO_NAMES[args.weakestCloId] ?? args.weakestCloId;
  const proxyNote = args.isProxyCohort
    ? " Measured on a proxy cohort drawn from similar outcomes, as this subject has no history of its own."
    : "";

  if (args.conflict) {
    const subjTitle = SUBJECTS_BY_ID[args.conflict.subjectId]?.title ?? args.conflict.subjectId;
    const preTitle = SUBJECTS_BY_ID[args.conflict.missingPrereqId]?.title ?? args.conflict.missingPrereqId;
    return (
      `The proposed change lowers projected cohort mastery from ${cur} to ${proj}. ` +
      `${subjTitle} is scheduled before the ${preTitle} it depends on, so most students meet it ` +
      `without the foundation it assumes; ${weakestName} carries the drop.${proxyNote}`
    );
  }
  if (args.projectedMastery >= args.currentMastery) {
    return `The proposed change holds projected cohort mastery at ${proj}, with no sequencing conflicts.${proxyNote}`;
  }
  return `The proposed change lowers projected cohort mastery from ${cur} to ${proj}, weakest on ${weakestName}.${proxyNote}`;
}
