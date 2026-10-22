// Whether a browser's workspace holds anything a person made, so the tour and the walk ask before replacing it.

import type { AppState } from "../app/store.ts";
import { DEMO_INSTITUTION } from "../data/institution.ts";
import { CANONICAL_PROPOSAL, ROLE_ASSIGNMENTS, SEED_TEACHING_PLANS } from "../data/seed.ts";

/** Saved work is anything beyond the seed: the term's sample sessions and the demo institution come with every fresh workspace. */
export function hasSavedWork(state: AppState): boolean {
  return JSON.stringify(state.teachingPlans) !== JSON.stringify(SEED_TEACHING_PLANS) || state.testDrafts.length > 0
    || JSON.stringify(state.institution) !== JSON.stringify(DEMO_INSTITUTION)
    || state.evidenceSources.length > 0 || state.skillMentions.length > 0 || state.skillMappings.length > 0 || state.evidenceBriefs.length > 0 || state.curriculumDrafts.length > 0
    || JSON.stringify(state.proposals) !== JSON.stringify([CANONICAL_PROPOSAL])
    || JSON.stringify(state.assignments) !== JSON.stringify(ROLE_ASSIGNMENTS)
    || state.dataSources.some((source) => source.sourceFileName);
}
