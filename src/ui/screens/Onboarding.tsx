// A new account's first steps (server/auth.ts gives the account; this gives it a workspace): who you are and where you
// teach, then your first course. Creating the course finishes onboarding (only then does the account count) and opens its
// outline, where the loop starts. Tualang says what each step is for. Cancelling, or signing out first, deletes the account.

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { JOB_ROLE_LABEL, JOB_ROLES } from "../../app/account.ts";
import { completeOnboarding, createCourseWorkspace, saveOnboardingProfile, signOutAccount, useStore } from "../../app/store.ts";
import { HOST_NAME, MascotChat } from "../mascots/index.tsx";
import { Button, Field, Input } from "../primitives/index.tsx";
import { Dropdown } from "../primitives/Dropdown.tsx";

const STEPS = ["About you", "Your first course"] as const;

export function OnboardingScreen() {
  const state = useStore();
  const me = state.people.find((p) => p.id === state.currentPersonId);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(me?.name ?? "");
  const [institution, setInstitution] = useState(state.institution.name === "My institution" ? "" : state.institution.name);
  const [jobRole, setJobRole] = useState<string>(state.account?.user.jobRole ?? "");
  const [programme, setProgramme] = useState(state.programme.title === "My programme" ? "" : state.programme.title);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("1");
  const [semester, setSemester] = useState("1");
  if (!me) return null;

  async function saveProfile() {
    setBusy(true); setError("");
    const result = await saveOnboardingProfile({ name, institution, programme, jobRole });
    setBusy(false);
    if (result.ok) setStep(1); else setError(result.error);
  }
  async function createCourse() {
    setError("");
    const result = createCourseWorkspace({ code, title, programmeTitle: state.programme.title, year: Number(year), semester: Number(semester) });
    if (!result.ok) { setError(result.error); return; }
    setBusy(true);
    const done = await completeOnboarding();
    setBusy(false);
    if (!done.ok) setError(done.error);
  }
  /** Leave without an account: a sign up that is not finished is not kept (server/auth.ts deletes it on sign out). */
  async function cancel() {
    if (!window.confirm("Cancel signing up? Your account and anything entered here will not be kept.")) return;
    await signOutAccount();
  }
  const lines = step === 0
    ? ["Welcome, " + (name.split(" ").slice(-1)[0] || "there") + ". I'm " + HOST_NAME + ". Two short steps and your workspace is ready.", "Your institution and programme name the records you make, such as briefs, decks and course files."]
    : ["Now your first course. You'll add its outcomes and topics next, and that starts the loop.", "Use the code your timetable uses, like CS101. You can add more courses any time from Courses."];

  return (
    <div className="signin forest-backdrop">
      <div className="onboarding">
        <aside className="onboarding-host"><MascotChat key={step} who="host" mood="greeting" size={120} name={HOST_NAME} lines={lines} /></aside>
        <section className="onboarding-card card card-focal" aria-labelledby="onboarding-title">
          <div className="onboarding-progress" aria-label={"Step " + (step + 1) + " of " + STEPS.length}>
            {STEPS.map((label, i) => <span key={label} className={i < step ? "is-done" : i === step ? "is-current" : ""}>{label}</span>)}
          </div>
          {step === 0 ? <form onSubmit={(e) => { e.preventDefault(); void saveProfile(); }}>
            <h1 id="onboarding-title" className="onboarding-title">Set up your workspace</h1>
            <p className="muted">Signed in as {me.email}. Everything you make is saved to your account on this Lyceum server.</p>
            <Field label="Your name" hint="As colleagues know you, e.g. Dr Aina Rahim."><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></Field>
            <Field label="Your role"><Dropdown value={jobRole} onChange={setJobRole} options={JOB_ROLES.map((r) => ({ value: r, label: JOB_ROLE_LABEL[r] }))} /></Field>
            <Field label="Institution"><Input autoComplete="organization" value={institution} onChange={(e) => setInstitution(e.target.value)} required maxLength={200} placeholder="e.g. Universiti Teknologi PETRONAS" /></Field>
            <Field label="Programme" hint="The degree your courses belong to."><Input value={programme} onChange={(e) => setProgramme(e.target.value)} required maxLength={200} placeholder="e.g. Bachelor of Computer Science" /></Field>
            {error ? <p role="alert" className="form-error">{error}</p> : null}
            <div className="button-row"><Button type="submit" variant="primary" loading={busy}>Continue <ArrowRight size={15} /></Button><Button variant="quiet" onClick={() => void cancel()}>Cancel sign-up</Button></div>
          </form> : <form onSubmit={(e) => { e.preventDefault(); void createCourse(); }}>
            <h1 id="onboarding-title" className="onboarding-title">Your first course</h1>
            <p className="muted">A personal course workspace in {state.programme.title}. It is yours to prepare; it is not an official approval.</p>
            <div className="form-grid onboarding-grid">
              <Field label="Course code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={40} placeholder="CS101" /></Field>
              <Field label="Year"><Dropdown value={year} onChange={setYear} options={["1", "2", "3", "4", "5"].map((y) => ({ value: y, label: "Year " + y }))} /></Field>
              <Field label="Semester"><Dropdown value={semester} onChange={setSemester} options={["1", "2", "3"].map((n) => ({ value: n, label: "Semester " + n }))} /></Field>
            </div>
            <Field label="Course title"><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="e.g. Introduction to Programming" /></Field>
            {error ? <p role="alert" className="form-error">{error}</p> : null}
            <div className="button-row">
              <Button type="submit" variant="primary" loading={busy}>Create the course <ArrowRight size={15} /></Button>
              <Button onClick={() => { setError(""); setStep(0); }}>Back</Button>
              <Button variant="quiet" onClick={() => void cancel()}>Cancel sign-up</Button>
            </div>
          </form>}
        </section>
      </div>
    </div>
  );
}
