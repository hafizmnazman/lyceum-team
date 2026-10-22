import { useRef, useState, type InputHTMLAttributes } from "react";
import { can } from "../../app/roles.ts";
import { adoptCurriculumRevision, checkCurriculumRevision, definitionForCourse, discardCurriculumRevision,
  saveCurriculumRevision, startCurriculumRevision, type AppState } from "../../app/store.ts";
import { BLOOM_LEVELS, curriculumChanges, curriculumImpact, curriculumMarkdown, validateCourseDefinition } from "../../lib/curriculum.ts";
import { downloadText } from "../../lib/download.ts";
import type { BloomLevel, CourseDefinition, CourseOutcome, CourseTopic, CurriculumDraft, Person, Subject } from "../../types.ts";
import { Button, Disclosure, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";
import { DecisionCard, Meter } from "../primitives/loop.tsx";
import { briefDecisionState } from "../../lib/decisions.ts";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";

type Props = { state: AppState; person: Person; subject: Subject };
const list = (text: string) => [...new Set(text.split(",").map(s => s.trim()).filter(Boolean))];
function CommaListInput({ values, onValuesChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { values: string[]; onValuesChange: (values: string[]) => void }) {
  const [raw,setRaw] = useState(() => values.join(", "));
  return <Input {...props} value={raw} onChange={e => { setRaw(e.target.value); onValuesChange(list(e.target.value)); }} />;
}
const optionalNumber = (text: string) => text === "" ? null : Number(text);

export function CurriculumPanel({ state, person, subject }: Props) {
  const current = definitionForCourse(subject.id)!;
  const draft = state.curriculumDrafts.find(d => d.subjectId === subject.id && d.status === "drafting");
  const mayEdit = can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments });
  const [error, setError] = useState("");
  const baseline = draft && state.subjectVersions.find(v => v.id === draft.baselineVersionId)?.definition || current;
  return <div>
    <div className="section-heading"><div><h2>Outcomes & topics</h2><p className="muted">Keep your course outcomes, topic outline and teaching constraints together.</p></div>
      <Button onClick={() => downloadText(subject.id + "-course-outline.md", curriculumMarkdown(subject, current, subject.currentVersionId))}>Export current outline</Button>
    </div>
    <p className="limitation">This is your local preparation workspace. University syllabus approval continues through your existing process.</p>
    {draft ? <RevisionEditor key={draft.id + "-" + draft.revision} {...{ state, person, subject, draft, baseline, mayEdit }} /> :
      <section className="workspace-panel">
        <div className="section-heading"><h3>Current course outline</h3><Tag>{subject.currentVersionId}</Tag></div>
        <DefinitionSummary definition={current} />
        {error ? <p role="alert" className="form-error">{error}</p> : null}
        {mayEdit ? <Button variant="primary" data-demo-id="curriculum-start" onClick={() => {
          const result = startCurriculumRevision(subject.id); if (!result.ok) setError(result.error);
        }}>Start course revision</Button> : <p className="muted">Only assigned lecturers and coordinators can edit this course.</p>}
      </section>}
  </div>;
}

/** Outlined hours against the budgets, as meters; an unknown budget is said in words, never guessed. */
function HoursMeters({ definition }: { definition: CourseDefinition }) {
  const contact = definition.topics.reduce((n,t) => n + t.contactHours, 0), self = definition.topics.reduce((n,t) => n + t.selfStudyHours, 0);
  const meter = (label: string, value: number, budget: number | null) => budget !== null
    ? <Meter value={value} max={budget} over={value > budget} label={<><strong className="tabular">{value}</strong> of <span className="tabular">{budget}</span> {label} hours outlined</>} note={value > budget ? "Over the budget: the check blocks this version." : undefined} />
    : <p className="muted"><span className="tabular">{value}</span> {label} hours outlined; the {label}-hour budget is not supplied.</p>;
  return <div className="hours-meters" data-demo-id="hours-meters">{meter("contact", contact, definition.brief.contactHours)}{meter("self-study", self, definition.brief.selfStudyHours)}</div>;
}

