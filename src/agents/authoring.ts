// Authoring agent (spec Section 3). Drafts, reviews, or fixes a change. The user
// picks the mode in the Course Studio UI: "self" (no agent, handled in the UI),
// "agent" (the agent drafts), or "hybrid" (the agent drafts, the human edits).
// This function covers the agent and hybrid paths.
//
//  - job "draft":  ignore any human draft, return a fresh agent draft.
//  - job "review": keep the human draft, return a critique of it.
//  - job "fix":    fold the critique into the human draft and return the result.
//
// LLM-backed in live mode; replays a fixture for the demo.

import type { CLO, ChangeProposal, Subject } from "../types.ts";
import type { AgentMode } from "./mode.ts";
import { DEFAULT_MODE, liveNotImplemented } from "./mode.ts";
import { AUTHORING_CRITIQUE_FIXTURE, AUTHORING_DRAFT_FIXTURE } from "./fixtures/authoring.ts";

export type AuthoringJob = "draft" | "review" | "fix";

export interface AuthoringResult {
  draft: ChangeProposal["draft"];
  critique?: string[];
}

export function runAuthoring(
  _subject: Subject,
  _clos: CLO[],
  _target: string,
  job: AuthoringJob,
  humanDraft: ChangeProposal["draft"] | null,
  mode: AgentMode = DEFAULT_MODE,
): AuthoringResult {
  if (mode !== "fixture") return liveNotImplemented("Authoring agent");

  if (job === "draft") {
    return { draft: AUTHORING_DRAFT_FIXTURE };
  }
  if (job === "review") {
    return { draft: humanDraft ?? AUTHORING_DRAFT_FIXTURE, critique: AUTHORING_CRITIQUE_FIXTURE };
  }
  // job === "fix": merge the agent draft over the human draft (agent strengthens
  // the test/CLO wording while keeping the human's topics where present).
  const base = humanDraft ?? {};
  return {
    draft: {
      topics: base.topics ?? AUTHORING_DRAFT_FIXTURE.topics,
      cloChanges: base.cloChanges ?? AUTHORING_DRAFT_FIXTURE.cloChanges,
      testDraft: AUTHORING_DRAFT_FIXTURE.testDraft,
      labDraft: base.labDraft ?? AUTHORING_DRAFT_FIXTURE.labDraft,
    },
    critique: AUTHORING_CRITIQUE_FIXTURE,
  };
}
