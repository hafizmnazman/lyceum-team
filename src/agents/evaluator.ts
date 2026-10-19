// Evaluator agent (spec Section 3). A tested proposal -> a plain-language verdict
// for the approval gate. The numbers are already in the proposal's
// acceptanceResult (the spine's VerdictReport); the Evaluator turns them into the
// one paragraph management reads before approving. LLM-backed in live mode; the
// fixture composes deterministically from the report so the demo is reproducible.

import type { ChangeProposal } from "../types.ts";
import type { AgentMode } from "./mode.ts";
import { DEFAULT_MODE, liveNotImplemented } from "./mode.ts";

export interface EvaluatorResult {
  summary: string;
}

export function runEvaluator(
  proposal: ChangeProposal,
  mode: AgentMode = DEFAULT_MODE,
): EvaluatorResult {
  if (mode !== "fixture") return liveNotImplemented("Evaluator agent");

  const report = proposal.acceptanceResult;
  if (!report) {
    return { summary: "This change has not been tested yet, so there is no verdict to read." };
  }

  const grounded = report.groundedOnLearners;
  const proxy = report.isProxyCohort
    ? " The cohort is a proxy drawn from similar outcomes, as this subject has no history of its own, so read the figure as indicative."
    : "";

  // report.summary already states the direction and the numbers; the Evaluator
  // adds only the grounding and the audit pointer, so the verdict does not repeat
  // itself.
  return {
    summary: `${report.summary} The scenario uses ${grounded} learner records; seed records are synthetic and the drill-down is a separate illustrative case. Learning forecasts have not been validated.${proxy}`,
  };
}
