import { WorkspaceBackupPanel } from "./WorkspaceBackup.tsx";
import { useState } from "react";
import { navAllows } from "../../app/roles.ts";
import { REMAINING_WORK, SECTION_GUIDES } from "../../app/sectionGuides.ts";
import { currentPerson, navigate, useStore } from "../../app/store.ts";
import { Button, Field, Input, Page, PageHead, Tag } from "../primitives/index.tsx";

export function GuideScreen() {
  const state = useStore();
  const person = currentPerson();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  if (!person) return null;
  const sections = SECTION_GUIDES.filter((guide) =>
    (scope === "all" || navAllows(person, state.assignments, guide.screen)) &&
    [guide.title, guide.purpose, guide.output, guide.limitation, ...guide.steps].join(" ").toLowerCase().includes(query.toLowerCase().trim()));
  return (
    <Page>
      <PageHead title="Guide & development progress" context="What each section does, how to use it, and where the prototype still needs work." />
      <section className="workspace-panel" aria-labelledby="start-guide">
        <h2 id="start-guide">A lecturer's working session</h2>
        <ol className="journey-list">
          <li><strong>Open or create a course.</strong> Use Courses to start a personal workspace or open an assigned course.</li>
          <li><strong>Build the outline.</strong> In Outcomes & topics, record CLOs, achievement evidence, topic mappings, time budgets and prerequisites.</li>
          <li><strong>Review a revision.</strong> Save, check constraints, compare the changes and record the teaching term and rationale. You decide whether to use the local version; university approval follows your existing process.</li>
          <li><strong>Prepare a class.</strong> Save a CLO-linked session with an activity, learning check and references. Changed outcomes flag affected work for review.</li>
          <li><strong>Take your work with you.</strong> Export the outline or teaching plan as Markdown; download a JSON workspace backup for later restore.</li>
        </ol>
        <p className="muted">Use Save in each editor. Work is stored in this browser; JSON backups preserve saved data and versions, but exclude original uploaded files and unsaved edits. Slide generation and cross-device syncing remain planned.</p>
      </section>
      <WorkspaceBackupPanel />
      <div className="section-heading"><h2>Section-by-section guide</h2></div>
      <div className="filter-bar">
        <Field label="Find a section or function"><Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search outcomes, upload, review…" /></Field>
        <div className="button-row" aria-label="Guide scope">
          <Button aria-pressed={scope === "mine"} variant={scope === "mine" ? "primary" : "outline"} onClick={() => setScope("mine")}>My sections</Button>
          <Button aria-pressed={scope === "all"} variant={scope === "all" ? "primary" : "outline"} onClick={() => setScope("all")}>All roles</Button>
        </div>
      </div>
      <p className="muted" role="status">{sections.length} sections shown. “Working locally” means functional in this browser, not production ready.</p>
      {!sections.length ? <div className="workspace-panel"><h3>No matching sections</h3><p>Try a course task such as outcomes, upload or review, or show all roles.</p><Button onClick={() => { setQuery(""); setScope("all"); }}>Clear guide filters</Button></div> : null}
      {sections.map((guide) => (
        <details key={guide.screen} className="guide-entry" open={query.trim() ? true : undefined}>
          <summary><span>{guide.title}</span><Tag tone={guide.status === "Working locally" ? "ok" : "warn"}>{guide.status}</Tag></summary>
          <div className="guide-entry-body">
            <p className="muted">For {guide.audience.toLowerCase()}</p>
            <p>{guide.purpose}</p>
            <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <p><strong>Output:</strong> {guide.output}</p>
            <p className="limitation"><strong>Current limit:</strong> {guide.limitation}</p>
            {navAllows(person, state.assignments, guide.screen)
              ? <Button onClick={() => navigate(guide.screen)}>Open {guide.title}</Button>
              : <p className="muted">Available in the {guide.audience.toLowerCase()} workspace.</p>}
          </div>
        </details>
      ))}
      <section aria-labelledby="remaining-work" className="remaining-work">
        <h2 id="remaining-work">What has not been built yet</h2>
        <p className="muted">These are development priorities, not features you can activate today.</p>
        <dl>{REMAINING_WORK.map((item) => <div key={item.title}><dt>{item.title}</dt><dd>{item.detail}</dd></div>)}</dl>
      </section>
    </Page>
  );
}
