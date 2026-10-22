// The Watch step: freeze the reviewed evidence at each review, then compare a
// later window with it. A skill is called rising or falling only when the two
// 95% intervals separate; everything else says so plainly.

import { useState } from "react";
import { compareEvidenceWindows, evidenceReportForCourse, nowIso, removeEvidenceSnapshot, takeEvidenceSnapshot, type AppState } from "../../app/store.ts";
import { CHANGE_LABEL, CURRENT_ID, comparisonDocument, type ChangeKind, type SkillChange, type WindowCount } from "../../lib/snapshots.ts";
import { STAGE_LABEL } from "../../lib/evidence.ts";
import { downloadText } from "../../lib/download.ts";
import type { Person, Subject } from "../../types.ts";
import { Button, Field, Input, Select, Tag } from "../primitives/index.tsx";
import { ShareBar } from "../primitives/ShareBar.tsx";

type Props = { state: AppState; person: Person; subject: Subject; mayEdit: boolean };
const pct = (x: number | null) => (x === null ? "Unknown" : Math.round(x * 1000) / 10 + "%");
const TONE: Record<ChangeKind, "accent" | "warn" | "neutral"> = { rising: "accent", falling: "warn", steady: "neutral", "not-comparable": "neutral" };

function Count({ w }: { w: WindowCount }) {
  return <div className="watch-count"><ShareBar share={w.share} low={w.interval?.low ?? null} high={w.interval?.high ?? null} width={88} />
    <span className="tabular">{w.postings} of {w.eligible}{w.share === null ? "" : " · " + pct(w.share)}</span></div>;
}

function coverage(c: SkillChange) {
  if (!c.coverageChanged) return <span className="muted">Unchanged ({STAGE_LABEL[c.stageAfter]})</span>;
  return <span>From {STAGE_LABEL[c.stageBefore].toLowerCase()} to {STAGE_LABEL[c.stageAfter].toLowerCase()}{c.targetBefore !== c.targetAfter ? <span className="muted"> · target from {STAGE_LABEL[c.targetBefore].toLowerCase()} to {STAGE_LABEL[c.targetAfter].toLowerCase()}</span> : null}</span>;
}

