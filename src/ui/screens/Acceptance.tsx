// The acceptance test (spec 6.4, Section 8): the staged 16s run, the verdict,
// and the six-hop drill-down from the cohort figure to one learner, one item,
// one probability. The real computation happens up front; this screen reveals
// it at human pace and then lets the reader walk the evidence chain.

import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { VerdictReport } from "../../types.ts";
import {
  canRunTest,
  navigate,
  proposalById,
  startAcceptanceRun,
  startDrillReveal,
  submitToManagement,
  useStore,
} from "../../app/store.ts";
import { DRILL_STEPS } from "../../demo/timing.ts";
import { AgentStrip } from "../shell/AgentStrip.tsx";
import {
  Button,
  Card,
  EmptyState,
  Page,
  PageHead,
  Provenance,
  Row,
  SectionLabel,
  Stat,
  Tag,
} from "../primitives/index.tsx";

function weakestCLO(report: VerdictReport) {
  const fallback = { cloId: report.drillRoot.cloId, meanP: 0, spread: 0, confidence: 0 };
  return report.cloMastery.reduce(
    (min, m) => (m.meanP < min.meanP ? m : min),
    report.cloMastery[0] ?? fallback,
  );
}

/** A thin horizontal mastery bar, accent by default, danger for the weakest. */
function MasteryBar(props: { value: number; danger?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        height: 6,
        background: "var(--tint-1)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(1, props.value)) * 100}%`,
          height: "100%",
          background: props.danger ? "var(--danger)" : "var(--emerald)",
          borderRadius: 3,
          transition: "width 250ms ease-out",
        }}
      />
    </div>
  );
}

