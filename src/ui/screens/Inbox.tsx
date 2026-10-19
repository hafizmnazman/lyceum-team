// The Inbox: home for every role (spec 6.1). Opens on the one thing that needs
// this person now; everything else is a quiet list below. The calm empty state
// is the honest resting state of a working system.

import { ArrowRight } from "lucide-react";
import { can, subjectsForPerson } from "../../app/roles.ts";
import { planSummary } from "../../lib/teachingPlan.ts";
import { RECOMMENDATION_LABEL } from "../../lib/evidence.ts";
import { downloadText } from "../../lib/download.ts";
import type { Notification } from "../../types.ts";
import {
  currentPerson,
  inboxFor,
  openNotification,
  personWithHat,
  navigate,
  selectBrief,
  selectSubject,
  selectProposal,
  selectStudioTab,
  useStore,
} from "../../app/store.ts";
import { Button, Card, Page, PageHead, Row, Tag } from "../primitives/index.tsx";
import { JourneyCard } from "../primitives/Journey.tsx";

const KIND_LABEL: Record<Notification["kind"], string> = {
  "ping-update": "Update requested",
  "ping-new-subject": "New subject requested",
  "review-request": "Review requested",
  "test-done": "Acceptance test finished",
  approved: "Change approved",
  rejected: "Change rejected",
  "evidence-brief": "Evidence brief",
};

