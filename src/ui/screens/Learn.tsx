// Learn, step 6 of the loop (plan Sections 4, 5.3 and 9.8; depth plan Section 8): did it work, as far as we can
// honestly tell? Per outcome, the students at or above the institution's stated pass mark over n with N beside it, the
// KPI, the mean, and an interval only when some listed students have no mark; the OBE course report with the Course
// Outcome Survey beside the marks, the programme outcomes listed and the CQI note; the two student surveys; the
// benchmark protocol's status; and one sentence that claims nothing more. Pooling, frozen predictions, comment themes
// and the programme's PLO figure are listed as planned. Filing goes through the same intake as Upload, with the course
// version taught confirmed by the person filing.

import { useEffect, useState } from "react";
import { SEED_RESULT_UPLOADS } from "../../data/seed.ts";
import { loopState, taughtVersionId, termWindow } from "../../app/loop.ts";
import { can } from "../../app/roles.ts";
import { currentPerson, navigate, openStep, reportUpload, useStore, type AppState } from "../../app/store.ts";
import { LEARN_CLAIM, attainment } from "../../lib/learn.ts";
import { NON_RESPONSE_LABEL, NOT_FILED, directRows, methodLine, pctText, termResults } from "../../lib/attainment.ts";
import { resultDeltas } from "../../lib/diff.ts";
import type { CLO, ObeReport, ResultUpload, Subject } from "../../types.ts";
import { Button, Disclosure, EmptyState, Tag } from "../primitives/index.tsx";
import { Slopegraph } from "../primitives/compare.tsx";
import { Handoff, Meter } from "../primitives/loop.tsx";
import { Mascot } from "../mascots/index.tsx";
import { IntakePanel } from "./Upload.tsx";
import { SurveysPanel } from "./SurveysPanel.tsx";
import { ObePanel, ObeReportView } from "./ObeReport.tsx";
import { StepFrame, courseContext } from "./StepFrame.tsx";


// What stays planned once the OBE report is built (depth plan Section 8.3).
const PLANNED: Array<[string, string]> = [
  ["Raw beside pooled", "this cohort blended with earlier cohorts by precision, with the raw figure always shown."],
  ["Predictions scored", "a prediction frozen before the term, scored against last cohort carried forward once the term closes."],
  ["Comment themes", "open comments coded against a codebook, with the agreement between coders shown."],
  ["The programme's PLO figure", "a programme-level attainment for each PLO from every course's data and a stated method; the report lists each PLO's course outcomes and computes no index."],
];

const SEEDED = new Set(SEED_RESULT_UPLOADS.map((u) => u.id));
const pct = (x: number) => Math.round(x * 1000) / 10;

