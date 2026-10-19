// The project brief as a PDF, for sharing Lyceum with someone who has not seen
// it: the idea and how it works (page 1), where it stands with real screens
// (page 2), and the organizer's review (page 3). The text lives in this file;
// edit it here and run `node scripts/gen-brief-pdf.mjs` (add `--preview <dir>`
// for PNG previews). The screens come from `node scripts/presentation-shots.mjs`.
// Fonts load from Google Fonts when online and fall back to Segoe UI and Georgia.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartColumn, CircleCheck, FileText, Gavel, PenLine, Plug, Presentation, Quote, Search, UserCheck } from "lucide-react";
import puppeteer from "puppeteer-core";

const OUT = "docs/presentation/lyceum-brief.pdf";
const previewAt = process.argv.indexOf("--preview");
const PREVIEW_DIR = previewAt > 0 ? process.argv[previewAt + 1] : null;

const C = { ink: "#191c1f", ink2: "#55595e", ink3: "#62676d", accent: "#3b5bdb", accentSoft: "#edf0fc", ok: "#1f7a4d", okSoft: "#e7f3ec", warn: "#925108", warnSoft: "#fcf0e0", border: "#e4e4e0", bg: "#f7f7f5", surface2: "#f1f1ee" };
const icon = (Icon, color = C.accent, size = 15) => renderToStaticMarkup(createElement(Icon, { size, color, strokeWidth: 1.75, "aria-hidden": true }));

