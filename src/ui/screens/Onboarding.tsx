// A new account's first steps (server/auth.ts gives the account; this gives it a workspace): who you are and where you
// teach; your first course, its term and where its graduates go; then its outline. The outline can be imported: the
// lecturer's own outline (PDF or DOCX) is read by the model in .env (server/outline.ts), which proposes outcomes and
// topics that the lecturer edits and accepts row by row, each marked as in the document or reworded. Or it is typed.
// Creating the course makes the accepted outline its first version, sets its term, finishes onboarding (only then does
// the account count) and opens the course. Cancelling, or signing out first, deletes the account.

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileUp, Plus, X } from "lucide-react";
import { JOB_ROLE_LABEL, JOB_ROLES } from "../../app/account.ts";
import { readOutlineFile } from "../../agents/client.ts";
import { applyOnboardingOutline, completeOnboarding, createCourseWorkspace, saveOnboardingProfile, signOutAccount, useStore } from "../../app/store.ts";
import { BLOOM_LEVELS } from "../../lib/outline.ts";
import type { BloomLevel } from "../../types.ts";
import { HOST_NAME, MascotChat } from "../mascots/index.tsx";
import { Button, Field, Input, Tag, Textarea } from "../primitives/index.tsx";
import { Dropdown } from "../primitives/Dropdown.tsx";

