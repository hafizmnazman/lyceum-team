// The OBE course report (depth plan Section 8.3): the header with the version taught, the pass mark and KPI used and the
// survey's wording; per outcome, n of N, the mean, the share at or above the pass mark (an interval only when n is below N)
// and the KPI, with the Course Outcome Survey's share beside it as a second construct; the programme outcomes listed with
// no index; the response rate and the floor; the CQI note; and the sentence that stays. One view for the report as the
// records stand, a saved snapshot, and last term's sample. Learn's panel saves it, prints it and keeps the CQI note.

import { useState } from "react";
import { can } from "../../app/roles.ts";
import { nowIso, obeReportFor, reportUpload, saveCqiNote, saveObeReport, type AppState } from "../../app/store.ts";
import { termWindow } from "../../app/loop.ts";
import { DEMO_LINE } from "../../data/sample-course/index.ts";
import { SEED_RESULT_UPLOADS } from "../../data/seed.ts";
import { NON_RESPONSE_LABEL, NOT_FILED, PLO_LINE, constructsLine, methodLine, pctText } from "../../lib/attainment.ts";
import { LEARN_CLAIM } from "../../lib/learn.ts";
import { dayOf } from "../../lib/slides.ts";
import type { ObeReport, Person, Subject } from "../../types.ts";
import { Button, Field, Tag, Textarea } from "../primitives/index.tsx";

const SEEDED = new Set(SEED_RESULT_UPLOADS.map((u) => u.id));
const PREVIEW_IDS = new Set(["OBE-preview", "OBE-sample"]);

