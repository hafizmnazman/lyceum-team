// The booth poster (plan Sections 4.1 and 15): one A1 sheet, portrait, read top to bottom as one story.
// Seven chapters carry the spine's beats 1 to 4 and 6 to 8, with the journey (beat 5) folded into the
// loop as the thing each step leaves behind. They hang on one thread in the left gutter, numbered, and
// each is joined to the next by the "but" or "therefore" of the plan's transition rule. At the ask, the
// thread closes into the host's growth rings: every semester adds a ring.
// Beat 2 carries the plan's three reasons (the latency, the accreditor's clause, the assistants already
// on campus); the loop carries the clause each step answers; the proof carries the readiness ladder; the
// wider world is the system architecture with its owners' marks (public/brand/partners/logos/, written
// by scripts/gen-partner-logos.mjs), each beside its full product name and its status, built, local and
// read-only, or planned; the ask carries the pilot's measures and why a department pays (deck slides 10
// and 11). The ownership line and the demo line sit in the footer, the UTP mark only there.
// Every number is registered in docs/claims.md, as on the deck; scale labels, dates and clause numbers
// are references. The QR code goes to the public landing page (https://lyceum-rho.vercel.app/#/index):
// docs/presentation/qr-landing.png, or another image passed with `--qr <png>`; without either, its slot
// says planned.
// Run `node scripts/gen-poster.mjs` (D9; add `--preview <dir>` for a PNG preview). posterHtml() and
// renderPoster() are exported, so a preview can render the sheet without writing the PDF.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import puppeteer from "puppeteer-core";
import { ROOT, fontFaceCss, fontsReady, rootVarsCss } from "./lib/theme-node.mjs";
import { claimsRegister, figureProblems, readFigures } from "./lib/claims-node.mjs";
import { OWNERSHIP } from "./gen-architecture.mjs";
import { PROOF } from "../src/data/proof.ts";
import { DEMO_LINE } from "../src/data/sample-course/index.ts";

export const W = 594, H = 841; // A1 portrait, in mm
const OUT = join(ROOT, "docs/presentation/poster-a1.pdf");
const SAVED_QR = join(ROOT, "docs/presentation/qr-landing.png");
const THREAD_X = 25; // the thread's line, in mm from the sheet's left edge; chapters start at 38
const ASK_H = 68; // the last chapter's height; its rings centre on its middle

const dataUri = (file, type) => "data:" + type + ";base64," + readFileSync(isAbsolute(file) ? file : join(ROOT, file)).toString("base64");
const svgUri = (file) => dataUri(file, "image/svg+xml");
const mascot = (who, pose = "resting") => svgUri("public/brand/mascots/" + who + "-" + pose + ".svg");
const logo = (file) => dataUri("public/brand/partners/logos/" + file, file.endsWith(".svg") ? "image/svg+xml" : "image/png");
const proof = (claim) => PROOF.find((p) => p.claim === claim);
const cells = (n, on, cls = "on") => Array.from({ length: n }, (_, i) => `<i class="${i < on ? cls : ""}"></i>`).join("");
const ref = (s) => (/\d/.test(s) ? " data-ref" : ""); // a name or a clause with a number in it is a reference, not a figure

// Lucide icons (ISC), stroked in the surrounding colour: a status travels with an icon and a word.
const ICON = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  x: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  landmark: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2 20 7H4z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  quote: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
  timer: '<path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  renew: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
};
const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
const STATUS = { built: ["check", "Built"], local: ["lock", "Local, read-only"], planned: ["clock", "Planned"], links: ["link", "Links"] };
const status = (key) => `<span class="status ${key}">${icon(STATUS[key][0])}${STATUS[key][1]}</span>`;

/** The chapter's number on the thread; the number is a label, not a figure. */
const node = (n) => `<span class="node" data-n="${n}" data-ref>${n}</span>`;
const chapter = (n, label) => `<div class="chapter">${node(n)}<span class="label">${label}</span></div>`;
const handoff = (word, rest) => `<p class="handoff"><strong>${word}</strong> ${rest}</p>`;

/** The refused paraphrase from scripts/presentation-shots.mjs, cropped to the excerpt and the refusal, at a width in mm. */
function paraphrase(widthMm) {
  const b = readFileSync(join(ROOT, "docs/presentation/shot-report-paraphrase.png")), w = b.readUInt32BE(16), y = 404, h = 398, s = widthMm / w;
  return `<div class="frame" style="width:${widthMm}mm;height:${(h * s).toFixed(2)}mm"><img alt="A quotation typed by hand, experience with Python, refused because the words are not in the saved source text." src="data:image/png;base64,${b.toString("base64")}" style="width:${widthMm}mm;margin-top:${(-y * s).toFixed(2)}mm"></div>`;
}

// ---------- chapter 1: her desk ----------
const TABS = ["Posting", "Posting", "Outline", "Review", "Posting", "Notes", "Survey", "Email"];
const desk = `<figure class="desk" aria-label="A browser window with eight tabs open, a job posting half remembered, and a message from the coordinator">
  <div class="window">
    <div class="tabs">${TABS.map((t, i) => `<span class="tab${i === 0 ? " active" : ""}"><i></i><b>${t}</b></span>`).join("")}</div>
    <div class="page">
      <span class="bar title" style="width:46%"></span>
      <span class="bar" style="width:88%"></span><span class="bar" style="width:72%"><i class="hl" style="left:38%;width:30%"></i></span><span class="bar" style="width:81%"></span>
      <span class="bar" style="width:58%"></span><span class="bar" style="width:66%"></span>
      <div class="bubble"><span class="who">${icon("user")}Coordinator</span><span data-ref>Before the review: what should CS310 change, and why?</span></div>
    </div>
  </div>
  <figcaption>Her evidence today: eight tabs and her memory.</figcaption>
</figure>`;

