// The guided journey: a horizontal bar in Course Studio and a card on Home.
// Both read the same computed steps, so "done" means the workspace holds the
// result, and "next" is always one concrete action.

import { ArrowRight, Check } from "lucide-react";
import { journeyFor, nextJourneyStep } from "../../app/journey.ts";
import { navigate, selectStudioTab, selectSubject, type AppState } from "../../app/store.ts";
import { Button, Tag } from "./index.tsx";

function go(step: { screen: "courses" | "studio" | "inbox" | string; tab?: AppState["studioTab"] }, subjectId: string | null) {
  if (step.screen === "studio") { if (!subjectId) { navigate("courses"); return; } selectSubject(subjectId); if (step.tab) selectStudioTab(step.tab); navigate("studio"); return; }
  navigate(step.screen as "courses");
}

export function JourneyBar({ state, subjectId }: { state: AppState; subjectId: string }) {
  const steps = journeyFor(state, subjectId);
  const next = nextJourneyStep(steps);
  const done = steps.filter((s) => s.done).length;
  return <nav className="journey-bar" aria-label="Your progress on this course" data-demo-id="journey-bar">
    <ol className="journey-steps">
      {steps.map((step, index) => <li key={step.id} className={step.done ? "is-done" : step.id === next?.id ? "is-next" : ""}>
        <button type="button" onClick={() => go(step, subjectId)} aria-current={step.id === next?.id ? "step" : undefined} aria-label={step.title + (step.done ? ", done" : step.id === next?.id ? ", next" : "")}>
          <span className="journey-mark" aria-hidden>{step.done ? <Check size={13} /> : index + 1}</span>
          <span className="journey-title">{step.title}</span>
        </button>
      </li>)}
    </ol>
    <div className="journey-next">
      {next ? <><Tag tone="accent">Next</Tag><span>{next.help}</span><Button variant="quiet" onClick={() => go(next, subjectId)}>{next.title} <ArrowRight size={14} /></Button></>
        : <><Tag tone="ok">All seven steps done</Tag><span>{done} of {steps.length}. Refresh the evidence next term, or send the brief to another colleague.</span></>}
    </div>
  </nav>;
}

export function JourneyCard({ state, subjectId, title }: { state: AppState; subjectId: string | null; title?: string }) {
  const steps = journeyFor(state, subjectId);
  const next = nextJourneyStep(steps);
  const done = steps.filter((s) => s.done).length;
  return <section className="workspace-panel journey-card" aria-labelledby="journey-card-title" data-demo-id="journey-card">
    <div className="section-heading"><div><h2 id="journey-card-title">{title ?? (subjectId ? "Your progress on " + subjectId : "Start here")}</h2>
      <p className="muted">{done} of {steps.length} steps done. Each step is one screen and one action; the guide reads your real work.</p></div>
      {next ? <Button variant="primary" onClick={() => go(next, subjectId)} data-demo-id="journey-next">{next.title} <ArrowRight size={15} /></Button> : null}</div>
    <ol className="journey-grid">
      {steps.map((step, index) => <li key={step.id} className={step.done ? "is-done" : step.id === next?.id ? "is-next" : ""}>
        <span className="journey-mark" aria-hidden>{step.done ? <Check size={14} /> : index + 1}</span>
        <div><strong>{step.title}{step.done ? <span className="journey-status">Done</span> : step.id === next?.id ? <span className="journey-status is-next">Next</span> : null}</strong><p className="muted">{step.done ? step.count : step.help}</p></div>
        <Button variant="quiet" aria-label={(step.done ? "Open: " : "Do it: ") + step.title} onClick={() => go(step, subjectId)}>{step.done ? "Open" : "Do it"}</Button>
      </li>)}
    </ol>
  </section>;
}
