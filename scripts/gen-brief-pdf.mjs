// The project brief as a three-page A4 PDF, for someone who has not seen Lyceum:
// the person, why now, the receipt and the loop (page 1); the journey in real
// screens and what is real (page 2); the doors, why a department pays, the
// organiser's review and the ask (page 3). The same eight beats as the deck
// (plan Section 4.1), on the tokens and the bundled faces, with the mascots and
// the screenshots from scripts/presentation-shots.mjs. Every number sits in an
// element marked data-claim (a row of docs/claims.md) or data-ref (a date, an id,
// a clause), and the script fails on a stray digit, a dash, or text that runs
// into a footer. Run `node scripts/gen-brief-pdf.mjs` (add `--preview <dir>` for
// PNG previews of the pages).
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { ROOT, fontFaceCss, fontsReady, rootVarsCss } from "./lib/theme-node.mjs";
import { claimsRegister, figureProblems, readFigures } from "./lib/claims-node.mjs";
import { PAIN_STATS } from "../src/data/painStats.ts";
import { PROOF } from "../src/data/proof.ts";

const OUT = join(ROOT, "docs/presentation/lyceum-brief.pdf");
const previewAt = process.argv.indexOf("--preview");
const PREVIEW_DIR = previewAt > 0 ? process.argv[previewAt + 1] : null;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dataUri = (file, type) => "data:" + type + ";base64," + readFileSync(join(ROOT, file)).toString("base64");
const mascot = (who, pose = "resting") => dataUri("public/brand/mascots/" + who + "-" + pose + ".svg", "image/svg+xml");
const png = (file) => { const b = readFileSync(join(ROOT, file)); return { src: "data:image/png;base64," + b.toString("base64"), w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
/** A real screenshot at a width in mm, optionally cropped to a region given in the image's own pixels. */
function shot(file, widthMm, alt, area = {}) {
  const img = png(file), { x = 0, y = 0, w = img.w, h = img.h } = area, s = widthMm / w;
  return `<div class="shot" style="width:${widthMm}mm;height:${(h * s).toFixed(2)}mm"><img alt="${esc(alt)}" src="${img.src}" style="width:${(img.w * s).toFixed(2)}mm;margin-left:${(-x * s).toFixed(2)}mm;margin-top:${(-y * s).toFixed(2)}mm"></div>`;
}
const proof = Object.fromEntries(PROOF.map((p) => [p.claim, p]));

// ---------- the content ----------
const STEPS = [
  { step: "Course", who: "folio", helper: "Folio", ask: "What does this course promise today?" },
  { step: "Watch", who: "scout", helper: "Scout", ask: "What are employers asking for, right now and over time?" },
  { step: "Report", who: "atlas", helper: "Atlas, Lens and Steward", ask: "What exactly do they ask, how often, and what does the course do about it?" },
  { step: "Decide", who: null, helper: "People decide", ask: "What will we do, and who said so?" },
  { step: "Update", who: "quill", helper: "Quill", ask: "What does the approved change look like, within our hours and rules?" },
  { step: "Teach", who: "prism", helper: "Prism", ask: "What will the class do, and with what?" },
  { step: "Learn", who: "lens", helper: "Lens", ask: "Did it work, as far as we can honestly tell?" },
];
const NOT_BUILT = ["Remote doors for ChatGPT Edu, Copilot and Gemini", "The LMS door for Canvas and Moodle", "Learn's intervals, pooling and the perception gap", "The benchmark run against the CLO survey", "Watching on a schedule", "A shared workspace with sign-in"];
const REVIEW = [
  { ask: "Less wordy, more visual: give the agents mascots and living personas.", status: "Done", tone: "built", response: "A host and seven helpers, drawn in code, whose moods follow real records; in the app, the deck and the poster." },
  { ask: "Research the problem beyond Malaysia, at Asia and world level.", status: "Started", tone: "local", response: "One sourced comparison each for the world, Asia and Malaysia, labelled desk research. Interviews with lecturers in at least three Asian countries come next." },
  { ask: "Make the flow of the app and the flow of the pitch tally.", status: "Done", tone: "built", response: "One loop with the same six names in the app, the demo, the deck and this brief; the film follows the same order." },
  { ask: "Benchmark the mock cohort against the SSRT and CLO surveys.", status: "Planned", tone: "planned", response: "Predictions frozen before a semester and scored against that semester's CLO survey and results. Not run yet." },
];
const PEOPLE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`;

const PAGES = 3;
const mast = `<header class="mast"><span class="wordmark"><img src="${dataUri("public/brand/mark.svg", "image/svg+xml")}" alt="">Lyceum</span><span class="mast-meta" data-ref>Project brief · 22 October 2026</span></header>`;
const foot = (n, left) => `<footer class="foot"><span>${left}</span><span class="page-number">${n} / ${PAGES}</span></footer>`;

const page1 = `<section class="page">
  ${mast}
  <h1>Lyceum turns real job postings into a course decision with receipts, every semester, inside the tools lecturers already use.</h1>
  <p class="lede">After class, Dr Aisyah, a fictional lecturer, is asked what her course should change before the next review. She can suggest a change; she cannot show why. The evidence sits in browser tabs and in memory: no exact sentences from employers, no denominator, no record of who decided.</p>

  <section class="section">
    <p class="eyebrow">Why now</p>
    <div class="stats">${PAIN_STATS.map((s) => `<div class="stat" data-claim="${s.claim}"><div class="scope">${esc(s.scope)}</div><div class="num">${esc(s.value)}</div><div class="lbl">${esc(s.label)}${s.vendor ? " (a vendor survey)" : ""}</div><div class="src">${esc(s.sources.map((x) => x.name).join("; "))}</div></div>`).join("")}</div>
    <p class="caption">Desk research, one comparison for each level, until interviews with lecturers add a quotation per level. The figures describe different populations, so they are never one chart.</p>
  </section>

  <section class="section receipt-row">
    <div>
      <p class="eyebrow">The gift: a receipt</p>
      <p class="caption tight">Every requirement Lyceum counts is an exact sentence from a real posting, with its employer, its dates and its link, counted over a known denominator.</p>
    </div>
    <article class="receipt">
      <p class="receipt-meta" data-ref>Stripe · Data Analyst, Intern · published 2026-10-01</p>
      <blockquote>“You'll build metrics, scalable data pipelines, dashboards, and reports to inform and run the business.”</blockquote>
      <p class="receipt-count" data-claim="deck-receipt"><strong>1 of 9</strong> reviewed postings</p>
      <p class="receipt-link" data-ref>stripe.com/jobs/search?gh_jid=8194291 · retrieved 2026-10-09 · fnv1a-68604535-974</p>
    </article>
  </section>

  <section class="section">
    <p class="eyebrow">The plan: one loop, six steps, every semester</p>
    <ol class="steps">${STEPS.map((s, i) => `<li class="step${s.who ? "" : " people"}"><span class="figure">${s.who ? `<img src="${mascot(s.who)}" alt="">` : PEOPLE_SVG}</span><span class="step-name">${i ? "" : "Setup: "}${s.step}</span><span class="helper">${s.helper}</span><span class="ask">${s.ask}</span></li>`).join("")}</ol>
    <p class="caption">Seven helpers do the work; at Decide there is none, because people decide. Tualang, the host, keeps the loop, and every semester adds a ring.</p>
  </section>
  ${foot(1, "Figures and their sources: docs/claims.md. Dr Aisyah is fictional; the posting is real.")}
</section>`;

const page2 = `<section class="page">
  ${mast}
  <section class="section">
    <p class="eyebrow">The journey, in real screens</p>
    <h2>Each step ends in a record she can hold.</h2>
    <div class="screens r1">
      <figure>${shot("docs/presentation/shot-report-quote.png", 112, "A proposed quotation about dashboards beside the Stripe posting it came from, the matched words marked.", { h: 530 })}<figcaption><b>Report.</b> A quotation is proposed beside its source, and confirmed only if it is there word for word.</figcaption></figure>
      <figure>${shot("docs/presentation/shot-report-card.png", 64, "The dashboards card: postings that quote it over the reviewed postings, with its interval.")}<figcaption><b>Count.</b> Over reviewed postings only, with its interval.</figcaption></figure>
    </div>
    <div class="screens r2">
      <figure>${shot("docs/presentation/shot-decide.png", 88, "The brief, its recipient and the programme owner's decision with its reason, term and course version.")}<figcaption><b>Decide.</b> The programme owner records adopt, with the reason, the term and the version.</figcaption></figure>
      <figure>${shot("docs/presentation/shot-history.png", 88, "The course history: the adopted version with its reason, the earlier version and the decision.")}<figcaption><b>Update.</b> The checked revision, adopted with its reason; the earlier version is kept.</figcaption></figure>
      <figure>${shot("docs/presentation/pack/slide-03.png", 88, "A slide of the teaching pack as PowerPoint renders it, with the dashboards count and an exact quotation.", { h: 560 })}<figcaption><b>Teach.</b> The downloaded pack as PowerPoint draws it: editable, with no model text.</figcaption></figure>
      <figure>${shot("docs/presentation/shot-learn.png", 88, "Learn: the results file filed for the course version taught, with the mean mark per outcome and n of N.")}<figcaption><b>Learn.</b> Results filed for the version taught, with n of N. No learning gain is claimed.</figcaption></figure>
    </div>
    <p class="fine">Real captures of the working prototype in its demo mode, on the dated saved sample of Stripe's public job board.</p>
  </section>

  <section class="section">
    <p class="eyebrow">What is real, and what is not yet</p>
    <div class="real">
      <div class="real-box" data-claim="deck-trl"><div class="num">TRL 6</div><p>Self-assessed against NASA ESTO's software column: “Prototype implementations of the software demonstrated on full-scale realistic problems.” The relevant environment: real postings from a real public board, a sample course outline, a lecturer persona.</p></div>
      <div class="real-box" data-claim="proof-checks"><div class="num">${esc(proof["proof-checks"].value)}</div><p>${esc(proof["proof-checks"].label)}.</p></div>
      <div class="planned-box"><p class="planned-head"><span class="pill planned">Planned</span>Not built yet</p><ul>${NOT_BUILT.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </div>
  </section>
  ${foot(2, "The next level is one department running the loop for one term inside its LMS.")}
</section>`;

const page3 = `<section class="page">
  ${mast}
  <section class="section">
    <p class="eyebrow">The wider world: one core, many doors</p>
    ${shot("docs/presentation/architecture.png", 180, "Lyceum's architecture: people work through doors into one deterministic core; built doors solid, planned doors dashed.")}
    <p class="caption">The web workspace is built, and so is a local, read-only MCP door over an exported workspace, set up for Claude and tested with the official MCP client. The doors for the university's own assistants, its LMS and its office suite are planned. No door confirms a quotation or decides.</p>
  </section>

  <section class="section cols2">
    <div>
      <p class="eyebrow">Why a department pays</p>
      <div class="ladder">
        <div class="tier built-tier"><strong>Free</strong><span class="pill built">Built</span><p>One course on one laptop, no account, the whole loop and every export.</p></div>
        <div class="tier"><strong>Department</strong><span class="pill planned">Planned</span><p>The shared workspace, sign-in, the assistant and LMS doors, the term's review pack.</p></div>
        <div class="tier"><strong>Institution</strong><span class="pill planned">Planned</span><p>Tenancy, audit, the office suite doors and data agreements.</p></div>
      </div>
      <p class="caption">The periodic review happens anyway, and each step is the working form of what reviewers already look for: <span data-ref>AUN-QA 1.4, MQA 6.1.6, ABET Criteria 2 and 4, ESG 1.9</span>, and for Teach the teaching principle of constructive alignment (Biggs).</p>
    </div>
    <div>
      <p class="eyebrow">The organiser's review of <span data-ref>14 October 2026</span>, and what we did</p>
      <ul class="review">${REVIEW.map((r) => `<li><p class="ask"><span class="pill ${r.tone}">${r.status}</span>${esc(r.ask)}</p><p class="resp">${esc(r.response)}</p></li>`).join("")}</ul>
    </div>
  </section>

  <section class="ask-box">
    <img src="${mascot("host", "celebrating")}" alt="">
    <div><p class="ask-eyebrow">The ask</p><p class="ask-line">One department, one term, inside its LMS.</p><p class="ask-measures">The pilot measures task completion, citation fidelity, time to a brief and repeat use: measures, not results yet.</p></div>
  </section>
  ${foot(3, "Prepared by the Lyceum team, Universiti Teknologi PETRONAS.")}
</section>`;

// ---------- the page ----------
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Lyceum, project brief</title>
<style>
${fontFaceCss()}
${rootVarsCss()}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--white); }
body { font-family: var(--font-body); color: var(--ink); font-size: 9pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
img { display: block; }
.page { width: 210mm; height: 297mm; padding: 12mm 15mm 10mm; position: relative; overflow: hidden; page-break-after: always; }
.page:last-child { page-break-after: auto; }
.mast { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.4px solid var(--forest); padding-bottom: 2.4mm; }
.wordmark { display: flex; align-items: center; gap: 2mm; font-family: var(--font-display); font-size: 19pt; font-weight: 600; letter-spacing: -0.01em; line-height: 1; }
.wordmark img { width: 7.5mm; height: 7.5mm; }
.mast-meta { font-family: var(--font-mono); font-size: 7pt; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
h1 { font-family: var(--font-display); font-weight: 600; font-size: 19.5pt; line-height: 1.14; margin: 6mm 0 3mm; letter-spacing: -0.01em; }
h2 { font-family: var(--font-display); font-weight: 600; font-size: 14pt; line-height: 1.2; margin: 0 0 3mm; }
.lede { font-size: 10.2pt; line-height: 1.5; margin: 0; }
.section { margin-top: 5.5mm; }
.eyebrow { font-family: var(--font-mono); font-size: 7pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--emerald-text); margin: 0 0 2mm; }
.caption { font-size: 8.4pt; color: var(--ink-2); margin: 2.4mm 0 0; }
.caption.tight { margin-top: 0; }
.fine { font-size: 7.2pt; color: var(--ink-2); margin: 2mm 0 0; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.5mm; }
.stat { border: 1px solid var(--border); border-radius: 2.6mm; padding: 3.2mm 3.6mm; }
.scope { font-family: var(--font-mono); font-size: 6.6pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); }
.num { font-family: var(--font-display); font-size: 22pt; line-height: 1; margin: 1.4mm 0 1.2mm; color: var(--emerald-text); font-weight: 800; }
.lbl { font-size: 8.2pt; line-height: 1.38; }
.src { font-size: 6.8pt; color: var(--ink-3); margin-top: 1.4mm; }
.receipt-row { display: grid; grid-template-columns: 52mm 1fr; gap: 5mm; align-items: start; }
.receipt { background: var(--tint-1); border-radius: 3mm; padding: 4mm 5mm; }
.receipt-meta, .receipt-link { font-family: var(--font-mono); font-size: 6.8pt; color: var(--ink-2); margin: 0; }
.receipt blockquote { margin: 2mm 0; padding-left: 3mm; border-left: 2px solid var(--emerald); font-size: 11pt; font-weight: 600; line-height: 1.35; }
.receipt-count { margin: 0 0 1.2mm; font-size: 9pt; color: var(--ink-2); }
.receipt-count strong { font-family: var(--font-display); font-size: 18pt; font-weight: 800; color: var(--emerald-text); margin-right: 1.4mm; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(7, 1fr); gap: 2.2mm; }
.step { display: grid; justify-items: center; align-content: start; gap: 0.8mm; text-align: center; border: 1px solid var(--border); border-radius: 2.6mm; padding: 2.6mm 1.6mm 3mm; background: var(--white); }
.step.people { background: var(--tint-1); }
.figure { width: 13mm; height: 13mm; display: grid; place-items: center; }
.figure img { width: 13mm; height: 13mm; }
.figure svg { width: 8mm; height: 8mm; fill: none; stroke: var(--forest); stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.step-name { font-family: var(--font-display); font-size: 10.5pt; font-weight: 600; }
.helper { font-family: var(--font-mono); font-size: 6.2pt; letter-spacing: 0.04em; color: var(--emerald-text); }
.ask { font-size: 7.4pt; line-height: 1.32; color: var(--ink-2); }
.screens { display: grid; gap: 3.5mm 4mm; align-items: start; margin-top: 3.5mm; }
.screens.r1 { grid-template-columns: 112mm 64mm; margin-top: 0; }
.screens.r2 { grid-template-columns: 88mm 88mm; }
.screens figure { margin: 0; }
.shot { overflow: hidden; border: 1px solid var(--border); border-radius: 2mm; background: var(--white); }
.shot img { max-width: none; }
figcaption { font-size: 7.6pt; color: var(--ink-2); margin: 1.4mm 0 0; line-height: 1.38; }
figcaption b { color: var(--ink); font-weight: 700; }
.real { display: grid; grid-template-columns: 1fr 0.8fr 1.1fr; gap: 3.5mm; }
.real-box { background: var(--forest); color: var(--white); border-radius: 2.6mm; padding: 3.4mm 4mm; }
.real-box .num { color: var(--lime); font-size: 20pt; }
.real-box p { margin: 1.4mm 0 0; font-size: 7.8pt; line-height: 1.4; color: var(--on-forest); }
.planned-box { background: var(--warn-soft); border-radius: 2.6mm; padding: 3.2mm 4mm; }
.planned-head { display: flex; align-items: center; gap: 2mm; margin: 0 0 1.4mm; font-weight: 700; font-size: 8.6pt; color: var(--warn); }
.planned-box ul { margin: 0; padding-left: 4mm; } .planned-box li { font-size: 7.8pt; line-height: 1.38; margin: 0.5mm 0; }
.planned-box li::marker { color: var(--warn); }
.pill { display: inline-block; font-family: var(--font-mono); font-size: 6.2pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.5mm 1.8mm; border-radius: 99px; margin-right: 1.6mm; vertical-align: 0.2mm; }
.pill.built { background: var(--tint-2); color: var(--emerald-text); }
.pill.local { background: var(--white); color: var(--emerald-text); border: 1px solid var(--border); }
.pill.planned { background: var(--white); color: var(--warn); }
.ladder .pill.planned, .review .pill.planned { background: var(--warn-soft); }
.cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
.ladder { display: grid; gap: 2mm; }
.tier { border: 1px dashed var(--control-border); border-radius: 2.4mm; padding: 2.4mm 3.2mm; }
.tier.built-tier { border: 1px solid var(--border); border-left: 2.4px solid var(--emerald); }
.tier strong { font-family: var(--font-display); font-size: 10pt; font-weight: 600; margin-right: 2mm; }
.tier p { margin: 0.8mm 0 0; font-size: 7.8pt; color: var(--ink-2); line-height: 1.38; }
.review { list-style: none; margin: 0; padding: 0; display: grid; gap: 2.2mm; }
.review li { border-bottom: 1px solid var(--border); padding-bottom: 2mm; }
.review .ask { margin: 0; font-size: 8pt; color: var(--ink); font-weight: 600; line-height: 1.38; }
.review .resp { margin: 0.8mm 0 0; font-size: 7.8pt; color: var(--ink-2); line-height: 1.38; }
.ask-box { margin-top: 5mm; display: flex; align-items: center; gap: 5mm; background: var(--forest); color: var(--white); border-radius: 3mm; padding: 4mm 6mm; }
.ask-box img { width: 22mm; height: 22mm; background: var(--tint-2); border-radius: 50%; padding: 1.4mm; }
.ask-eyebrow { margin: 0; font-family: var(--font-mono); font-size: 7pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--lime); }
.ask-line { margin: 1mm 0; font-family: var(--font-display); font-size: 15pt; font-weight: 600; line-height: 1.15; }
.ask-measures { margin: 0; font-size: 8.2pt; color: var(--on-forest); }
.foot { position: absolute; left: 15mm; right: 15mm; bottom: 7mm; display: flex; justify-content: space-between; gap: 6mm; font-size: 6.8pt; color: var(--ink-2); border-top: 1px solid var(--border); padding-top: 2mm; }
.page-number { white-space: nowrap; font-family: var(--font-mono); }
</style></head><body>
${page1}
${page2}
${page3}
</body></html>`;

// ---------- render ----------
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!executablePath) throw new Error("Chrome or Edge must be installed");
const browser = await puppeteer.launch({ executablePath, headless: true });
let problems = [];
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await fontsReady(page);
  // Every number registered or a reference; no dash.
  problems = figureProblems(await page.evaluate(readFigures, ".page"), claimsRegister(), "Page");
  // Every page's content must stop at least 2 mm above its footer. A cropped screenshot counts by its frame.
  const space = await page.evaluate(() => [...document.querySelectorAll(".page")].map((p, i) => {
    const limit = p.querySelector(".foot").getBoundingClientRect().top - 2 * 3.7795;
    const bottoms = [...p.querySelectorAll("*")].filter((el) => !el.closest(".foot") && !el.parentElement?.closest(".shot")).map((el) => el.getBoundingClientRect().bottom);
    return { page: i + 1, spareMm: Math.round((limit - Math.max(...bottoms)) / 3.7795 * 10) / 10 };
  }));
  console.log("spare space above each footer, in mm:", JSON.stringify(space));
  for (const s of space) if (s.spareMm < 0) problems.push("Page " + s.page + ": content runs into the footer by " + -s.spareMm + " mm.");
  if (!problems.length) {
    await page.pdf({ path: OUT, format: "A4", printBackground: true, preferCSSPageSize: true });
    console.log("wrote docs/presentation/lyceum-brief.pdf");
  }
  if (PREVIEW_DIR) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    const pages = await page.$$(".page");
    for (let i = 0; i < pages.length; i += 1) await pages[i].screenshot({ path: join(PREVIEW_DIR, "brief-page-" + (i + 1) + ".png") });
    console.log("previews in", PREVIEW_DIR);
  }
} finally { await browser.close(); }
if (problems.length) { console.error("BRIEF CHECK FAILED\n  " + problems.join("\n  ")); process.exit(1); }
console.log("Brief checks passed: every number is in the claims register or a reference, no dash, nothing runs into a footer.");