// ---------- chapter 4: the loop ----------
// The track is a stadium in the card's own millimetres; the six steps sit on it clockwise from the top left,
// each with what it leaves behind outside the track and the clause it answers inside (src/data/accreditors.ts).
const LOOP = { w: 544, h: 147, x0: 66, x1: 478, y0: 65, y1: 115 };
LOOP.r = (LOOP.y1 - LOOP.y0) / 2; LOOP.cy = LOOP.y0 + LOOP.r;
const straight = (t) => LOOP.x0 + LOOP.r + (LOOP.x1 - LOOP.x0 - 2 * LOOP.r) * t;
const STEPS = [
  { step: "Watch", who: ["scout"], does: "Scout fetches postings, on request", leaves: "the sources", clause: "AUN-QA 1.4 · QAA", x: straight(0.22), y: LOOP.y0, side: "top" },
  { step: "Report", who: ["atlas", "lens", "steward"], does: "Atlas quotes, Lens counts, Steward drafts", leaves: "the brief", clause: "MQA 6.1.6 · NAAC 1.4.1", x: straight(0.74), y: LOOP.y0, side: "top" },
  { step: "Decide", who: [], does: "People decide, on the record", leaves: "the decision record", clause: "ABET Criterion 2", x: LOOP.x1, y: LOOP.cy, side: "right", gate: true },
  { step: "Update", who: ["quill"], does: "Quill checks hours and links", leaves: "the adopted version", clause: "ESG 1.9", x: straight(0.74), y: LOOP.y1, side: "bottom" },
  { step: "Teach", who: ["prism"], does: "Prism builds the pack", leaves: "an editable .pptx", clause: "Biggs, alignment", x: straight(0.22), y: LOOP.y1, side: "bottom" },
  { step: "Learn", who: ["lens"], does: "Lens reads the results", leaves: "n of N, per outcome", clause: "ABET Criterion 4", x: LOOP.x0, y: LOOP.cy, side: "left" },
];
function station(s) {
  const discs = s.gate
    ? `<span class="disc gate">${icon("scale")}</span>`
    : s.who.map((w) => `<span class="disc"><img src="${mascot(w, s.step === "Watch" ? "working" : "resting")}" alt=""></span>`).join("");
  const label = `<div class="st-label ${s.side}"><strong>${s.step}</strong><span>${s.does}</span><em${ref(s.leaves)}>${s.leaves}</em></div>`;
  return `<div class="station" style="left:${s.x.toFixed(2)}mm;top:${s.y.toFixed(2)}mm"><div class="discs">${discs}</div>${label}</div>`;
}
/** The clause tag inside the track, beside its step. */
function clauseTag(s) {
  const at = { top: [s.x, LOOP.y0 + 15, "c"], bottom: [s.x, LOOP.y1 - 15, "c"], right: [LOOP.x1 - 15, LOOP.cy, "r"], left: [LOOP.x0 + 13, LOOP.cy, "l"] }[s.side];
  return `<span class="clause-tag ${at[2]}" style="left:${at[0].toFixed(2)}mm;top:${at[1].toFixed(2)}mm"${ref(s.clause)}>${icon("landmark")}${s.clause}</span>`;
}
function trackSvg() {
  const { x0, x1, y0, y1, r } = LOOP;
  const d = `M${x0 + r} ${y0} H${x1 - r} A${r} ${r} 0 0 1 ${x1 - r} ${y1} H${x0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`;
  // chevrons between the stations, pointing the way the loop runs (clockwise)
  const chev = (x, y, deg) => `<path class="chev" d="M-2.2 -3 L1.8 0 L-2.2 3" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg})"/>`;
  const marks = [chev(straight(0.48), y0, 0), chev(x1 - r * 0.29, y0 + r * 0.29, 45), chev(x1 - r * 0.29, y1 - r * 0.29, 135), chev(straight(0.48), y1, 180), chev(x0 + r * 0.29, y1 - r * 0.29, 225), chev(x0 + r * 0.29, y0 + r * 0.29, 315)];
  return `<svg class="track-svg" viewBox="0 0 ${LOOP.w} ${LOOP.h}" width="${LOOP.w}mm" height="${LOOP.h}mm" aria-hidden="true"><path class="track" d="${d}"/>${marks.join("")}</svg>`;
}

// ---------- chapter 5: the readiness ladder ----------
// NASA's nine levels as steps; the scale's numbers are labels. The claim (TRL 6 now, TRL 7 next) is its own element.
const ladder = Array.from({ length: 9 }, (_, i) => {
  const n = i + 1, cls = n < 6 ? "done" : n === 6 ? "now" : n === 7 ? "next" : "later";
  return `<div class="lv ${cls}"><i style="height:${(4 + n * 2.7).toFixed(1)}mm"></i><span data-ref>${n}</span></div>`;
}).join("");

// ---------- chapter 6: the system ----------
const mark = (file, name) => `<span class="mk"><img src="${logo(file)}" alt="${name} logo"><span${ref(name)}>${name}</span></span>`;
const PEOPLE = [["Lecturer", "runs the loop"], ["Coordinator", "decides, adopts"], ["Programme committee", "decides on briefs"], ["Students", "via results and surveys"], ["Quality office", "reads the pack, planned"]];
// OpenAI's brand page refused an automated read, so ChatGPT Edu is named in text, never drawn (docs/brand-use.md).
const DOORS = [
  { name: "The web workspace", tech: "React, in the browser", status: "built", marks: `<span class="mk"><img src="${svgUri("public/brand/mark.svg")}" alt="Lyceum mark"><span>Lyceum</span></span>` },
  { name: "Claude, through the local door", tech: "MCP over stdio, an exported workspace", status: "local", marks: mark("claude.svg", "Claude") + mark("modelcontextprotocol.svg", "Model Context Protocol") },
  { name: "ChatGPT Edu and Gemini Enterprise", tech: "MCP over HTTPS, OAuth", status: "planned", marks: `<span class="mk text-mark"><b>ChatGPT Edu</b></span>` + mark("googlegemini.svg", "Google Gemini") },
  { name: "Microsoft 365 Copilot and Teams", tech: "Agents Toolkit, Entra ID", status: "planned", marks: mark("microsoft-365.svg", "Microsoft 365") + mark("microsoft-teams.svg", "Microsoft Teams") },
  { name: "Canvas and Moodle, in the LMS", tech: "LTI 1.3 launch, a pack pushed", status: "planned", marks: mark("canvas.svg", "Canvas") + mark("moodle.svg", "Moodle") },
];
const door = (d) => `<div class="door ${d.status}"><div class="marks">${d.marks}</div><p class="door-name"${ref(d.name)}>${d.name}</p><p class="door-tech"${ref(d.tech)}>${d.tech}</p>${status(d.status)}</div>`;
const ENGINES = [["Collector", "permitted boards, on request"], ["Citation validator", "exact substrings only"], ["Counter", "Wilson 95% intervals"], ["Mapper", "coverage ladder, targets"],
  ["Constraint engine", "hours, links, protected topics"], ["Brief composer", "a receipt for every claim"], ["Pack renderer", "editable PPTX, no model text"], ["Benchmark", "a labelled scan set"],
  ["Store and event log", "validated backups, schema 6"], ["Skill folder", "the loop for an assistant"]];
const engine = ([name, sub]) => `<div class="engine"><b>${name}</b><span${ref(sub)}>${sub}</span></div>`;
const tile = ([file, name, does, wordmark]) => `<div class="io"><img class="${wordmark ? "wordmark-logo" : ""}" src="${logo(file)}" alt="${name} logo">${wordmark ? "" : `<p class="io-name">${name}</p>`}<p class="io-does">${does}</p></div>`;
const BOARDS = [["greenhouse.svg", "Greenhouse", "Public board API"], ["lever.png", "Lever", "Public board API", true]];
const boardTile = ([file, name, does, wordmark]) => `<div class="io row"><img class="${wordmark ? "wordmark-logo" : ""}" src="${logo(file)}" alt="${name} logo"><div>${wordmark ? "" : `<p class="io-name">${name}</p>`}<p class="io-does">${does}</p></div></div>`;
const FILES = [
  ["microsoft-excel.svg", "Microsoft Excel", "Results in; rubrics out"],
  ["microsoft-forms.svg", "Microsoft Forms", "Survey exports in"],
  ["googleforms.svg", "Google Forms", "Survey exports in"],
  ["moodle.svg", "Moodle", "Feedback in, quiz XML out; not yet on a Moodle site"],
  ["microsoft-powerpoint.svg", "Microsoft PowerPoint", "The editable pack out"],
  ["microsoft-word.svg", "Microsoft Word", "The course file out"],
];
const chips = (names, cls = "") => names.map((n) => `<span class="chip ${cls}"${ref(n)}>${n}</span>`).join("");