export function ObeReportView({ report, state }: { report: ObeReport; state: AppState }) {
  const live = PREVIEW_IDS.has(report.id);
  const subject = state.subjects.find((s) => s.id === report.subjectId);
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  const sampleCourse = Boolean(state.courseDefinitions[report.subjectId]?.sample);
  const showMark = sampleCourse && state.institution.showMark;
  const note = report.cqiNoteId ? state.cqiNotes.find((n) => n.id === report.cqiNoteId) : null;
  const indirect = new Map(report.indirect.map((r) => [r.cloId, r]));
  const target = report.surveyTarget ?? state.institution.surveyScale.target;
  const atLabel = "At " + report.passMark + " or above";
  return <article className="obe-report" data-demo-id={live ? (report.id === "OBE-sample" ? "obe-sample-report" : "obe-live") : "obe-saved-" + report.id}>
    <header className="obe-head">
      <div>
        <p className="eyebrow">OBE course report · {report.term}</p>
        <h3>{report.subjectId} {subject?.title}</h3>
        <dl className="obe-facts">
          <div><dt>Version taught</dt><dd>{report.versionId ?? "not recorded"}</dd></div>
          <div><dt>Pass mark and KPI</dt><dd>{report.passMark}, and {pctText(report.studentShare)} of students</dd></div>
          <div><dt>Results</dt><dd>{report.sourceFileName ?? "the results file"}{report.sample ? ", synthetic marks" : ""}</dd></div>
          <div><dt>Survey wording</dt><dd>{report.surveyTitle ? report.surveyTitle + ", on " + (report.surveyVersionId ?? "a version not recorded") : "no Course Outcome Survey"}</dd></div>
        </dl>
      </div>
      {showMark ? <div className="recap-mark"><img src={state.institution.mark.wide ?? state.institution.mark.png} alt={state.institution.mark.alt} /><span>{state.institution.name}</span></div> : null}
    </header>
    {sampleCourse ? <p className="sample-line"><Tag tone="warn">Sample, synthetic</Tag> {DEMO_LINE}</p> : null}
    <p className="muted">{methodLine(report.passMark, report.studentShare)}</p>
    <table className="record-table obe-table">
      <caption>Direct, from the marks: the students at or above {report.passMark} over n, the students with a mark, with N, the students listed, beside it. Indirect, from the survey: the share at {target} or higher.</caption>
      <thead><tr><th scope="col">Outcome</th><th scope="col">n of N</th><th scope="col">Mean</th><th scope="col">{atLabel}</th><th scope="col">KPI {pctText(report.studentShare)}</th><th scope="col">Survey, {target} or higher</th></tr></thead>
      <tbody>{report.direct.map((r) => {
        const ind = indirect.get(r.cloId);
        return <tr key={r.cloId}>
          <th scope="row" data-label="Outcome">{r.label}</th>
          <td data-label="n of N" className="tabular">{r.n} of {r.N}{r.filed && r.missing ? <span className="muted"> ({r.missing} without a mark)</span> : null}</td>
          <td data-label="Mean" className="tabular">{r.mean === null ? "not filed" : r.mean.toFixed(1)}</td>
          <td data-label={atLabel}>{r.share === null ? NOT_FILED : <><span className="tabular">{r.atOrAbove}, {pctText(r.share)}</span>
            {r.interval ? <span className="obe-interval">95% interval {pctText(r.interval.low)} to {pctText(r.interval.high)}: {NON_RESPONSE_LABEL}</span> : null}</>}</td>
          <td data-label={"KPI " + pctText(report.studentShare)}>{r.kpiMet === null ? "not computed" : r.kpiMet ? <Tag tone="ok">Met</Tag> : <Tag tone="warn">Not met</Tag>}</td>
          <td data-label={"Survey, " + target + " or higher"} className="tabular">{ind ? (ind.share === null ? "no answer" : ind.atTarget + " of " + ind.n + ", " + pctText(ind.share)) : report.surveyOpen ? "no item" : "not open"}</td>
        </tr>;
      })}</tbody>
    </table>
    <p className="muted">{constructsLine(report.passMark, target)}</p>
    {report.surveyNote ? <p className="muted">{report.surveyNote}</p> : null}
    {report.respondents !== null ? <p>The survey's response rate: {report.rate ?? report.respondents + (report.respondents === 1 ? " response" : " responses") + ", the class size not recorded"}; its floor is {report.floorRequired} responses.</p> : null}
    <h4>Programme outcomes, listed</h4>
    {report.plos.length ? <ul className="obe-plos">{report.plos.map((p) => <li key={p.ploId}><strong>{p.ploId}</strong> <span className="muted">{p.text}:</span> {p.links.map((l) => l.label + " (" + l.level + ") " + (l.share === null ? "not computed" : pctText(l.share))).join("; ")}</li>)}</ul>
      : <p className="muted">The course record links no programme outcome.</p>}
    <p className="muted">{PLO_LINE}</p>
    <h4>CQI note</h4>
    {note ? <blockquote className="obe-cqi-text">{note.text}<footer>{name(note.byPersonId)}, {dayOf(note.at)}, on version {note.versionId ?? "not recorded"}</footer></blockquote>
      : <p className="muted">No CQI note for this term yet.</p>}
    <p className="limitation">{LEARN_CLAIM}</p>
    <footer className="obe-foot">{report.id === "OBE-sample" ? "Last term's sample, as the records stand; never counted and not saved."
      : live ? "As the records stand now; not saved." : "Saved as printed on " + dayOf(report.printedAt) + " by " + name(report.printedBy) + "; a later change to the profile does not change it."}</footer>
  </article>;
}

/** Learn's panel: this term's report as the records stand, saved as printed on request, printed, the CQI note, the saved
 *  reports, and last term's sample report with both columns open. */
export function ObePanel({ state, person, subject, onPrint }: { state: AppState; person: Person; subject: Subject; onPrint: (report: ObeReport) => void }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const term = termWindow(state, subject.id).term;
  const mayWrite = can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments });
  const upload = term ? reportUpload(state, subject.id, term) : null;
  const live = upload ? obeReportFor(state, subject.id, term, upload, nowIso(), person.id) : null;
  const saved = state.obeReports.filter((r) => r.subjectId === subject.id).sort((a, b) => b.printedAt.localeCompare(a.printedAt));
  const priorUpload = state.resultUploads.find((u) => SEEDED.has(u.id) && u.subjectId === subject.id && u.sample && u.rows.some((r) => r.marks));
  const prior = priorUpload ? obeReportFor(state, subject.id, priorUpload.term, priorUpload, nowIso(), person.id, "OBE-sample") : null;
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  const done = (r: { ok: true } | { ok: false; error: string }, after?: () => void) => { setMessage(r.ok ? "" : r.error); if (r.ok) after?.(); };
  return <section className="workspace-panel" aria-labelledby="learn-obe" data-demo-id="learn-obe">
    <div className="section-heading"><div><h2 id="learn-obe">The OBE course report</h2>
      <p className="muted">This term's direct attainment against the institution's stated pass mark and KPI, the Course Outcome Survey beside it, the programme outcomes listed and the CQI note. Saved, it keeps the settings it was printed with.</p></div>
      {live ? <div className="button-row">
        {mayWrite ? <Button variant="primary" onClick={() => done(saveObeReport(subject.id))} data-demo-id="obe-save">Save the report as printed</Button> : null}
        <Button onClick={() => onPrint(live)} data-demo-id="obe-print">Print</Button></div> : null}</div>
    {message ? <p role="status" className="save-status">{message}</p> : null}
    {live ? <ObeReportView report={live} state={state} />
      : <p className="muted">{term ? "File this term's results (" + term + ") above to build the report; it reads the marks they keep." : "Set the term on the Course step; a report belongs to a term."}</p>}
    {mayWrite && term ? <div className="obe-cqi">
      <Field label={"CQI note for " + term} hint="What will change next term, and why. Saved with the term, the version and the date; History shows it, and the next saved report carries it.">
        <Textarea value={note} maxLength={2000} rows={3} onChange={(e) => setNote(e.target.value)} data-demo-id="cqi-text" /></Field>
      <Button onClick={() => done(saveCqiNote(subject.id, note), () => setNote(""))} data-demo-id="cqi-save">Save the CQI note</Button>
    </div> : null}
    {saved.length ? <div className="obe-saved" data-demo-id="obe-saved">
      <h3>Saved reports</h3>
      <ul className="filed-list">{saved.map((r) => <li key={r.id}>
        <details><summary>{r.term}: saved {dayOf(r.printedAt)} by {name(r.printedBy)}, at a pass mark of {r.passMark} and a KPI of {pctText(r.studentShare)}, on {r.versionId ?? "a version not recorded"}</summary>
          <ObeReportView report={r} state={state} />
          <Button onClick={() => onPrint(r)}>Print this report</Button></details>
      </li>)}</ul>
    </div> : null}
    {prior ? <details className="obe-sample" data-demo-id="obe-sample"><summary>Last term's report, a sample ({prior.term})</summary>
      <p className="muted">Built from last term's sample results file and its sample Course Outcome Survey, synthetic and never counted, to show the report with both columns open.</p>
      <ObeReportView report={prior} state={state} />
    </details> : null}
  </section>;
}
