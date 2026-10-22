// The evidence pieces the Watch and Report steps are built from (plan Sections
// 4 and 5.3). Watch keeps sources: postings collected on request from a
// permitted board or the dated saved sample, and documents the lecturer pastes.
// Report reads them: exact quotations, the reviewed denominator, the counts with
// their intervals, the coverage mapping and the brief. Nothing here changes a
// course by itself.

import { useState } from "react";
import { plural } from "../../app/loop.ts";
import {
  addEvidenceSource, addSkillMention, evidenceTrendNote, nowIso, removeEvidenceSource, removeSkillMention, setEvidenceSourceReviewed, setSkillMapping, type AppState,
} from "../../app/store.ts";
import {
  COVERAGE_STAGES, EVIDENCE_KINDS, KIND_LABEL, REQUIREMENT_LEVELS, STAGE_LABEL, evidenceMarkdown, evidenceReport, locateExcerpt,
  type EvidenceReport, type EvidenceSourceInput, type SkillRow,
} from "../../lib/evidence.ts";
import { downloadText } from "../../lib/download.ts";
import type { CLO, CoverageStage, EvidenceKind, EvidenceSource, MentionRequirement, Person, Subject } from "../../types.ts";
import { Button, Disclosure, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";
import { SkillCard } from "../primitives/loop.tsx";
import { ShareBar } from "../primitives/ShareBar.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";

type Props = { state: AppState; person: Person; subject: Subject; mayEdit: boolean };
const pct = (x: number | null) => (x === null ? "Unknown" : Math.round(x * 1000) / 10 + "%");
const emptySource = (): EvidenceSourceInput => ({ kind: "job-posting", title: "", organisation: "", url: "", sourceDate: "", text: "" });

export function courseReport(state: AppState, subjectId: string): EvidenceReport {
  return evidenceReport(subjectId, state.evidenceSources, state.skillMentions, state.skillMappings, state.clos.filter((c) => c.subjectId === subjectId));
}

// ---------- Watch: the sources ----------

/** A document the lecturer is permitted to keep, pasted in: a posting found elsewhere, a standard or an advisory note. */
export function RecordSourceForm({ subject, mayEdit }: Props) {
  const [form, setForm] = useState<EvidenceSourceInput>(emptySource);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const dirty = Boolean(form.title || form.organisation || form.text || form.url || form.sourceDate);
  useUnsavedEditor(dirty);
  const patch = (p: Partial<EvidenceSourceInput>) => setForm((f) => ({ ...f, ...p }));
  if (!mayEdit) return <p className="muted">Only assigned lecturers and coordinators can record evidence for this course.</p>;
  return <form className="curriculum-object" aria-label="Record a source" onSubmit={(e) => {
    e.preventDefault();
    const result = addEvidenceSource(subject.id, form);
    if (result.ok) { setForm(emptySource()); setFeedback({ text: "Source recorded. Quote its requirements in Report, then mark the extraction reviewed so it counts.", error: false }); }
    else setFeedback({ text: result.error, error: true });
  }}>
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
  </form>;
}

const PROVENANCE_LABEL: Record<EvidenceSource["provenance"], string> = { collected: "Collected on request", "lecturer-supplied": "Lecturer-supplied" };

/** How many of a run's cards show before "Show all": the rest are one press away, never dropped. */
const FIRST_CARDS = 3;

/** The kept sources as cards on a dated timeline: one entry per collection run (or per pasted document).
 *  A run's shared provenance is said once, in its head; a card repeats it only when the run is mixed. */
export function SourceTimeline({ state, subject, mayEdit }: Props) {
  const sources = state.evidenceSources.filter((s) => s.subjectId === subject.id);
  if (!sources.length) return <p className="muted">No source kept yet. Fetch postings above, or paste a document you are permitted to keep.</p>;
  const groups = new Map<string, EvidenceSource[]>();
  for (const s of sources) {
    const retrieved = s.collection?.retrievedAt.slice(0, 10);
    const key = s.collection ? s.collection.label + (s.collection.label.includes(retrieved!) ? "" : " · retrieved " + retrieved) : "Pasted by hand · recorded " + s.addedAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return <ol className="source-timeline" data-demo-id="source-timeline">
    {[...groups.entries()].map(([key, group]) => {
      const shared = group.every((s) => s.provenance === group[0].provenance) ? group[0].provenance : null;
      return <li key={key}>
        <div className="source-timeline-head"><span className="mono">{group[0].addedAt.slice(0, 16).replace("T", " ")}</span><strong>{key}</strong><Tag>{group.length} {group.length === 1 ? "source" : "sources"}</Tag>{shared ? <Tag>{PROVENANCE_LABEL[shared]}</Tag> : null}</div>
        <SourceGroup group={group} sources={sources} mayEdit={mayEdit} showProvenance={!shared} />
      </li>;
    })}
  </ol>;
}

function SourceGroup({ group, sources, mayEdit, showProvenance }: { group: EvidenceSource[]; sources: EvidenceSource[]; mayEdit: boolean; showProvenance: boolean }) {
  const [all, setAll] = useState(false);
  const shown = all ? group : group.slice(0, FIRST_CARDS);
  return <>
    <div className="source-cards">{shown.map((s) => <SourceCard key={s.id} source={s} original={s.duplicateOf ? sources.find((o) => o.id === s.duplicateOf) : undefined} mayEdit={mayEdit} showProvenance={showProvenance} />)}</div>
    {group.length > FIRST_CARDS ? <div className="button-row source-more">
      <Button aria-expanded={all} onClick={() => setAll(!all)}>{all ? "Show the first " + FIRST_CARDS : "Show all " + group.length + " sources"}</Button>
    </div> : null}
  </>;
}

function SourceCard({ source, original, mayEdit, showProvenance }: { source: EvidenceSource; original?: EvidenceSource; mayEdit: boolean; showProvenance: boolean }) {
  const [removing, setRemoving] = useState(false);
  const posting = source.kind === "job-posting";
  return <article className="source-card" data-demo-id="evidence-source">
    <div className="source-card-head">
      <strong>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source.title}</strong>
      <span className="muted">{source.organisation || "Organisation not named"} · {KIND_LABEL[source.kind]} · {source.sourceDate ? "published " + source.sourceDate : "publication date not supplied"}</span>
    </div>
    <div className="button-row">
      {original ? <Tag>Duplicate of {original.title}, counts once</Tag> : posting ? <Tag tone={source.reviewed ? "ok" : "warn"}>{source.reviewed ? "Reviewed, counted" : "Unreviewed, not counted"}</Tag> : <Tag>Contextual, not a posting</Tag>}
      {showProvenance ? <Tag>{PROVENANCE_LABEL[source.provenance]}</Tag> : null}
    </div>
    <Disclosure summary={"Source text (" + source.text.length + " characters) and fingerprint"}>
      <p className="muted mono">Fingerprint {source.textHash}</p>
      <div className="evidence-text">{source.text}</div>
      {mayEdit ? removing ? <div className="button-row"><span>Remove {source.title} and its quotations?</span><Button variant="danger" onClick={() => removeEvidenceSource(source.id)}>Confirm removal</Button><Button onClick={() => setRemoving(false)}>Keep source</Button></div>
        : <Button variant="quiet" aria-label={"Remove source " + source.title} onClick={() => setRemoving(true)}>Remove source</Button> : null}
    </Disclosure>
  </article>;
}

// ---------- Report: Quote ----------

/** A requirement quoted by hand from one kept source. A paraphrase is rejected before anything is stored. */
export function QuoteByHand({ state, subject, mayEdit }: Props) {
  const sources = state.evidenceSources.filter((s) => s.subjectId === subject.id && !s.duplicateOf);
  const [sourceId, setSourceId] = useState("");
  const [skill, setSkill] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [requirement, setRequirement] = useState<MentionRequirement>("required");
  const [error, setError] = useState("");
  const skills = [...new Set(state.skillMentions.filter((m) => m.subjectId === subject.id).map((m) => m.skill))];
  if (!mayEdit || !sources.length) return null;
  const chosen = sources.find((s) => s.id === sourceId) ?? sources[0];
  return <section className="curriculum-object" aria-labelledby="quote-by-hand">
    <h4 id="quote-by-hand">Quote a requirement by hand</h4>
    <p className="muted">Copy the words as they appear in the source. A paraphrase is rejected; only spacing may differ.</p>
    <div className="form-grid">
      <Field label="Source"><Select data-demo-id="mention-source" value={chosen.id} onChange={(e) => setSourceId(e.target.value)}>{sources.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.organisation || "not named"}</option>)}</Select></Field>
      <Field label="Skill or requirement"><Input list={"skills-" + subject.id} data-demo-id="mention-skill" maxLength={120} value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Cash-flow forecasting" /></Field>
      <Field label="Requirement level"><Select data-demo-id="mention-requirement" value={requirement} onChange={(e) => setRequirement(e.target.value as MentionRequirement)}>{REQUIREMENT_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
    </div>
    <datalist id={"skills-" + subject.id}>{skills.map((s) => <option key={s} value={s} />)}</datalist>
    <Field label="Exact excerpt from the source"><Textarea data-demo-id="mention-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></Field>
    {error ? <p role="alert" className="form-error">{error}</p> : null}
    <Button data-demo-id="mention-add" onClick={() => {
      const result = addSkillMention(chosen.id, { skill, excerpt, requirement });
      if (result.ok) { setSkill(""); setExcerpt(""); setError(""); } else setError(result.error);
    }}>Add quoted requirement</Button>
  </section>;
}

