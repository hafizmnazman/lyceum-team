// The public landing page (signed out): the pain, how it works, what is proven,
// and two ways in. No synthetic figures appear here; the illustrative research
// sandbox stays behind sign-in and is labelled there.

import { ArrowRight, BarChart3, BookOpen, CheckCircle2, FileText, Map as MapIcon, Play, Search, ShieldCheck } from "lucide-react";
import { PAIN_STATS } from "../../data/painStats.ts";
import { navigate } from "../../app/store.ts";
import { Button, Tag } from "../primitives/index.tsx";
import { BrandImage } from "../primitives/BrandImage.tsx";

const STEPS = [
  { icon: Search, title: "Search", text: "Fetch postings from a permitted employer board, only when you ask." },
  { icon: FileText, title: "Read", text: "Confirm each requirement as an exact quotation. A paraphrase is rejected." },
  { icon: BarChart3, title: "See the counts", text: "Counts over the postings you reviewed, with an interval. No trend until a comparable earlier window exists." },
  { icon: MapIcon, title: "Decide", text: "Map a skill to an outcome. Keep, refresh or revise, with the hours in view." },
  { icon: BookOpen, title: "Brief and teach", text: "A meeting brief and a teaching pack, both editable, with every receipt." },
];
const PROOF = [
  { value: "160", label: "automated checks passed on 11 October 2026, plus four headless browser runs" },
  { value: "727", label: "real postings fetched live from one employer's public board on request, 9 October 2026" },
  { value: "0", label: "AI keys needed. The core is deterministic; file parsing and live collection use the local API" },
  { value: "0", label: "paraphrases accepted as evidence. A quotation must match its source text or it is rejected" },
];

function HeroArt() {
  return <svg viewBox="0 0 520 300" role="img" aria-label="Three stages: postings with receipts, a course outline, a meeting brief" className="hero-art">
    <rect x="12" y="40" width="150" height="200" rx="12" fill="var(--surface)" stroke="var(--border)" />
    <rect x="28" y="60" width="118" height="10" rx="5" fill="var(--accent-soft)" /><rect x="28" y="82" width="96" height="8" rx="4" fill="var(--surface-2)" /><rect x="28" y="98" width="110" height="8" rx="4" fill="var(--surface-2)" />
    <rect x="28" y="126" width="118" height="30" rx="6" fill="var(--accent-soft)" /><rect x="40" y="136" width="94" height="8" rx="4" fill="var(--accent)" />
    <rect x="28" y="170" width="118" height="30" rx="6" fill="var(--accent-soft)" /><rect x="40" y="180" width="70" height="8" rx="4" fill="var(--accent)" />
    <path d="M170 140 L200 140" stroke="var(--ink-3)" strokeWidth="3" /><path d="M196 134 L204 140 L196 146" fill="none" stroke="var(--ink-3)" strokeWidth="3" />
    <rect x="210" y="40" width="150" height="200" rx="12" fill="var(--surface)" stroke="var(--border)" />
    <rect x="226" y="60" width="80" height="10" rx="5" fill="var(--ink-3)" />
    <rect x="226" y="90" width="118" height="8" rx="4" fill="var(--surface-2)" /><rect x="226" y="90" width="72" height="8" rx="4" fill="var(--accent)" />
    <rect x="226" y="112" width="118" height="8" rx="4" fill="var(--surface-2)" /><rect x="226" y="112" width="54" height="8" rx="4" fill="var(--accent)" />
    <rect x="226" y="134" width="118" height="8" rx="4" fill="var(--surface-2)" /><rect x="226" y="134" width="36" height="8" rx="4" fill="var(--accent)" />
    <rect x="226" y="170" width="118" height="30" rx="6" fill="var(--ok-soft)" /><rect x="238" y="180" width="80" height="8" rx="4" fill="var(--ok)" />
    <path d="M368 140 L398 140" stroke="var(--ink-3)" strokeWidth="3" /><path d="M394 134 L402 140 L394 146" fill="none" stroke="var(--ink-3)" strokeWidth="3" />
    <rect x="408" y="40" width="100" height="200" rx="12" fill="var(--surface)" stroke="var(--border)" />
    <rect x="422" y="60" width="72" height="10" rx="5" fill="var(--ink-3)" /><rect x="422" y="84" width="60" height="6" rx="3" fill="var(--surface-2)" /><rect x="422" y="96" width="72" height="6" rx="3" fill="var(--surface-2)" />
    <rect x="422" y="108" width="52" height="6" rx="3" fill="var(--surface-2)" /><rect x="422" y="140" width="72" height="44" rx="6" fill="var(--accent-soft)" /><rect x="430" y="150" width="56" height="6" rx="3" fill="var(--accent)" /><rect x="430" y="164" width="40" height="6" rx="3" fill="var(--accent)" />
    <rect x="422" y="200" width="72" height="20" rx="10" fill="var(--ok)" />
  </svg>;
}

