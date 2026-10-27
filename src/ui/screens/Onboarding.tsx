// A new account's first steps (server/auth.ts gives the account; this gives it a workspace): who you are and where you
// teach, then your first course. Creating the course opens its outline, where the loop starts. Tualang says what each
// step is for. Skipping leaves an empty workspace; the next sign in comes back here until a course exists.

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createCourseWorkspace, navigate, saveOnboardingProfile, useStore } from "../../app/store.ts";
import { HOST_NAME, MascotChat } from "../mascots/index.tsx";
import { Button, Field, Input, Select } from "../primitives/index.tsx";

const STEPS = ["About you", "Your first course"] as const;

export function OnboardingScreen() {
  const state = useStore();
  const me = state.people.find((p) => p.id === state.currentPersonId);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(me?.name ?? "");
  const [institution, setInstitution] = useState(state.institution.name === "My institution" ? "" : state.institution.name);
  const [programme, setProgramme] = useState(state.programme.title === "My programme" ? "" : state.programme.title);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("1");
  const [semester, setSemester] = useState("1");
  if (!me) return null;

  async function saveProfile() {
    setBusy(true); setError("");
    const result = await saveOnboardingProfile({ name, institution, programme });
    setBusy(false);
    if (result.ok) setStep(1); else setError(result.error);
  }
  function createCourse() {
    setError("");
    const result = createCourseWorkspace({ code, title, programmeTitle: state.programme.title, year: Number(year), semester: Number(semester) });
    if (!result.ok) setError(result.error);
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
            <Field label="Institution"><Input autoComplete="organization" value={institution} onChange={(e) => setInstitution(e.target.value)} required maxLength={200} placeholder="e.g. Universiti Teknologi PETRONAS" /></Field>
            <Field label="Programme" hint="The degree your courses belong to."><Input value={programme} onChange={(e) => setProgramme(e.target.value)} required maxLength={200} placeholder="e.g. Bachelor of Computer Science" /></Field>
            {error ? <p role="alert" className="form-error">{error}</p> : null}
            <div className="button-row"><Button type="submit" variant="primary" loading={busy}>Continue <ArrowRight size={15} /></Button></div>
          </form> : <form onSubmit={(e) => { e.preventDefault(); createCourse(); }}>
            <h1 id="onboarding-title" className="onboarding-title">Your first course</h1>
            <p className="muted">A personal course workspace in {state.programme.title}. It is yours to prepare; it is not an official approval.</p>
            <div className="form-grid onboarding-grid">
              <Field label="Course code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={40} placeholder="CS101" /></Field>
              <Field label="Year"><Select value={year} onChange={(e) => setYear(e.target.value)}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}</Select></Field>
              <Field label="Semester"><Select value={semester} onChange={(e) => setSemester(e.target.value)}>{[1, 2, 3].map((s) => <option key={s} value={s}>Semester {s}</option>)}</Select></Field>
            </div>
            <Field label="Course title"><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="e.g. Introduction to Programming" /></Field>
            {error ? <p role="alert" className="form-error">{error}</p> : null}
            <div className="button-row">
              <Button type="submit" variant="primary">Create the course <ArrowRight size={15} /></Button>
              <Button onClick={() => { setError(""); setStep(0); }}>Back</Button>
              <Button variant="quiet" onClick={() => navigate("courses")}>Skip for now</Button>
            </div>
          </form>}
        </section>
      </div>
    </div>
  );
}
