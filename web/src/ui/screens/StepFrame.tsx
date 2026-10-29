// The frame every loop step shares (plan Sections 5.2 and 7.3; redesigned 29 October 2026 so the work starts above the
// fold): one header card holding the course's loop (StepPath) and the step itself, its question and the helper acting
// at it (at Decide a scale, because people decide), with the step's guide behind "?"; then the work, and beside it on a
// wide screen the step's rail: where it stands, when it counts as done, and the way on. On a narrower screen the rail
// sits above the work as one strip, and on a phone the loop is a strip of pills (LoopStrip).

import { useState, type ReactNode } from "react";
import { ArrowRight, CircleHelp, Scale, X } from "lucide-react";
import { LOOP_STEPS, loopState, stepDef, type CourseStep } from "../../app/loop.ts";
import type { HelperRole } from "../../app/moods.ts";
import { openStep, type AppState } from "../../app/store.ts";
import { subjectsForPerson } from "../../app/roles.ts";
import type { Person, Subject } from "../../../../shared/types.ts";
import { CAST, Mascot, useCourseMoods } from "../mascots/index.tsx";
import { Button, Page, Tag } from "../primitives/index.tsx";
import { SectionGuide, hasGuide } from "../primitives/SectionHelp.tsx";
import { StepPath } from "../shell/LoopRail.tsx";

export interface StepHelper { who: HelperRole; line: string }

/** The courses this person may open in the loop (an academic, only their assigned courses), and the one in view. */
export function courseContext(state: AppState, person: Person): { subjects: Subject[]; subject: Subject | undefined } {
  const own = subjectsForPerson(person.id, state.assignments);
  const subjects = state.subjects.filter((s) => person.orgRole !== "academic" || own.includes(s.id));
  return { subjects, subject: subjects.find((s) => s.id === state.selectedSubjectId) ?? subjects[0] };
}

const CARD = "rounded-[var(--radius-card)] border-2 border-forest bg-white shadow-[0_4px_0_var(--forest)]";

export function StepFrame({ state, step, subject, subjects, helper, children }: {
  state: AppState; step: CourseStep; subject: Subject; subjects: Subject[]; helper?: StepHelper; children: ReactNode;
}) {
  const def = stepDef(step);
  const moods = useCourseMoods(subject.id);
  const [help, setHelp] = useState(false);
  const cast = helper ? CAST.find((c) => c.who === helper.who)! : null;
  const mood = helper && moods ? moods.helpers[helper.who] : "resting";
  const speaking = helper && cast && mood !== "stuck" ? { helper, cast } : null; // a stuck helper steps aside: no character on an error
  const guideScreen = def.screen;
  return (
    <Page wide>
      <header className={CARD + " mb-6"}>
        <StepPath state={state} subject={subject} subjects={subjects} active={step} />
        <LoopStrip subjectId={subject.id} active={step} />
        <div className="flex items-start gap-4 border-t-2 border-tint-2 px-6 py-4 narrow:px-4" data-demo-id={speaking ? "helper-" + speaking.helper.who : undefined}>
          <div className="flex-none narrow:hidden" aria-hidden>
            {speaking ? <Mascot who={speaking.helper.who} mood={mood} size={64} />
              : step === "decide" ? <span className="inline-flex size-16 items-center justify-center rounded-full bg-tint-1 text-emerald-text"><Scale size={32} strokeWidth={2} /></span> : null}
          </div>
          <div className="grid min-w-0 flex-1 gap-1">
            <span className="font-mono text-[12px] tracking-[0.08em] text-emerald-text uppercase">{def.number ? "Step " + def.number + " of 6" : step === "course" ? "Setup" : "The record"}</span>
            <h1 className="page-title m-0 text-[30px] leading-[1.15] narrow:text-[26px]" tabIndex={-1}>{def.label}<span className="text-ink-2 font-semibold text-[20px] narrow:block narrow:text-[17px]"><span className="narrow:hidden"> · </span>{def.question}</span></h1>
            {speaking ? <p className="m-0 text-[14px] text-ink-2"><strong className="text-ink">{speaking.cast.name}</strong>, {speaking.cast.job.toLowerCase()}. {speaking.helper.line}</p>
              : step === "decide" ? <p className="m-0 text-[14px] text-ink-2">People decide here. No helper speaks for them.</p> : null}
          </div>
          {hasGuide(guideScreen) ? <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} aria-label={(help ? "Close" : "Open") + " the guide to " + def.label}
            className="inline-flex size-10 flex-none cursor-pointer items-center justify-center rounded-full border-2 border-border bg-white text-ink-2 transition-colors hover:border-forest hover:text-ink">
            {help ? <X size={18} /> : <CircleHelp size={20} />}
          </button> : null}
        </div>
        {help ? <div className="border-t-2 border-tint-2 px-6 py-4 narrow:px-4 [&_.section-help-body]:border-0 [&_.section-help-body]:bg-tint-1"><SectionGuide screen={guideScreen} /></div> : null}
      </header>
      <div className={"grid items-start gap-6" + (step === "history" ? "" : " min-[1200px]:grid-cols-[minmax(0,1fr)_280px]")}>
        <div className="min-w-0">{children}</div>
        <StepRail state={state} subjectId={subject.id} step={step} />
      </div>
    </Page>
  );
}

