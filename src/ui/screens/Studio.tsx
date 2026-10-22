// The course's own steps (plan Section 4): Course (setup), Update, Teach and
// History, one screen each, chosen on the step path. The old change proposal and
// its review chain live here too, as the illustrative sandbox's Proposal screen.

import { useState } from "react";
import { can, hatsOn } from "../../app/roles.ts";
import { loopState } from "../../app/loop.ts";
import { effectiveStep } from "../../app/routes.ts";
import {
  approveTestDraft,
  acknowledgeAssessmentCourseChange,
  resetAssessmentOutcomeWeights,
  canRunTest,
  createTestDraft,
  currentPerson,
  draftWithAgent,
  editCloChangeText,
  editDraftField,
  generateTestItems,
  navigate,
  personById,
  removeTestItem,
  requestAgentReview,
  reviewApprove,
  reviewRequestChanges,
  setCritique,
  openStep,
  selectProposal,
  selectSubject,
  startAcceptanceRun,
  startDraft,
  submitForReview,
  submitTestDraft,
  testDraftById,
  updateBlueprint,
  updateTestItem,
  useStore,
  type AppState,
} from "../../app/store.ts";
import type {
  BloomLevel,
  ChangeProposal,
  Person,
  ProposalEvent,
  ProposalStatus,
  Subject,
  TestDraft,
} from "../../types.ts";
import { AgentStrip } from "../shell/AgentStrip.tsx";
import { CurriculumPanel, CurriculumHistoryPanel } from "./CurriculumWorkspace.tsx";
import { CourseOverview, TeachingPlanPanel } from "./CourseWorkspace.tsx";
import { StepFrame, courseContext, type StepHelper } from "./StepFrame.tsx";
import { Handoff } from "../primitives/loop.tsx";
import {
  Button,
  Card,
  Disclosure,
  EmptyState,
  Field,
  Input,
  Page,
  PageHead,
  Row,
  SectionLabel,
  Select,
  Tag,
  Textarea,
} from "../primitives/index.tsx";

