// Sign in. The identity block leads on a forest card over the forest-deep
// backdrop (plan Section 6.1); the demo people are clean rows with their real
// scope. The public landing page (how Lyceum works) is reachable from here
// without signing in.

import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { authProviders, googleErrorText, signIn, signUp } from "../../app/account.ts";
import { hatsOn, subjectsForPerson } from "../../app/roles.ts";
import { enterAccount, login, navigate, useStore } from "../../app/store.ts";
import { Button, Field, Input } from "../primitives/index.tsx";
import type { Person } from "../../types.ts";

export function LoginScreen() {
  const state = useStore();

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
        {/* identity: a forest card on the forest-deep backdrop, so no small text sits on the backdrop itself */}
        <section className="signin-brand card-forest on-forest" aria-labelledby="signin-title">
          <span className="eyebrow">A lecturer's course workspace</span>
          <h1 id="signin-title" className="wordmark">Lyceum</h1>
          <p className="signin-tagline">Course decisions, with receipts.</p>
          <p className="signin-lead">
            Lyceum turns real job postings into a course decision with receipts,
            every semester. Nothing runs by itself.
          </p>
          <div>
            <Button variant="ghost" data-demo-id="view-index" onClick={() => navigate("index")}>
              See how Lyceum works <ArrowRight size={16} />
            </Button>
          </div>
          <p className="signin-foot">
            Local prototype. Your work stays in this browser. Synthetic examples are labelled where they appear.
          </p>
        </section>

        <div className="signin-column">
        <AccountPanel />

        {/* the demo's people: the tour, the judge's walk and the tests sign in here */}
        <section className="signin-people card card-focal" aria-labelledby="signin-people-title">
          <div id="signin-people-title" className="eyebrow">Or explore the demo as</div>
          <div className="people-list">
            {state.people.map((p) => (
              <button key={p.id} type="button" className="person-row" data-demo-id={`login-${p.id}`} onClick={() => login(p.id)}>
                <span aria-hidden className="avatar avatar-lg">
                  {p.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="person-text">
                  <span className="person-name">
                    {p.name}
                    {p.verified ? <ShieldCheck size={14} aria-label="Verified" /> : null}
                  </span>
                  <span className="person-scope">{scopeLine(p)}</span>
                </span>
                <ArrowRight size={16} aria-hidden />
              </button>
            ))}
          </div>
          <p className="muted">Five local personas, no passwords, saved in this browser only. Start with Dr Sobri for the whole loop.</p>
        </section>
        </div>
      </div>
    </div>
  );
}

/** A real account on the local API: sign in, or create one and go to onboarding. */
function AccountPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [google, setGoogle] = useState(false);
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
    setBusy(true); setError("");
    const result = mode === "signup" ? await signUp(name, email, password) : await signIn(email, password);
    const opened = result.ok ? await enterAccount(result.user) : result;
    setBusy(false);
    if (!opened.ok) setError(opened.error);
  }
  const switchTo = (next: "signin" | "signup") => { setMode(next); setError(""); };
  return (
    <section className="signin-account card card-focal" aria-labelledby="signin-account-title">
      <div className="signin-tabs" role="tablist" aria-label="Your account">
        <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "is-active" : ""} onClick={() => switchTo("signin")}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "is-active" : ""} onClick={() => switchTo("signup")}>Create account</button>
      </div>
      <h2 id="signin-account-title" className="sr-only">{mode === "signin" ? "Sign in to your account" : "Create an account"}</h2>
      <form className="signin-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {mode === "signup" ? <Field label="Your name"><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></Field> : null}
        <Field label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></Field>
        <Field label="Password" hint={mode === "signup" ? "At least 10 characters." : undefined}>
          <Input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 10 : undefined} maxLength={200} />
        </Field>
        {error ? <p role="alert" className="form-error pop-in">{error}</p> : null}
        <Button type="submit" variant="primary" loading={busy}>{mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={15} /></Button>
      </form>
      {google ? <>
        <div className="signin-or" aria-hidden="true"><span>or</span></div>
        {/* a real navigation, not a fetch: Google's pages and its redirect back must load in this window */}
        <a className="btn btn-outline signin-google" href="/api/auth/google">Continue with Google</a>
      </> : null}
      <p className="muted signin-account-note">Accounts and their workspaces are kept by the local API on this computer.</p>
    </section>
  );
}

