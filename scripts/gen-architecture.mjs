// The architecture diagram (plan Section 12), generated so it stays in the
// theme: one SVG at 16:9 for the deck, with the bundled faces embedded, and a
// 2x PNG. C4 conventions: a title with its scope, a legend, every line labelled
// with its purpose and its technology, built and planned told apart by solid
// and dashed strokes so it reads in black and white. Marks come from Simple
// Icons, unmodified and monochrome, only where the brand's terms allow
// referential use; elsewhere the product is named in text (docs/brand-use.md).
// Run `node scripts/gen-architecture.mjs`; add `--check` to compare the SVG.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { siClaude, siGreenhouse, siModelcontextprotocol } from "simple-icons";
import { ROOT, color as K, fontFaceCss, fontsReady, T } from "./lib/theme-node.mjs";

const W = 1920, H = 1080;
const OUT_SVG = join(ROOT, "docs/presentation/architecture.svg"), OUT_PNG = join(ROOT, "docs/presentation/architecture.png");
export const OWNERSHIP = "Product names and logos belong to their owners and identify integrations; no partnership or endorsement is implied.";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = { display: T.font.display, body: T.font.body, mono: T.font.mono };
const text = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="${o.family ?? F.body}" font-size="${o.size ?? 16}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? K.ink}"${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.spacing ? ` letter-spacing="${o.spacing}"` : ""}>${esc(s)}</text>`;
const lines = (x, y, arr, o = {}) => arr.map((s, i) => text(x, y + i * (o.lh ?? 20), s, o)).join("");
const rect = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 12}" fill="${o.fill ?? K.white}" stroke="${o.stroke ?? K.border}" stroke-width="${o.sw ?? 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
const eyebrow = (x, y, s, fill = K.emeraldText) => text(x, y, s.toUpperCase(), { family: F.mono, size: 13, weight: 600, fill, spacing: 1.6 });
/** A status tag: built (emerald), local (tint), planned (amber); a link (neutral). On forest, words in the light ink. */
function tag(x, y, label, onForest = false) {
  const planned = label === "Planned", w = 14 + label.length * 7.6;
  const fill = onForest ? K.forest2 : planned ? K.warnSoft : label === "Links" ? K.white : K.tint2;
  const ink = onForest ? (planned ? K.onForest : K.lime) : planned ? K.warn : label === "Links" ? K.ink2 : K.emeraldText;
  return `<rect x="${x}" y="${y}" width="${w}" height="24" rx="12" fill="${fill}" stroke="${onForest ? K.forestBorder : "none"}"/>` + text(x + w / 2, y + 16.5, label, { family: F.mono, size: 12, weight: 600, fill: ink, anchor: "middle" });
}
/** An estimate of a label's width in the 14 px semibold body face: capitals and digits are wider than lower case. */
const textWidth = (s, px = 14) => [...s].reduce((w, ch) => w + (/[A-Z0-9*]/.test(ch) ? 0.73 : /[a-z]/.test(ch) ? 0.58 : ch === " " ? 0.3 : 0.36) * px, 0);
const mark = (icon, x, y, size, fill = K.forest) => `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24"><title>${esc(icon.title)}</title><path d="${icon.path}" fill="${fill}"/></svg>`;
const lyceumMark = (x, y, size) => `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/svg+xml;base64,${readFileSync(join(ROOT, "public/brand/mark.svg")).toString("base64")}"/>`;
/** A labelled line with an arrowhead; dashed when planned. The label says the purpose, then the technology. */
function arrow(x1, y1, x2, y2, label, o = {}) {
  const stroke = o.onForest ? K.onForest : K.ink2;
  const path = `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="2"${o.dash ? ' stroke-dasharray="7 6"' : ""} marker-end="url(#${o.onForest ? "head-light" : "head"})"/>`;
  const lx = o.lx ?? (x1 + x2) / 2 + 10, ly = o.ly ?? (y1 + y2) / 2 + 5;
  return path + (label ? lines(lx, ly, Array.isArray(label) ? label : [label], { size: 13, fill: K.ink2, lh: 16, anchor: o.anchor }) : "");
}
const person = (x, y) => `<g fill="none" stroke="${K.emeraldText}" stroke-width="2"><circle cx="${x}" cy="${y - 6}" r="6"/><path d="M${x - 10} ${y + 12} C${x - 10} ${y + 2}, ${x + 10} ${y + 2}, ${x + 10} ${y + 12}"/></g>`;

