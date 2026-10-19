// The agent strip (spec 5.7): one quiet line under a screen's header showing
// what that screen's agent is doing or last did. Clicking opens the agent
// panel. This, not a dashboard, is how agents are present in the product.

import { ChevronRight, Sparkles } from "lucide-react";
import type { AgentId } from "../../app/store.ts";
import { AGENT_LABELS, toggleAgentPanel, useStore } from "../../app/store.ts";

export function AgentStrip(props: { agent: AgentId; idleText?: string }) {
  const state = useStore();
  const run = [...state.agentRuns].reverse().find((r) => r.agent === props.agent);
  const working = run && (run.status === "thinking" || run.status === "streaming" || run.status === "queued");
  const text = run
    ? run.label
    : (props.idleText ?? `${AGENT_LABELS[props.agent]} is idle. It wakes when you act here.`);

  return (
    <button
      onClick={() => toggleAgentPanel(true)}
      className={working ? "agent-shimmer" : undefined}
      data-demo-id={`agent-strip-${props.agent}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 12px",
        marginBottom: 18,
        borderRadius: "var(--radius-s)",
        border: "1px solid var(--border)",
        background: working ? undefined : "var(--surface-2)",
        cursor: "pointer",
        fontSize: 12.5,
        color: "var(--ink-2)",
        textAlign: "left",
      }}
    >
      <Sparkles size={14} color={working ? "var(--accent)" : "var(--ink-3)"} />
      <span style={{ fontWeight: 600, color: working ? "var(--accent)" : "var(--ink-2)" }}>
        {AGENT_LABELS[props.agent]}
      </span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {text}
      </span>
      {run?.status === "fallback" ? (
        <span style={{ fontSize: 11, color: "var(--warn)", flexShrink: 0 }}>offline draft</span>
      ) : null}
      <ChevronRight size={14} color="var(--ink-3)" />
    </button>
  );
}
