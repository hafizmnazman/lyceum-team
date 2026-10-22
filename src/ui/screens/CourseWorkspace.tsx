import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Download, Plus } from "lucide-react";
import { can, navAllows } from "../../app/roles.ts";
import {
  definitionForCourse, deleteTeachingSession, downloadPack, navigate, nowIso, saveTeachingPlanDetails, saveTeachingSession,
  selectSubject, type AppState,
} from "../../app/store.ts";
import { evidenceReport } from "../../lib/evidence.ts";
import { sessionDeck } from "../../lib/slides.ts";
import { planSummary, teachingPlanMarkdown, type SessionInput } from "../../lib/teachingPlan.ts";
import type { ChangeProposal, Person, Subject, TeachingPlan } from "../../types.ts";
import { Button, Disclosure, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";
import { Meter } from "../primitives/loop.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";

type CourseProps = { state: AppState; person: Person; subject: Subject };

/** Course, the setup step (plan Section 5.3): the outline as cards, outcomes with their Bloom level and
 *  topics with their hours against the budget, one action, and the context behind disclosures. */
export function CourseOverview({ state, person, subject, proposal, onPlan, onProposal, onCurriculum, onEvidence }: CourseProps & {
  proposal?: ChangeProposal; onCurriculum: () => void; onEvidence: () => void; onPlan: () => void; onProposal: () => void;
}) {
  const evidenceSources = state.evidenceSources.filter((s) => s.subjectId === subject.id).length;
  const quotedRequirements = state.skillMentions.filter((m) => m.subjectId === subject.id).length;
  const clos = state.clos.filter((c) => c.subjectId === subject.id);
  const definition = definitionForCourse(subject.id);
  const plan = state.teachingPlans.find((p) => p.subjectId === subject.id);
  const summary = planSummary(plan, clos);
  const sources = state.dataSources.filter((s) => s.subjectId === subject.id);
  const uploads = sources.filter((s) => s.sourceFileName);
  const hasSyllabus = uploads.some((s) => s.kind === "syllabus");
  const topics = definition?.topics ?? [];
  const contact = topics.reduce((n, t) => n + t.contactHours, 0);
  const budget = definition?.brief.contactHours ?? null;
  const fresh = evidenceSources === 0;
  const outcomeOf = (id: string) => definition?.outcomes.find((o) => o.id === id);
  return (
    <div className="course-outline">
      <section className="workspace-panel" aria-labelledby="current-outcomes">
        <div className="section-heading"><div><h2 id="current-outcomes">Current learning outcomes</h2>
          <p className="muted">Version <span className="tabular">{subject.currentVersionId}</span> · {plan?.term ? "teaching term " + plan.term : "teaching term not set"} · {evidenceSources ? evidenceSources + " sources, " + quotedRequirements + " quoted requirements" : "no employer evidence yet"}</p></div>
          {fresh ? <Button variant="primary" data-demo-id="course-watch" onClick={onEvidence}>Watch employers</Button>
            : <Button variant="primary" data-demo-id="course-revise" onClick={onCurriculum}>Start a revision</Button>}
        </div>
        {clos.length ? <ul className="outline-cards">{clos.map((clo) => {
          const o = outcomeOf(clo.id);
          return <li key={clo.id} className="outline-card">
            <div className="outline-card-head"><strong>{clo.label ?? clo.id}</strong><Tag>{clo.bloomLevel}</Tag></div>
            <p>{clo.text}</p>
            <p className="muted">{o?.assessmentEvidence ? "Achievement: " + o.assessmentEvidence : "Achievement evidence not recorded"} · {summary.sessions.filter((s) => s.cloIds.includes(clo.id)).length} linked sessions</p>
          </li>;
        })}</ul> : <p>No outcomes are recorded for this course yet. {fresh ? "Start a revision in Update to write the first outcome; the loop opens once one exists." : ""}</p>}
        {!plan?.term && can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments }) ? <TermSetter subjectId={subject.id} notes={plan?.notes ?? ""} /> : null}
        {fresh && clos.length ? <p className="muted">The course is open. Next, watch what employers ask for; the revision comes after a decision. <Button variant="quiet" onClick={onCurriculum}>Revise the outline now</Button></p> : null}
      </section>

      <section className="workspace-panel" aria-labelledby="course-topics">
        <div className="section-heading"><div><h2 id="course-topics">Topics and hours</h2><p className="muted">The outline as recorded in this version. Adding a topic never expands the timetable.</p></div></div>
        {budget !== null ? <Meter value={contact} max={budget} over={contact > budget} label={<><strong className="tabular">{contact}</strong> of <span className="tabular">{budget}</span> contact hours outlined</>} note={contact > budget ? "Over the contact-hour budget: Update blocks a version like this." : undefined} />
          : <p className="muted">{contact} contact hours outlined; the contact-hour budget is not recorded.</p>}
        {topics.length ? <ol className="outline-cards topic-cards">{topics.map((t, i) => <li key={t.id} className="outline-card">
          <div className="outline-card-head"><span className="eyebrow">Topic {i + 1}{t.week ? " · week " + t.week : ""}</span>{t.protected ? <Tag>Protected</Tag> : null}</div>
          <strong>{t.title || "Untitled topic"}</strong>
          <p className="muted"><span className="tabular">{t.contactHours}</span> contact h · <span className="tabular">{t.selfStudyHours}</span> self-study h{t.cloIds.length ? " · " + t.cloIds.map((id) => outcomeOf(id)?.label ?? id).join(", ") : " · no outcome linked"}</p>
        </li>)}</ol> : <p>No topic outline is recorded yet. Topics, their hours and their links are added in Update.</p>}
      </section>

      <section className="workspace-panel course-more" aria-label="Course context">
        <Disclosure summary="Teaching context, prerequisites and programme outcomes">
          <dl className="context-list">
            <div><dt>Programme</dt><dd>{definition?.brief.programmeTitle || (subject.workspaceOnly ? "Not supplied" : state.programme.title)}</dd></div>
            <div><dt>Placement</dt><dd>Year {subject.year}, semester {subject.semester}</dd></div>
            <div><dt>Prerequisites</dt><dd>{subject.prerequisiteSubjectIds.length ? subject.prerequisiteSubjectIds.map((id) => {
              const prerequisite = state.subjects.find((s) => s.id === id);
              return id + (prerequisite ? " · " + prerequisite.title : "");
            }).join("; ") : "None recorded"}</dd></div>
            <div><dt>Programme outcomes</dt><dd>{definition?.brief.programmeOutcomes.length ? definition.brief.programmeOutcomes.join(", ") : "None recorded"}</dd></div>
            <div><dt>Teaching term</dt><dd>{plan?.term || "Set a term in Teach"}</dd></div>
          </dl>
          {plan?.notes ? <p className="preserve-lines">{plan.notes}</p> : <p className="muted">Class context, assumptions and preparation notes are kept in Teach.</p>}
        </Disclosure>
        <Disclosure summary="Documents and sources" count={sources.length}>
          <p className="muted">Filed source records, not stored files you can download. Confirmed uploads still need your academic review.</p>
          {sources.length ? <ul className="source-list">{sources.map((source, index) => <li key={index}>
            <strong>{source.sourceFileName ?? source.kind.replaceAll("-", " ")}</strong>
            <span>{source.term} · {source.recordCount} records · {source.sample ? "Sample file, synthetic" : source.sourceFileName ? "Uploaded record" : "Seeded example"}</span>
          </li>)}</ul> : <p>No source records yet. Upload a syllabus or course materials to establish the course context.</p>}
          <div className="button-row">
            {navAllows(person, state.assignments, "upload") ? <Button onClick={() => { selectSubject(subject.id); navigate("upload"); }}>Upload a document</Button> : null}
            <Button variant="quiet" onClick={() => navigate("dataroom")}>Inspect the data inventory <ArrowRight size={15} /></Button>
          </div>
        </Disclosure>
        <Disclosure summary="Preparation checklist">
          <ul className="checklist">
            <li><Tag tone={hasSyllabus ? "ok" : "warn"}>{hasSyllabus ? "Filed" : "To do"}</Tag><span>File and review the course syllabus.</span></li>
            <li><Tag tone={summary.sessions.length ? "ok" : "warn"}>{summary.sessions.length ? "Started" : "To do"}</Tag><span>Outline teaching sessions.</span></li>
            <li><Tag tone={clos.length && !summary.unmapped.length ? "ok" : "warn"}>{clos.length && !summary.unmapped.length ? "Linked" : "To do"}</Tag><span>{summary.unmapped.length ? "Link sessions to " + summary.unmapped.map((c) => c.label ?? c.id).join(", ") + "." : clos.length ? "Each recorded CLO has a planned session." : "Define course outcomes."}</span></li>
            <li><Tag>{summary.ready} ready</Tag><span>Review activities and checks for understanding.</span></li>
          </ul>
          <p className="muted">These checks describe preparation only. They do not measure mastery or curriculum quality.</p>
          <Button onClick={onPlan}>{summary.sessions.length ? "Open Teach" : "Plan a teaching session"}</Button>
        </Disclosure>
        <Disclosure summary="The illustrative proposal sandbox">
          <p>Course decisions are recorded in Decide, on the brief and its receipts; the revision itself is made in Update. Institutional approval stays in the university's process.</p>
          <Button onClick={onProposal}>{proposal ? "Open the illustrative proposal" : "Open the illustrative proposal sandbox"}</Button>
          <p className="muted">The old proposal and approval chain is kept in the research sandbox and labelled illustrative.</p>
        </Disclosure>
      </section>
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
      {/* Session cards by week (plan Section 5.3), each with its outcomes and its teaching pack. */}
      {filtered.length ? <ol className="session-cards">{filtered.map((session) => (
        <li key={session.id}><article className="session-card teaching-session" data-demo-id={"session-" + session.id}>
          <div className="session-card-head"><span className="session-week"><span className="eyebrow">Week</span><strong className="tabular">{session.week}</strong></span>
            <div className="session-card-title"><h3>{session.topic}</h3><span className="muted">{session.minutes} minutes</span></div>
            <Tag tone={session.needsReview ? "warn" : session.status === "draft" ? "neutral" : "ok"}>{session.needsReview ? "Review course change" : session.status === "ready" ? "Ready to teach" : session.status === "delivered" ? "Delivered" : "Draft"}</Tag></div>
          {session.needsReview ? <p className="limitation">The course changed. Review this session and its outcome links before reuse.</p> : null}
          <div className="session-outcomes" aria-label="Linked outcomes">{session.cloIds.length ? session.cloIds.map(id => { const clo = clos.find(c => c.id === id); return <Tag key={id} tone={clo ? "accent" : "warn"}>{clo ? clo.label ?? clo.id : id + " (removed)"}</Tag>; }) : <span className="muted">No outcome linked yet</span>}</div>
          <div className="session-content"><div><h4>Learning activity</h4><p className="preserve-lines">{session.activity || "Add an activity students will take part in."}</p></div><div><h4>Check for understanding</h4><p className="preserve-lines">{session.learningCheck || "Add how you will check their learning."}</p></div></div>
          {session.resources ? <details><summary>Resources & slide brief</summary><p className="preserve-lines">{session.resources}</p></details> : null}
          <div className="button-row"><Button data-demo-id={"session-slides-" + session.id} aria-label={"Download teaching pack for " + session.topic} onClick={() => void downloadPack(subject.id, sessionDeck(subject, session, clos, evidenceReport(subject.id, state.evidenceSources, state.skillMentions, state.skillMappings, clos), state.skillMentions, state.evidenceSources, state.people, nowIso()))}><Download size={15} /> Teaching pack (.pptx)</Button><span className="muted">Editable slides from this session and the evidence linked to its outcomes. No AI text.</span></div>
          {mayEdit ? <div className="button-row session-actions">
            <Button disabled={editorOpen} aria-label={"Edit " + session.topic} onClick={() => { setEditor({ ...session, cloIds: [...session.cloIds] }); setError(""); setMessage(""); }}>Edit session</Button>
            {deleting === session.id ? <><span>Remove this session?</span><Button variant="danger" onClick={() => { const result = deleteTeachingSession(subject.id, session.id); if (result.ok) setMessage("Session removed."); else setMessage(result.error); setDeleting(null); }}>Confirm removal</Button><Button variant="quiet" onClick={() => setDeleting(null)}>Keep session</Button></>
              : <Button variant="quiet" disabled={editorOpen} aria-label={"Remove " + session.topic} onClick={() => setDeleting(session.id)}>Remove</Button>}
          </div> : null}
        </article></li>
      ))}</ol> : null}
      {!filtered.length ? <div className="workspace-panel"><h3>{summary.sessions.length ? "No sessions match this filter" : "Build your first teaching session"}</h3><p>{summary.sessions.length ? "Choose All sessions to see the rest of your plan." : "Start with the next class you need to teach. You can save a topic as a draft, then return to add its activity, CLO links and materials."}</p>{!editor && mayEdit && !summary.sessions.length ? <Button onClick={add}>Add the first session</Button> : null}</div> : null}
    </div>
  );
}

/** The term this loop runs for, set at the start so the brief, the decision, the version and the results all carry it
 *  (plan Section 4: the loop is per course and per term). Shown on the Course step until a term is set; Teach edits it after. */
function TermSetter({ subjectId, notes }: { subjectId: string; notes: string }) {
  const [term, setTerm] = useState("");
  const [error, setError] = useState("");
  return <form className="term-setter" onSubmit={(e) => { e.preventDefault(); const result = saveTeachingPlanDetails(subjectId, { term, notes }); setError(result.ok ? "" : result.error); }}>
    <Field label="The term this loop runs for" hint="Every record in the loop carries it: the brief, the decision, the version and the results.">
      <Input data-demo-id="course-term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. 2026/2027 semester 1" />
    </Field>
    <Button type="submit" disabled={!term.trim()} data-demo-id="course-term-save">Set the term</Button>
    {error ? <p role="alert" className="save-status">{error}</p> : null}
  </form>;
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