export function architectureSvg() {
  const parts = [];
  // ---------- title, scope and legend ----------
  parts.push(text(64, 78, "Lyceum: one core, many doors", { family: F.display, size: 40, weight: 800 }));
  parts.push(text(64, 110, "System context and containers, Track A, 22 October 2026. Solid lines and tiles are built; dashed ones are planned.", { size: 17, fill: K.ink2 }));
  parts.push(rect(1440, 36, 416, 84, { fill: K.white }));
  parts.push(`<path d="M1462 62 L1532 62" stroke="${K.ink2}" stroke-width="2"/>` + text(1544, 67, "Built", { size: 14 }));
  parts.push(`<path d="M1462 96 L1532 96" stroke="${K.ink2}" stroke-width="2" stroke-dasharray="7 6"/>` + text(1544, 101, "Planned", { size: 14 }));
  parts.push(tag(1640, 50, "Built") + tag(1712, 50, "Local, read-only") + tag(1640, 84, "Planned") + tag(1726, 84, "Links"));

  // ---------- band labels ----------
  const bands = [[184, "People"], [262, "Doors"], [500, "The Lyceum core"], [842, "Sources and references"], [990, "Institution systems"]];
  for (const [y, label] of bands) parts.push(eyebrow(64, y, label));

  // ---------- 1. people ----------
  const people = [["Lecturer", "runs the loop"], ["Coordinator", "decides, adopts"], ["Programme committee", "decides on briefs"], ["Students", "via their results"], ["Quality office", "reads the pack (planned)"]];
  people.forEach(([name, role], i) => {
    const x = 280 + i * 318;
    parts.push(rect(x, 150, 296, 58, { fill: K.white, r: 29 }) + person(x + 32, 182) + text(x + 58, 175, name, { size: 16, weight: 700 }) + text(x + 58, 196, role, { size: 13, fill: K.ink2 }));
  });
  parts.push(arrow(1100, 210, 1100, 232, "work through the door they already use", { lx: 1112, ly: 226 }));

  // ---------- 2. doors ----------
  const doors = [
    { name: ["Web workspace"], tech: "React, in the browser", status: "Built", link: ["reads and writes records", "in-browser store"], logo: "lyceum" },
    { name: ["Claude, through", "the local door"], tech: "MCP over stdio", status: "Local, read-only", link: ["read-only tools", "MCP, an exported workspace"], marks: [siClaude, siModelcontextprotocol] },
    { name: ["ChatGPT Edu, Copilot", "Studio, Gemini Enterprise"], tech: "MCP over HTTPS, OAuth", status: "Planned", link: ["the same tools, remote", "MCP over HTTPS, OAuth 2.0"], dash: true },
    { name: ["Microsoft 365", "Copilot and Teams"], tech: "Agents Toolkit, Entra ID", status: "Planned", link: ["briefs as cards", "Adaptive Cards"], dash: true },
    { name: ["Canvas and Moodle"], tech: "LTI 1.3, QTI 3.0", status: "Planned", link: ["launch, push a pack", "LTI 1.3 Deep Linking"], dash: true },
    { name: ["Word, Docs and Slides;", "a browser extension"], tech: "Office.js, Docs APIs", status: "Planned", link: ["save a brief or a pack", "Docs and Slides APIs"], dash: true },
  ];
  const DW = 246, DG = 20, DH = 166;
  doors.forEach((d, i) => {
    const x = 280 + i * (DW + DG), y = 236, nx = x + 18;
    parts.push(rect(x, y, DW, DH, { fill: K.white, dash: d.dash ? "7 6" : undefined, stroke: d.dash ? K.controlBorder : K.border }));
    if (d.logo) parts.push(lyceumMark(x + 18, y + 14, 30));
    if (d.marks) d.marks.forEach((m, j) => parts.push(mark(m, x + 18 + j * 40, y + 16, 26)));
    parts.push(lines(nx, d.logo || d.marks ? y + 72 : y + 38, d.name, { size: 17, weight: 700, lh: 21 }));
    parts.push(text(nx, y + 118, d.tech, { family: F.mono, size: 12, fill: K.ink2 }));
    parts.push(tag(nx, y + 128, d.status));
    parts.push(arrow(x + DW / 2, y + DH + 2, x + DW / 2, 472, d.link, { dash: d.dash, lx: x + DW / 2 + 10, ly: y + DH + 22 }));
  });

  // ---------- 3. the core ----------
  parts.push(`<rect x="280" y="476" width="1576" height="314" rx="24" fill="${K.forest}"/>`);
  parts.push(`<rect x="304" y="494" width="1528" height="40" rx="10" fill="none" stroke="${K.onForest}" stroke-width="1.5" stroke-dasharray="7 6"/>`);
  parts.push(text(324, 520, "API and identity: one OpenAPI 3.1 core for every door, permissions on the server", { size: 15, weight: 600, fill: K.white }) + tag(1700, 502, "Planned", true));
  // the seven helpers as a ring
  const cx = 440, cy = 666, R = 88;
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${K.forestBorder}" stroke-width="2"/>`);
  ["Folio", "Scout", "Atlas", "Lens", "Steward", "Quill", "Prism"].forEach((name, i) => {
    const a = (-90 + i * (360 / 7)) * Math.PI / 180, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${K.lime}"/>`);
    const lx = x + (Math.cos(a) >= 0.2 ? 16 : Math.cos(a) <= -0.2 ? -16 : 0), ly = y + (Math.sin(a) < -0.5 ? -14 : Math.sin(a) > 0.5 ? 24 : 5);
    parts.push(text(lx.toFixed(1), ly.toFixed(1), name, { size: 13, weight: 600, fill: K.onForest, anchor: Math.cos(a) >= 0.2 ? "start" : Math.cos(a) <= -0.2 ? "end" : "middle" }));
  });
  parts.push(text(cx, cy - 4, "Seven helpers", { size: 16, weight: 700, fill: K.white, anchor: "middle" }) + text(cx, cy + 16, "people decide", { size: 13, fill: K.onForest, anchor: "middle" }));
  // the engines
  const engines = [["Collector", "permitted boards, on request"], ["Citation validator", "exact substrings only"], ["Counter", "Wilson 95% intervals"], ["Mapper", "coverage ladder, targets"],
    ["Constraint engine", "hours, links, protected topics"], ["Brief composer", "a receipt for every claim"], ["Pack renderer", "editable PPTX, no model text"], ["Benchmark", "a labelled scan set"]];
  engines.forEach(([name, sub], i) => {
    const x = 610 + (i % 4) * 236, y = 560 + Math.floor(i / 4) * 92;
    parts.push(`<rect x="${x}" y="${y}" width="220" height="76" rx="12" fill="${K.forest2}" stroke="${K.forestBorder}" stroke-width="1.5"/>`);
    parts.push(text(x + 16, y + 32, name, { size: 16, weight: 700, fill: K.white }) + text(x + 16, y + 56, sub, { size: 12.5, fill: K.onForest }));
  });
  parts.push(eyebrow(610, 548, "The deterministic engines", K.lime));
  for (const [i, [name, sub, tech]] of [["Store and event log", "validated backups, schema 5", "browser storage"], ["Skill folder", "the loop for an assistant", "Agent Skills, SKILL.md"]].entries()) {
    const y = 560 + i * 92;
    parts.push(`<rect x="1572" y="${y}" width="260" height="76" rx="12" fill="${K.forest2}" stroke="${K.forestBorder}" stroke-width="1.5"/>`);
    parts.push(text(1588, y + 28, name, { size: 16, weight: 700, fill: K.white }) + text(1588, y + 48, sub, { size: 12.5, fill: K.onForest }) + text(1588, y + 66, tech, { family: F.mono, size: 11.5, fill: K.lime }));
  }

  // ---------- 4. sources and references ----------
  const chip = (x, y, label, status, icon) => {
    const w = 26 + (icon ? 24 : 0) + textWidth(label);
    return rect(x, y, w, 34, { r: 17, fill: K.white, dash: status === "Planned" ? "6 5" : undefined, stroke: status === "Planned" ? K.controlBorder : K.border })
      + (icon ? mark(icon, x + 12, y + 8, 18) : "") + text(x + (icon ? 36 : 12), y + 22, label, { size: 14, weight: 600 }) ;
  };
  parts.push(rect(340, 816, 760, 104, { fill: K.tint1 }) + text(360, 842, "Job boards with a documented public API", { size: 14, weight: 700 }));
  const gw = 26 + 24 + textWidth("Greenhouse"), lw = 26 + textWidth("Lever");
  parts.push(chip(360, 856, "Greenhouse", "Built", siGreenhouse) + chip(360 + gw + 8, 856, "Lever", "Built") + tag(360 + gw + lw + 16, 861, "Built"));
  let px = 360 + gw + lw + 16 + 70;
  for (const b of ["Ashby", "Workable", "SmartRecruiters", "USAJOBS"]) { parts.push(chip(px, 856, b, "Planned")); px += 26 + textWidth(b) + 8; }
  parts.push(text(360, 908, "and Adzuna, and schema.org JobPosting pages whose terms permit it: planned. Never LinkedIn, Indeed or Workday feeds.", { size: 12.5, fill: K.ink2 }));
  parts.push(rect(1120, 816, 330, 104, { fill: K.tint1 }) + text(1140, 842, "Taxonomies", { size: 14, weight: 700 }) + tag(1360, 826, "Planned"));
  let tx = 1140;
  for (const b of ["ESCO", "O*NET", "ISCO-08"]) { parts.push(chip(tx, 856, b, "Planned")); tx += 26 + textWidth(b) + 8; }
  parts.push(rect(1470, 816, 386, 104, { fill: K.tint1 }) + text(1490, 842, "Supply-side references", { size: 14, weight: 700 }) + tag(1782, 826, "Links"));
  parts.push(text(1490, 876, "CS2023, SFIA 9, NICE, CDIO 3.0, AACSB 2026", { size: 14, weight: 600 }) + text(1490, 900, "a baseline the outline can cite", { size: 12.5, fill: K.ink2 }));
  parts.push(arrow(700, 792, 700, 814, null) + text(712, 808, "fetch postings on request · HTTPS JSON APIs", { size: 13, fill: K.ink2 }));
  parts.push(arrow(1285, 792, 1285, 814, null, { dash: true }) + text(1297, 808, "tag a quotation · ESCO API", { size: 13, fill: K.ink2 }));
  parts.push(arrow(1663, 792, 1663, 814, null, { dash: true }) + text(1675, 808, "cite a baseline · links", { size: 13, fill: K.ink2 }));

  // ---------- 5. institution systems ----------
  const inst = [["SIS", "Planned"], ["LMS gradebook", "Planned"], ["Survey tools", "Built"], ["Quality office review calendar", "Planned"]];
  let ix = 340;
  for (const [name, status] of inst) { parts.push(chip(ix, 966, name, status)); ix += 26 + textWidth(name) + 10; }
  parts.push(text(ix + 8, 988, "Results and surveys filed as xlsx or csv: built. SIS and gradebook sync: planned.", { size: 13, fill: K.ink2 }));
  parts.push(`<path d="M300 966 L300 798" fill="none" stroke="${K.ink2}" stroke-width="2" marker-end="url(#head)"/>`);
  parts.push(text(310, 952, "results and surveys", { size: 13, fill: K.ink2 }) );

  // ---------- footer ----------
  parts.push(text(64, 1056, OWNERSHIP + " Marks from Simple Icons, unmodified; text where a brand's terms ask for a licence (docs/brand-use.md).", { size: 13, fill: K.ink3 }));

  const defs = `<defs><style>${fontFaceCss()}</style>
    <marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${K.ink2}"/></marker>
    <marker id="head-light" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${K.onForest}"/></marker></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Lyceum architecture: people work through doors into one deterministic core, which reads job boards, taxonomies and references and files results from institution systems.">
<title>Lyceum: one core, many doors</title>${defs}
<rect width="${W}" height="${H}" fill="${K.mint}"/>
${parts.join("\n")}
</svg>
`;
}

async function renderPng(svg) {
  const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.setContent(`<!doctype html><html><head><style>${fontFaceCss()} html,body{margin:0;background:${K.mint}}</style></head><body>${svg}</body></html>`, { waitUntil: "load" });
    await fontsReady(page);
    await (await page.$("svg")).screenshot({ path: OUT_PNG });
  } finally { await browser.close(); }
}

if (process.argv[1] && process.argv[1].endsWith("gen-architecture.mjs")) {
  const svg = architectureSvg();
  if (process.argv.includes("--check")) {
    if (!existsSync(OUT_SVG) || readFileSync(OUT_SVG, "utf8").replace(/\r\n/g, "\n") !== svg) throw new Error("docs/presentation/architecture.svg is stale. Run node scripts/gen-architecture.mjs.");
    console.log("The architecture diagram matches its generator.");
  } else {
    writeFileSync(OUT_SVG, svg);
    await renderPng(svg);
    console.log("Wrote docs/presentation/architecture.svg and architecture.png.");
  }
}
