import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Download, Plus } from "lucide-react";
import { plural } from "../../app/loop.ts";
import { can, navAllows } from "../../app/roles.ts";
import {
  definitionForCourse, deleteTeachingSession, downloadPack, navigate, nowIso, saveTeachingPlanDetails, saveTeachingSession,
  selectSubject, sessionSlideRequest, setSessionSlides, trackRequest, type AppState,
} from "../../app/store.ts";
import { DEMO_LINE } from "../../data/sample-course/index.ts";
import { buildCourseFile, type CourseFilePack } from "../../lib/courseFile.ts";
import { downloadBytes } from "../../lib/download.ts";
import { AssessmentPanel, hasCourseRecord, MaterialsPanel, OutcomesPanel, ReferencesPanel, SchedulePanel, SynopsisPanel } from "./CourseRecord.tsx";
import { evidenceReport } from "../../lib/evidence.ts";
import { brandFor, deckBytes, sessionDeck, type DeckSpec } from "../../lib/slides.ts";
import { downloadText } from "../../lib/download.ts";
import { DeckFilmstrip, DeckThumb, useMarkData } from "../primitives/DeckPreview.tsx";
import { SlideDiffList } from "../primitives/compare.tsx";
import { deckDiff } from "../../lib/diff.ts";
import { packMaker, previousVersion } from "./packCompare.ts";
import { planSummary, suggestedWeek, teachingPlanMarkdown, type SessionInput } from "../../lib/teachingPlan.ts";
import type { ChangeProposal, CourseDefinition, Person, Subject, TeachingPlan, TeachingSession } from "../../types.ts";
import { Button, Disclosure, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";
import { Meter } from "../primitives/loop.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";
import { SessionItems } from "./SessionItems.tsx";
import { fetchModelSlides } from "../../agents/client.ts";
import { courseMisconceptions } from "../../lib/items.ts";

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
  const record = hasCourseRecord(definition) ? definition : null;
  const markData = useMarkData(record?.sample && state.institution.showMark ? state.institution.mark.wide ?? state.institution.mark.png : null);
  const sessions = plan?.sessions ?? [];
  const report = evidenceReport(subject.id, state.evidenceSources, state.skillMentions, state.skillMappings, clos);
  const deckFor = (session: TeachingSession) => sessionDeck(subject, session, clos, report, state.skillMentions, state.evidenceSources, state.people, nowIso(),
    { definition, brand: brandFor(state.institution, definition, subject, session.week, markData) });
  return (
    <div className="course-outline">
      <section className="workspace-panel" aria-labelledby="current-outcomes">
        <div className="section-heading"><div><h2 id="current-outcomes">{record ? "The course record" : "Current learning outcomes"}</h2>
          <p className="muted">Version <span className="tabular">{subject.currentVersionId}</span> · {plan?.term ? "teaching term " + plan.term : "teaching term not set"} · {evidenceSources ? evidenceSources + " sources, " + quotedRequirements + " quoted requirements" : "no employer evidence yet"}</p></div>
          {fresh ? <Button variant="primary" data-demo-id="course-watch" onClick={onEvidence}>Watch employers</Button>
            : <Button variant="primary" data-demo-id="course-revise" onClick={onCurriculum}>Start a revision</Button>}
        </div>
        {record?.sample ? <p className="sample-line" data-demo-id="course-sample-line"><Tag tone="warn">Sample, synthetic</Tag> {DEMO_LINE}</p> : null}
        {record ? null : clos.length ? <ul className="outline-cards">{clos.map((clo) => {
          const o = outcomeOf(clo.id);
          return <li key={clo.id} className="outline-card">
            <div className="outline-card-head"><strong>{clo.label ?? clo.id}</strong><Tag>{clo.bloomLevel}</Tag></div>
            <p>{clo.text}</p>
            <p className="muted">{o?.assessmentEvidence ? "Achievement: " + o.assessmentEvidence : "Achievement evidence not recorded"} · {plural(summary.sessions.filter((s) => s.cloIds.includes(clo.id)).length, "linked session", "linked sessions")}</p>
          </li>;
        })}</ul> : <p>No outcomes are recorded for this course yet. {fresh ? "Start a revision in Update to write the first outcome; the loop opens once one exists." : ""}</p>}
        {!plan?.term && can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments }) ? <TermSetter subjectId={subject.id} notes={plan?.notes ?? ""} /> : null}
        {fresh && clos.length ? <p className="muted">The course is open. Next, watch what employers ask for; the revision comes after a decision. <Button variant="quiet" onClick={onCurriculum}>Revise the outline now</Button></p> : null}
        {definition ? <CourseFileExport state={state} subject={subject} definition={definition} /> : null}
      </section>

      {record ? <>
        <SynopsisPanel definition={record} />
        <OutcomesPanel definition={record} plos={state.programme.plos ?? []} sessions={sessions} />
        <AssessmentPanel definition={record} rubrics={state.rubrics.filter((r) => r.subjectId === subject.id)} />
        <SchedulePanel definition={record} sessions={sessions} deckFor={deckFor} markSrc={state.institution.mark.wide ?? state.institution.mark.png} />
        {sessions.length ? <MaterialsPanel courseId={subject.id} sessions={sessions} onTeach={onPlan} /> : null}
        <ReferencesPanel definition={record} />
      </> : null}

      {record ? null : <section className="workspace-panel" aria-labelledby="course-topics">
        <div className="section-heading"><div><h2 id="course-topics">Topics and hours</h2></div></div>
        {budget !== null ? <Meter value={contact} max={budget} over={contact > budget} label={<><strong className="tabular">{contact}</strong> of <span className="tabular">{budget}</span> contact hours outlined</>} note={contact > budget ? "Over the contact-hour budget: Update blocks a version like this." : undefined} />
          : <p className="muted">{contact} contact hours outlined; the contact-hour budget is not recorded.</p>}
        {topics.length ? <ol className="outline-cards topic-cards">{topics.map((t, i) => <li key={t.id} className="outline-card">
          <div className="outline-card-head"><span className="eyebrow">Topic {i + 1}{t.week ? " · week " + t.week : ""}</span>{t.protected ? <Tag>Protected</Tag> : null}</div>
          <strong>{t.title || "Untitled topic"}</strong>
          <p className="muted"><span className="tabular">{t.contactHours}</span> contact h · <span className="tabular">{t.selfStudyHours}</span> self-study h{t.cloIds.length ? " · " + t.cloIds.map((id) => outcomeOf(id)?.label ?? id).join(", ") : " · no outcome linked"}</p>
        </li>)}</ol> : <p>No topic outline is recorded yet. Topics, their hours and their links are added in Update.</p>}
      </section>}

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
  const [week, setWeek] = useState("all");
  const titleRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const editorId = useId();
  const editorOpen = editor !== null;
  useEffect(() => { if (editorOpen) titleRef.current?.focus(); }, [editorOpen]);
  useUnsavedEditor(editorOpen);
  const definition = definitionForCourse(subject.id);
  const markData = useMarkData(definition?.sample && state.institution.showMark ? state.institution.mark.wide ?? state.institution.mark.png : null);
  const report = evidenceReport(subject.id, state.evidenceSources, state.skillMentions, state.skillMappings, clos);
  const at = nowIso();
  const deckFor = (session: TeachingSession) => sessionDeck(subject, session, clos, report, state.skillMentions, state.evidenceSources, state.people, at,
    { definition, brand: brandFor(state.institution, definition, subject, session.week, markData) });
  // The pack as the version before this one would have built it (depth plan Section 6.2), for "What changed in this pack".
  const currentVersion = state.subjectVersions.find((v) => v.id === subject.currentVersionId);
  const priorVersion = currentVersion ? previousVersion(state, currentVersion) : null;
  const makePack = packMaker(state, subject, markData, at);
  const priorPack = (session: TeachingSession) => (priorVersion ? makePack(session, priorVersion) : null);
  function add() {
    setMessage(""); setError("");
    // The first week that teaches an outcome the latest version changed, otherwise the week after your last session.
    const versions = state.subjectVersions.filter((v) => v.subjectId === subject.id).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
    const previous = versions.length > 1 && versions.at(-1)?.id === subject.currentVersionId ? versions.at(-2)?.definition ?? null : null;
    setEditor({ week: suggestedWeek(summary.sessions, definition, previous), topic: "", minutes: 60,
      cloIds: [], activity: "", learningCheck: "", resources: "", status: "draft" });
  }
  function exportPlan() {
    if (!plan) return;
    const url = URL.createObjectURL(new Blob([teachingPlanMarkdown(subject, plan, clos)], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = subject.id + "-teaching-plan.md"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const all = [...summary.sessions, ...summary.samples];
  const filtered = all.filter((s) => (filter === "all" || s.status === filter) && (week === "all" || String(s.week) === week));
  const own = filtered.filter((s) => !s.sample), samples = filtered.filter((s) => s.sample);
  const weeks = [...new Set(all.map((s) => s.week))].sort((a, b) => a - b);
  const cardProps = { subject, clos, mayEdit, editorOpen, deleting, deckFor, priorPack, priorLabel: priorVersion?.id ?? "", currentLabel: subject.currentVersionId, markSrc: state.institution.mark.wide ?? state.institution.mark.png,
    misconceptions: courseMisconceptions(definition), people: state.people, demoLine: definition?.sample ? DEMO_LINE : null,
    onEdit: (session: TeachingSession) => { setEditor({ ...session, cloIds: [...session.cloIds] }); setError(""); setMessage(""); },
    onAskRemove: (id: string | null) => setDeleting(id),
    onRemove: (id: string) => { const result = deleteTeachingSession(subject.id, id); setMessage(result.ok ? "Session removed." : result.error); setDeleting(null); } };
  return (
    <div>
      <div className="section-heading">
        <div><h2>Teaching plan</h2><p className="muted">Save each editor before you leave the course.</p></div>
        <div className="button-row">
          <Button onClick={exportPlan} disabled={!plan} data-demo-id="plan-export"><Download size={15} /> Export plan (.md)</Button>
          {mayEdit ? <Button ref={addButtonRef} variant="primary" disabled={editorOpen} onClick={add} data-demo-id="plan-add"><Plus size={15} /> Add session</Button> : null}
        </div>
      </div>
      <PlanDetails key={subject.id} subjectId={subject.id} plan={plan} mayEdit={mayEdit} />
      <div className="preparation-summary" aria-label="Teaching plan summary">
        <span><strong>{summary.sessions.length}</strong> {summary.sessions.length === 1 ? "session" : "sessions"}</span>
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
      <div className="section-heading"><h3>Session sequence</h3><div className="button-row">
        <label className="inline-field">Show <Select aria-label="Filter sessions" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All sessions</option><option value="draft">Drafts</option><option value="ready">Ready to teach</option><option value="delivered">Delivered</option></Select></label>
        <label className="inline-field">Week <Select aria-label="Week in view" data-demo-id="teach-week" value={week} onChange={(e) => setWeek(e.target.value)}><option value="all">All weeks</option>{weeks.map((w) => <option key={w} value={String(w)}>Week {w}</option>)}</Select></label>
      </div></div>
      {/* Session cards by week (plan Section 5.3; depth plan Section 5.4), the lecturer's own first, then the term's sample sessions. */}
      {own.length ? <ol className="session-cards">{own.map((session) => <SessionCard key={session.id} {...cardProps} session={session} />)}</ol>
        : samples.length && filter === "all" && week === "all" ? <p className="muted">None of your own yet. Add a session; the sample sessions below are written for the prototype.</p> : null}
      {samples.length ? <section className="sample-sessions" aria-labelledby="sample-sessions" data-demo-id="sample-sessions">
        <div className="section-heading"><h3 id="sample-sessions">Sample sessions for the term</h3><Tag tone="warn">Sample, synthetic</Tag></div>
        <p className="muted">{DEMO_LINE} Four weeks carry full slides; the others are outline packs built from the course record.</p>
        <ol className="session-cards">{samples.map((session) => <SessionCard key={session.id} {...cardProps} session={session} />)}</ol>
      </section> : null}
      {!filtered.length ? <div className="workspace-panel"><h3>{all.length ? "No sessions match this filter" : "Build your first teaching session"}</h3><p>{all.length ? "Choose All sessions to see the rest of your plan." : "Start with the next class you need to teach. You can save a topic as a draft, then return to add its activity, CLO links and materials."}</p>{!editor && mayEdit && !all.length ? <Button onClick={add}>Add the first session</Button> : null}</div> : null}
    </div>
  );
}

/** One session's card (depth plan Section 5.4): the week, the topic and its status, a thumbnail of the pack, the outcomes, the
 *  activity and the check, the pack with its filmstrip, and the lab sheet or the project brief where the session has one. */
function SessionCard({ session, subject, clos, mayEdit, editorOpen, deleting, deckFor, priorPack, priorLabel, currentLabel, markSrc, misconceptions, people, demoLine, onEdit, onAskRemove, onRemove }: {
  session: TeachingSession; subject: Subject; clos: AppState["clos"]; mayEdit: boolean; editorOpen: boolean; deleting: string | null; markSrc: string;
  misconceptions: string[]; people: Person[]; demoLine: string | null;
  deckFor: (session: TeachingSession) => DeckSpec; priorPack: (session: TeachingSession) => DeckSpec | null; priorLabel: string; currentLabel: string; onEdit: (session: TeachingSession) => void; onAskRemove: (id: string | null) => void; onRemove: (id: string) => void;
}) {
  const spec = deckFor(session);
  const prior = priorPack(session), changes = prior ? deckDiff(prior, spec) : [];
  const kind = session.slidesBy === "prism" && session.slides?.length ? "Slides drafted by Prism" : session.slides?.length ? "Full slides" : session.sample ? "Outline pack" : null;
  const file = (suffix: string) => subject.id + "-week-" + session.week + "-" + suffix + ".md";
  return <li><article className={"session-card teaching-session" + (session.sample ? " is-sample" : "")} data-demo-id={"session-" + session.id}>
    <div className="session-card-head"><span className="session-week"><span className="eyebrow">Week</span><strong className="tabular">{session.week}</strong></span>
      <div className="session-card-title"><h3>{session.topic}</h3><span className="muted">{session.minutes} minutes</span></div>
      <Tag tone={session.needsReview ? "warn" : session.status === "draft" ? "neutral" : "ok"}>{session.needsReview ? "Review course change" : session.status === "ready" ? "Ready to teach" : session.status === "delivered" ? "Delivered" : "Draft"}</Tag></div>
    {session.needsReview ? <p className="limitation">The course changed. Review this session and its outcome links before reuse.</p> : null}
    <div className="session-card-body">
      <DeckThumb spec={spec} markSrc={markSrc} />
      <div>
        <div className="session-outcomes" aria-label="Linked outcomes">{kind ? <Tag>{kind}</Tag> : null}{session.cloIds.length ? session.cloIds.map(id => { const clo = clos.find(c => c.id === id); return <Tag key={id} tone={clo ? "accent" : "warn"}>{clo ? clo.label ?? clo.id : id + " (removed)"}</Tag>; }) : <span className="muted">No outcome linked yet</span>}</div>
        <div className="session-content"><div><h4>Learning activity</h4><p className="preserve-lines">{session.activity || "Add an activity students will take part in."}</p></div><div><h4>Check for understanding</h4><p className="preserve-lines">{session.learningCheck || "Add how you will check their learning."}</p></div></div>
      </div>
    </div>
    <SessionItems subject={subject} session={session} labels={(id) => clos.find((c) => c.id === id)?.label ?? id} misconceptions={misconceptions} mayEdit={mayEdit} people={people} demoLine={demoLine} />
    {session.resources ? <details><summary>Resources & slide brief</summary><p className="preserve-lines">{session.resources}</p></details> : null}
    <Disclosure summary="Preview the pack" count={spec.slides.length + " slides"} data-demo-id={"session-preview-" + session.id}><DeckFilmstrip spec={spec} markSrc={markSrc} /></Disclosure>
    {prior && changes.length ? <Disclosure summary={"What changed in this pack since " + priorLabel} count={plural(changes.length, "slide", "slides")} data-demo-id={"session-changes-" + session.id}>
      <SlideDiffList before={prior} after={spec} beforeLabel={"Under " + priorLabel} afterLabel={"Under " + currentLabel} markSrc={markSrc} /></Disclosure> : null}
    <div className="button-row"><Button data-demo-id={"session-slides-" + session.id} aria-label={"Download teaching pack for " + session.topic} onClick={() => void downloadPack(subject.id, spec)}><Download size={15} /> Teaching pack (.pptx)</Button>
      {session.labSheet ? <Button data-demo-id={"session-lab-" + session.id} onClick={() => downloadText(file("lab-sheet"), session.labSheet!)}><Download size={15} /> Lab sheet (.md)</Button> : null}
      {session.projectBrief ? <Button data-demo-id={"session-brief-" + session.id} onClick={() => downloadText(file("project-brief"), session.projectBrief!)}><Download size={15} /> Project brief (.md)</Button> : null}
      <span className="muted">{session.slides?.length && session.sample ? "Sample slides written for this prototype; every slide says so." : session.slidesBy === "prism" && session.slides?.length ? "Teaching slides drafted by Prism, the rest built from the session and the evidence; every slide says the text was drafted by the model." : session.sample ? "An outline pack from the course record; the lecturer's slides are not written yet." : "Editable slides built from this session, the course record and the evidence linked to its outcomes; the generator adds no text of its own."}</span></div>
    {mayEdit && !session.sample ? <PrismSlides subject={subject} session={session} /> : null}
    {mayEdit ? <div className="button-row session-actions">
      {session.sample ? null : <Button disabled={editorOpen} aria-label={"Edit " + session.topic} onClick={() => onEdit(session)}>Edit session</Button>}
      {deleting === session.id ? <><span>Remove this session?</span><Button variant="danger" onClick={() => onRemove(session.id)}>Confirm removal</Button><Button variant="quiet" onClick={() => onAskRemove(null)}>Keep session</Button></>
        : <Button variant="quiet" disabled={editorOpen} aria-label={"Remove " + session.topic} onClick={() => onAskRemove(session.id)}>Remove</Button>}
    </div> : null}
  </article></li>;
}

/** Prism drafts the session's teaching slides with the model in .env; the pack then carries them, and says on every slide that
 *  their text was drafted by the model. The lecturer edits the downloaded pack in PowerPoint, or discards the draft. */
function PrismSlides({ subject, session }: { subject: Subject; session: TeachingSession }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const drafted = session.slidesBy === "prism" && Boolean(session.slides?.length);
  async function draft() {
    const request = sessionSlideRequest(subject.id, session.id);
    if (typeof request === "string") { setMessage(request); return; }
    setBusy(true); setMessage("");
    const r = await fetchModelSlides(request);
    setBusy(false);
    if (!r.ok) { setMessage(r.error); return; }
    const saved = setSessionSlides(subject.id, session.id, r.list);
    if (!saved.ok) setMessage(saved.error);
  }
  return <div className="button-row" data-demo-id={"prism-slides-" + session.id}>
    <Button loading={busy} onClick={() => void draft()} data-demo-id={"prism-slides-draft-" + session.id}>{drafted ? "Draft the slides again" : "Draft slides with Prism"}</Button>
    {drafted ? <Button variant="quiet" onClick={() => setSessionSlides(subject.id, session.id, null)}>Discard Prism's slides</Button> : null}
    <span className="muted">{drafted ? session.slides!.length + " teaching slides drafted by Prism; every slide of the pack says so. Check them in the preview, then edit the pack in PowerPoint." : "Prism writes the teaching slides between the outcomes and the check, from this session and the course record."}</span>
    {message ? <p role="status" className="save-status">{message}</p> : null}
  </div>;
}

/** The course file in one click (depth plan Section 4.4): the record, the rubrics, the decisions and versions and the packs of
 *  the saved sessions, with a manifest of what is present, sample, not yet built and not included. Folio works while it builds. */
function CourseFileExport({ state, subject, definition }: { state: AppState; subject: Subject; definition: CourseDefinition }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function build() {
    setBusy(true); setMessage("");
    try {
      await trackRequest("course-file", subject.id, async () => {
        const institution = state.institution;
        let mark: Uint8Array | null = null;
        if (institution.showMark) try { mark = new Uint8Array(await (await fetch(institution.mark.pngSmall)).arrayBuffer()); } catch { mark = null; }
        const clos = state.clos.filter((c) => c.subjectId === subject.id);
        const report = evidenceReport(subject.id, state.evidenceSources, state.skillMentions, state.skillMappings, clos);
        // Every session's pack with the course's brand; the wide mark fits the slides' corners.
        let wide: string | null = null;
        if (institution.showMark && definition.sample) try {
          const bytes = new Uint8Array(await (await fetch(institution.mark.wide ?? institution.mark.png)).arrayBuffer());
          let binary = ""; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          wide = btoa(binary);
        } catch { wide = null; }
        const sessions = state.teachingPlans.find((p) => p.subjectId === subject.id)?.sessions ?? [];
        const packs: CourseFilePack[] = [];
        for (const session of sessions) {
          const spec = sessionDeck(subject, session, clos, report, state.skillMentions, state.evidenceSources, state.people, nowIso(),
            { definition, brand: brandFor(institution, definition, subject, session.week, wide) });
          // Two sessions can share a week (a sample one and the lecturer's own), so each pack keeps its own name.
          let fileName = session.sample ? spec.fileName.replace("-teaching-pack", "-sample-teaching-pack") : spec.fileName;
          if (packs.some((p) => p.fileName === fileName)) fileName = fileName.replace(".pptx", "-" + session.id + ".pptx");
          packs.push({ fileName, week: session.week, bytes: await deckBytes(spec), sample: Boolean(session.sample), full: Boolean(session.slides?.length) });
        }
        // The latest OBE course report saved for the course, as printed (depth plan Section 8.3).
        const obeReport = state.obeReports.filter((r) => r.subjectId === subject.id).sort((a, b) => a.printedAt.localeCompare(b.printedAt)).at(-1) ?? null;
        const result = await buildCourseFile({ subject, definition, versionId: subject.currentVersionId, rubrics: state.rubrics.filter((r) => r.subjectId === subject.id),
          plos: state.programme.plos ?? [], versions: state.subjectVersions.filter((v) => v.subjectId === subject.id), decisions: state.briefDecisions.filter((d) => d.subjectId === subject.id),
          briefs: state.evidenceBriefs.filter((b) => b.subjectId === subject.id), people: state.people, packs, sessions, institution, mark, demoLine: definition.sample ? DEMO_LINE : null, generatedAt: nowIso(),
          obeReport, cqiNote: obeReport?.cqiNoteId ? state.cqiNotes.find((n) => n.id === obeReport.cqiNoteId) ?? null : null });
        downloadBytes(subject.id + "-course-file.zip", result.bytes);
        const count = (status: string) => result.manifest.filter((m) => m.status === status).length;
        setMessage("Course file downloaded: " + (count("present") + count("sample")) + " items in it, " + count("not yet built") + " not yet built and " + count("not included") + " not included, each named in MANIFEST.md.");
      });
    } catch { setMessage("The course file could not be built. Nothing was downloaded."); } finally { setBusy(false); }
  }
  return <div className="course-file-export">
    <Button onClick={() => void build()} disabled={busy} aria-busy={busy} data-demo-id="course-file-export"><Download size={15} /> Export the course file (.zip)</Button>
    {message ? <p role="status" className="save-status" data-demo-id="course-file-message">{message}</p> : null}
  </div>;
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
