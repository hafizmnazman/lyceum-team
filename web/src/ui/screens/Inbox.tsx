// Home for every role (plan Section 5.3; redesigned 29 October 2026): one action, the next step on the course in view
// with its question and its rule; beside it everything waiting on this person (briefs to decide and notifications, one
// list) and what happened lately; under them each course with its loop as seven segments. A brief opened here carries its receipts and, for
// a recipient who decides, the four decisions with a required note.

import { useState, type ReactNode } from "react";
import { ArrowRight, X } from "lucide-react";
import { subjectsForPerson } from "../../app/roles.ts";
import { RING_STEPS, loopState, plural, stepDef } from "../../app/loop.ts";
import { planSummary } from "../../../../shared/lib/teachingPlan.ts";
import { RECOMMENDATION_LABEL } from "../../../../shared/lib/evidence.ts";
import { downloadText } from "../../../../shared/lib/download.ts";
import type { Notification } from "../../../../shared/types.ts";
import {
  currentPerson,
  inboxFor,
  mayDecide,
  navigate,
  openNotification,
  openRecap,
  openStep,
  personWithHat,
  selectBrief,
  selectProposal,
  useStore,
} from "../../app/store.ts";
import { Button, Page, PageHead, Tag } from "../primitives/index.tsx";
import { runTimeline } from "../../app/runs.ts";
import { HOST_NAME, MascotChat, useCourseMoods } from "../mascots/index.tsx";
import { BriefDecisionPanel } from "./Decide.tsx";

const KIND_LABEL: Record<Notification["kind"], string> = {
  "ping-update": "Update requested",
  "ping-new-subject": "New subject requested",
  "review-request": "Review requested",
  "test-done": "Acceptance test finished",
  approved: "Change approved",
  rejected: "Change rejected",
  "evidence-brief": "Evidence brief",
  "brief-decision": "Decision on your brief",
};

const KIND_TONE: Record<Notification["kind"], "accent" | "warn" | "ok" | "danger"> = {
  "ping-update": "warn",
  "ping-new-subject": "warn",
  "review-request": "accent",
  "test-done": "accent",
  approved: "ok",
  rejected: "danger",
  "evidence-brief": "accent",
  "brief-decision": "ok",
};