/** Every confirmed quotation, by source, re-verified against its source text on display. */
/** How many confirmed quotations show before "Show all". A quotation that fails its check always shows, first. */
const FIRST_QUOTATIONS = 5;

export function ConfirmedQuotations({ state, subject, mayEdit }: Props) {
  const [all, setAll] = useState(false);
  const sources = state.evidenceSources.filter((s) => s.subjectId === subject.id);
  const mentions = state.skillMentions.filter((m) => m.subjectId === subject.id);
  if (!mentions.length) return <p className="muted">No quotation confirmed yet.</p>;
  const checked = mentions.map((m) => {
    const source = sources.find((s) => s.id === m.sourceId);
    return { m, source, located: source ? locateExcerpt(source.text, m.excerpt) : { ok: false as const } };
  });
  const failing = checked.filter((c) => !c.located.ok), passing = checked.filter((c) => c.located.ok);
  const shown = all ? [...failing, ...passing] : [...failing, ...passing.slice(0, FIRST_QUOTATIONS)];
  return <>
    <p className="muted" role="status">{plural(mentions.length, "quotation", "quotations")} confirmed; {passing.length} of {mentions.length} verified in their source text right now.</p>
    <ul className="mention-list" data-demo-id="confirmed-quotations">{shown.map(({ m, source, located }) =>
      <li key={m.id}><div className="button-row"><strong>{m.skill}</strong><Tag tone={m.requirement === "required" ? "accent" : "neutral"}>{m.requirement}</Tag>
        <Tag tone={located.ok ? "ok" : "danger"}>{located.ok ? (located.match === "exact" ? "Verified in source" : "Verified, spacing differs") : "Not in source"}</Tag>
        <span className="muted">{source?.title ?? "missing source"}</span>
        {mayEdit ? <Button variant="quiet" aria-label={"Remove quotation for " + m.skill} onClick={() => removeSkillMention(m.id)}>Remove</Button> : null}</div>
        <blockquote>{m.excerpt}</blockquote></li>)}</ul>
    {passing.length > FIRST_QUOTATIONS ? <div className="button-row source-more">
      <Button aria-expanded={all} onClick={() => setAll(!all)}>{all ? "Show the first " + FIRST_QUOTATIONS : "Show all " + mentions.length + " quotations"}</Button>
    </div> : null}
  </>;
}