export function LearnScreen() {
  const state = useStore();
  const person = currentPerson();
  // Printing shows the report alone: the shell's header and sidebar already leave the page on paper (global.css).
  const [printing, setPrinting] = useState<ObeReport | null>(null);
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done);
    const timer = window.setTimeout(() => window.print(), 60);
    return () => { window.clearTimeout(timer); window.removeEventListener("afterprint", done); };
  }, [printing]);
  if (!person) return null;
  if (printing) return <div className="obe-print" data-demo-id="obe-printing"><ObeReportView report={printing} state={state} />
    <p className="no-print"><Button onClick={() => setPrinting(null)}>Back to Learn</Button></p></div>;
  const { subject, subjects } = courseContext(state, person);
  if (!subject) return <EmptyState title="No course to learn from yet" body="Open an assigned course, or create a personal course workspace, then file the term's results here." />;
  const loop = loopState(state, subject.id);
  const learn = loop.steps.find((s) => s.id === "learn")!;
  const clos = state.clos.filter((c) => c.subjectId === subject.id);
  const uploads = state.resultUploads.filter((u) => u.subjectId === subject.id).sort((a, b) => b.filedAt.localeCompare(a.filedAt));
  const latest = uploads.find((u) => !SEEDED.has(u.id)) ?? uploads[0];
  const surveys = state.dataSources.filter((d) => d.subjectId === subject.id && (d.kind === "clo-survey" || d.kind === "ssrt"));
  const mayFile = can(person, "upload-results", { subjectId: subject.id, assignments: state.assignments });
  const taught = taughtVersionId(state, subject.id);
  return <StepFrame state={state} step="learn" subject={subject} subjects={subjects}
    helper={{ who: "lens", line: "Shows what came back for each outcome, with n of N, as filed." }}>
    <p className="limitation" data-demo-id="learn-claim">{LEARN_CLAIM}</p>

    <section className="workspace-panel" aria-labelledby="learn-attainment" data-demo-id="learn-attainment">
      <div className="section-heading"><div><h2 id="learn-attainment">What came back, per outcome</h2>
        <p className="muted">As filed. N is the students the file lists and n those with a mark for the outcome; an interval shows only when some have none. {methodLine(state.institution.kpi.passMark, state.institution.kpi.studentShare)}</p></div></div>
      {latest ? <AttainmentCard state={state} subject={subject} upload={latest} clos={clos} />
        : <div className="empty-panel"><Mascot who="lens" mood="resting" size={56} /><div><h3>No results filed for {subject.id} yet</h3><p className="muted">File this term's results below. They are matched to the course version taught{taught ? ", " + taught + "," : ""} when you confirm them.</p></div></div>}
    </section>

    <ObePanel state={state} person={person} subject={subject} onPrint={setPrinting} />
    <ResultsBetweenTerms state={state} subject={subject} clos={clos} />

    <section className="workspace-panel" aria-labelledby="learn-file" id="learn-file-section">
      <div className="section-heading"><div><h2 id="learn-file">File results or a survey</h2>
        <p className="muted">You see what was read and what it was taken to mean, and nothing is filed until you confirm. Results are matched to the version taught{taught ? ", " + taught + ", unless you choose another" : ""}.</p></div></div>
      {mayFile ? <IntakePanel samples={[["results.xlsx", "sample-results"], ["clo-survey.csv", "sample-survey"]]} prompt="Drop the term's results or a CLO survey export." />
        : <p className="muted">Only an assigned lecturer or coordinator can file results for this course.</p>}
    </section>

    <section className="workspace-panel" aria-labelledby="learn-filed" data-demo-id="learn-filed">
      <h2 id="learn-filed">Results and surveys filed for {subject.id}</h2>
      {uploads.length || surveys.length ? <ul className="filed-list">
        {uploads.map((u) => <li key={u.id}>
          <div><strong>{u.sourceFileName ?? "Results"}</strong><span className="muted">Results · term {u.term} · filed {u.filedAt.slice(0, 10)} · {u.rows.length} {u.rows.length === 1 ? "outcome" : "outcomes"}{u.courseVersionId ? " · version " + u.courseVersionId : ""}</span></div>
          <span className="tag-row">{u.sample ? <Tag>Sample file, synthetic marks</Tag> : null}{SEEDED.has(u.id) ? <Tag>Seeded example, never counted</Tag> : u.courseVersionId ? <Tag tone="ok">Matched to {u.courseVersionId}</Tag> : <Tag tone="warn">No course version</Tag>}</span>
        </li>)}
        {surveys.map((d, i) => <li key={d.kind + d.term + i}>
          <div><strong>{d.sourceFileName ?? (d.kind === "ssrt" ? "SSRT survey" : "CLO survey")}</strong><span className="muted">{d.kind === "ssrt" ? "SSRT survey" : "CLO self-rating survey"} · term {d.term} · {d.recordCount} responses · filed {d.ingestedAt.slice(0, 10)}</span></div>
          <Tag>{d.sample ? "Sample file, synthetic responses" : d.sourceFileName ? "Filed by a person" : "Seeded example"}</Tag>
        </li>)}
      </ul> : <p className="muted">Nothing filed for this course yet.</p>}
      <p className="muted">Survey files filed through the intake are listed here; the OBE report sets this term's Course Outcome Survey beside the marks.</p>
    </section>

    <SurveysPanel state={state} person={person} subject={subject} />

    <section className="workspace-panel" aria-labelledby="learn-planned">
      <div className="section-heading"><h2 id="learn-planned">Planned for the pilot</h2><Tag tone="warn">Planned</Tag></div>
      <ul className="planned-list">{PLANNED.map(([title, text]) => <li key={title}><strong>{title}:</strong> {text}</li>)}</ul>
      <Disclosure summary="The student-agent benchmark: the protocol and its status" data-demo-id="learn-protocol">
        <p><strong>Status: written, not run.</strong> Real terms benchmarked so far: 0. The protocol needs one course and one term of results.</p>
        <ol className="protocol">
          <li>Ground truth: per-outcome attainment from the filed results, with the allocation rules stated, and the CLO self-rating survey kept separate from marks.</li>
          <li>Prediction before the term: frozen with the course version, cohort, term and model version, before results exist.</li>
          <li>Scoring: error and calibration against actual attainment per outcome, against a naive baseline (last term carried forward) that the model must beat.</li>
          <li>Transparency: sample sizes, missingness and subgroups reported; a learning claim only after a held-out term.</li>
        </ol>
        <Button variant="quiet" onClick={() => navigate("evaluation")}>Read it in Evaluation</Button>
      </Disclosure>
    </section>

    {learn.done ? <Handoff step="learn" record={learn.count + " this term, matched to the version taught."} /> : null}
    {learn.note ? <p className="limitation">{learn.note}.</p> : null}
    {loop.closed ? <p className="muted">The loop is closed for this term. <Button variant="quiet" onClick={() => openStep(subject.id, "history")}>See it in History</Button></p> : null}
  </StepFrame>;
}