export function InboxScreen() {
  const state = useStore();
  const person = currentPerson();
  if (!person) return null;
  const items = inboxFor(person.id);
  const unread = items.filter((n) => !n.read);
  const top = unread[0];
  const rest = items.filter((n) => n.id !== top?.id);
  const ownIds = subjectsForPerson(person.id, state.assignments);
  const ownCourses = state.subjects.filter((s) => ownIds.includes(s.id));
  const recentCourse = [...ownCourses].sort((a, b) => {
    if (a.id === state.selectedSubjectId) return -1;
    if (b.id === state.selectedSubjectId) return 1;
    const aDate = state.teachingPlans.find((p) => p.subjectId === a.id)?.updatedAt ?? "";
    const bDate = state.teachingPlans.find((p) => p.subjectId === b.id)?.updatedAt ?? "";
    return bDate.localeCompare(aDate);
  })[0];
  // A plan holding only the term's sample sessions is not the lecturer's plan yet (depth plan Section 5.1).
  const recentPlan = recentCourse && state.teachingPlans.find((p) => p.subjectId === recentCourse.id && p.sessions.some((s) => !s.sample));
  const nextSession = recentPlan && planSummary(recentPlan, state.clos.filter((c) => c.subjectId === recentCourse?.id)).next;
  const brief = state.evidenceBriefs.find((b) => b.id === state.selectedBriefId && (b.createdBy === person.id || b.recipients.includes(person.id)));
  // Briefs waiting for this person: received with the capability to decide and no decision of theirs yet,
  // or prepared by them and still waiting for a second person.
  const waiting = state.evidenceBriefs.filter((b) => {
    const latest = loopState(state, b.subjectId).latestBrief;
    if (latest?.id !== b.id) return false;
    const mine = state.briefDecisions.some((d) => d.briefId === b.id && d.byPersonId === person.id);
    if (b.recipients.includes(person.id)) return mayDecide(b.subjectId, person) && !mine;
    return b.createdBy === person.id && Boolean(b.sentAt) && !state.briefDecisions.some((d) => d.briefId === b.id && d.byPersonId !== person.id);
  });
  const activity = recentCourse ? runTimeline(state, recentCourse.id).filter((e) => !e.derived || e.step).slice(-5).reverse() : [];
  const legacy = person.orgRole === "management" ? state.proposals.filter((p) => p.status === "management-approval") : [];

  return (
    <Page wide>
      <PageHead title={`Good day, ${person.name.split(" ").slice(-1)[0]}`} />
      {state.account && !state.account.user.country ? <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-warn bg-warn-soft px-4 py-3" data-demo-id="home-country">
        <span><strong>Which country do you teach in?</strong> Until you say, the helpers follow general rules only, not your country's accreditation framework and data law.</span>
        <Button variant="primary" onClick={() => navigate("settings")}>Choose in Settings <ArrowRight size={15} /></Button>
      </div> : null}

      {brief ? <section className="workspace-panel" data-demo-id="inbox-brief" aria-labelledby="inbox-brief-title">
        <div className="section-heading"><div><h2 id="inbox-brief-title">Evidence brief: {brief.subjectId}</h2>
          <p className="muted">{RECOMMENDATION_LABEL[brief.recommendation]} · prepared {brief.createdAt.slice(0, 16).replace("T", " ")} by {state.people.find((p) => p.id === brief.createdBy)?.name ?? brief.createdBy}</p></div>
          <div className="button-row"><Button onClick={() => downloadText(brief.subjectId + "-meeting-brief.md", brief.markdown)}>Download (.md)</Button><Button onClick={() => openStep(brief.subjectId, "decide")}>Open Decide</Button><Button onClick={() => selectBrief(null)}>Close</Button></div></div>
        {brief.notes ? <p className="preserve-lines">{brief.notes}</p> : null}
        <details><summary>Read the full brief with its receipts</summary><pre className="brief-body">{brief.markdown}</pre></details>
        <BriefDecisionPanel brief={brief} subjectId={brief.subjectId} compact />
      </section> : null}

      <div className="mb-8 grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      {person.orgRole === "academic" && recentCourse ? <NextAction subjectId={recentCourse.id}
        resume={<Button onClick={() => openStep(recentCourse.id, recentPlan ? "teach" : "course")} data-demo-id="home-resume">{recentPlan ? "Continue teaching plan" : "Open course workspace"}</Button>}
        resumeNote={nextSession ? "Next class: week " + nextSession.week + ", " + nextSession.topic + "." : recentPlan ? recentPlan.sessions.filter((s) => !s.sample).length + " saved sessions · " + (recentPlan.term || "teaching term not set") : undefined} />
        : <section className={CARD + " grid gap-3 p-6"} aria-labelledby="resume-heading">
          <span className={EYEBROW}>{person.orgRole === "academic" ? "Your teaching workspace" : "Your review workspace"}</span>
          <h2 id="resume-heading" className="m-0 text-[24px]">{person.orgRole === "management" ? "The illustrative approval sandbox" : person.orgRole === "department" ? "Decide on the briefs your colleagues send" : "Start with an assigned course"}</h2>
          <p className="m-0 text-ink-2">{person.orgRole === "management" ? "The approval chain is kept in the research sandbox and labelled illustrative. Course decisions are recorded in each course's Decide step." : person.orgRole === "department" ? "As programme owner you record decisions on the briefs lecturers send, and assign positions." : "The department can assign a course so you can start planning teaching sessions."}</p>
          <div className="button-row"><Button variant="primary" onClick={() => navigate(person.orgRole === "management" ? "approval" : person.orgRole === "department" ? "programme" : "guide")}>{person.orgRole === "management" ? "Open the approvals sandbox" : person.orgRole === "department" ? "Open programme" : "Read the guide"}</Button></div>
        </section>}

      <section className={CARD + " grid gap-4 p-5"} aria-labelledby="home-queues-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="home-queues-title" className="m-0 text-[20px]">Waiting on you</h2>
          <Tag tone={waiting.length + unread.length ? "accent" : undefined}>{waiting.length + unread.length} {waiting.length + unread.length === 1 ? "item" : "items"}</Tag>
        </div>
        <div className="grid gap-2 empty:hidden" data-demo-id="home-briefs">
          {waiting.slice(0, 4).map((b) => <Row key={b.id} title={b.subjectId + " · evidence brief"} note={b.recipients.includes(person.id) ? "From " + (state.people.find((p) => p.id === b.createdBy)?.name ?? b.createdBy) + ": " + RECOMMENDATION_LABEL[b.recommendation] : "Your brief: waiting for a second person's decision"}
            action={<Button aria-label={"Open the brief for " + b.subjectId} data-demo-id={"waiting-" + b.id} onClick={() => { if (b.recipients.includes(person.id)) selectBrief(b.id); else openStep(b.subjectId, "decide"); }}>Open</Button>} />)}
          {legacy.map((p) => <Row key={p.id} title={p.subjectId} note="Illustrative sandbox: proposal awaits approval"
            action={<Button aria-label={"Open proposal for " + p.subjectId} onClick={() => { selectProposal(p.id); navigate("approval"); }}>Open</Button>} />)}
        </div>
        <div className="grid gap-2 empty:hidden" data-demo-id="home-notifications">
          {top ? <div className="grid gap-2 rounded-xl border-2 border-emerald bg-tint-1 p-3.5" data-demo-id="inbox-top">
            <div className="flex flex-wrap items-center gap-2"><Tag tone={KIND_TONE[top.kind]}>{KIND_LABEL[top.kind]}</Tag>{top.subjectId ? <span className="num text-[13px] text-ink-3">{top.subjectId}</span> : null}</div>
            {top.agentFindings ? <p className="m-0 text-[14px]">{top.agentFindings}</p> : null}
            <div className="flex flex-wrap items-center gap-3"><Button variant="primary" data-demo-id="inbox-open-top" onClick={() => openNotification(top.id)}>{top.kind === "evidence-brief" ? "Read brief" : top.kind === "brief-decision" ? "Open Decide" : "Open " + (top.subjectId ?? "it")} <ArrowRight size={15} /></Button>{sender(top) ? <span className="text-[13px] text-ink-3">{sender(top)}</span> : null}</div>
          </div> : null}
          {rest.slice(0, 3).map((n) => <button key={n.id} type="button" data-demo-id={`inbox-${n.id}`} onClick={() => openNotification(n.id)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-0 bg-transparent px-2 py-2 text-left text-[14px] hover:bg-tint-1">
            <span className={n.read ? "text-ink-3" : "font-semibold text-ink"}>{n.agentFindings ?? KIND_LABEL[n.kind]}</span><span className="num text-[13px] text-ink-3">{n.subjectId ?? ""}</span></button>)}
        </div>
        {!waiting.length && !legacy.length && !top ? <p className="m-0 rounded-xl bg-tint-1 px-4 py-3 text-[14px] text-ink-2">Nothing is waiting on you. Briefs to decide and messages from colleagues land here.</p> : null}
        {recentCourse ? <div className="grid gap-1 border-t-2 border-tint-2 pt-3">
          <h3 className="m-0 text-[14px] text-ink-2">Recent on {recentCourse.id}</h3>
          {activity.length ? activity.map((e, i) => <button key={i} type="button" onClick={() => openStep(recentCourse.id, e.step ?? "history")}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-[14px] text-ink hover:bg-tint-1">
            <span>{e.title}</span><span className="num text-[13px] text-ink-3">{when(e.at)}</span></button>)
            : <p className="m-0 text-[13px] text-ink-3">Nothing recorded on {recentCourse.id} yet. Your first research run, brief or decision shows here.</p>}
          <Button variant="quiet" className="justify-self-start" onClick={() => openStep(recentCourse.id, "history")}>Open {recentCourse.id}'s history <ArrowRight size={15} /></Button>
        </div> : null}
      </section>
      </div>

      {ownCourses.length ? <section aria-labelledby="home-courses-title" data-demo-id="home-courses">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="home-courses-title" className="m-0 text-[22px]">Your courses</h2><Button variant="quiet" onClick={() => navigate("courses")}>Browse courses <ArrowRight size={15} /></Button></div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">{ownCourses.map((course) => {
          const summary = planSummary(state.teachingPlans.find((p) => p.subjectId === course.id), state.clos.filter((c) => c.subjectId === course.id));
          const loop = loopState(state, course.id);
          return <article className={CARD + " grid content-start gap-3 p-5"} key={course.id}>
            <div className="grid gap-0.5"><h3 className="m-0 text-[18px]"><span className="num">{course.id}</span> {course.title}</h3>
              <p className="m-0 text-[13px] text-ink-3">Year {course.year}, semester {course.semester} · {plural(summary.sessions.length, "session", "sessions")}, {summary.delivered} delivered</p></div>
            <LoopBar subjectId={course.id} />
            <p className="m-0 text-[14px] text-ink-2">{loop.closed ? "Loop closed this term." : loop.next ? stepDef(loop.next).label + " is next." : loop.summary}</p>
            <Button className="justify-self-start" onClick={() => openStep(course.id, loop.next ?? "course")}>Open {course.id} <ArrowRight size={15} /></Button>
          </article>;
        })}</div>
      </section> : null}
    </Page>
  );

  function sender(n: Notification): string | null {
    if (n.kind === "ping-update" || n.kind === "ping-new-subject") return "From management, via the Signal agent.";
    if (n.kind === "review-request" && n.subjectId) {
      const coord = personWithHat(n.subjectId, "coordinator");
      return coord && coord.id === person!.id ? "From the subject's lecturer." : "From the coordinator.";
    }
    if (n.kind === "test-done") return "From the Cohort agent.";
    if ((n.kind === "evidence-brief" || n.kind === "brief-decision") && n.briefId) {
      const author = state.evidenceBriefs.find((b) => b.id === n.briefId)?.createdBy;
      return n.kind === "brief-decision" ? null : author ? "From " + (state.people.find((p) => p.id === author)?.name ?? author) + "." : null;
    }
    return null;
  }
}