function DefinitionSummary({ definition }: { definition: CourseDefinition }) {
  return <div>
    <dl className="context-list"><div><dt>Programme</dt><dd>{definition.brief.programmeTitle || "Not supplied"}</dd></div>
      <div><dt>Contact hours</dt><dd>{definition.topics.reduce((n,t) => n + t.contactHours, 0)} outlined · budget {definition.brief.contactHours ?? "not supplied"}</dd></div>
      <div><dt>Self-study hours</dt><dd>{definition.topics.reduce((n,t) => n + t.selfStudyHours, 0)} outlined · budget {definition.brief.selfStudyHours ?? "not supplied"}</dd></div></dl>
    <HoursMeters definition={definition} />
    <h4>Course learning outcomes</h4>
    {definition.outcomes.length ? <ol className="outcome-list">{definition.outcomes.map(c => <li key={c.id}><strong>{c.label}</strong> · {c.bloomLevel}<p>{c.text}</p>
      <p className="muted">Achievement: {c.assessmentEvidence || "Not recorded"}</p></li>)}</ol> : <p>Add your course learning outcomes to begin.</p>}
    <h4>Topic sequence</h4>
    {definition.topics.length ? <ol className="journey-list">{definition.topics.map(t => <li key={t.id}><strong>{t.title}</strong> · {t.contactHours} contact h · {t.selfStudyHours} self-study h · week {t.week ?? "not set"}</li>)}</ol> : <p>No topic outline is recorded yet.</p>}
  </div>;
}