// Real screens, cropped in CSS. Coordinates are in the PNG's own pixels.
const png = (file) => { const b = readFileSync(file); return { src: "data:image/png;base64," + b.toString("base64"), w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const shot = (img, area, boxW, alt) => {
  const { x = 0, y = 0, w = img.w, h = img.h } = area, s = boxW / w;
  return `<div class="shot" style="width:${boxW}mm;height:${(h * s).toFixed(2)}mm"><img alt="${alt}" src="${img.src}" style="width:${(img.w * s).toFixed(2)}mm;margin-left:${(-x * s).toFixed(2)}mm;margin-top:${(-y * s).toFixed(2)}mm"></div>`;
};
const SHOTS = {
  journey: png("docs/presentation/shot-studio-journey.png"),
  evidence: png("docs/presentation/shot-evidence-table.png"),
  agents: png("docs/presentation/shot-agents.png"),
};

// ---------- the content ----------
const STATS = [
  { scope: "Malaysia", num: "32.2%", label: "of graduates worked below their qualification in 2024, while graduate unemployment was only 3.2%", src: "DOSM, Graduates Statistics 2024" },
  { scope: "Asia Pacific", num: "77%", label: "of employers can't find the skills they need, up from 45% in 2014", src: "ManpowerGroup, Talent Shortage 2025 (10,095 employers surveyed)" },
  { scope: "World", num: "39%", label: "of workers' skills are expected to change or become outdated by 2030", src: "World Economic Forum, Future of Jobs Report 2025" },
];
const STEPS = [
  { n: 1, title: "Watch", agent: "Scout", icon: Search, text: "Collects job postings from employer websites for the roles your graduates apply to." },
  { n: 2, title: "Report", agent: "Lens and Steward", icon: FileText, text: "Counts what employers ask for, keeps the exact quote behind every number, and drafts a report you can escalate." },
  { n: 3, title: "Decide", agent: "You and your committee", icon: Gavel, human: true, text: "Your coordinator or programme meeting decides. A proposed change can be tried on a mock cohort of simulated students first." },
  { n: 4, title: "Update", agent: "Quill", icon: PenLine, text: "Once a change is approved, helps you revise the outcomes and topics, checked against teaching hours and prerequisites." },
  { n: 5, title: "Teach", agent: "Prism", icon: Presentation, text: "Builds editable slides, test questions and quizzes that fit each Course Learning Outcome." },
  { n: 6, title: "Learn", agent: "Lens", icon: ChartColumn, text: "After the test, the results and the SSRT and CLO surveys flow back in for the next round." },
];
const DIFFERENT = [
  { icon: Plug, title: "Fits the tools you already use", status: "Planned", text: "Lyceum isn't one more app to log into. It is built to sit inside Microsoft 365 and Teams, Google Workspace, the LMS and the university's own AI assistant, through MCP and extensions." },
  { icon: Quote, title: "Every number has a receipt", status: "Working", text: "Each requirement is an exact quote from a real job posting, and every count shows what it is out of, so any number can be traced back to its source." },
  { icon: UserCheck, title: "The lecturer stays in charge", status: "Working", text: "Agents gather, draft and check. People decide, and the university's own approval process stays in control." },
];
const WORKING = [
  "Pulls real job postings from employer job boards (Greenhouse and Lever) when the lecturer asks",
  "Checks every quote against its source and counts honestly",
  "Prepares the report and sends it to a colleague inside the app",
  "Updates the course outline, checked against hours and prerequisites",
  "Exports editable PowerPoint slide packs and drafts template quiz items against the CLOs",
  "160 automated checks pass on the current code",
];
const TO_BUILD = [
  "Watching on a schedule (today it runs when asked)",
  "The MCP, Microsoft 365, Google and LMS plug-ins",
  "AI-drafted test questions and quizzes",
  "A mock cohort benchmarked against real survey results",
  "Mascots and personas for the agents",
];
const IMPROVE = [
  { title: "Less wordy, more visual", ask: "Give each agent a mascot and a living persona, with some gamification.", response: "Mascot art for our seven agents, which already have names and jobs, with moods that follow real work: working, waiting for you, done." },
  { title: "Research the problem beyond Malaysia", ask: "At least at Asia level, and globally if possible, to show that universities everywhere face it.", response: "A first pass with Malaysian, Asian and global sources is done. Next come interviews with lecturers in a few Asian countries." },
  { title: "Make the app and the pitch tally", ask: "The flow of the app and the flow of the presentation should match, so the story runs smoothly.", response: "One storyline, the six steps on page 1, used in the same order by the app, the demo and the slides." },
  { title: "Benchmark the mock cohort", ask: "The agent that simulates a cohort needs a benchmark. Use the SSRT and CLO surveys we collect every semester.", response: "Lock the agent's predictions before a semester starts, then score them against that semester's CLO survey and results." },
];

// ---------- the loop diagram (all units in mm) ----------
const CW = 52, CH = 39, GX = 12, GY = 11;
const POS = { 1: [0, 0], 2: [CW + GX, 0], 3: [2 * (CW + GX), 0], 4: [2 * (CW + GX), CH + GY], 5: [CW + GX, CH + GY], 6: [0, CH + GY] };
const W = 3 * CW + 2 * GX, H = 2 * CH + GY;
const midY1 = CH / 2, midY2 = CH + GY + CH / 2, col = (i) => i * (CW + GX) + CW / 2;
const ARROWS = [
  [CW + 1.2, midY1, CW + GX - 1.6, midY1], [2 * CW + GX + 1.2, midY1, 2 * (CW + GX) - 1.6, midY1],
  [col(2), CH + 1.2, col(2), CH + GY - 1.6],
  [2 * (CW + GX) - 1.2, midY2, 2 * CW + GX + 1.6, midY2], [CW + GX - 1.2, midY2, CW + 1.6, midY2],
  [col(0), CH + GY - 1.2, col(0), CH + 1.6],
];
const loopSvg = `<svg class="loop-arrows" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" aria-hidden="true">
  <defs><marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.accent}"/></marker></defs>
  ${ARROWS.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.accent}" stroke-width="0.55" marker-end="url(#head)"/>`).join("")}
  <text x="${col(0) + 3}" y="${CH + GY / 2 + 1}" font-size="2.9" fill="${C.ink2}" font-family="Inter, Segoe UI, sans-serif">and round again, every semester</text>