export function LandingScreen() {
  const scopes: Array<"Malaysia" | "Asia" | "World"> = ["Malaysia", "Asia", "World"];
  return <div className="landing">
    <header className="landing-bar"><span className="page-title">Lyceum</span>
      <div className="button-row"><Button variant="quiet" onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> Watch the tour</Button><Button variant="primary" data-demo-id="index-signin" onClick={() => navigate("login")}>Try it as a lecturer <ArrowRight size={15} /></Button></div></header>
    <section className="landing-hero">
      <div>
        <p className="eyebrow">A lecturer's course workspace</p>
        <h1>Course decisions, with receipts.</h1>
        <p className="landing-lead">Gather what employers ask for, confirm every requirement as a quotation from its source, see honest counts, decide what the course should do about it, and take a brief to the meeting. Nothing runs by itself. Nothing changes a course without you.</p>
        <div className="button-row"><Button variant="primary" onClick={() => navigate("login")}>Try it as a lecturer <ArrowRight size={15} /></Button><Button onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> Watch the five-minute tour</Button></div>
      </div>
      <BrandImage name="hero" alt="Illustration of postings becoming a course decision and a meeting brief" fallback={<HeroArt />} />
    </section>

    <section className="landing-section" aria-labelledby="pain-title">
      <h2 id="pain-title">The gap is real, and it lands on the lecturer's desk</h2>
      <p className="landing-lead">Graduates find jobs; the match between what they learned and what the job asks is the problem. Course reviews exist, but the evidence behind them lives in browser tabs and memory.</p>
      {scopes.map((scope) => { const stats = PAIN_STATS.filter((s) => s.scope === scope); return stats.length ? <div key={scope} className="stat-scope"><Tag>{scope}</Tag>
        <div className="stat-grid">{stats.map((s) => <div className="stat-tile" key={s.value + s.label}><span className="stat-value">{s.value}</span><span className="stat-label">{s.label}</span><a className="stat-source" href={s.url} target="_blank" rel="noreferrer">{s.source}</a></div>)}</div></div> : null; })}
      <p className="landing-note">This is not a Malaysian problem alone. The same DOSM release puts skill-related underemployment at 27.3% in the United States, 28.5% in the United Kingdom, 36.8% in South Korea, 42.2% in Indonesia and 56.7% in the Philippines (ILOSTAT comparators).</p>
      <p className="landing-note">The regulator already asks for this evidence. Malaysia's MQA Code of Practice requires "market needs and graduate employability analyses" and a review system that "must constructively engage stakeholders, including the alumni and employers". <a href="https://office.iium.edu.my/kca/wp-content/uploads/2024/09/COPPA-2nd-Edition-Nov-2017.pdf" target="_blank" rel="noreferrer">MQA COPPA, 2nd edition, 6.1.6 and 7.1.4</a>. The fuller note with every source is in docs/research.</p>
    </section>

    <section className="landing-section" aria-labelledby="how-title">
      <h2 id="how-title">How it works, in five steps you control</h2>
      <ol className="landing-steps">{STEPS.map((s, i) => { const Icon = s.icon; return <li key={s.title}><span className="landing-step-icon" aria-hidden><Icon size={20} /></span><span className="landing-step-num">{i + 1}</span><strong>{s.title}</strong><p>{s.text}</p></li>; })}</ol>
    </section>

    <section className="landing-section" aria-labelledby="proof-title">
      <h2 id="proof-title">What is proven today</h2>
      <div className="stat-grid">{PROOF.map((p) => <div className="stat-tile" key={p.label}><span className="stat-value">{p.value}</span><span className="stat-label">{p.label}</span></div>)}</div>
      <ul className="proof-list">
        <li><CheckCircle2 size={16} /> Live collection from the Greenhouse and Lever employer board APIs, on request, with the source policy shown.</li>
        <li><CheckCircle2 size={16} /> Editable teaching packs and brief decks generated from saved data, with speaker notes and no AI-written text.</li>
        <li><CheckCircle2 size={16} /> Versioned course revisions checked against hours, links and protected foundations.</li>
        <li><ShieldCheck size={16} /> Not built yet: shared accounts, collectors for sites without an API, Teams and Slack surfaces, model-drafted slide text. The earlier illustrative screens stay behind sign-in, labelled.</li>
      </ul>
    </section>

    <section className="landing-section" aria-labelledby="who-title">
      <h2 id="who-title">Built for the people who do the work</h2>
      <div className="who-grid">
        <div><strong>Lecturers</strong><p>Prepare a class or a course refresh with evidence you can show.</p></div>
        <div><strong>Coordinators and programme owners</strong><p>Receive briefs with receipts instead of opinions; keep the formal process in charge.</p></div>
        <div><strong>Quality and accreditation units</strong><p>Versioned outlines, decision records and cited evidence, exportable for review.</p></div>
      </div>
    </section>
    <footer className="landing-footer">Local prototype. Workspace storage is local to this browser; file parsing and live collection go through the local API. Built by Hafiz Azman. <Button variant="quiet" onClick={() => navigate("login")}>Sign in</Button></footer>
  </div>;
}