// ---------- Report: Review ----------

/** Each kept posting with its review mark: a posting counts in the denominator only once the lecturer vouches for its extraction. */
export function ReviewList({ state, subject, mayEdit }: Props) {
  const postings = state.evidenceSources.filter((s) => s.subjectId === subject.id && s.kind === "job-posting" && !s.duplicateOf);
  const mentions = state.skillMentions.filter((m) => m.subjectId === subject.id);
  if (!postings.length) return null;
  return <ul className="review-list">{postings.map((s) => <li key={s.id}>
    <div><strong>{s.title}</strong><span className="muted">{s.organisation || "Organisation not named"} · {plural(mentions.filter((m) => m.sourceId === s.id).length, "quotation", "quotations")}</span></div>
    <div className="button-row"><Tag tone={s.reviewed ? "ok" : "warn"}>{s.reviewed ? "Reviewed, counted" : "Unreviewed, not counted"}</Tag>
      {mayEdit ? <label className="checkbox-line"><input type="checkbox" data-demo-id="source-reviewed" checked={s.reviewed} onChange={(e) => setEvidenceSourceReviewed(s.id, e.target.checked)} />Extraction reviewed</label> : null}</div>
  </li>)}</ul>;
}

export function DuplicateList({ state, subject, mayEdit }: Props) {
  const sources = state.evidenceSources.filter((s) => s.subjectId === subject.id);
  const copies = sources.filter((s) => s.duplicateOf);
  if (!copies.length) return <p className="muted">No duplicate copies.</p>;
  return <ul className="source-list">{copies.map((s) => <li key={s.id}><strong>{s.title}</strong><span>Matches {sources.find((o) => o.id === s.duplicateOf)?.title ?? s.duplicateOf} word for word (spacing aside); it counts once, through the original · recorded {s.addedAt}</span>
    {mayEdit ? <Button variant="quiet" aria-label={"Remove duplicate copy " + s.title} onClick={() => removeEvidenceSource(s.id)}>Remove copy</Button> : null}</li>)}</ul>;
}

