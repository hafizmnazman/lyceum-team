// Decide, step 3 of the loop (plan Sections 4 and 4.2): what will we do, and who
// said so. The decision is a record: adopt, retain, defer or return, by whom,
// when and why, bound to the brief, the course version and the term. The brief's
// author cannot be its sole decider, so the author's own decision is labelled
// self-recorded and the step stays open until a second person decides. A
// decision is not a course; Update answers it.

import { useState } from "react";
import { loopState } from "../../app/loop.ts";
import { currentPerson, mayDecide, navigate, openStep, recordDecision, useStore } from "../../app/store.ts";
import { DECISION_OUTCOMES, NOTE_MAX, OUTCOME_HELP, OUTCOME_LABEL, decisionStatusText, evidenceChangedAt } from "../../lib/decisions.ts";
import { RECOMMENDATION_LABEL } from "../../lib/evidence.ts";
import type { DecisionOutcome, EvidenceBrief } from "../../types.ts";
import { Button, Disclosure, EmptyState, Field, Tag, Textarea } from "../primitives/index.tsx";
import { DecisionCard, Handoff } from "../primitives/loop.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";
import { StepFrame, courseContext } from "./StepFrame.tsx";

export function DecideScreen() {
  const state = useStore();
  const person = currentPerson();
  if (!person) return null;
  const { subject, subjects } = courseContext(state, person);
  if (!subject) return <EmptyState title="No course to decide on" body="Decisions are recorded on a course's meeting brief." />;
  const loop = loopState(state, subject.id);
  const brief = loop.latestBrief;
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  const older = state.evidenceBriefs.filter((b) => b.subjectId === subject.id && b.id !== brief?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const decided = loop.steps.find((s) => s.id === "decide")!.done;
  return <StepFrame state={state} step="decide" subject={subject} subjects={subjects}>
    {brief ? <BriefDecisionPanel brief={brief} subjectId={subject.id} /> : <section className="workspace-panel">
      <h2>No brief to decide on yet</h2>
      <p>A decision is recorded on a meeting brief, so it carries the evidence and its receipts. Prepare the brief in Report.</p>
      <Button variant="primary" onClick={() => openStep(subject.id, "report", "brief")}>Prepare the brief in Report</Button>
    </section>}
    <Disclosure summary="Try the change on a mock cohort (illustrative)" data-demo-id="decide-sandbox">
      <p>The sandbox runs a proposed change against a synthetic cohort of students. Its numbers are illustrative: they come from a simulation, not from your students, and they never record a decision.</p>
      <div className="button-row"><Button onClick={() => navigate("acceptance")}>Open the acceptance test (illustrative)</Button><Button variant="quiet" onClick={() => navigate("proposal")}>Open the change proposal (illustrative)</Button></div>
    </Disclosure>
    {older.length ? <Disclosure summary="Earlier briefs and their decisions" count={older.length}>
      <ul className="older-briefs">{older.map((b) => { const records = state.briefDecisions.filter((d) => d.briefId === b.id); return <li key={b.id}>
        <strong>{RECOMMENDATION_LABEL[b.recommendation]}</strong> <span className="muted">prepared {b.createdAt.slice(0, 10)} by {name(b.createdBy)} · superseded by a newer brief · {records.length} {records.length === 1 ? "decision" : "decisions"} on record</span>
        {records.map((d) => <DecisionCard key={d.id} decision={d} name={name(d.byPersonId)} self={d.byPersonId === b.createdBy} superseded />)}
      </li>; })}</ul>
    </Disclosure> : null}
    {decided && loop.decision?.governing ? <Handoff step="decide" record={loop.decision.governing.outcome === "retain" ? "Retain recorded: no change to the course this term." : "Decision recorded: " + OUTCOME_LABEL[loop.decision.governing.outcome].toLowerCase() + "."}
      onNext={() => openStep(subject.id, loop.decision!.governing!.outcome === "retain" ? "teach" : "update")} /> : null}
  </StepFrame>;
}

/** The latest brief: its recipients, who has read it, every decision on it, and the form to record one. Shared with Home. */
export function BriefDecisionPanel({ brief, subjectId, compact = false }: { brief: EvidenceBrief; subjectId: string; compact?: boolean }) {
  const state = useStore();
  const person = currentPerson()!;
  const loop = loopState(state, subjectId);
  const decision = loop.decision && loop.decision.brief.id === brief.id ? loop.decision : null;
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  const isAuthor = brief.createdBy === person.id;
  const canRecord = mayDecide(subjectId, person) && (isAuthor || brief.recipients.includes(person.id)) && !decision?.supersededBy;
  const changedAt = evidenceChangedAt(subjectId, state.evidenceSources, state.skillMentions, state.skillMappings);
  const records = decision?.records ?? state.briefDecisions.filter((d) => d.briefId === brief.id);
  const standingIds = new Set((decision?.standing ?? []).map((d) => d.id));
  const read = (id: string) => state.notifications.some((n) => n.briefId === brief.id && n.toPersonId === id && n.read);
  return <section className="workspace-panel decide-panel" aria-labelledby={"decide-" + brief.id} data-demo-id="decide-panel">
    <div className="section-heading"><div>
      <h2 id={"decide-" + brief.id}>{compact ? "Your decision on this brief" : "The brief: " + RECOMMENDATION_LABEL[brief.recommendation]}</h2>
      <p className="muted">Prepared {brief.createdAt.slice(0, 16).replace("T", " ")} by {name(brief.createdBy)}{loop.window.term ? " · term " + loop.window.term : ""}</p>
    </div>
      <Tag tone={decision?.status === "decided" ? "ok" : decision?.status === "self-recorded" ? "warn" : "neutral"}>{decision?.status === "decided" ? "Decided" : decision?.status === "self-recorded" ? "Self-recorded" : "Open"}</Tag></div>
    {decision ? <p className="decide-status" data-demo-id="decide-status">{decisionStatusText(decision, name, loop.singleOwner)}</p> : null}
    {!compact ? <div className="decide-recipients">
      <h3>Recipients</h3>
      {brief.recipients.length ? <ul className="source-list">{brief.recipients.map((id) => <li key={id}><strong>{name(id)}</strong><span>{read(id) ? "Read" : "Not yet read"} · {decision?.standing.find((d) => d.byPersonId === id) ? "decided" : "no decision yet"}</span></li>)}</ul>
        : <p className="muted">Not sent yet. {isAuthor ? "Send it to the colleague who should decide." : ""}</p>}
      {isAuthor && !brief.sentAt ? <Button data-demo-id="decide-send" onClick={() => openStep(subjectId, "report", "brief")}>Send to a colleague</Button> : null}
    </div> : null}
    {records.length ? <div className="decide-records"><h3>Decisions on record</h3>
      {records.map((d) => <DecisionCard key={d.id} decision={d} name={name(d.byPersonId)} self={d.byPersonId === brief.createdBy && !loop.singleOwner}
        amended={!standingIds.has(d.id)} evidenceChanged={changedAt > d.at} />)}
    </div> : null}
    {canRecord ? <DecisionForm briefId={brief.id} isAuthor={isAuthor} singleOwner={loop.singleOwner} /> : !compact && !records.length ? <p className="muted">{mayDecide(subjectId, person) ? "Only a recipient of this brief, or its author, can record a decision on it." : "A course coordinator or the programme owner records the decision. You can follow it here."}</p> : null}
  </section>;
}

function DecisionForm({ briefId, isAuthor, singleOwner }: { briefId: string; isAuthor: boolean; singleOwner: boolean }) {
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  useUnsavedEditor(Boolean(note.trim()));
  const record = (chosen: DecisionOutcome) => {
    const result = recordDecision(briefId, chosen, note);
    if (result.ok) { setNote(""); setOutcome(null); setMessage({ text: "Recorded. The record is kept as written; deciding again adds an amendment.", error: false }); }
    else setMessage({ text: result.error, error: true });
  };
  return <div className="decision-form" data-demo-id="decision-form">
    <h3>Record a decision</h3>
    {isAuthor && !singleOwner ? <p className="limitation">You prepared this brief, so your decision is recorded as self-recorded. The step stays open until a second person decides.</p> : null}
    <Field label="Why: the reason travels with the record" hint={"Required. Up to " + NOTE_MAX + " characters."}>
      <Textarea data-demo-id="decide-note" maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: the dashboard exercise fits the existing hours; the statistics foundation is kept." />
    </Field>
    <div className="decision-outcomes" role="group" aria-label="Decision">
      {DECISION_OUTCOMES.map((o) => <button key={o} type="button" className={"decision-outcome" + (outcome === o ? " is-chosen" : "")} data-demo-id={"decide-" + o}
        disabled={!note.trim()} onClick={() => { setOutcome(o); record(o); }}>
        <strong>{OUTCOME_LABEL[o]}</strong><span>{OUTCOME_HELP[o]}</span>
      </button>)}
    </div>
    {!note.trim() ? <p className="muted">Write the reason first; the four decisions then become available.</p> : null}
    {message ? <p role={message.error ? "alert" : "status"} className={message.error ? "form-error" : "save-status"}>{message.text}</p> : null}
  </div>;
}
