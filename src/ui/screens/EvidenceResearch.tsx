// The lecturer's research run: fetch postings from a permitted board on request,
// keep the ones worth reading, scan them for the skills the lecturer names,
// confirm each exact quotation, vouch for the extraction, then turn the result
// into a meeting brief that can be downloaded or sent to a colleague.

import { useState } from "react";
import {
  clearCollection, clearProposals, confirmProposals, dismissProposal, evidenceTrendNote, importCollectedPostings, nowIso, prepareEvidenceBrief, runCollection,
  scanForRequirements, selectBrief, sendEvidenceBrief, setSkillLexicon, setSourcesReviewed, type AppState,
} from "../../app/store.ts";
import { briefDeck, downloadDeck } from "../../lib/slides.ts";
import { BOARD_TOKEN, SOURCE_POLICIES, matchedKeywords, parseKeywords } from "../../lib/collect.ts";
import { RECOMMENDATION_LABEL, REQUIREMENT_LEVELS, evidenceReport, parseLexicon, type MentionProposal } from "../../lib/evidence.ts";
import { downloadText } from "../../lib/download.ts";
import type { BriefRecommendation, CollectionProvider, MentionRequirement, Person, Subject } from "../../types.ts";
import { Button, Field, Input, Select, Tag, Textarea } from "../primitives/index.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";

type Props = { state: AppState; person: Person; subject: Subject; mayEdit: boolean };
const PROVIDERS = Object.keys(SOURCE_POLICIES) as CollectionProvider[];