// ---------- Report: Count ----------

export function SkillCards({ state, subject, onMap }: { state: AppState; subject: Subject; onMap?: (skill: string) => void }) {
  const report = courseReport(state, subject.id);
  if (!report.rows.length) return <p className="muted">No requirement has been quoted from a posting yet. Quote one in Quote, then review the postings.</p>;
  return <div className="skill-cards">{[...report.rows].sort((a, b) => b.postings - a.postings).map((row) => <SkillCard key={row.key} row={row} eligible={report.eligible} onMap={onMap ? () => onMap(row.skill) : undefined} />)}</div>;
}

/** The evidence report as Markdown, with the table, the mappings, the limitations and every receipt. */
export function EvidenceExport({ state, subject }: { state: AppState; subject: Subject }) {
  const outcomes = state.clos.filter((c) => c.subjectId === subject.id);
  const sources = state.evidenceSources.filter((s) => s.subjectId === subject.id);
  const mentions = state.skillMentions.filter((m) => m.subjectId === subject.id);
  return <Button data-demo-id="evidence-export" onClick={() => downloadText(subject.id + "-evidence-report.md", evidenceMarkdown(subject, courseReport(state, subject.id), sources, mentions, outcomes, state.people, nowIso()))}>Export evidence report</Button>;
}

/** The full table, behind a disclosure on the Count sub-step. */
export function CountTable({ state, subject }: { state: AppState; subject: Subject }) {
  const report = courseReport(state, subject.id);
  return <div>
    {report.rows.length ? <div className="table-scroll"><table className="evidence-table">
      <caption className="muted">Share is the postings quoting the skill divided by the reviewed postings. The interval is a 95% Wilson interval; it does not correct how this sample was chosen.</caption>
      <thead><tr><th scope="col">Skill</th><th scope="col">Postings</th><th scope="col">Share</th><th scope="col">95% interval</th><th scope="col">Required / preferred</th><th scope="col">Employers</th><th scope="col">Coverage</th><th scope="col">Target</th></tr></thead>
      <tbody>{report.rows.map((row) => <tr key={row.key}>
        <th scope="row">{row.skill}{row.contextualSources ? <span className="muted"> · {row.contextualSources} contextual</span> : null}</th>
        <td className="tabular">{row.postings} of {report.eligible}</td>
        <td className="tabular share-cell"><ShareBar share={row.share} low={row.interval?.low ?? null} high={row.interval?.high ?? null} width={88} /><span>{pct(row.share)}</span></td>
        <td className="tabular">{row.interval ? pct(row.interval.low) + " to " + pct(row.interval.high) : "Unknown"}</td>
        <td className="tabular">{row.required} / {row.preferred}{row.unclear ? " (" + row.unclear + " unclear)" : ""}</td>
        <td className="tabular">{row.organisations.length}</td>
        <td>{STAGE_LABEL[row.stage]}</td><td>{STAGE_LABEL[row.target]}</td>
      </tr>)}</tbody>
    </table></div> : null}
    <p className="muted">{report.targetCoverage
      ? "Target coverage index: " + pct(report.targetCoverage.value) + " over " + report.targetCoverage.knownSkills + " skills with a reviewed stage and target; " + pct(report.targetCoverage.unknownWeightShare) + " of the quoted demand weight has an unknown stage or target. " + report.coverageNote
      : report.coverageNote}</p>
    <p className="muted" data-demo-id="trend-note">{evidenceTrendNote(subject.id)}</p>
  </div>;
}