</svg>`;
const stepCard = (s) => { const [x, y] = POS[s.n]; return `<div class="step${s.human ? " human" : ""}" style="left:${x}mm;top:${y}mm">
  <div class="step-head"><span class="badge">${s.n}</span><span class="step-icon">${icon(s.icon, s.human ? C.ok : C.accent, 14)}</span><span class="step-title">${s.title}</span></div>
  <div class="agent">${s.agent}</div><p>${s.text}</p></div>`; };

const PAGES = 3;
const mast = `<div class="mast"><span class="wordmark">Lyceum</span><span class="mast-meta">Project brief · October 2026</span></div>`;
const foot = (n, left) => `<div class="foot"><span>${left}</span><span>${n} / ${PAGES}</span></div>`;

// ---------- the page ----------
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Lyceum, project brief</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: Inter, "Segoe UI", system-ui, sans-serif; color: ${C.ink}; font-size: 9.2pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; height: 297mm; padding: 13mm 15mm 10mm; position: relative; overflow: hidden; page-break-after: always; }
.page:last-child { page-break-after: auto; }
.mast { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.4px solid ${C.ink}; padding-bottom: 2.5mm; }
.wordmark { font-family: Newsreader, Georgia, serif; font-size: 21pt; font-weight: 600; letter-spacing: -0.01em; line-height: 1; }
.mast-meta { font-size: 7.4pt; color: ${C.ink2}; text-transform: uppercase; letter-spacing: 0.09em; font-weight: 600; }
h1 { font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: 22.5pt; line-height: 1.12; margin: 6.5mm 0 3mm; letter-spacing: -0.01em; max-width: 168mm; }
.lede { font-size: 10.6pt; line-height: 1.52; margin: 0; max-width: 176mm; }
.section { margin-top: 6.5mm; }
.eyebrow { font-size: 7.2pt; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase; color: ${C.accent}; margin: 0 0 2mm; }
h2 { font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: 14.5pt; line-height: 1.2; margin: 0 0 3mm; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
.stat { border: 1px solid ${C.border}; border-radius: 2.6mm; padding: 3.4mm 3.8mm; }
.stat .scope { font-size: 6.8pt; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${C.ink2}; }
.stat .num { font-family: Newsreader, Georgia, serif; font-size: 25pt; line-height: 1; margin: 1.6mm 0 1.4mm; color: ${C.accent}; font-weight: 500; }
.stat .lbl { font-size: 8.4pt; line-height: 1.4; }
.stat .src { font-size: 6.8pt; color: ${C.ink3}; margin-top: 1.6mm; }
.caption { font-size: 8.6pt; color: ${C.ink2}; margin: 2.6mm 0 0; max-width: 176mm; }
.loop { position: relative; width: ${W}mm; height: ${H}mm; margin-top: 1mm; }
.loop-arrows { position: absolute; left: 0; top: 0; }
.step { position: absolute; width: ${CW}mm; height: ${CH}mm; border: 1px solid ${C.border}; border-radius: 2.6mm; padding: 3mm 3.4mm; background: #fff; }
.step.human { background: ${C.okSoft}; border-color: #bfdccb; }
.step-head { display: flex; align-items: center; gap: 2mm; }
.badge { width: 4.6mm; height: 4.6mm; border-radius: 50%; background: ${C.ink}; color: #fff; font-size: 7pt; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-icon { width: 6.6mm; height: 6.6mm; border-radius: 1.8mm; background: ${C.accentSoft}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step.human .step-icon { background: #fff; }
.step-title { font-weight: 700; font-size: 10.4pt; }
.agent { margin: 1.6mm 0 1mm; font-size: 6.9pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.ink2}; }
.step p { margin: 0; font-size: 8.3pt; line-height: 1.4; }
.agents-note { font-size: 8.6pt; color: ${C.ink2}; margin: 3.4mm 0 0; max-width: 178mm; }
.agents-note strong { color: ${C.ink}; font-weight: 600; }
.foot { position: absolute; left: 15mm; right: 15mm; bottom: 8mm; display: flex; justify-content: space-between; gap: 6mm; font-size: 6.8pt; color: ${C.ink3}; border-top: 1px solid ${C.border}; padding-top: 2mm; }
.foot span:last-child { white-space: nowrap; }
.cols3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
.diff { border: 1px solid ${C.border}; border-radius: 2.6mm; padding: 3.4mm 3.8mm; }
.diff-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.8mm; }
.diff-title { font-weight: 700; font-size: 9.4pt; margin: 0 0 1.2mm; }
.diff p { margin: 0; font-size: 8.3pt; line-height: 1.42; }
.pill { font-size: 6.6pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.7mm 2mm; border-radius: 99px; }
.pill.ok { background: ${C.okSoft}; color: ${C.ok}; } .pill.plan { background: ${C.warnSoft}; color: ${C.warn}; }
.cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.box { border-radius: 2.6mm; padding: 3.4mm 4mm; }
.box.ok { background: ${C.okSoft}; } .box.todo { background: ${C.surface2}; }
.box h3 { margin: 0 0 1.8mm; font-size: 8.6pt; font-weight: 700; }
.box ul { margin: 0; padding-left: 4mm; } .box li { font-size: 8.3pt; line-height: 1.4; margin: 0.6mm 0; }
.shot { overflow: hidden; border: 1px solid ${C.border}; border-radius: 2mm; background: ${C.bg}; }
.shot img { display: block; max-width: none; }
.shot-cap { font-size: 7.8pt; color: ${C.ink2}; margin: 1.6mm 0 0; line-height: 1.4; }
.shot-cap b { color: ${C.ink}; font-weight: 600; }
.shots-row { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 4mm; align-items: start; }
.fine { font-size: 7.2pt; color: ${C.ink3}; margin: 3mm 0 0; }
.context { font-size: 10pt; line-height: 1.55; margin: 0 0 5mm; max-width: 178mm; }
.sub { font-size: 7.4pt; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase; color: ${C.ink2}; margin: 0 0 2.6mm; }
.landed { display: grid; grid-template-columns: 1fr 2.1fr; gap: 5mm; margin-bottom: 6mm; }
.quote { border-left: 2.6px solid ${C.ok}; padding: 0.6mm 0 0.6mm 3.6mm; font-size: 9.2pt; line-height: 1.5; }
.quote strong { display: block; font-size: 9.8pt; margin-bottom: 1mm; }
.improve { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.imp { border: 1px solid ${C.border}; border-radius: 2.6mm; padding: 3.8mm 4.2mm; }
.imp-head { display: flex; align-items: center; gap: 2.2mm; margin-bottom: 1.8mm; }
.imp-head strong { font-size: 10pt; }
.imp p { margin: 0; font-size: 9pt; line-height: 1.48; }
.imp .resp { margin-top: 2.4mm; padding-top: 2.2mm; border-top: 1px dashed ${C.border}; color: ${C.ink2}; }
.imp .resp b { color: ${C.accent}; font-weight: 700; }
.outcome { margin-top: 6mm; display: flex; align-items: center; gap: 3.4mm; background: ${C.ink}; color: #fff; border-radius: 2.6mm; padding: 4.4mm 5mm; font-size: 10.2pt; line-height: 1.5; }
.outcome strong { font-weight: 700; }
</style></head><body>

<section class="page">
  ${mast}
  <h1>Lyceum helps lecturers keep their courses in step with what industry needs.</h1>
  <p class="lede">It is an assistant for university lecturers. A small team of AI agents keeps watch over each subject: they gather what employers are asking for from job sites, report what has changed, and, once a change is approved, help the lecturer update the course and build what is needed to teach it, from slides to test questions and quizzes that fit the Course Learning Outcomes (CLOs). After the test, the results come back in, so the next review starts from evidence instead of guesswork.</p>

  <div class="section">
    <p class="eyebrow">Why it matters</p>
    <div class="stats">${STATS.map((s) => `<div class="stat"><div class="scope">${s.scope}</div><div class="num">${s.num}</div><div class="lbl">${s.label}</div><div class="src">${s.src}</div></div>`).join("")}</div>
    <p class="caption">Graduates are finding jobs. The problem is the match between what they learned and what the job asks for. Courses are reviewed only every few years, and the evidence behind a review usually sits in browser tabs and people's memory.</p>
  </div>

  <div class="section">
    <p class="eyebrow">How it works</p>
    <h2>One loop, six steps, and people decide</h2>
    <div class="loop">${loopSvg}${STEPS.map(stepCard).join("")}</div>
    <p class="agents-note">Seven agents share the work, each with a name and a job: <strong>Folio</strong> reads the course, <strong>Scout</strong> watches industry, <strong>Atlas</strong> maps skills to outcomes, <strong>Lens</strong> counts, <strong>Quill</strong> designs, <strong>Prism</strong> makes the materials and <strong>Steward</strong> prepares the review. Nothing changes a course until a person approves it.</p>
  </div>
  ${foot(1, "Sources: DOSM, Graduates Statistics 2024; ManpowerGroup, Talent Shortage 2025, Asia Pacific; World Economic Forum, Future of Jobs Report 2025.")}
</section>

<section class="page">
  ${mast}
  <div class="section">
    <p class="eyebrow">What makes it different</p>
    <div class="cols3">${DIFFERENT.map((d) => `<div class="diff"><div class="diff-head">${icon(d.icon, C.accent, 16)}<span class="pill ${d.status === "Working" ? "ok" : "plan"}">${d.status}</span></div><p class="diff-title">${d.title}</p><p>${d.text}</p></div>`).join("")}</div>
  </div>

  <div class="section">
    <p class="eyebrow">Where it stands today</p>
    <div class="cols2">
      <div class="box ok"><h3>Working now, as a local prototype</h3><ul>${WORKING.map((w) => `<li>${w}</li>`).join("")}</ul></div>
      <div class="box todo"><h3>Still to build</h3><ul>${TO_BUILD.map((w) => `<li>${w}</li>`).join("")}</ul></div>
    </div>
  </div>

  <div class="section">
    <p class="eyebrow">What it looks like</p>
    ${shot(SHOTS.journey, { x: 520, y: 250, w: 2310, h: 600 }, 180, "The CS310 course workspace with its guided steps all ticked off")}
    <p class="shot-cap"><b>The course workspace.</b> Its guided steps tick off only when the real work behind them is saved. They will be renamed to match the six-step loop on page 1, which is one of the review's points.</p>
    <div class="shots-row">
      <div>${shot(SHOTS.evidence, { x: 30, y: 225, w: 1260, h: 340 }, 88, "Bars showing how many reviewed job postings ask for each skill")}
        <p class="shot-cap"><b>The report.</b> How many of the reviewed postings ask for each skill. The thin line under each bar shows the uncertainty range.</p></div>
      <div>${shot(SHOTS.agents, {}, 88, "The seven agent cards: Folio, Scout, Atlas, Quill, Prism, Lens and Steward")}
        <p class="shot-cap"><b>The seven agents.</b> Each card opens to show what the agent reads, produces and cannot do. Mascots and personalities come next.</p></div>
    </div>
    <p class="fine">Real captures of the working prototype, filled by its built-in demo with a saved sample of real job postings.</p>
  </div>
  ${foot(2, "Lyceum runs today as a local prototype. Everything under Still to build is in the project's improvement plan.")}
</section>

<section class="page">
  ${mast}
  <div class="section">
    <p class="eyebrow">Review</p>
    <h2>Comments from Cai Yiyu</h2>
    <p class="context">Cai Yiyu is the organizer who approves the travel fellowships, and had already approved another team's. For ours to be approved as well, I presented Lyceum so Cai Yiyu could judge whether the project was worth sponsoring. These were the comments.</p>
    <p class="sub">What landed well</p>
    <div class="landed">
      <div class="quote"><strong>Solid, clear, on theme</strong>The idea is solid and clear, and it fits the theme.</div>
      <div class="quote"><strong>The platform answer</strong>Asked why a lecturer would pick Lyceum over other apps, especially when they already juggle too many tools, I said we are not selling one more separate tool. Lyceum is a platform that fits into any university's existing ecosystem, through MCP and extensions for Microsoft 365, Google and the AI tools they already use. Cai Yiyu liked the concept. It isn't built yet, so it is now a committed work package in our improvement plan.</div>
    </div>
    <p class="sub">What to improve, and our response</p>
    <div class="improve">${IMPROVE.map((m, i) => `<div class="imp"><div class="imp-head"><span class="badge">${i + 1}</span><strong>${m.title}</strong></div><p>${m.ask}</p><p class="resp"><b>Our response:</b> ${m.response}</p></div>`).join("")}</div>
    <div class="outcome">${icon(CircleCheck, "#ffffff", 20)}<span><strong>Outcome.</strong> Overall, the idea is clear and fits the theme. The travel fellowship is on: Cai Yiyu applied for it on our behalf.</span></div>
  </div>
  ${foot(3, "Prepared by Hafiz Azman, 14 October 2026.")}
</section>
</body></html>`;

