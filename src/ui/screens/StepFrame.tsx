// The frame every loop step shares (plan Sections 5.2 and 7.3, set out on the
// owner's direction of 22 October 2026): the course's loop as a path across the
// top, then the helper acting at this step asking the step's question in a
// speech bubble (only that helper; at Decide a scale, because people decide),
// and on narrow screens the loop as a strip of pills instead of the path. The
// handoff to the next step closes the screen once its record exists.

import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import { LOOP_STEPS, stepDef, type CourseStep } from "../../app/loop.ts";
import type { HelperRole } from "../../app/moods.ts";
import { openStep, type AppState } from "../../app/store.ts";
import { subjectsForPerson } from "../../app/roles.ts";
import type { Person, Subject } from "../../types.ts";
import { CAST, Mascot, useCourseMoods } from "../mascots/index.tsx";
import { Page } from "../primitives/index.tsx";
import { StepPath } from "../shell/LoopRail.tsx";

export interface StepHelper { who: HelperRole; line: string }

/** The courses this person may open in the loop (an academic, only their assigned courses), and the one in view. */
export function courseContext(state: AppState, person: Person): { subjects: Subject[]; subject: Subject | undefined } {
  const own = subjectsForPerson(person.id, state.assignments);
  const subjects = state.subjects.filter((s) => person.orgRole !== "academic" || own.includes(s.id));
  return { subjects, subject: subjects.find((s) => s.id === state.selectedSubjectId) ?? subjects[0] };
}

export function StepFrame({ state, step, subject, subjects, helper, children }: {
  state: AppState; step: CourseStep; subject: Subject; subjects: Subject[]; helper?: StepHelper; children: ReactNode;
}) {
  const def = stepDef(step);
  const moods = useCourseMoods(subject.id);
  const cast = helper ? CAST.find((c) => c.who === helper.who)! : null;
  const mood = helper && moods ? moods.helpers[helper.who] : "resting";
  const speaking = helper && cast && mood !== "stuck" ? { helper, cast } : null; // a stuck helper steps aside: no character on an error
  return (
    <Page wide>
      <StepPath state={state} subject={subject} subjects={subjects} active={step} />
      <LoopStrip subjectId={subject.id} active={step} />
      <header className="step-hero">
        <div className="step-hero-figure" aria-hidden>
          {speaking ? <Mascot who={speaking.helper.who} mood={mood} size={104} />
            : step === "decide" ? <span className="step-hero-people"><Scale size={48} strokeWidth={2} /></span> : null}
        </div>
        <div className="speech" data-demo-id={speaking ? "helper-" + speaking.helper.who : undefined}>
          <span className="eyebrow">{def.number ? "Step " + def.number + " of 6" : step === "course" ? "Setup" : "The record"}</span>
          <h1 className="page-title" tabIndex={-1}>{def.label}</h1>
          <p className="speech-question">{def.question}</p>
          {speaking ? <p className="speech-helper"><strong>{speaking.cast.name}</strong>, {speaking.cast.job.toLowerCase()}. {speaking.helper.line}</p>
            : step === "decide" ? <p className="speech-helper">People decide here. No helper speaks for them.</p> : null}
        </div>
      </header>
      {children}
    </Page>
  );
}

/** The loop as a horizontal strip, shown on narrow screens in place of the path's stops. */
export function LoopStrip({ subjectId, active }: { subjectId: string; active: CourseStep }) {
  return (
    <nav className="loop-strip" aria-label="Steps of this course's loop">
      <ol>
        {LOOP_STEPS.map((s) => <li key={s.id}>
          <button type="button" data-demo-id={"strip-" + s.id} aria-current={active === s.id ? "page" : undefined} onClick={() => openStep(subjectId, s.id)}>{s.label}</button>
        </li>)}
      </ol>
    </nav>
  );
}
