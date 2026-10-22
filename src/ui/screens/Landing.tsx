// The public landing page (plan Section 5.1): the loop as the hero with the host
// at its centre, the problem at three levels with sources, what reviewers
// already look for, the doors as a monochrome strip labelled planned,
// what is proven with dates, and two ways in. Every figure here is in
// docs/claims.md; no synthetic figure appears, and the illustrative research
// sandbox stays behind sign-in, labelled there.

import { ArrowRight, BookOpen, CheckCircle2, Footprints, GraduationCap, Globe, MessagesSquare, Monitor, Play, Plug, Puzzle, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ACCREDITOR_MAPPING } from "../../data/accreditors.ts";
import { PAIN_STATS } from "../../data/painStats.ts";
import { PROOF } from "../../data/proof.ts";
import { tourMinutes } from "../../demo/script.ts";
import { navigate } from "../../app/store.ts";
import { Button, Tag } from "../primitives/index.tsx";
import { Mark } from "../mascots/mark.tsx";
import { HOST_NAME } from "../mascots/index.tsx";
import { LoopGraphic } from "./LoopGraphic.tsx";

/** The doors (plan Section 11.2): where a lecturer reaches the same core. The web workspace is built; the MCP
 *  server runs locally over an exported workspace (docs/doors.md); the skill folder is written; the rest are planned. */
type DoorStatus = "Built" | "Local, read-only" | "Written" | "Planned";
export const DOORS: Array<{ name: string; how: string; icon: LucideIcon; status: DoorStatus }> = [
  { name: "Web workspace", how: "everything that needs a full editor", icon: Monitor, status: "Built" },
  { name: "The university's assistant", how: "an MCP server for Claude and other assistants; local over an exported workspace, remote and OAuth planned", icon: Plug, status: "Local, read-only" },
  { name: "A Lyceum skill", how: "the loop as a skill folder the assistant loads, for the local door", icon: Puzzle, status: "Written" },
  { name: "Microsoft 365 and Teams", how: "briefs posted as cards that link to the receipts", icon: MessagesSquare, status: "Planned" },
  { name: "Google Workspace", how: "a brief saved to Docs, a pack to Slides", icon: Globe, status: "Planned" },
  { name: "The learning platform", how: "launched from the course page through LTI 1.3", icon: GraduationCap, status: "Planned" },
];