// ---------- Report: Map ----------

const LADDER: CoverageStage[] = ["absent", "introduced", "practised", "assessed"];

/** The coverage ladder per skill: absent, introduced, practised, assessed, with the lecturer's stage and target marked. */
export function CoverageLadder({ state, subject, mayEdit, focusSkill }: Props & { focusSkill?: string | null }) {
  const report = courseReport(state, subject.id);
  const outcomes = state.clos.filter((c) => c.subjectId === subject.id);
  if (!report.rows.length) return <p className="muted">Quote a requirement first; then say what the course does about it.</p>;
  return <ol className="ladder-list">{report.rows.map((row) => <LadderRow key={row.key} row={row} subject={subject} outcomes={outcomes} mayEdit={mayEdit} startOpen={focusSkill ? row.skill === focusSkill : false} />)}</ol>;
}

function LadderRow({ row, subject, outcomes, mayEdit, startOpen }: { row: SkillRow; subject: Subject; outcomes: CLO[]; mayEdit: boolean; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [cloIds, setCloIds] = useState<string[]>(row.mapping?.cloIds ?? []);
  const [stage, setStage] = useState<CoverageStage>(row.stage);
  const [target, setTarget] = useState<CoverageStage>(row.target);
  const [evidence, setEvidence] = useState(row.mapping?.evidence ?? "");
  const [error, setError] = useState("");
  const labelOf = (id: string) => outcomes.find((c) => c.id === id)?.label ?? id;
  const status = row.shortfall === null ? "Not assessed" : row.shortfall ? "Below target" : "At or above target";
  return <li className="ladder-row">
    <div className="ladder-head">
      <strong>{row.skill}</strong>
      <span className="muted">{row.mapping?.cloIds.length ? "Mapped to " + row.mapping.cloIds.map((id) => labelOf(id) + (row.retiredOutcomeIds.includes(id) ? " (retired)" : "")).join(", ") : "Not mapped"}</span>
      <Tag tone={row.shortfall === null ? "neutral" : row.shortfall ? "danger" : "ok"}>{status}</Tag>
      {mayEdit ? <Button variant="quiet" data-demo-id="mapping-open" aria-expanded={open} aria-label={(open ? "Close mapping for " : "Map ") + row.skill} onClick={() => setOpen(!open)}>{open ? "Close" : row.mapping ? "Edit mapping" : "Map"}</Button> : null}
    </div>
    <ol className="ladder" aria-label={row.skill + ": coverage " + STAGE_LABEL[row.stage] + ", target " + STAGE_LABEL[row.target]}>
      {LADDER.map((rung) => <li key={rung} className={"ladder-rung" + (row.stage === rung ? " is-stage" : "") + (row.target === rung ? " is-target" : "")}>
        <span>{STAGE_LABEL[rung]}</span>
        {row.stage === rung ? <span className="ladder-mark">Today</span> : null}
        {row.target === rung ? <span className="ladder-mark is-target">Target</span> : null}
      </li>)}
    </ol>
    {row.mapping?.evidence ? <Disclosure summary="Cited course evidence"><p>{row.mapping.evidence}</p></Disclosure> : null}
    {open ? <div className="ladder-editor">
      <fieldset className="clo-choices"><legend>Outcomes this skill relates to</legend>
        {outcomes.length ? outcomes.map((c) => <label key={c.id}><input type="checkbox" data-demo-id={"mapping-outcome-" + (c.label ?? c.id)} checked={cloIds.includes(c.id)}
          onChange={(e) => setCloIds(e.target.checked ? [...cloIds, c.id] : cloIds.filter((id) => id !== c.id))} /><span>{c.label ?? c.id} · {c.text}</span></label>) : <p className="muted">Record course outcomes in Update first.</p>}
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
    </div> : null}
  </li>;
}
