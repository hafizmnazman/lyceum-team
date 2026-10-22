// The booth poster (plan Sections 4.1 and 15): one A1 sheet, landscape, so the
// 16:9 architecture diagram stays legible from a metre away. It carries beats 1
// to 4 across the top (the person, why now, the receipt, the loop with the
// mascots) and 6 to 8 below (the doors, what is real, the ask), on the tokens and
// the bundled faces, every number registered in docs/claims.md as on the deck.
// The QR code goes to the public landing page (https://lyceum-rho.vercel.app/#/index):
// docs/presentation/qr-landing.png, or another image passed with `--qr <png>`; without
// either, its slot says planned.
// Run `node scripts/gen-poster.mjs` (add `--preview <dir>` for a PNG preview).
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import puppeteer from "puppeteer-core";
import { ROOT, fontFaceCss, fontsReady, rootVarsCss } from "./lib/theme-node.mjs";
import { claimsRegister, figureProblems, readFigures } from "./lib/claims-node.mjs";
import { architectureSvg } from "./gen-architecture.mjs"; // the diagram carries the ownership line for its marks
import { PROOF } from "../src/data/proof.ts";

const OUT = join(ROOT, "docs/presentation/poster-a1.pdf");
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const PREVIEW_DIR = arg("--preview");
const SAVED_QR = join(ROOT, "docs/presentation/qr-landing.png");
const QR = arg("--qr") ?? (existsSync(SAVED_QR) ? SAVED_QR : null);
const W = 841, H = 594; // A1 landscape, in mm

const dataUri = (file, type) => "data:" + type + ";base64," + readFileSync(isAbsolute(file) ? file : join(ROOT, file)).toString("base64");
const mascot = (who, pose = "resting") => dataUri("public/brand/mascots/" + who + "-" + pose + ".svg", "image/svg+xml");
const checks = PROOF.find((p) => p.claim === "proof-checks");
const STATIONS = [
  ["folio", "Course", "Folio reads the outline"], ["scout", "Watch", "Scout fetches, on request"], ["atlas", "Report", "Atlas quotes and maps"],
  ["lens", "Report", "Lens counts, with n"], ["steward", "Report", "Steward prepares the brief"], [null, "Decide", "People decide"],
  ["quill", "Update", "Quill checks the revision"], ["prism", "Teach", "Prism builds the pack"], ["lens", "Learn", "Lens reads the results, n of N"],
];
const PEOPLE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`;
/** The refused paraphrase from scripts/presentation-shots.mjs, cropped to the excerpt and the refusal, at a width in mm. */
function paraphrase(widthMm) {
  const b = readFileSync(join(ROOT, "docs/presentation/shot-report-paraphrase.png")), w = b.readUInt32BE(16), y = 404, h = 398, s = widthMm / w;
  return `<div class="frame" style="width:${widthMm}mm;height:${(h * s).toFixed(2)}mm"><img alt="A quotation typed by hand, experience with Python, refused because the words are not in the saved source text." src="data:image/png;base64,${b.toString("base64")}" style="width:${widthMm}mm;margin-top:${(-y * s).toFixed(2)}mm"></div>`;
}
const cells = (n, on, cls) => Array.from({ length: n }, (_, i) => `<i class="${i < on ? cls : ""}"></i>`).join("");
const qrSlot = QR
  ? `<div class="qr"><img src="${dataUri(resolve(QR), "image/png")}" alt="A QR code to Lyceum's public landing page"><span>The landing page</span></div>`
  : `<div class="qr planned-slot"><span class="pill planned">Planned</span><span>A QR code to the public landing page, once it is deployed</span></div>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Lyceum, the poster</title>