export function EvidenceWatch({ state, subject, mayEdit }: Props) {
  const snapshots = state.evidenceSnapshots.filter((s) => s.subjectId === subject.id);
  const latest = snapshots[snapshots.length - 1];
  const report = evidenceReportForCourse(subject.id);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [beforeId, setBeforeId] = useState<string>("");
  const [afterId, setAfterId] = useState<string>(CURRENT_ID);
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;

  // Default comparison: the latest snapshot against the evidence as it stands now.
  const before = snapshots.find((s) => s.id === beforeId) ?? latest;
  const after = afterId === CURRENT_ID || snapshots.some((s) => s.id === afterId) ? afterId : CURRENT_ID;
  const result = before ? compareEvidenceWindows(subject.id, before.id, after) : null;
  const comparison = result?.ok ? result.comparison! : null;

  return <section className="workspace-panel" aria-labelledby="evidence-watch" data-demo-id="evidence-watch">
    <div className="section-heading"><div><h3 id="evidence-watch">Evidence over time</h3>
      <p className="muted">Freeze each review's evidence. The next window is compared with it, and the brief reports what changed.</p></div>
      <Tag>{snapshots.length} {snapshots.length === 1 ? "snapshot" : "snapshots"}</Tag></div>

    {mayEdit ? <form className="curriculum-object" aria-label="Freeze a snapshot" onSubmit={(e) => {
      e.preventDefault();
      const r = takeEvidenceSnapshot(subject.id, label);
      if (r.ok) { setLabel(""); setBeforeId(r.snapshotId!); setAfterId(CURRENT_ID); setMessage({ text: "Snapshot frozen. Collect and review new postings later, then compare here.", error: false }); }
      else setMessage({ text: r.error, error: true });
    }}>
      <div className="form-grid">
        <Field label="Snapshot name" hint={"Freezes the " + report.eligible + " reviewed postings and " + report.rows.length + " skills as they stand now. Unreviewed postings and duplicates stay out."}>
          <Input data-demo-id="snapshot-label" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 2026 Semester 1 review" /></Field>
      </div>
      {message ? <p role={message.error ? "alert" : "status"} className={message.error ? "form-error" : "save-status"}>{message.text}</p> : null}
      <Button type="submit" variant="primary" data-demo-id="snapshot-take" disabled={!label.trim()}>Freeze snapshot</Button>
    </form> : null}

    {snapshots.length ? <div className="table-scroll"><table className="evidence-table">
      <thead><tr><th scope="col">Snapshot</th><th scope="col">Frozen</th><th scope="col">Reviewed postings</th><th scope="col">Employers</th><th scope="col">Skills</th>{mayEdit ? <th scope="col" aria-label="Actions"></th> : null}</tr></thead>
      <tbody>{[...snapshots].reverse().map((s) => <tr key={s.id}>
        <th scope="row">{s.label}</th><td>{s.takenAt.slice(0, 16).replace("T", " ")} · {name(s.takenBy)}</td><td className="tabular">{s.eligible}</td><td className="tabular">{s.organisations}</td><td className="tabular">{s.skills.length}</td>
        {mayEdit ? <td><Button variant="quiet" aria-label={"Remove snapshot " + s.label} onClick={() => { removeEvidenceSnapshot(s.id); if (beforeId === s.id) setBeforeId(""); if (afterId === s.id) setAfterId(CURRENT_ID); }}>Remove</Button></td> : null}
      </tr>)}</tbody></table></div>
      : <p className="muted">No snapshot yet. Freeze one when you review this course; next term, collect again and compare.</p>}

    {before ? <div className="curriculum-object" data-demo-id="snapshot-comparison">
      <div className="section-heading"><h4>Compare two windows</h4>
        {comparison ? <Button data-demo-id="snapshot-download" onClick={() => downloadText(subject.id + "-evidence-over-time.md", comparisonDocument(subject, comparison, nowIso()))}>Download comparison (.md)</Button> : null}</div>
      <div className="form-grid">
        <Field label="Earlier"><Select data-demo-id="snapshot-before" value={before.id} onChange={(e) => setBeforeId(e.target.value)}>
          {[...snapshots].reverse().map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></Field>
        <Field label="Later"><Select data-demo-id="snapshot-after" value={after} onChange={(e) => setAfterId(e.target.value)}>
          <option value={CURRENT_ID}>Current evidence (not frozen)</option>
          {[...snapshots].reverse().filter((s) => s.id !== before.id).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></Field>
      </div>
      {!result?.ok ? <p role="alert" className="form-error">{result?.error}</p> : null}
      {comparison ? <>
        {/* Only the counts that are not zero; the note below says what the zeros mean. */}
        <div className="preparation-summary">
          {([[comparison.counts.rising, "rising"], [comparison.counts.falling, "falling"], [comparison.counts.steady, "no clear change"], [comparison.counts["not-comparable"], "not comparable"],
            [comparison.postingsAdded.length, "new postings"], [comparison.postingsGone.length, "gone"], [comparison.textChanged.length, "text changed"]] as const)
            .filter(([n]) => n > 0).map(([n, label]) => <span key={label}><strong>{n}</strong> {label}</span>)}
        </div>
        <p data-demo-id="snapshot-note">{comparison.note}</p>
        {comparison.skills.length ? <div className="table-scroll"><table className="evidence-table">
          <caption className="muted">Each count is over that window's reviewed postings; the whisker is its 95% Wilson interval.</caption>
          <thead><tr><th scope="col">Skill</th><th scope="col">{comparison.before.label}</th><th scope="col">{comparison.after.label}</th><th scope="col">Change</th><th scope="col">Coverage</th></tr></thead>
          <tbody>{comparison.skills.map((c) => <tr key={c.key}>
            <th scope="row">{c.skill}{c.newlyQuoted ? <span className="muted"> · newly quoted</span> : c.noLongerQuoted ? <span className="muted"> · no longer quoted</span> : null}</th>
            <td><Count w={c.before} /></td><td><Count w={c.after} /></td>
            <td><Tag tone={TONE[c.kind]}>{CHANGE_LABEL[c.kind]}</Tag>{c.kind === "steady" ? null : <div className="muted watch-reason">{c.reason}</div>}</td>
            <td>{coverage(c)}</td>
          </tr>)}</tbody></table></div> : <p className="muted">No skill has been quoted in either window.</p>}
        {comparison.postingsAdded.length || comparison.postingsGone.length || comparison.textChanged.length ? <details className="guide-entry"><summary><span>Postings that moved</span><Tag>{comparison.postingsAdded.length + comparison.postingsGone.length + comparison.textChanged.length}</Tag></summary>
          <div className="guide-entry-body"><ul className="source-list">
            {comparison.postingsAdded.map((p) => <li key={"a" + p.identity}><strong>New: {p.title}</strong><span>{p.organisation || "Organisation not named"}{p.sourceDate ? " · published " + p.sourceDate : ""}</span></li>)}
            {comparison.postingsGone.map((p) => <li key={"g" + p.identity}><strong>No longer in the reviewed set: {p.title}</strong><span>{p.organisation || "Organisation not named"}{p.sourceDate ? " · published " + p.sourceDate : ""}</span></li>)}
            {comparison.textChanged.map((p) => <li key={"t" + p.after.identity}><strong>Text changed: {p.after.title}</strong><span className="tabular">fingerprint {p.before.textHash} changed to {p.after.textHash}</span></li>)}
          </ul></div></details> : null}
        <p className="limitation">Rising or falling means the two intervals do not overlap, a stricter bar than a formal test, so a real shift can read as no clear change. Both windows are samples you chose: a change describes them, not the labour market.</p>
      </> : null}
    </div> : null}
  </section>;
}