// ---------- render ----------
const executablePath = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
if (!executablePath) throw new Error("Chrome or Edge must be installed");
writeFileSync(join(tmpdir(), "lyceum-brief.html"), html);
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 }).catch(() => page.setContent(html, { waitUntil: "load" }));
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i));
  console.log("fonts loaded:", fonts.join(", ") || "none (system fallbacks used)");
  // Every page's content must stop at least 2 mm above its footer. A cropped
  // screenshot counts by its frame, not by the hidden part of its image.
  const space = await page.evaluate(() => [...document.querySelectorAll(".page")].map((p, i) => {
    const limit = p.querySelector(".foot").getBoundingClientRect().top - 2 * 3.7795;
    const bottoms = [...p.querySelectorAll("*")].filter((el) => !el.closest(".foot") && !el.parentElement?.closest(".shot")).map((el) => el.getBoundingClientRect().bottom);
    return { page: i + 1, spareMm: Math.round((limit - Math.max(...bottoms)) / 3.7795 * 10) / 10 };
  }));
  console.log("spare space above each footer, in mm:", JSON.stringify(space));
  if (space.some((s) => s.spareMm < 0)) { console.error("content runs into a footer; shorten the text or tighten the layout"); process.exitCode = 1; }
  await page.pdf({ path: OUT, format: "A4", printBackground: true, preferCSSPageSize: true });
  console.log("wrote", OUT);
  if (PREVIEW_DIR) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    const pages = await page.$$(".page");
    for (let i = 0; i < pages.length; i += 1) await pages[i].screenshot({ path: join(PREVIEW_DIR, "brief-page-" + (i + 1) + ".png") });
    console.log("previews in", PREVIEW_DIR);
  }
} finally { await browser.close(); }
