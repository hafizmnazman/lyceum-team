// The right-side agent panel (spec 5.7): what each agent is doing right now and
// what it last produced, with the live stream while one is working. Opened from
// any agent strip; the network made visible in place.

import { X } from "lucide-react";
import { AGENT_LABELS, toggleAgentPanel, useStore } from "../../app/store.ts";

export function AgentPanel() {
  const state = useStore();
  if (!state.agentPanelOpen) return null;
  const runs = [...state.agentRuns].reverse();

  return (
    <aside
      className="fade-in"
      aria-label="Agent activity"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        maxWidth: "90vw",
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "var(--shadow-2)",
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ fontWeight: 600 }}>Agent activity</div>
        <button
          onClick={() => toggleAgentPanel(false)}
          aria-label="Close agent panel"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--ink-2)",
            display: "flex",
          }}
        >
          <X size={17} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {runs.length === 0 ? (
          <div style={{ color: "var(--ink-3)", fontSize: 13, padding: 12 }}>
            No agent has run yet this session. Agents wake where you work: drop a
            file on Upload, open Trends, or draft in the Studio.
          </div>
        ) : (
          runs.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-m)",
                padding: 12,
                marginBottom: 10,
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{AGENT_LABELS[r.agent]}</span>
                <StatusDot status={r.status} />
                <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>
                  {r.status === "fallback" ? "offline draft" : r.status}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>{r.label}</div>
              {r.streamText ? (
                <pre
                  style={{
                    margin: "8px 0 0",
                    padding: 10,
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-s)",
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--font-ui)",
                    color: "var(--ink-2)",
                    maxHeight: 180,
                    overflowY: "auto",
                  }}
                >
                  {r.streamText}
                </pre>
              ) : null}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function StatusDot(props: { status: string }) {
  const color =
    props.status === "done"
      ? "var(--ok)"
      : props.status === "failed"
        ? "var(--danger)"
        : props.status === "fallback"
          ? "var(--warn)"
          : "var(--accent)";
  const pulsing = props.status === "thinking" || props.status === "streaming" || props.status === "queued";
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        animation: pulsing ? "pulseDot 1.1s ease-in-out infinite" : undefined,
      }}
    />
  );
}