// ---------- chapter 7: what the pilot measures, and why a department pays ----------
const MEASURES = [["check", "Task completion"], ["quote", "Citation fidelity"], ["timer", "Time to a brief"], ["repeat", "Repeat use"], ["renew", "A second term renewed"]];
const TIERS = [["Institution", "planned", "Tenancy, audit, the office suite doors"], ["Department", "planned", "Shared workspace, sign-in, the remote and LMS doors"], ["Free", "built", "One course, on one laptop, no account"]];

export function posterHtml({ qr = existsSync(SAVED_QR) ? SAVED_QR : null } = {}) {
  const checks = proof("proof-checks"), board = proof("proof-live-board"), keys = proof("proof-no-keys"), para = proof("proof-no-paraphrase");
  const qrSlot = qr
    ? `<div class="qr"><img src="${dataUri(resolve(qr), "image/png")}" alt="A QR code to Lyceum's public landing page"><span>The live landing page</span></div>`
    : `<div class="qr planned-slot">${status("planned")}<span>A QR code to the public landing page, once it is deployed</span></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Lyceum, the poster</title>
<style>
${fontFaceCss()}
${rootVarsCss()}
@page { size: ${W}mm ${H}mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--mint); }
body { font-family: var(--font-body); color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
img { display: block; }
p, h1, h2, figure, blockquote, ul { margin: 0; }
ul { padding: 0; list-style: none; }
.poster { position: relative; width: ${W}mm; height: ${H}mm; overflow: hidden; padding: 10mm 12mm 8mm; display: flex; flex-direction: column;
  background: var(--mint); background-image: radial-gradient(circle at center, var(--dots) 0.5mm, transparent 0.62mm); background-size: 7mm 7mm; background-position: 3.5mm 3.5mm; }

/* the thread, its numbered chapters and the words between them */
.thread { position: absolute; inset: 0; width: ${W}mm; height: ${H}mm; pointer-events: none; z-index: 2; }
.thread .line { fill: none; stroke-width: 1.3; stroke-linecap: round; }
.thread .on-mint { stroke: var(--forest); }
.thread .on-dark { stroke: var(--lime); }
.thread .knot { fill: var(--forest); }
.thread .tick { stroke: var(--forest); stroke-width: 0.5; }
.thread .ring { fill: none; stroke-width: 1.3; }
.chapter { position: relative; display: flex; align-items: center; height: 7mm; margin: 0 0 1.2mm; }
.node { position: absolute; left: ${THREAD_X - 6.5 - 47}mm; top: -3mm; z-index: 3; width: 13mm; height: 13mm; border-radius: 50%; display: grid; place-items: center;
  background: var(--forest); color: var(--lime); font-family: var(--font-display); font-weight: 800; font-size: 21pt; line-height: 1; }
.mast .node, .ask .node { background: var(--lime); color: var(--forest); } /* on the forest; the loop card's number sits on the mint gutter */
.label { font-family: var(--font-mono); font-size: 12.5pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--emerald-text); }
.dark .label { color: var(--lime); }
.handoff { flex: 1 0 8.6mm; /* the gaps between chapters share whatever height the chapters leave */ display: flex; align-items: center; padding-left: 26mm; font-family: var(--font-display); font-size: 16pt; font-weight: 500; color: var(--ink-2); }
.handoff strong { font-weight: 800; color: var(--ink); margin-right: 1.6mm; }

/* chapters */
.card { position: relative; flex: none; margin-left: 26mm; background: var(--white); border-radius: 7mm; padding: 6.4mm 9mm 5.6mm; }
.dark { background: var(--forest); color: var(--white); }
h2 { font-family: var(--font-display); font-weight: 700; font-size: 30pt; line-height: 1.06; letter-spacing: -0.012em; }
.tag { display: inline-flex; align-items: center; gap: 1.4mm; font-family: var(--font-mono); font-size: 10pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 1.1mm 3mm; border-radius: 99px; white-space: nowrap; }
.ic { width: 1.25em; height: 1.25em; flex: none; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.status { display: inline-flex; align-items: center; gap: 1.2mm; font-family: var(--font-mono); font-size: 9.2pt; font-weight: 700; letter-spacing: 0.04em; padding: 0.8mm 2.3mm; border-radius: 99px; white-space: nowrap; }
.status.built { background: var(--tint-2); color: var(--emerald-text); }
.status.local, .status.links { background: var(--tint-2); color: var(--ink-3); }
.status.planned { background: var(--warn-soft); color: var(--warn); }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 3mm; margin-bottom: 2mm; }
.panel-head .label { font-size: 10pt; color: var(--ink-3); }

/* 1. the masthead and the question */
.mast { position: relative; flex: none; height: 88mm; border-radius: 9mm; padding: 7.4mm 10mm 0 35mm; display: grid; grid-template-columns: 1fr 180mm; gap: 12mm; overflow: hidden;
  background-color: var(--forest); background-image: radial-gradient(circle at center, var(--forest-border) 0.45mm, transparent 0.58mm); background-size: 7mm 7mm; background-position: 3.5mm 3.5mm; }
.lockup { display: flex; align-items: center; gap: 4mm; font-family: var(--font-display); font-weight: 800; font-size: 44pt; letter-spacing: -0.02em; line-height: 1; color: var(--white); }
.lockup img { width: 16mm; height: 16mm; }
.mast-for { margin: 2.6mm 0 4.4mm; font-family: var(--font-mono); font-size: 12pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--on-forest); }
.mast h1 { font-family: var(--font-display); font-weight: 700; font-size: 42pt; line-height: 1.02; letter-spacing: -0.02em; color: var(--white); margin-top: 0.6mm; }
.mast h1 em { font-style: normal; color: var(--lime); }
.mast .sub { margin-top: 3mm; max-width: 300mm; font-size: 15.5pt; line-height: 1.36; color: var(--on-forest); }
.desk { align-self: stretch; display: grid; grid-template-rows: 1fr auto; gap: 2.4mm; padding-bottom: 6.4mm; }
.window { border-radius: 4.5mm; background: var(--forest-2); border: 0.45mm solid var(--forest-border); overflow: hidden; display: grid; grid-template-rows: auto 1fr; }
.tabs { display: flex; gap: 0.8mm; padding: 2.4mm 2.4mm 0; background: var(--forest); border-bottom: 0.45mm solid var(--forest-border); }
.tab { flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 1.2mm; height: 8.4mm; padding: 0 1.8mm; border-radius: 2mm 2mm 0 0; background: var(--forest-2); opacity: 0.6;
  font-family: var(--font-mono); font-size: 8.4pt; color: var(--on-forest); }
.tab.active { opacity: 1; color: var(--white); }
.tab i { flex: none; width: 2.6mm; height: 2.6mm; border-radius: 50%; background: var(--ray-2); }
.tab.active i { background: var(--lime); }
.tab b { font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.page { position: relative; padding: 6mm 8mm; display: grid; align-content: start; gap: 3mm; }
.bar { position: relative; display: block; height: 3mm; border-radius: 99px; background: var(--forest-border); }
.bar.title { height: 5.4mm; margin-bottom: 1.4mm; background: var(--on-forest); opacity: 0.5; }
.bar .hl { position: absolute; top: -0.8mm; bottom: -0.8mm; border-radius: 99px; background: var(--lime); }
.bubble { position: absolute; right: 6mm; bottom: 5.4mm; width: 114mm; padding: 3.8mm 5mm; border-radius: 4mm 4mm 1mm 4mm; background: var(--white); color: var(--ink); display: grid; gap: 1.4mm;
  font-family: var(--font-display); font-size: 16.5pt; font-weight: 600; line-height: 1.18; box-shadow: 0 1.6mm 0 var(--forest-deep); }
.bubble .who { display: flex; align-items: center; gap: 1.6mm; font-family: var(--font-mono); font-size: 9.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--emerald-text); }
.desk figcaption { font-family: var(--font-mono); font-size: 11pt; color: var(--on-forest); text-align: right; }

/* 2. why now */
.why { display: grid; grid-template-columns: 146mm 168mm 1fr; gap: 8mm; margin-top: 4.4mm; align-items: start; }
.stat .row { display: flex; align-items: center; gap: 5mm; }
.stat .big { font-family: var(--font-display); font-weight: 800; font-size: 56pt; line-height: 0.92; letter-spacing: -0.03em; color: var(--emerald-text); white-space: nowrap; }
.stat .big small { font-size: 22pt; font-weight: 700; letter-spacing: -0.01em; }
.stat p { margin-top: 2.6mm; font-size: 12.5pt; line-height: 1.32; color: var(--ink-2); }
.waffle { display: grid; grid-template-columns: repeat(10, 2.5mm); gap: 0.6mm; }
.waffle i { width: 2.5mm; height: 2.5mm; border-radius: 0.5mm; border: 0.3mm solid var(--next-dashed); }
.waffle i.on { background: var(--emerald); border-color: var(--emerald); }
.calendar { display: grid; grid-template-columns: repeat(6, 5.4mm); gap: 1mm; }
.calendar i { width: 5.4mm; height: 5.4mm; border-radius: 0.9mm; border: 0.4mm solid var(--emerald); }
.calendar i.on { background: var(--emerald); }
.calendar i.maybe { background: repeating-linear-gradient(135deg, var(--emerald) 0 0.5mm, var(--white) 0.5mm 1.3mm); }
.why-side { display: grid; gap: 2mm; }
.side-box { padding: 2.6mm 4mm; border-radius: 4mm; background: var(--tint-1); }
.side-box .label { display: flex; align-items: center; gap: 1.6mm; font-size: 9pt; margin-bottom: 1mm; }
.side-box q { display: block; font-family: var(--font-display); font-size: 12.6pt; font-weight: 600; line-height: 1.18; quotes: "\\201C" "\\201D"; }
.side-box p { font-size: 10.4pt; line-height: 1.26; color: var(--ink); }
.side-box cite { display: block; margin-top: 1.2mm; font-style: normal; font-family: var(--font-mono); font-size: 8.8pt; color: var(--ink-2); }
.sources { margin-top: 3mm; font-family: var(--font-mono); font-size: 8.6pt; color: var(--ink-2); }

/* 3. exact words */
.exact { display: grid; grid-template-columns: 1fr 164mm; gap: 10mm; margin-top: 3.6mm; }
.slip { position: relative; padding: 5.2mm 7mm 4.4mm; background: var(--tint-1); border-radius: 1.5mm;
  -webkit-mask: radial-gradient(circle at 2mm 0, transparent 1.6mm, black 1.7mm) top left / 4mm 51% repeat-x, radial-gradient(circle at 2mm 100%, transparent 1.6mm, black 1.7mm) bottom left / 4mm 51% repeat-x; }
.slip header { display: flex; justify-content: space-between; align-items: center; }
.slip .slip-title { font-family: var(--font-mono); font-size: 11pt; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink-3); }
.tag.real { background: var(--tint-2); color: var(--emerald-text); }
.slip .meta, .slip .link { font-family: var(--font-mono); font-size: 9.6pt; line-height: 1.4; color: var(--ink-2); }
.slip .meta { margin-top: 2.4mm; }
.slip blockquote { margin: 2.6mm 0 2.8mm; padding-left: 5mm; border-left: 1.4mm solid var(--emerald); font-family: var(--font-display); font-size: 23pt; font-weight: 600; line-height: 1.2; letter-spacing: -0.005em; }
.slip .count-row { display: flex; align-items: center; justify-content: space-between; gap: 4mm; padding-top: 2.4mm; border-top: 0.4mm dashed var(--next-dashed); }
.slip .count { display: flex; align-items: baseline; gap: 3mm; font-size: 13pt; color: var(--ink-2); }
.slip .count strong { font-family: var(--font-display); font-weight: 800; font-size: 32pt; line-height: 1; letter-spacing: -0.02em; color: var(--emerald-text); }
.denom { display: flex; gap: 1.4mm; align-items: flex-end; }
.denom i { width: 5.6mm; height: 7.4mm; border-radius: 0.8mm; border: 0.4mm solid var(--next-dashed); background: var(--white); }
.denom i.on { background: var(--emerald); border-color: var(--emerald); }
.denom em { margin-left: 1.6mm; font-style: normal; font-family: var(--font-mono); font-size: 9pt; color: var(--ink-2); }
.slip .link { margin-top: 1.4mm; }
.refused { display: grid; align-content: start; gap: 2.8mm; }
.frame { overflow: hidden; border: 0.35mm solid var(--border); border-radius: 3mm; background: var(--white); }
.frame img { max-width: none; }
.refused-line { display: flex; align-items: center; gap: 2.4mm; font-size: 12.5pt; color: var(--ink-2); }
.tag.danger { background: var(--danger-soft); color: var(--danger); }
.zero { display: flex; align-items: baseline; gap: 3mm; font-size: 13pt; color: var(--ink-2); }
.zero strong { font-family: var(--font-display); font-weight: 800; font-size: 31pt; line-height: 1; color: var(--emerald-text); }

/* 4. the loop */
.loop-card { height: ${LOOP.h}mm; padding-bottom: 0; }
.track-svg { position: absolute; left: 0; top: 0; }
.track { fill: none; stroke: var(--lime); stroke-width: 1.4; }
.chev { fill: none; stroke: var(--lime); stroke-width: 1.1; stroke-linecap: round; stroke-linejoin: round; }
.centre { position: absolute; left: ${(LOOP.x0 + LOOP.x1) / 2}mm; top: ${LOOP.cy}mm; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 3.6mm; }
.centre img { width: 20mm; height: 20mm; }
.centre p { font-family: var(--font-display); font-size: 15pt; font-weight: 600; line-height: 1.16; color: var(--white); }
.centre p span { display: block; font-family: var(--font-body); font-size: 11pt; font-weight: 400; color: var(--on-forest); }
.centre p small { display: flex; align-items: center; gap: 1.4mm; margin-top: 1.2mm; font-family: var(--font-mono); font-size: 8.6pt; font-weight: 600; color: var(--on-forest); }
.station { position: absolute; width: 0; height: 0; }
.discs { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); display: flex; gap: 1.6mm; }
.disc { width: 17mm; height: 17mm; border-radius: 50%; background: var(--tint-2); border: 0.8mm solid var(--forest); display: grid; place-items: center; }
.disc img { width: 13.6mm; height: 13.6mm; }
.disc.gate { width: 21mm; height: 21mm; background: var(--lime); }
.disc.gate .ic { width: 11mm; height: 11mm; color: var(--forest); stroke-width: 1.9; }
.st-label { position: absolute; display: grid; justify-items: center; text-align: center; gap: 0.6mm; width: 98mm; }
.st-label strong { font-family: var(--font-display); font-size: 19pt; font-weight: 700; line-height: 1; }
.st-label span { font-size: 11.2pt; line-height: 1.2; color: var(--on-forest); }
.st-label em { margin-top: 0.8mm; font-style: normal; font-family: var(--font-mono); font-size: 9.6pt; font-weight: 700; color: var(--lime); padding: 0.6mm 2.4mm; border-radius: 99px; background: var(--forest-2); border: 0.3mm solid var(--forest-border); }
.st-label.top { left: -49mm; bottom: 11mm; }
.st-label.bottom { left: -49mm; top: 11mm; }
.st-label.right { left: 13mm; top: 0; transform: translateY(-50%); justify-items: start; text-align: left; width: 46mm; }
.st-label.left { right: 11mm; top: 0; transform: translateY(-50%); justify-items: end; text-align: right; width: 46mm; }
.clause-tag { position: absolute; display: inline-flex; align-items: center; gap: 1.4mm; white-space: nowrap; font-family: var(--font-mono); font-size: 8.8pt; font-weight: 600; color: var(--on-forest);
  padding: 0.8mm 2.4mm; border-radius: 1.6mm; border: 0.3mm dashed var(--forest-border); }
.clause-tag .ic { color: var(--ray-3); }
.clause-tag.c { transform: translate(-50%, -50%); }
.clause-tag.r { transform: translate(-100%, -50%); }
.clause-tag.l { transform: translate(0, -50%); }

/* 5. the proof and the readiness ladder */
.proof-grid { display: grid; grid-template-columns: 1fr 196mm; gap: 9mm; margin-top: 3.6mm; align-items: stretch; }
.proof { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.6mm; }
.pf { padding: 3.6mm 4.4mm; border-radius: 4mm; background: var(--tint-1); display: grid; align-content: start; gap: 1.6mm; }
.pf strong { font-family: var(--font-display); font-weight: 800; font-size: 40pt; line-height: 0.95; letter-spacing: -0.03em; color: var(--emerald-text); }
.pf span { font-size: 11pt; line-height: 1.26; color: var(--ink-2); }
.planned-strip { margin-top: 3.6mm; display: flex; align-items: flex-start; gap: 3mm; font-size: 11.6pt; line-height: 1.32; color: var(--ink); }
.planned-strip .status { flex: none; margin-top: 0.3mm; }
.trl { padding: 3.4mm 4.4mm 3.2mm; border-radius: 4mm; border: 0.35mm solid var(--border); display: grid; grid-template-columns: 62mm 1fr; column-gap: 4mm; align-items: end; }
.trl .label { font-size: 9.2pt; color: var(--ink-3); margin-bottom: 1.6mm; }
.trl-text p { font-size: 10pt; line-height: 1.22; color: var(--ink-2); }
.trl-text strong { display: block; font-family: var(--font-display); font-weight: 800; font-size: 28pt; line-height: 1; letter-spacing: -0.02em; color: var(--emerald-text); }
.trl-text .trl-next { margin-top: 2mm; }
.trl-text .trl-next strong { color: var(--ink-3); font-size: 17pt; }
.ladder { display: grid; grid-template-columns: repeat(9, 1fr); gap: 1.8mm; align-items: end; }
.lv { display: grid; justify-items: stretch; gap: 1mm; }
.lv i { display: block; border-radius: 1.4mm 1.4mm 0.4mm 0.4mm; }
.lv span { text-align: center; font-family: var(--font-mono); font-size: 9pt; font-weight: 700; color: var(--ink-2); }
.lv.done i { background: var(--tint-2); }
.lv.now i { background: var(--emerald); }
.lv.now span { color: var(--emerald-text); }
.lv.next i { border: 0.45mm dashed var(--control-border); }
.lv.later i { border: 0.35mm solid var(--border); }
.trl-quote { grid-column: 1 / -1; margin-top: 2.4mm; font-size: 9.6pt; line-height: 1.26; color: var(--ink-2); }

/* 6. the system */
.people { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; margin-top: 3.4mm; }
.person { display: flex; align-items: center; gap: 2.2mm; padding: 1.3mm 3mm; border-radius: 99px; background: var(--tint-1); font-size: 10.6pt; font-weight: 700; line-height: 1.1; white-space: nowrap; }
.person .ic { width: 5mm; height: 5mm; color: var(--emerald-text); }
.person span { display: block; font-size: 8.8pt; font-weight: 400; color: var(--ink-2); }
.flow { display: flex; justify-content: space-around; height: 4mm; }
.flow i { width: 0.5mm; height: 4mm; background: var(--ink-2); position: relative; }
.flow i::after { content: ""; position: absolute; left: -1.2mm; bottom: -0.2mm; border: 1.45mm solid transparent; border-top: 1.8mm solid var(--ink-2); border-bottom: 0; }
.flow.up i::after { top: -0.2mm; bottom: auto; border-top: 0; border-bottom: 1.8mm solid var(--ink-2); }
.doors { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; }
.door { padding: 2.6mm 3.4mm; border-radius: 3.5mm; background: var(--white); border: 0.35mm solid var(--border); display: grid; grid-template-rows: auto 1fr auto auto; gap: 0.9mm; justify-items: start; }
.door.planned { border: 0.45mm dashed var(--control-border); }
.door .marks { display: flex; gap: 3.4mm; align-items: flex-start; min-height: 11.5mm; }
.mk { display: grid; justify-items: center; gap: 0.8mm; white-space: nowrap; text-align: center; font-size: 8.2pt; line-height: 1.1; color: var(--ink-2); }
.mk img { width: 9.5mm; height: 9.5mm; object-fit: contain; }
.mk.text-mark { align-self: stretch; align-content: center; padding: 0 2.6mm; border-radius: 2mm; border: 0.35mm solid var(--border); background: var(--tint-1); }
.mk.text-mark b { font-family: var(--font-display); font-size: 12pt; font-weight: 700; color: var(--ink); }
.door-name { font-size: 11.6pt; font-weight: 700; line-height: 1.15; align-self: end; }
.door-tech { font-family: var(--font-mono); font-size: 8.3pt; color: var(--ink-2); }
.core { border-radius: 4mm; background: var(--forest); color: var(--white); padding: 3.2mm 4.2mm; display: grid; grid-template-columns: 74mm 1fr; gap: 4.2mm; align-items: center; }
.core-name { display: grid; gap: 2.2mm; }
.core-title { display: flex; align-items: center; gap: 2.6mm; font-family: var(--font-display); font-size: 15pt; font-weight: 700; line-height: 1.05; }
.core-title img { width: 10mm; height: 10mm; }
.core-title small { display: block; margin-top: 0.6mm; font-family: var(--font-body); font-size: 9.2pt; font-weight: 400; line-height: 1.22; color: var(--on-forest); }
.engines { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.6mm; }
.engine { padding: 1.4mm 2.2mm; border-radius: 2mm; background: var(--forest-2); border: 0.3mm solid var(--forest-border); display: grid; gap: 0.3mm; }
.engine b { font-size: 9.6pt; font-weight: 700; line-height: 1.1; }
.engine span { font-size: 8.2pt; line-height: 1.15; color: var(--on-forest); }
.stack { display: flex; align-items: center; gap: 1.6mm; font-family: var(--font-mono); font-size: 8.2pt; color: var(--on-forest); }
.stack .mk { background: var(--white); border-radius: 1.6mm; padding: 1.2mm 1.4mm 0.9mm; color: var(--ink-2); font-size: 7pt; }
.stack .mk img { width: 6mm; height: 6mm; }
.feeds { display: grid; grid-template-columns: 118mm 1fr 112mm; gap: 3.4mm; }
.feed { padding: 3mm 3.4mm; border-radius: 3.5mm; background: var(--tint-1); }
.feed-tiles { display: grid; gap: 2mm; }
.feed.boards .feed-tiles { grid-template-columns: 1fr 1fr; }
.feed.files .feed-tiles { grid-template-columns: repeat(6, 1fr); }
.io { padding: 2.4mm 2.4mm 2.2mm; border-radius: 2.6mm; background: var(--white); border: 0.35mm solid var(--border); display: grid; align-content: start; gap: 1mm; }
.io.row { grid-template-columns: auto 1fr; align-items: center; gap: 2mm; }
.io img { width: 8.6mm; height: 8.6mm; object-fit: contain; }
.io img.wordmark-logo { width: 22mm; height: 8.6mm; object-position: left center; }
.io-name { font-size: 9.6pt; font-weight: 700; line-height: 1.1; }
.io-does { font-size: 8.4pt; line-height: 1.2; color: var(--ink-2); }
.chip-row { display: flex; flex-wrap: wrap; gap: 1.4mm; margin-top: 2mm; align-items: center; }
.chip { font-family: var(--font-mono); font-size: 8.4pt; font-weight: 600; padding: 0.7mm 2.2mm; border-radius: 99px; background: var(--white); border: 0.35mm solid var(--border); color: var(--ink); white-space: nowrap; }
.chip.planned { border: 0.4mm dashed var(--control-border); color: var(--ink-2); }
.feed-note { margin-top: 1.8mm; font-size: 8.8pt; line-height: 1.25; color: var(--ink-2); }
.refs { display: grid; gap: 2.4mm; align-content: start; }
.refs .chip-row { margin-top: 0; }

/* 7. the ask */
.ask { position: relative; flex: none; height: ${ASK_H}mm; border-radius: 9mm; padding: 8.4mm 9mm 0 78mm; display: grid; grid-template-columns: 1fr 124mm 48mm; gap: 8mm; overflow: hidden;
  background-color: var(--forest); background-image: radial-gradient(circle at center, var(--forest-border) 0.45mm, transparent 0.58mm); background-size: 7mm 7mm; background-position: 3.5mm 3.5mm; }
.ask .chapter { margin: 0; }
.ask > .node { left: ${THREAD_X - 12 - 6.5}mm; top: ${ASK_H / 2 - 6.5}mm; } /* on the rings, not beside its label */
.ask h2 { font-size: 31pt; color: var(--white); }
.measures-label { margin-top: 3mm; font-family: var(--font-mono); font-size: 9.6pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--on-forest); }
.measures { display: flex; flex-wrap: wrap; gap: 1.8mm; margin-top: 1.6mm; }
.measures li { display: flex; align-items: center; gap: 1.6mm; padding: 1.2mm 2.8mm; border-radius: 99px; background: var(--forest-2); border: 0.3mm solid var(--forest-border); font-size: 11pt; font-weight: 600; color: var(--white); white-space: nowrap; }
.measures li .ic { color: var(--lime); }
.ask .closing { margin-top: 3mm; font-family: var(--font-display); font-weight: 800; font-size: 24pt; letter-spacing: -0.01em; color: var(--lime); }
.pays { display: grid; align-content: start; gap: 1.6mm; }
.pays .label { font-size: 9.6pt; margin-bottom: 0.4mm; }
.tier { padding: 1.8mm 3mm; border-radius: 3mm; background: var(--forest-2); border: 0.3mm solid var(--forest-border); display: grid; gap: 0.6mm; }
.tier .status { font-size: 8.4pt; padding: 0.5mm 2mm; }
.tier.free { border: 0.5mm solid var(--lime); }
.tier h3 { margin: 0; display: flex; align-items: center; justify-content: space-between; font-family: var(--font-display); font-size: 12.5pt; font-weight: 700; color: var(--white); }
.tier p { margin: 0; font-size: 9.6pt; line-height: 1.25; color: var(--on-forest); }
.host { position: absolute; left: ${THREAD_X - 12 + 25 - 15}mm; top: ${ASK_H / 2 - 15}mm; width: 30mm; height: 30mm; z-index: 3; }
.qr { align-self: center; display: grid; justify-items: center; gap: 2mm; text-align: center; font-family: var(--font-mono); font-size: 9.6pt; color: var(--on-forest); }
.qr img { width: 46mm; height: 46mm; background: var(--white); border-radius: 3mm; padding: 2.6mm; }
.planned-slot { min-height: 46mm; align-content: center; padding: 4mm; border-radius: 4mm; border: 0.5mm dashed var(--on-forest); }

/* the footer */
.foot { flex: none; margin-top: auto; height: 12mm; padding: 0 1mm 0 26mm; display: grid; grid-template-columns: auto 1fr auto; gap: 4mm; align-items: center; font-size: 8.8pt; line-height: 1.32; color: var(--ink-2); }
.foot img { height: 8mm; width: auto; }
.foot .note { font-family: var(--font-mono); font-size: 8.4pt; text-align: right; }
</style></head><body>
<main class="poster">
  <header class="mast dark">
    <div class="mast-text">
      <div class="lockup"><img src="${svgUri("public/brand/mark-white.svg")}" alt="">Lyceum</div>
      <p class="mast-for">For lecturers and programme committees</p>
      ${chapter(1, "A question, after class")}
      <h1>She can suggest a change.<br><em>She cannot show why.</em></h1>
      <p class="sub">Dr Aisyah, a fictional lecturer, is asked what her course should change before the next review.</p>
    </div>
    ${desk}
  </header>

  ${handoff("But", "a review can no longer run on a hunch.")}

  <section class="card why-card">
    ${chapter(2, "Why now")}
    <h2>Skills change faster than courses are approved.</h2>
    <div class="why">
      <div class="stat" data-claim="world-skills-and-approval"><div class="row"><div class="big">39%</div><div class="waffle">${cells(100, 39)}</div></div><p>of workers' existing skills will be transformed or outdated between 2025 and 2030, employers expect</p></div>
      <div class="stat" data-claim="world-skills-and-approval"><div class="row"><div class="big">12 to 18 <small>months</small></div><div class="calendar">${cells(12, 12)}${cells(6, 6, "maybe")}</div></div><p>to approve a new degree programme, at the US universities cited</p></div>
      <div class="why-side">
        <blockquote class="side-box"><span class="label">${icon("landmark")}The accreditor already asks</span><q>conduct internal and external consultations, market needs and graduate employability analyses</q><cite data-ref>MQA COPPA, 2nd edition, 6.1.6</cite></blockquote>
        <div class="side-box"><span class="label">${icon("user")}The assistants are already on campus</span><p data-ref>Every student and staff member at Oxford has had ChatGPT Edu since 2025/26; California State University announced it for its students and staff in February 2025.</p></div>
      </div>
    </div>
    <p class="sources" data-ref>Different measures of different populations, so never one chart. World Economic Forum, Future of Jobs Report 2025; Wayne State and Texas Tech programme approval pages; the University of Oxford and California State University announcements.</p>
  </section>

  ${handoff("Therefore", "start from what employers actually wrote.")}

  <section class="card exact-card">
    ${chapter(3, "Exact words")}
    <h2>An exact sentence, counted over a known denominator.</h2>
    <div class="exact">
      <article class="slip">
        <header><span class="slip-title">Receipt</span><span class="tag real">${icon("check")}A real posting</span></header>
        <p class="meta" data-ref>Stripe · Data Analyst, Intern · published 2026-10-01</p>
        <blockquote>“You'll build metrics, scalable data pipelines, dashboards, and reports to inform and run the business.”</blockquote>
        <div class="count-row">
          <p class="count" data-claim="deck-receipt"><strong>1 of 9</strong> reviewed postings</p>
          <span class="denom" role="img" aria-label="One reviewed posting of nine quotes this sentence">${cells(9, 1)}<em>the denominator, shown</em></span>
        </div>
        <p class="link" data-ref>stripe.com/jobs/search?gh_jid=8194291 · retrieved 2026-10-09 · fnv1a-68604535-974</p>
      </article>
      <div class="refused">
        ${paraphrase(164)}
        <p class="refused-line"><span class="tag danger">${icon("x")}Refused</span>A paraphrase, refused before it is stored.</p>
        <p class="zero" data-claim="proof-no-paraphrase"><strong>${para.value}</strong> paraphrases accepted as evidence</p>
      </div>
    </div>
  </section>

  ${handoff("But", "one receipt is not a decision.")}

  <section class="card dark loop-card">
    ${chapter(4, "The loop")}
    <h2>Six steps, every semester. Seven helpers do the work; people decide.</h2>
    ${trackSvg()}
    <div class="centre"><img src="${mascot("folio", "working")}" alt=""><p>The course itself<span>Folio reads the outline the loop revolves around</span><small>${icon("landmark")}each step answers a clause reviewers use</small></p></div>
    ${STEPS.map(station).join("")}
    ${STEPS.map(clauseTag).join("")}
  </section>

  ${handoff("But", "how much of this is real today?")}

  <section class="card proof-card">
    ${chapter(5, "The proof")}
    <h2>What runs today, and what does not yet.</h2>
    <div class="proof-grid">
      <div>
        <div class="proof">
          <div class="pf" data-claim="proof-checks"><strong>${checks.value}</strong><span>automated checks pass, 23 October 2026, plus four headless browser runs</span></div>
          <div class="pf" data-claim="proof-live-board"><strong>${board.value}</strong><span>real postings fetched live from one employer's public board, on request</span></div>
          <div class="pf" data-claim="proof-no-keys"><strong>${keys.value}</strong><span>AI keys needed. The core is deterministic; parsing and collection run on the local API</span></div>
        </div>
        <p class="planned-strip">${status("planned")}<span>Not built yet: remote assistant doors, the LMS door, pooling and predictions, the benchmark run, scheduled watching, a shared workspace with sign-in.</span></p>
      </div>
      <div class="trl">
        <div class="trl-text">
          <p class="label">Readiness, on NASA's software scale</p>
          <p class="trl-now" data-claim="deck-trl"><strong>TRL 6</strong>here, self-assessed</p>
          <p class="trl-next" data-claim="deck-trl"><strong>TRL 7</strong>next: one department, one term</p>
        </div>
        <div class="ladder">${ladder}</div>
        <p class="trl-quote" data-claim="deck-trl">“Prototype implementations of the software demonstrated on full-scale realistic problems”: real postings from a real public board, a sample course outline and a lecturer persona.</p>
      </div>
    </div>
  </section>

  ${handoff("Therefore", "any campus can run it, through the tools it already has.")}

  <section class="card world-card">
    ${chapter(6, "The wider world")}
    <h2>One core, many doors: the system as built.</h2>
    <div class="people">${PEOPLE.map(([who, does]) => `<div class="person">${icon("user")}<div>${who}<span>${does}</span></div></div>`).join("")}</div>
    <div class="flow">${"<i></i>".repeat(DOORS.length)}</div>
    <div class="doors">${DOORS.map(door).join("")}</div>
    <div class="flow">${"<i></i>".repeat(DOORS.length)}</div>
    <div class="core">
      <div class="core-name">
        <div class="core-title"><img src="${svgUri("public/brand/mark-white.svg")}" alt=""><span>The Lyceum core<small>Deterministic engines; seven helpers prepare, people decide</small></span></div>
        <div class="stack"><span>Built with</span>${mark("typescript.svg", "TypeScript")}${mark("react.svg", "React")}${mark("nodedotjs.svg", "Node.js")}</div>
      </div>
      <div class="engines">${ENGINES.map(engine).join("")}</div>
    </div>
    <div class="flow up">${"<i></i>".repeat(DOORS.length)}</div>
    <div class="feeds">
      <div class="feed boards">
        <div class="panel-head"><span class="label">Job boards, on request</span>${status("built")}</div>
        <div class="feed-tiles">${BOARDS.map(boardTile).join("")}</div>
        <div class="chip-row">${chips(["Ashby", "Workable", "SmartRecruiters", "USAJOBS"], "planned")}</div>
        <p class="feed-note">Dashed: planned. Never LinkedIn, Indeed or Workday feeds.</p>
      </div>
      <div class="feed files">
        <div class="panel-head"><span class="label">Files in and out, editable</span>${status("built")}</div>
        <div class="feed-tiles">${FILES.map(tile).join("")}</div>
      </div>
      <div class="feed refs">
        <div><div class="panel-head"><span class="label">References the outline can cite</span>${status("links")}</div><div class="chip-row">${chips(["CS2023", "SFIA 9", "NICE", "CDIO 3.0", "AACSB 2026"])}</div></div>
        <div><div class="panel-head"><span class="label">Taxonomies</span>${status("planned")}</div><div class="chip-row">${chips(["ESCO", "O*NET", "ISCO-08"], "planned")}</div></div>
      </div>
    </div>
  </section>

  ${handoff("Therefore", "the ask is small.")}

  <section class="ask dark">
    <img class="host" src="${mascot("host", "celebrating")}" alt="Tualang, Lyceum's host, celebrating">
    ${node(7)}
    <div>
      <div class="chapter"><span class="label">The ask</span></div>
      <h2>One department, one term, inside its LMS.</h2>
      <p class="measures-label">What the pilot measures</p>
      <ul class="measures">${MEASURES.map(([ic, m]) => `<li>${icon(ic)}${m}</li>`).join("")}</ul>
      <p class="closing">Every semester adds a ring.</p>
    </div>
    <div class="pays">
      <p class="label">Why a department pays</p>
      ${TIERS.map(([tier, st, does]) => `<div class="tier ${tier.toLowerCase()}"><h3>${tier}${status(st)}</h3><p>${does}</p></div>`).join("")}
    </div>
    ${qrSlot}
  </section>

  <footer class="foot">
    <img src="${dataUri("public/brand/partners/utp-wide.png", "image/png")}" alt="Universiti Teknologi PETRONAS mark, demo course">
    <div><p data-ref>${DEMO_LINE} Dr Aisyah is fictional; the posting and the screens are real.</p><p>${OWNERSHIP}</p></div>
    <p class="note">Every figure here is in docs/claims.md, with its source.</p>
  </footer>
</main>
<script>
// The thread: one line down the gutter through every chapter's number, lime where it crosses the forest,
// a knot at each handoff, and at the ask it closes into the host's growth rings.
(() => {
  const mm = 96 / 25.4, X = ${THREAD_X}, sheet = document.querySelector(".poster").getBoundingClientRect();
  const y = (el, at = 0.5) => { const b = el.getBoundingClientRect(); return (b.top - sheet.top + b.height * at) / mm; };
  const nodes = [...document.querySelectorAll(".node")].map((n) => y(n));
  const dark = [...document.querySelectorAll(".mast, .ask")].map((el) => [y(el, 0), y(el, 1)]);
  const first = nodes[0], last = nodes[nodes.length - 1];
  const parts = [];
  // split the line wherever it enters or leaves a forest surface
  const cuts = [first, last, ...dark.flat()].filter((v) => v >= first && v <= last).sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1], mid = (a + b) / 2, onDark = dark.some(([t, u]) => mid > t && mid < u);
    parts.push('<path class="line ' + (onDark ? "on-dark" : "on-mint") + '" d="M' + X + ' ' + a.toFixed(2) + ' V' + b.toFixed(2) + '"/>');
  }
  for (const h of document.querySelectorAll(".handoff")) {
    const k = y(h);
    parts.push('<circle class="knot" cx="' + X + '" cy="' + k.toFixed(2) + '" r="1.5"/><path class="tick" d="M' + (X + 1.5) + ' ' + k.toFixed(2) + ' H' + (X + 10) + '"/>');
  }
  // the growth rings, the outer one continuing the thread through the last number
  const R = 25, cx = X + R;
  ["var(--lime)", "var(--ray-3)", "var(--ray-2)"].forEach((c, i) => parts.push('<circle class="ring" cx="' + cx + '" cy="' + last.toFixed(2) + '" r="' + (R - i * 4.5) + '" style="stroke:' + c + '"/>'));
  document.querySelector(".poster").insertAdjacentHTML("beforeend", '<svg class="thread" viewBox="0 0 ${W} ${H}" aria-hidden="true">' + parts.join("") + '</svg>');
})();
</script>
</body></html>`;
}