function RevisionEditor({ state, subject, draft, baseline, mayEdit }: Props & {
  draft: CurriculumDraft; baseline: CourseDefinition; mayEdit: boolean;
}) {
  const [definition, setDefinition] = useState<CourseDefinition>(() => structuredClone(draft.definition));
  const [reason, setReason] = useState(draft.reason);
  const [term, setTerm] = useState(draft.effectiveTerm);
  const [acknowledgement, setAcknowledgement] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [discardNote, setDiscardNote] = useState("");
  const alertRef = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(definition) !== JSON.stringify(draft.definition) || reason !== draft.reason || term !== draft.effectiveTerm;
  useUnsavedEditor(dirty);
  const issues = validateCourseDefinition(definition, subject.id, baseline);
  const changes = curriculumChanges(baseline, definition);
  const impact = curriculumImpact(baseline, definition, state.teachingPlans.find(p => p.subjectId === subject.id), state.testDrafts.filter(t => t.subjectId === subject.id));
  const stale = subject.currentVersionId !== draft.baselineVersionId;
  const patchBrief = (patch: Partial<CourseDefinition["brief"]>) => setDefinition(d => ({ ...d, brief: { ...d.brief, ...patch } }));
  const patchOutcome = (id: string, patch: Partial<CourseOutcome>) => setDefinition(d => ({ ...d, outcomes: d.outcomes.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const patchTopic = (id: string, patch: Partial<CourseTopic>) => setDefinition(d => ({ ...d, topics: d.topics.map(t => t.id === id ? { ...t, ...patch } : t) }));
  const resultMessage = (result: { ok: boolean; error?: string }, success: string) => {
    setFeedback(result.ok ? success : result.error ?? "This action could not be completed.");
    if (!result.ok) requestAnimationFrame(() => alertRef.current?.focus());
  };
  const addOutcome = () => {
    let n = 1; while (definition.outcomes.some(c => c.label === "CLO" + n)) n++;
    const id = subject.id + "-outcome-" + crypto.randomUUID();
    setDefinition(d => ({ ...d, outcomes: [...d.outcomes, { id, subjectId: subject.id, label: "CLO" + n,
      text: "", bloomLevel: "Apply", assessmentEvidence: "", ploIds: [] }] }));
    requestAnimationFrame(() => document.getElementById("outcome-text-" + id)?.focus());
  };
  const addTopic = () => {
    const id = subject.id + "-topic-" + crypto.randomUUID();
    setDefinition(d => ({ ...d, topics: [...d.topics, { id, title: "", week: null, contactHours: 0, selfStudyHours: 0,
      cloIds: [], prerequisiteTopicIds: [], protected: false, resources: "" }] }));
    requestAnimationFrame(() => document.getElementById("topic-title-" + id)?.focus());
  };
  const move = (id: string, direction: number) => setDefinition(d => {
    const topics = [...d.topics], at = topics.findIndex(t => t.id === id), next = at + direction;
    if (next < 0 || next >= topics.length) return d;
    [topics[at],topics[next]] = [topics[next],topics[at]]; return { ...d, topics };
  });
  const errors = issues.filter(i => i.severity === "error").length, warnings = issues.length - errors;
  return <div>
    <div className="revision-toolbar"><span><strong>Candidate revision {draft.revision}</strong> · based on {draft.baselineVersionId}</span>
      <Tag tone={dirty || draft.checkedRevision !== draft.revision ? "warn" : "ok"}>{dirty ? "Unsaved edits" : draft.checkedRevision === draft.revision ? "Constraints checked" : "Saved draft"}</Tag></div>
    <section className="workspace-panel revision-summary" aria-label="Hours, changes and checks">
      <HoursMeters definition={definition} />
      <p className="revision-status"><strong className="tabular">{changes.length}</strong> {changes.length === 1 ? "change" : "changes"} against {draft.baselineVersionId} · {errors ? errors + " to fix" : "nothing to fix"} · {warnings ? warnings + " to review" : "nothing to review"} · {dirty ? "save, then check" : draft.checkedRevision === draft.revision ? "checked, ready for your decision below" : "saved, check it next"}</p>
    </section>
    {stale ? <p role="alert" className="form-error">The active course version changed. Export this candidate, discard it and start from the current version.</p> : null}
    {feedback ? <div role="status" tabIndex={-1} ref={alertRef} className="save-status">{feedback}</div> : null}
    <fieldset disabled={!mayEdit || stale} className="curriculum-fields">
      <section className="workspace-panel"><h3>Course brief</h3>
        <Field label="Course title"><Input value={definition.title} maxLength={200} data-demo-id="curriculum-title" onChange={e => setDefinition({ ...definition, title: e.target.value })} /></Field>
        <div className="form-grid">
          <Field label="Programme"><Input value={definition.brief.programmeTitle} onChange={e => patchBrief({ programmeTitle: e.target.value })} /></Field>
          <Field label="Student level"><Input value={definition.brief.level} placeholder="e.g. Year 2 undergraduate" onChange={e => patchBrief({ level: e.target.value })} /></Field>
          <Field label="Teaching language"><Input value={definition.brief.language} onChange={e => patchBrief({ language: e.target.value })} /></Field>
          <Field label="Credits"><Input type="number" min={0.1} max={100} step="any" value={definition.brief.credits ?? ""} onChange={e => patchBrief({ credits: optionalNumber(e.target.value) })} /></Field>
          <Field label="Teaching weeks"><Input type="number" min={1} max={52} value={definition.brief.teachingWeeks ?? ""} onChange={e => patchBrief({ teachingWeeks: optionalNumber(e.target.value) })} /></Field>
          <Field label="Contact-hour budget" hint="Leave blank if it has not been confirmed."><Input type="number" min={0.1} step="any" value={definition.brief.contactHours ?? ""} data-demo-id="curriculum-contact-budget" onChange={e => patchBrief({ contactHours: optionalNumber(e.target.value) })} /></Field>
          <Field label="Self-study-hour budget"><Input type="number" min={0.1} step="any" value={definition.brief.selfStudyHours ?? ""} onChange={e => patchBrief({ selfStudyHours: optionalNumber(e.target.value) })} /></Field>
          <Field label="Framework or standard"><Input value={definition.brief.framework} placeholder="Institution-supplied framework/version" onChange={e => patchBrief({ framework: e.target.value })} /></Field>
        </div>
        <Field label="Programme outcome labels" hint="Comma-separated labels, for example PLO1, PLO2. The institution defines their meaning."><CommaListInput values={definition.brief.programmeOutcomes} onValuesChange={values => patchBrief({ programmeOutcomes: values })} /></Field>
        <Field label="Relevant roles or professional context"><Input value={definition.brief.targetRoles} onChange={e => patchBrief({ targetRoles: e.target.value })} /></Field>
        <Field label="Foundations, requirements and lecturer notes"><Textarea value={definition.brief.notes} onChange={e => patchBrief({ notes: e.target.value })} /></Field>
      </section>
      <section className="workspace-panel"><div className="section-heading"><h3>Course learning outcomes</h3><Button disabled={definition.outcomes.length >= 100} data-demo-id="curriculum-add-outcome" onClick={addOutcome}>Add outcome</Button></div>
        <p className="muted">Describe what students will do, in what context, and how achievement can be demonstrated.</p>
        {!definition.outcomes.length ? <p>No outcomes yet. Add the first outcome; you can save an incomplete draft.</p> : null}
        {definition.outcomes.map(c => <article className="curriculum-object" key={c.id}>
          <div className="form-grid"><Field label="Outcome label"><Input value={c.label} onChange={e => patchOutcome(c.id, { label: e.target.value })} /></Field>
            <Field label={"Bloom level for " + c.label}><Select value={c.bloomLevel} onChange={e => patchOutcome(c.id, { bloomLevel: e.target.value as BloomLevel })}>{BLOOM_LEVELS.map(b => <option key={b}>{b}</option>)}</Select></Field></div>
          <Field label={c.label + " wording"}><Textarea id={"outcome-text-" + c.id} data-demo-id="curriculum-outcome-text" value={c.text} onChange={e => patchOutcome(c.id, { text: e.target.value })} /></Field>
          <Field label={c.label + " achievement evidence"} hint="An assessment task, rubric criterion or observable demonstration."><Textarea value={c.assessmentEvidence} onChange={e => patchOutcome(c.id, { assessmentEvidence: e.target.value })} /></Field>
          <Field label={c.label + " programme mappings"} hint="Use the programme outcome labels recorded above."><CommaListInput values={c.ploIds} onValuesChange={values => patchOutcome(c.id, { ploIds: values })} /></Field>
          {removing === c.id ? <div className="button-row"><span>Remove {c.label}? Topic links will need review.</span><Button variant="danger" onClick={() => { setDefinition(d => ({ ...d, outcomes: d.outcomes.filter(o => o.id !== c.id) })); setRemoving(null); }}>Confirm outcome removal</Button><Button onClick={() => setRemoving(null)}>Keep outcome</Button></div>
            : <Button variant="quiet" aria-label={"Remove " + c.label} onClick={() => setRemoving(c.id)}>Remove outcome</Button>}
        </article>)}
      </section>
      <section className="workspace-panel"><div className="section-heading"><h3>Topic sequence</h3><Button disabled={definition.topics.length >= 300} data-demo-id="curriculum-add-topic" onClick={addTopic}>Add topic</Button></div>
        <p className="muted">Declare time and dependencies. Adding a topic does not expand the available budget.</p>
        {!definition.topics.length ? <p>No topics recorded yet. Add your current outline before evaluating coverage.</p> : null}
        {definition.topics.map((t, index) => <article className="curriculum-object" key={t.id}>
          <div className="section-heading"><h4>Topic {index + 1}</h4><div className="button-row"><Button aria-label={"Move " + (t.title || "topic") + " earlier"} disabled={index === 0} onClick={() => move(t.id,-1)}>Move up</Button><Button aria-label={"Move " + (t.title || "topic") + " later"} disabled={index === definition.topics.length - 1} onClick={() => move(t.id,1)}>Move down</Button></div></div>
          <Field label={"Topic " + (index + 1) + " title"}><Input id={"topic-title-" + t.id} data-demo-id="curriculum-topic-title" value={t.title} onChange={e => patchTopic(t.id, { title: e.target.value })} /></Field>
          <div className="form-grid"><Field label="Week (optional)"><Input type="number" min={1} max={52} value={t.week ?? ""} onChange={e => patchTopic(t.id, { week: optionalNumber(e.target.value) })} /></Field>
            <Field label="Contact hours"><Input type="number" min={0} step="any" data-demo-id="curriculum-topic-hours" value={t.contactHours} onChange={e => patchTopic(t.id, { contactHours: Number(e.target.value) })} /></Field>
            <Field label="Self-study hours"><Input type="number" min={0} step="any" value={t.selfStudyHours} onChange={e => patchTopic(t.id, { selfStudyHours: Number(e.target.value) })} /></Field></div>
          <fieldset className="clo-choices"><legend>Outcomes supported by this topic</legend>{definition.outcomes.map(c => <label key={c.id}><input type="checkbox" checked={t.cloIds.includes(c.id)} data-demo-id={"topic-outcome-" + c.label} onChange={e => patchTopic(t.id, { cloIds: e.target.checked ? [...t.cloIds,c.id] : t.cloIds.filter(id => id !== c.id) })} /><span>{c.label} · {c.text || "Wording to add"}</span></label>)}
            {t.cloIds.filter(id => !definition.outcomes.some(c => c.id === id)).map(id => <div key={id} className="button-row"><span className="form-error">Removed outcome: {id}</span><Button onClick={() => patchTopic(t.id, { cloIds: t.cloIds.filter(x => x !== id) })}>Remove broken link</Button></div>)}</fieldset>
          <fieldset className="clo-choices"><legend>Prerequisite topics</legend>{definition.topics.filter(p => p.id !== t.id).map(p => <label key={p.id}><input type="checkbox" checked={t.prerequisiteTopicIds.includes(p.id)} onChange={e => patchTopic(t.id, { prerequisiteTopicIds: e.target.checked ? [...t.prerequisiteTopicIds,p.id] : t.prerequisiteTopicIds.filter(id => id !== p.id) })} /><span>{p.title || "Untitled topic"}</span></label>)}
            {t.prerequisiteTopicIds.filter(id => !definition.topics.some(p => p.id === id)).map(id => <div key={id} className="button-row"><span className="form-error">Removed prerequisite: {id}</span><Button onClick={() => patchTopic(t.id, { prerequisiteTopicIds: t.prerequisiteTopicIds.filter(x => x !== id) })}>Remove broken dependency</Button></div>)}</fieldset>
          <label className="checkbox-line"><input type="checkbox" checked={t.protected} disabled={baseline.topics.some(b => b.id === t.id && b.protected)} onChange={e => patchTopic(t.id, { protected: e.target.checked })} />Protect this foundational or mandatory topic from removal</label>
          <Field label="References and resources"><Textarea value={t.resources} onChange={e => patchTopic(t.id, { resources: e.target.value })} /></Field>
          {removing === t.id ? <div className="button-row"><span>Remove {t.title || "this topic"}?</span><Button variant="danger" onClick={() => { setDefinition(d => ({ ...d, topics: d.topics.filter(x => x.id !== t.id) })); setRemoving(null); }}>Confirm topic removal</Button><Button onClick={() => setRemoving(null)}>Keep topic</Button></div>
            : <Button variant="quiet" disabled={baseline.topics.some(b => b.id === t.id && b.protected)} aria-label={"Remove topic " + (t.title || String(index + 1))} onClick={() => setRemoving(t.id)}>Remove topic</Button>}
        </article>)}
      </section>
      <section className="workspace-panel"><h3>Decision context</h3>
        <Field label="Why make this revision?"><Textarea data-demo-id="curriculum-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Record the evidence, educational reason and trade-offs you considered." /></Field>
        <Field label="Teaching term for this version"><Input data-demo-id="curriculum-term" value={term} onChange={e => setTerm(e.target.value)} placeholder="e.g. 2026/2027 semester 1" /></Field>
        <div className="button-row"><Button variant="primary" data-demo-id="curriculum-save" disabled={!dirty} onClick={() => resultMessage(saveCurriculumRevision(draft.id,draft.revision,{ definition,reason,effectiveTerm:term }),"Revision saved.")}>Save revision</Button>
          <Button data-demo-id="curriculum-check" disabled={dirty} onClick={() => resultMessage(checkCurriculumRevision(draft.id,draft.revision),"Configured constraints checked. Review warnings before deciding.")}>Check saved revision</Button>
          <Button onClick={() => downloadText(subject.id + "-candidate-outline.md",curriculumMarkdown(subject,definition,draft.baselineVersionId,{ ...draft,definition,reason,effectiveTerm:term }))}>Export candidate</Button></div>
        {dirty ? <p className="muted">Save your edits before checking or using this revision.</p> : null}
      </section>
    </fieldset>
    <section className="workspace-panel" aria-labelledby="revision-checks"><h3 id="revision-checks">Constraints and review points</h3>
      <div className="preparation-summary"><span><strong>{definition.topics.reduce((n,t) => n + t.contactHours,0)}</strong> contact hours</span><span><strong>{definition.topics.reduce((n,t) => n + t.selfStudyHours,0)}</strong> self-study hours</span><span><strong>{changes.length}</strong> changes</span></div>
      {issues.length ? <ul className="revision-issues">{issues.map((i,n) => <li key={n}><Tag tone={i.severity === "error" ? "danger" : "warn"}>{i.severity === "error" ? "Fix" : "Review"}</Tag><span>{i.message}</span></li>)}</ul> : <p>No configured constraint issues found. The lecturer still reviews educational quality.</p>}
      <Disclosure summary={impact.sessions.length + " teaching sessions and " + impact.assessments.length + " assessments will be flagged for review"}>
        {impact.sessions.length || impact.assessments.length ? <ul className="impact-list">
          {impact.sessions.map(s => <li key={s.id}>Week {s.week}: {s.topic}</li>)}
          {impact.assessments.map(a => <li key={a.id}>Assessment {a.id}, {a.items.length} template items</li>)}
        </ul> : <p className="muted">No saved session or assessment depends on what changed.</p>}
        <p className="muted">Existing work is retained; each flagged item asks for your review before reuse.</p>
      </Disclosure>
    </section>
    <section className="workspace-panel"><h3>Before and after</h3>{changes.length ? <div className="revision-diff">{changes.map((c,i) => <article key={i}><div className="button-row"><Tag>{c.kind}</Tag><strong>{c.area}: {c.label}</strong></div>
      <div className="session-content"><div><h4>Current version</h4><p className="preserve-lines">{c.before || "Not present"}</p></div><div><h4>Candidate</h4><p className="preserve-lines">{c.after || "Removed"}</p></div></div></article>)}</div> : <p>The candidate matches the current course. Make a change to compare it here.</p>}</section>
    {mayEdit && !stale ? <section className="workspace-panel"><h3>Lecturer decision</h3>
      <label className="checkbox-line"><input type="checkbox" data-demo-id="curriculum-ack" checked={acknowledgement} onChange={e => setAcknowledgement(e.target.checked)} />I reviewed the changes, warnings and affected teaching work. This saves my local course version; institutional approval remains in the university's process.</label>
      <div className="button-row"><Button variant="primary" data-demo-id="curriculum-adopt" disabled={dirty || draft.checkedRevision !== draft.revision || !acknowledgement} onClick={() => resultMessage(adoptCurriculumRevision(draft.id,draft.revision,acknowledgement),"New course version saved.")}>Use as my course version</Button><Button onClick={() => setDiscarding(true)}>Discard revision</Button></div>
    </section> : null}
    {stale && mayEdit ? <Button onClick={() => setDiscarding(true)}>Discard outdated revision</Button> : null}
    {discarding ? <section className="workspace-panel"><h3>Discard this candidate?</h3><p>Your current course and saved version history will be kept.</p><Field label="Reason for discarding"><Textarea value={discardNote} onChange={e => setDiscardNote(e.target.value)} /></Field>
      <div className="button-row"><Button variant="danger" onClick={() => resultMessage(discardCurriculumRevision(draft.id,draft.revision,discardNote),"Revision discarded.")}>Confirm discard</Button><Button onClick={() => setDiscarding(false)}>Keep working</Button></div></section> : null}
  </div>;
}

/** History (plan Section 5.3): the course versions and the decisions on briefs on one timeline, newest
 *  first; each entry opens to its outline or its reason, and exports sit inside the entry. */
export function CurriculumHistoryPanel({ state, subject }: { state: AppState; subject: Subject }) {
  const versions = state.subjectVersions.filter(v => v.subjectId === subject.id);
  const revisions = [...state.curriculumDrafts].filter(d => d.subjectId === subject.id).reverse();
  const decisions = state.briefDecisions.filter(d => d.subjectId === subject.id);
  const name = (id: string) => state.people.find(p => p.id === id)?.name ?? id;
  // Newest first. At one moment (the pinned demo clock) the event log's order decides; without an event, a version
  // sits above a decision, because the change follows the decision in the loop.
  const seq = new Map<string, number>();
  state.events.forEach((e, i) => { if (e.refs.subjectId !== subject.id) return; if (e.kind === "decision-recorded" && e.refs.decisionId) seq.set(e.refs.decisionId, i); if (e.kind === "version-adopted" && e.refs.versionId) seq.set(e.refs.versionId, i); });
  const entries = [
    ...versions.map((v, i) => ({ at: v.changedAt, order: i, kind: "version" as const, seq: seq.get(v.id), v })),
    ...decisions.map((d, i) => ({ at: d.at, order: i, kind: "decision" as const, seq: seq.get(d.id), d })),
  ].sort((a, b) => b.at.localeCompare(a.at)
    || (a.seq !== undefined && b.seq !== undefined ? b.seq - a.seq : a.kind !== b.kind ? (a.kind === "version" ? -1 : 1) : b.order - a.order));
  return <div>
    <section className="workspace-panel" aria-labelledby="history-title"><h2 id="history-title">Versions and decisions</h2>
      <p className="muted">One timeline, newest first: every local course version and every decision recorded on a brief. Local versions preserve the outline, the reason and the teaching term; they do not attest university approval.</p>
      {entries.length ? <ol className="history-timeline" data-demo-id="history-timeline">{entries.map(e => e.kind === "version"
        ? <li key={"v" + e.v.id} className="history-entry">
          <span className="history-time mono">{e.at.slice(0, 16).replace("T", " ")}</span>
          <div className="history-body">
            <div className="button-row"><Tag tone="accent">Version</Tag><strong className="tabular">{e.v.id}</strong><span className="muted">{e.v.effectiveTerm || "Term not recorded"} · {name(e.v.changedBy)}</span><Tag>{e.v.id === subject.currentVersionId ? "Current" : "Previous"}</Tag></div>
            <p>{e.v.reason}</p>
            <details className="history-open"><summary>Open</summary>
              {e.v.definition ? <><DefinitionSummary definition={e.v.definition} /><Button onClick={() => downloadText(subject.id + "-" + e.v.id + ".md",curriculumMarkdown(subject,e.v.definition!,e.v.id))}>Export this version</Button></> : <ul>{e.v.cloSnapshot.map(c => <li key={c.id}>{c.text}</li>)}</ul>}
            </details>
          </div>
        </li>
        : <li key={"d" + e.d.id} className="history-entry">
          <span className="history-time mono">{e.at.slice(0, 16).replace("T", " ")}</span>
          <div className="history-body">
            <div className="button-row"><Tag tone="ok">Decision</Tag><span className="muted">on the brief of {state.evidenceBriefs.find(b => b.id === e.d.briefId)?.createdAt.slice(0, 10) ?? "an earlier date"}</span></div>
            <DecisionCard decision={e.d} name={name(e.d.byPersonId)} self={!subject.workspaceOnly && state.evidenceBriefs.find(b => b.id === e.d.briefId)?.createdBy === e.d.byPersonId}
              amended={decisions.some((x, i) => i > decisions.indexOf(e.d) && x.briefId === e.d.briefId && x.byPersonId === e.d.byPersonId)}
              superseded={(() => { const brief = state.evidenceBriefs.find(b => b.id === e.d.briefId); return brief ? Boolean(briefDecisionState(brief, state.evidenceBriefs, state.briefDecisions, Boolean(subject.workspaceOnly)).supersededBy) : false; })()} />
          </div>
        </li>)}</ol> : <p>Start a revision to preserve the current baseline and record a version history. Decisions recorded in Decide appear here too.</p>}
    </section>
    <section className="workspace-panel" aria-label="Revision decisions">
      <Disclosure summary="Revision decisions: each revision started, saved, checked, adopted or discarded" count={revisions.length}>
        {revisions.length ? revisions.map(d => <details key={d.id} className="guide-entry"><summary><span>{d.id}</span><Tag>{d.status}</Tag></summary><div className="guide-entry-body"><ol className="journey-list">{d.history.map((e,i) => <li key={i}><strong>{e.action}</strong> · revision {e.revision}<p>{e.note}</p><span className="muted">{name(e.byPersonId)} · {e.at}</span></li>)}</ol></div></details>) : <p>No revision decisions recorded yet.</p>}
      </Disclosure>
    </section>
  </div>;
}
