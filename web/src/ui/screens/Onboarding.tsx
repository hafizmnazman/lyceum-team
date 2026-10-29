// A new account's first steps (api/auth.ts gives the account; this gives it a workspace): who you are and where you
// teach; your first course, its term and where its graduates go; then its outline. The outline can be imported: the
// lecturer's own outline (PDF or DOCX) is read by the model in .env (api/outline.ts), which proposes outcomes and
// topics that the lecturer edits and accepts row by row, each marked as in the document or reworded. Or it is typed.
// Creating the course makes the accepted outline its first version, sets its term, finishes onboarding (only then does
// the account count) and opens the course. Cancelling, or signing out first, deletes the account.

import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, FileUp, Plus, Sparkles, X } from "lucide-react";
import { JOB_ROLE_LABEL, JOB_ROLES } from "../../app/account.ts";
import { readOutlineFile, sendVerdict } from "../../../../shared/agents/client.ts";
import { applyOnboardingOutline, completeOnboarding, createCourseWorkspace, openStep, saveOnboardingProfile, signOutAccount, useStore } from "../../app/store.ts";
import { assistantOutlinePrompt, BLOOM_LEVELS, jsonFromReply, readProposal, type OutlineProposal } from "../../../../shared/lib/outline.ts";
import type { BloomLevel } from "../../../../shared/types.ts";
import { HOST_NAME, MascotChat } from "../mascots/index.tsx";
import { Button, Field, Input, Tag, Textarea } from "../primitives/index.tsx";
import { Dropdown } from "../primitives/Dropdown.tsx";
import { COUNTRIES, RULESETS, isCountry } from "../../../../shared/lib/compliance.ts";
import { DataNotice } from "./DataAndAi.tsx";

const STEPS = ["About you", "Your course", "Its outline"] as const;
// proposalId and from: a row Folio proposed, with what it proposed, so creating the course can record the lecturer's verdict.
interface OutcomeRow { key: number; text: string; bloom: BloomLevel; keep: boolean; inDocument: boolean | null; proposalId?: string; from?: string } // inDocument null: typed or edited here
interface TopicRow { key: number; title: string; hours: string; week: number | null; outcomes: number[]; keep: boolean; proposalId?: string; from?: string }
const outcomeSig = (r: OutcomeRow) => JSON.stringify([r.text.trim(), r.bloom]);
const topicSig = (r: TopicRow) => JSON.stringify([r.title.trim(), r.hours.trim(), r.week, r.outcomes]);
let rowKey = 0;
// On a narrow screen the host speaks from beside the card rather than above it.
const NARROW = "(max-width: 760px)";
const watchNarrow = (onChange: () => void) => { const m = matchMedia(NARROW); m.addEventListener("change", onChange); return () => m.removeEventListener("change", onChange); };
const isNarrow = () => matchMedia(NARROW).matches;

// The stepper, by state: a finished step is a filled check you can go back to, the current one is filled and ringed.
type StepState = "done" | "current" | "next";
const STEP_LABEL: Record<StepState, string> = { done: "font-semibold text-ink", current: "font-bold text-ink", next: "font-semibold text-ink-2" };
const STEP_NODE: Record<StepState, string> = {
  done: "border-emerald bg-emerald text-white",
  current: "border-emerald bg-emerald text-white shadow-[0_0_0_4px_var(--color-tint-2)]",
  next: "border-border bg-white text-ink-2",
};
// One outline row: keep box, label, wording and level; a topic row is keep box, title, hours, the outcomes it serves, remove.
const ROW = "grid gap-2.5 transition-opacity duration-[160ms] ease-out";
const ROWS = "m-0 grid list-none gap-2.5 p-0";
const SECTION = "m-0 grid gap-2.5 border-0 p-0";
const LEGEND = "mb-2 font-display text-[17px] font-bold";
const KEEP = "grid min-h-11 place-items-center";
const KEEP_BOX = "size-[18px] accent-emerald";
// Each step's form: a grid whose intro line tucks up under the title.
const FORM = "grid gap-4 [&>p]:mx-0 [&>p]:-mt-2 [&>p]:mb-0";
const TITLE = "m-0 font-display text-[28px] font-extrabold tracking-[-0.02em]";
const numberOrNull = (s: string) => (s.trim() && Number.isFinite(Number(s)) && Number(s) > 0 ? Number(s) : null);