export function AcceptanceScreen() {
  const state = useStore();
  const proposal = proposalById(state.selectedProposalId);

  // A sim from another subject must never render here.
  const sim = proposal && state.sim && state.sim.proposalId === proposal.id ? state.sim : null;
  const running = !!sim && (sim.phase === "drawing" || sim.phase === "running" || sim.phase === "settling");
  const report: VerdictReport | undefined = proposal?.acceptanceResult ?? (sim?.phase === "done" ? sim.report : undefined);
  const verdictVisible =
    !running &&
    !!proposal &&
    !!report &&
    (sim?.phase === "done" || proposal.status === "management-approval" || proposal.status === "approved");

  // Auto-scroll each newly revealed drill hop into view.
  const hopRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    if (state.drillStep >= 0) {
      hopRefs.current[state.drillStep]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.drillStep]);

  if (!proposal || (!running && !verdictVisible)) {
    return (
      <Page>
        <PageHead
          title="Acceptance test"
          context="Explore an illustrative prerequisite scenario before review. This model has not been calibrated against observed learning outcomes."
        />
        <EmptyState
          title="No test run yet"
          body="Pick a proposal in the Course Studio to explore the scenario calculation. Seeded learners and the pinned drill-down are synthetic examples."
          action={
            proposal && canRunTest(proposal.id) ? (
              <Button
                variant="primary"
                data-demo-id="acceptance-run"
                onClick={() => startAcceptanceRun(proposal.id)}
              >
                Run the acceptance test
              </Button>
            ) : undefined
          }
        />
      </Page>
    );
  }

  // ---------- the staged run ----------
  if (running && sim) {
    const maxBin = Math.max(1, ...sim.finalBins);
    return (
      <Page>
        <PageHead title="Acceptance test" context={`${proposal.subjectId}, proposal ${proposal.id}`} />
        <AgentStrip agent="cohort" />
        <Provenance onOpen={() => navigate("dataroom")}>
          Scenario using {sim.totalLearners} learner records; seed records are synthetic
        </Provenance>

        <div style={{ marginTop: 24, fontSize: 18, fontWeight: 600 }}>{sim.caption}</div>
        <div className="num" style={{ marginTop: 6, fontSize: 13, color: "var(--ink-2)" }}>
          {sim.learnersRun} of {sim.totalLearners}
        </div>

        {/* the histogram, filling in as the run proceeds */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 4,
            height: 120,
            marginTop: 20,
            maxWidth: 560,
          }}
        >
          {sim.bins.map((count, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${(count / maxBin) * 100}%`,
                minHeight: count > 0 ? 2 : 0,
                background: "var(--emerald)",
                borderRadius: "2px 2px 0 0",
                transition: "height 180ms ease-out",
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
          Per-learner mastery, 0 to 1
        </div>

        {sim.phase === "settling" ? (
          <div style={{ marginTop: 28 }}>
            <div className="num" style={{ fontSize: 48, fontWeight: 600, lineHeight: 1 }}>
              {sim.displayedMastery.toFixed(2)}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
              projected cohort mastery, settling
            </div>
          </div>
        ) : null}
      </Page>
    );
  }

  // ---------- the verdict ----------
  if (!report) return null;
  const weakest = weakestCLO(report);
  const lower = report.projectedMastery < report.currentMastery;

  return (
    <Page>
      <PageHead title="Acceptance test" context={`${proposal.subjectId}, proposal ${proposal.id}`} />
      <AgentStrip agent="cohort" />
      <Provenance onOpen={() => navigate("dataroom")}>
        Scenario using {report.groundedOnLearners} learner records; seed records are synthetic
      </Provenance>

      <Card focal style={{ marginTop: 20 }} data-demo-id="acceptance-verdict">
        <p style={{ margin: "0 0 16px", fontSize: 16, maxWidth: 640 }}>{report.summary}</p>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          <Stat label="current mastery" value={report.currentMastery.toFixed(2)} />
          <Stat
            label="projected mastery"
            value={report.projectedMastery.toFixed(2)}
            tone={lower ? "warn" : undefined}
          />
          <Stat label={`weakest outcome, ${weakest.cloId}`} value={weakest.meanP.toFixed(2)} tone="danger" />
        </div>
        {report.isProxyCohort ? (
          <div style={{ marginTop: 12 }}>
            <Tag tone="accent">proxy cohort via the Analogy agent</Tag>
          </div>
        ) : null}
      </Card>

      <SectionLabel>Per-outcome mastery</SectionLabel>
      <div>
        {report.cloMastery.map((m) => (
          <Row key={m.cloId}>
            <span className="num" style={{ width: 48, fontSize: 13, fontWeight: 600 }}>
              {m.cloId}
            </span>
            <MasteryBar value={m.meanP} danger={m.cloId === weakest.cloId} />
            <span className="num" style={{ width: 44, textAlign: "right", fontWeight: 600 }}>
              {m.meanP.toFixed(2)}
            </span>
            <span className="num" style={{ fontSize: 13, color: "var(--ink-2)", width: 150 }}>
              spread {m.spread.toFixed(2)}, confidence {m.confidence.toFixed(2)}
            </span>
          </Row>
        ))}
      </div>

      {report.prerequisiteConflicts.length > 0 ? (
        <>
          <SectionLabel>Prerequisite conflicts</SectionLabel>
          {report.prerequisiteConflicts.map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--warn-soft)",
                color: "var(--warn)",
                borderRadius: "var(--radius-chip)",
                padding: "10px 12px",
                marginBottom: 8,
                fontSize: 14,
              }}
            >
              <AlertTriangle size={16} />
              <span>
                <span className="num" style={{ fontWeight: 600 }}>{c.subjectId}</span> is scheduled before
                its prerequisite <span className="num" style={{ fontWeight: 600 }}>{c.missingPrereqId}</span>.
              </span>
            </div>
          ))}
        </>
      ) : null}

      {/* ---------- the six-hop drill-down ---------- */}
      <div style={{ marginTop: 24 }}>
        {state.drillStep < 0 ? (
          <Button data-demo-id="drill-open" onClick={() => startDrillReveal()}>
            Trace it to one learner <ArrowRight size={15} />
          </Button>
        ) : null}

        {state.drillStep >= 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
            {Array.from({ length: DRILL_STEPS }, (_, i) => i)
              .filter((i) => i <= state.drillStep)
              .map((i) => (
                <div
                  key={i}
                  ref={(el) => {
                    hopRefs.current[i] = el;
                  }}
                  className="fade-up"
                  data-demo-id={i === DRILL_STEPS - 1 ? "drill-final" : undefined}
                  style={{
                    border: "1px solid var(--border)",
                    borderLeft: "3px solid var(--emerald)",
                    borderRadius: "var(--radius-card)",
                    background: "var(--white)",
                    boxShadow: "none",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 4 }}>
                    Hop {i + 1} of {DRILL_STEPS}
                  </div>
                  {renderHop(i, report)}
                </div>
              ))}
          </div>
        ) : null}
      </div>

      {proposal.status === "management-approval" ? (
        <div style={{ marginTop: 28 }}>
          <Button
            variant="primary"
            data-demo-id="acceptance-submit"
            onClick={() => submitToManagement(proposal.id)}
          >
            Send the verdict to management
          </Button>
        </div>
      ) : null}
    </Page>
  );
}

function renderHop(i: number, report: VerdictReport) {
  const d = report.drillRoot;
  switch (i) {
    case 0:
      return (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>The verdict figure</div>
          <span className="num" style={{ fontSize: 28, fontWeight: 600 }}>
            {report.projectedMastery.toFixed(2)}
          </span>
          <span style={{ fontSize: 13, color: "var(--ink-2)", marginLeft: 8 }}>
            projected cohort mastery. Where does it come from?
          </span>
        </div>
      );
    case 1:
      return (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>The weakest outcome</div>
          <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{d.cloId}</span>
          <span style={{ fontSize: 13, color: "var(--ink-2)", marginLeft: 8 }}>
            carries the biggest share of the drop.
          </span>
        </div>
      );
    case 2:
      return (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>One learner</div>
          <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{d.studentId}</span>
          <span style={{ fontSize: 13, color: "var(--ink-2)", marginLeft: 8 }}>
            a pinned illustrative learner, separate from the cohort calculation.
          </span>
        </div>
      );
    case 3:
      return (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Their ability on {d.cloId}</div>
          <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>
            theta = {d.theta.toFixed(2)}
          </span>
          <span style={{ fontSize: 13, color: "var(--ink-2)", marginLeft: 8 }}>
            self-reported mastery, centred.
          </span>
        </div>
      );
    case 4:
      return (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>The item they face</div>
          <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{d.itemId}</span>
          <span className="num" style={{ fontSize: 13, color: "var(--ink-2)", marginLeft: 8 }}>
            difficulty b = {d.b.toFixed(2)}
          </span>
        </div>
      );
    case 5:
      return (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>The probability</div>
          <div className="num" style={{ fontSize: 28, fontWeight: 600 }}>
            P(correct) = sigma(theta - b) = {d.p.toFixed(2)}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink-2)" }}>{d.cause}</p>
        </div>
      );
    default:
      return null;
  }
}
