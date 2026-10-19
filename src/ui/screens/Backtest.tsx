// The closed loop (spec 6.7, Section 8): every approval writes a prediction and
// next term's filed results score it. Below the live ledger sits the historical
// backtest, the advisory's credential: the same predictor run on a held-out past
// cohort it never saw, computed here from the engine, never hardcoded.

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { runBacktest } from "../../lib/backtest.ts";
import { HISTORICAL_BACKTEST } from "../../data/historical-backtest.ts";
import { ITEMS } from "../../data/items.ts";
import { scoreOpenPredictions, useStore } from "../../app/store.ts";
import {
  Button,
  Card,
  EmptyState,
  Page,
  PageHead,
  Row,
  SectionLabel,
  Stat,
  Tag,
} from "../primitives/index.tsx";

const HELD_TOLERANCE = 0.05;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** A thin horizontal bar for the predicted-vs-actual comparison. */
function Bar(props: { value: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 5, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(1, props.value)) * 100}%`,
          height: "100%",
          background: props.color,
          borderRadius: 3,
        }}
      />
    </div>
  );
}

export function BacktestScreen() {
  const state = useStore();
  const [revealed, setRevealed] = useState(false);

  // The historical backtest: the audited engine on the held-out cohort. The
  // numbers are computed, not typed: predicted 0.534, actual 0.536, MAE 0.009.
  const backtest = useMemo(() => runBacktest(HISTORICAL_BACKTEST, ITEMS), []);

  return (
    <Page>
      <PageHead
        title="Closed loop"
        context="Every approved change records a prediction; the next term's filed results score it. This page is where the system grades itself."
      />

      <SectionLabel>Predictions</SectionLabel>
      {state.predictions.length === 0 ? (
        <EmptyState
          title="No predictions yet"
          body="When management approves a tested change, the projected mastery is recorded here as an open prediction and scored once the next term's results are filed."
        />
      ) : (
        <div>
          {state.predictions.map((p) => {
            const scored = p.actualMastery !== undefined;
            const residual = p.residual ?? (scored ? Math.abs(p.predictedMastery - p.actualMastery!) : 0);
            return (
              <Row key={`${p.proposalId}-${p.madeAt}`}>
                <span className="num" style={{ width: 56, fontSize: 13, fontWeight: 600 }}>
                  {p.subjectId}
                </span>
                <span className="num" style={{ fontSize: 13 }}>
                  predicted {p.predictedMastery.toFixed(2)}
                </span>
                {scored ? (
                  <>
                    <span className="num" style={{ fontSize: 13 }}>
                      actual {p.actualMastery!.toFixed(2)}
                    </span>
                    <span className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>
                      residual {residual.toFixed(3)}
                    </span>
                    {residual <= HELD_TOLERANCE ? (
                      <Tag tone="ok">held</Tag>
                    ) : (
                      <Tag tone="warn">missed</Tag>
                    )}
                  </>
                ) : (
                  <Tag>open, awaiting next term's results</Tag>
                )}
                <span className="num" style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>
                  {fmtDate(p.madeAt)}
                </span>
              </Row>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <Button variant="quiet" data-demo-id="score-predictions" onClick={() => scoreOpenPredictions()}>
          Score against filed results
        </Button>
      </div>

      <SectionLabel style={{ marginTop: 40 }}>Synthetic backtest example</SectionLabel>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--ink-2)", maxWidth: 560 }}>
        A reproducible calculation on a generated example cohort, not empirical validation:{" "}
        <span className="num">{backtest.n}</span> learners from intake{" "}
        <span className="num">{HISTORICAL_BACKTEST.intake}</span>, predicted from their before-ratings
        alone, then compared to the fixture outcome.
      </p>

      {!revealed ? (
        <Button variant="primary" data-demo-id="reveal-backtest" onClick={() => setRevealed(true)}>
          Reveal the fixture outcome
        </Button>
      ) : (
        <div className="fade-up" style={{ maxWidth: 680 }}>
        <Card focal data-demo-id="backtest-result">
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginBottom: 18 }}>
            <Stat label="predicted mastery" value={backtest.overallPredicted.toFixed(3)} />
            <Stat label="fixture outcome" value={backtest.overallActual.toFixed(3)} />
            <Stat label="mean absolute error" value={backtest.mae.toFixed(3)} tone="ok" />
          </div>

          {/* per-CLO: predicted bar vs actual bar, side by side */}
          <div>
            {backtest.points.map((pt) => (
              <div
                key={pt.cloId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span className="num" style={{ width: 44, fontSize: 13, fontWeight: 600 }}>
                  {pt.cloId}
                </span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  <Bar value={pt.predicted} color="var(--accent)" />
                  <Bar value={pt.actual} color="var(--ok)" />
                </div>
                <span className="num" style={{ width: 130, fontSize: 12, color: "var(--ink-2)", textAlign: "right" }}>
                  {pt.predicted.toFixed(3)} vs {pt.actual.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--ink-3)", marginTop: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 5, borderRadius: 3, background: "var(--accent)" }} /> predicted
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 5, borderRadius: 3, background: "var(--ok)" }} /> actual
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
            <Tag tone="ok">
              <CheckCircle2 size={13} /> {backtest.withinTolerance} of {backtest.points.length} within{" "}
              {backtest.tolerance}
            </Tag>
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
              Every outcome landed inside the tolerance band.
            </span>
          </div>
        </Card>
        </div>
      )}

      <p style={{ marginTop: 28, fontSize: 13, color: "var(--ink-3)", maxWidth: 560 }}>
        Every approval above will be scored the same way. The system grades its own homework.
      </p>
    </Page>
  );
}
