// Approval (spec 6.6): the proposal as a document. Top to bottom: what changes
// (the before/after diff), what the cohort says (the verdict and its ground),
// the Evaluator's read, then the decision. Approving records the prediction;
// rejecting requires a reason and returns the draft to its author.

import { useState } from "react";
import {
  approveProposal,
  navigate,
  personById,
  rejectProposal,
  selectProposal,
  subjectById,
  useStore,
} from "../../app/store.ts";
import { AgentStrip } from "../shell/AgentStrip.tsx";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Page,
  PageHead,
  Provenance,
  Row,
  SectionLabel,
  Stat,
  Tag,
  Textarea,
} from "../primitives/index.tsx";

function Snippet(props: { label: string; text: string }) {
  return (
    <div style={{ marginTop: 12, maxWidth: 680 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>
        {props.label}
      </div>
      <div
        style={{
          background: "var(--surface-2)",
          borderRadius: "var(--radius-s)",
          padding: "8px 12px",
          fontSize: 13,
        }}
      >
        {props.text}
      </div>
    </div>
  );
}

export function ApprovalScreen() {
  const state = useStore();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const pending = state.proposals.find((p) => p.status === "management-approval");
  const selected = state.selectedProposalId
    ? state.proposals.find((p) => p.id === state.selectedProposalId)
    : undefined;
  const doc =
    pending ??
    (selected &&
    selected.acceptanceResult &&
    (selected.status === "management-approval" || selected.status === "approved")
      ? selected
      : undefined);

  if (!doc || !doc.acceptanceResult) {
    return (
      <Page>
        <PageHead title="Approvals" context="Tested changes, decided as documents." />
        <EmptyState
          title="Nothing awaits approval."
          body="Tested changes arrive here with their verdict."
        />
      </Page>
    );
  }

  const report = doc.acceptanceResult;
  const subject = subjectById(doc.subjectId);
  const author = personById(doc.authorId);

  // After approval: the calm confirmation, prediction recorded.
  if (doc.status === "approved") {
    const prediction = state.predictions.find((p) => p.proposalId === doc.id);
    return (
      <Page>
        <PageHead title="Approvals" context="The decision is recorded." />
        <Card focal style={{ maxWidth: 640 }} data-demo-id="approval-confirmed">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Tag tone="ok">approved</Tag>
            <span className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>
              {doc.subjectId}
            </span>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 14.5, maxWidth: 520 }}>
            {subject?.title ?? doc.subjectId} is approved. A prediction of{" "}
            <span className="num" style={{ fontWeight: 600 }}>
              {(prediction?.predictedMastery ?? report.projectedMastery).toFixed(2)}
            </span>{" "}
            mastery is recorded and will be scored by next term's filed results.
          </p>
          <a
            href="#"
            style={{ fontSize: 13 }}
            onClick={(e) => {
              e.preventDefault();
              navigate("backtest");
            }}
          >
            See the open prediction in the closed loop
          </a>
        </Card>
      </Page>
    );
  }

  const weakest = [...report.cloMastery].sort((a, b) => a.meanP - b.meanP)[0];

  return (
    <Page>
      <PageHead
        title="Approvals"
        context="One tested change, read as a document. The evidence sits with the decision."
      />

      <div style={{ maxWidth: 720 }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>
            {doc.subjectId}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{subject?.title ?? ""}</span>
          <Tag tone="accent">awaiting approval</Tag>
          {!author?.verified ? <Tag tone="warn">unverified author</Tag> : null}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>
          Proposed by {author?.name ?? doc.authorId}
        </div>

        {/* what changes */}
        <SectionLabel>What changes</SectionLabel>
        {(doc.draft.cloChanges ?? []).length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>No outcome changes.</div>
        ) : (
          (doc.draft.cloChanges ?? []).map((ch, i) => {
            const current = ch.cloId ? state.clos.find((c) => c.id === ch.cloId) : undefined;
            const tone = ch.op === "add" ? "ok" : ch.op === "remove" ? "danger" : "accent";
            return (
              <Row key={`${ch.cloId ?? "new"}-${i}`} style={{ alignItems: "flex-start" }}>
                <Tag tone={tone}>{ch.op}</Tag>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {current && (ch.op === "edit" || ch.op === "remove") ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--ink-3)",
                        textDecoration: "line-through",
                      }}
                    >
                      {current.text}
                    </div>
                  ) : null}
                  {ch.op !== "remove" ? <div style={{ fontSize: 14 }}>{ch.text}</div> : null}
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                    {ch.cloId ?? "new outcome"} · Bloom: {ch.bloomLevel}
                  </div>
                </div>
              </Row>
            );
          })
        )}
        {doc.draft.topics && doc.draft.topics.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>
              Topics
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
              {doc.draft.topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {doc.draft.testDraft ? <Snippet label="Test draft" text={doc.draft.testDraft} /> : null}
        {doc.draft.labDraft ? <Snippet label="Lab draft" text={doc.draft.labDraft} /> : null}

        {/* what the cohort says */}
        <SectionLabel>What the cohort says</SectionLabel>
        <div style={{ display: "flex", gap: 40, margin: "4px 0 14px" }}>
          <Stat label="current mastery" value={report.currentMastery.toFixed(2)} />
          <Stat
            label="projected mastery"
            value={report.projectedMastery.toFixed(2)}
            tone={report.projectedMastery < report.currentMastery ? "warn" : undefined}
          />
          {weakest ? (
            <Stat label={`weakest CLO (${weakest.cloId})`} value={weakest.meanP.toFixed(2)} />
          ) : null}
        </div>
        <Provenance onOpen={() => navigate("dataroom")}>
          Grounded in {report.groundedOnLearners} learners' real CLO mastery survey
        </Provenance>
        <div style={{ marginTop: 8 }}>
          <a
            href="#"
            style={{ fontSize: 13 }}
            onClick={(e) => {
              e.preventDefault();
              selectProposal(doc.id);
              navigate("acceptance");
            }}
          >
            View the full run and drill-down
          </a>
        </div>

        {/* the evaluator's read */}
        <SectionLabel>The evaluator's read</SectionLabel>
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: "var(--radius-m)",
            padding: 16,
            fontSize: 13.5,
            maxWidth: 680,
            marginBottom: 14,
          }}
        >
          {report.summary}
        </div>
        <AgentStrip agent="evaluator" idleText="Evaluator has read the run and its history." />

        {/* the decision */}
        <SectionLabel>The decision</SectionLabel>
        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="primary"
            data-demo-id="approve-btn"
            onClick={() => {
              selectProposal(doc.id);
              approveProposal(doc.id);
            }}
          >
            Approve and record the prediction
          </Button>
          <Button variant="danger" data-demo-id="reject-btn" onClick={() => setRejecting(true)}>
            Reject
          </Button>
        </div>
        {rejecting ? (
          <div style={{ marginTop: 14, maxWidth: 520 }}>
            <Field
              label="Reason for rejection"
              hint="Required. Returned to the author with this note."
            >
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why this change is not going ahead."
                data-demo-id="reject-reason"
              />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="danger"
                disabled={reason.trim().length === 0}
                data-demo-id="reject-confirm"
                onClick={() => {
                  rejectProposal(doc.id, reason.trim());
                  setRejecting(false);
                  setReason("");
                }}
              >
                Confirm rejection
              </Button>
              <Button variant="quiet" onClick={() => setRejecting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Page>
  );
}