const STATUS_LABEL: Record<ProposalStatus, string> = {
  drafting: "Drafting",
  "coordinator-review": "Coordinator review",
  testing: "Ready to test",
  "management-approval": "Awaiting management",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_TONE: Record<ProposalStatus, "neutral" | "accent" | "ok" | "warn" | "danger"> = {
  drafting: "neutral",
  "coordinator-review": "warn",
  testing: "accent",
  "management-approval": "accent",
  approved: "ok",
  rejected: "danger",
};

const ACTION_LABEL: Record<ProposalEvent["action"], string> = {
  drafted: "Draft started",
  "agent-drafted": "Agent drafted",
  "agent-reviewed": "Agent reviewed",
  "submitted-for-review": "Submitted for review",
  "review-approved": "Review approved",
  "review-changes-requested": "Changes requested",
  tested: "Acceptance test run",
  approved: "Approved",
  rejected: "Rejected",
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** The course's Course, Update, Teach and History steps (plan Section 4), one per screen, chosen on the step path. */
export function StudioScreen() {
  const state = useStore();
  const person = currentPerson();
  if (!person) return null;
  const { subject, subjects } = courseContext(state, person);
  if (!subject) return <Page><PageHead title="Course" context="Your teaching workspace starts with an assigned course." /><EmptyState title="No course assigned yet" body="The department can assign you as a lecturer or coordinator in Assignments. Then your course outcomes, teaching plan and review workspace will appear here." action={<Button onClick={() => navigate("guide")}>Read the section guide</Button>} /></Page>;
  return <StudioCourse key={subject.id + person.id} state={state} person={person} subject={subject} subjects={subjects} />;
}

const STUDIO_HELPER: Record<"course" | "update" | "teach" | "history", StepHelper> = {
  course: { who: "folio", line: "Reads the syllabus, the outline and the documents you file, and keeps the outcomes, topics and hours in one record." },
  update: { who: "quill", line: "Checks a revision against the hours, the links and the protected topics. It never adopts a version for you." },
  teach: { who: "prism", line: "Builds an editable teaching pack from a saved session and the evidence behind its outcomes." },
  history: { who: "folio", line: "Keeps every version and every decision, in the order they were made." },
};

function StudioCourse({ state, person, subject, subjects }: { state: AppState; person: Person; subject: Subject; subjects: Subject[] }) {
  const step = effectiveStep(state);
  const view = step === "update" || step === "teach" || step === "history" ? step : "course";
  const proposal = state.proposals.find((p) => p.subjectId === subject.id && p.status !== "approved" && p.status !== "rejected");
  const loop = loopState(state, subject.id);
  const retained = loop.decision?.governing?.outcome === "retain";
  return <StepFrame state={state} step={view} subject={subject} subjects={subjects} helper={STUDIO_HELPER[view]}>
    {/* Every step stays mounted and hidden when not shown, so an open editor survives a step change (unsaved.ts). */}
    <div className="step-view" hidden={view !== "course"}>
      <CourseOverview state={state} person={person} subject={subject} proposal={proposal} onCurriculum={() => openStep(subject.id, "update")} onEvidence={() => openStep(subject.id, "watch")} onPlan={() => openStep(subject.id, "teach")} onProposal={() => navigate("proposal")} />
      {loop.steps.find((s) => s.id === "course")!.done ? <Handoff step="course" record={loop.steps[0].count + " recorded."} onNext={() => openStep(subject.id, "watch")} /> : null}
    </div>
    <div className="step-view" hidden={view !== "update"}>
      {retained ? <p className="limitation" data-demo-id="update-retained">{loop.adoptedSinceDecision
        ? "The recorded decision on the latest brief is to retain the course as it is, and a version was adopted after it. Record a new decision in Decide if the change should stand for this term."
        : "No change this term: the recorded decision on the latest brief is to retain the course as it is. You can still prepare a revision for a later term."}</p> : null}
      <CurriculumPanel state={state} person={person} subject={subject} />
      {loop.steps.find((s) => s.id === "update")!.done ? <Handoff step="update" record={retained ? (loop.adoptedSinceDecision ? "Retained, with a version adopted after the decision." : "Retained: no change this term.") : "Version adopted."} onNext={() => openStep(subject.id, "teach")} /> : null}
    </div>
    <div className="step-view" hidden={view !== "teach"}>
      <TeachingPlanPanel state={state} person={person} subject={subject} />
      <section className="workspace-panel" aria-label="Assessment">
        <Disclosure summary="Assessment blueprint and template items" data-demo-id="teach-assessment">
          <AssessmentTab state={state} person={person} subject={subject} proposal={proposal} />
        </Disclosure>
      </section>
      {loop.steps.find((s) => s.id === "teach")!.done ? <Handoff step="teach" record="A session linked to an outcome is saved." onNext={() => openStep(subject.id, "learn")} /> : null}
    </div>
    <div className="step-view" hidden={view !== "history"}>
      <CurriculumHistoryPanel state={state} subject={subject} />
    </div>
  </StepFrame>;
}

/** The old change proposal and its review chain, kept in the illustrative sandbox (plan Section 4.2). The loop's Decide is the product's only decision. */
export function ProposalScreen() {
  const state = useStore();
  const person = currentPerson();
  if (!person) return null;
  const { subject, subjects } = courseContext(state, person);
  if (!subject) return <Page><PageHead title="Change proposal" /><EmptyState title="No course assigned" body="The illustrative proposal workflow needs an assigned course." /></Page>;
  const proposal = state.proposals.find((p) => p.id === state.selectedProposalId && p.subjectId === subject.id) ?? state.proposals.find((p) => p.subjectId === subject.id && p.status !== "approved" && p.status !== "rejected");
  const lastProposal = [...state.proposals].reverse().find((p) => p.subjectId === subject.id);
  const mayDraft = can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments });
  return <Page wide>
    <PageHead eyebrow="Sandbox · illustrative" title="Change proposal" context="The earlier review chain, kept as an illustration: a drafted proposal, a coordinator review, an acceptance test on a synthetic cohort and a management approval. Course decisions are recorded in each course's Decide step."
      actions={subjects.length > 1 ? <label className="course-switcher">Course<Select aria-label="Choose course for the proposal" value={subject.id} onChange={(e) => { selectSubject(e.target.value); selectProposal(null); }}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}</Select></label> : undefined} />
    {proposal ? <>
      <div className="section-heading"><h2>{proposal.subjectId}: curriculum change proposal</h2><Tag tone={STATUS_TONE[proposal.status]}>{STATUS_LABEL[proposal.status]}</Tag></div>
      <div data-demo-id="proposal-content"><ContentTab key={proposal.id} state={state} person={person} subject={subject} proposal={proposal} /></div>
      <HistoryTab state={state} subject={subject} proposal={proposal} />
    </> : <section className="workspace-panel"><h2>Plan a formal curriculum change</h2><p>A proposal holds the topic and outcome changes for the illustrative coordinator and management review.</p>{lastProposal ? <p className="limitation">The previous proposal is {lastProposal.status}. Use the course's Update step for a lecturer-controlled revision.</p> : null}{subject.workspaceOnly ? <Button variant="primary" onClick={() => openStep(subject.id, "update")}>Open Update</Button> : mayDraft ? <Button variant="primary" data-demo-id="studio-start-draft" onClick={() => startDraft(subject.id)}>Start a draft</Button> : <p className="muted">Only an assigned lecturer or coordinator can draft a change.</p>}</section>}
  </Page>;
}

// ---------------------------------------------------------------------------
// Content: the draft, editable in place, with the agent modes, the critique,
// and the one status-driven primary action.
// ---------------------------------------------------------------------------

function ContentTab(props: {
  state: AppState;
  person: Person;
  subject: Subject;
  proposal: ChangeProposal;
}) {
  const { state, person, subject, proposal } = props;
  const [mode, setMode] = useState<"self" | "agent" | "hybrid">("self");
  const [changesOpen, setChangesOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  const hats = hatsOn(person.id, subject.id, state.assignments);
  const coordHere = hats.includes("coordinator");
  const isAuthor = proposal.authorId === person.id;
  const mayReview =
    proposal.status === "coordinator-review" &&
    can(person, "review-draft", { subjectId: subject.id, assignments: state.assignments });

  // The topics textarea is uncontrolled (the store normalises lines, which would
  // eat newlines mid-typing); it remounts whenever the agent rewrites the draft.
  const agentDraftCount = proposal.history.filter((h) => h.action === "agent-drafted").length;
  const topicsKey = `${proposal.id}-topics-${agentDraftCount}`;

  const draft = proposal.draft;

  function pickMode(next: "self" | "agent" | "hybrid") {
    setMode(next);
    if (next === "agent" || next === "hybrid") draftWithAgent(proposal.id, next);
  }

  const modeButton = (id: "self" | "agent" | "hybrid", label: string) => (
    <Button
      variant="outline"
      data-demo-id={`mode-${id}`}
      onClick={() => pickMode(id)}
      style={{
        height: 30,
        padding: "0 12px",
        fontSize: 13,
        ...(mode === id
          ? {
              borderColor: "var(--emerald)",
              color: "var(--emerald-text)",
              background: "var(--tint-2)",
            }
          : {}),
      }}
    >
      {label}
    </Button>
  );

  return (
    <div>
      <AgentStrip
        agent="authoring"
        idleText="Authoring drafts, reviews, and fixes. Pick a mode or ask for a review."
      />

      {mayReview ? (
        <Card focal style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            A lecturer's draft awaits your review
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--ink-2)", maxWidth: 560 }}>
            Approve it for testing, or send it back with a note. Nothing reaches the acceptance
            test without your review.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              variant="primary"
              data-demo-id="review-approve"
              onClick={() => reviewApprove(proposal.id)}
            >
              Approve for testing
            </Button>
            <Button
              variant="quiet"
              data-demo-id="review-changes"
              onClick={() => setChangesOpen((v) => !v)}
            >
              Request changes
            </Button>
          </div>
          {changesOpen ? (
            <div style={{ marginTop: 12 }}>
              <Textarea
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="What should change before this is tested?"
                style={{ minHeight: 64 }}
              />
              <Button
                variant="outline"
                style={{ marginTop: 8 }}
                onClick={() => {
                  reviewRequestChanges(proposal.id, changeNote.trim());
                  setChangesOpen(false);
                  setChangeNote("");
                }}
              >
                Send back to the author
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      <SectionLabel style={{ marginTop: 0 }}>Drafting mode</SectionLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {modeButton("self", "Self")}
        {modeButton("agent", "Agent drafts")}
        {modeButton("hybrid", "Hybrid")}
      </div>

      <Field label="Topics" hint="One topic per line.">
        <Textarea
          key={topicsKey}
          defaultValue={(draft.topics ?? []).join("\n")}
          onChange={(e) => editDraftField(proposal.id, "topics", e.target.value)}
          style={{ minHeight: 104 }}
        />
      </Field>

      <SectionLabel>Outcome changes</SectionLabel>
      {(draft.cloChanges ?? []).length === 0 ? (
        <EmptyState
          title="No outcome changes yet"
          body="Agent or hybrid mode drafts an edit to this subject's outcomes; you can refine every line."
        />
      ) : (
        (draft.cloChanges ?? []).map((c, i) => (
          <div
            key={`${c.cloId ?? "new"}-${i}`}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-chip)",
              padding: 12,
              marginBottom: 10,
              background: "var(--white)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
                {c.cloId ?? "new outcome"}
              </span>
              <Tag tone={c.op === "remove" ? "danger" : c.op === "add" ? "ok" : "accent"}>{c.op}</Tag>
              <Tag>{c.bloomLevel}</Tag>
            </div>
            <Textarea
              data-demo-id={i === 0 ? "studio-draft-clo-0" : undefined}
              value={c.text}
              onChange={(e) => editCloChangeText(proposal.id, i, e.target.value)}
              style={{ minHeight: 64 }}
            />
          </div>
        ))
      )}

      <Field label="Test notes">
        <Textarea
          value={draft.testDraft ?? ""}
          onChange={(e) => editDraftField(proposal.id, "testDraft", e.target.value)}
          style={{ minHeight: 72 }}
        />
      </Field>
      <Field label="Lab notes">
        <Textarea
          value={draft.labDraft ?? ""}
          onChange={(e) => editDraftField(proposal.id, "labDraft", e.target.value)}
          style={{ minHeight: 72 }}
        />
      </Field>

      <div style={{ margin: "4px 0 16px" }}>
        <Button variant="quiet" onClick={() => requestAgentReview(proposal.id)}>
          Ask the agent to review
        </Button>
      </div>

      {state.critique ? (
        <div
          style={{
            background: "var(--warn-soft)",
            borderRadius: "var(--radius-chip)",
            padding: "10px 12px",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--warn)" }}>
              The agent's review
            </span>
            <Button
              variant="quiet"
              style={{ height: 24, padding: "0 8px", fontSize: 13 }}
              onClick={() => setCritique(null)}
            >
              Dismiss
            </Button>
          </div>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {state.critique.map((line, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 2 }}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* The one status-driven primary action. */}
      {isAuthor && !coordHere && proposal.status === "drafting" ? (
        <Button
          variant="primary"
          data-demo-id="studio-submit-review"
          onClick={() => submitForReview(proposal.id)}
        >
          Submit for coordinator review
        </Button>
      ) : canRunTest(proposal.id) ? (
        <Button
          variant="primary"
          data-demo-id="studio-run-test"
          onClick={() => startAcceptanceRun(proposal.id)}
        >
          Run the acceptance test
        </Button>
      ) : null}

      {proposal.status === "management-approval" ? (
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Tested. Awaiting management.{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("acceptance");
            }}
          >
            View the acceptance run
          </a>
        </div>
      ) : null}
      {proposal.status === "approved" ? (
        <div style={{ fontSize: 13, color: "var(--emerald-text)" }}>
          Live. The prediction is recorded.{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("backtest");
            }}
          >
            See the closed loop
          </a>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assessment: the blueprint, agent-drafted items, the coverage meter, and the
// same review chain as the proposal (spec 6.4).
// ---------------------------------------------------------------------------

const MIX_LEVELS: BloomLevel[] = ["Understand", "Apply", "Analyse"];

function AssessmentTab(props: {
  state: AppState;
  person: Person;
  subject: Subject;
  proposal?: ChangeProposal;
}) {
  const { state, person, subject, proposal } = props;
  const [selectedId,setSelectedId] = useState<string | null>(null);
  const tests = state.testDrafts.filter(t => t.subjectId === subject.id);
  const td = tests.find(t => t.id === selectedId) ?? testDraftById(proposal?.draft.testDraftId) ?? tests.at(-1);

  if (!td) {
    return (
      <EmptyState
        title="No test draft yet"
        body="Prepare a blueprint for this course. Local templates can draft example questions; review every task and mark allocation before using them. An assessment can be prepared without a curriculum proposal."
        action={
          <Button
            variant="primary"
            data-demo-id="assessment-start"
            onClick={() => createTestDraft(subject.id, proposal?.id)}
          >
            Start a test draft
          </Button>
        }
      />
    );
  }

  const weightSum = td.blueprint.cloWeights.reduce((s, w) => s + w.weight, 0);
  const mixSum = Object.values(td.blueprint.bloomMix).reduce<number>((s, v) => s + (v ?? 0), 0);
  const weightsOk = Math.abs(weightSum - 1) <= 0.01;
  const mixOk = mixSum <= 1;
  const hasItems = td.items.length > 0;

  return (
    <div>
      <Field label="Assessment draft"><Select value={td.id} onChange={e => setSelectedId(e.target.value)}>{tests.map(t => <option key={t.id} value={t.id}>{t.id} · {t.needsReview ? "Review course change" : t.status}</option>)}</Select></Field>
      <p className="limitation">Question generation uses local wording templates. It does not establish assessment quality; exact mark-allocation and task/rubric generation remain under development.</p>

      {td.needsReview ? <section className="workspace-panel">
        <h3>Review course change</h3>
        <p className="limitation">The course changed. Your questions are preserved; review their wording, outcome links, weights and marks before submitting again.</p>
        <Button onClick={() => resetAssessmentOutcomeWeights(td.id)}>Reset weights to current outcomes</Button>
        <p className="muted">This replaces the outcome weights with equal weights and keeps your questions. Remove questions linked to retired outcomes or draft new items, then adjust the weights.</p>
      </section> : null}

      {/* (a) the blueprint, editable */}
      <SectionLabel style={{ marginTop: 0 }}>Blueprint</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 13, width: 130, color: "var(--ink-2)" }}>Total marks</span>
        <Input
          type="number"
          min={1}
          className="num"
          style={{ width: 90 }}
          aria-label="Total assessment marks"
          value={td.blueprint.totalMarks}
          onChange={(e) =>
            updateBlueprint(td.id, { ...td.blueprint, totalMarks: Number(e.target.value) })
          }
        />
      </div>
      {td.blueprint.cloWeights.map((cw) => {
        const clo = state.clos.find((c) => c.id === cw.cloId);
        return (
          <div
            key={cw.cloId}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 8 }}
          >
            <span className="num" style={{ fontSize: 13, width: 130, color: "var(--ink-2)" }}>
              {cw.cloId} weight
            </span>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              className="num"
              style={{ width: 90 }}
              aria-label={(clo?.label ?? cw.cloId) + " weight"}
              value={cw.weight}
              onChange={(e) =>
                updateBlueprint(td.id, {
                  ...td.blueprint,
                  cloWeights: td.blueprint.cloWeights.map((w) =>
                    w.cloId === cw.cloId ? { ...w, weight: Number(e.target.value) } : w,
                  ),
                })
              }
            />
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{clo?.text ?? cw.cloId}</span>
          </div>
        );
      })}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 12 }}>
        <span style={{ fontSize: 13, width: 130, color: "var(--ink-2)" }}>Bloom mix</span>
        {MIX_LEVELS.map((level) => (
          <span key={level} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              className="num"
              style={{ width: 74 }}
              aria-label={level + " share"}
              value={td.blueprint.bloomMix[level] ?? 0}
              onChange={(e) =>
                updateBlueprint(td.id, {
                  ...td.blueprint,
                  bloomMix: { ...td.blueprint.bloomMix, [level]: Number(e.target.value) },
                })
              }
            />
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{level}</span>
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, margin: "14px 0 20px" }}>
        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>Blueprint check</span>
        <Tag tone={weightsOk ? "ok" : "danger"}>
          <span className="num">weights {weightSum.toFixed(2)}</span>
        </Tag>
        <Tag tone={mixOk ? "ok" : "danger"}>
          <span className="num">bloom mix {mixSum.toFixed(2)}</span>
        </Tag>
      </div>

      {/* (b) generation + (c) the items */}
      {hasItems ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <SectionLabel style={{ margin: 0 }}>Items</SectionLabel>
          <span style={{ flex: 1 }} />
          <Button
            variant="outline"
            data-demo-id="assessment-generate"
            onClick={() => generateTestItems(td.id)}
          >
            Draft items against the blueprint
          </Button>
        </div>
      ) : (
        <EmptyState
          title="No items yet"
          body="Local templates draft example wording from current outcomes. Review the questions, coverage and marks; every item stays editable."
          action={
            <Button
              variant="primary"
              data-demo-id="assessment-generate"
              onClick={() => generateTestItems(td.id)}
            >
              Draft items against the blueprint
            </Button>
          }
        />
      )}

      {td.items.map((it, idx) => (
        <Card key={it.id} style={{ marginBottom: 10, boxShadow: "none" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="num" style={{ fontWeight: 600, fontSize: 13 }}>
              Q{idx + 1}
            </span>
            <Tag>{it.bloomLevel}</Tag>
            <span className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>
              {it.targetCLO}
            </span>
            {it.source === "human" ? <Tag>edited</Tag> : null}
            <span style={{ flex: 1 }} />
            <Input
              type="number"
              min={1}
              className="num"
              style={{ width: 70 }}
              aria-label={"Question " + (idx + 1) + " marks"}
              value={it.marks}
              onChange={(e) => updateTestItem(td.id, it.id, { marks: Number(e.target.value) })}
            />
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>marks</span>
            <Button
              variant="quiet"
              style={{ height: 28, padding: "0 8px", fontSize: 13 }}
              aria-label={"Remove question " + (idx + 1)}
              onClick={() => removeTestItem(td.id, it.id)}
            >
              Remove
            </Button>
          </div>
          <Textarea
            aria-label={"Question " + (idx + 1) + " wording"}
            value={it.text}
            onChange={(e) => updateTestItem(td.id, it.id, { text: e.target.value })}
            style={{ minHeight: 56 }}
          />
        </Card>
      ))}

      {/* (d) coverage meter */}
      {hasItems ? <CoverageMeter draft={td} /> : null}

      {/* (e) status action: exactly one primary at a time. */}
      {hasItems ? (
        <div style={{ marginTop: 20 }}>
          <TestStatusAction state={state} person={person} subject={subject} draft={td} />
        </div>
      ) : null}
    </div>
  );
}

function CoverageMeter(props: { draft: TestDraft }) {
  const td = props.draft;
  const totalMarks = td.items.reduce((s, it) => s + it.marks, 0);
  const itemLevels = [...new Set<BloomLevel>([...MIX_LEVELS, ...td.items.map((it) => it.bloomLevel)])];

  const bar = (value: number, color: string) => (
    <div
      style={{
        height: 4,
        background: "var(--tint-1)",
        borderRadius: 2,
        marginTop: 3,
        maxWidth: 360,
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value * 100)).toFixed(1)}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
        }}
      />
    </div>
  );

  return (
    <div style={{ marginTop: 20 }}>
      <SectionLabel style={{ marginTop: 0 }}>Coverage against the blueprint</SectionLabel>
      {td.blueprint.cloWeights.map((cw) => {
        const actual =
          totalMarks > 0
            ? td.items.filter((it) => it.targetCLO === cw.cloId).reduce((s, it) => s + it.marks, 0) /
              totalMarks
            : 0;
        return (
          <div key={cw.cloId} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--ink-2)" }}>
              <span className="num" style={{ width: 48, fontWeight: 600 }}>
                {cw.cloId}
              </span>
              <span className="num">
                {(actual * 100).toFixed(0)}% of marks, planned {(cw.weight * 100).toFixed(0)}%
              </span>
            </div>
            {bar(actual, "var(--emerald)")}
            {bar(cw.weight, "var(--border)")}
          </div>
        );
      })}
      {itemLevels.map((level) => {
        const share =
          td.items.length > 0
            ? td.items.filter((it) => it.bloomLevel === level).length / td.items.length
            : 0;
        const target = td.blueprint.bloomMix[level] ?? 0;
        return (
          <div key={level} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--ink-2)" }}>
              <span style={{ width: 90 }}>{level}</span>
              <span className="num">
                {(share * 100).toFixed(0)}% of items, mix {(target * 100).toFixed(0)}%
              </span>
            </div>
            {bar(share, "var(--emerald)")}
            {bar(target, "var(--border)")}
          </div>
        );
      })}
    </div>
  );
}

