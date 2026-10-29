import { WorkspaceBackupPanel } from "./WorkspaceBackup.tsx";
import { InstitutionPanel } from "./InstitutionPanel.tsx";
import { useState } from "react";
import { navAllows } from "../../app/roles.ts";
import { REMAINING_WORK, SECTION_GUIDES } from "../../app/sectionGuides.ts";
import { currentPerson, navigate, useStore } from "../../app/store.ts";
import { Footprints, Play, RotateCcw } from "lucide-react";
import { resetPageTours } from "../shell/PageTour.tsx";
import { HOST_NAME } from "../mascots/index.tsx";
import { Button, Field, Input, Page, PageHead, Tag } from "../primitives/index.tsx";
import { Segmented } from "../primitives/Segmented.tsx";

const CARD = "rounded-[var(--radius-card)] border-2 border-forest bg-white shadow-[0_4px_0_var(--forest)]";
const START = [
  { title: "Open a course", body: "From Courses, open an assigned course or create a personal workspace, then set the term the loop runs for." },
  { title: "Follow the loop", body: "Watch, Report, Decide, Update, Teach and Learn sit at the top of every step and in the sidebar. Each step asks its question; the rail beside it says when it is done and where to go next." },
  { title: "Save as you go", body: "Each editor has its own Save. Signed in, your workspace is kept with your account; a JSON backup below moves it, without the original uploaded files or unsaved edits." },
];
// In-page links scroll rather than change the address, which belongs to the app's own routes.
const CONTENTS: Array<[string, string]> = [["guide-start", "Getting started"], ["guide-backup", "Backup & recovery"], ["guide-institution", "Your institution"], ["guide-sections", "Section by section"], ["guide-remaining", "Not built yet"]];

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
      <PageHead title="Guide & development progress" context="How to use each section, and where the prototype still needs work." actions={<><Button data-demo-id="guide-judge" onClick={() => navigate("judge")}><Footprints size={15} /> For judges: walk with {HOST_NAME}</Button><Button data-demo-id="guide-play-demo" onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={15} /> Play the demo tour</Button></>} />
      <div className="grid items-start gap-8 min-[1200px]:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
      <section className="mb-8" aria-labelledby="start-guide" id="guide-start">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="start-guide" className="m-0">A lecturer's working session</h2>
          <Button onClick={() => { resetPageTours(person.id); navigate("inbox"); }} data-demo-id="guide-replay-tours"><RotateCcw size={15} /> Replay the page tours</Button>
        </div>
        <ol className="m-0 grid list-none gap-4 p-0 min-[900px]:grid-cols-3">
          {START.map((s, i) => <li key={s.title} className={CARD + " grid content-start gap-2 p-5"}>
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-forest text-[15px] font-bold text-white">{i + 1}</span>
            <strong className="text-[17px]">{s.title}</strong>
            <span className="text-[14px] leading-[1.5] text-ink-2">{s.body}</span>
          </li>)}
        </ol>
      </section>
      <div id="guide-backup"><WorkspaceBackupPanel /></div>
      <div id="guide-institution"><InstitutionPanel /></div>
      <div className="section-heading" id="guide-sections"><h2>Section-by-section guide</h2></div>
      <div className="filter-bar">
        <Field label="Find a section or function"><Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search outcomes, upload, review…" /></Field>
        <Segmented label="Guide scope" value={scope} onChange={setScope} options={[{ value: "mine", label: "My sections" }, { value: "all", label: "All roles" }]} />
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
      <section aria-labelledby="remaining-work" className="remaining-work" id="guide-remaining">
        <h2 id="remaining-work">What has not been built yet</h2>
        <p className="muted">These are development priorities, not features you can activate today.</p>
        <dl>{REMAINING_WORK.map((item) => <div key={item.title}><dt>{item.title}</dt><dd>{item.detail}</dd></div>)}</dl>
      </section>
      </div>
      <nav aria-label="On this page" className="sticky top-6 hidden gap-1 min-[1200px]:grid">
        <span className="mb-1 font-mono text-[12px] tracking-[0.08em] text-emerald-text uppercase">On this page</span>
        {CONTENTS.map(([id, label]) => <button key={id} type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="cursor-pointer rounded-lg border-0 bg-transparent px-3 py-2 text-left text-[14px] text-ink-2 hover:bg-tint-1 hover:text-ink">{label}</button>)}
      </nav>
      </div>
    </Page>
  );
}