const KIND_TONE: Record<Notification["kind"], "accent" | "warn" | "ok" | "danger"> = {
  "ping-update": "warn",
  "ping-new-subject": "warn",
  "review-request": "accent",
  "test-done": "accent",
  approved: "ok",
  rejected: "danger",
  "evidence-brief": "accent",
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
  const work = state.proposals.filter((p) => {
    if (person.orgRole === "management") return p.status === "management-approval";
    if (!ownIds.includes(p.subjectId)) return false;
    return ((p.status === "drafting" || p.status === "testing") && p.authorId === person.id)
      || (p.status === "coordinator-review" && can(person, "review-draft", { subjectId: p.subjectId, assignments: state.assignments }));
  });
  const recentCourse = [...ownCourses].sort((a, b) => {
    const aDate = state.teachingPlans.find((p) => p.subjectId === a.id)?.updatedAt ?? "";
    const bDate = state.teachingPlans.find((p) => p.subjectId === b.id)?.updatedAt ?? "";
    return bDate.localeCompare(aDate);
  })[0];
  const recentPlan = recentCourse && state.teachingPlans.find((p) => p.subjectId === recentCourse.id);
  const nextSession = recentPlan && planSummary(recentPlan, state.clos.filter((c) => c.subjectId === recentCourse?.id)).next;
  const brief = state.evidenceBriefs.find((b) => b.id === state.selectedBriefId && (b.createdBy === person.id || b.recipients.includes(person.id)));
  function openCourse(subjectId: string, tab: "overview" | "plan" | "content" = "overview") {
    selectSubject(subjectId); selectStudioTab(tab); navigate("studio");
  }

  return (
    <Page wide>
      <PageHead
        title={`Good day, ${person.name.split(" ").slice(-1)[0]}`}
        context={
          unread.length === 0
            ? "Your teaching preparation and review work, in one place."
            : `${unread.length} unread notification${unread.length === 1 ? "" : "s"}. Your course work is below.`
        }
        actions={<Button onClick={() => navigate("guide")}>Guide & progress</Button>}
      />

      {brief ? <section className="workspace-panel" data-demo-id="inbox-brief" aria-labelledby="inbox-brief-title">
        <div className="section-heading"><div><h2 id="inbox-brief-title">Evidence brief: {brief.subjectId}</h2>
          <p className="muted">{RECOMMENDATION_LABEL[brief.recommendation]} · prepared {brief.createdAt} by {state.people.find((p) => p.id === brief.createdBy)?.name ?? brief.createdBy}. Receipts are attached; the decision remains with people.</p></div>
          <div className="button-row"><Button onClick={() => downloadText(brief.subjectId + "-meeting-brief.md", brief.markdown)}>Download (.md)</Button><Button onClick={() => selectBrief(null)}>Close</Button></div></div>
        {brief.notes ? <p className="preserve-lines">{brief.notes}</p> : null}
        <pre className="brief-body">{brief.markdown}</pre>
      </section> : null}
      {person.orgRole === "academic" ? <JourneyCard state={state} subjectId={recentCourse?.id ?? null} /> : null}
      <div className="home-columns">
        <section className="workspace-panel home-focus" aria-labelledby="resume-heading">
          <span className="eyebrow">{recentPlan ? "Continue preparation" : person.orgRole === "academic" ? "Your teaching workspace" : "Your review workspace"}</span>
          <h2 id="resume-heading">{recentCourse ? recentCourse.id + " · " + recentCourse.title : person.orgRole === "management" ? "Review proposed curriculum changes" : person.orgRole === "department" ? "Coordinate the programme" : "Start with an assigned course"}</h2>
          <p>{nextSession ? "Week " + nextSession.week + ": " + nextSession.topic + ". Continue preparing the activity, learning check and materials." : recentCourse ? "Check the current outcomes, prepare your next class and keep formal curriculum changes in a separate proposal." : person.orgRole === "management" ? "Read the proposal, its review history and the limitations of its scenario report before recording a decision." : person.orgRole === "department" ? "Review course coverage, create proposed subjects and assign lecturer or coordinator responsibilities." : "The department can assign a course so you can start planning teaching sessions."}</p>
          <div className="button-row">{recentCourse ? <><Button variant="primary" onClick={() => openCourse(recentCourse.id, recentPlan ? "plan" : "overview")} data-demo-id="home-resume">{recentPlan ? "Continue teaching plan" : "Open course workspace"} <ArrowRight size={15} /></Button><Button onClick={() => navigate("courses")}>All my courses</Button></> : <Button variant="primary" onClick={() => navigate(person.orgRole === "management" ? "approval" : person.orgRole === "department" ? "programme" : "guide")}>{person.orgRole === "management" ? "Open approvals" : person.orgRole === "department" ? "Open programme" : "Read the guide"}</Button>}</div>
          <p className="muted">{recentPlan ? recentPlan.sessions.length + " saved sessions · " + (recentPlan.term || "Teaching term not set") : "Preparation is stored in this browser. Export a teaching plan to keep a portable copy."}</p>
        </section>
        <section className="workspace-panel" aria-labelledby="work-queue">
          <div className="section-heading"><h2 id="work-queue">Your work queue</h2><Tag>{work.length} {work.length === 1 ? "item" : "items"}</Tag></div>
          {work.length ? <ul className="work-list">{work.map((p) => <li key={p.id}><div><strong>{p.subjectId}</strong><span>{p.status === "coordinator-review" ? "Lecturer draft needs your review" : p.status === "management-approval" ? "Proposal awaits your decision" : p.status === "testing" ? "Reviewed proposal ready for a scenario run" : "Curriculum draft in progress"}</span></div><Button aria-label={"Open proposal for " + p.subjectId} onClick={() => { selectProposal(p.id); if (person.orgRole === "management") navigate("approval"); else openCourse(p.subjectId, "content"); }}>Open</Button></li>)}</ul> : <p>No proposal currently needs your action. You can still prepare teaching sessions, inspect course materials or read the section guide.</p>}
        </section>
      </div>

      {ownCourses.length ? <section aria-labelledby="home-courses"><div className="section-heading"><h2 id="home-courses">Your courses at a glance</h2><Button variant="quiet" onClick={() => navigate("courses")}>Browse courses <ArrowRight size={15} /></Button></div><div className="course-grid">{ownCourses.map((course) => {
        const summary = planSummary(state.teachingPlans.find((p) => p.subjectId === course.id), state.clos.filter((c) => c.subjectId === course.id));
        return <article className="workspace-panel" key={course.id}><span className="eyebrow">{course.id} · Year {course.year}, semester {course.semester}</span><h3>{course.title}</h3><p className="muted">{summary.sessions.length} teaching sessions · {summary.ready} ready · {summary.delivered} delivered</p><p>{summary.unmapped.length ? "Outcomes without a planned session: " + summary.unmapped.map((c) => c.id).join(", ") : summary.sessions.length ? "Review the activities and learning checks in your plan." : "Start a plan for your next class."}</p><Button onClick={() => openCourse(course.id)}>Open {course.id}</Button></article>;
      })}</div></section> : null}

      <div className="section-heading"><h2>Notifications</h2><span className="muted">{unread.length} unread</span></div>

      {top ? (
        <Card focal data-demo-id="inbox-top">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Tag tone={KIND_TONE[top.kind]}>{KIND_LABEL[top.kind]}</Tag>
            {top.subjectId ? <span className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>{top.subjectId}</span> : null}
          </div>
          {top.agentFindings ? (
            <p style={{ margin: "0 0 14px", fontSize: 14, maxWidth: 620 }}>{top.agentFindings}</p>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              variant="primary"
              data-demo-id="inbox-open-top"
              onClick={() => openNotification(top.id)}
            >
              {top.kind === "evidence-brief" ? "Read brief" : "Open " + (top.subjectId ?? "it")} <ArrowRight size={15} />
            </Button>
            {sender(top) ? (
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{sender(top)}</span>
            ) : null}
          </div>
        </Card>
      ) : (
        <p className="muted">No unread notifications. Update requests, reviews and scenario results appear here when someone completes a workflow step.</p>
      )}

      {rest.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          {rest.map((n) => (
            <Row key={n.id} onClick={() => openNotification(n.id)} data-demo-id={`inbox-${n.id}`}>
              <Tag tone={KIND_TONE[n.kind]}>{KIND_LABEL[n.kind]}</Tag>
              <span className="num" style={{ fontSize: 13, color: "var(--ink-2)", width: 56 }}>
                {n.subjectId ?? ""}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: n.read ? "var(--ink-3)" : "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {n.agentFindings ?? KIND_LABEL[n.kind]}
              </span>
              {!n.read ? (
                <span aria-label="Unread" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
              ) : null}
            </Row>
          ))}
        </div>
      ) : null}
    </Page>
  );

  function sender(n: Notification): string | null {
    if (n.kind === "ping-update" || n.kind === "ping-new-subject") return "From management, via the Signal agent.";
    if (n.kind === "review-request" && n.subjectId) {
      const coord = personWithHat(n.subjectId, "coordinator");
      return coord && coord.id === person!.id ? "From the subject's lecturer." : "From the coordinator.";
    }
    if (n.kind === "test-done") return "From the Cohort agent.";
    if (n.kind === "evidence-brief" && n.briefId) {
      const author = state.evidenceBriefs.find((b) => b.id === n.briefId)?.createdBy;
      return author ? "From " + (state.people.find((p) => p.id === author)?.name ?? author) + ", with receipts." : null;
    }
    return null;
  }
}
