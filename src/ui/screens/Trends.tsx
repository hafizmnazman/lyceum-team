// Trends (spec 6.6): the Signal agent's home. On first visit the staged reveal
// plays (reading, extracting, mapping); then the screen settles on one sentence,
// the per-source receipts behind it, and one action. Per-CLO demand detail sits
// behind a quiet disclosure.

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { marketGapByCLO } from "../../agents/signal.ts";
import { hasSourceDisagreement, MARKET_SOURCES } from "../../data/market.ts";
import { can } from "../../app/roles.ts";
import type { SignalSimState } from "../../app/signalSim.ts";
import {
  currentPerson,
  getState,
  ratingFor,
  routeDrift,
  runSignalReveal,
  useStore,
} from "../../app/store.ts";
import { AgentStrip } from "../shell/AgentStrip.tsx";
import {
  Button,
  Card,
  EmptyState,
  Page,
  PageHead,
  Row,
  Spinner,
  Tag,
} from "../primitives/index.tsx";

const PHASES = ["reading", "extracting", "mapping"] as const;

/** The quiet three-step rail shown while the Signal reveal runs. */
function RevealRail(props: { sim: SignalSimState }) {
  const { sim } = props;
  const active = PHASES.indexOf(sim.phase as (typeof PHASES)[number]);

  const steps: Array<{ label: string; content: ReactNode }> = [
    {
      label: "Reading market sources",
      content:
        sim.sources.length > 0 ? (
          <div>
            {sim.sources.map((s) => (
              <div key={s} className="fade-in" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                {s}
              </div>
            ))}
          </div>
        ) : null,
    },
    {
      label: "Extracting rising skills",
      content:
        sim.skills.length > 0 ? (
          <div>
            {sim.skills.map((s, i) => (
              <div key={s} className="fade-in" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                <span className="num" style={{ color: "var(--ink-3)", marginRight: 6 }}>
                  {i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        ) : null,
    },
    {
      label: "Mapping demand onto outcomes",
      content:
        active >= 2 ? (
          <div>
            <div
              style={{
                height: 4,
                maxWidth: 320,
                background: "var(--surface-2)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(sim.mapProgress * 100)}%`,
                  height: "100%",
                  background: "var(--accent)",
                  borderRadius: 2,
                }}
              />
            </div>
            <div style={{ fontSize: 12.5, marginTop: 6, color: "var(--ink-2)" }}>
              Widest gap <span className="num">{sim.gapDisplayed.toFixed(2)}</span>
            </div>
          </div>
        ) : null,
    },
  ];

  return (
    <div style={{ maxWidth: 520, padding: "8px 0" }} data-demo-id="signal-reveal">
      {steps.map((step, i) => {
        const done = i < active;
        const isActive = i === active;
        return (
          <div key={step.label} style={{ display: "flex", gap: 12, paddingBottom: 18 }}>
            <div style={{ width: 20, display: "flex", justifyContent: "center", paddingTop: 2 }}>
              {done ? (
                <Check size={15} color="var(--ok)" />
              ) : isActive ? (
                <Spinner size={14} />
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--border)",
                    marginTop: 4,
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  color: done || isActive ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                {step.label}
              </div>
              {(done || isActive) && step.content ? (
                <div style={{ marginTop: 6 }}>{step.content}</div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{sim.caption}</div>
    </div>
  );
}

/** One thin horizontal bar, filled to a 0..1 value. */
function GapBar(props: { value: number; color: string }) {
  return (
    <div style={{ height: 5, background: "var(--surface-2)", borderRadius: 3 }}>
      <div
        style={{
          width: `${Math.round(props.value * 100)}%`,
          height: "100%",
          background: props.color,
          borderRadius: 3,
        }}
      />
    </div>
  );
}

export function TrendsScreen() {
  const state = useStore();
  const person = currentPerson();
  const [showDetail, setShowDetail] = useState(false);

  // Kick the staged reveal once per session. The null check guards the
  // StrictMode double-mount: the second effect run sees a non-null sim.
  useEffect(() => {
    if (getState().signalSim === null) runSignalReveal();
  }, []);

  if (!person) return null;

  const gaps = marketGapByCLO();
  const widestCloId = Object.keys(gaps).sort((a, b) => gaps[b].gap - gaps[a].gap)[0];
  const info = widestCloId ? gaps[widestCloId] : undefined;
  const clo = state.clos.find((c) => c.id === widestCloId);
  const subject = clo ? state.subjects.find((s) => s.id === clo.subjectId) : undefined;
  const rating = subject ? ratingFor(subject.id) : undefined;
  const topSkill = rating?.perCLO.find((p) => p.cloId === widestCloId)?.movedBy[0];
  const mayRoute = can(person, "approve", { assignments: state.assignments });

  const sim = state.signalSim;
  const revealing = sim !== null && sim.phase !== "done";

  const detailRows = Object.keys(gaps)
    .map((cloId) => ({
      cloId,
      info: gaps[cloId],
      clo: state.clos.find((c) => c.id === cloId),
    }))
    .sort((a, b) => b.info.gap - a.info.gap);

  return (
    <Page>
      <PageHead
        title="Trends"
        context="Illustrative demand and coverage from synthetic fixtures. The displayed scores do not measure current employer demand."
      />
      <AgentStrip
        agent="signal"
        idleText="Signal demonstrates the mapping workflow using synthetic market figures."
      />

      {revealing && sim ? (
        <RevealRail sim={sim} />
      ) : !subject || !clo || !info ? (
        <EmptyState
          title="No demand signal yet"
          body="When market snapshots are prepared, the Signal agent maps them onto the programme's outcomes and the widest gap appears here."
        />
      ) : (
        <>
          <Card focal style={{ maxWidth: 680 }} data-demo-id="trends-focal">
            <p style={{ fontSize: 17, margin: 0, maxWidth: 620, lineHeight: 1.5 }}>
              <span className="num">{subject.id}</span> {subject.title} is drifting from demand.
              The widest gap is <span className="num">{clo.id}</span>, {clo.text.toLowerCase()},
              at{" "}
              <span className="num" style={{ fontWeight: 600 }}>
                {info.gap.toFixed(2)}
              </span>
              .
            </p>

            {rating && topSkill ? (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "0 12px 4px",
                    fontSize: 11,
                    color: "var(--ink-3)",
                  }}
                >
                  <span style={{ flex: 1 }}>Demand for {topSkill}, by source</span>
                  <span style={{ width: 60, textAlign: "right" }}>demand</span>
                  <span style={{ width: 60, textAlign: "right" }}>12m</span>
                </div>
                {MARKET_SOURCES.map((src) => {
                  const ev = rating.evidence.find(
                    (e) => e.sourceId === src.id && e.skill === topSkill,
                  );
                  return (
                    <Row key={src.id}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{src.name}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          synthetic fixture, example date {src.snapshotDate}
                        </div>
                      </div>
                      {ev ? (
                        <>
                          <span
                            className="num"
                            style={{ width: 60, textAlign: "right", fontSize: 13 }}
                          >
                            {ev.demandScore.toFixed(2)}
                          </span>
                          <span
                            className="num"
                            style={{
                              width: 60,
                              textAlign: "right",
                              fontSize: 13,
                              color: ev.delta12m >= 0 ? "var(--ok)" : "var(--danger)",
                            }}
                          >
                            {ev.delta12m >= 0 ? "+" : ""}
                            {ev.delta12m.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>no signal</span>
                      )}
                    </Row>
                  );
                })}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    fontSize: 12,
                    color: "var(--ink-3)",
                  }}
                >
                  <span>
                    Direction agreement (illustrative){" "}
                    <span className="num">{rating.agreement?.toFixed(2) ?? "insufficient evidence"}</span>
                  </span>
                  {hasSourceDisagreement(rating.evidence) ? <Tag tone="warn">sources disagree</Tag> : null}
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 18 }}>
              {mayRoute ? (
                <Button
                  variant="primary"
                  data-demo-id="trends-route"
                  onClick={() => routeDrift(subject.id)}
                >
                  Route to coordinator
                </Button>
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                  Routing is a management action. You are seeing the same facts, read only.
                </span>
              )}
            </div>
          </Card>

          <button
            onClick={() => setShowDetail((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              background: "none",
              color: "var(--ink-2)",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              margin: "24px 0 8px",
            }}
            data-demo-id="trends-detail-toggle"
          >
            {showDetail ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {showDetail ? "Hide demand detail" : "Show demand detail"}
          </button>

          {showDetail ? (
            <div style={{ maxWidth: 560 }}>
              {detailRows.map((r) => (
                <div
                  key={r.cloId}
                  style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 6 }}
                  >
                    <span className="num" style={{ width: 48, fontWeight: 600, fontSize: 13 }}>
                      {r.cloId}
                    </span>
                    <span style={{ fontSize: 13.5 }}>{r.clo?.text ?? r.cloId}</span>
                    <span className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      {r.clo?.subjectId ?? ""}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span className="num" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                      gap {r.info.gap.toFixed(2)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px 1fr 44px",
                      gap: "4px 8px",
                      alignItems: "center",
                      fontSize: 11,
                      color: "var(--ink-3)",
                    }}
                  >
                    <span>demand</span>
                    <GapBar value={r.info.demand} color="var(--accent)" />
                    <span className="num" style={{ textAlign: "right" }}>
                      {r.info.demand.toFixed(2)}
                    </span>
                    <span>coverage</span>
                    <GapBar value={r.info.coverage} color="var(--border)" />
                    <span className="num" style={{ textAlign: "right" }}>
                      {r.info.coverage.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </Page>
  );
}