const STEPS = ["About you", "Your course", "Its outline"] as const;
interface OutcomeRow { key: number; text: string; bloom: BloomLevel; keep: boolean; inDocument: boolean | null } // null: typed or edited here
interface TopicRow { key: number; title: string; hours: string; week: number | null; outcomes: number[]; keep: boolean }
let rowKey = 0;
const numberOrNull = (s: string) => (s.trim() && Number.isFinite(Number(s)) && Number(s) > 0 ? Number(s) : null);

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
  const [reading, setReading] = useState(false);
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [contactHours, setContactHours] = useState("");
  const [teachingWeeks, setTeachingWeeks] = useState("");
  const [credits, setCredits] = useState("");
  const [plos, setPlos] = useState<string[]>([]);
  if (!me) return null;

  function moveTo(next: number) {
    setDirection(next > step ? "forward" : "back");
    setError("");
    setStep(next);
  }

  async function saveProfile() {
    setBusy(true); setError("");
    const result = await saveOnboardingProfile({ name, institution, programme, jobRole });
    setBusy(false);
    if (result.ok) moveTo(1); else setError(result.error);
  }
  /** The lecturer's outline, read by the model: every proposal fills a field or a row that stays editable. */
  async function importOutline(file: File) {
    setReading(true); setError(""); setNote("");
    const r = await readOutlineFile(file);
    setReading(false);
    if (!r.ok) { setError(r.error); return; }
    const o = r.outline;
    if (o.code && !code) setCode(o.code);
    if (o.title && !title) setTitle(o.title);
    setSource(o.source);
    setOutcomes(o.outcomes.map((x) => ({ key: ++rowKey, text: x.text, bloom: x.bloom, keep: true, inDocument: x.inDocument })));
    setTopics(o.topics.map((t) => ({ key: ++rowKey, title: t.title, hours: t.hours === null ? "" : String(t.hours), week: t.week, outcomes: t.outcomes, keep: true })));
    if (o.contactHours) setContactHours(String(o.contactHours));
    if (o.teachingWeeks) setTeachingWeeks(String(o.teachingWeeks));
    if (o.credits) setCredits(String(o.credits));
    setPlos(o.programmeOutcomes);
    const reworded = o.outcomes.filter((x) => !x.inDocument).length;
    setNote("Read " + o.source + ": " + o.outcomes.length + " outcomes and " + o.topics.length + " topics proposed" + (reworded ? ", " + reworded + " of the outcomes reworded by the model, so check those against your outline" : "") + (r.truncated ? ". The file is long, so only its first part was read" : "") + ".");
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
    // The course exists either way, so onboarding is finished; an outline that needs a fix says so on the course (a notice).
    const done = await completeOnboarding();
    setBusy(false);
    if (!done.ok) setError(done.error);
  }
  /** Leave without an account: a sign up that is not finished is not kept (server/auth.ts deletes it on sign out). */
  async function cancel() {
    if (!window.confirm("Cancel signing up? Your account and anything entered here will not be kept.")) return;
    await signOutAccount();
  }
  const setOutcome = (key: number, patch: Partial<OutcomeRow>) => setOutcomes((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch, ...(patch.text !== undefined ? { inDocument: null } : {}) } : r)));
  const setTopic = (key: number, patch: Partial<TopicRow>) => setTopics((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const lines = step === 0
    ? ["Welcome, " + (name.split(" ").slice(-1)[0] || "there") + ". I'm " + HOST_NAME + ". Three short steps and your workspace is ready.", "Your institution and programme name the records you make, such as briefs, decks and course files."]
    : step === 1
      ? ["Have a course outline? Upload it and I'll read its outcomes and topics for you to check.", "The term dates every record in the loop. Where your graduates go is what I search the web for on Watch."]
      : ["Check each outcome. A green tag means its words are in your outline; an amber one means it was reworded, so read it against yours.", "Untick anything you don't want. You can change all of it later in Update."];

  return (
    <div className="signin forest-backdrop">
      <div className={"onboarding is-step-" + step + (step === 2 ? " is-wide" : "")}>
        <aside className="onboarding-host"><MascotChat key={step} who="host" mood="greeting" size={120} name={HOST_NAME} lines={lines} /></aside>
        <section className="onboarding-card card card-focal" aria-labelledby="onboarding-title">
          <div className="onboarding-progress" role="list" aria-label={"Step " + (step + 1) + " of " + STEPS.length}>
            {STEPS.map((label, i) => <div key={label} className={"onboarding-step-marker" + (i < step ? " is-done" : i === step ? " is-current" : "")} role="listitem" aria-current={i === step ? "step" : undefined}>
              {i < step ? <button type="button" className="onboarding-step-button" onClick={() => moveTo(i)} aria-label={"Back to step " + (i + 1) + ": " + label}><span className="onboarding-step-node"><Check size={14} strokeWidth={3} /></span><span>{label}</span></button>
                : <span className="onboarding-step-button"><span className="onboarding-step-node">{i + 1}</span><span>{label}</span></span>}
              {i < STEPS.length - 1 ? <span className="onboarding-step-connector" aria-hidden /> : null}
            </div>)}
          </div>
          <p className="onboarding-next" aria-live="polite">
            <span className="eyebrow">Step {step + 1} of {STEPS.length}</span>
            <strong>{step === STEPS.length - 1 ? "Final check" : "Next: " + STEPS[step + 1]}</strong>
          </p>

          {step === 0 ? <form className={"onboarding-step-form " + direction} onSubmit={(e) => { e.preventDefault(); void saveProfile(); }}>
            <h1 id="onboarding-title" className="onboarding-title">Set up your workspace</h1>
            <p className="muted">Signed in as {me.email}. Everything you make is saved to your account on this Lyceum server.</p>
            <Field label="Your name" hint="As colleagues know you, e.g. Dr Aina Rahim."><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></Field>
            <Field label="Your role"><Dropdown value={jobRole} onChange={setJobRole} options={JOB_ROLES.map((r) => ({ value: r, label: JOB_ROLE_LABEL[r] }))} /></Field>
            <Field label="Institution"><Input autoComplete="organization" value={institution} onChange={(e) => setInstitution(e.target.value)} required maxLength={200} placeholder="e.g. Universiti Teknologi PETRONAS" /></Field>
            <Field label="Programme" hint="The degree your courses belong to."><Input value={programme} onChange={(e) => setProgramme(e.target.value)} required maxLength={200} placeholder="e.g. Bachelor of Computer Science" /></Field>
            {error ? <p role="alert" className="form-error">{error}</p> : null}
            <div className="button-row"><Button type="submit" variant="primary" loading={busy}>Continue <ArrowRight size={15} /></Button><Button variant="quiet" onClick={() => void cancel()}>Cancel sign-up</Button></div>
          </form> : null}

          {step === 1 ? <form className={"onboarding-step-form " + direction} onSubmit={(e) => { e.preventDefault(); toOutline(); }}>
            <h1 id="onboarding-title" className="onboarding-title">Your first course</h1>
            <p className="muted">A personal course workspace in {state.programme.title}. It is yours to prepare; it is not an official approval.</p>
            <div className="outline-drop">
              <div>
                <strong>Import your course outline</strong>
                <span className="muted">PDF or Word. The model set up in Settings reads its outcomes and topics; you check every one before it is saved.</span>
              </div>
              <input ref={fileInput} type="file" accept=".pdf,.docx" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importOutline(f); }} />
              <Button loading={reading} onClick={() => fileInput.current?.click()}><FileUp size={16} /> {reading ? "Reading your outline..." : source ? "Import another" : "Choose a file"}</Button>
            </div>
            {note ? <p role="status" className="save-status pop-in">{note}</p> : null}
            <div className="form-grid onboarding-grid">
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

          {step === 2 ? <form className={"onboarding-step-form " + direction} onSubmit={(e) => { e.preventDefault(); void createCourse(); }}>
            <h1 id="onboarding-title" className="onboarding-title">{code} outline</h1>
            <p className="muted">{source ? "Proposed from " + source + ". Untick what you don't want and edit the rest." : "Write the course's learning outcomes; topics are optional and can wait for Update."}</p>

            <fieldset className="outline-section">
              <legend>Learning outcomes</legend>
              <ol className="outline-rows">
                {outcomes.map((o, i) => <li key={o.key} className={"outline-row pop-in" + (o.keep ? "" : " is-off")}>
                  <label className="outline-keep"><input type="checkbox" checked={o.keep} onChange={(e) => setOutcome(o.key, { keep: e.target.checked })} /><span className="sr-only">Keep CLO{i + 1}</span></label>
                  <span className="outline-label">CLO{i + 1}</span>
                  <Textarea aria-label={"CLO" + (i + 1) + " wording"} rows={2} value={o.text} onChange={(e) => setOutcome(o.key, { text: e.target.value })} placeholder="Students will be able to..." maxLength={600} />
                  <div className="outline-meta">
                    <Dropdown value={o.bloom} onChange={(b) => setOutcome(o.key, { bloom: b })} options={BLOOM_LEVELS.map((b) => ({ value: b, label: b }))} />
                    {o.inDocument === true ? <Tag tone="ok">In your outline</Tag> : o.inDocument === false ? <Tag tone="warn">Reworded, check it</Tag> : null}
                  </div>
                </li>)}
              </ol>
              <Button variant="quiet" onClick={() => setOutcomes((rows) => [...rows, { key: ++rowKey, text: "", bloom: "Understand", keep: true, inDocument: null }])}><Plus size={15} /> Add an outcome</Button>
            </fieldset>

            <fieldset className="outline-section">
              <legend>Topics</legend>
              {topics.length ? <ol className="outline-rows">
                {topics.map((t, i) => <li key={t.key} className={"outline-row is-topic" + (t.keep ? "" : " is-off")}>
                  <label className="outline-keep"><input type="checkbox" checked={t.keep} onChange={(e) => setTopic(t.key, { keep: e.target.checked })} /><span className="sr-only">Keep topic {i + 1}</span></label>
                  <Input aria-label={"Topic " + (i + 1)} value={t.title} onChange={(e) => setTopic(t.key, { title: e.target.value })} maxLength={200} />
                  <Input aria-label={"Topic " + (i + 1) + " contact hours"} className="outline-hours" inputMode="decimal" value={t.hours} onChange={(e) => setTopic(t.key, { hours: e.target.value })} placeholder="Hours" />
                  <span className="muted outline-serves">{t.outcomes.length ? "CLO" + t.outcomes.join(", CLO") : ""}</span>
                  <button type="button" className="outline-remove" aria-label={"Remove topic " + (i + 1)} onClick={() => setTopics((rows) => rows.filter((r) => r.key !== t.key))}><X size={16} /></button>
                </li>)}
              </ol> : <p className="muted">No topics yet. Add them now or later in Update.</p>}
              <Button variant="quiet" onClick={() => setTopics((rows) => [...rows, { key: ++rowKey, title: "", hours: "", week: null, outcomes: [], keep: true }])}><Plus size={15} /> Add a topic</Button>
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
