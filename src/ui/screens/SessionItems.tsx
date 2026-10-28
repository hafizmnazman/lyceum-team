// The check's items on a session card (depth plan Section 10): each item with its kind, outcome, level and marks, its key or
// accepted answers, and the lint with every rule named; the templates draft items for the lecturer's own sessions, whose
// keys and answers the lecturer writes; a person marks a session's items reviewed; and the items that pass the lint export
// for Moodle (XML) and as a QTI 2.1 package, each labelled with what it has and has not been checked against.

import { useState } from "react";
import { Check, Download, X } from "lucide-react";
import { addModelItems, draftSessionItems, markItemsReviewed, removeSessionItem, saveSessionItem, sessionItemRequest } from "../../app/store.ts";
import { fetchModelItems } from "../../agents/client.ts";
import { downloadBytes, downloadText } from "../../lib/download.ts";
import { KIND_LABEL, LEVEL_NOTE, LINT_LIMIT, MOODLE_LABEL, QTI_LABEL, lintItem, lintSet, moodleXml, passes, qtiPackage, reviewLine, type ItemContext, type LintCheck } from "../../lib/items.ts";
import type { DraftItem, Person, Subject, TeachingSession } from "../../types.ts";
import { Button, Disclosure, Field, Input, Tag, Textarea } from "../primitives/index.tsx";
import { Tooltip } from "../primitives/Tooltip.tsx";

