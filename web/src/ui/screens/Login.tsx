// Sign in, on the forest-deep backdrop. Two cards side by side, the same height: who Lyceum is, with the host saying what
// happens next, and the account card (sign in or create an account: email and password, or Google, through Supabase).
// Under both, the demo as its own band: its people as cards, one tap each, with the one to start with marked. On a phone
// the account comes before the demo. The public landing page is reachable from here without signing in.

import { useEffect, useId, useState } from "react";
import { ArrowRight, Eye, EyeOff, Play, ShieldCheck } from "lucide-react";
import { PEOPLE_IDS } from "../../../../shared/data/seed.ts";
import {
  JOB_ROLE_LABEL,
  JOB_ROLES,
  signIn,
  signInWithGoogle,
  signUp,
} from "../../app/account.ts";
import { hatsOn, subjectsForPerson } from "../../app/roles.ts";
import {
  accountRestoreError,
  enterAccount,
  login,
  navigate,
  useStore,
} from "../../app/store.ts";
import { HOST_NAME, MascotChat } from "../mascots/index.tsx";
import { Button, Field, Input } from "../primitives/index.tsx";
import { Dropdown } from "../primitives/Dropdown.tsx";
import { Segmented } from "../primitives/Segmented.tsx";
import type { Person } from "../../../../shared/types.ts";

