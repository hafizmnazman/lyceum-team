// The two student surveys on Learn (depth plan Section 7): the term's Course Outcome Survey and SSRT, opened for the booth
// collector with a link and a QR for phones on the laptop's network and collected; for a campus, a document for Microsoft
// Forms Quick Import, the results imported from Microsoft Forms, Google Forms or Moodle Feedback, or codes pasted back by
// students; and last term's sample surveys. The rules are on screen: no result for a term until its grades are recorded as released,
// none below the floor, and booth responses never as course evidence.

import { useState } from "react";
import { can } from "../../app/roles.ts";
import { collectBoothResponses, createCourseSurveys, getState, importSurveyRows, mayAdopt, openSurveyForCollection, publishSurveyForm, readPastedSurveyCodes, recordGradesReleased, type AppState } from "../../app/store.ts";
import { termWindow } from "../../app/loop.ts";
import { DEMO_LINE } from "../../data/sample-course/index.ts";
import { downloadBytes } from "../../lib/download.ts";
import { FORMAT_LABEL, FORMS_DOCX_LABEL, LECTURER_COMMENT_WARNING, PASTE_WARNING, RATE_CONTEXT, formsDocx, gradesReleased, respondents, shortSurveyLink, studentForm, surveyLink, surveyReleased, surveySummary,
  type ImportResult, type PasteResult, type SurveySummary } from "../../lib/surveys.ts";
