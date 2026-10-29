// The public landing page (plan Section 5.1): the loop as the hero with the host
// at its centre, the problem at three levels with sources, what reviewers
// already look for, the doors as a monochrome strip labelled planned,
// what is proven with dates, and two ways in. Every figure here is in
// docs/claims.md; no synthetic figure appears, and the illustrative research
// sandbox stays behind sign-in, labelled there.

import { useEffect, useRef } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Footprints, GraduationCap, Globe, MessagesSquare, Monitor, Play, Plug, Puzzle, Scale, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ACCREDITOR_MAPPING } from "../../../../shared/data/accreditors.ts";
import { PAIN_STATS } from "../../../../shared/data/painStats.ts";
import { PROOF } from "../../../../shared/data/proof.ts";
import { tourMinutes } from "../../demo/script.ts";
import { navigate } from "../../app/store.ts";
import { Button, Tag } from "../primitives/index.tsx";
import { Mark } from "../mascots/mark.tsx";
import { CAST, HOST_NAME, Mascot } from "../mascots/index.tsx";
import { LoopGraphic, STATIONS } from "./LoopGraphic.tsx";

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

// The landing's card: the forest outline and offset shadow, lifting a little under the pointer (hover: covers only
// devices that hover, motion-safe: drops it when motion is reduced). The section head sets its title and lead side by side
// when the page is wide, instead of the lead leaving the right half empty.
const CARD = "rounded-card border-2 border-forest bg-white shadow-[0_4px_0_var(--color-forest)] transition-[translate,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-[3px] motion-safe:hover:shadow-[0_7px_0_var(--color-forest)]";
const HEAD = "min-[1100px]:mb-7 min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] min-[1100px]:items-end min-[1100px]:gap-[clamp(32px,4vw,96px)] min-[1100px]:*:m-0";

/** A step's side of its card: the helpers who stand at that step on the hero's loop, so the faces match, then the step. */
function AccreditorStep({ step, what }: { step: string; what: string }) {
  const at = STATIONS.filter((s) => s.step === step);
  const names = at.flatMap((s) => s.who === "people" ? [] : [CAST.find((c) => c.who === s.who)!.name]);
  return <div className="grid content-start justify-items-start gap-1">
    <span className="mb-2 flex min-h-14 items-end gap-1" aria-hidden>{at.map((s) => s.who === "people"
      ? <span key="people" className="loop-station-people m-1 size-12"><Scale size={24} strokeWidth={1.75} /></span>
      : <Mascot key={s.who} who={s.who} mood="resting" size={56} still />)}</span>
    <strong className="font-display text-2xl leading-[1.15] font-extrabold tracking-[-0.02em]">{step}</strong>
    <span className="text-[15px] leading-[1.45] text-ink-2">{what}</span>
    <span className="mt-2 text-[13px] font-semibold text-emerald-text">{names.length ? "with " + names.join(", ").replace(/, ([^,]+)$/, " and $1") : "decided by people"}</span>
  </div>;
}