/** Where this step stands, the rule that completes it, and the way on: the rail beside the work on a wide screen, a
 *  strip above it on a narrower one. It stands in for the handoff box, which shows only below that width. */
function StepRail({ state, subjectId, step }: { state: AppState; subjectId: string; step: CourseStep }) {
  if (step === "history") return null;
  const loop = loopState(state, subjectId);
  const def = stepDef(step), st = loop.steps.find((s) => s.id === step)!;
  const next = LOOP_STEPS[LOOP_STEPS.findIndex((s) => s.id === step) + 1];
  const isNext = !st.done && loop.next === step;
  return <aside aria-label={"About the " + def.label + " step"} data-demo-id="step-rail"
    className={CARD + " order-first flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 min-[1200px]:sticky min-[1200px]:top-6 min-[1200px]:order-none min-[1200px]:grid min-[1200px]:gap-4 min-[1200px]:p-5"}>
    <div className="grid gap-1.5">
      <span className="font-mono text-[12px] tracking-[0.08em] text-emerald-text uppercase max-[1199px]:hidden">This step</span>
      <span className="flex flex-wrap items-center gap-2"><Tag tone={st.done ? "ok" : isNext ? "accent" : undefined}>{st.done ? "Done" : isNext ? "Next" : "Open"}</Tag><span className="text-[14px] font-semibold text-ink">{st.count}</span></span>
    </div>
    {st.note ? <p className="m-0 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-ink">{st.note}</p> : null}
    <div className="grid min-w-0 flex-1 gap-0.5 max-[1199px]:basis-72">
      <span className="text-[13px] font-semibold text-ink">Done when</span>
      <span className="text-[13px] leading-[1.45] text-ink-2">{def.doneWhen}</span>
    </div>
    {st.done ? <p className="m-0 text-[13px] leading-[1.45] text-ink-2 max-[1199px]:hidden">{def.handoff}</p> : null}
    {next && next.id !== "history" ? <Button variant={st.done ? "primary" : undefined} onClick={() => openStep(subjectId, next.id)} data-demo-id={"rail-next-" + step}>
      Go to {next.label} <ArrowRight size={15} /></Button>
      : step === "learn" ? <Button onClick={() => openStep(subjectId, "history")}>See the record <ArrowRight size={15} /></Button> : null}
  </aside>;
}

/** The loop as a horizontal strip, shown on narrow screens in place of the path's stops. */
export function LoopStrip({ subjectId, active }: { subjectId: string; active: CourseStep }) {
  return (
    <nav className="loop-strip px-4 pb-3" aria-label="Steps of this course's loop">
      <ol>
        {LOOP_STEPS.map((s) => <li key={s.id}>
          <button type="button" data-demo-id={"strip-" + s.id} aria-current={active === s.id ? "page" : undefined} onClick={() => openStep(subjectId, s.id)}>{s.label}</button>
        </li>)}
      </ol>
    </nav>
  );
}