import { color } from "../../theme/tokens.ts";
import type { Person, Subject, SurveyDefinition } from "../../types.ts";
import { Button, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";

const pct = (x: number | null) => (x === null ? "none" : Math.round(x * 100) + "%");
interface BoothAddress { name: string; address: string; virtual: boolean }

export function SurveysPanel({ state, person, subject }: { state: AppState; person: Person; subject: Subject }) {
  const [message, setMessage] = useState("");
  const term = termWindow(state, subject.id).term;
  const mayPrepare = can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments });
  const released = term ? gradesReleased(state.events, subject.id, term) : null;
  const current = state.surveys.filter((s) => s.subjectId === subject.id && !s.sample && s.term === term);
  const samples = state.surveys.filter((s) => s.subjectId === subject.id && s.sample);
  const p = state.institution;
  return <section className="workspace-panel" aria-labelledby="learn-surveys" data-demo-id="learn-surveys">
    <div className="section-heading"><div><h2 id="learn-surveys">The two student surveys</h2>
      <p className="muted">Nothing stored identifies a student. No result for a term shows until its grades are recorded as released, aggregates and comments alike, and none shows below the floor: {p.surveyFloor} responses and {Math.round(p.surveyFloorShare * 100)}% of the class, the stricter applied.</p></div>
      {term && !released && mayAdopt(subject.id, person) ? <Button onClick={() => { const r = recordGradesReleased(subject.id, term); setMessage(r.ok ? "" : r.error); }} data-demo-id="grades-release">Record grades released for {term}</Button> : null}</div>
    <p data-demo-id="grades-status">{!term ? "Set the term on the Course step first; a survey belongs to a term."
      : released ? "Grades for " + term + " were recorded as released on " + released.at.slice(0, 10) + ", so this term's results show once a survey reaches its floor."
      : "Grades for " + term + " are not recorded as released, so this term's surveys show their count and nothing else."}</p>
    {message ? <p role="status" className="save-status">{message}</p> : null}
    {term && !current.length ? (mayPrepare
      ? <Button variant="primary" onClick={() => { const r = createCourseSurveys(subject.id); setMessage(r.ok ? "" : r.error); }} data-demo-id="surveys-create">Prepare this term's two surveys</Button>
      : <p className="muted">An assigned lecturer or coordinator prepares the term's surveys.</p>) : null}
    {current.map((def) => <SurveyCard key={def.id} state={state} subject={subject} def={def} mayPrepare={mayPrepare} />)}
    {samples.length ? <section className="sample-surveys" aria-labelledby="sample-surveys-title" data-demo-id="sample-surveys">
      <div className="section-heading"><h3 id="sample-surveys-title">Last term's surveys</h3><Tag tone="warn">Sample, synthetic</Tag></div>
      <p className="muted">{DEMO_LINE}</p>
      {samples.map((def) => <SurveyCard key={def.id} state={state} subject={subject} def={def} mayPrepare={false} />)}
    </section> : null}
  </section>;
}

function SurveyCard({ state, subject, def, mayPrepare }: { state: AppState; subject: Subject; def: SurveyDefinition; mayPrepare: boolean }) {
  const responses = state.surveyResponses.filter((r) => r.formId === def.id);
  const booth = responses.filter((r) => r.source === "booth");
  // Booth responses are a demonstration of the collector; the course's results count every other source.
  const summary = surveySummary(def, responses.filter((r) => r.source !== "booth"), state.institution, surveyReleased(def, state.events));
  const f = summary.floor;
  const floorText = "the floor is " + f.required + (f.share !== null ? " (" + f.count + ", and " + f.sharePercent + "% of " + f.classSize + ")" : " (" + f.count + "; the class size is not recorded, so only the count applies)");
  const items = def.questions.filter((q) => q.kind === "scale").length;
  return <article className={"survey-card" + (def.sample ? " is-sample" : "")} data-demo-id={"survey-" + def.id}>
    <div className="section-heading"><div><h4>{def.title}</h4><span className="muted">{def.term} · version {def.versionId ?? "not recorded"} · {items} items and {def.questions.length - items} open {def.questions.length - items === 1 ? "comment" : "comments"}</span></div>
      <span className="tag-row">{def.sample ? <Tag tone="warn">Sample, synthetic</Tag> : null}{def.instrumentNote ? <Tag tone="warn">Demo instrument, unvalidated</Tag> : null}</span></div>
    {def.instrumentNote ? <p className="limitation">{def.instrumentNote}</p> : null}
    <p data-demo-id={"survey-status-" + def.id}>{summary.respondents} {summary.respondents === 1 ? "response" : "responses"}{summary.rate ? " (" + summary.rate + ")" : ""}; {floorText}; {summary.released ? "grades are released" : "results open when grades are released"}{summary.open ? "." : ": nothing beyond the count shows."}</p>
    {!def.sample && mayPrepare ? <BoothCollector state={state} subject={subject} def={def} /> : null}
    {booth.length ? <p className="booth-responses" data-demo-id={"booth-" + def.id}><Tag tone="warn">Not course evidence</Tag> <strong>Booth responses: {respondents(booth)} from {respondents(booth)} {respondents(booth) === 1 ? "device" : "devices"}.</strong> A demonstration of the collector, not course evidence: they never count in the OBE report or the recap, and their answers are not shown.</p> : null}
    {summary.open ? <SurveyResults def={def} summary={summary} /> : null}
    {!def.sample && mayPrepare ? <CampusWays state={state} subject={subject} def={def} /> : null}
  </article>;
}

function SurveyResults({ def, summary }: { def: SurveyDefinition; summary: SurveySummary }) {
  return <div className="survey-results" data-demo-id={"survey-results-" + def.id}>
    <table className="record-table">
      <caption>Each item over the students who chose a point; "cannot say" and unanswered are counted, never in the mean</caption>
      <thead><tr><th scope="col">Item</th><th scope="col">n</th><th scope="col">Cannot say</th><th scope="col">Mean, {def.scale.min} to {def.scale.max}</th><th scope="col">{def.scale.target} or higher</th></tr></thead>
      <tbody>{summary.items.map((it) => <tr key={it.id}><th scope="row" data-label="Item">{it.text}</th><td data-label="n">{it.n}{it.unanswered ? " (" + it.unanswered + " unanswered)" : ""}</td>
        <td data-label="Cannot say">{it.cannotSay}</td><td data-label="Mean">{it.mean === null ? "none" : it.mean.toFixed(2)}</td><td data-label={def.scale.target + " or higher"}>{it.atTarget} of {it.n}, {pct(it.share)}</td></tr>)}</tbody>
    </table>
    {summary.rate ? <p className="muted">The response rate, {summary.rate}, beside its context, not a standard: {RATE_CONTEXT}</p> : null}
    {summary.comments.map((c) => <div key={c.id} className="survey-comments">
      <h5>{c.text}</h5>
      <p className="muted">{LECTURER_COMMENT_WARNING}</p>
      {c.answers.length ? <ul>{c.answers.map((a, i) => <li key={i}>{a}</li>)}</ul> : <p className="muted">No comment.</p>}
    </div>)}
  </div>;
}

/** Open a survey for the booth collector, show the link and its QR to phones on the laptop's network, and collect. */
function BoothCollector({ state, subject, def }: { state: AppState; subject: Subject; def: SurveyDefinition }) {
  const [classSize, setClassSize] = useState(def.classSize ? String(def.classSize) : "");
  const [link, setLink] = useState<{ short: string | null; long: string; qr: string | null } | null>(null);
  const [addresses, setAddresses] = useState<BoothAddress[]>([]);
  const [chosen, setChosen] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function show(address?: string) {
    const fresh = getState().surveys.find((x) => x.id === def.id)!;
    let origin = window.location.origin;
    // On the booth laptop the page is on localhost; phones need the laptop's address on the hotspot, which the lecturer can
    // change when the laptop has more than one (the collector ranks Wi-Fi first and virtual adapters last).
    if (/^(localhost|127\.)/.test(window.location.hostname)) {
      let list = addresses;
      if (!list.length) {
        try {
          const res = await fetch("/api/survey/address");
          list = res.ok ? ((await res.json()) as { addresses?: BoothAddress[] }).addresses ?? [] : [];
        } catch { list = []; /* no collector: the long link still carries the form */ }
        setAddresses(list);
      }
      const pick = list.find((a) => a.address === address) ?? list[0];
      if (pick) { origin = window.location.protocol + "//" + pick.address + (window.location.port ? ":" + window.location.port : ""); setChosen(pick.address); }
    }
    const published = await publishSurveyForm(def.id);
    const demoLine = state.courseDefinitions[subject.id]?.sample ? DEMO_LINE : null;
    const long = surveyLink(origin, studentForm(fresh, subject, state.institution, demoLine));
    const short = published.ok ? shortSurveyLink(origin, fresh.formToken!) : null;
    let qr: string | null = null;
    try {
      const QR = (await import("qrcode")).default;
      qr = await QR.toDataURL(short ?? long, { errorCorrectionLevel: "M", margin: 2, width: 320, color: { dark: color.forest, light: color.white } });
    } catch { qr = null; }
    setLink({ short, long, qr });
    setMessage(published.ok ? "" : published.error);
  }
  async function open() {
    setBusy(true); setMessage("");
    const r = await openSurveyForCollection(def.id, classSize.trim() ? Number(classSize) : null);
    if (r.ok) await show(); else setMessage(r.error);
    setBusy(false);
  }
  async function collect() {
    setBusy(true);
    const r = await collectBoothResponses(def.id);
    setMessage(r.ok ? (r.added ? r.added + " new booth " + (r.added === 1 ? "response" : "responses") + " collected." : "No new responses yet.") : r.error);
    setBusy(false);
  }
  return <div className="booth-collector" data-demo-id={"booth-collector-" + def.id}>
    {!def.formToken ? <div className="booth-open">
      <Field label="Class size, the students listed" hint="The floor's share and the response rate are over it; leave it blank when it is not known."><Input type="number" min={1} max={5000} value={classSize} onChange={(e) => setClassSize(e.target.value)} data-demo-id={"survey-class-" + def.id} /></Field>
      <Button onClick={() => void open()} disabled={busy} data-demo-id={"survey-open-" + def.id}>Open for the booth collector</Button>
    </div> : !link ? <Button onClick={() => void show()} disabled={busy} data-demo-id={"survey-show-" + def.id}>Show the link and the QR</Button>
      : <div className="booth-link" data-demo-id={"survey-link-" + def.id}>
        {link.qr ? <img className="booth-qr" src={link.qr} alt={"A QR code for this survey's link: " + (link.short ?? "the long link")} /> : null}
        <div>
          <p className="muted">Phones on this laptop's network open the form here; students need no account, and nothing asks who they are.</p>
          {addresses.length > 1 ? <Field label="The address phones open" hint="The laptop's network the phones are on, usually the hotspot's Wi-Fi.">
            <Select value={chosen} onChange={(e) => void show(e.target.value)} data-demo-id={"survey-address-" + def.id}>
              {addresses.map((a) => <option key={a.name + a.address} value={a.address}>{a.name}, {a.address}{a.virtual ? " (virtual adapter: phones cannot reach it)" : ""}</option>)}
            </Select></Field> : null}
          <p><code className="booth-url">{link.short ?? link.long}</code></p>
          {link.short ? <details><summary>The long link, which carries the whole form in itself; answers still come to this laptop</summary><p><code className="booth-url">{link.long}</code></p></details> : null}
          <div className="button-row">
            <Button onClick={() => { void navigator.clipboard?.writeText(link.short ?? link.long); setMessage("Link copied."); }}>Copy the link</Button>
            <Button variant="primary" onClick={() => void collect()} disabled={busy} data-demo-id={"survey-collect-" + def.id}>Collect responses</Button>
          </div>
        </div>
      </div>}
    {message ? <p role="status" className="save-status">{message}</p> : null}
  </div>;
}

/** A campus's ways in when the booth collector is not there (Section 7.2): the survey as a document for Microsoft Forms Quick
 *  Import, the results imported from Microsoft Forms, Google Forms or Moodle Feedback, and the paste way. */
function CampusWays({ state, subject, def }: { state: AppState; subject: Subject; def: SurveyDefinition }) {
  return <div className="campus-ways" data-demo-id={"campus-ways-" + def.id}>
    <h5>For a campus: other ways in</h5>
    <FormsDocument subject={subject} def={def} />
    <ResultsImport def={def} />
    <PasteWay state={state} subject={subject} def={def} />
  </div>;
}

/** The survey as a Word file shaped for Microsoft Forms Quick Import, each question's id kept at the start of its text. */
function FormsDocument({ subject, def }: { subject: Subject; def: SurveyDefinition }) {
  const [message, setMessage] = useState("");
  async function download() {
    try {
      downloadBytes(def.id + "-for-microsoft-forms.docx", await formsDocx(def, subject.id + " " + subject.title), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      setMessage("");
    } catch {
      setMessage("The document could not be written in this browser.");
    }
  }
  return <div className="forms-document">
    <Button onClick={() => void download()} data-demo-id={"survey-docx-" + def.id}>Download for Microsoft Forms (.docx)</Button>
    <p className="muted">{FORMS_DOCX_LABEL} Keep each question's id (Q1., Q2., ...) at the start of its text, so the results import matches on it.</p>
    {message ? <p role="status" className="save-status">{message}</p> : null}
  </div>;
}

/** Import an export from Microsoft Forms (.xlsx), Google Forms or Moodle Feedback (.csv), the format read from its header. */
function ResultsImport({ def }: { def: SurveyDefinition }) {
  const [message, setMessage] = useState("");
  const said = (r: ImportResult) => "Read as " + FORMAT_LABEL[r.format] + ": " + r.responses.length + " responses imported from " + r.rows + " rows"
    + (r.timed ? (r.duplicates ? "; " + r.duplicates + " repeated " + (r.duplicates === 1 ? "row" : "rows") + " dropped" : "") : "; the file has no time column, so no row was taken for a repeat")
    + (r.dropped.length ? "; dropped at import: " + r.dropped.join(", ") : "") + (r.unmatched.length ? "; columns with no matching question id: " + r.unmatched.length : "")
    + (r.skippedAnswers ? "; " + r.skippedAnswers + " answers fit no scale point" : "") + ".";
  async function read(file: File) {
    try {
      const XLSX = await import("xlsx");
      // A CSV is read as text, cell for cell, so a date or a number stays as the export wrote it.
      const book = /\.csv$/i.test(file.name) ? XLSX.read(await file.text(), { type: "string", raw: true }) : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, raw: true, defval: null }) as unknown[][];
      const r = importSurveyRows(def.id, rows);
      setMessage(r.ok && r.result ? said(r.result) : "error" in r ? r.error : "Nothing was imported.");
    } catch {
      setMessage("The file could not be read as a spreadsheet.");
    }
  }
  return <div className="forms-import">
    <Field label="Import results: Microsoft Forms (.xlsx), Google Forms or Moodle Feedback (.csv)" hint="Matched on the id at the start of each question (Q1., Q2., ...). Names, emails and the like are dropped at import; a row repeated with the same time and answers is counted and dropped. The Moodle Feedback importer has not been tried on a Moodle export yet.">
      <Input type="file" accept=".xlsx,.csv" onChange={(e) => { const file = e.target.files?.[0]; if (file) void read(file); e.target.value = ""; }} data-demo-id={"survey-import-" + def.id} />
    </Field>
    {message ? <p role="status" className="save-status" data-demo-id={"survey-import-result-" + def.id}>{message}</p> : null}
  </div>;
}

