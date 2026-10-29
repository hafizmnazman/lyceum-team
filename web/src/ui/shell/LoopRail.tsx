// The loop across the top of every course step (plan Sections 5.2 and 7.3), compact since the redesign of 29 October
// 2026: the course, its term and save status on one line with the term's progress and History; under it the seven
// steps as a row of pills in the demo's order and names, each filled when its record exists this term, dark where you
// are, dashed where to go next, with its count. On narrow screens StepFrame's LoopStrip stands in for the row.

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, BookOpen, Check, FileSearch, GraduationCap, History, PenLine, Presentation, Scale, Telescope } from "lucide-react";
import { LOOP_STEPS, RING_STEPS, loopState, type CourseStep } from "../../app/loop.ts";
import { openStep, type AppState } from "../../app/store.ts";
import type { Subject } from "../../../../shared/types.ts";
import { Select, Tag } from "../primitives/index.tsx";

export const STEP_ICONS: Record<CourseStep, LucideIcon> = {
  course: BookOpen, watch: Telescope, report: FileSearch, decide: Scale, update: PenLine, teach: Presentation, learn: GraduationCap, history: History,
};

const PILL: Record<"done" | "next" | "open" | "here", string> = {
  done: "border-emerald bg-tint-1 text-ink hover:bg-tint-2",
  next: "border-dashed border-emerald bg-white text-ink hover:bg-tint-1",
  open: "border-border bg-white text-ink-2 hover:border-emerald hover:text-ink",
  here: "border-forest bg-forest text-white",
};

export function StepPath({ state, subject, subjects, active }: { state: AppState; subject: Subject; subjects: Subject[]; active: CourseStep }) {
  const loop = loopState(state, subject.id);
  const steps = LOOP_STEPS.filter((s) => RING_STEPS.includes(s.id));
  const done = steps.filter((s) => loop.steps.find((x) => x.id === s.id)?.done).length;
  return <nav className="grid gap-3.5 px-6 pt-5 pb-4 narrow:px-4" aria-label="Steps of this course's loop" data-demo-id="loop-rail">
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5">
      <div className="grid min-w-0 gap-0.5">
        <span className="font-mono text-[12px] tracking-[0.08em] text-emerald-text uppercase">Course loop{loop.window.term ? " · " + loop.window.term : ""}</span>
        <span className="flex flex-wrap items-center gap-2 text-[17px] font-bold text-ink"><span className="tabular">{subject.id}</span> {subject.title}
          {subject.workspaceOnly ? <Tag>Personal course workspace</Tag> : subject.status === "proposed" ? <Tag>Proposed course</Tag> : null}</span>
        <span className={"flex items-center gap-1.5 text-[13px] " + (state.persistenceStatus === "unavailable" ? "text-danger" : "text-ink-3")} role="status">
          {state.persistenceStatus === "unavailable" ? <><AlertTriangle size={14} strokeWidth={2.25} aria-hidden />Browser storage unavailable. Export your plan before closing.</>
            : state.persistenceStatus === "pending" ? "Saving..."
            : <><Check size={14} strokeWidth={2.5} aria-hidden />Saved</>}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
          <span className="h-2 w-28 overflow-hidden rounded-full bg-tint-2" aria-hidden><span className="block h-full rounded-full bg-emerald transition-[width] duration-500" style={{ width: (done / steps.length) * 100 + "%" }} /></span>
          <span><span className="tabular">{done}</span> of <span className="tabular">{steps.length}</span> done</span>
        </span>
        <button type="button" className={"inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-button)] border-2 px-3 text-[14px] font-semibold transition-colors " + (active === "history" ? "border-forest bg-forest text-white" : "border-border bg-white text-ink hover:border-forest")}
          data-demo-id="rail-history" aria-current={active === "history" ? "page" : undefined} onClick={() => openStep(subject.id, "history")}>
          <History size={16} strokeWidth={2.25} aria-hidden />History
        </button>
        {subjects.length > 1 ? <label className="hidden min-w-0 narrow:block"><span className="sr-only">Course</span> {/* the sidebar switches courses on a wider screen */}
          <Select className="min-h-10 w-auto max-w-56 py-1 pr-9 pl-3 text-[14px]" aria-label="Choose course" value={subject.id} onChange={(e) => openStep(e.target.value, active)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}</Select>
        </label> : null}
      </div>
    </div>
    <ol className="m-0 grid list-none grid-cols-7 gap-2 p-0 narrow:hidden">
      {steps.map((step) => {
        const st = loop.steps.find((x) => x.id === step.id)!;
        const Icon = STEP_ICONS[step.id];
        const here = active === step.id;
        const isNext = !st.done && step.id === loop.next;
        const look = here ? "here" : st.done ? "done" : isNext ? "next" : "open";
        return <li key={step.id} className="min-w-0">
          <button type="button" data-demo-id={"rail-" + step.id} aria-current={here ? "page" : undefined}
            aria-label={step.label + (st.done ? ", done" : isNext ? ", next" : "") + ": " + (st.note ?? st.count)} onClick={() => openStep(subject.id, step.id)}
            className={"grid w-full min-w-0 cursor-pointer gap-0.5 rounded-xl border-2 px-2.5 py-2 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald " + PILL[look]}>
            <span className="flex items-center gap-1.5 text-[14px] font-bold">
              <Icon size={16} strokeWidth={2.25} aria-hidden className="flex-none" />
              <span className="truncate">{step.label}</span>
              {st.done ? <Check size={14} strokeWidth={3} aria-hidden className={"ml-auto flex-none " + (here ? "text-lime" : "text-emerald")} />
                : isNext && !here ? <span className="ml-auto flex-none text-[11px] font-bold text-emerald-text uppercase max-[1279px]:hidden">Next</span> : null}
            </span>
            <span className={"truncate text-[12px] max-[1279px]:hidden " + (here ? "text-on-forest" : "text-ink-3")}>{st.note ?? st.count}</span>
          </button>
        </li>;
      })}
    </ol>
  </nav>;
}
