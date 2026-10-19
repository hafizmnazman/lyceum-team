import { useState } from "react";
import { can } from "../../app/roles.ts";
import {
  addEvidenceSource, addSkillMention, nowIso, removeEvidenceSource, removeSkillMention, setEvidenceSourceReviewed, setSkillMapping, type AppState,
} from "../../app/store.ts";
import {
  COVERAGE_STAGES, EVIDENCE_KINDS, KIND_LABEL, REQUIREMENT_LEVELS, STAGE_LABEL, evidenceMarkdown, evidenceReport, locateExcerpt,
  type EvidenceSourceInput, type SkillRow,
} from "../../lib/evidence.ts";
import { downloadText } from "../../lib/download.ts";
import type { CLO, CoverageStage, EvidenceKind, EvidenceSource, MentionRequirement, Person, SkillMention, Subject } from "../../types.ts";
import { Button, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";
import { BarList, ShareBar } from "../primitives/ShareBar.tsx";
import { MeetingBriefPanel, RequirementScan, ResearchRun } from "./EvidenceResearch.tsx";

type Props = { state: AppState; person: Person; subject: Subject };
const pct = (x: number | null) => (x === null ? "Unknown" : Math.round(x * 1000) / 10 + "%");
const emptySource = (): EvidenceSourceInput => ({ kind: "job-posting", title: "", organisation: "", url: "", sourceDate: "", text: "" });

export function EvidencePanel({ state, person, subject }: Props) {
  const mayEdit = can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments });
  const sources = state.evidenceSources.filter((s) => s.subjectId === subject.id);
  const mentions = state.skillMentions.filter((m) => m.subjectId === subject.id);
  const outcomes = state.clos.filter((c) => c.subjectId === subject.id);
  const report = evidenceReport(subject.id, state.evidenceSources, state.skillMentions, state.skillMappings, outcomes);
  const [form, setForm] = useState<EvidenceSourceInput>(emptySource);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const dirty = Boolean(form.title || form.organisation || form.text || form.url || form.sourceDate);
  useUnsavedEditor(dirty);
  const patch = (p: Partial<EvidenceSourceInput>) => setForm((f) => ({ ...f, ...p }));
  const skills = [...new Set(mentions.map((m) => m.skill))];
  const originals = sources.filter((s) => !s.duplicateOf), copies = sources.filter((s) => s.duplicateOf);
  return <div>
    <div className="section-heading"><div><h2>Evidence</h2><p className="muted">Keep the documents behind a course decision beside the course, quoted in their own words.</p></div>
      <Button data-demo-id="evidence-export" onClick={() => downloadText(subject.id + "-evidence-report.md", evidenceMarkdown(subject, report, sources, mentions, outcomes, state.people, nowIso()))}>Export evidence report</Button></div>
    <p className="limitation">Lecturer-supplied documents only; nothing is collected from the web. Counts describe this recorded set, not the labour market, and they never change the course by themselves.</p>

    <ResearchRun state={state} person={person} subject={subject} mayEdit={mayEdit} />
    <RequirementScan state={state} person={person} subject={subject} mayEdit={mayEdit} />
    <section className="workspace-panel" aria-labelledby="observed-requirements" data-demo-id="observed-requirements">
      <h3 id="observed-requirements">Observed requirements</h3>
      <div className="preparation-summary"><span><strong>{report.eligible}</strong> reviewed postings (denominator)</span><span><strong>{report.unreviewed}</strong> unreviewed</span><span><strong>{report.duplicates}</strong> duplicate copies</span><span><strong>{report.contextual}</strong> contextual documents</span><span><strong>{report.organisations}</strong> employers</span></div>
      {report.rows.length ? <BarList caption={"Top requirements: postings quoting the skill out of " + report.eligible + " reviewed, with the 95% Wilson interval as a whisker. Hover a bar for the exact figures."} width={220}
        rows={[...report.rows].sort((a, b) => b.postings - a.postings).slice(0, 8).map((r) => ({ label: r.skill, share: r.share, low: r.interval?.low ?? null, high: r.interval?.high ?? null, note: r.postings + " of " + report.eligible }))} /> : null}
      {report.rows.length ? <div className="table-scroll"><table className="evidence-table">
        <caption className="muted">Share is the postings quoting the skill divided by the reviewed postings. The interval is a 95% Wilson interval; it does not correct how this sample was chosen.</caption>
        <thead><tr><th scope="col">Skill</th><th scope="col">Postings</th><th scope="col">Share</th><th scope="col">95% interval</th><th scope="col">Required / preferred</th><th scope="col">Employers</th><th scope="col">Coverage</th><th scope="col">Target</th><th scope="col">Status</th><th scope="col">Outcomes</th></tr></thead>
        <tbody>{report.rows.map((row) => <MappingRow key={row.key} row={row} eligible={report.eligible} subject={subject} outcomes={outcomes} mayEdit={mayEdit} />)}</tbody>
      </table></div> : <p>No requirement has been quoted yet. Record a source below and quote the exact wording of each requirement you consider.</p>}
      <p className="muted">{report.targetCoverage
        ? "Target coverage index: " + pct(report.targetCoverage.value) + " over " + report.targetCoverage.knownSkills + " skills with a reviewed stage and target; " + pct(report.targetCoverage.unknownWeightShare) + " of the quoted demand weight has an unknown stage or target. " + report.coverageNote
        : report.coverageNote}</p>
      <p className="muted">{report.trendNote}</p>
    </section>

    <MeetingBriefPanel state={state} person={person} subject={subject} mayEdit={mayEdit} />
    <section className="workspace-panel" aria-labelledby="evidence-sources">
      <div className="section-heading"><h3 id="evidence-sources">Sources and receipts</h3><Tag>{sources.length} recorded</Tag></div>
      {mayEdit ? <form className="curriculum-object" aria-label="Record a source" onSubmit={(e) => {
        e.preventDefault();
        const result = addEvidenceSource(subject.id, form);
        if (result.ok) { setForm(emptySource()); setFeedback({ text: "Source recorded. Quote its requirements, then mark the extraction reviewed so it counts.", error: false }); }
        else setFeedback({ text: result.error, error: true });
      }}>
        <h4>Record a source</h4>
        <div className="form-grid">
          <Field label="Evidence type"><Select data-demo-id="evidence-kind" value={form.kind} onChange={(e) => patch({ kind: e.target.value as EvidenceKind })}>{EVIDENCE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</Select></Field>
          <Field label="Title"><Input data-demo-id="evidence-title" maxLength={200} value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Posting or document title" /></Field>
          <Field label="Employer or issuing body"><Input data-demo-id="evidence-organisation" maxLength={200} value={form.organisation} onChange={(e) => patch({ organisation: e.target.value })} /></Field>
          <Field label="Source date, as published" hint="Leave empty if unknown. The recording date is kept separately and never stands in for it."><Input data-demo-id="evidence-date" maxLength={40} value={form.sourceDate} onChange={(e) => patch({ sourceDate: e.target.value })} placeholder="e.g. 2026-09-15" /></Field>
          <Field label="Link (optional)"><Input data-demo-id="evidence-url" value={form.url} onChange={(e) => patch({ url: e.target.value })} placeholder="https://" /></Field>
        </div>
        <Field label="Source text" hint="Paste the text you are permitted to keep. It stays in this browser and is never fetched or sent anywhere."><Textarea data-demo-id="evidence-text" rows={6} value={form.text} onChange={(e) => patch({ text: e.target.value })} /></Field>
        {feedback ? <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "form-error" : "save-status"}>{feedback.text}</p> : null}
        <Button type="submit" variant="primary" data-demo-id="evidence-add">Record source</Button>
      </form> : <p className="muted">Only assigned lecturers and coordinators can record evidence for this course.</p>}
      {originals.map((source) => <SourceCard key={source.id} source={source} copies={copies.filter((c) => c.duplicateOf === source.id)}
        mentions={mentions.filter((m) => m.sourceId === source.id)} skills={skills} mayEdit={mayEdit} />)}
      {copies.length ? <details className="guide-entry"><summary><span>Duplicate copies</span><Tag>{copies.length}</Tag></summary>
        <div className="guide-entry-body"><p className="muted">Each copy matches an earlier source word for word (spacing aside). It counts once, through the original.</p>
          <ul className="source-list">{copies.map((s) => <li key={s.id}><strong>{s.title}</strong><span>Matches {sources.find((o) => o.id === s.duplicateOf)?.title ?? s.duplicateOf} · recorded {s.addedAt}</span>
            {mayEdit ? <Button variant="quiet" aria-label={"Remove duplicate copy " + s.title} onClick={() => removeEvidenceSource(s.id)}>Remove copy</Button> : null}</li>)}</ul></div></details> : null}
    </section>
  </div>;
}