/** The paste way, for a campus with neither the collector nor Forms: a link that gives each student a code to paste into the
 *  course page or an email, and a box that reads the codes back. */
function PasteWay({ state, subject, def }: { state: AppState; subject: Subject; def: SurveyDefinition }) {
  const [codes, setCodes] = useState("");
  const [message, setMessage] = useState("");
  const said = (r: PasteResult) => r.codes + (r.codes === 1 ? " code" : " codes") + " read: " + r.responses.length + " added"
    + (r.repeated ? ", " + r.repeated + " repeated from a device already read" : "") + (r.otherSurvey ? ", " + r.otherSurvey + " for another survey, refused" : "")
    + (r.unreadable ? ", " + r.unreadable + " that do not read" : "") + ".";
  const link = def.formToken ? surveyLink(window.location.origin, studentForm(def, subject, state.institution, state.courseDefinitions[subject.id]?.sample ? DEMO_LINE : null, "paste")) : null;
  function read() {
    const r = readPastedSurveyCodes(def.id, codes);
    setMessage(r.ok && r.result ? said(r.result) : "error" in r ? r.error : "Nothing was read.");
    if (r.ok && r.result?.responses.length) setCodes("");
  }
  return <details className="paste-way" data-demo-id={"paste-way-" + def.id}>
    <summary>The paste way, for a campus with neither the collector nor Forms</summary>
    {!link ? <p className="muted">Open the survey above first; its link and its codes are bound to it.</p> : <>
      <p className="muted">Share this link on the course page. Each student answers and gets a code to paste into the course page or an email, and the page tells them: "{PASTE_WARNING}" The app keeps the answers and a random id from each device, never who pasted a code.</p>
      <Field label="The paste way's link" hint="It carries the whole form, so no collector is needed, and the student's page sends nothing.">
        <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} data-demo-id={"paste-link-" + def.id} />
      </Field>
      <div className="button-row"><Button onClick={() => { void navigator.clipboard?.writeText(link); setMessage("Link copied."); }}>Copy the link</Button></div>
      <Field label="Paste the codes" hint="As many as you like, in any text around them: each starts LYC1-. A device counts once; a code for another survey is refused.">
        <Textarea value={codes} onChange={(e) => setCodes(e.target.value)} rows={4} data-demo-id={"paste-codes-" + def.id} />
      </Field>
      <Button onClick={read} disabled={!codes.trim()} data-demo-id={"paste-read-" + def.id}>Read the codes</Button>
    </>}
    {message ? <p role="status" className="save-status" data-demo-id={"paste-result-" + def.id}>{message}</p> : null}
  </details>;
}
