// Agent modes (spec Section 3). Every reasoning agent sits behind one interface
// with a `fixture` mode (replays saved output, zero cost, what the demo runs on)
// and a `live` mode (real LLM call). The demo defaults to fixture: reproducible,
// offline, no keys. Cohort and Curriculum are deterministic and run free in
// either mode; Intake, Signal, Authoring, Analogy, Evaluator have an LLM core.

export type AgentMode = "fixture" | "live";

export const DEFAULT_MODE: AgentMode = "fixture";

/** Thrown by an agent's live branch until a real LLM call is wired. The demo
 *  path never hits this (it runs on fixtures). */
export function liveNotImplemented(agent: string): never {
  throw new Error(
    `${agent} live mode is not wired; the demo runs on fixtures (spec Section 3).`,
  );
}