function TestStatusAction(props: {
  state: AppState;
  person: Person;
  subject: Subject;
  draft: TestDraft;
}) {
  const { state, person, subject, draft } = props;

  const [reviewed,setReviewed] = useState(false);
  const [reviewError,setReviewError] = useState("");
  if (draft.needsReview) return <div>
    <label className="checkbox-line"><input type="checkbox" data-demo-id="assessment-course-change-ack" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I reviewed the blueprint and every question against the current course outcomes.</label>
    <Button data-demo-id="assessment-course-change-review" disabled={!reviewed} onClick={() => {
      const result = acknowledgeAssessmentCourseChange(draft.id,reviewed);
      setReviewError(result.ok ? "" : result.error ?? "The review could not be recorded.");
    }}>Record course-change review</Button>
    {reviewError ? <p role="alert" className="form-error">{reviewError}</p> : null}
  </div>;

  if (draft.status === "approved") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Tag tone="ok">Approved</Tag>
        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
          {draft.proposalId ? "This local test decision is attached to the proposal." : "Local assessment decision recorded. Institutional approval remains in your university process."}
        </span>
      </div>
    );
  }

  if (
    draft.status === "coordinator-review" &&
    can(person, "review-draft", { subjectId: subject.id, assignments: state.assignments })
  ) {
    return (
      <Button variant="primary" onClick={() => approveTestDraft(draft.id)}>
        Approve test
      </Button>
    );
  }

  if (draft.status === "coordinator-review") {
    return (
      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
        Sent for review. Awaiting the coordinator.
      </span>
    );
  }

  // Drafting: the author moves it on. A coordinator's own draft approves
  // directly; a lecturer's goes to the coordinator (both via submitTestDraft).
  if (draft.status === "drafting" && draft.authorId === person.id) {
    const authorIsCoordHere = hatsOn(draft.authorId, subject.id, state.assignments).includes(
      "coordinator",
    );
    return (
      <Button
        variant="primary"
        data-demo-id="assessment-submit"
        onClick={() => submitTestDraft(draft.id)}
      >
        {authorIsCoordHere ? "Approve test" : "Send test for review"}
      </Button>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// History: the proposal's events, newest first, then the subject's versions.
// ---------------------------------------------------------------------------

function HistoryTab(props: { state: AppState; subject: Subject; proposal: ChangeProposal }) {
  const { state, subject, proposal } = props;
  const events = [...proposal.history].reverse();
  const versions = [...state.subjectVersions]
    .filter((v) => v.subjectId === subject.id)
    .reverse();

  return (
    <div>
      <SectionLabel style={{ marginTop: 0 }}>Proposal history</SectionLabel>
      {events.length === 0 ? (
        <EmptyState
          title="Nothing has happened yet"
          body="Proposal actions are recorded here. Course revision decisions appear above."
        />
      ) : (
        events.map((e, i) => (
          <Row key={`${e.at}-${e.action}-${i}`}>
            <span style={{ fontWeight: 600, fontSize: 13, width: 180, flexShrink: 0 }}>
              {ACTION_LABEL[e.action]}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: "var(--ink-2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.note ?? ""}
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-2)", flexShrink: 0 }}>
              {personById(e.byPersonId)?.name ?? e.byPersonId}
            </span>
            <span className="num" style={{ fontSize: 13, color: "var(--ink-2)", flexShrink: 0 }}>
              {fmtWhen(e.at)}
            </span>
          </Row>
        ))
      )}

      <SectionLabel>Subject versions</SectionLabel>
      {versions.length === 0 ? (
        <EmptyState
          title="No versions yet"
          body="Each approved change snapshots the subject here, so every revision stays traceable."
        />
      ) : (
        versions.map((v) => (
          <Row key={v.id}>
            <span className="num" style={{ fontWeight: 600, fontSize: 13, width: 120, flexShrink: 0 }}>
              {v.id}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: "var(--ink-2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {v.reason}
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-2)", flexShrink: 0 }}>
              {personById(v.changedBy)?.name ?? v.changedBy}
            </span>
            <span className="num" style={{ fontSize: 13, color: "var(--ink-2)", flexShrink: 0 }}>
              {fmtWhen(v.changedAt)}
            </span>
          </Row>
        ))
      )}
    </div>
  );
}
