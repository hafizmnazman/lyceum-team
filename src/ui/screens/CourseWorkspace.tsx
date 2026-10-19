import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Download, Plus } from "lucide-react";
import { can, navAllows } from "../../app/roles.ts";
import {
  deleteTeachingSession, navigate, nowIso, saveTeachingPlanDetails, saveTeachingSession,
  selectSubject, type AppState,
} from "../../app/store.ts";
import { evidenceReport } from "../../lib/evidence.ts";
import { downloadDeck, sessionDeck } from "../../lib/slides.ts";
import { planSummary, teachingPlanMarkdown, type SessionInput } from "../../lib/teachingPlan.ts";
import type { ChangeProposal, Person, Subject, TeachingPlan } from "../../types.ts";
import { Button, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";

type CourseProps = { state: AppState; person: Person; subject: Subject };

export function CourseOverview({ state, person, subject, proposal, onPlan, onProposal, onCurriculum, onEvidence }: CourseProps & {
  proposal?: ChangeProposal; onCurriculum: () => void; onEvidence: () => void; onPlan: () => void; onProposal: () => void;
}) {
  const evidenceSources = state.evidenceSources.filter((s) => s.subjectId === subject.id).length;
  const quotedRequirements = state.skillMentions.filter((m) => m.subjectId === subject.id).length;
  const clos = state.clos.filter((c) => c.subjectId === subject.id);
  const plan = state.teachingPlans.find((p) => p.subjectId === subject.id);
  const summary = planSummary(plan, clos);
  const sources = state.dataSources.filter((s) => s.subjectId === subject.id);
  const uploads = sources.filter((s) => s.sourceFileName);
  const hasSyllabus = uploads.some((s) => s.kind === "syllabus");
  return (
    <div className="workspace-columns">
      <div>
        <section className="workspace-panel" aria-labelledby="current-outcomes">
          <div className="section-heading"><h2 id="current-outcomes">Current learning outcomes</h2><Button onClick={onCurriculum}>Edit outcomes & topics</Button></div>
          <p className="muted">Current version: {subject.currentVersionId}</p>
          <p className="muted">Use these outcomes to plan what students will practise and how you will check their understanding.</p>
          {clos.length ? <ul className="outcome-list">{clos.map((clo) => <li key={clo.id}>
            <div className="button-row"><strong>{clo.label ?? clo.id}</strong><Tag>{clo.bloomLevel}</Tag></div>
            <p>{clo.text}</p>
            <span className="muted">{summary.sessions.filter((s) => s.cloIds.includes(clo.id)).length} linked teaching sessions</span>
          </li>)}</ul> : <p>No outcomes are recorded for this course. Ask the coordinator to define them before planning coverage.</p>}
        </section>
        <section className="workspace-panel" aria-labelledby="teaching-context">
          <h2 id="teaching-context">Teaching context</h2>
          <dl className="context-list">
            <div><dt>Programme</dt><dd>{state.courseDefinitions[subject.id]?.brief.programmeTitle || (subject.workspaceOnly ? "Not supplied" : state.programme.title)}</dd></div>
            <div><dt>Placement</dt><dd>Year {subject.year}, semester {subject.semester}</dd></div>
            <div><dt>Prerequisites</dt><dd>{subject.prerequisiteSubjectIds.length ? subject.prerequisiteSubjectIds.map((id) => {
              const prerequisite = state.subjects.find((s) => s.id === id);
              return id + (prerequisite ? " · " + prerequisite.title : "");
            }).join("; ") : "None recorded"}</dd></div>
            <div><dt>Teaching term</dt><dd>{plan?.term || "Set a term in Teaching plan"}</dd></div>
          </dl>
          {plan?.notes ? <p className="preserve-lines">{plan.notes}</p> : <p className="muted">Add class context, assumptions and preparation notes in Teaching plan.</p>}
        </section>
        <section className="workspace-panel" aria-labelledby="course-sources">
          <div className="section-heading"><h2 id="course-sources">Sources & materials</h2>
            {navAllows(person, state.assignments, "upload") ? <Button onClick={() => { selectSubject(subject.id); navigate("upload"); }}>Upload a document</Button> : null}
          </div>
          <p className="muted">Filed source records, not stored files you can download. Confirmed uploads still need your academic review.</p>
          {sources.length ? <ul className="source-list">{sources.map((source, index) => <li key={index}>
            <strong>{source.sourceFileName ?? source.kind.replaceAll("-", " ")}</strong>
            <span>{source.term} · {source.recordCount} records · {source.sourceFileName ? "Uploaded record" : "Seeded example"}</span>
          </li>)}</ul> : <p>No source records yet. Upload a syllabus or course materials to establish the course context.</p>}
          <Button variant="quiet" onClick={() => navigate("dataroom")}>Inspect the data inventory <ArrowRight size={15} /></Button>
        </section>
      </div>
      <aside className="course-aside" aria-label="Course next actions">
        <section className="workspace-panel">
          <h2>Prepare your next class</h2>
          {summary.next ? <><p><strong>Week {summary.next.week} · {summary.next.topic}</strong></p><p className="muted">{summary.next.minutes} minutes · {summary.next.needsReview ? "Review before reuse" : summary.next.status === "draft" ? "Preparation in progress" : "Ready to teach"}</p></>
            : <p>{summary.sessions.length ? "All saved sessions are marked delivered. Add the next class or revise your plan." : "Start with a topic, then connect it to an outcome, activity and learning check."}</p>}
          <Button variant="primary" onClick={onPlan}>{summary.sessions.length ? "Open teaching plan" : "Plan a teaching session"}</Button>
          <p className="muted">{summary.sessions.length} saved sessions · {summary.minutes} planned minutes</p>
        </section>
        <section className="workspace-panel">
          <h2>Preparation checklist</h2>
          <ul className="checklist">
            <li><Tag tone={hasSyllabus ? "ok" : "warn"}>{hasSyllabus ? "Filed" : "To do"}</Tag><span>File and review the course syllabus.</span></li>
            <li><Tag tone={summary.sessions.length ? "ok" : "warn"}>{summary.sessions.length ? "Started" : "To do"}</Tag><span>Outline teaching sessions.</span></li>
            <li><Tag tone={clos.length && !summary.unmapped.length ? "ok" : "warn"}>{clos.length && !summary.unmapped.length ? "Linked" : "To do"}</Tag><span>{summary.unmapped.length ? "Link sessions to " + summary.unmapped.map((c) => c.label ?? c.id).join(", ") + "." : clos.length ? "Each recorded CLO has a planned session." : "Define course outcomes."}</span></li>
            <li><Tag>{summary.ready} ready</Tag><span>Review activities and checks for understanding.</span></li>
          </ul>
          <p className="muted">These checks describe preparation only. They do not measure mastery or curriculum quality.</p>
        </section>
        <section className="workspace-panel">
          <h2>Curriculum review</h2>
          <p>{proposal ? "An open proposal is " + proposal.status.replaceAll("-", " ") + ". Review its changes separately from your teaching preparation." : "Propose a formal change when course outcomes or topics need revision."}</p>
          <Button onClick={onProposal}>{proposal ? "Continue proposal" : "View proposal workspace"}</Button>
          <p className="muted">Use Outcomes & topics to review and save your own course version. Institutional approval remains external.</p>
        </section>
        <section className="workspace-panel">
          <h2>Evidence</h2>
          <p>{evidenceSources ? evidenceSources + " recorded sources · " + quotedRequirements + " quoted requirements" : "Record job postings or professional documents and quote the exact requirements you consider."}</p>
          <Button onClick={onEvidence}>{evidenceSources ? "Open evidence" : "Add evidence"}</Button>
          <p className="muted">Lecturer-supplied receipts with exact excerpts. Nothing is collected from the web.</p>
        </section>
      </aside>
    </div>
  );
}

export function TeachingPlanPanel({ state, person, subject }: CourseProps) {
  const plan = state.teachingPlans.find((p) => p.subjectId === subject.id);
  const clos = state.clos.filter((c) => c.subjectId === subject.id);
  const summary = planSummary(plan, clos);
  const mayEdit = can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments });
  const [editor, setEditor] = useState<SessionInput | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const titleRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const editorId = useId();
  const editorOpen = editor !== null;
  useEffect(() => { if (editorOpen) titleRef.current?.focus(); }, [editorOpen]);
  useUnsavedEditor(editorOpen);
  function add() {
    setMessage(""); setError("");
    setEditor({ week: Math.min(52, (summary.sessions.at(-1)?.week ?? 0) + 1), topic: "", minutes: 60,
      cloIds: [], activity: "", learningCheck: "", resources: "", status: "draft" });
  }
  function exportPlan() {
    if (!plan) return;
    const url = URL.createObjectURL(new Blob([teachingPlanMarkdown(subject, plan, clos)], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = subject.id + "-teaching-plan.md"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const filtered = summary.sessions.filter((s) => filter === "all" || s.status === filter);
  return (
    <div>
      <div className="section-heading">
        <div><h2>Teaching plan</h2><p className="muted">One course plan in this browser. Save each editor before leaving this course.</p></div>
        <div className="button-row">
          <Button onClick={exportPlan} disabled={!plan} data-demo-id="plan-export"><Download size={15} /> Export plan (.md)</Button>
          {mayEdit ? <Button ref={addButtonRef} variant="primary" disabled={editorOpen} onClick={add} data-demo-id="plan-add"><Plus size={15} /> Add session</Button> : null}
        </div>
      </div>
      <PlanDetails key={subject.id} subjectId={subject.id} plan={plan} mayEdit={mayEdit} />
      <div className="preparation-summary" aria-label="Teaching plan summary">
        <span><strong>{summary.sessions.length}</strong> sessions</span>
        <span><strong>{summary.minutes}</strong> planned minutes</span>
        <span><strong>{summary.ready}</strong> ready</span>
        <span><strong>{summary.delivered}</strong> delivered</span>
        {summary.needsReview ? <span><strong>{summary.needsReview}</strong> need review</span> : null}
      </div>
      <p className="muted">{!clos.length ? "No CLOs are defined for this course." : summary.unmapped.length ? "No session linked yet: " + summary.unmapped.map((c) => c.label ?? c.id).join(", ") + "." : "Every current CLO is linked to at least one planned session."} Links show intended coverage, not learning evidence.</p>
      {message ? <p role="status" className="save-status">{message}</p> : null}
      {editor ? (
        <form className="workspace-panel session-editor" aria-labelledby={editorId + "-heading"} onSubmit={(event) => {
          event.preventDefault();
          const result = saveTeachingSession(subject.id, editor);
          if (!result.ok) { setError(result.error); requestAnimationFrame(() => errorRef.current?.focus()); return; }
          setEditor(null); setError(""); setMessage("Session saved. " + (state.persistenceStatus === "unavailable" ? "Browser storage is unavailable; export your plan before closing." : "Changes are kept in this browser."));
          requestAnimationFrame(() => addButtonRef.current?.focus({ preventScroll: true }));
        }}>
          <div className="section-heading"><h3 id={editorId + "-heading"}>{editor.id ? "Edit teaching session" : "New teaching session"}</h3><Tag tone="warn">Unsaved editor</Tag></div>
          {error ? <div role="alert" tabIndex={-1} ref={errorRef} className="form-error">{error}</div> : null}
          <Field label="Session topic"><Input ref={titleRef} value={editor.topic} required maxLength={300} data-demo-id="session-topic" onChange={(e) => setEditor({ ...editor, topic: e.target.value })} placeholder="What will students work on?" /></Field>
          <div className="form-grid">
            <Field label="Teaching week"><Input type="number" min={1} max={52} required value={editor.week} onChange={(e) => setEditor({ ...editor, week: Number(e.target.value) })} /></Field>
            <Field label="Duration (minutes)"><Input type="number" min={5} max={600} required value={editor.minutes} onChange={(e) => setEditor({ ...editor, minutes: Number(e.target.value) })} /></Field>
            <Field label="Preparation status"><Select value={editor.status} data-demo-id="session-status" onChange={(e) => setEditor({ ...editor, status: e.target.value as SessionInput["status"] })}><option value="draft">Draft</option><option value="ready">Ready to teach</option><option value="delivered">Delivered</option></Select></Field>
          </div>
          <fieldset className="clo-choices"><legend>Link course learning outcomes</legend>
            {editor.cloIds.filter(id => !clos.some(c => c.id === id)).map(id => <div key={id} className="button-row"><span className="form-error">Removed outcome: {id}</span><Button type="button" onClick={() => setEditor({ ...editor, cloIds: editor.cloIds.filter(x => x !== id) })}>Remove outdated link</Button></div>)}
            {clos.length ? clos.map((clo) => <label key={clo.id}><input type="checkbox" data-demo-id={"session-clo-" + clo.id} checked={editor.cloIds.includes(clo.id)} onChange={(e) => setEditor({ ...editor, cloIds: e.target.checked ? [...editor.cloIds, clo.id] : editor.cloIds.filter((id) => id !== clo.id) })} /><span><strong>{clo.label ?? clo.id}</strong> · {clo.text}</span></label>) : <p className="muted">You can save a draft now. Add course outcomes before marking it ready.</p>}
          </fieldset>
          <Field label="Learning activity" hint="Describe what students will do, not only what you will present."><Textarea value={editor.activity} data-demo-id="session-activity" onChange={(e) => setEditor({ ...editor, activity: e.target.value })} placeholder="e.g. Compare two worked examples in pairs and explain the trade-offs." /></Field>
          <Field label="Check for understanding" hint="State what you will look for in an answer, demonstration or short task."><Textarea value={editor.learningCheck} data-demo-id="session-check" onChange={(e) => setEditor({ ...editor, learningCheck: e.target.value })} placeholder="e.g. An exit question requiring a justified choice, with feedback next class." /></Field>
          <Field label="Resources and slide brief" hint="Keep reading references, source URLs and worked examples here. They appear on the resources slide of the generated teaching pack."><Textarea value={editor.resources} data-demo-id="session-resources" onChange={(e) => setEditor({ ...editor, resources: e.target.value })} /></Field>
          <p className="muted">Ready and delivered sessions require a CLO link, activity and learning check. You decide whether the preparation is suitable.</p>
          <div className="button-row"><Button type="submit" variant="primary" data-demo-id="session-save">Save session</Button><Button type="button" variant="quiet" onClick={() => { setEditor(null); setError(""); requestAnimationFrame(() => addButtonRef.current?.focus({ preventScroll: true })); }}>Cancel edits</Button></div>
        </form>
      ) : null}
      <div className="section-heading"><h3>Session sequence</h3><label className="inline-field">Show <Select aria-label="Filter sessions" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All sessions</option><option value="draft">Drafts</option><option value="ready">Ready to teach</option><option value="delivered">Delivered</option></Select></label></div>
      {filtered.map((session) => (
        <article className="workspace-panel teaching-session" key={session.id} data-demo-id={"session-" + session.id}>
          <div className="section-heading"><div><span className="eyebrow">Week {session.week} · {session.minutes} minutes</span><h3>{session.topic}</h3></div><Tag tone={session.needsReview ? "warn" : session.status === "draft" ? "neutral" : "ok"}>{session.needsReview ? "Review course change" : session.status === "ready" ? "Ready to teach" : session.status === "delivered" ? "Delivered" : "Draft"}</Tag></div>
          {session.needsReview ? <p className="limitation">The course changed. Review this session and its outcome links before reuse.</p> : null}
          <p className="muted">Outcomes: {session.cloIds.map(id => clos.find(c => c.id === id)?.label ?? id).join(", ") || "Not linked yet"}</p>
          <div className="session-content"><div><h4>Learning activity</h4><p className="preserve-lines">{session.activity || "Add an activity students will take part in."}</p></div><div><h4>Check for understanding</h4><p className="preserve-lines">{session.learningCheck || "Add how you will check their learning."}</p></div></div>
          {session.resources ? <details><summary>Resources & slide brief</summary><p className="preserve-lines">{session.resources}</p></details> : null}
          <div className="button-row"><Button data-demo-id={"session-slides-" + session.id} aria-label={"Download teaching pack for " + session.topic} onClick={() => void downloadDeck(sessionDeck(subject, session, clos, evidenceReport(subject.id, state.evidenceSources, state.skillMentions, state.skillMappings, clos), state.skillMentions, state.evidenceSources, state.people, nowIso()))}><Download size={15} /> Teaching pack (.pptx)</Button><span className="muted">Editable slides from this session and the evidence linked to its outcomes. No AI text.</span></div>
          {mayEdit ? <div className="button-row session-actions">
            <Button disabled={editorOpen} aria-label={"Edit " + session.topic} onClick={() => { setEditor({ ...session, cloIds: [...session.cloIds] }); setError(""); setMessage(""); }}>Edit session</Button>
            {deleting === session.id ? <><span>Remove this session?</span><Button variant="danger" onClick={() => { const result = deleteTeachingSession(subject.id, session.id); if (result.ok) setMessage("Session removed."); else setMessage(result.error); setDeleting(null); }}>Confirm removal</Button><Button variant="quiet" onClick={() => setDeleting(null)}>Keep session</Button></>
              : <Button variant="quiet" disabled={editorOpen} aria-label={"Remove " + session.topic} onClick={() => setDeleting(session.id)}>Remove</Button>}
          </div> : null}
        </article>
      ))}
      {!filtered.length ? <div className="workspace-panel"><h3>{summary.sessions.length ? "No sessions match this filter" : "Build your first teaching session"}</h3><p>{summary.sessions.length ? "Choose All sessions to see the rest of your plan." : "Start with the next class you need to teach. You can save a topic as a draft, then return to add its activity, CLO links and materials."}</p>{!editor && mayEdit && !summary.sessions.length ? <Button onClick={add}>Add the first session</Button> : null}</div> : null}
    </div>
  );
}

function PlanDetails({ subjectId, plan, mayEdit }: { subjectId: string; plan?: TeachingPlan; mayEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(plan?.term ?? "");
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [feedback, setFeedback] = useState("");
  useUnsavedEditor(open && (term !== (plan?.term ?? "") || notes !== (plan?.notes ?? "")));
  return <section className="workspace-panel">
    <div className="section-heading"><div><h3>Term & teaching notes</h3><p className="muted">{plan?.term || "No term set"}</p></div>{mayEdit && !open ? <Button onClick={() => { setTerm(plan?.term ?? ""); setNotes(plan?.notes ?? ""); setOpen(true); setFeedback(""); }}>Edit course notes</Button> : null}</div>
    {open ? <form onSubmit={(e) => { e.preventDefault(); const result = saveTeachingPlanDetails(subjectId, { term, notes }); if (result.ok) { setOpen(false); setFeedback("Course notes saved."); } else setFeedback(result.error); }}>
      <Field label="Teaching term" hint="A label for this course plan; separate term archives are not built yet."><Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. September 2026" /></Field>
      <Field label="Course notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Class context, prerequisite knowledge, resources to prepare…" /></Field>
      <div className="button-row"><Button type="submit" variant="primary">Save course notes</Button><Button type="button" variant="quiet" onClick={() => setOpen(false)}>Cancel edits</Button></div>
    </form> : plan?.notes ? <p className="preserve-lines">{plan.notes}</p> : <p className="muted">Record teaching context and preparation reminders for this course.</p>}
    {feedback ? <p role="status" className="save-status">{feedback}</p> : null}
  </section>;
}
