// The term recap (depth plan Section 9.1 item 4) at #/course/:id/recap: one page per course and term, printable at A4, from
// records only (app/recap.ts). Tualang reflects in the header and says nothing; the institution's mark sits in the header on
// the sample course with the demo line beside it; the honesty line closes the page.

import { Printer } from "lucide-react";
import { recapFor } from "../../app/recap.ts";
import { currentPerson, nowIso, openStep, useStore } from "../../app/store.ts";
import { LEARN_CLAIM } from "../../lib/learn.ts";
import { pctText } from "../../lib/attainment.ts";
import { OUTCOME_LABEL } from "../../lib/decisions.ts";
import { dayOf } from "../../lib/slides.ts";
import { Mascot } from "../mascots/index.tsx";
import { ChangeSummary, OutcomeChanges } from "../primitives/compare.tsx";
import { Button, EmptyState, Tag } from "../primitives/index.tsx";

const pct = (x: number | null) => (x === null ? "unknown" : Math.round(x * 1000) / 10 + "%");

export function RecapScreen() {
  const state = useStore();
  const person = currentPerson();
  const subjectId = state.selectedSubjectId;
  const recap = person && subjectId ? recapFor(state, subjectId, nowIso()) : null;
  if (!recap) return <EmptyState title="No course for a recap" body="Open a course, then its recap from Home or History." />;
  const showMark = recap.sample && state.institution.showMark;
  return <article className="recap" data-demo-id="recap">
    <header className="recap-head">
      <span className="recap-host"><Mascot who="host" mood="reflecting" size={72} /></span>
      <div>
        <p className="eyebrow">Term recap · {recap.term || "term not set"}</p>
        <h1>{recap.subjectId} {recap.title}</h1>
        <p className="muted">Built from this workspace's records on {dayOf(recap.builtAt)}.</p>
      </div>
      {showMark ? <div className="recap-mark"><img src={state.institution.mark.wide ?? state.institution.mark.png} alt={state.institution.mark.alt} /><span>{state.institution.name}</span></div> : null}
    </header>
    {recap.demoLine ? <p className="sample-line"><Tag tone="warn">Sample, synthetic</Tag> {recap.demoLine}</p> : null}
    <div className="button-row no-print"><Button onClick={() => window.print()} data-demo-id="recap-print"><Printer size={15} /> Print or save as PDF (A4)</Button>
      <Button variant="quiet" onClick={() => openStep(recap.subjectId, "history")}>Open History</Button></div>

    <section className="recap-part" aria-labelledby="recap-asked" data-demo-id="recap-evidence">
      <h2 id="recap-asked">What employers asked for</h2>
      {recap.evidence.skills.length ? <>
        <p className="muted">Over {recap.evidence.reviewed} reviewed postings, from {recap.evidence.sources} kept sources. Counts with 95% intervals; no claim about all employers.</p>
        <table className="record-table recap-table"><thead><tr><th scope="col">Skill</th><th scope="col">Postings quoting it</th><th scope="col">Share</th><th scope="col">95% interval</th></tr></thead>
          <tbody>{recap.evidence.skills.map((s) => <tr key={s.skill}><th scope="row" data-label="Skill">{s.skill}</th><td data-label="Postings quoting it">{s.postings} of {s.of}</td>
            <td data-label="Share">{pct(s.of ? s.postings / s.of : null)}</td><td data-label="95% interval">{s.low === null ? "not computed" : pct(s.low) + " to " + pct(s.high)}</td></tr>)}</tbody></table>
      </> : <p>No reviewed postings yet this term.</p>}
    </section>

    <section className="recap-part" aria-labelledby="recap-decided" data-demo-id="recap-decision">
      <h2 id="recap-decided">What was decided</h2>
      {recap.decision ? <p><strong>{OUTCOME_LABEL[recap.decision.outcome]}</strong>, recorded by {recap.decision.by} on {recap.decision.at.slice(0, 10)}, on course version {recap.decision.courseVersionId}, for {recap.decision.term || "the term"}. The reason: “{recap.decision.note}”</p>
        : <p>No decision recorded this term.</p>}
    </section>

    <section className="recap-part" aria-labelledby="recap-changed" data-demo-id="recap-change">
      <h2 id="recap-changed">What changed</h2>
      {recap.change ? <>
        <p className="muted">{recap.change.to} against {recap.change.from}.</p>
        <ChangeSummary text={recap.change.summary} />
        <OutcomeChanges before={recap.change.before} after={recap.change.after} />
      </> : <p>No new version this term.</p>}
    </section>

    <section className="recap-part" aria-labelledby="recap-taught" data-demo-id="recap-taught">
      <h2 id="recap-taught">What was taught</h2>
      {recap.taught.length ? <ul className="recap-list">{recap.taught.map((s) => <li key={s.id}>Week {s.week}: {s.topic}. Its teaching pack: {s.slides} editable slides{s.versionId ? ", on version " + s.versionId : ""}.</li>)}</ul>
        : <p>No session of the lecturer's own saved this term.</p>}
      {recap.samples ? <p className="muted">Beside them, {recap.samples} sample sessions written for this prototype, labelled synthetic, never counted as taught.</p> : null}
    </section>

    <section className="recap-part" aria-labelledby="recap-back" data-demo-id="recap-results">
      <h2 id="recap-back">What came back</h2>
      {recap.obe ? <div data-demo-id="recap-obe">
        <p className="muted">The OBE course report saved on {dayOf(recap.obe.savedAt)} by {recap.obe.by}{recap.obe.versionId ? ", on version " + recap.obe.versionId : ""}, at a pass mark of {recap.obe.passMark} and a KPI of {pctText(recap.obe.studentShare)} of students{recap.results?.sample ? "; synthetic marks" : ""}.</p>
        <table className="record-table recap-table"><thead><tr><th scope="col">Outcome</th><th scope="col">n of N</th><th scope="col">Mean</th><th scope="col">At {recap.obe.passMark} or above</th><th scope="col">KPI</th></tr></thead>
          <tbody>{recap.obe.rows.map((r) => <tr key={r.label}><th scope="row" data-label="Outcome">{r.label}</th><td data-label="n of N">{r.n} of {r.N}</td><td data-label="Mean">{r.mean === null ? "not filed" : r.mean.toFixed(1)}</td>
            <td data-label={"At " + recap.obe!.passMark + " or above"}>{r.share === null ? "not computed" : r.atOrAbove + ", " + pctText(r.share)}</td><td data-label="KPI">{r.kpiMet === null ? "not computed" : r.kpiMet ? "met" : "not met"}</td></tr>)}</tbody></table>
      </div> : recap.results ? <>
        <p className="muted">{recap.results.file}, filed for {recap.results.term}{recap.results.versionId ? ", matched to version " + recap.results.versionId : ""}. As filed: the mean mark and n of N, N = {recap.results.N}.{recap.results.sample ? " Synthetic marks." : ""} No OBE report is saved for this term yet.</p>
        <table className="record-table recap-table"><thead><tr><th scope="col">Outcome</th><th scope="col">Mean mark</th><th scope="col">n of N</th></tr></thead>
          <tbody>{recap.results.rows.map((r) => <tr key={r.label}><th scope="row" data-label="Outcome">{r.label}</th><td data-label="Mean mark">{Math.round(r.mean * 1000) / 10} of 100</td><td data-label="n of N">{r.n} of {recap.results!.N}</td></tr>)}</tbody></table>
      </> : <p>Not filed.</p>}
      {recap.survey ? <div data-demo-id="recap-survey">
        <p className="muted">{recap.survey.title}: {recap.survey.respondents} {recap.survey.respondents === 1 ? "response" : "responses"}{recap.survey.rate ? " (" + recap.survey.rate + ")" : ""}{recap.survey.open ? ", the share at " + recap.survey.target + " or higher on each outcome, over the students who chose a point." : !recap.survey.released ? "; the results wait for grades to be released." : "; below the floor of " + recap.survey.required + ", so no result shows."}{recap.survey.booth ? " " + recap.survey.booth + " booth responses are a demonstration of the collector and are not counted." : ""}</p>
        {recap.survey.open ? <table className="record-table recap-table"><thead><tr><th scope="col">Outcome</th><th scope="col">{recap.survey.target} or higher</th></tr></thead>
          <tbody>{recap.survey.items.map((it) => <tr key={it.label}><th scope="row" data-label="Outcome">{it.label}</th><td data-label={recap.survey!.target + " or higher"}>{it.atTarget} of {it.n}{it.share === null ? "" : ", " + Math.round(it.share * 100) + "%"}</td></tr>)}</tbody></table> : null}
      </div> : <p className="muted">No Course Outcome Survey this term.</p>}
      <p className="muted">{LEARN_CLAIM}</p>
    </section>

    <footer className="recap-foot">{recap.demoLine ? recap.demoLine + " " : ""}Every number on this page is read from a record in this workspace; nothing is estimated. This recap does not attest institutional approval.</footer>
  </article>;
}