export function ResearchRun({ state, subject, mayEdit }: Props) {
  const [provider, setProvider] = useState<CollectionProvider>("sample");
  const [board, setBoard] = useState("");
  const [query, setQuery] = useState("");
  const [inText, setInText] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const run = state.collectRun && state.collectRun.subjectId === subject.id ? state.collectRun : null;
  const policy = SOURCE_POLICIES[provider];
  const postings = run?.status === "done" ? run.postings : [];
  const keywords = parseKeywords(run?.query ?? "");
  const imported = new Set(state.evidenceSources.filter((s) => s.subjectId === subject.id).map((s) => s.collection?.postingId ?? ""));
  const boardOk = provider === "sample" || BOARD_TOKEN.test(board.trim());
  async function fetchNow() {
    setMessage(""); setSelected([]);
    const result = await runCollection(subject.id, { provider, board, query, inText });
    if (!result.ok) setMessage(result.error);
  }
  return <section className="workspace-panel" aria-labelledby="research-run">
    <div className="section-heading"><div><h3 id="research-run">Research run</h3><p className="muted">Fetch postings from a permitted employer board when you ask, then keep the ones worth reading as evidence.</p></div></div>
    {mayEdit ? <>
      <div className="form-grid">
        <Field label="Source"><Select data-demo-id="collect-provider" value={provider} onChange={(e) => { setProvider(e.target.value as CollectionProvider); setMessage(""); }}>{PROVIDERS.map((p) => <option key={p} value={p}>{SOURCE_POLICIES[p].name}</option>)}</Select></Field>
        {provider !== "sample" ? <Field label="Employer board token" hint={provider === "greenhouse" ? "The name in boards.greenhouse.io/NAME, or in an employer's careers link." : "The name in jobs.lever.co/NAME."}><Input data-demo-id="collect-board" maxLength={80} value={board} onChange={(e) => setBoard(e.target.value)} placeholder={provider === "greenhouse" ? "e.g. stripe" : "e.g. palantir"} /></Field> : null}
        <Field label="Role keywords" hint="Comma-separated. Matches posting titles; tick the box below to search inside the text too."><Input data-demo-id="collect-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. data analyst, analytics" /></Field>
      </div>
      <label className="checkbox-line"><input type="checkbox" checked={inText} onChange={(e) => setInText(e.target.checked)} />Also match keywords inside the posting text</label>
      <details className="guide-entry"><summary><span>Source policy: {policy.name}</span><Tag tone={policy.enabled ? "ok" : "warn"}>{policy.enabled ? "Permitted on request" : "Disabled"}</Tag></summary>
        <div className="guide-entry-body"><dl className="context-list"><div><dt>Owner</dt><dd>{policy.owner}</dd></div><div><dt>Method</dt><dd>{policy.method}</dd></div><div><dt>Retention</dt><dd>{policy.retention}</dd></div><div><dt>Refresh</dt><dd>{policy.refresh}</dd></div><div><dt>Policy reviewed</dt><dd>{policy.policyReviewedOn}</dd></div></dl><p className="muted">{policy.note}</p></div></details>
      <div className="button-row">
        <Button variant="primary" data-demo-id="collect-run" disabled={run?.status === "running" || !boardOk} onClick={() => void fetchNow()}>{run?.status === "running" ? "Fetching..." : "Fetch postings"}</Button>
        {run ? <Button onClick={() => { clearCollection(); setSelected([]); setMessage(""); }}>Clear results</Button> : null}
      </div>
      {message ? <p role="alert" className="form-error">{message}</p> : null}
      {run ? <div data-demo-id="collect-log"><div className="button-row"><h4>Collection log</h4>{run.status === "running" ? <Tag tone="warn">Fetching now</Tag> : run.status === "failed" ? <Tag tone="danger">Failed</Tag> : run.provider === "sample" ? <Tag>Saved sample, no network</Tag> : run.cached ? <Tag tone="accent">Local cache of a live fetch</Tag> : <Tag tone="ok">Fetched live</Tag>}</div>
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

export function RequirementScan({ state, subject, mayEdit }: Props) {
  const saved = state.skillLexicon[subject.id] ?? [];
  const [terms, setTerms] = useState(saved.join(", "));
  const [ack, setAck] = useState(false);
  const [message, setMessage] = useState("");
  const [levels, setLevels] = useState<Record<string, MentionRequirement>>({});
  const proposals = state.scanProposals.filter((p) => state.evidenceSources.some((s) => s.id === p.sourceId && s.subjectId === subject.id));
  const key = (p: MentionProposal) => p.sourceId + "\n" + p.term;
  const postings = state.evidenceSources.filter((s) => s.subjectId === subject.id && s.kind === "job-posting" && !s.duplicateOf);
  const unreviewed = postings.filter((s) => !s.reviewed);
  const dirty = JSON.stringify(parseLexicon(terms)) !== JSON.stringify(saved);
  useUnsavedEditor(dirty);
  const withLevel = (p: MentionProposal) => ({ ...p, requirement: levels[key(p)] ?? p.requirement });
  return <section className="workspace-panel" aria-labelledby="requirement-scan">
    <div className="section-heading"><div><h3 id="requirement-scan">Scan for requirements</h3><p className="muted">Name the skills you care about. The scan proposes the sentence in each posting that uses a term; you confirm every quotation.</p></div></div>
    {mayEdit ? <>
      <Field label="Skills to look for" hint="Comma-separated. Use | for an alias, for example machine learning|ML. Matching is whole-word and case-insensitive."><Textarea data-demo-id="lexicon-terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. SQL, Python, dashboards|dashboard, data visualisation, stakeholders|stakeholder" /></Field>
      <div className="button-row">
        <Button data-demo-id="lexicon-save" disabled={!dirty} onClick={() => { const result = setSkillLexicon(subject.id, parseLexicon(terms)); setMessage(result.ok ? "Terms saved with the course." : result.error); }}>Save terms</Button>
        <Button variant="primary" data-demo-id="scan-run" disabled={dirty || !saved.length || !postings.length} onClick={() => {
          const result = scanForRequirements(subject.id);
          setMessage(result.ok ? result.count + " proposals across " + postings.length + " postings. Confirm the quotations you accept." : result.error);
          setLevels({});
        }}>Scan postings</Button>
      </div>
      {message ? <p role="status" className="save-status">{message}</p> : null}
      {proposals.length ? <>
        <div className="table-scroll"><table className="evidence-table">
          <thead><tr><th scope="col">Posting</th><th scope="col">Skill</th><th scope="col">Proposed quotation</th><th scope="col">Requirement</th><th scope="col">Decision</th></tr></thead>
          <tbody>{proposals.map((p) => <tr key={key(p)}>
            <th scope="row">{p.sourceTitle}</th><td>{p.skill}</td><td><blockquote className="proposal-quote">{p.excerpt}</blockquote></td>
            <td><Select aria-label={"Requirement level for " + p.skill + " in " + p.sourceTitle} value={levels[key(p)] ?? p.requirement} onChange={(e) => setLevels({ ...levels, [key(p)]: e.target.value as MentionRequirement })}>{REQUIREMENT_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}</Select></td>
            <td><div className="button-row"><Button onClick={() => confirmProposals(subject.id, [withLevel(p)])}>Confirm</Button><Button variant="quiet" onClick={() => dismissProposal(p.sourceId, p.term)}>Dismiss</Button></div></td>
          </tr>)}</tbody>
        </table></div>
        <div className="button-row">
          <Button variant="primary" data-demo-id="scan-confirm-all" onClick={() => { const result = confirmProposals(subject.id, proposals.map(withLevel)); setMessage(result.added + " quotations recorded, " + result.skipped + " skipped."); }}>Confirm all {proposals.length}</Button>
          <Button onClick={() => clearProposals()}>Dismiss all</Button>
        </div>
      </> : null}
      {postings.length ? <div className="curriculum-object"><h4>Reviewed denominator</h4>
        <p className="muted">{postings.length - unreviewed.length} of {postings.length} postings are marked reviewed. A posting counts only after you confirm its extraction is complete.</p>
        {unreviewed.length ? <>
          <label className="checkbox-line"><input type="checkbox" data-demo-id="review-all-ack" checked={ack} onChange={(e) => setAck(e.target.checked)} />I have checked the quotations for these {unreviewed.length} postings, or deliberately skipped what the course does not need.</label>
          <Button data-demo-id="review-all" disabled={!ack} onClick={() => { setSourcesReviewed(subject.id, unreviewed.map((s) => s.id), true); setAck(false); }}>Mark {unreviewed.length} postings reviewed</Button>
        </> : <p className="muted">All postings are reviewed. Unmark one from its card below if you need to revisit it.</p>}
      </div> : null}
    </> : null}
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
        <p className="muted">Prepared {current.createdAt} by {name(current.createdBy)}{current.sentAt ? " · sent " + current.sentAt + " to " + current.recipients.map(name).join(", ") : " · not sent"}</p></div>
        <div className="button-row">
          <Button data-demo-id="brief-download" onClick={() => downloadText(subject.id + "-meeting-brief.md", current.markdown)}>Download brief (.md)</Button>
          <Button data-demo-id="brief-slides" onClick={() => { const outcomes = state.clos.filter((c) => c.subjectId === subject.id); void downloadDeck(briefDeck(subject, current, { ...evidenceReport(subject.id, state.evidenceSources, state.skillMentions, state.skillMappings, outcomes), trendNote: evidenceTrendNote(subject.id) }, state.evidenceSources, state.skillMentions, outcomes, state.people, nowIso())); }}>Download slides (.pptx)</Button>
          {briefs.length > 1 ? <Select aria-label="Choose a prepared brief" value={current.id} onChange={(e) => selectBrief(e.target.value)}>{briefs.map((b) => <option key={b.id} value={b.id}>{b.createdAt} · {RECOMMENDATION_LABEL[b.recommendation]}</option>)}</Select> : null}
        </div></div>
      {current.notes ? <p className="preserve-lines">{current.notes}</p> : null}
      <p className="muted">The slide deck is generated from the current evidence and this brief's recommendation: decision, evidence base, table, coverage, options, limitations and one receipt slide per source. Editable in PowerPoint; no AI-written text.</p>
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