<style>
${fontFaceCss()}
${rootVarsCss()}
@page { size: ${W}mm ${H}mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--mint); }
body { font-family: var(--font-body); color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
img { display: block; }
.poster { position: relative; width: ${W}mm; height: ${H}mm; overflow: hidden; background: var(--mint); background-image: radial-gradient(circle at center, var(--dots) 0.5mm, transparent 0.62mm); background-size: 7mm 7mm; }
.band { position: absolute; left: 0; top: 0; width: ${W}mm; height: 92mm; background: var(--forest); color: var(--white); padding: 12mm 20mm 0; display: grid; grid-template-columns: 1fr 70mm; gap: 12mm; }
.wordmark { display: flex; align-items: center; gap: 4mm; font-family: var(--font-display); font-size: 34pt; font-weight: 600; letter-spacing: -0.01em; }
.wordmark img { width: 14mm; height: 14mm; }
.sentence { margin: 4mm 0 0; font-family: var(--font-display); font-size: 44pt; font-weight: 600; line-height: 1.12; letter-spacing: -0.01em; max-width: 690mm; }
.host { display: grid; justify-items: center; align-content: start; gap: 2mm; }
.host .badge { width: 58mm; height: 58mm; border-radius: 50%; background: var(--tint-2); display: grid; place-items: center; }
.host .badge img { width: 46mm; height: 46mm; }
.host span { font-family: var(--font-mono); font-size: 11pt; color: var(--on-forest); }
.row1 { position: absolute; left: 20mm; top: 106mm; width: 801mm; height: 194mm; display: grid; grid-template-columns: 252mm 236mm 281mm; gap: 16mm; }
.row2 { position: absolute; left: 20mm; top: 314mm; width: 801mm; height: 255mm; display: grid; grid-template-columns: 452mm 333mm; gap: 16mm; }
.card { background: var(--white); border: 0.3mm solid var(--border); border-radius: 6mm; padding: 7mm 8mm; }
.eyebrow { margin: 0 0 3mm; font-family: var(--font-mono); font-size: 11pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--emerald-text); }
.head { margin: 0 0 3mm; font-family: var(--font-display); font-size: 25pt; font-weight: 600; line-height: 1.12; }
.text { margin: 0; font-size: 14.5pt; line-height: 1.42; color: var(--ink-2); }
.latency { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 7mm; }
.fig .num { font-family: var(--font-display); font-weight: 800; font-size: 42pt; line-height: 1; color: var(--emerald-text); }
.fig .num small { font-size: 16pt; font-weight: 600; }
.fig p { margin: 1.6mm 0 3mm; font-size: 12.5pt; line-height: 1.3; color: var(--ink-2); }
.calendar { display: grid; grid-template-columns: repeat(9, 1fr); gap: 1.6mm; }
.calendar i { height: 9mm; border-radius: 1.6mm; border: 0.6mm solid var(--emerald); }
.calendar i.on { background: var(--emerald); }
.waffle { display: grid; grid-template-columns: repeat(20, 1fr); gap: 0.9mm; }
.waffle i { aspect-ratio: 1; border-radius: 0.8mm; border: 0.4mm solid var(--next-dashed); }
.waffle i.on { background: var(--emerald); border-color: var(--emerald); }
.caveat { margin: 6mm 0 0; font-size: 12.5pt; color: var(--ink-2); }
.sources { margin: 2mm 0 0; font-family: var(--font-mono); font-size: 9.5pt; color: var(--ink-2); }
.receipt { margin-top: 2mm; background: var(--tint-1); border-radius: 5mm; padding: 7mm 8mm; }
.receipt .meta, .receipt .link { margin: 0; font-family: var(--font-mono); font-size: 9.5pt; color: var(--ink-2); line-height: 1.4; }
.receipt blockquote { margin: 4mm 0; padding-left: 5mm; border-left: 1.2mm solid var(--emerald); font-size: 21pt; font-weight: 600; line-height: 1.3; }
.receipt .count { display: flex; align-items: baseline; gap: 3mm; margin: 0 0 3mm; padding-top: 4mm; border-top: 0.3mm solid var(--border); font-size: 14pt; color: var(--ink-2); }
.receipt .count strong { font-family: var(--font-display); font-weight: 800; font-size: 40pt; color: var(--emerald-text); }
.ring { position: relative; width: 214mm; height: 158mm; margin: 0 auto; } /* wider than tall, so nine stations clear each other */
.ring svg.track { position: absolute; inset: 0; }
.ring .t { fill: none; stroke: var(--tint-2); stroke-width: 4.2; }
.ring .p { fill: none; stroke: var(--emerald); stroke-width: 0.9; }
.ring .centre { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: grid; justify-items: center; gap: 1mm; text-align: center; }
.ring .centre img { width: 34mm; height: 34mm; }
.ring .centre span { font-family: var(--font-mono); font-size: 9pt; color: var(--ink-2); }
.station { --a: calc(-90deg + var(--i) * 40deg); position: absolute; left: calc(50% + cos(var(--a)) * 80mm); top: calc(50% + sin(var(--a)) * 60mm); width: 54mm; transform: translate(-50%, -50%); display: grid; justify-items: center; gap: 0.6mm; text-align: center; }
.station img, .station .people { width: 17mm; height: 17mm; }
.station .people { display: grid; place-items: center; border-radius: 50%; background: var(--tint-2); }
.station .people svg { width: 10mm; height: 10mm; fill: none; stroke: var(--forest); stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.station strong, .station em { padding: 0 1.6mm; border-radius: 1.4mm; background: var(--white); }
.station strong { font-family: var(--font-display); font-size: 13pt; font-weight: 600; }
.station em { font-style: normal; font-size: 8.5pt; color: var(--ink-2); }
.loop-card .text { text-align: center; margin-top: 1mm; }
.arch { padding: 0; overflow: hidden; border: 0; }
.shot { margin: 5mm 0 0; }
.shot .frame { overflow: hidden; border: 0.3mm solid var(--border); border-radius: 3mm; background: var(--white); }
.shot img { max-width: none; }
.shot figcaption { margin: 2mm 0 0; font-size: 12pt; color: var(--ink-2); }
.arch svg { display: block; width: 452mm; height: auto; }
.side { display: grid; grid-template-rows: auto 1fr; gap: 10mm; }
.real { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.real-box { background: var(--forest); color: var(--white); border-radius: 5mm; padding: 6mm 7mm; }
.real-box .num { font-family: var(--font-display); font-weight: 800; font-size: 36pt; line-height: 1; }
.real-box .num.lime { color: var(--lime); }
.real-box p { margin: 2mm 0 0; font-size: 12pt; line-height: 1.38; color: var(--on-forest); }
.planned-box { grid-column: 1 / span 2; background: var(--warn-soft); border-radius: 5mm; padding: 5mm 7mm; }
.planned-box p { margin: 0 0 1.6mm; display: flex; align-items: center; gap: 3mm; font-weight: 700; font-size: 12pt; color: var(--warn); }
.planned-box ul { margin: 0; padding-left: 6mm; columns: 2; column-gap: 8mm; }
.planned-box li { font-size: 12pt; line-height: 1.4; }
.planned-box li::marker { color: var(--warn); }
.pill { display: inline-block; font-family: var(--font-mono); font-size: 8.5pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.8mm 3mm; border-radius: 99px; }
.pill.planned { background: var(--white); color: var(--warn); }
.ask { display: grid; grid-template-columns: 1fr 64mm; gap: 7mm; align-items: center; background: var(--forest); color: var(--white); border-radius: 6mm; padding: 8mm 9mm; }
.ask .eyebrow { color: var(--lime); }
.ask .line { margin: 0; font-family: var(--font-display); font-size: 34pt; font-weight: 600; line-height: 1.1; }
.ask .measures { margin: 4mm 0 0; font-size: 14pt; line-height: 1.4; color: var(--on-forest); }
.ask .closing { margin: 8mm 0 0; font-family: var(--font-display); font-weight: 800; font-size: 34pt; color: var(--lime); }
.qr { display: grid; justify-items: center; gap: 2mm; text-align: center; font-size: 11pt; color: var(--on-forest); }
.qr img { width: 56mm; height: 56mm; background: var(--white); border-radius: 3mm; padding: 3mm; }
.planned-slot { min-height: 56mm; align-content: center; padding: 4mm; border-radius: 4mm; border: 0.5mm dashed var(--on-forest); }
.foot { position: absolute; left: 20mm; right: 20mm; bottom: 8mm; display: flex; justify-content: space-between; gap: 10mm; font-family: var(--font-mono); font-size: 8.5pt; color: var(--ink-2); }
</style></head><body>
<main class="poster">
  <header class="band">
    <div>
      <div class="wordmark"><img src="${dataUri("public/brand/mark-white.svg", "image/svg+xml")}" alt="">Lyceum</div>
      <p class="sentence">Lyceum turns real job postings into a course decision with receipts, every semester, inside the tools lecturers already use.</p>
    </div>
    <div class="host"><div class="badge"><img src="${mascot("host", "greeting")}" alt="Tualang, Lyceum's host, greeting"></div><span>Tualang, the host</span></div>
  </header>

  <section class="row1">
    <div class="card">
      <p class="eyebrow">Who it lands on</p>
      <p class="head">She can suggest a change. She cannot show why.</p>
      <p class="text">Dr Aisyah, a fictional lecturer, is asked after class what her course should change before the next review. Her evidence sits in browser tabs and in memory.</p>
      <p class="eyebrow" style="margin-top: 7mm">Why now</p>
      <div class="latency">
        <div class="fig" data-claim="world-skills-and-approval"><div class="num">12 to 18 <small>months</small></div><p>to approve a new degree programme, at the US universities cited</p><div class="calendar">${cells(18, 12, "on")}</div></div>
        <div class="fig" data-claim="world-skills-and-approval"><div class="num">39%</div><p>of workers' skills that employers expect to be transformed or outdated, 2025 to 2030</p><div class="waffle">${cells(100, 39, "on")}</div></div>
      </div>
      <p class="caveat">Different measures of different populations, so never one chart.</p>
      <p class="sources" data-ref>World Economic Forum, Future of Jobs Report 2025; Wayne State and Texas Tech approval pages.</p>
    </div>

    <div class="card">
      <p class="eyebrow">The gift: a receipt</p>
      <p class="head">An exact sentence, counted over a known denominator.</p>
      <article class="receipt">
        <p class="meta" data-ref>Stripe · Data Analyst, Intern · published 2026-10-01</p>
        <blockquote>“You'll build metrics, scalable data pipelines, dashboards, and reports to inform and run the business.”</blockquote>
        <p class="count" data-claim="deck-receipt"><strong>1 of 9</strong> reviewed postings</p>
        <p class="link" data-ref>stripe.com/jobs/search?gh_jid=8194291 · retrieved 2026-10-09 · fnv1a-68604535-974</p>
      </article>
      <figure class="shot">${paraphrase(196)}<figcaption>A paraphrase, refused before it is stored. Nothing invented, nothing pasted.</figcaption></figure>
    </div>

    <div class="card loop-card">
      <p class="eyebrow">The plan: one loop, six steps, every semester</p>
      <div class="ring">
        <svg class="track" viewBox="0 0 214 158" aria-hidden="true"><ellipse class="t" cx="107" cy="79" rx="80" ry="60"/><ellipse class="p" cx="107" cy="79" rx="80" ry="60"/></svg>
        <div class="centre"><img src="${mascot("host")}" alt=""><span>Tualang, the host</span></div>
        ${STATIONS.map(([who, step, does], i) => `<div class="station" style="--i:${i}">${who ? `<img src="${mascot(who)}" alt="">` : `<span class="people">${PEOPLE_SVG}</span>`}<strong>${step}</strong><em>${does}</em></div>`).join("")}
      </div>
      <p class="text">Seven helpers do the work. People decide.</p>
    </div>
  </section>

  <section class="row2">
    <div class="card arch">${architectureSvg().replace(/^<svg /, '<svg class="arch-svg" ')}</div>
    <div class="side">
      <div class="card">
        <p class="eyebrow">What is real, and what is not yet</p>
        <div class="real">
          <div class="real-box" data-claim="deck-trl"><div class="num lime">TRL 6</div><p>Self-assessed against NASA ESTO's software column: “Prototype implementations of the software demonstrated on full-scale realistic problems.” On real postings from a real public board, a sample course outline and a lecturer persona.</p></div>
          <div class="real-box" data-claim="proof-checks"><div class="num">${checks.value}</div><p>${checks.label}.</p></div>
          <div class="planned-box"><p><span class="pill planned">Planned</span>Not built yet</p><ul><li>Remote assistant doors</li><li>The LMS door</li><li>Learn's statistics</li><li>The benchmark run</li><li>Scheduled watching</li><li>Shared workspace, sign-in</li></ul></div>
        </div>
      </div>
      <div class="ask">
        <div><p class="eyebrow">The ask</p><p class="line">One department, one term, inside its LMS.</p><p class="measures">The pilot measures task completion, citation fidelity, time to a brief and repeat use.</p><p class="closing">Every semester adds a ring.</p></div>
        ${qrSlot}
      </div>
    </div>
  </section>

  <footer class="foot"><span>Lyceum, Universiti Teknologi PETRONAS. Dr Aisyah is fictional; the posting and the screens are real.</span><span>Every figure on this poster is in docs/claims.md, with its source.</span></footer>
</main>
</body></html>`;

// ---------- render ----------
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!executablePath) throw new Error("Chrome or Edge must be installed");
const browser = await puppeteer.launch({ executablePath, headless: true });
let problems = [];
try {
  const page = await browser.newPage();
  const px = 96 / 25.4;
  await page.setViewport({ width: Math.round(W * px), height: Math.round(H * px), deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await fontsReady(page);
  // The architecture diagram is checked by its own generator; its numbers are protocol versions and dates.
  problems = figureProblems(await page.evaluate(readFigures, ".row1, .row2 .side, .band, .foot"), claimsRegister(), "Poster block");
  // Nothing may leave the sheet or reach the footer; every card must hold its content.
  const overflow = await page.evaluate(() => {
    const out = [];
    const sheet = document.querySelector(".poster").getBoundingClientRect(), foot = document.querySelector(".foot").getBoundingClientRect();
    for (const el of document.querySelectorAll(".row1 > *, .row2 > *, .side > *")) {
      const box = el.getBoundingClientRect(), row = el.parentElement.getBoundingClientRect();
      if (box.bottom > row.bottom + 1) out.push((el.className || el.tagName) + " grows " + Math.round(box.bottom - row.bottom) + " px past its row");
      if (el.scrollHeight > el.clientHeight + 1) out.push((el.className || el.tagName) + " overflows its card by " + (el.scrollHeight - el.clientHeight) + " px");
      if (box.bottom > foot.top - 4 || box.right > sheet.right - 20) out.push((el.className || el.tagName) + " reaches the footer or the edge");
    }
    return out;
  });
  problems.push(...overflow);
  if (!problems.length) {
    await page.pdf({ path: OUT, width: W + "mm", height: H + "mm", printBackground: true, preferCSSPageSize: true });
    console.log("wrote docs/presentation/poster-a1.pdf (A1 landscape, " + W + " by " + H + " mm" + (QR ? ", with the QR code" : ", the QR slot marked planned") + ")");
  }
  if (PREVIEW_DIR) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
    await (await page.$(".poster")).screenshot({ path: join(PREVIEW_DIR, "poster-a1.png") });
    console.log("preview in", PREVIEW_DIR);
  }
} finally { await browser.close(); }
if (problems.length) { console.error("POSTER CHECK FAILED\n  " + problems.join("\n  ")); process.exit(1); }
console.log("Poster checks passed: every number is in the claims register or a reference, no dash, every card holds its content.");