/** Each outcome's share at the pass mark from last term's file to this term's (depth plan Section 6.2, pattern 4), at today's
 *  threshold for both, each outcome judged against the wording of the version its term was taught on: a reworded outcome is
 *  drawn broken and said to be not comparable. Last term's file is the seeded sample, never counted as this term's. */
function ResultsBetweenTerms({ state, subject, clos }: { state: AppState; subject: Subject; clos: CLO[] }) {
  const term = termWindow(state, subject.id).term;
  const prior = state.resultUploads.find((u) => SEEDED.has(u.id) && u.subjectId === subject.id && u.rows.some((r) => r.marks));
  const current = term ? reportUpload(state, subject.id, term) : null;
  if (!prior || !current || !current.rows.some((r) => r.marks)) return null;
  const { passMark, studentShare } = state.institution.kpi;
  const results = (u: ResultUpload) => termResults(u, clos, passMark, studentShare, state.subjectVersions);
  const rows = resultDeltas(results(prior), results(current));
  return <section className="workspace-panel" aria-labelledby="learn-between" data-demo-id="learn-between-terms">
    <div className="section-heading"><div><h2 id="learn-between">Results between terms</h2>
      <p className="muted">The share of students at or above {passMark}, today's pass mark, in both terms. Last term ({prior.term}) is the seeded sample file{prior.sample ? ", synthetic marks," : ""} on {prior.courseVersionId ?? "an unrecorded version"}, never counted as this term's; this term ({current.term}) is on {current.courseVersionId ?? "an unrecorded version"}.</p></div>
      {prior.sample || current.sample ? <Tag tone="warn">Sample, synthetic</Tag> : null}</div>
    <Slopegraph rows={rows} beforeLabel={"Last term"} afterLabel={"This term"} caption={"Each outcome's share at " + passMark + " or above, last term against this term"} />
    <p className="muted">An outcome reworded between the terms was assessed against a different promise, so its two shares are not compared. No learning gain is claimed; the benchmark has not been run.</p>
  </section>;
}

function AttainmentCard({ state, subject, upload, clos }: { state: AppState; subject: Subject; upload: ResultUpload; clos: CLO[] }) {
  const { N, rows } = attainment(upload, clos);
  const { passMark, studentShare } = state.institution.kpi;
  const direct = new Map(directRows(upload, clos, passMark, studentShare).map((r) => [r.cloId, r]));
  const seeded = SEEDED.has(upload.id);
  const who = state.people.find((p) => p.id === upload.uploadedBy)?.name ?? upload.uploadedBy;
  return <div className="attainment">
    <div className="attainment-head">
      <div><strong>{upload.sourceFileName ?? "Results file"}</strong><span className="muted">Term {upload.term} · filed {upload.filedAt.slice(0, 10)} by {who} · N = {N}</span></div>
      <span className="tag-row">{upload.sample ? <Tag>Sample file, synthetic marks</Tag> : null}{seeded ? <Tag>Seeded example: last term's file, never counted</Tag> : upload.courseVersionId ? <Tag tone="ok">For version {upload.courseVersionId}</Tag> : <Tag tone="warn">No course version</Tag>}</span>
    </div>
    <ul className="attainment-rows">{rows.map((r) => <li key={r.cloId}>
      <div className="attainment-outcome"><strong>{r.clo?.label ?? r.cloId}</strong><span className="muted">{r.clo ? r.clo.text : "Not an outcome of " + subject.id + " today"}</span></div>
      {(() => {
        const d = direct.get(r.cloId)!;
        // The direct line at the stated pass mark when the marks were kept (depth plan Section 8.1); the mean as filed otherwise.
        return d.filed && d.share !== null
          ? <Meter value={Math.round(d.share * 100)} max={100} label={<><strong className="tabular">{d.atOrAbove} of {d.n}</strong> at {passMark} or above, {pctText(d.share)} · KPI {pctText(studentShare)} {d.kpiMet ? "met" : "not met"} · mean <span className="tabular">{d.mean!.toFixed(1)}</span>, spread {d.sd!.toFixed(1)} · n <span className="tabular">{d.n}</span> of <span className="tabular">{d.N}</span>{d.missing ? ", " + d.missing + " without a mark" : ""}
              {d.interval ? <span className="attainment-interval"> · 95% interval {pctText(d.interval.low)} to {pctText(d.interval.high)}: {NON_RESPONSE_LABEL}</span> : null}</>} />
          : <Meter value={pct(r.meanScore)} max={100}
              label={<><strong className="tabular">{pct(r.meanScore)}</strong> mean mark, spread {pct(r.sd)} points · n <span className="tabular">{r.n}</span> of <span className="tabular">{N}</span> · {NOT_FILED}</>} />;
      })()}
    </li>)}</ul>
  </div>;
}
