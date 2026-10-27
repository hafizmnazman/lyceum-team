// The judge's page (depth plan Section 9.1 item 1), public like the landing page: Tualang greets once, three ways in (the
// guided walk, the before and after, the local door), the register's four figures, counted up once as they come into view
// and static under reduced motion (D6b), and the card of what is not built, Tualang beside it and silent, listing
// REMAINING_WORK word for word. The host speaks only the greeting.

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Footprints, GitCompare, Play, Plug } from "lucide-react";
import { REMAINING_WORK } from "../../app/sectionGuides.ts";
import { currentPerson, navigate } from "../../app/store.ts";
import { PROOF } from "../../data/proof.ts";
import { tourMinutes } from "../../demo/script.ts";
import { startWalk } from "../../demo/WalkOverlay.tsx";
import { WALK } from "../../demo/walk.ts";
import { HOST_NAME, Mark, Mascot } from "../mascots/index.tsx";
import { countedText, easeOut, reducedMotion } from "../motion.ts";
import { Button, Tag } from "../primitives/index.tsx";

export const JUDGE_GREETING = "Six steps, one course, one term. Walk with me, or watch.";

/** A register figure that counts up once, over 0.9 s, when it comes into view, and ends on the register's exact value; it
 *  stays still under reduced motion, and a screen reader reads the exact value from the start. */
function CountedValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [k, setK] = useState(() => (reducedMotion() ? 1 : 0));
  useEffect(() => {
    if (reducedMotion()) { setK(1); return; }
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const step = (now: number) => { const t = Math.min(1, (now - start) / 900); setK(easeOut(t)); if (t < 1) frame = requestAnimationFrame(step); };
      frame = requestAnimationFrame(step);
    };
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { run(); return () => cancelAnimationFrame(frame); }
    const seen = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { seen.disconnect(); run(); } }, { threshold: 0.6 });
    seen.observe(el);
    return () => { seen.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <span className="stat-value" ref={ref}><span aria-hidden="true">{countedText(value, k)}</span><span className="sr-only">{value}</span></span>;
}

export function JudgeScreen() {
  const [door, setDoor] = useState(false);
  const signedIn = Boolean(currentPerson());
  return <div className="landing judge dot-grid">
    <header className="landing-bar on-forest"><span className="wordmark"><Mark size={32} tone="white" leaf />Lyceum</span>
      <div className="button-row">{signedIn ? <Button variant="ghost" onClick={() => navigate("inbox")}>Back to the workspace</Button>
        : <Button variant="ghost" onClick={() => navigate("index")}>The landing page</Button>}
        <Button variant="lime" onClick={() => navigate(signedIn ? "inbox" : "login")}>Try it as a lecturer <ArrowRight size={15} /></Button></div></header>

    <section className="landing-hero">
      <div className="landing-hero-card card-forest on-forest judge-hero" data-demo-id="judge-hero">
        <div className="judge-host"><Mascot who="host" mood="greeting" size={160} surface="forest" /></div>
        <div>
          <p className="eyebrow">For judges</p>
          <h1 data-demo-id="judge-greeting"><span className="sr-only">{HOST_NAME}: </span>{JUDGE_GREETING}</h1>
          <div className="button-row judge-actions">
            <Button variant="lime" onClick={() => startWalk("loop")} data-demo-id="judge-walk"><Footprints size={16} /> Walk the loop, {WALK.length} stops</Button>
            <Button variant="ghost" onClick={() => startWalk("change")} data-demo-id="judge-compare"><GitCompare size={16} /> Before and after</Button>
            <Button variant="ghost" aria-expanded={door} aria-controls="judge-door" onClick={() => setDoor(!door)} data-demo-id="judge-door"><Plug size={16} /> Ask the door</Button>
          </div>
          <p className="judge-watch">Or watch: <Button variant="ghost" onClick={() => window.dispatchEvent(new Event("lyceum:play-demo"))}><Play size={14} /> the tour plays by itself, about {tourMinutes()} minutes</Button></p>
          <p className="judge-note">The walk opens the sample workspace, the tour's end state: real postings, a sample course labelled synthetic, and personas. Next, Back and Esc move it.</p>
        </div>
      </div>
    </section>

    {door ? <section className="landing-section judge-door" id="judge-door" aria-labelledby="judge-door-title" data-demo-id="judge-door-panel">
      <h2 id="judge-door-title">Ask the door</h2>
      <p className="landing-lead">An assistant asks Lyceum for the evidence through a local, read-only door: an MCP server over an exported workspace. It runs on the team's laptop beside Claude Desktop; this page cannot reach it.</p>
      <ol className="journey-list">
        <li>In Claude Desktop with the door configured, ask: <q>What does CS310's evidence report say about dashboards?</q></li>
        <li>The answer comes back with the counts over the reviewed postings and each quotation with its link, the same records as Report.</li>
        <li>Without Claude Desktop: <code>node mcp/try.ts</code> asks the same question through the official client.</li>
      </ol>
      <p><Tag tone="accent">Local, read-only</Tag> <span className="muted">Remote access with OAuth and the other doors are planned.</span></p>
    </section> : null}

    <section className="landing-section" aria-labelledby="judge-proof-title">
      <h2 id="judge-proof-title">What is proven today</h2>
      <div className="stat-grid">{PROOF.map((p) => <div className="stat-tile" key={p.claim} data-demo-id={"judge-proof-" + p.claim}><CountedValue value={p.value} /><span className="stat-label">{p.label}</span></div>)}</div>
      <p className="landing-note">Each figure is a row in the project's claims register, measured by this project.</p>
    </section>

    <section className="landing-section" aria-labelledby="judge-not-built-title">
      <div className="judge-not-built" data-demo-id="judge-not-built">
        <div className="judge-not-built-host"><Mascot who="host" mood="resting" size={96} /></div>
        <div>
          <h2 id="judge-not-built-title">What is not built</h2>
          <p className="muted">These are development priorities, not features you can switch on today.</p>
          <dl className="judge-remaining">{REMAINING_WORK.map((item) => <div key={item.title}><dt>{item.title}</dt><dd>{item.detail}</dd></div>)}</dl>
        </div>
      </div>
    </section>
    <footer className="landing-footer">Local prototype. The walk runs in this browser on the sample workspace, and every synthetic record says so on screen.</footer>
  </div>;
}
