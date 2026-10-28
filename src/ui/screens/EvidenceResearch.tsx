// The lecturer's research run: fetch postings from a permitted board on request,
// keep the ones worth reading, scan them for the skills the lecturer names,
// confirm each exact quotation, vouch for the extraction, then turn the result
// into a meeting brief that can be downloaded or sent to a colleague.

import { useEffect, useState } from "react";
import {
  addProposals, openWatchRun, clearCollection, clearProposals, definitionForCourse, navigate, confirmProposals, dismissProposal, downloadPack, evidenceTrendNote, importCollectedPostings, nowIso, prepareEvidenceBrief, runCollection,
  scanForRequirements, selectBrief, sendEvidenceBrief, setSkillLexicon, setSourcesReviewed, type AppState,
} from "../../app/store.ts";
import { briefDeck } from "../../lib/slides.ts";
import { BOARD_TOKEN, SOURCE_POLICIES, matchedKeywords, parseKeywords } from "../../lib/collect.ts";
import { RECOMMENDATION_LABEL, REQUIREMENT_LEVELS, evidenceReport, parseLexicon, type MentionProposal } from "../../lib/evidence.ts";
import { downloadText } from "../../lib/download.ts";
import type { BriefRecommendation, CollectionProvider, MentionRequirement, Person, Subject } from "../../types.ts";
import { Button, Disclosure, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";
import { Meter, SourcePane } from "../primitives/loop.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";
import { fetchQuoteProposals, watchApi, type WatchRun, type WatchSchedule } from "../../agents/client.ts";
import { quoteRequest } from "../../lib/proposals.ts";

type Props = { state: AppState; person: Person; subject: Subject; mayEdit: boolean };
const PROVIDERS = Object.keys(SOURCE_POLICIES) as CollectionProvider[];

export function ResearchRun({ state, subject, mayEdit }: Props) {
  const [provider, setProvider] = useState<CollectionProvider>("agent");
  const [board, setBoard] = useState("");
  // The agent's brief starts from where the course's graduates go, as onboarding or the course brief recorded it.
  const [brief, setBrief] = useState(() => definitionForCourse(subject.id)?.brief.targetRoles ?? "");
  // Agent web search is the default source; when .env does not set it up yet, the panel says what is missing.
  const [agentMissing, setAgentMissing] = useState<string[] | null>(null);
  useEffect(() => {
    fetch("/api/agent-settings").then((r) => (r.ok ? r.json() : null)).then((d: { missing?: string[] } | null) => setAgentMissing(d && Array.isArray(d.missing) ? d.missing : null))
      .catch(() => setAgentMissing(null));
  }, []);
  const [query, setQuery] = useState("");
  const [inText, setInText] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const run = state.collectRun && state.collectRun.subjectId === subject.id ? state.collectRun : null;
  const policy = SOURCE_POLICIES[provider];
  const postings = run?.status === "done" ? run.postings : [];
  const keywords = parseKeywords(run?.query ?? "");
  const imported = new Set(state.evidenceSources.filter((s) => s.subjectId === subject.id).map((s) => s.collection?.postingId ?? ""));
  const agent = provider === "agent";
  const boardOk = provider === "sample" || (agent ? brief.trim().length >= 3 : BOARD_TOKEN.test(board.trim()));
  async function fetchNow() {
    setMessage(""); setSelected([]);
    const result = await runCollection(subject.id, { provider, board: agent ? brief : board, query, inText });
    if (!result.ok) setMessage(result.error);
  }
  return <section className="workspace-panel" aria-labelledby="research-run">
    <div className="section-heading"><div><h3 id="research-run">Research run</h3><p className="muted">Fetch postings from a permitted employer board or the dated saved sample, then keep the ones worth reading.</p></div></div>
    {mayEdit ? <>
      <div className="form-grid form-grid-wide-first">
        <Field label="Source"><Select data-demo-id="collect-provider" value={provider} onChange={(e) => { setProvider(e.target.value as CollectionProvider); setMessage(""); }}>{PROVIDERS.map((p) => <option key={p} value={p}>{SOURCE_POLICIES[p].name}</option>)}</Select></Field>
        {agent ? <Field label="What should the agent look for?" hint="Roles, place and anything else that matters. The model and search provider are chosen in Settings."><Input data-demo-id="collect-brief" maxLength={300} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. data analyst internships in Malaysia posted this year" /></Field> : null}
        {provider !== "sample" && !agent ? <Field label="Employer board token" hint={provider === "greenhouse" ? "The name in boards.greenhouse.io/NAME, or in an employer's careers link." : "The name in jobs.lever.co/NAME."}><Input data-demo-id="collect-board" maxLength={80} value={board} onChange={(e) => setBoard(e.target.value)} placeholder={provider === "greenhouse" ? "e.g. stripe" : "e.g. palantir"} /></Field> : null}
        <Field label="Role keywords" hint="Comma-separated, matched against posting titles."><Input data-demo-id="collect-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. data analyst, analytics" /></Field>
      </div>
      <label className="checkbox-line"><input type="checkbox" checked={inText} onChange={(e) => setInText(e.target.checked)} />Also match keywords inside the posting text</label>
      <details className="guide-entry"><summary><span>Source policy: {policy.name}</span><Tag tone={policy.enabled ? "ok" : "warn"}>{policy.enabled ? "Permitted on request" : "Disabled"}</Tag></summary>
        <div className="guide-entry-body"><dl className="context-list"><div><dt>Owner</dt><dd>{policy.owner}</dd></div><div><dt>Method</dt><dd>{policy.method}</dd></div><div><dt>Retention</dt><dd>{policy.retention}</dd></div><div><dt>Refresh</dt><dd>{policy.refresh}</dd></div><div><dt>Policy reviewed</dt><dd>{policy.policyReviewedOn}</dd></div></dl><p className="muted">{policy.note}</p></div></details>
      <div className="button-row">
        <Button variant="primary" data-demo-id="collect-run" loading={run?.status === "running"} disabled={!boardOk} onClick={() => void fetchNow()}>{run?.status === "running" ? (agent ? "Agent searching..." : "Fetching...") : agent ? "Run agent search" : "Fetch postings"}</Button>
        {agent ? <Button onClick={() => navigate("settings")}>Agent settings</Button> : null}
        {run ? <Button onClick={() => { clearCollection(); setSelected([]); setMessage(""); }}>Clear results</Button> : null}
      </div>
      {provider !== "sample" ? <WatchPanel state={state} subject={subject} imported={imported} source={{ provider, board: agent ? brief : board, query, inText }} sourceOk={boardOk} /> : null}
      {agent && agentMissing?.length ? <p className="form-error">Agent search is not set up yet. Add {agentMissing.join(", ")} to .env (see Settings), or choose another source.</p> : null}
      {message ? <p role="alert" className="form-error">{message}</p> : null}
      {run ? <div data-demo-id="collect-log"><div className="button-row"><h4>Collection log</h4>{run.status === "running" ? <Tag tone="warn">Fetching now</Tag> : run.status === "failed" ? <Tag tone="danger">Failed</Tag> : run.provider === "sample" ? <Tag>Saved sample, no network</Tag> : run.provider === "agent" ? <Tag tone="accent">Found by the agent, read live</Tag> : run.cached ? <Tag tone="accent">Local cache of a live fetch</Tag> : <Tag tone="ok">Fetched live</Tag>}</div>
        <ol className="collect-log" aria-live="polite">{run.log.map((line, i) => <li key={i}>{line}</li>)}</ol></div> : null}
      {run?.status === "failed" ? <p role="alert" className="form-error">{run.error}</p> : null}
      {run?.status === "done" ? <div>
        <p role="status" className="save-status" data-demo-id="collect-status">{postings.length} of {run.total} postings match{run.query ? " \"" + run.query + "\"" : ""} on {run.label}. Retrieved {run.retrievedAt}{run.cached ? ", served from the local cache" : ""}. Publication dates are shown as published; the retrieval time is kept separately.</p>
        {postings.length ? <>
          <div className="button-row">
            <Button data-demo-id="collect-select-all" onClick={() => setSelected(postings.filter((p) => !imported.has(p.id)).map((p) => p.id))}>Select all shown</Button>
            <Button onClick={() => setSelected([])}>Clear selection</Button>
            <Button variant="primary" data-demo-id="collect-import" disabled={!selected.length} onClick={() => {
              const result = importCollectedPostings(subject.id, selected);
              setMessage(result.ok ? "" : result.error);
              if (result.ok) setSelected([]);
            }}>Import {selected.length ? selected.length + " " : ""}selected as sources</Button>
          </div>
          <div className="table-scroll"><table className="evidence-table">
            <thead><tr><th scope="col">Keep</th><th scope="col">Title</th><th scope="col">Employer</th><th scope="col">Location</th><th scope="col">Published</th><th scope="col">Matched</th></tr></thead>
            <tbody>{postings.map((p) => <tr key={p.id}>
              <td><input type="checkbox" aria-label={"Keep " + p.title} data-demo-id={"collect-select-" + p.id} checked={selected.includes(p.id)} disabled={imported.has(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))} /></td>
              <th scope="row">{p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}{imported.has(p.id) ? <> <Tag>Imported</Tag></> : null}</th>
              <td>{p.organisation}</td><td>{p.location || "Not stated"}</td><td className="tabular">{p.publishedAt ? p.publishedAt.slice(0, 10) : "Not supplied"}</td>
              <td>{matchedKeywords(p, keywords).join(", ") || (keywords.length ? "text only" : "all")}</td>
            </tr>)}</tbody>
          </table></div>
        </> : <p>No posting matched. Widen the keywords or search inside the text.</p>}
      </div> : null}
    </> : <p className="muted">Only assigned lecturers and coordinators can run a collection for this course.</p>}
  </section>;
}

const when = (at: string) => new Date(at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** Watch on a schedule (server/watch.ts): the server runs this source every few days and keeps each run; the lecturer opens a
 *  run and imports what it wants, as after a run by hand. Needs a signed-in account, since the server does the watching. */
function WatchPanel({ state, subject, imported, source, sourceOk }: { state: AppState; subject: Subject; imported: Set<string>;
  source: { provider: CollectionProvider; board: string; query: string; inText: boolean }; sourceOk: boolean }) {
  const [schedule, setSchedule] = useState<WatchSchedule | null>(null);
  const [runs, setRuns] = useState<WatchRun[]>([]);
  const [everyDays, setEveryDays] = useState(7);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const signedIn = Boolean(state.account);
  useEffect(() => {
    if (!signedIn) return;
    void watchApi(subject.id, "GET").then((r) => { if (r.ok) { setSchedule(r.schedule ?? null); setRuns(r.runs ?? []); if (r.schedule) setEveryDays(r.schedule.everyDays); } else setMessage(r.error ?? ""); });
  }, [signedIn, subject.id]);
  if (!signedIn) return <p className="muted" data-demo-id="watch-schedule">Watching on a schedule needs a signed-in account: the server runs it while Lyceum is closed.</p>;
  const act = async (label: string, call: () => ReturnType<typeof watchApi>, done: string) => {
    setBusy(label); setMessage("");
    const r = await call();
    setBusy("");
    if (!r.ok) { setMessage(r.error ?? ""); return; }
    if ("schedule" in r) setSchedule(r.schedule ?? null);
    if (r.runs) setRuns(r.runs);
    setMessage(done);
  };
  const open = async (run: WatchRun) => {
    const full = run.postings.length || run.status === "failed" ? run : (await watchApi(subject.id, "GET", "/runs/" + run.id)).run;
    if (full) openWatchRun(subject.id, full, schedule?.query ?? "", schedule?.inText ?? false);
  };
  const latest = runs[0];
  const fresh = latest ? latest.postings.filter((p) => !imported.has(p.id)).length : 0;
  return <div className="curriculum-object" data-demo-id="watch-schedule">
    <div className="section-heading"><div><h4>Watch on a schedule</h4>
      <p className="muted">{schedule
        ? "Watching " + (schedule.provider === "agent" ? "with the agent: \"" + schedule.board + "\"" : SOURCE_POLICIES[schedule.provider].name + " \"" + schedule.board + "\"") + " every " + schedule.everyDays + " days. Next run " + when(schedule.nextRunAt) + "."
        : "Run this source every few days on the server, even while Lyceum is closed. Each run is kept; you open it and import what you want."}</p></div></div>
    <div className="button-row">
      <Field label="Every (days)"><Input type="number" min={1} max={90} value={everyDays} onChange={(e) => setEveryDays(Number(e.target.value))} style={{ width: 90 }} /></Field>
      <Button variant={schedule ? undefined : "primary"} data-demo-id="watch-save" loading={busy === "save"} disabled={!sourceOk} onClick={() => void act("save",
        () => watchApi(subject.id, "PUT", "", { ...source, everyDays }), "Saved. The first run is due now; it runs within 15 minutes, or run it now.")}>{schedule ? "Update the schedule" : "Watch this source"}</Button>
      {schedule ? <>
        <Button data-demo-id="watch-run-now" loading={busy === "run"} onClick={() => void act("run", () => watchApi(subject.id, "POST", "/run", undefined, 7 * 60 * 1000), "Run finished.")}>Run now</Button>
        <Button variant="quiet" loading={busy === "stop"} onClick={() => void act("stop", async () => ({ ...(await watchApi(subject.id, "DELETE")), schedule: null }), "Stopped watching. Past runs are kept.")}>Stop watching</Button>
      </> : null}
    </div>
    {message ? <p role="status" className="save-status">{message}</p> : null}
    {latest ? <p className="save-status" data-demo-id="watch-new">{latest.status === "failed" ? "The last run, " + when(latest.ranAt) + ", failed: " + latest.error
      : fresh + " new " + (fresh === 1 ? "posting" : "postings") + ", not yet imported, in the run of " + when(latest.ranAt) + "."}</p> : null}
    {runs.length ? <ul className="source-list">{runs.map((r) => <li key={r.id}><strong>{when(r.ranAt)}</strong>
      <span>{r.status === "failed" ? "Failed: " + r.error : r.postings.length ? r.postings.length + " of " + r.total + " postings kept" : r.total + " postings at the source"}</span>
      {r.status === "ok" ? <Button variant="quiet" data-demo-id={"watch-open-" + r.id} onClick={() => void open(r)}>Open</Button> : null}</li>)}</ul> : null}
  </div>;
}

/** Report, Quote: name the skills, scan the kept postings, and judge each proposed sentence beside its source. */
export function QuoteProposals({ state, subject, mayEdit }: Props) {
  const saved = state.skillLexicon[subject.id] ?? [];
  const [terms, setTerms] = useState(saved.join(", "));
  const [message, setMessage] = useState("");
  const [levels, setLevels] = useState<Record<string, MentionRequirement>>({});
  const proposals = state.scanProposals.filter((p) => state.evidenceSources.some((s) => s.id === p.sourceId && s.subjectId === subject.id));
  const key = (p: MentionProposal) => p.sourceId + "|" + p.term;
  const postings = state.evidenceSources.filter((s) => s.subjectId === subject.id && s.kind === "job-posting" && !s.duplicateOf);
  const dirty = JSON.stringify(parseLexicon(terms)) !== JSON.stringify(saved);
  useUnsavedEditor(dirty);
  const withLevel = (p: MentionProposal) => ({ ...p, requirement: levels[key(p)] ?? p.requirement });
  const [lensBusy, setLensBusy] = useState(false);
  // Lens reads the least-quoted postings; every quotation it returns was found word for word in its posting.
  const askLens = async () => {
    const request = quoteRequest(postings, state.skillMentions.filter((m) => m.subjectId === subject.id), saved);
    setLensBusy(true);
    const result = await fetchQuoteProposals(request);
    setLensBusy(false);
    setMessage(result.ok ? "Lens read " + request.postings.length + " postings and proposed " + addProposals(subject.id, result.list) + " quotations, each found word for word in its posting. Confirm the ones you accept." : result.error);
  };
  if (!mayEdit) return <p className="muted">Only assigned lecturers and coordinators can quote evidence for this course.</p>;
  return <section aria-labelledby="requirement-scan">
    <div className="section-heading"><div><h3 id="requirement-scan">Proposed quotations</h3><p className="muted">Name the skills, then scan the kept postings for them.</p></div>
      <div className="button-row">
      <Button variant="primary" data-demo-id="scan-run" disabled={dirty || !saved.length || !postings.length} onClick={() => {
        const result = scanForRequirements(subject.id);
        setMessage(result.ok ? result.count + " proposals across " + postings.length + " postings. Confirm the quotations you accept." : result.error);
        setLevels({});
      }}>Scan postings</Button>
      <Button data-demo-id="lens-run" loading={lensBusy} disabled={!postings.length} onClick={() => void askLens()}>Find with Lens</Button></div></div>
    <Disclosure summary={saved.length ? "Skills to look for: " + saved.length + " saved" : "Skills to look for"} defaultOpen={!saved.length} data-demo-id="lexicon">
      <Field label="Skills to look for" hint="Comma-separated. Use | for an alias, for example machine learning|ML. Matching is whole-word and case-insensitive."><Textarea data-demo-id="lexicon-terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. SQL, Python, dashboards|dashboard, data visualisation, stakeholders|stakeholder" /></Field>
      <Button data-demo-id="lexicon-save" disabled={!dirty} onClick={() => { const result = setSkillLexicon(subject.id, parseLexicon(terms)); setMessage(result.ok ? "Terms saved with the course. Scan the postings next." : result.error); }}>Save terms</Button>
    </Disclosure>
    {message ? <p role="status" className="save-status">{message}</p> : null}
    {proposals.length ? <>
      <div className="button-row proposal-actions">
        <Button variant="primary" data-demo-id="scan-confirm-all" onClick={() => { const result = confirmProposals(subject.id, proposals.map(withLevel)); setMessage(result.added + " quotations recorded, " + result.skipped + " skipped."); }}>Confirm all {proposals.length}</Button>
        <Button onClick={() => clearProposals()}>Dismiss all</Button>
      </div>
      <ol className="proposal-list">{proposals.map((p) => { const source = state.evidenceSources.find((s) => s.id === p.sourceId)!; return <li key={key(p)} className="proposal-item">
        <div className="proposal-side">
          <span className="eyebrow">Proposed quotation · {p.skill}</span>
          <blockquote className="proposal-quote">{p.excerpt}</blockquote>
          <Field label={"Requirement level for " + p.skill}><Select aria-label={"Requirement level for " + p.skill + " in " + p.sourceTitle} value={levels[key(p)] ?? p.requirement} onChange={(e) => setLevels({ ...levels, [key(p)]: e.target.value as MentionRequirement })}>{REQUIREMENT_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
          <div className="button-row"><Button variant="primary" onClick={() => confirmProposals(subject.id, [withLevel(p)])}>Confirm</Button><Button variant="quiet" onClick={() => dismissProposal(p.sourceId, p.term)}>Dismiss</Button></div>
        </div>
        <SourcePane source={source} excerpt={p.excerpt} term={p.term.split("|")[0]} />
      </li>; })}</ol>
    </> : saved.length ? <p className="muted">No proposal waiting. Scan the postings to propose quotations, or quote one by hand below.</p> : null}
  </section>;
}

/** Report, Review: the denominator. A posting counts only once the lecturer vouches that its extraction is complete. */
export function DenominatorReview({ state, subject, mayEdit }: Props) {
  const [ack, setAck] = useState(false);
  const postings = state.evidenceSources.filter((s) => s.subjectId === subject.id && s.kind === "job-posting" && !s.duplicateOf);
  const duplicates = state.evidenceSources.filter((s) => s.subjectId === subject.id && s.duplicateOf).length;
  const unreviewed = postings.filter((s) => !s.reviewed);
  const reviewed = postings.length - unreviewed.length;
  return <section aria-labelledby="denominator">
    <h3 id="denominator">The reviewed denominator</h3>
    <Meter value={reviewed} max={postings.length} label={<><strong className="tabular">{reviewed} of {postings.length}</strong> kept postings reviewed</>}
      note={duplicates ? duplicates + " duplicate " + (duplicates === 1 ? "copy" : "copies") + " set aside: each counts once, through its original." : "No duplicate copies."} />
    {mayEdit && unreviewed.length ? <div className="curriculum-object">
      <label className="checkbox-line"><input type="checkbox" data-demo-id="review-all-ack" checked={ack} onChange={(e) => setAck(e.target.checked)} />I have checked the quotations for these {unreviewed.length} postings, or deliberately skipped what the course does not need.</label>
      <Button variant="primary" data-demo-id="review-all" disabled={!ack} onClick={() => { setSourcesReviewed(subject.id, unreviewed.map((s) => s.id), true); setAck(false); }}>Mark {unreviewed.length} postings reviewed</Button>
    </div> : postings.length ? <p className="muted">All reviewed. Unmark one to revisit it.</p> : <p className="muted">No posting kept yet. Keep postings in Watch first.</p>}
  </section>;
}

export function MeetingBriefPanel({ state, person, subject, mayEdit }: Props) {
  const [recommendation, setRecommendation] = useState<BriefRecommendation>("undecided");
  const [notes, setNotes] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const briefs = state.evidenceBriefs.filter((b) => b.subjectId === subject.id).reverse();
  const current = briefs.find((b) => b.id === state.selectedBriefId) ?? briefs[0];
  const others = state.people.filter((p) => p.id !== person.id);
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  useUnsavedEditor(Boolean(notes.trim()));
  return <section className="workspace-panel" aria-labelledby="meeting-brief" data-demo-id="meeting-brief">
    <div className="section-heading"><div><h3 id="meeting-brief">Meeting brief</h3><p className="muted">Turn the evidence into a document you can bring to a programme meeting, or send it to a colleague in Lyceum.</p></div></div>
    {mayEdit ? <>
      <div className="form-grid"><Field label="Your recommendation"><Select data-demo-id="brief-recommendation" value={recommendation} onChange={(e) => setRecommendation(e.target.value as BriefRecommendation)}>{(Object.keys(RECOMMENDATION_LABEL) as BriefRecommendation[]).map((r) => <option key={r} value={r}>{RECOMMENDATION_LABEL[r]}</option>)}</Select></Field></div>
      <Field label="Notes for the meeting" hint="What you propose, what it costs in hours, and what you want decided."><Textarea data-demo-id="brief-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div className="button-row"><Button variant="primary" data-demo-id="brief-prepare" onClick={() => {
        const result = prepareEvidenceBrief(subject.id, { recommendation, notes });
        setMessage(result.ok ? "Brief prepared from the current evidence. Review it, then download or send it." : result.error);
        if (result.ok) setNotes("");
      }}>Prepare brief</Button></div>
      {message ? <p role="status" className="save-status">{message}</p> : null}
    </> : null}
    {current ? <article className="curriculum-object" data-demo-id="brief-current">
      <div className="section-heading"><div><h4>{RECOMMENDATION_LABEL[current.recommendation]}</h4>
        <p className="muted">Prepared {current.createdAt.slice(0, 16).replace("T", " ")} by {name(current.createdBy)}{current.sentAt ? " · sent " + current.sentAt.slice(0, 16).replace("T", " ") + " to " + current.recipients.map(name).join(", ") : " · not sent"}</p></div>
        <div className="button-row">
          <Button data-demo-id="brief-download" onClick={() => downloadText(subject.id + "-meeting-brief.md", current.markdown)}>Download brief (.md)</Button>
          <Button data-demo-id="brief-slides" onClick={() => { const outcomes = state.clos.filter((c) => c.subjectId === subject.id); void downloadPack(subject.id, briefDeck(subject, current, { ...evidenceReport(subject.id, state.evidenceSources, state.skillMentions, state.skillMappings, outcomes), trendNote: evidenceTrendNote(subject.id) }, state.evidenceSources, state.skillMentions, outcomes, state.people, nowIso())); }}>Download slides (.pptx)</Button>
          {briefs.length > 1 ? <Select aria-label="Choose a prepared brief" value={current.id} onChange={(e) => selectBrief(e.target.value)}>{briefs.map((b) => <option key={b.id} value={b.id}>{b.createdAt.slice(0, 16).replace("T", " ")} · {RECOMMENDATION_LABEL[b.recommendation]}</option>)}</Select> : null}
        </div></div>
      {current.notes ? <p className="preserve-lines">{current.notes}</p> : null}
      <p className="muted">The slides carry the decision asked for, the evidence, the options, the limits and one receipt per source. Editable in PowerPoint, with no AI-written text.</p>
      <details><summary>Read the full brief</summary><pre className="brief-body">{current.markdown}</pre></details>
      {mayEdit && !current.sentAt ? <fieldset className="clo-choices"><legend>Send to</legend>
        {others.map((p) => <label key={p.id}><input type="checkbox" data-demo-id={"brief-recipient-" + p.id} checked={recipients.includes(p.id)} onChange={(e) => setRecipients(e.target.checked ? [...recipients, p.id] : recipients.filter((id) => id !== p.id))} /><span>{p.name} · {p.orgRole}</span></label>)}
        <div className="button-row"><Button variant="primary" data-demo-id="brief-send" disabled={!recipients.length} onClick={() => {
          const result = sendEvidenceBrief(current.id, recipients);
          setMessage(result.ok ? "Brief sent. Recipients see it on their Home page with the receipts attached." : result.error);
          if (result.ok) setRecipients([]);
        }}>Send brief</Button></div>
        <p className="muted">Sending notifies colleagues inside this local prototype. It is not an institutional submission.</p>
      </fieldset> : null}
    </article> : <p className="muted">No brief prepared yet. Record evidence above, then prepare one.</p>}
  </section>;
}