/** The poster's checks, run in a rendered page: every number registered, no dash, every chapter holding its content. */
export async function posterProblems(page) {
  const problems = figureProblems(await page.evaluate(readFigures, ".poster"), claimsRegister(), "Poster");
  const text = await page.evaluate(() => document.querySelector(".poster").innerText.replace(/\s+/g, " "));
  if (!text.includes(OWNERSHIP)) problems.push("The ownership line is missing.");
  if (!text.includes(DEMO_LINE)) problems.push("The UTP mark is shown without the demo line.");
  problems.push(...await page.evaluate(() => {
    const out = [], sheet = document.querySelector(".poster").getBoundingClientRect();
    const name = (el) => (el.className && typeof el.className === "string" ? el.className.split(" ")[0] : el.tagName.toLowerCase());
    for (const el of document.querySelectorAll(".poster > *:not(.thread), .card *, .mast *, .ask *")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || el.closest(".thread")) continue;
      if (b.left < sheet.left - 0.5 || b.right > sheet.right + 0.5 || b.top < sheet.top - 0.5 || b.bottom > sheet.bottom + 0.5) out.push(name(el) + " leaves the sheet");
    }
    for (const el of document.querySelectorAll(".card, .mast, .ask, .foot, .door, .io, .pf, .slip, .side-box, .core, .engine, .feed, .trl, .tier, .person, .bubble")) {
      if (el.scrollHeight > el.clientHeight + 1) out.push(name(el) + " overflows by " + (el.scrollHeight - el.clientHeight) + " px");
      if (el.scrollWidth > el.clientWidth + 1) out.push(name(el) + " is " + (el.scrollWidth - el.clientWidth) + " px too wide");
    }
    // every child of a card stays inside its card
    for (const card of document.querySelectorAll(".card, .mast, .ask")) {
      const c = card.getBoundingClientRect();
      for (const el of card.querySelectorAll(".chapter > .label, h1, h2, p, blockquote, figure, article, .why, .exact, .proof-grid, .people, .doors, .core, .feeds, .station .st-label, .discs, .centre, .clause-tag, .qr, .pays, .measures")) {
        const b = el.getBoundingClientRect();
        if (b.width && (b.bottom > c.bottom + 0.5 || b.right > c.right + 0.5 || b.left < c.left - 0.5)) out.push(name(el) + " in " + name(card) + " crosses its edge");
      }
    }
    // within each chapter, the blocks in the flow stack without touching
    for (const box of document.querySelectorAll(".card, .mast-text, .ask > div")) {
      let above = null;
      for (const el of box.children) {
        if (getComputedStyle(el).position === "absolute") continue;
        const b = el.getBoundingClientRect();
        if (above && b.top < above.bottom - 0.5) out.push(name(el) + " overlaps " + above.name + " in " + name(box));
        above = { bottom: b.bottom, name: name(el) };
      }
    }
    // the loop's labels, discs, tags and centre never touch one another
    const boxes = [...document.querySelectorAll(".loop-card .st-label, .loop-card .discs, .loop-card .centre, .loop-card .clause-tag, .loop-card h2")].map((el) => [name(el), el.getBoundingClientRect()]);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [na, a] = boxes[i], [nb, b] = boxes[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.push("in the loop, " + na + " overlaps " + nb);
    }
    // the chapters keep their order down the sheet and stay above the footer
    const foot = document.querySelector(".foot").getBoundingClientRect();
    let prev = -1;
    for (const el of document.querySelectorAll(".poster > section, .poster > header, .poster > .handoff")) {
      const b = el.getBoundingClientRect();
      if (b.top < prev - 0.5) out.push(name(el) + " starts above the chapter before it");
      if (b.bottom > foot.top + 0.5) out.push(name(el) + " reaches the footer");
      prev = b.bottom;
    }
    if (foot.bottom > sheet.bottom - 4) out.push("the footer is within 4 px of the sheet's edge");
    return out;
  }));
  return problems;
}

