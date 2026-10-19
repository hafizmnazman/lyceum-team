import { useState } from "react";
import { CourseCreationPanel } from "./CourseCreation.tsx";
import { WorkspaceBackupPanel } from "./WorkspaceBackup.tsx";
import { ArrowRight } from "lucide-react";
import { hatsOn, subjectsForPerson } from "../../app/roles.ts";
import { currentPerson, navigate, selectSubject, useStore } from "../../app/store.ts";
import { planSummary } from "../../lib/teachingPlan.ts";
import { Button, Field, Input, Page, PageHead, Select, Tag } from "../primitives/index.tsx";

export function CoursesScreen() {
  const state = useStore();
  const person = currentPerson();
  const [creating,setCreating] = useState(false);
  const [backups,setBackups] = useState(false);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [filter, setFilter] = useState("all");
  if (!person) return null;
  const ownIds = subjectsForPerson(person.id, state.assignments);
  const subjects = state.subjects.filter((s) => person.orgRole !== "academic" || ownIds.includes(s.id));
  const courses = subjects.map((subject) => {
    const clos = state.clos.filter((c) => c.subjectId === subject.id);
    const plan = state.teachingPlans.find((p) => p.subjectId === subject.id);
    return { subject, clos, plan, summary: planSummary(plan, clos), proposal: state.proposals.find((p) => p.subjectId === subject.id && p.status !== "approved" && p.status !== "rejected") };
  });
  const visible = courses.filter(({ subject, summary, proposal }) =>
    (subject.id + " " + subject.title).toLowerCase().includes(query.trim().toLowerCase()) &&
    (year === "all" || String(subject.year) === year) &&
    (filter === "all" || (filter === "unplanned" && !summary.sessions.length) || (filter === "drafts" && summary.sessions.some((s) => s.status === "draft")) || (filter === "proposal" && !!proposal)));
  const years = [...new Set(subjects.map((s) => s.year))].sort((a, b) => a - b);
  function open(id: string) { selectSubject(id); navigate("studio"); }
  return <Page wide>
    <PageHead title="Your courses" context="Prepare classes, keep outcomes in view, and return to unfinished work." actions={<><Button onClick={() => setBackups(!backups)} aria-expanded={backups}>Backups</Button>{person.orgRole === "academic" ? <Button variant="primary" data-demo-id="course-create-open" onClick={() => setCreating(true)}>Create course workspace</Button> : null}<Button onClick={() => navigate("guide")}>Lecturer guide</Button></>} />
    {creating ? <CourseCreationPanel onCancel={() => setCreating(false)} /> : null}
    {backups ? <WorkspaceBackupPanel /> : null}
    <div className="preparation-summary"><span><strong>{courses.length}</strong> assigned courses</span><span><strong>{courses.reduce((n, c) => n + c.summary.sessions.length, 0)}</strong> saved teaching sessions</span><span><strong>{courses.filter((c) => c.proposal).length}</strong> open curriculum proposals</span></div>
    <div className="filter-bar course-filters">
      <Field label="Search courses"><Input type="search" value={query} data-demo-id="course-search" placeholder="Course code or title" onChange={(e) => setQuery(e.target.value)} /></Field>
      <Field label="Year"><Select value={year} onChange={(e) => setYear(e.target.value)}><option value="all">All years</option>{years.map((y) => <option value={y} key={y}>Year {y}</option>)}</Select></Field>
      <Field label="Preparation"><Select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All courses</option><option value="unplanned">No teaching sessions</option><option value="drafts">Sessions to prepare</option><option value="proposal">Open proposal</option></Select></Field>
    </div>
    <p className="muted" role="status">{visible.length} of {courses.length} courses shown. Preparation reflects saved work in this browser.</p>
    <div className="course-grid">{visible.map(({ subject, clos, plan, summary, proposal }) => <article className="workspace-panel course-card" key={subject.id}>
      <div className="section-heading"><span className="eyebrow">{subject.id} · Year {subject.year}, semester {subject.semester}</span><Tag>{subject.workspaceOnly ? "Personal workspace" : subject.status}</Tag></div>
      <h2>{subject.title}</h2>
      <p className="muted">{hatsOn(person.id, subject.id, state.assignments).map((h) => h === "coordinator" ? "Coordinator" : "Lecturer").join(" & ") || "Programme view"} · {plan?.term || "Term not set"}</p>
      <dl className="course-facts"><div><dt>Outcomes</dt><dd>{clos.length} recorded</dd></div><div><dt>Teaching plan</dt><dd>{summary.sessions.length} sessions · {summary.ready} ready</dd></div><div><dt>Curriculum proposal</dt><dd>{proposal ? proposal.status.replaceAll("-", " ") : "No open proposal"}</dd></div></dl>
      <div className="course-next"><strong>Next preparation step</strong><p>{summary.next ? "Week " + summary.next.week + ": " + summary.next.topic : summary.sessions.length ? "Review delivered sessions and prepare your next class." : "Plan the first session and link it to a learning outcome."}</p></div>
      <Button data-demo-id={"course-open-" + subject.id} onClick={() => open(subject.id)}>Open course <ArrowRight size={15} /></Button>
    </article>)}</div>
    {!visible.length ? <section className="workspace-panel"><h2>{courses.length ? "No courses match" : "No courses assigned yet"}</h2><p>{courses.length ? "Try another code, title or preparation filter." : "Ask the department to assign a lecturer or coordinator responsibility. Your course workspace will appear here."}</p>{courses.length ? <Button onClick={() => { setQuery(""); setYear("all"); setFilter("all"); }}>Clear filters</Button> : <Button onClick={() => navigate("guide")}>Read the guide</Button>}</section> : null}
  </Page>;
}
