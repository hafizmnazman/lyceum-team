// Sign in. Two columns on the forest-deep backdrop, the same height: who Lyceum is, with the host saying what happens
// next, and one card that does the work: sign in or create an account (with Google when the server has it), then the
// demo's people as compact rows, one tap each. The public landing page is reachable from here without signing in.

import { useEffect, useId, useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { authProviders, googleErrorText, JOB_ROLE_LABEL, JOB_ROLES, signIn, signUp } from "../../app/account.ts";
import { hatsOn, subjectsForPerson } from "../../app/roles.ts";
import { enterAccount, login, navigate, useStore } from "../../app/store.ts";
import { HOST_NAME, MascotChat } from "../mascots/index.tsx";
import { Button, Field, Input } from "../primitives/index.tsx";
import { Dropdown } from "../primitives/Dropdown.tsx";
import { Tooltip } from "../primitives/Tooltip.tsx";
import { Segmented } from "../primitives/Segmented.tsx";
import type { Person } from "../../types.ts";

export function LoginScreen() {
  const state = useStore();
  // Someone creating an account means to have one, so the demo's people step aside while that form is open.
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // One line per person: what they can do in the loop (plan Section 4.2), worked out from today's hats.
  function scopeLine(person: Person): string {
    if (person.orgRole === "management") return "Management. Appears only in the illustrative approval sandbox.";
    if (person.orgRole === "department") return "Programme owner. Decides on every course's brief and assigns positions.";
    const subjects = subjectsForPerson(person.id, state.assignments);
    const coordinating = subjects.filter((sid) => hatsOn(person.id, sid, state.assignments).includes("coordinator"));
    const lecturing = subjects.filter((sid) => !coordinating.includes(sid));
    const parts = [];
    if (coordinating.length) parts.push("Coordinator of " + coordinating.join(" and ") + ". Runs the whole loop and decides.");
    if (lecturing.length) parts.push("Lecturer on " + lecturing.join(" and ") + ". Prepares and teaches; others decide.");
    if (!person.verified) parts.push("Unverified, so edits are flagged.");
    return parts.join(" ");
  }

  return (
    <div className="signin forest-backdrop">
      <div className="signin-panel">
        <section className="signin-brand card-forest on-forest" aria-labelledby="signin-title">
          <div className="signin-brand-copy">
            <h1 id="signin-title" className="wordmark">Lyceum</h1>
            <p className="signin-tagline">Course decisions, with receipts.</p>
            <p className="signin-lead">Real job postings become a course decision with every quotation on record, each semester. Nothing runs by itself.</p>
          </div>
          <MascotChat who="host" mood="greeting" size={104} name={HOST_NAME} layout="side" lines={[
            "Sign in to pick up your courses where you left them, on any browser.",
            "New here? Create an account and I'll walk you through your first course.",
            "Just looking? Try the demo as Dr Sobri to see the whole loop on a sample course.",
          ]} />
          <div className="signin-brand-foot">
            <Button variant="ghost" data-demo-id="view-index" onClick={() => navigate("index")}>See how Lyceum works <ArrowRight size={16} /></Button>
            <p>Local prototype. Synthetic examples are labelled where they appear.</p>
          </div>
        </section>

        <section className="signin-card card" aria-label="Sign in">
          <AccountPanel mode={mode} onMode={setMode} />
          {mode === "signin" ? <>
          <div className="signin-divider"><span>or try the demo, no account needed</span></div>
          <ul className="people-list" aria-label="Demo people">
            {state.people.filter((p) => !p.account).map((p) => (
              <li key={p.id}>
                <Tooltip content={scopeLine(p)}>
                  <button type="button" className="person-row" data-demo-id={`login-${p.id}`} onClick={() => login(p.id)}>
                    <span aria-hidden className="avatar">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                    <span className="person-text">
                      <span className="person-name">{p.name}{p.verified ? <ShieldCheck size={13} aria-label="Verified" /> : null}</span>
                      <span className="person-scope">{scopeLine(p)}</span>
                    </span>
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
          <p className="signin-note">Demo people have no passwords and save in this browser only. Start with Dr Sobri for the whole loop.</p>
          </> : <p className="signin-note">Your account and its work are kept by this Lyceum server. Next, two short steps set up your first course.</p>}
        </section>
      </div>
    </div>
  );
}

/** A real account on the local API: sign in, or create one (who, where, as what) and go to onboarding. */
function AccountPanel({ mode, onMode }: { mode: "signin" | "signup"; onMode: (mode: "signin" | "signup") => void }) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [google, setGoogle] = useState(false);
  const pwId = useId(), pwHintId = pwId + "-hint";
  useEffect(() => {
    void authProviders().then((r) => setGoogle(r.ok && r.google));
    // Google's callback comes back with ?auth_error=<reason> when a sign in failed; say why once, then tidy the address.
    const reason = new URLSearchParams(window.location.search).get("auth_error");
    if (reason) {
      setError(googleErrorText(reason));
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
  }, []);
  async function submit() {
    setError("");
    if (mode === "signup" && !jobRole) { setError("Choose your role."); return; }
    if (mode === "signup" && password !== confirm) { setError("The two passwords do not match."); return; }
    setBusy(true);
    const result = mode === "signup" ? await signUp({ name, email, password, institution, jobRole }) : await signIn(email, password);
    const opened = result.ok ? await enterAccount(result.user) : result;
    setBusy(false);
    if (!opened.ok) setError(opened.error);
  }
  const switchTo = (next: "signin" | "signup") => { onMode(next); setError(""); setConfirm(""); };
  return (
    <div className="signin-account">
      <Segmented kind="tabs" label="Your account" className="signin-tabs" value={mode} onChange={switchTo}
        options={[{ value: "signin", label: "Sign in" }, { value: "signup", label: "Create account" }]} />
      <form className="signin-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {mode === "signup" ? <Field label="Full name" hint="As colleagues know you, e.g. Dr Aina Rahim."><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></Field> : null}
        <Field label={mode === "signup" ? "Work email" : "Email"}><Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></Field>
        {mode === "signup" ? <div className="signin-pair">
          <Field label="Institution"><Input autoComplete="organization" value={institution} onChange={(e) => setInstitution(e.target.value)} required maxLength={200} placeholder="e.g. Universiti Teknologi PETRONAS" /></Field>
          <Field label="Your role"><Dropdown value={jobRole} onChange={setJobRole} options={JOB_ROLES.map((r) => ({ value: r, label: JOB_ROLE_LABEL[r] }))} /></Field>
        </div> : null}
        {/* written out rather than through Field, so the label and hint point at the input, not at its wrapper */}
        <div className="form-field">
          <label htmlFor={pwId} className="field-label">Password</label>
          <div className="password-field">
            <Input id={pwId} type={shown ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={mode === "signup" ? 10 : undefined} maxLength={200} aria-describedby={mode === "signup" ? pwHintId : undefined} />
            <button type="button" className="password-toggle" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
              {shown ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>
          {mode === "signup" ? <div id={pwHintId} className="field-hint">At least 10 characters.</div> : null}
        </div>
        {mode === "signup" ? <Field label="Confirm password" error={confirm && confirm !== password ? "The two passwords do not match." : undefined}>
          <Input type={shown ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required maxLength={200} />
        </Field> : null}
        {error ? <p role="alert" className="form-error pop-in">{error}</p> : null}
        <Button type="submit" variant="primary" loading={busy} className="signin-submit">{mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={15} /></Button>
      </form>
      {/* a real navigation, not a fetch: Google's pages and its redirect back must load in this window. Shown either way,
          so it is never missing; until the server has a Google client it is disabled and says what to set. */}
      {google ? <a className="btn btn-outline signin-google" href="/api/auth/google"><GoogleMark />Continue with Google</a>
        : <>
          <button type="button" className="btn btn-outline signin-google" disabled aria-describedby="google-off"><GoogleMark />Continue with Google</button>
          <p id="google-off" className="signin-google-off">Not set up on this server yet.</p>
        </>}
    </div>
  );
}

/** Google's own G from its sign-in branding kit, unmodified (docs/brand-use.md); the words beside it name the button. */
const GoogleMark = () => <img className="signin-google-mark" src="/brand/partners/logos/google-g.png" alt="" width={24} height={24} />;
