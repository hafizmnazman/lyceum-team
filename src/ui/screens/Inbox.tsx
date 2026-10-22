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
import { Button, Card, Disclosure, Page, PageHead, Row, Tag } from "../primitives/index.tsx";
import { RingPanel } from "../primitives/loop.tsx";
import { Mascot, useCourseMoods } from "../mascots/index.tsx";
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

      {person.orgRole === "academic" && recentCourse ? <StartHere subjectId={recentCourse.id}
        resume={<Button onClick={() => openStep(recentCourse.id, recentPlan ? "teach" : "course")} data-demo-id="home-resume">{recentPlan ? "Continue teaching plan" : "Open course workspace"}</Button>}
        resumeNote={nextSession ? "Next class: week " + nextSession.week + ", " + nextSession.topic + "." : recentPlan ? recentPlan.sessions.filter((s) => !s.sample).length + " saved sessions · " + (recentPlan.term || "teaching term not set") : undefined} />
        : <section className="workspace-panel home-focus" aria-labelledby="resume-heading">
          <span className="eyebrow">{person.orgRole === "academic" ? "Your teaching workspace" : "Your review workspace"}</span>
          <h2 id="resume-heading">{person.orgRole === "management" ? "The illustrative approval sandbox" : person.orgRole === "department" ? "Decide on the briefs your colleagues send" : "Start with an assigned course"}</h2>
          <p>{person.orgRole === "management" ? "The approval chain is kept in the research sandbox and labelled illustrative. Course decisions are recorded in each course's Decide step." : person.orgRole === "department" ? "As programme owner you record decisions on the briefs lecturers send, and assign positions." : "The department can assign a course so you can start planning teaching sessions."}</p>
          <div className="button-row"><Button variant="primary" onClick={() => navigate(person.orgRole === "management" ? "approval" : person.orgRole === "department" ? "programme" : "guide")}>{person.orgRole === "management" ? "Open the approvals sandbox" : person.orgRole === "department" ? "Open programme" : "Read the guide"}</Button></div>
        </section>}

      <section className="home-queues" aria-label="Your work">
        <Disclosure summary="Briefs waiting for a decision" count={waiting.length + (waiting.length === 1 ? " brief" : " briefs")} defaultOpen={waiting.length > 0} data-demo-id="home-briefs">
          {waiting.length ? <ul className="work-list">{waiting.map((b) => <li key={b.id}><div><strong>{b.subjectId}</strong><span>{b.recipients.includes(person.id) ? "From " + (state.people.find((p) => p.id === b.createdBy)?.name ?? b.createdBy) + ": " + RECOMMENDATION_LABEL[b.recommendation] : "Your brief: waiting for a second person's decision"}</span></div><Button aria-label={"Open the brief for " + b.subjectId} data-demo-id={"waiting-" + b.id} onClick={() => { if (b.recipients.includes(person.id)) selectBrief(b.id); else openStep(b.subjectId, "decide"); }}>Open</Button></li>)}</ul>
            : <p className="muted">No brief is waiting for you.</p>}
          {legacy.length ? <><h3>Illustrative sandbox</h3><ul className="work-list">{legacy.map((p) => <li key={p.id}><div><strong>{p.subjectId}</strong><span>Proposal awaits the sandbox approval</span></div><Button aria-label={"Open proposal for " + p.subjectId} onClick={() => { selectProposal(p.id); navigate("approval"); }}>Open</Button></li>)}</ul></> : null}
        </Disclosure>

        <Disclosure summary="Notifications" count={unread.length + " unread"} defaultOpen={unread.length > 0} data-demo-id="home-notifications">
          {top ? (
            <Card focal data-demo-id="inbox-top">
              <div className="button-row" style={{ marginBottom: 8 }}>
                <Tag tone={KIND_TONE[top.kind]}>{KIND_LABEL[top.kind]}</Tag>
                {top.subjectId ? <span className="num muted">{top.subjectId}</span> : null}
              </div>
              {top.agentFindings ? <p style={{ margin: "0 0 14px", maxWidth: 620 }}>{top.agentFindings}</p> : null}
              <div className="button-row">
                <Button variant="primary" data-demo-id="inbox-open-top" onClick={() => openNotification(top.id)}>
                  {top.kind === "evidence-brief" ? "Read brief" : top.kind === "brief-decision" ? "Open Decide" : "Open " + (top.subjectId ?? "it")} <ArrowRight size={15} />
                </Button>
                {sender(top) ? <span className="muted">{sender(top)}</span> : null}
              </div>
            </Card>
          ) : (
            <p className="muted">No unread notifications.</p>
          )}
          {rest.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              {rest.map((n) => (
                <Row key={n.id} onClick={() => openNotification(n.id)} data-demo-id={`inbox-${n.id}`}>
                  <Tag tone={KIND_TONE[n.kind]}>{KIND_LABEL[n.kind]}</Tag>
                  <span className="num muted" style={{ width: 56 }}>{n.subjectId ?? ""}</span>
                  <span style={{ flex: 1, fontSize: 13, color: n.read ? "var(--ink-2)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.agentFindings ?? KIND_LABEL[n.kind]}
                  </span>
                  {!n.read ? <span className="tag tag-accent">Unread</span> : null}
                </Row>
              ))}
            </div>
          ) : null}
        </Disclosure>

        {ownCourses.length ? <Disclosure summary="Your courses at a glance" count={ownCourses.length} data-demo-id="home-courses">
          <div className="course-grid">{ownCourses.map((course) => {
            const summary = planSummary(state.teachingPlans.find((p) => p.subjectId === course.id), state.clos.filter((c) => c.subjectId === course.id));
            const loop = loopState(state, course.id);
            return <article className="workspace-panel" key={course.id}><span className="eyebrow">{course.id} · Year {course.year}, semester {course.semester}</span><h3>{course.title}</h3><p className="muted">{loop.summary}</p><p className="muted">{plural(summary.sessions.length, "teaching session", "teaching sessions")} · {summary.ready} ready · {summary.delivered} delivered</p><Button onClick={() => openStep(course.id, loop.next ?? "course")}>Open {course.id}</Button></article>;
          })}</div>
          <Button variant="quiet" onClick={() => navigate("courses")}>Browse courses <ArrowRight size={15} /></Button>
        </Disclosure> : null}
      </section>
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

/** Start here (plan Section 5.3): the host, the ring with the next step lit, and one action. */
function StartHere({ subjectId, resume, resumeNote }: { subjectId: string; resume?: ReactNode; resumeNote?: string }) {
  const state = useStore();
  const loop = loopState(state, subjectId);
  const moods = useCourseMoods(subjectId);
  return <section className="workspace-panel start-here" aria-labelledby="start-here-title" data-demo-id="journey-card">
    <div className="start-here-host">{moods ? <Mascot who="host" mood={moods.host} size={88} /> : null}</div>
    <div className="start-here-body">
      <div className="section-heading"><div><span className="eyebrow">Start here · {subjectId}</span><h2 id="start-here-title">{loop.closed ? "The loop is closed for this term" : "Continue the loop on " + subjectId}</h2></div>
        {loop.next ? <Button variant="primary" data-demo-id="journey-next" onClick={() => openStep(subjectId, loop.next!)}>Continue: {stepDef(loop.next).label} <ArrowRight size={15} /></Button>
          : loop.closed ? <Button data-demo-id="journey-recap" onClick={() => openRecap(subjectId)}>The term recap <ArrowRight size={15} /></Button> : null}</div>
      <RingPanel loop={loop} onStep={(step) => openStep(subjectId, step)} />
      {resume ? <div className="start-here-resume button-row">{resume}{resumeNote ? <span className="muted">{resumeNote}</span> : null}</div> : null}
    </div>
  </section>;
}