export function LandingScreen() {
  const ref = useRef<HTMLDivElement>(null);
  // Hidden only once this runs, so without script (or with reduced motion) everything is simply there
  useEffect(() => {
    const root = ref.current;
    if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const items = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    for (const el of items) el.style.setProperty("--reveal-i", String(Math.min([...el.parentElement!.children].indexOf(el), 5)));
    const io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }, { rootMargin: "0px 0px -8% 0px" });
    root.classList.add("is-revealing");
    for (const el of items) io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div className="landing dot-grid" ref={ref}>
    <header className="landing-bar on-forest"><span className="wordmark"><Mark size={32} tone="white" leaf />Lyceum</span>
      <div className="button-row"><Button variant="ghost" data-demo-id="index-judge" onClick={() => navigate("judge")}><Footprints size={14} /> For judges: walk with {HOST_NAME}</Button><Button variant="ghost" onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> Watch the tour</Button><Button variant="lime" data-demo-id="index-signin" onClick={() => navigate("login")}>Try it as a lecturer <ArrowRight size={15} /></Button></div></header>
    <section className="landing-hero">
      <div className="landing-hero-card card-forest on-forest">
        <div>
          <p className="eyebrow">A lecturer's course workspace</p>
          <h1><span>Course decisions,</span> <span>with receipts.</span></h1>
          <p className="landing-lead">Lyceum turns real job postings into a course decision with receipts, every semester. Watch what employers ask for, report it with every quotation, decide with a reason on record, update the course, teach it, and see what came back. Nothing changes a course without you.</p>
          <div className="button-row"><Button variant="lime" onClick={() => navigate("login")}>Try it as a lecturer <ArrowRight size={15} /></Button><Button variant="ghost" data-demo-id="play-demo" onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> Watch the tour, about {tourMinutes()} minutes</Button>
            <Button variant="ghost" data-demo-id="index-judge-hero" onClick={() => navigate("judge")}><Footprints size={14} /> For judges: walk with {HOST_NAME}</Button></div>
        </div>
        <div className="min-w-0 *:max-w-[560px]"><LoopGraphic surface="forest" compact /></div>
      </div>
    </section>

    <section className="landing-section" aria-labelledby="pain-title">
      <div className={HEAD} data-reveal><h2 id="pain-title">The evidence moves faster than the course</h2><p className="landing-lead">Employers expect skills to keep shifting through 2030, while a new degree programme can take a year or more to approve. The problem at three levels, one comparison each.</p></div>
      <div className="stat-grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">{PAIN_STATS.map((s) => <div className="stat-tile" key={s.claim} data-demo-id={"level-" + s.scope.toLowerCase()} data-reveal>
        <Tag>{s.scope}</Tag>
        <span className="stat-value text-[56px]">{s.value}</span>
        <span className="stat-label">{s.label}{s.vendor ? " (a vendor survey)" : ""}.</span>
        <span className="text-[13px] leading-[1.5]">{s.sources.map((src, i) => <span key={src.url}>{i ? " · " : ""}<a href={src.url} target="_blank" rel="noreferrer">{src.name}</a></span>)}</span>
      </div>)}</div>
      <p className="landing-note" data-reveal>These are desk research: published sources checked on 11 and 22 October 2026, each listed with its link in the project's claims register. Interviews with lecturers in at least three Asian countries are planned and will add one quotation per level.</p>
    </section>

    <section className="landing-section" aria-labelledby="accreditors-title">
      <div className={HEAD} data-reveal><h2 id="accreditors-title">Each step answers what reviewers already look for</h2><p className="landing-lead">Accreditors and quality codes already ask for stakeholder evidence, documented decisions and programme review, and constructive alignment is the teaching principle behind Teach; the evidence is what is missing.</p></div>
      <ol className="mt-4 mb-0 grid list-none gap-3 p-0 min-[1100px]:grid-cols-2">{ACCREDITOR_MAPPING.map((m, i, all) => <li key={m.step} data-reveal
        className={CARD + " grid grid-cols-[210px_minmax(0,1fr)] gap-6 p-6 max-[900px]:grid-cols-1 max-[900px]:gap-2" + (i === all.length - 1 && all.length % 2 ? " min-[1100px]:col-span-full" : "")}>
        <AccreditorStep step={m.step} what={m.what} />
        <div className="grid content-start gap-[18px]">{m.clauses.map((c) => <blockquote key={c.body} className="m-0 border-l-[3px] border-emerald py-0.5 pr-0 pl-3.5">
          <p className="mt-0 mb-1.5 text-base leading-[1.55] text-ink">{c.paraphrase ? c.quote : "“" + c.quote + "”"}</p>
          <footer className="text-[13px]"><a href={c.url} target="_blank" rel="noreferrer">{c.body}</a>{c.paraphrase ? <span className="muted"> · paraphrased from a secondary source</span> : null}</footer>
        </blockquote>)}</div>
      </li>)}</ol>
    </section>

    <section className="landing-section" aria-labelledby="doors-title">
      <div className={HEAD} data-reveal><h2 id="doors-title">One core, many doors</h2><p className="landing-lead">The same deterministic core, reached from the tools lecturers already use. Today it is the web workspace and a local, read-only door for an assistant; the other doors are planned.</p></div>
      <ul className="mt-4 mb-0 grid list-none grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5 p-0">{DOORS.map((d) => { const Icon = d.icon; const built = d.status !== "Planned"; return <li key={d.name} data-reveal
        className={"grid content-start justify-items-start gap-1 bg-white p-3.5 text-ink-2 [&_span]:text-[13px] [&_span]:leading-[1.4] " + (built ? CARD : "rounded-card border-2 border-dashed border-next-dashed")}>
        <Icon size={24} strokeWidth={1.75} aria-hidden className={built ? "text-emerald-text" : undefined} />
        <strong className="text-[14px] text-ink">{d.name}</strong><span className="muted">{d.how}</span>
        <Tag tone={d.status === "Built" ? "ok" : d.status === "Planned" ? "neutral" : "accent"}>{d.status}</Tag>
      </li>; })}</ul>
    </section>

    <section className="landing-section" aria-labelledby="proof-title">
      <h2 id="proof-title" data-reveal>What is proven today</h2>
      <div className="stat-grid">{PROOF.map((p) => <div className="stat-tile" key={p.claim} data-reveal><span className="stat-value">{p.value}</span><span className="stat-label">{p.label}</span></div>)}</div>
      <ul className="proof-list">
        <li data-reveal><CheckCircle2 size={16} /> Live collection from the Greenhouse and Lever employer board APIs, on request, with the source policy shown.</li>
        <li data-reveal><CheckCircle2 size={16} /> Decisions recorded as data: adopt, retain, defer or return, with the reason, the person, the course version and the term.</li>
        <li data-reveal><CheckCircle2 size={16} /> Editable teaching packs and brief decks generated from saved data, with speaker notes and no AI-written text; Prism drafts slide text only when a lecturer asks, and every such slide says so.</li>
        <li data-reveal><CheckCircle2 size={16} /> Versioned course revisions checked against hours, links and protected foundations.</li>
        <li data-reveal><CheckCircle2 size={16} /> A local, read-only door: an MCP server over an exported workspace answers with the same counts and quotations, and writes nothing to the workspace.</li>
        <li data-reveal><ShieldCheck size={16} /> Prototype: accounts on Supabase, watching on a schedule, agent collection for sites without an API, model-drafted items, and model suggestions on a lecturer's own slides, each labelled where it appears. Not built yet: a shared institutional workspace, the remote and planned doors above, and any learning claim. The earlier illustrative screens stay behind sign-in, labelled.</li>
      </ul>
    </section>

    <section className="landing-section" aria-labelledby="who-title">
      <h2 id="who-title" data-reveal>Built for the people who do the work</h2>
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">{[
        { Icon: BookOpen, who: "Lecturers", does: "Prepare a class or a course refresh with evidence you can show." },
        { Icon: Users, who: "Coordinators and programme owners", does: "Receive briefs with receipts instead of opinions, and record the decision with its reason." },
        { Icon: ShieldCheck, who: "Quality and accreditation units", does: "Versioned outlines, decision records and cited evidence, exportable for review." },
      ].map(({ Icon, who, does }) => <div key={who} className={CARD + " p-4"} data-reveal>
        <Icon size={20} aria-hidden className="mb-1.5 block text-emerald-text" /><strong>{who}</strong><p className="mt-1.5 mb-0 text-base leading-[1.5] text-ink-2">{does}</p>
      </div>)}</div>
    </section>
    <section className="landing-section" aria-labelledby="ways-title">
      <h2 id="ways-title" data-reveal>Two ways in</h2>
      <div className="button-row mt-2" data-reveal><Button variant="primary" onClick={() => navigate("login")}>Try it as a lecturer <ArrowRight size={15} /></Button><Button onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> Watch the tour, about {tourMinutes()} minutes</Button><Button onClick={() => navigate("judge")}><Footprints size={14} /> For judges: walk with {HOST_NAME}</Button></div>
    </section>
    <footer className="landing-footer">Local prototype. Workspace storage is local to this browser; file parsing and live collection go through the local API. Built by Hafiz Azman. <Button variant="quiet" onClick={() => navigate("login")}>Sign in</Button></footer>
  </div>;
}