export function LoginScreen() {
  const state = useStore();
  // Someone creating an account means to have one, so the demo's people step aside while that form is open.
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // One line per person: what they can do in the loop (plan Section 4.2), worked out from today's hats.
  function scopeLine(person: Person): string {
    if (person.orgRole === "management")
      return "Management. Appears only in the illustrative approval sandbox.";
    if (person.orgRole === "department")
      return "Programme owner. Decides on every course's brief and assigns positions.";
    const subjects = subjectsForPerson(person.id, state.assignments);
    const coordinating = subjects.filter((sid) =>
      hatsOn(person.id, sid, state.assignments).includes("coordinator"),
    );
    const lecturing = subjects.filter((sid) => !coordinating.includes(sid));
    const parts = [];
    if (coordinating.length)
      parts.push(
        "Coordinator of " +
          coordinating.join(" and ") +
          ". Runs the whole loop and decides.",
      );
    if (lecturing.length)
      parts.push(
        "Lecturer on " +
          lecturing.join(" and ") +
          ". Prepares and teaches; others decide.",
      );
    if (!person.verified) parts.push("Unverified, so edits are flagged.");
    return parts.join(" ");
  }

  const demoPeople = state.people.filter((p) => !p.account);
  return (
    <div className="signin forest-backdrop">
      <div className="grid w-full max-w-[1080px] grid-cols-[minmax(0,1fr)_minmax(0,440px)] items-stretch gap-6 max-[900px]:max-w-[520px] max-[900px]:grid-cols-1">
        <section
          className="card-forest on-forest flex min-w-0 flex-col justify-between gap-8 p-10 max-[900px]:gap-5 max-[900px]:p-7"
          aria-labelledby="signin-title"
        >
          <div className="grid gap-3">
            <h1 id="signin-title" className="wordmark m-0 cursor-default p-0 text-[64px] leading-none max-[760px]:text-[48px]">
              Lyceum
            </h1>
            <p className="mt-1 mb-0 font-display text-[32px] leading-[1.2] font-extrabold tracking-[-0.02em] text-white max-[760px]:text-[26px]">
              Course decisions, with receipts.
            </p>
            <p className="m-0 max-w-[460px] text-base leading-[1.6]">
              Real job postings become a course decision with every quotation on
              record, each semester. Nothing runs by itself.
            </p>
          </div>
          <div className="max-[900px]:hidden [&_.mascot-chat-bubble]:text-ink">
            <MascotChat
              who="host"
              mood="greeting"
              size={104}
              name={HOST_NAME}
              layout="side"
              lines={[
                "Sign in to pick up your courses where you left them, on any browser.",
                "New here? Create an account and I'll walk you through your first course.",
                "Just looking? Try the demo as Dr Sobri to see the whole loop on a sample course.",
              ]}
            />
          </div>
          <div className="grid justify-items-start gap-3">
            <div className="button-row">
              <Button
                variant="ghost"
                data-demo-id="view-index"
                onClick={() => navigate("index")}
              >
                See how Lyceum works <ArrowRight size={16} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}
              >
                <Play size={14} /> Watch the tour
              </Button>
            </div>
            <p className="m-0 text-[13px] opacity-85">
              Local prototype. Synthetic examples are labelled where they
              appear.
            </p>
          </div>
        </section>

        <section className="card flex min-w-0 flex-col border-white p-7 shadow-[0_6px_0_var(--color-lime)]" aria-label="Sign in">
          <AccountPanel mode={mode} onMode={setMode} />
          {mode === "signup" ? (
            <p className="mt-auto mb-0 pt-5 text-[13px] text-ink-2">
              Your account and its work are kept by this Lyceum server. Next,
              two short steps set up your first course.
            </p>
          ) : (
            <p className="mt-auto mb-0 pt-5 text-[13px] text-ink-2">
              New here?{" "}
              <button type="button" className="link-button" onClick={() => setMode("signup")}>
                Create an account
              </button>
              ; two short steps then set up your first course.
            </p>
          )}
        </section>

        {mode === "signin" ? (
          <section className="card-forest on-forest col-span-full p-7" aria-labelledby="demo-title">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 id="demo-title" className="m-0 font-display text-[22px] font-extrabold tracking-[-0.02em] text-white">
                Or try the demo, no account needed
              </h2>
              <p className="m-0 text-[13px]">
                Demo people have no passwords and save in this browser only.
              </p>
            </div>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 p-0" aria-label="Demo people">
              {demoPeople.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex h-full w-full cursor-pointer flex-col items-start gap-2 rounded-card border-2 border-forest-border bg-forest-2 p-4 text-left text-white transition-[border-color,translate] duration-200 ease-out hover:border-lime motion-safe:hover:-translate-y-0.5"
                    data-demo-id={`login-${p.id}`}
                    onClick={() => login(p.id)}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span aria-hidden className="avatar size-10 text-[14px]">
                        {p.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      {p.id === PEOPLE_IDS.sobri ? (
                        <span className="rounded-full bg-lime px-2.5 py-0.5 text-[12px] font-bold text-forest">
                          Start here
                        </span>
                      ) : null}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-display text-[17px] font-extrabold">
                      {p.name}
                      {p.verified ? (
                        <ShieldCheck size={14} aria-label="Verified" className="text-lime" />
                      ) : null}
                    </span>
                    <span className="text-[13px] leading-[1.45] text-on-forest">{scopeLine(p)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** A real account on the local API: sign in, or create one (who, where, as what) and go to onboarding. */
function AccountPanel({
  mode,
  onMode,
}: {
  mode: "signin" | "signup";
  onMode: (mode: "signin" | "signup") => void;
}) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const pwId = useId(),
    pwHintId = pwId + "-hint";
  useEffect(() => {
    // When a Google sign-in fails, Supabase sends the browser back with ?error_description=…; say why once, then tidy the address.
    const reason = new URLSearchParams(window.location.search).get(
      "error_description",
    );
    if (reason) {
      setError("Google sign-in failed: " + reason);
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.hash,
      );
    }
  }, []);
  /** Leaves for Google's pages; the app reloads signed in when Google sends the person back (restoreAccountSession). */
  async function google() {
    setError("");
    setLeaving(true);
    const result = await signInWithGoogle();
    if (!result.ok) {
      setLeaving(false);
      setError(result.error);
    }
  }
  async function submit() {
    setError("");
    if (mode === "signup" && !jobRole) {
      setError("Choose your role.");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    const result =
      mode === "signup"
        ? await signUp({ name, email, password, institution, jobRole })
        : await signIn(email, password);
    const opened = result.ok ? await enterAccount(result.user) : result;
    setBusy(false);
    if (!opened.ok) setError(opened.error);
  }
  const switchTo = (next: "signin" | "signup") => {
    onMode(next);
    setError("");
    setConfirm("");
  };
  return (
    <div>
      <Segmented
        kind="tabs"
        label="Your account"
        className="mb-5 grid w-full grid-cols-2 [&_.segmented-option]:min-h-11"
        value={mode}
        onChange={switchTo}
        options={[
          { value: "signin", label: "Sign in" },
          { value: "signup", label: "Create account" },
        ]}
      />
      <form
        className="grid gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {mode === "signup" ? (
          <Field
            label="Full name"
            hint="As colleagues know you, e.g. Dr Aina Rahim."
          >
            <Input
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </Field>
        ) : null}
        <Field label={mode === "signup" ? "Work email" : "Email"}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
          />
        </Field>
        {mode === "signup" ? (
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3 max-[480px]:grid-cols-1">
            <Field label="Institution">
              <Input
                autoComplete="organization"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
                maxLength={200}
                placeholder="e.g. Universiti Teknologi PETRONAS"
              />
            </Field>
            <Field label="Your role">
              <Dropdown
                value={jobRole}
                onChange={setJobRole}
                options={JOB_ROLES.map((r) => ({
                  value: r,
                  label: JOB_ROLE_LABEL[r],
                }))}
              />
            </Field>
          </div>
        ) : null}
        {/* written out rather than through Field, so the label and hint point at the input, not at its wrapper */}
        <div className="form-field">
          <label htmlFor={pwId} className="field-label">
            Password
          </label>
          <div className="relative [&_.control]:pr-[52px]">
            <Input
              id={pwId}
              type={shown ? "text" : "password"}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "signup" ? 10 : undefined}
              maxLength={200}
              aria-describedby={mode === "signup" ? pwHintId : undefined}
            />
            <button
              type="button"
              className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-ink-2 hover:bg-tint-1 hover:text-ink"
              onClick={() => setShown((v) => !v)}
              aria-label={shown ? "Hide password" : "Show password"}
              aria-pressed={shown}
            >
              {shown ? (
                <EyeOff size={18} aria-hidden />
              ) : (
                <Eye size={18} aria-hidden />
              )}
            </button>
          </div>
          {mode === "signup" ? (
            <div id={pwHintId} className="field-hint">
              At least 10 characters.
            </div>
          ) : null}
        </div>
        {mode === "signup" ? (
          <Field
            label="Confirm password"
            error={
              confirm && confirm !== password
                ? "The two passwords do not match."
                : undefined
            }
          >
            <Input
              type={shown ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              maxLength={200}
            />
          </Field>
        ) : null}
        {error || accountRestoreError ? (
          <p role="alert" className="form-error pop-in">
            {error || accountRestoreError}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          className="mt-1 w-full justify-center"
        >
          {mode === "signin" ? "Sign in" : "Create account"}{" "}
          <ArrowRight size={15} />
        </Button>
      </form>
      {/* Supabase sends this window to Google and back; Google is switched on in Supabase (config.toml or the dashboard). */}
      <button
        type="button"
        className="btn btn-outline mt-3 flex w-full items-center justify-center gap-2.5 no-underline disabled:transform-none disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
        onClick={() => void google()}
        disabled={leaving}
      >
        <GoogleMark />
        Continue with Google
      </button>
    </div>
  );
}

/** Google's own G from its sign-in branding kit, unmodified (docs/brand-use.md); the words beside it name the button. */
const GoogleMark = () => (
  <img
    className="block size-6 flex-none"
    src="/brand/partners/logos/google-g.png"
    alt=""
    width={24}
    height={24}
  />
);