const IMPORT_WAYS = [
  { value: "file", label: "Upload your outline", hint: "Lyceum's model reads its outcomes and topics.", icon: FileUp },
  { value: "assistant", label: "Use your own AI", hint: "Copy a prompt into ChatGPT, Claude or Gemini, paste its reply back.", icon: Sparkles },
] as const;

export function OnboardingScreen() {
  const state = useStore();
  const me = state.people.find((p) => p.id === state.currentPersonId);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // about you
  const [name, setName] = useState(me?.name ?? "");
  const [institution, setInstitution] = useState(state.institution.name === "My institution" ? "" : state.institution.name);
  const [jobRole, setJobRole] = useState<string>(state.account?.user.jobRole ?? "");
  const [country, setCountry] = useState<string>(state.account?.user.country ?? "");
  const [programme, setProgramme] = useState(state.programme.title === "My programme" ? "" : state.programme.title);
  // the course
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("1");
  const [semester, setSemester] = useState("1");
  const [term, setTerm] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  // the outline
  const fileInput = useRef<HTMLInputElement>(null);
  const proposed = useRef<string[]>([]); // the ids of the rows Folio proposed in the latest import
  const [reading, setReading] = useState(false);
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [contactHours, setContactHours] = useState("");
  const [teachingWeeks, setTeachingWeeks] = useState("");
  const [credits, setCredits] = useState("");
  const [plos, setPlos] = useState<string[]>([]);
  // or the lecturer's own assistant reads it: they copy the prompt out and paste its reply back in
  const [importWay, setImportWay] = useState<"file" | "assistant">("file");
  const [reply, setReply] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  if (!me) return null;

  function moveTo(next: number) {
    setDirection(next > step ? "forward" : "back");
    setError("");
    setStep(next);
  }

  async function saveProfile() {
    setBusy(true); setError("");
    if (!country) { setError("Choose the country you teach in."); return; }
    const result = await saveOnboardingProfile({ name, institution, programme, jobRole, country });
    setBusy(false);
    if (result.ok) moveTo(1); else setError(result.error);
  }
  /** The lecturer's outline, read by the model on the server: every proposal fills a field or a row that stays editable. */
  async function importOutline(file: File) {
    setReading(true); setError(""); setNote("");
    const r = await readOutlineFile(file);
    setReading(false);
    if (!r.ok) { setError(r.error + (/model set up/.test(r.error) ? " Or choose Use your own AI." : "")); return; }
    const o = r.outline;
    fillFrom(o, true);
    const reworded = o.outcomes.filter((x) => !x.inDocument).length;
    setNote("Read " + o.source + ": " + o.outcomes.length + " outcomes and " + o.topics.length + " topics proposed" + (reworded ? ", " + reworded + " of the outcomes reworded by the model, so check those against your outline" : "") + (r.truncated ? ". The file is long, so only its first part was read" : "") + ".");
  }
  /** The reply from the lecturer's own assistant, checked like the server's. Lyceum never saw the outline itself, so no
   *  outcome is marked as in it or reworded: the lecturer checks each one. Nothing was recorded, so no verdicts follow. */
  function readReply() {
    setError(""); setNote("");
    let o: OutlineProposal;
    try { o = readProposal(jsonFromReply(reply), "", "your assistant's reply"); } catch { setError("That reply has no outline in it. Paste the assistant's whole answer, including the code block."); return; }
    if (!o.outcomes.length && !o.topics.length && !o.code && !o.title) { setError("The reply was read, but it names no course, outcomes or topics. Check the assistant had your outline, then paste its answer again."); return; }
    fillFrom(o, false);
    setNote("Read your assistant's reply: " + o.outcomes.length + " outcomes and " + o.topics.length + " topics. Lyceum did not see your outline, so check every outcome against it.");
  }
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(assistantOutlinePrompt(isCountry(country) ? country : null)); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setError("Copying was blocked by the browser. Select the prompt and copy it by hand."); }
  }
  /** A proposal, from either reader, into the form: fields only fill when empty, rows replace what was proposed before. */
  function fillFrom(o: OutlineProposal, checked: boolean) {
    if (o.code && !code) setCode(o.code);
    if (o.title && !title) setTitle(o.title);
    if (o.year) setYear(String(o.year));
    if (o.semester) setSemester(String(o.semester));
    if (o.term && !term) setTerm(o.term);
    if (o.careers && !targetRoles) setTargetRoles(o.careers);
    setSource(o.source);
    const outcomeRows = o.outcomes.map((x): OutcomeRow => ({ key: ++rowKey, text: x.text, bloom: x.bloom, keep: true, inDocument: checked ? x.inDocument : null, proposalId: x.proposalId }));
    const topicRows = o.topics.map((t): TopicRow => ({ key: ++rowKey, title: t.title, hours: t.hours === null ? "" : String(t.hours), week: t.week, outcomes: t.outcomes, keep: true, proposalId: t.proposalId }));
    setOutcomes(outcomeRows.map((r) => ({ ...r, from: outcomeSig(r) })));
    setTopics(topicRows.map((r) => ({ ...r, from: topicSig(r) })));
    proposed.current = [...outcomeRows, ...topicRows].flatMap((r) => (r.proposalId ? [r.proposalId] : []));
    if (o.contactHours) setContactHours(String(o.contactHours));
    if (o.teachingWeeks) setTeachingWeeks(String(o.teachingWeeks));
    if (o.credits) setCredits(String(o.credits));
    setPlos(o.programmeOutcomes);
  }
  function toOutline() {
    setError("");
    if (!code.trim() || !title.trim()) { setError("Give the course its code and title."); return; }
    if (!term.trim()) { setError("Enter the term this course runs in, e.g. 2026/2027 Semester 1."); return; }
    if (!outcomes.length) setOutcomes([{ key: ++rowKey, text: "", bloom: "Understand", keep: true, inDocument: null }]);
    moveTo(2);
  }
  async function createCourse() {
    setError("");
    const kept = outcomes.filter((o) => o.keep && o.text.trim());
    if (!kept.length) { setError("Keep or write at least one learning outcome: the loop starts from them."); return; }
    // Topics name outcomes by their place in the full list; renumber them to the kept outcomes, dropping the rest.
    const place = new Map(outcomes.map((o, i) => [i + 1, kept.indexOf(o) + 1]));
    const created = createCourseWorkspace({ code, title, programmeTitle: state.programme.title, year: Number(year), semester: Number(semester) });
    if (!created.ok || !created.subjectId) { setError(created.ok ? "The course was not made." : created.error); return; }
    setBusy(true);
    applyOnboardingOutline(created.subjectId, {
      outcomes: kept.map((o) => ({ text: o.text, bloom: o.bloom })),
      topics: topics.filter((t) => t.keep && t.title.trim()).map((t) => ({ title: t.title, hours: numberOrNull(t.hours), week: t.week,
        outcomes: t.outcomes.map((n) => place.get(n) ?? 0).filter((n) => n > 0) })),
      credits: numberOrNull(credits), teachingWeeks: numberOrNull(teachingWeeks), contactHours: numberOrNull(contactHours),
      programmeOutcomes: plos, targetRoles,
    }, term, source);
    // Folio's verdicts: each proposed row kept as proposed, kept after an edit, or dropped (unticked or removed).
    const rows = [...outcomes.map((o) => ({ id: o.proposalId, kept: o.keep && Boolean(o.text.trim()), same: o.from === outcomeSig(o) })),
      ...topics.map((t) => ({ id: t.proposalId, kept: t.keep && Boolean(t.title.trim()), same: t.from === topicSig(t) }))];
    for (const id of proposed.current) {
      const row = rows.find((r) => r.id === id);
      void sendVerdict(id, !row?.kept ? "dismissed" : row.same ? "accepted" : "edited");
    }
    // The course exists either way, so onboarding is finished; an outline that needs a fix says so on the course (a notice).
    const done = await completeOnboarding();
    setBusy(false);
    // The outline is in, so the course opens on its first step (Course, done), with Watch as the next one; not on Update.
    if (done.ok) openStep(created.subjectId, "course"); else setError(done.error);
  }
  /** Leave without an account: a sign up that is not finished is not kept (api/auth.ts deletes it on sign out). */
  async function cancel() {
    if (!window.confirm("Cancel signing up? Your account and anything entered here will not be kept.")) return;
    await signOutAccount();
  }
  const setOutcome = (key: number, patch: Partial<OutcomeRow>) => setOutcomes((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch, ...(patch.text !== undefined ? { inDocument: null } : {}) } : r)));
  const setTopic = (key: number, patch: Partial<TopicRow>) => setTopics((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const lines = step === 0
    ? ["Welcome, " + (name.split(" ").slice(-1)[0] || "there") + ". I'm " + HOST_NAME + ". Three short steps and your workspace is ready.", "Your institution and programme name the records you make, such as briefs, decks and course files."]
    : step === 1
      ? ["Have a course outline? Upload it, or let your own AI assistant read it, and I'll fill in its outcomes and topics for you to check.", "The term dates every record in the loop. Where your graduates go is what I search the web for on Watch."]
      : ["Check each outcome. A green tag means its words are in your outline; an amber one means it was reworded, so read it against yours.", "Untick anything you don't want. You can change all of it later in Update."];

  const narrow = useSyncExternalStore(watchNarrow, isNarrow, () => false);
  const compact = step === 1; // the longest form: a little tighter, and tighter again on a short screen
  return (
    <div className="signin forest-backdrop h-full overflow-hidden">
      <div className={"grid max-h-full w-full animate-[popIn_480ms_var(--ease-out)_both] items-center gap-10 short:gap-7 narrow:h-full narrow:grid-cols-1 narrow:grid-rows-[auto_minmax(0,1fr)] narrow:items-stretch narrow:gap-4 " + (step === 2 ? "max-w-[1100px] grid-cols-[240px_minmax(0,760px)]" : "max-w-[1120px] grid-cols-[300px_minmax(0,720px)]")}>
        <aside className={"[&_.mascot-chat-bubble]:bg-white" + (compact ? " short:[&_.mascot-chat]:scale-90" : "")}><MascotChat key={step} who="host" mood="greeting" size={120} name={HOST_NAME} lines={lines} layout={narrow ? "side" : "stack"} /></aside>
        <section className={"card card-focal max-h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain pt-0 [scrollbar-width:none] short:max-h-[calc(100dvh-32px)] narrow:max-h-full [&::-webkit-scrollbar]:hidden " + (compact ? "px-7 pb-6 short:pb-5" : "px-7 pb-7")} aria-labelledby="onboarding-title">
          <div className={"sticky top-0 z-10 flex items-center border-b border-border bg-white " + (compact ? "mb-6 pt-6 pb-5 short:mb-3.5 short:pt-5 short:pb-3.5" : "mb-6 pt-7 pb-5")} role="list" aria-label={"Step " + (step + 1) + " of " + STEPS.length}>
            {STEPS.map((label, i) => {
              const at: StepState = i < step ? "done" : i === step ? "current" : "next";
              const body = <>
                <span className={"inline-flex size-7 flex-[0_0_28px] items-center justify-center rounded-full border-[1.5px] text-[13px] font-bold transition-[background-color,border-color,color,box-shadow] duration-[240ms] ease-out phone:size-6 phone:basis-6 phone:text-[12px] " + STEP_NODE[at]}>{at === "done" ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <span className={"overflow-hidden text-ellipsis" + (at === "current" ? "" : " phone:hidden")}>{label}</span>
              </>;
              const button = "inline-flex min-w-0 flex-[0_1_auto] items-center gap-2.5 rounded-full border-0 bg-transparent py-1 pr-1.5 pl-1 text-left text-[14px] leading-[inherit] whitespace-nowrap transition-[color,background-color] duration-200 ease-out phone:gap-1.5 phone:text-[12px] " + STEP_LABEL[at];
              return <div key={label} className="flex min-w-0 flex-[1_1_0] items-center last:flex-none" role="listitem" aria-current={at === "current" ? "step" : undefined}>
                {at === "done"
                  ? <button type="button" className={button + " cursor-pointer hover:bg-tint-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald"} onClick={() => moveTo(i)} aria-label={"Back to step " + (i + 1) + ": " + label}>{body}</button>
                  : <span className={button}>{body}</span>}
                {i < STEPS.length - 1 ? <span className={"mx-3 h-0.5 min-w-4 flex-auto rounded-[1px] transition-colors duration-300 ease-out phone:mx-1.5 phone:min-w-2 " + (at === "done" ? "bg-emerald" : "bg-border")} aria-hidden /> : null}
              </div>;
            })}
          </div>
          <p className="sr-only" aria-live="polite">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

          {step === 0 ? <form className={FORM + (direction === "back" ? " animate-step-back" : " animate-step-forward")} onSubmit={(e) => { e.preventDefault(); void saveProfile(); }}>
            <h1 id="onboarding-title" className={TITLE}>Set up your workspace</h1>
            <p className="muted">Signed in as {me.email}. Everything you make is saved to your account on this Lyceum server.</p>
            <Field label="Your name" hint="As colleagues know you, e.g. Dr Aina Rahim."><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></Field>
            <Field label="Your role"><Dropdown value={jobRole} onChange={setJobRole} options={JOB_ROLES.map((r) => ({ value: r, label: JOB_ROLE_LABEL[r] }))} /></Field>
            <Field label="Institution"><Input autoComplete="organization" value={institution} onChange={(e) => setInstitution(e.target.value)} required maxLength={200} placeholder="e.g. Universiti Teknologi PETRONAS" /></Field>
            <Field label="Programme" hint="The degree your courses belong to."><Input value={programme} onChange={(e) => setProgramme(e.target.value)} required maxLength={200} placeholder="e.g. Bachelor of Computer Science" /></Field>
            <Field label="Country you teach in" hint="The helpers follow its accreditation framework and data rules."><Dropdown value={country} onChange={setCountry} options={COUNTRIES.map((c) => ({ value: c, label: RULESETS[c].label }))} /></Field>
            <DataNotice />
            {error ? <p role="alert" className="form-error">{error}</p> : null}
            <div className="button-row"><Button type="submit" variant="primary" loading={busy}>Continue <ArrowRight size={15} /></Button><Button variant="quiet" onClick={() => void cancel()}>Cancel sign-up</Button></div>
          </form> : null}

          {step === 1 ? <form className={"grid gap-3 short:gap-2 [&_.control]:min-h-11 [&_.field-hint]:mt-1 [&_.field-label]:mb-1 [&_.form-field]:mb-1 short:[&_.form-field]:mb-0 [&>p]:mx-0 [&>p]:-mt-2 [&>p]:mb-0" + (direction === "back" ? " animate-step-back" : " animate-step-forward")} onSubmit={(e) => { e.preventDefault(); toOutline(); }}>
            <h1 id="onboarding-title" className={TITLE}>Your first course</h1>
            <p className="muted">A personal course workspace in {state.programme.title}. It is yours to prepare; it is not an official approval.</p>
            <fieldset className="m-0 grid gap-3 border-0 p-0">
              <legend className="mb-2.5 p-0 text-[15px] font-semibold text-ink">Import your course outline <span className="font-normal text-ink-3">· optional, or type it in below</span></legend>
              <div className="grid grid-cols-2 gap-3 phone:grid-cols-1">
                {IMPORT_WAYS.map((w) => <label key={w.value} className={"flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white px-3.5 py-3 transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-emerald has-checked:border-emerald has-checked:bg-tint-1 has-checked:shadow-[3px_3px_0_var(--emerald)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-emerald " + (importWay === w.value ? "" : "border-border")}>
                  <input type="radio" name="import-way" value={w.value} checked={importWay === w.value} onChange={() => { setImportWay(w.value); setError(""); }} className="sr-only" />
                  <span className={"mt-0.5 inline-flex size-9 flex-none items-center justify-center rounded-full transition-colors duration-200 " + (importWay === w.value ? "bg-emerald text-white" : "bg-tint-2 text-emerald-text")}><w.icon size={17} aria-hidden="true" /></span>
                  <span className="grid gap-0.5"><strong className="text-[15px] text-ink">{w.label}</strong><span className="text-[13px] leading-[1.45] text-ink-2">{w.hint}</span></span>
                </label>)}
              </div>
              {importWay === "file" ? <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f && !reading) void importOutline(f); }}
                className={"flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-xl border-2 border-dashed px-4 py-3.5 transition-colors duration-200 " + (dragging ? "border-emerald bg-tint-2" : "border-border bg-tint-1")}>
                <span className="grid min-w-0 flex-[1_1_240px] gap-0.5">
                  <strong className="text-[14px] text-ink">{reading ? "Reading your outline..." : source ? "Read: " + source : "Drop your outline here"}</strong>
                  <span className="text-[13px] leading-[1.45] text-ink-2">PDF or Word. You check every outcome and topic before anything is saved.</span>
                </span>
                <input ref={fileInput} type="file" accept=".pdf,.docx" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importOutline(f); }} />
                <Button loading={reading} onClick={() => fileInput.current?.click()}><FileUp size={16} /> {source ? "Import another" : "Choose a file"}</Button>
              </div> : <div className="grid gap-3 rounded-xl border-2 border-border bg-tint-1 px-4 py-3.5">
                <ol className="m-0 grid list-none gap-2 p-0 text-[14px] text-ink-2">
                  {["Copy the prompt into ChatGPT, Claude, Gemini or any assistant you use.", "Attach your outline there, or paste its text under the prompt.", "Paste the assistant's whole reply below."].map((t, i) =>
                    <li key={i} className="flex items-start gap-2.5"><span className="inline-flex size-6 flex-none items-center justify-center rounded-full bg-white text-[12px] font-bold text-emerald-text">{i + 1}</span><span className="pt-0.5">{t}</span></li>)}
                </ol>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Button onClick={() => void copyPrompt()}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Prompt copied" : "Copy the prompt"}</Button>
                  <details className="text-[13px] [&_summary]:cursor-pointer [&_summary]:text-emerald-text">
                    <summary>See the prompt</summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-white p-3 text-[12px] leading-[1.5] whitespace-pre-wrap">{assistantOutlinePrompt(isCountry(country) ? country : null)}</pre>
                  </details>
                </div>
                <Textarea aria-label="Your assistant's reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste the assistant's reply here, all of it" maxLength={200_000} />
                <Button className="justify-self-start" variant="primary" disabled={!reply.trim()} onClick={readReply}>Read the reply <ArrowRight size={15} /></Button>
              </div>}
            </fieldset>
            {note ? <p role="status" className="save-status pop-in">{note}</p> : null}
            <div className="form-grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] narrow:grid-cols-1">
              <Field label="Course code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={40} placeholder="CS101" /></Field>
              <Field label="Year"><Dropdown value={year} onChange={setYear} options={["1", "2", "3", "4", "5"].map((y) => ({ value: y, label: "Year " + y }))} /></Field>
              <Field label="Semester"><Dropdown value={semester} onChange={setSemester} options={["1", "2", "3"].map((n) => ({ value: n, label: "Semester " + n }))} /></Field>
            </div>
            <Field label="Course title"><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="e.g. Introduction to Programming" /></Field>
            <Field label="Term" hint="The term this loop runs for. Every record you make in it carries this term."><Input value={term} onChange={(e) => setTerm(e.target.value)} required maxLength={100} placeholder="e.g. 2026/2027 Semester 1" /></Field>
            <Field label="Where do your graduates go?" hint="Roles and place. Agent web search on Watch starts from this."><Input value={targetRoles} onChange={(e) => setTargetRoles(e.target.value)} maxLength={300} placeholder="e.g. data analyst and BI developer roles in Malaysia" /></Field>
            {error ? <p role="alert" className="form-error">{error}</p> : null}
            <div className="button-row">
              <Button type="submit" variant="primary">Continue to the outline <ArrowRight size={15} /></Button>
              <Button onClick={() => moveTo(0)}><ArrowLeft size={15} /> Back</Button>
              <Button variant="quiet" onClick={() => void cancel()}>Cancel sign-up</Button>
            </div>
          </form> : null}

          {step === 2 ? <form className={FORM + (direction === "back" ? " animate-step-back" : " animate-step-forward")} onSubmit={(e) => { e.preventDefault(); void createCourse(); }}>
            <h1 id="onboarding-title" className={TITLE}>{code} outline</h1>
            <p className="muted">{source ? "Proposed from " + source + ". Untick what you don't want and edit the rest." : "Write the course's learning outcomes; topics are optional and can wait for Update."}</p>

            <fieldset className={SECTION}>
              <legend className={LEGEND}>Learning outcomes</legend>
              <ol className={ROWS}>
                {outcomes.map((o, i) => <li key={o.key} className={ROW + " pop-in grid-cols-[24px_52px_minmax(0,1fr)_190px] items-start narrow:grid-cols-[24px_minmax(0,1fr)]" + (o.keep ? "" : " opacity-50")}>
                  <label className={KEEP}><input type="checkbox" className={KEEP_BOX} checked={o.keep} onChange={(e) => setOutcome(o.key, { keep: e.target.checked })} /><span className="sr-only">Keep CLO{i + 1}</span></label>
                  <span className="pt-3 font-extrabold tabular-nums narrow:pt-2.5">CLO{i + 1}</span>
                  <Textarea aria-label={"CLO" + (i + 1) + " wording"} className="narrow:col-[2]" rows={2} value={o.text} onChange={(e) => setOutcome(o.key, { text: e.target.value })} placeholder="Students will be able to..." maxLength={600} />
                  <div className="grid justify-items-start gap-1.5 narrow:col-[2]">
                    <Dropdown value={o.bloom} onChange={(b) => setOutcome(o.key, { bloom: b })} options={BLOOM_LEVELS.map((b) => ({ value: b, label: b }))} />
                    {o.inDocument === true ? <Tag tone="ok">In your outline</Tag> : o.inDocument === false ? <Tag tone="warn">Reworded, check it</Tag> : null}
                  </div>
                </li>)}
              </ol>
              <Button variant="quiet" className="justify-self-start" onClick={() => setOutcomes((rows) => [...rows, { key: ++rowKey, text: "", bloom: "Understand", keep: true, inDocument: null }])}><Plus size={15} /> Add an outcome</Button>
            </fieldset>

            <fieldset className={SECTION}>
              <legend className={LEGEND}>Topics</legend>
              {topics.length ? <ol className={ROWS}>
                {topics.map((t, i) => <li key={t.key} className={ROW + " grid-cols-[24px_minmax(0,1fr)_90px_auto_32px] items-center narrow:grid-cols-[24px_minmax(0,1fr)_80px_32px]" + (t.keep ? "" : " opacity-50")}>
                  <label className={KEEP}><input type="checkbox" className={KEEP_BOX} checked={t.keep} onChange={(e) => setTopic(t.key, { keep: e.target.checked })} /><span className="sr-only">Keep topic {i + 1}</span></label>
                  <Input aria-label={"Topic " + (i + 1)} value={t.title} onChange={(e) => setTopic(t.key, { title: e.target.value })} maxLength={200} />
                  <Input aria-label={"Topic " + (i + 1) + " contact hours"} className="text-right" inputMode="decimal" value={t.hours} onChange={(e) => setTopic(t.key, { hours: e.target.value })} placeholder="Hours" />
                  <span className="muted text-[13px] whitespace-nowrap narrow:hidden">{t.outcomes.length ? "CLO" + t.outcomes.join(", CLO") : ""}</span>
                  <button type="button" className="grid size-8 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-ink-2 hover:bg-tint-1 hover:text-ink" aria-label={"Remove topic " + (i + 1)} onClick={() => setTopics((rows) => rows.filter((r) => r.key !== t.key))}><X size={16} /></button>
                </li>)}
              </ol> : <p className="muted">No topics yet. Add them now or later in Update.</p>}
              <Button variant="quiet" className="justify-self-start" onClick={() => setTopics((rows) => [...rows, { key: ++rowKey, title: "", hours: "", week: null, outcomes: [], keep: true }])}><Plus size={15} /> Add a topic</Button>
            </fieldset>

            <div className="form-grid">
              <Field label="Contact hours"><Input inputMode="decimal" value={contactHours} onChange={(e) => setContactHours(e.target.value)} placeholder="e.g. 42" /></Field>
              <Field label="Teaching weeks"><Input inputMode="numeric" value={teachingWeeks} onChange={(e) => setTeachingWeeks(e.target.value)} placeholder="e.g. 14" /></Field>
              <Field label="Credits"><Input inputMode="decimal" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="e.g. 3" /></Field>
            </div>
            {plos.length ? <p className="muted">Programme outcomes found in the outline: {plos.length}. They go into the course brief; map CLOs to them in Update.</p> : null}
            {error ? <p role="alert" className="form-error">{error}</p> : null}
            <div className="button-row">
              <Button type="submit" variant="primary" loading={busy}>Create the course <ArrowRight size={15} /></Button>
              <Button onClick={() => moveTo(1)}><ArrowLeft size={15} /> Back</Button>
              <Button variant="quiet" onClick={() => void cancel()}>Cancel sign-up</Button>
            </div>
          </form> : null}
        </section>
      </div>
    </div>
  );
}