export function LandingScreen() {
  return <div className="landing dot-grid">
    <header className="landing-bar on-forest"><span className="wordmark"><Mark size={32} tone="white" leaf />Lyceum</span>
      <div className="button-row"><Button variant="ghost" data-demo-id="index-judge" onClick={() => navigate("judge")}><Footprints size={14} /> For judges: walk with {HOST_NAME}</Button><Button variant="ghost" onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> Watch the tour</Button><Button variant="lime" data-demo-id="index-signin" onClick={() => navigate("login")}>Try it as a lecturer <ArrowRight size={15} /></Button></div></header>
    <section className="landing-hero">
      <div className="landing-hero-card card-forest on-forest">
        <div>
          <p className="eyebrow">A lecturer's course workspace</p>
          <h1>Course decisions, with receipts.</h1>
          <p className="landing-lead">Lyceum turns real job postings into a course decision with receipts, every semester. Watch what employers ask for, report it with every quotation, decide with a reason on record, update the course, teach it, and see what came back. Nothing changes a course without you.</p>
          <div className="button-row"><Button variant="lime" onClick={() => navigate("login")}>Try it as a lecturer <ArrowRight size={15} /></Button><Button variant="ghost" onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> Watch the tour, about {tourMinutes()} minutes</Button>
            <Button variant="ghost" data-demo-id="index-judge-hero" onClick={() => navigate("judge")}><Footprints size={14} /> For judges: walk with {HOST_NAME}</Button></div>
        </div>
        <div className="landing-hero-loop"><LoopGraphic surface="forest" compact /></div>
      </div>
    </section>

    <section className="landing-section" aria-labelledby="pain-title">
      <h2 id="pain-title">The evidence moves faster than the course</h2>
      <p className="landing-lead">Employers expect skills to keep shifting through 2030, while a new degree programme can take a year or more to approve. The problem at three levels, one comparison each.</p>
      <div className="stat-grid level-grid">{PAIN_STATS.map((s) => <div className="stat-tile level-tile" key={s.claim} data-demo-id={"level-" + s.scope.toLowerCase()}>
        <Tag>{s.scope}</Tag>
        <span className="stat-value">{s.value}</span>
        <span className="stat-label">{s.label}{s.vendor ? " (a vendor survey)" : ""}.</span>
        <span className="stat-sources">{s.sources.map((src, i) => <span key={src.url}>{i ? " · " : ""}<a className="stat-source" href={src.url} target="_blank" rel="noreferrer">{src.name}</a></span>)}</span>
      </div>)}</div>
      <p className="landing-note">These are desk research: published sources checked on 11 and 22 October 2026, each listed with its link in the project's claims register. Interviews with lecturers in at least three Asian countries are planned and will add one quotation per level.</p>
    </section>

    <section className="landing-section" aria-labelledby="accreditors-title">
      <h2 id="accreditors-title">Each step answers what reviewers already look for</h2>
      <p className="landing-lead">Accreditors and quality codes already ask for stakeholder evidence, documented decisions and programme review, and constructive alignment is the teaching principle behind Teach; the evidence is what is missing.</p>
      <ol className="accreditor-list">{ACCREDITOR_MAPPING.map((m) => <li key={m.step}>
        <div className="accreditor-step"><strong>{m.step}</strong><span className="muted">{m.what}</span></div>
        <div className="accreditor-clauses">{m.clauses.map((c) => <blockquote key={c.body} className="accreditor-clause">
          <p>{c.paraphrase ? c.quote : "“" + c.quote + "”"}</p>
          <footer><a href={c.url} target="_blank" rel="noreferrer">{c.body}</a>{c.paraphrase ? <span className="muted"> · paraphrased from a secondary source</span> : null}</footer>
        </blockquote>)}</div>
      </li>)}</ol>
    </section>

    <section className="landing-section" aria-labelledby="doors-title">
      <h2 id="doors-title">One core, many doors</h2>
      <p className="landing-lead">The same deterministic core, reached from the tools lecturers already use. Today it is the web workspace and a local, read-only door for an assistant; the other doors are planned.</p>
      <ul className="doors-strip">{DOORS.map((d) => { const Icon = d.icon; return <li key={d.name} className={d.status === "Planned" ? "" : "is-built"}>
        <Icon size={24} strokeWidth={1.75} aria-hidden />
        <strong>{d.name}</strong><span className="muted">{d.how}</span>
        <Tag tone={d.status === "Built" ? "ok" : d.status === "Planned" ? "neutral" : "accent"}>{d.status}</Tag>
      </li>; })}</ul>
    </section>

    <section className="landing-section" aria-labelledby="proof-title">
      <h2 id="proof-title">What is proven today</h2>
      <div className="stat-grid">{PROOF.map((p) => <div className="stat-tile" key={p.claim}><span className="stat-value">{p.value}</span><span className="stat-label">{p.label}</span></div>)}</div>
      <ul className="proof-list">
        <li><CheckCircle2 size={16} /> Live collection from the Greenhouse and Lever employer board APIs, on request, with the source policy shown.</li>
        <li><CheckCircle2 size={16} /> Decisions recorded as data: adopt, retain, defer or return, with the reason, the person, the course version and the term.</li>
        <li><CheckCircle2 size={16} /> Editable teaching packs and brief decks generated from saved data, with speaker notes and no AI-written text.</li>
        <li><CheckCircle2 size={16} /> Versioned course revisions checked against hours, links and protected foundations.</li>
        <li><CheckCircle2 size={16} /> A local, read-only door: an MCP server over an exported workspace answers with the same counts and quotations, and writes nothing to the workspace.</li>
        <li><ShieldCheck size={16} /> Not built yet: shared accounts, the remote and planned doors above, collectors for sites without an API, model-drafted slide text, and any learning claim. The earlier illustrative screens stay behind sign-in, labelled.</li>
      </ul>
    </section>

    <section className="landing-section" aria-labelledby="who-title">
      <h2 id="who-title">Built for the people who do the work</h2>
      <div className="who-grid">
        <div><BookOpen size={20} aria-hidden /><strong>Lecturers</strong><p>Prepare a class or a course refresh with evidence you can show.</p></div>
        <div><Users size={20} aria-hidden /><strong>Coordinators and programme owners</strong><p>Receive briefs with receipts instead of opinions, and record the decision with its reason.</p></div>
        <div><ShieldCheck size={20} aria-hidden /><strong>Quality and accreditation units</strong><p>Versioned outlines, decision records and cited evidence, exportable for review.</p></div>
      </div>
    </section>
    <section className="landing-section landing-ways" aria-labelledby="ways-title">
      <h2 id="ways-title">Two ways in</h2>
      <div className="button-row"><Button variant="primary" onClick={() => navigate("login")}>Try it as a lecturer <ArrowRight size={15} /></Button><Button onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> Watch the tour, about {tourMinutes()} minutes</Button><Button onClick={() => navigate("judge")}><Footprints size={14} /> For judges: walk with {HOST_NAME}</Button></div>
    </section>
    <footer className="landing-footer">Local prototype. Workspace storage is local to this browser; file parsing and live collection go through the local API. Built by Hafiz Azman. <Button variant="quiet" onClick={() => navigate("login")}>Sign in</Button></footer>
  </div>;
}