/** A record's time in words for the activity list: today's time, yesterday, or the date. */
function when(at: string): string {
  const d = new Date(at), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toTimeString().slice(0, 5);
  if (new Date(now.getTime() - 86400000).toDateString() === d.toDateString()) return "Yesterday";
  return at.slice(0, 10);
}

const CARD = "rounded-[var(--radius-card)] border-2 border-forest bg-white shadow-[0_4px_0_var(--forest)]";
const EYEBROW = "font-mono text-[12px] tracking-[0.08em] text-emerald-text uppercase";
const TIPS_OFF = "lyceum-home-tips-off";

/** One row of the "Waiting on you" list: what it is, a line on it, and its action. */
function Row({ title, note, action }: { title: string; note: string; action: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-border px-3.5 py-3">
    <div className="grid min-w-0 gap-0.5"><strong className="text-[14px]">{title}</strong><span className="text-[13px] text-ink-2">{note}</span></div>{action}
  </div>;
}

/** The loop's seven steps as segments: filled done, dashed next. */
export function LoopBar({ subjectId }: { subjectId: string }) {
  const state = useStore();
  const loop = loopState(state, subjectId);
  const ring = loop.steps.filter((s) => RING_STEPS.includes(s.id));
  return <div className="grid gap-1.5">
    <ol className="m-0 grid list-none grid-cols-7 gap-1 p-0" aria-label={ring.filter((s) => s.done).length + " of " + ring.length + " steps done"}>
      {ring.map((s) => <li key={s.id} title={stepDef(s.id).label + (s.done ? ", done" : s.id === loop.next ? ", next" : "")}
        className={"h-2 rounded-full " + (s.done ? "bg-emerald" : s.id === loop.next ? "border-2 border-dashed border-emerald bg-white" : "bg-tint-2")} />)}
    </ol>
    <span className="text-[12px] text-ink-3">{ring.filter((s) => s.done).length} of {ring.length} steps done{loop.window.term ? " · " + loop.window.term : ""}</span>
  </div>;
}

/** Home's one action (plan Section 5.3): the course's next step, its question and why it matters, one button; the host's
 *  tips beside it until the lecturer puts them away. */
function NextAction({ subjectId, resume, resumeNote }: { subjectId: string; resume?: ReactNode; resumeNote?: string }) {
  const state = useStore();
  const loop = loopState(state, subjectId);
  const moods = useCourseMoods(subjectId);
  const [tips, setTips] = useState(() => { try { return localStorage.getItem(TIPS_OFF) !== "1"; } catch { return true; } });
  const next = loop.next ? stepDef(loop.next) : null;
  const done = loop.steps.filter((s) => s.done).length;
  const lines = [
    loop.closed ? "The loop is closed on " + subjectId + " for this term. The recap has every receipt." : next ? next.label + " is next on " + subjectId + ". " + next.question : "Open the course to carry on.",
    done + " of " + loop.steps.length + " steps done" + (loop.window.term ? " for " + loop.window.term + "." : ". Set the term at the Course step so the loop counts this term's records."),
    "Every step saves as you go. Guide & progress has the backup, and Settings sets up agent web search.",
  ];
  const hide = () => { setTips(false); try { localStorage.setItem(TIPS_OFF, "1"); } catch { /* the tips just come back next time */ } };
  return <section className={CARD + " grid gap-5 p-6 narrow:p-5"} aria-labelledby="start-here-title" data-demo-id="journey-card">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid min-w-0 flex-[1_1_320px] gap-2">
        <span className={EYEBROW}>{loop.closed ? "This term · " + subjectId : "Next on " + subjectId}</span>
        <h2 id="start-here-title" className="m-0 text-[28px] leading-[1.15] narrow:text-[24px]">{loop.closed ? "The loop is closed for this term" : next ? next.label + ": " + next.question : "Continue the loop on " + subjectId}</h2>
        {next ? <p className="m-0 text-[15px] text-ink-2"><strong className="text-ink">Done when:</strong> {next.doneWhen} {next.helper ? "Helped by " + next.helper + "." : ""}</p> : null}
      </div>
      {tips && moods ? <div className="relative flex-[0_1_260px] narrow:hidden [&_.mascot-chat-bubble]:bg-tint-1">
        <MascotChat key={subjectId} who="host" mood={moods.host} size={72} name={HOST_NAME} lines={lines} />
        <button type="button" onClick={hide} aria-label="Hide the tips" className="absolute top-0 right-0 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-ink-3 hover:text-ink"><X size={16} /></button>
      </div> : null}
    </div>
    <LoopBar subjectId={subjectId} />
    <div className="flex flex-wrap items-center gap-3">
      {loop.next ? <Button variant="primary" data-demo-id="journey-next" onClick={() => openStep(subjectId, loop.next!)}>Continue: {stepDef(loop.next).label} <ArrowRight size={15} /></Button>
        : loop.closed ? <Button data-demo-id="journey-recap" onClick={() => openRecap(subjectId)}>The term recap <ArrowRight size={15} /></Button> : null}
      {resume}
      {resumeNote ? <span className="text-[13px] text-ink-3">{resumeNote}</span> : null}
    </div>
  </section>;
}
