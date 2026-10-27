// Home for every role (plan Section 5.3): one visual, the ring for the course in
// view with the next step lit, and one action, "Continue". The work queue, the
// notifications and the courses sit behind disclosures that open by themselves
// when something is waiting. A brief opened here carries its receipts and, for
// a recipient who decides, the four decisions with a required note.

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { subjectsForPerson } from "../../app/roles.ts";
import { loopState, plural, stepDef } from "../../app/loop.ts";
import { planSummary } from "../../lib/teachingPlan.ts";
import { RECOMMENDATION_LABEL } from "../../lib/evidence.ts";
import { downloadText } from "../../lib/download.ts";
import type { Notification } from "../../types.ts";
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
import { Ring, RingPanel } from "../primitives/loop.tsx";
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

      {brief ? <section className="workspace-panel" data-demo-id="inbox-brief" aria-labelledby="inbox-brief-title">
        <div className="section-heading"><div><h2 id="inbox-brief-title">Evidence brief: {brief.subjectId}</h2>
          <p className="muted">{RECOMMENDATION_LABEL[brief.recommendation]} · prepared {brief.createdAt.slice(0, 16).replace("T", " ")} by {state.people.find((p) => p.id === brief.createdBy)?.name ?? brief.createdBy}</p></div>
          <div className="button-row"><Button onClick={() => downloadText(brief.subjectId + "-meeting-brief.md", brief.markdown)}>Download (.md)</Button><Button onClick={() => openStep(brief.subjectId, "decide")}>Open Decide</Button><Button onClick={() => selectBrief(null)}>Close</Button></div></div>
        {brief.notes ? <p className="preserve-lines">{brief.notes}</p> : null}
        <details><summary>Read the full brief with its receipts</summary><pre className="brief-body">{brief.markdown}</pre></details>
        <BriefDecisionPanel brief={brief} subjectId={brief.subjectId} compact />
      </section> : null}

      <div className="home-grid">
      {person.orgRole === "academic" && recentCourse ? <StartHere subjectId={recentCourse.id}
        resume={<Button onClick={() => openStep(recentCourse.id, recentPlan ? "teach" : "course")} data-demo-id="home-resume">{recentPlan ? "Continue teaching plan" : "Open course workspace"}</Button>}
        resumeNote={nextSession ? "Next class: week " + nextSession.week + ", " + nextSession.topic + "." : recentPlan ? recentPlan.sessions.filter((s) => !s.sample).length + " saved sessions · " + (recentPlan.term || "teaching term not set") : undefined} />
        : <section className="workspace-panel home-focus" aria-labelledby="resume-heading">
          <span className="eyebrow">{person.orgRole === "academic" ? "Your teaching workspace" : "Your review workspace"}</span>
          <h2 id="resume-heading">{person.orgRole === "management" ? "The illustrative approval sandbox" : person.orgRole === "department" ? "Decide on the briefs your colleagues send" : "Start with an assigned course"}</h2>
          <p>{person.orgRole === "management" ? "The approval chain is kept in the research sandbox and labelled illustrative. Course decisions are recorded in each course's Decide step." : person.orgRole === "department" ? "As programme owner you record decisions on the briefs lecturers send, and assign positions." : "The department can assign a course so you can start planning teaching sessions."}</p>
          <div className="button-row"><Button variant="primary" onClick={() => navigate(person.orgRole === "management" ? "approval" : person.orgRole === "department" ? "programme" : "guide")}>{person.orgRole === "management" ? "Open the approvals sandbox" : person.orgRole === "department" ? "Open programme" : "Read the guide"}</Button></div>
        </section>}

      <section className="home-queues" aria-labelledby="home-queues-title">
        <h2 id="home-queues-title" className="home-queues-title">Your work</h2>
        <div className="home-queue" data-demo-id="home-briefs">
          <h3>Briefs waiting for a decision <Tag>{waiting.length}</Tag></h3>
          {waiting.length ? <ul className="work-list">{waiting.slice(0, 4).map((b) => <li key={b.id}><div><strong>{b.subjectId}</strong><span>{b.recipients.includes(person.id) ? "From " + (state.people.find((p) => p.id === b.createdBy)?.name ?? b.createdBy) + ": " + RECOMMENDATION_LABEL[b.recommendation] : "Your brief: waiting for a second person's decision"}</span></div><Button aria-label={"Open the brief for " + b.subjectId} data-demo-id={"waiting-" + b.id} onClick={() => { if (b.recipients.includes(person.id)) selectBrief(b.id); else openStep(b.subjectId, "decide"); }}>Open</Button></li>)}</ul>
            : <p className="muted">No brief is waiting for you.</p>}
          {legacy.length ? <ul className="work-list">{legacy.map((p) => <li key={p.id}><div><strong>{p.subjectId}</strong><span>Illustrative sandbox: proposal awaits approval</span></div><Button aria-label={"Open proposal for " + p.subjectId} onClick={() => { selectProposal(p.id); navigate("approval"); }}>Open</Button></li>)}</ul> : null}
        </div>
        <div className="home-queue" data-demo-id="home-notifications">
          <h3>Notifications <Tag>{unread.length} unread</Tag></h3>
          {top ? <div className="home-note-top" data-demo-id="inbox-top">
            <div className="button-row"><Tag tone={KIND_TONE[top.kind]}>{KIND_LABEL[top.kind]}</Tag>{top.subjectId ? <span className="num muted">{top.subjectId}</span> : null}</div>
            {top.agentFindings ? <p>{top.agentFindings}</p> : null}
            <div className="button-row"><Button variant="primary" data-demo-id="inbox-open-top" onClick={() => openNotification(top.id)}>{top.kind === "evidence-brief" ? "Read brief" : top.kind === "brief-decision" ? "Open Decide" : "Open " + (top.subjectId ?? "it")} <ArrowRight size={15} /></Button>{sender(top) ? <span className="muted">{sender(top)}</span> : null}</div>
          </div> : <p className="muted">No unread notifications.</p>}
          {rest.length ? <ul className="home-rows">{rest.slice(0, 3).map((n) => <li key={n.id}><button type="button" data-demo-id={`inbox-${n.id}`} onClick={() => openNotification(n.id)}>
            <span className={n.read ? "muted" : ""}>{n.agentFindings ?? KIND_LABEL[n.kind]}</span><span className="num muted">{n.subjectId ?? ""}</span></button></li>)}</ul> : null}
        </div>
        {recentCourse ? <div className="home-queue">
          <h3>Recent on {recentCourse.id}</h3>
          {activity.length ? <ul className="home-rows">{activity.map((e, i) => <li key={i}><button type="button" onClick={() => openStep(recentCourse.id, e.step ?? "history")}>
            <span>{e.title}</span><span className="num muted">{when(e.at)}</span></button></li>)}</ul>
            : <p className="muted">Nothing recorded on {recentCourse.id} yet. Your first research run, brief or decision shows here.</p>}
        </div> : null}
        <Button variant="quiet" className="home-queues-foot" onClick={() => recentCourse ? openStep(recentCourse.id, "history") : navigate("courses")}>{recentCourse ? "Open " + recentCourse.id + "'s history" : "Browse courses"} <ArrowRight size={15} /></Button>
      </section>
      </div>

      {ownCourses.length ? <section className="home-courses" aria-labelledby="home-courses-title" data-demo-id="home-courses">
        <div className="section-heading"><h2 id="home-courses-title">Your courses</h2><Button variant="quiet" onClick={() => navigate("courses")}>Browse courses <ArrowRight size={15} /></Button></div>
        <div className="home-course-grid">{ownCourses.map((course) => {
          const summary = planSummary(state.teachingPlans.find((p) => p.subjectId === course.id), state.clos.filter((c) => c.subjectId === course.id));
          const loop = loopState(state, course.id);
          return <article className="workspace-panel home-course" key={course.id}>
            <Ring loop={loop} size={128} />
            <div className="home-course-body">
              <h3><span className="num">{course.id}</span> {course.title}</h3>
              <p className="muted">Year {course.year}, semester {course.semester} · {plural(summary.sessions.length, "teaching session", "teaching sessions")}, {summary.delivered} delivered</p>
              <p>{loop.closed ? "Loop closed this term." : loop.next ? stepDef(loop.next).label + " is next." : loop.summary}</p>
              <Button onClick={() => openStep(course.id, loop.next ?? "course")}>Open {course.id} <ArrowRight size={15} /></Button>
            </div>
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

/** Start here (plan Section 5.3): the host, the ring with the next step lit, and one action. */
function StartHere({ subjectId, resume, resumeNote }: { subjectId: string; resume?: ReactNode; resumeNote?: string }) {
  const state = useStore();
  const loop = loopState(state, subjectId);
  const moods = useCourseMoods(subjectId);
  // What the host says: the next step and its question first, then the term's progress, then one tip.
  const done = loop.steps.filter((s) => s.done).length, next = loop.next ? stepDef(loop.next) : null;
  const lines = [
    loop.closed ? "The loop is closed on " + subjectId + " for this term. The recap has every receipt." : next ? next.label + " is next on " + subjectId + ". " + next.question : "Open the course to carry on.",
    done + " of " + loop.steps.length + " steps done" + (loop.window.term ? " for " + loop.window.term + "." : ". Set the term at the Course step so the loop counts this term's records."),
    "Every step saves in this browser. Guide & progress has the backup, and Settings sets up agent web search.",
  ];
  return <section className="workspace-panel start-here" aria-labelledby="start-here-title" data-demo-id="journey-card">
    <div className="start-here-host">{moods ? <MascotChat key={subjectId} who="host" mood={moods.host} size={96} name={HOST_NAME} lines={lines} /> : null}</div>
    <div className="start-here-body">
      <div className="section-heading"><div><span className="eyebrow">Start here · {subjectId}</span><h2 id="start-here-title">{loop.closed ? "The loop is closed for this term" : "Continue the loop on " + subjectId}</h2></div>
        {loop.next ? <Button variant="primary" data-demo-id="journey-next" onClick={() => openStep(subjectId, loop.next!)}>Continue: {stepDef(loop.next).label} <ArrowRight size={15} /></Button>
          : loop.closed ? <Button data-demo-id="journey-recap" onClick={() => openRecap(subjectId)}>The term recap <ArrowRight size={15} /></Button> : null}</div>
      <RingPanel loop={loop} onStep={(step) => openStep(subjectId, step)} size={148} />
      {resume ? <div className="start-here-resume button-row">{resume}{resumeNote ? <span className="muted">{resumeNote}</span> : null}</div> : null}
    </div>
  </section>;
}
