// Sign in. The identity block leads on a forest card over the forest-deep
// backdrop (plan Section 6.1); the demo people are clean rows with their real
// scope. The public landing page (how Lyceum works) is reachable from here
// without signing in.

import { ArrowRight, ShieldCheck } from "lucide-react";
import { hatsOn, subjectsForPerson } from "../../app/roles.ts";
import { login, navigate, useStore } from "../../app/store.ts";
import { Button } from "../primitives/index.tsx";
import type { Person } from "../../types.ts";

export function LoginScreen() {
  const state = useStore();

  // One line per person: what they can do in the loop (plan Section 4.2), worked out from today's hats.
  function scopeLine(person: Person): string {
    if (person.orgRole === "management") return "Management: appears only in the illustrative approval sandbox; no part in the loop";
    if (person.orgRole === "department") return "Programme owner: decides on the briefs for every course in the programme, and assigns positions";
    const subjects = subjectsForPerson(person.id, state.assignments);
    const coordinating = subjects.filter((sid) => hatsOn(person.id, sid, state.assignments).includes("coordinator"));
    const lecturing = subjects.filter((sid) => !coordinating.includes(sid));
    const parts = [];
    if (coordinating.length) parts.push("Coordinator of " + coordinating.join(" and ") + ": runs the loop, decides and adopts; a decision on their own brief is self-recorded");
    if (lecturing.length) parts.push("Lecturer on " + lecturing.join(" and ") + ": watches, reports, briefs and teaches, but does not decide or adopt");
    if (!person.verified) parts.push("unverified, so edits are flagged");
    return parts.join("; ");
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
            Gather what employers ask for, confirm every requirement as an exact
            quotation, see honest counts, decide what the course should do about
            it, and take a brief to the meeting. Nothing runs by itself.
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

        {/* role picker */}
        <section className="signin-people card card-focal" aria-labelledby="signin-people-title">
          <div id="signin-people-title" className="eyebrow">Sign in as</div>
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
          <p className="muted">One faculty, five local personas. Lecturers: choose Dr Sobri or Ms Tan for the full course workflow.</p>
        </section>
      </div>
    </div>
  );
}
