// Scenario transform. A curriculum change does not alter a student's raw
// self-rating; it alters the conditions under which they meet an outcome. The
// canonical case (Section 16): scheduling CS220 before its MA201 prerequisite
// means the cohort meets machine learning without the linear algebra it
// assumes, so their ability on that outcome (and outcomes downstream of it)
// drops. We model that as a per-CLO theta adjustment applied before the link.
//
// This stays pure spine: it takes ability deltas in and returns an adjusted
// cohort out. WHERE the deltas come from (the Curriculum agent's detected
// conflicts, cascaded through the course dependency graph) is the agent layer's
// job, so the spine never depends on an agent.

import type { CLOId, Cohort, Student } from "../../types.ts";

export interface Scenario {
  id: string;
  label: string;
  description: string;
  /** Per-CLO theta adjustment. Negative lowers ability on that outcome. An
   *  empty record is the unchanged baseline (the current curriculum). */
  abilityDeltas: Record<CLOId, number>;
}

export const CURRENT_SCENARIO: Scenario = {
  id: "current",
  label: "Current curriculum",
  description: "Every course sits after the prerequisites it depends on.",
  abilityDeltas: {},
};

/** Apply a scenario's theta deltas to every student, returning a new cohort.
 *  The originals are not mutated, so current and proposed can run off the same
 *  hydrated cohort. */
export function applyScenario(cohort: Cohort, scenario: Scenario): Cohort {
  const deltas = scenario.abilityDeltas;
  const students: Student[] = cohort.students.map((s) => {
    const ability: Record<CLOId, number> = { ...s.ability };
    for (const cloId in deltas) {
      if (typeof ability[cloId] === "number") {
        ability[cloId] = ability[cloId] + deltas[cloId];
      }
    }
    return { id: s.id, cohortId: s.cohortId, ratings: s.ratings, ability };
  });
  return {
    id: cohort.id,
    intake: cohort.intake,
    programmeId: cohort.programmeId,
    students,
  };
}