export function SessionItems({ subject, session, labels, misconceptions, mayEdit, people, demoLine }: {
  subject: Subject; session: TeachingSession; labels: (cloId: string) => string; misconceptions: string[]; mayEdit: boolean; people: Person[]; demoLine: string | null;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [drafting, setDrafting] = useState(false);
  const items = session.items ?? [];
  const own = !session.sample;
  if (!items.length && !(mayEdit && own)) return null;
  const results = items.map((item) => ({ item, checks: lintItem(item, misconceptions) }));
  const clean = results.filter((r) => passes(r.checks)).map((r) => r.item);
  const positions = lintSet(items);
  const ctx: ItemContext = { subjectId: subject.id, week: session.week, topic: session.topic, labels, people, demoLine };
  const file = (ext: string) => subject.id + "-week-" + session.week + "-items." + ext;
  const done = (r: { ok: true } | { ok: false; error: string }, after?: () => void) => { setMessage(r.ok ? "" : r.error); if (r.ok) after?.(); };
  async function exportQti() {
    const mod = (await import("jszip")) as unknown as { default?: JSZipCtor } & JSZipCtor;
    const JSZip = (mod.default ?? mod) as JSZipCtor;
    const zip = new JSZip();
    for (const [path, content] of qtiPackage(clean, ctx)) zip.file(path, content);
    downloadBytes(file("qti21.zip"), await zip.generateAsync({ type: "uint8array" }));
  }
  const reviewed = items.length > 0 && items.every((i) => i.reviewedBy);
  // Prism drafts with the model in .env; the items join the session unreviewed, and the lint and review still decide.
  async function draftWithPrism() {
    const request = sessionItemRequest(subject.id, session.id);
    if (typeof request === "string") { setMessage(request); return; }
    setDrafting(true); setMessage("");
    const r = await fetchModelItems(request);
    setDrafting(false);
    if (r.ok) done(addModelItems(subject.id, session.id, r.list)); else setMessage(r.error);
  }
  return <div className="session-items" data-demo-id={"session-items-" + session.id}>
    <div className="session-items-head"><h4>Items for the check</h4>
      {items.length ? <Tag>{items.length} drafted</Tag> : null}
      {items.length ? <Tag tone={reviewed ? "ok" : "warn"}>{reviewLine(items, people)}</Tag> : null}
      {session.sample && items.length ? <Tag tone="warn">Sample, synthetic</Tag> : null}</div>
    {items.length ? <Disclosure summary={"The " + items.length + " items, each with the lint"} count={clean.length + " of " + items.length + " pass"} data-demo-id={"session-items-list-" + session.id}>
      <ol className="item-list">{results.map(({ item, checks }, n) => <li key={item.id} data-demo-id={"item-" + item.id}>
        {editing === item.id
          ? <ItemEditor item={item} onCancel={() => setEditing(null)}
              onSave={(next) => done(saveSessionItem(subject.id, session.id, next), () => setEditing(null))}
              onRemove={() => done(removeSessionItem(subject.id, session.id, item.id), () => setEditing(null))} />
          : <ItemView item={item} n={n} label={labels(item.cloId)} checks={checks} people={people} onEdit={mayEdit && own ? () => setEditing(item.id) : null} />}
      </li>)}</ol>
      <p className="muted">{LEVEL_NOTE} {LINT_LIMIT}</p>
      {!positions.ok ? <p className="limitation">{positions.rule}: {positions.note}.</p> : null}
    </Disclosure> : <p className="muted">No items yet. Prism drafts a multiple-choice item, a short answer and an essay for each linked outcome, with keys and answers for you to check, using the course's recorded misconceptions as distractors. The templates draft the same three without a model; you write each key and accepted answer.</p>}
    <div className="button-row">
      {mayEdit && own ? <Button variant="primary" loading={drafting} onClick={() => void draftWithPrism()} data-demo-id={"items-prism-" + session.id}>Draft with Prism</Button> : null}
      {mayEdit && own ? <Button onClick={() => done(draftSessionItems(subject.id, session.id))} data-demo-id={"items-draft-" + session.id}>Draft items from the templates</Button> : null}
      {mayEdit && items.length ? <Button onClick={() => done(markItemsReviewed(subject.id, session.id))} data-demo-id={"items-review-" + session.id}>Mark these items reviewed</Button> : null}
      {items.length ? <Button disabled={!clean.length} onClick={() => downloadText(file("xml"), moodleXml(clean, ctx), "application/xml;charset=utf-8")} data-demo-id={"items-moodle-" + session.id}><Download size={15} /> Export for Moodle (.xml)</Button> : null}
      {items.length ? <Button variant="quiet" disabled={!clean.length} onClick={() => void exportQti()} data-demo-id={"items-qti-" + session.id}><Download size={15} /> QTI 2.1 (.zip), unvalidated</Button> : null}
    </div>
    {items.length ? <p className="muted">{clean.length} of {items.length} items pass the lint and go into the exports. Moodle XML: {MOODLE_LABEL} QTI: {QTI_LABEL}</p> : null}
    {message ? <p role="status" className="save-status">{message}</p> : null}
  </div>;
}

function ItemView({ item, n, label, checks, people, onEdit }: { item: DraftItem; n: number; label: string; checks: LintCheck[]; people: Person[]; onEdit: (() => void) | null }) {
  const reviewer = item.reviewedBy ? people.find((p) => p.id === item.reviewedBy)?.name ?? item.reviewedBy : null;
  return <article className="item-card">
    <div className="item-head"><strong>Q{n + 1}</strong><Tag>{KIND_LABEL[item.kind]}</Tag>{item.source === "model" ? <Tag tone="warn">Drafted by Prism</Tag> : null}<Tag tone="accent">{label}</Tag><Tag>{item.bloomLevel}</Tag>
      <span className="muted">{item.marks} {item.marks === 1 ? "mark" : "marks"}{reviewer ? " · reviewed by " + reviewer : ""}</span></div>
    <p className="item-stem">{item.stem}</p>
    {item.options ? <ol className="item-options" type="a">{item.options.map((o, i) => <li key={i} className={o.correct ? "is-key" : undefined}>
      {o.text || <em>The key is yours to write.</em>}{o.correct ? <> <Tag tone="ok">Key</Tag></> : null}</li>)}</ol> : null}
    {item.answers ? <p><strong>Accepted answers:</strong> {item.answers.length ? item.answers.join("; ") : <em>yours to write</em>}</p> : null}
    {item.graderInfo !== undefined ? <p className="muted"><strong>For the marker:</strong> {item.graderInfo || "yours to write"}</p> : null}
    <ul className="item-lint" aria-label={"The lint for question " + (n + 1)}>{checks.map((c) => <li key={c.rule} className={c.ok ? "is-ok" : "is-fail"}>
      {c.ok ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}<span className="sr-only">{c.ok ? "Passes: " : "Fails: "}</span>{c.rule}{c.note ? ": " + c.note : ""}</li>)}</ul>
    {onEdit ? <Button variant="quiet" onClick={onEdit}>Edit item</Button> : null}
  </article>;
}

function ItemEditor({ item, onSave, onCancel, onRemove }: { item: DraftItem; onSave: (item: DraftItem) => void; onCancel: () => void; onRemove: () => void }) {
  const [draft, setDraft] = useState<DraftItem>(() => structuredClone(item));
  const options = draft.options ?? [];
  const setOption = (i: number, change: Partial<{ text: string; correct: boolean }>) =>
    setDraft({ ...draft, options: options.map((o, k) => (k === i ? { ...o, ...change } : change.correct ? { ...o, correct: false } : o)) });
  return <div className="item-card item-editor" data-demo-id={"item-editor-" + item.id}>
    <Field label="Stem" hint="A positive question that carries the main idea."><Textarea value={draft.stem} rows={3} maxLength={2000} onChange={(e) => setDraft({ ...draft, stem: e.target.value })} /></Field>
    {draft.kind === "multichoice" ? <fieldset className="item-option-editor"><legend>Options: choose the key</legend>
      {options.map((o, i) => <div key={i} className="item-option-row">
        <input type="radio" name={"key-" + item.id} checked={o.correct} onChange={() => setOption(i, { correct: true })} aria-label={"Option " + (i + 1) + " is the key"} />
        <Input value={o.text} maxLength={500} onChange={(e) => setOption(i, { text: e.target.value })} aria-label={"Option " + (i + 1)} placeholder={o.correct ? "The keyed answer, in your words" : ""} />
        <Tooltip content={options.length <= 2 ? "A question keeps at least two options" : "Remove option " + (i + 1)}><Button variant="quiet" className="item-option-remove" disabled={options.length <= 2} aria-label={"Remove option " + (i + 1)} onClick={() => setDraft({ ...draft, options: options.filter((_, k) => k !== i) })}><X size={16} aria-hidden="true" /></Button></Tooltip>
      </div>)}
      {options.length < 4 ? <Button variant="quiet" onClick={() => setDraft({ ...draft, options: [...options, { text: "", correct: false }] })}>Add an option</Button> : null}
    </fieldset> : null}
    {draft.kind === "shortanswer" ? <Field label="Accepted answers" hint="One a line, four words or fewer each.">
      <Textarea value={(draft.answers ?? []).join("\n")} rows={3} onChange={(e) => setDraft({ ...draft, answers: e.target.value.split("\n").map((a) => a.trim()).filter(Boolean) })} /></Field> : null}
    {draft.kind === "essay" ? <Field label="For the marker" hint="What an answer must show, against the outcome.">
      <Textarea value={draft.graderInfo ?? ""} rows={3} maxLength={4000} onChange={(e) => setDraft({ ...draft, graderInfo: e.target.value })} /></Field> : null}
    <Field label="Marks"><Input type="number" min={0.5} max={100} step={0.5} value={String(draft.marks)} onChange={(e) => setDraft({ ...draft, marks: Number(e.target.value) })} /></Field>
    <div className="button-row"><Button variant="primary" onClick={() => onSave(draft)}>Save item</Button><Button variant="quiet" onClick={onCancel}>Cancel</Button>
      <Button variant="danger" onClick={onRemove}>Remove item</Button></div>
    <p className="muted">Saving a changed item clears its review: a person reviews what is there now.</p>
  </div>;
}

interface JSZipInstance { file: (path: string, content: string) => void; generateAsync: (options: { type: "uint8array" }) => Promise<Uint8Array> }
type JSZipCtor = new () => JSZipInstance;