export async function renderPoster({ pdf = null, png = null, qr } = {}) {
  const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  if (!executablePath) throw new Error("Chrome or Edge must be installed");
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    const px = 96 / 25.4;
    await page.setViewport({ width: Math.round(W * px), height: Math.round(H * px), deviceScaleFactor: 1 });
    await page.setContent(posterHtml(qr === undefined ? {} : { qr }), { waitUntil: "load" });
    await fontsReady(page);
    const problems = await posterProblems(page);
    if (!problems.length && pdf) await page.pdf({ path: pdf, width: W + "mm", height: H + "mm", printBackground: true, preferCSSPageSize: true });
    if (png) await (await page.$(".poster")).screenshot({ path: png });
    return problems;
  } finally { await browser.close(); }
}

if (process.argv[1] && process.argv[1].endsWith("gen-poster.mjs")) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
  const previewDir = arg("--preview"), qr = arg("--qr");
  if (previewDir) mkdirSync(previewDir, { recursive: true });
  const problems = await renderPoster({ pdf: OUT, png: previewDir ? join(previewDir, "poster-a1.png") : null, qr: qr ?? undefined });
  if (problems.length) { console.error("POSTER CHECK FAILED\n  " + problems.join("\n  ")); process.exit(1); }
  console.log("wrote docs/presentation/poster-a1.pdf (A1 portrait, " + W + " by " + H + " mm)" + (previewDir ? ", preview in " + previewDir : ""));
  console.log("Poster checks passed: every number is in the claims register or a reference, no dash, the ownership and demo lines present, every chapter holds its content.");
}
