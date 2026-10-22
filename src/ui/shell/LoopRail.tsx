// The loop as a path across the top of every course step (plan Sections 5.2 and
// 7.3, set out as a path on the owner's direction of 22 October 2026): the
// selected course's steps in the same order and with the same names as the
// demo, the deck and the film, one round stop each, filled when its record
// exists this term, dark where you are, marked where to go next, each with
// its state in a word and a mark and its count; the term's progress, the
// save status and the kind of course beside the course; and History, the
// record, beside the path.

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, BookOpen, Check, FileSearch, GraduationCap, History, PenLine, Presentation, Scale, Telescope } from "lucide-react";
import { LOOP_STEPS, RING_STEPS, loopState, type CourseStep } from "../../app/loop.ts";
import { openStep, type AppState } from "../../app/store.ts";
import type { Subject } from "../../types.ts";
import { Select, Tag } from "../primitives/index.tsx";

const ICONS: Record<CourseStep, LucideIcon> = {
  course: BookOpen, watch: Telescope, report: FileSearch, decide: Scale, update: PenLine, teach: Presentation, learn: GraduationCap, history: History,
};

export function StepPath({ state, subject, subjects, active }: { state: AppState; subject: Subject; subjects: Subject[]; active: CourseStep }) {
  const loop = loopState(state, subject.id);
  const steps = LOOP_STEPS.filter((s) => RING_STEPS.includes(s.id));
  const done = steps.filter((s) => loop.steps.find((x) => x.id === s.id)?.done).length;
  return <nav className="step-path" aria-label="Steps of this course's loop" data-demo-id="loop-rail">
    <div className="step-path-head">
      <div className="step-path-course">
        <span className="eyebrow">Course loop{loop.window.term ? " · " + loop.window.term : ""}</span>
        <span className="step-path-title"><span className="tabular">{subject.id}</span> {subject.title}
          {subject.workspaceOnly ? <Tag>Personal course workspace</Tag> : subject.status === "proposed" ? <Tag>Proposed course</Tag> : null}</span>
        <span className={"step-path-save" + (state.persistenceStatus === "unavailable" ? " is-warn" : "")} role="status">
          {state.persistenceStatus === "unavailable" ? <><AlertTriangle size={14} strokeWidth={2.25} aria-hidden />Browser storage unavailable. Export your plan before closing.</>
            : state.persistenceStatus === "pending" ? "Saving in this browser..."
            : <><Check size={14} strokeWidth={2.5} aria-hidden />Changes stored in this browser</>}
        </span>
      </div>
      <div className="step-path-tools">
        <span className="step-path-progress">
          <span className="step-path-bar" aria-hidden><span style={{ width: (done / steps.length) * 100 + "%" }} /></span>
          <span><span className="tabular">{done}</span> of <span className="tabular">{steps.length}</span> done</span>
        </span>
        <button type="button" className="btn btn-outline step-path-history" data-demo-id="rail-history" aria-current={active === "history" ? "page" : undefined} onClick={() => openStep(subject.id, "history")}>
          <History size={18} strokeWidth={2.25} aria-hidden />History
        </button>
        {subjects.length > 1 ? <label className="course-switcher"><span className="sr-only">Course</span>
          <Select aria-label="Choose course" value={subject.id} onChange={(e) => openStep(e.target.value, active)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}</Select>
        </label> : null}
      </div>
    </div>
    <ol className="step-stops">
      {steps.map((step) => {
        const st = loop.steps.find((x) => x.id === step.id)!;
        const Icon = ICONS[step.id];
        const here = active === step.id;
        const isNext = !st.done && step.id === loop.next;
        const phase = st.done ? "done" : isNext ? "next" : "open";
        return <li key={step.id} className={"step-stop is-" + phase + (here ? " is-here" : "")}>
          <button type="button" className="step-node" data-demo-id={"rail-" + step.id} aria-current={here ? "page" : undefined}
            aria-label={step.label + (st.done ? ", done" : isNext ? ", next" : "") + ": " + (st.note ?? st.count)} onClick={() => openStep(subject.id, step.id)}>
            <Icon size={24} strokeWidth={2.25} aria-hidden />
            {st.done ? <span className="step-check" aria-hidden><Check size={13} strokeWidth={3.5} /></span> : null}
          </button>
          <span className="step-label" aria-hidden>{step.label}</span>
          <span className="step-status" aria-hidden>{st.done ? <><Check size={13} strokeWidth={3} />Done</> : isNext ? "Next" : null}</span>
          <span className="step-count" aria-hidden>{st.note ?? st.count}</span>
        </li>;
      })}
    </ol>
  </nav>;
}
