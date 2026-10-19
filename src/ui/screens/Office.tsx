// How Lyceum works: the seven roles as a pipeline, then the real step-by-step
// record for the course you are working on. Every event on the timeline is
// derived from something the workspace holds; nothing here is a fixture.

import { useState } from "react";
import { BarChart3, BookOpen, ChevronDown, ChevronRight, Map as MapIcon, PenLine, Presentation, Search, ShieldCheck, type LucideIcon } from "lucide-react";
import { ROLES, runTimeline, type RoleId } from "../../app/runs.ts";
import { subjectsForPerson } from "../../app/roles.ts";
import { currentPerson, navigate, selectStudioTab, selectSubject, useStore } from "../../app/store.ts";
import { Button, Page, PageHead, Select, Tag } from "../primitives/index.tsx";

const ICONS: Record<RoleId, LucideIcon> = { folio: BookOpen, scout: Search, atlas: MapIcon, quill: PenLine, prism: Presentation, lens: BarChart3, steward: ShieldCheck };

export function OfficeScreen() {
  const state = useStore();
  const person = currentPerson();
  const [open, setOpen] = useState<RoleId | null>(null);
  if (!person) return null;
  const mine = person.orgRole === "academic" ? subjectsForPerson(person.id, state.assignments) : state.subjects.map((s) => s.id);
  const subjectId = state.selectedSubjectId && mine.includes(state.selectedSubjectId) ? state.selectedSubjectId : mine[0] ?? null;
  const events = runTimeline(state, subjectId);
  const roleName = (id: RoleId) => ROLES.find((r) => r.id === id)!;
  return <Page wide>
    <PageHead title="How Lyceum works" context="Seven roles, one afternoon, nothing automatic. Each role reads what you confirmed and hands the next one a record you can open." />
    <ol className="pipeline" aria-label="The seven roles in order">
      {ROLES.map((role) => { const Icon = ICONS[role.id]; const expanded = open === role.id; return <li key={role.id} className={expanded ? "is-open" : ""}>
        <button type="button" className="pipeline-card" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : role.id)} data-demo-id={"role-" + role.id}>
          <span className="pipeline-icon" aria-hidden><Icon size={22} /></span>
          <span className="pipeline-name">{role.name}</span>
          <span className="pipeline-job">{role.job}</span>
          <span className="pipeline-more" aria-hidden>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        </button>
        {expanded ? <dl className="pipeline-detail"><div><dt>Reads</dt><dd>{role.reads}</dd></div><div><dt>Produces</dt><dd>{role.produces}</dd></div><div><dt>Cannot</dt><dd>{role.cannot}</dd></div></dl> : null}
      </li>; })}
    </ol>
    <div className="principle-strip" aria-label="Principles">
      <div><strong>Only on request</strong><span>Nothing fetches or drafts until you ask.</span></div>
      <div><strong>Exact quotations</strong><span>A requirement is a sentence from its source, or it is rejected.</span></div>
      <div><strong>Denominator in view</strong><span>Counts over postings you reviewed, with an interval. No score.</span></div>
      <div><strong>People decide</strong><span>Briefs go to colleagues; the university's process stays in charge.</span></div>
    </div>

    <section className="workspace-panel" aria-labelledby="run-record">
      <div className="section-heading"><div><h2 id="run-record">The record{subjectId ? " on " + subjectId : ""}, step by step</h2><p className="muted">Derived from the records this workspace holds now, in the order they were saved. Counts reflect the current state. This is not a log of agent activity, and nothing here is invented.</p></div>
        {mine.length > 1 ? <label className="course-switcher">Course<Select aria-label="Choose course" value={subjectId ?? ""} onChange={(e) => selectSubject(e.target.value)}>{mine.map((id) => <option key={id} value={id}>{id}</option>)}</Select></label> : null}</div>
      {events.length ? <ol className="timeline" data-demo-id="run-timeline">{events.map((e, i) => <li key={e.at + "|" + e.role + "|" + e.title + "|" + i}>
        <span className="timeline-time num">{e.at.slice(0, 16).replace("T", " ")}</span>
        <span className="timeline-role"><Tag tone="accent">{roleName(e.role).name}</Tag><span className="muted">{roleName(e.role).job}</span></span>
        <div className="timeline-body"><strong>{e.title}</strong><p className="muted">{e.detail}</p></div>
        {e.tab && subjectId ? <Button variant="quiet" aria-label={"Open " + e.title} onClick={() => { selectSubject(subjectId); selectStudioTab(e.tab!); navigate("studio"); }}>Open</Button> : null}
      </li>)}</ol>
        : <div className="empty-run"><p>No step has run on this course yet. Open the course and follow the journey bar, or press Play demo on the sign-in screen to watch one afternoon end to end.</p>
          <Button variant="primary" onClick={() => navigate("courses")}>Open a course</Button></div>}
    </section>
    <p className="muted">Want to see how this is tested? <Button variant="quiet" onClick={() => navigate("evaluation")}>Open Evaluation</Button></p>
  </Page>;
}
