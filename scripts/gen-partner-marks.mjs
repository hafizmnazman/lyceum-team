// The partner mark (depth plan Section 3.2): the owner's utp.svg, supplied at the repository root on
// 22 October 2026, copied byte for byte into public/brand/partners/ (the one folder whose files keep their
// owners' colours, docs/brand-use.md) and rasterised there for the teaching pack, which places a PNG because
// pptxgenjs documents SVG support only for the newest desktop PowerPoint.
//   public/brand/partners/utp.svg        the copy the app and the pack read
//   public/brand/partners/utp-1024.png   the pack's masters
//   public/brand/partners/utp-256.png    the survey page and the screens
//   public/brand/partners/utp-wide.png   the slides' corners: the drawing with its viewBox fitted to its own bounds
//   public/brand/partners/manifest.json  the copy's fingerprint, so a changed mark without new PNGs is drift
// The root utp.svg is ignored by git (.gitignore): the tracked copy under partners/ is the one the build uses.
// Usage: node scripts/gen-partner-marks.mjs [--check]
//   --check exits 1 when the copy differs from the root file (when present), or a PNG or the manifest is
//   missing, the wrong size, or older than the copy.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./lib/theme-node.mjs";

const check = process.argv.includes("--check");
const OUT = join(ROOT, "public/brand/partners");
const SOURCE = join(ROOT, "utp.svg"), COPY = join(OUT, "utp.svg"), MANIFEST = join(OUT, "manifest.json");
const SIZES = [1024, 256];
const pngPath = (size) => join(OUT, "utp-" + size + ".png");
const WIDE = join(OUT, "utp-wide.png"), WIDE_WIDTH = 1200;
let wideHeight = 0;
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const normalised = (buf) => Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n"));
/** A PNG's width and height, read from its IHDR chunk. */
function pngSize(path) {
  const b = readFileSync(path);
  if (b.length < 24 || b.toString("latin1", 12, 16) !== "IHDR") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

if (check) {
  const drift = [];
  if (!existsSync(COPY)) drift.push("public/brand/partners/utp.svg (missing)");
  else {
    const copy = readFileSync(COPY);
    if (existsSync(SOURCE) && !normalised(readFileSync(SOURCE)).equals(normalised(copy))) drift.push("public/brand/partners/utp.svg differs from the owner's utp.svg");
    const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : null;
    if (!manifest) drift.push("public/brand/partners/manifest.json (missing)");
    else if (manifest.utp?.sha256 !== sha256(normalised(copy))) drift.push("the PNGs were rendered from another version of the mark");
    for (const size of SIZES) {
      const got = existsSync(pngPath(size)) ? pngSize(pngPath(size)) : null;
      if (!got || got.width !== size || got.height !== size) drift.push("public/brand/partners/utp-" + size + ".png (" + (got ? got.width + " by " + got.height : "missing") + ")");
    }
    const wide = existsSync(WIDE) ? pngSize(WIDE) : null;
    if (!wide || wide.width !== WIDE_WIDTH || wide.height !== manifest?.utp?.wide?.height) drift.push("public/brand/partners/utp-wide.png (" + (wide ? wide.width + " by " + wide.height : "missing") + ")");
  }
  if (drift.length) { console.error("The partner mark is missing or has drifted (run node scripts/gen-partner-marks.mjs):\n  " + drift.join("\n  ")); process.exit(1); }
  console.log("The partner mark matches: the copy, " + (SIZES.length + 1) + " PNGs and the manifest.");
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
if (existsSync(SOURCE)) writeFileSync(COPY, readFileSync(SOURCE));
if (!existsSync(COPY)) throw new Error("No mark to rasterise: put the owner's utp.svg at the repository root.");
const svg = readFileSync(COPY);

const req = createRequire(join(ROOT, "package.json"));
const puppeteer = await import(pathToFileURL(req.resolve("puppeteer-core")).href).then((m) => m.default ?? m);
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!executablePath) throw new Error("No Chrome or Edge found for the PNG renders.");
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  const src = "data:image/svg+xml;base64," + svg.toString("base64");
  for (const size of SIZES) {
    // The mark as its owner drew it, contained in a transparent square: never recoloured, never cropped.
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent("<!doctype html><html><head><style>html,body{margin:0;background:transparent}img{display:block;width:100vw;height:100vh;object-fit:contain}</style></head><body><img alt=\"\" src=\"" + src + "\"></body></html>");
    await page.waitForFunction(() => document.images[0]?.complete);
    await page.screenshot({ path: pngPath(size), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  // The wide render: the drawing's bounding box, measured in the page, becomes the viewBox; nothing in the drawing changes.
  await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 1 });
  await page.setContent("<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body>" + svg.toString("utf8").replace(/^<\?xml[^>]*>\s*/, "") + "</body></html>");
  const box = await page.evaluate(() => { const b = document.querySelector("svg").getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  wideHeight = Math.round((WIDE_WIDTH * box.h) / box.w);
  await page.setViewport({ width: WIDE_WIDTH, height: wideHeight, deviceScaleFactor: 1 });
  await page.evaluate((b) => {
    const el = document.querySelector("svg");
    el.setAttribute("viewBox", b.x + " " + b.y + " " + b.w + " " + b.h); el.setAttribute("preserveAspectRatio", "xMidYMid meet");
    el.style.display = "block"; el.style.width = "100vw"; el.style.height = "100vh";
  }, box);
  await page.screenshot({ path: WIDE, omitBackground: true, clip: { x: 0, y: 0, width: WIDE_WIDTH, height: wideHeight } });
} finally {
  await browser.close();
}
writeFileSync(MANIFEST, JSON.stringify({ utp: { source: "utp.svg, supplied by the owner on 22 October 2026", sha256: sha256(normalised(svg)), png: SIZES.map((size) => "utp-" + size + ".png"),
  wide: { file: "utp-wide.png", width: WIDE_WIDTH, height: wideHeight } } }, null, 2) + "\n");
console.log("Wrote public/brand/partners/: the mark, " + (SIZES.length + 1) + " PNGs and the manifest.");