function MappingRow({ row, eligible, subject, outcomes, mayEdit }: { row: SkillRow; eligible: number; subject: Subject; outcomes: CLO[]; mayEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [cloIds, setCloIds] = useState<string[]>(row.mapping?.cloIds ?? []);
  const [stage, setStage] = useState<CoverageStage>(row.stage);
  const [target, setTarget] = useState<CoverageStage>(row.target);
  const [evidence, setEvidence] = useState(row.mapping?.evidence ?? "");
  const [error, setError] = useState("");
  const labelOf = (id: string) => outcomes.find((c) => c.id === id)?.label ?? id;
  const status = row.shortfall === null ? "Not assessed" : row.shortfall ? "Below target" : "At or above target";
  return <>
    <tr>
      <th scope="row">{row.skill}{row.contextualSources ? <span className="muted"> · {row.contextualSources} contextual</span> : null}</th>
      <td className="tabular">{row.postings} of {eligible}</td>
      <td className="tabular share-cell"><ShareBar share={row.share} low={row.interval?.low ?? null} high={row.interval?.high ?? null} width={88} /><span>{pct(row.share)}</span></td>
      <td className="tabular">{row.interval ? pct(row.interval.low) + " to " + pct(row.interval.high) : "Unknown"}</td>
      <td className="tabular">{row.required} / {row.preferred}{row.unclear ? " (" + row.unclear + " unclear)" : ""}</td>
      <td className="tabular">{row.organisations.length}</td>
      <td>{STAGE_LABEL[row.stage]}</td>
      <td>{STAGE_LABEL[row.target]}</td>
      <td><Tag tone={row.shortfall === null ? "neutral" : row.shortfall ? "danger" : "ok"}>{status}</Tag></td>
      <td>{row.mapping?.cloIds.length ? row.mapping.cloIds.map((id) => labelOf(id) + (row.retiredOutcomeIds.includes(id) ? " (retired)" : "")).join(", ") : "Not mapped"}
        {mayEdit ? <div><Button variant="quiet" data-demo-id="mapping-open" aria-expanded={open} aria-label={(open ? "Close mapping for " : "Map ") + row.skill} onClick={() => setOpen(!open)}>{open ? "Close" : row.mapping ? "Edit mapping" : "Map"}</Button></div> : null}</td>
    </tr>
    {open ? <tr><td colSpan={10}>
      <fieldset className="clo-choices"><legend>Outcomes this skill relates to</legend>
        {outcomes.length ? outcomes.map((c) => <label key={c.id}><input type="checkbox" data-demo-id={"mapping-outcome-" + (c.label ?? c.id)} checked={cloIds.includes(c.id)}
          onChange={(e) => setCloIds(e.target.checked ? [...cloIds, c.id] : cloIds.filter((id) => id !== c.id))} /><span>{c.label ?? c.id} · {c.text}</span></label>) : <p className="muted">Record course outcomes in Outcomes & topics first.</p>}
        {cloIds.filter((id) => !outcomes.some((c) => c.id === id)).map((id) => <div key={id} className="button-row"><span className="form-error">Retired outcome: {id}</span><Button onClick={() => setCloIds(cloIds.filter((x) => x !== id))}>Remove link</Button></div>)}
      </fieldset>
      <div className="form-grid">
        <Field label="Documented coverage stage" hint="What the course documents show today. Unknown is the honest default."><Select data-demo-id="mapping-stage" value={stage} onChange={(e) => setStage(e.target.value as CoverageStage)}>{COVERAGE_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</Select></Field>
        <Field label="Target stage for this course"><Select data-demo-id="mapping-target" value={target} onChange={(e) => setTarget(e.target.value as CoverageStage)}>{COVERAGE_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</Select></Field>
      </div>
      <Field label="Course evidence for the stage" hint="Cite the topic, session, assessment or syllabus locator. A mention in a syllabus does not establish practice or assessment."><Textarea data-demo-id="mapping-evidence" value={evidence} onChange={(e) => setEvidence(e.target.value)} /></Field>
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <div className="button-row"><Button variant="primary" data-demo-id="mapping-save" onClick={() => {
        const result = setSkillMapping(subject.id, { skill: row.skill, cloIds, stage, target, evidence });
        if (result.ok) { setError(""); setOpen(false); } else setError(result.error);
      }}>Save mapping</Button><Button onClick={() => setOpen(false)}>Cancel</Button></div>
    </td></tr> : null}
  </>;
}

function SourceCard({ source, copies, mentions, skills, mayEdit }: { source: EvidenceSource; copies: EvidenceSource[]; mentions: SkillMention[]; skills: string[]; mayEdit: boolean }) {
  const [skill, setSkill] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [requirement, setRequirement] = useState<MentionRequirement>("required");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const listId = "skills-" + source.id;
  const posting = source.kind === "job-posting";
  return <article className="curriculum-object" data-demo-id="evidence-source">
    <div className="section-heading"><div><h4>{source.title}</h4><p className="muted">{source.organisation || "Organisation not named"} · {KIND_LABEL[source.kind]} · {source.sourceDate ? "published " + source.sourceDate : "publication date not supplied"}</p></div>
      <div className="button-row">{posting ? <Tag tone={source.reviewed ? "ok" : "warn"}>{source.reviewed ? "Reviewed, counted" : "Unreviewed, not counted"}</Tag> : <Tag>Contextual, not a posting</Tag>}<Tag>{source.provenance === "collected" ? "Collected" : "Lecturer-supplied"}</Tag>{copies.length ? <Tag>{copies.length} duplicate copies</Tag> : null}</div></div>
    <dl className="context-list">
      <div><dt>Link</dt><dd>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a> : "Not supplied"}</dd></div>
      <div><dt>Recorded</dt><dd>{source.addedAt} · {source.collection ? source.collection.label + " · retrieved " + source.collection.retrievedAt : "lecturer-supplied"}</dd></div>
      <div><dt>Text fingerprint</dt><dd className="tabular">{source.textHash}</dd></div>
    </dl>
    <details><summary>Source text ({source.text.length} characters)</summary><div className="evidence-text">{source.text}</div></details>
    <h5>Quoted requirements</h5>
    {mentions.length ? <ul className="mention-list">{mentions.map((m) => {
      const located = locateExcerpt(source.text, m.excerpt);
      return <li key={m.id}><div className="button-row"><strong>{m.skill}</strong><Tag tone={m.requirement === "required" ? "accent" : "neutral"}>{m.requirement}</Tag>
        <Tag tone={located.ok ? "ok" : "danger"}>{located.ok ? (located.match === "exact" ? "Verified in source" : "Verified, spacing differs") : "Not in source"}</Tag>
        {mayEdit ? <Button variant="quiet" aria-label={"Remove quotation for " + m.skill} onClick={() => removeSkillMention(m.id)}>Remove</Button> : null}</div>
        <blockquote>{m.excerpt}</blockquote></li>;
    })}</ul> : <p className="muted">No requirement quoted from this source yet.</p>}
    {mayEdit ? <>
      <div className="form-grid">
        <Field label="Skill or requirement"><Input list={listId} data-demo-id="mention-skill" maxLength={120} value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Cash-flow forecasting" /></Field>
        <Field label="Requirement level"><Select data-demo-id="mention-requirement" value={requirement} onChange={(e) => setRequirement(e.target.value as MentionRequirement)}>{REQUIREMENT_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
      </div>
      <datalist id={listId}>{skills.map((s) => <option key={s} value={s} />)}</datalist>
      <Field label="Exact excerpt from the source" hint="Copy the words as they appear. A paraphrase is rejected; only spacing may differ."><Textarea data-demo-id="mention-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></Field>
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <div className="button-row"><Button data-demo-id="mention-add" onClick={() => {
        const result = addSkillMention(source.id, { skill, excerpt, requirement });
        if (result.ok) { setSkill(""); setExcerpt(""); setError(""); } else setError(result.error);
      }}>Add quoted requirement</Button>
        {posting ? <label className="checkbox-line"><input type="checkbox" data-demo-id="source-reviewed" checked={source.reviewed} onChange={(e) => setEvidenceSourceReviewed(source.id, e.target.checked)} />Extraction reviewed: every requirement in this posting is quoted or deliberately skipped</label> : null}
      </div>
      {removing ? <div className="button-row"><span>Remove {source.title} and its quotations?</span><Button variant="danger" onClick={() => removeEvidenceSource(source.id)}>Confirm removal</Button><Button onClick={() => setRemoving(false)}>Keep source</Button></div>
        : <Button variant="quiet" aria-label={"Remove source " + source.title} onClick={() => setRemoving(true)}>Remove source</Button>}
    </> : null}
  </article>;
}
