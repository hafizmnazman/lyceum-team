// The pixel diff for the move to Tailwind: a screen moved onto utility classes should look the same unless it was meant
// to change. It captures 28 stops of the built app (three signed out, then 25 as Dr Sobri on the demo course) at 1440
// and 320 px, and compares a run with a baseline: a stop fails when more than 25 of its pixels differ, or when its size
// changed. (A share of the page is too loose: a 1 px box round the 150 px progress ring was 0.13 percent of a page, and
// two runs of one build differ by no pixel at all.)
// Usage: npm run build, then
//   node scripts/pixel-diff.mjs <out-dir>                         capture into <out-dir>
//   node scripts/pixel-diff.mjs <out-dir> --against <baseline>    capture, then compare with <baseline>
// The PNGs go to the folder given (the session's scratchpad), never to docs/screenshots/, which the walk and the smokes
// own. With --against, each stop over the threshold also gets its differing pixels drawn into <out-dir>/diff/.
// The same run twice gives the same pixels: reduced motion, a clock that starts at the same instant on every load, a
// seeded Math.random, the bundled fonts loaded before each capture, a fresh profile per width and the same order of stops.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import puppeteer from "puppeteer-core";

const LIMIT = 25; // differing pixels a stop may have (pixelmatch's colour threshold 0.1, antialiased pixels not counted)
const WIDTHS = [[1440, 900], [320, 800]];
const START = Date.UTC(2026, 9, 29, 1, 0, 0); // 09:00 in Kuala Lumpur, the same on every run
const SIGNED_OUT = [["index", "#/index"], ["login", "#/login"], ["judge-signed-out", "#/judge"]];
const SIGNED_IN = [
  ["inbox", "#/inbox"], ["courses", "#/courses"], ["course", "#/course/CS310"], ["watch", "#/course/CS310/watch"],
  ["quote", "#/course/CS310/report/quote"], ["review", "#/course/CS310/report/review"], ["count", "#/course/CS310/report/count"],
  ["map", "#/course/CS310/report/map"], ["brief", "#/course/CS310/report/brief"], ["decide", "#/course/CS310/decide"],
  ["update", "#/course/CS310/update"], ["teach", "#/course/CS310/teach"], ["learn", "#/course/CS310/learn"],
  ["history", "#/course/CS310/history"], ["recap", "#/course/CS310/recap"], ["office", "#/office"], ["evaluation", "#/evaluation"],
  ["guide", "#/guide"], ["settings", "#/settings"], ["programme", "#/programme"], ["trends", "#/trends"],
  ["acceptance", "#/acceptance"], ["backtest", "#/backtest"], ["dataroom", "#/dataroom"], ["judge", "#/judge"],
];

const args = process.argv.slice(2);
const out = args[0] && !args[0].startsWith("--") ? resolve(args[0]) : null;
const at = args.indexOf("--against");
const baseline = at >= 0 && args[at + 1] ? resolve(args[at + 1]) : null;
if (!out || (at >= 0 && !baseline)) { console.error("Usage: node scripts/pixel-diff.mjs <out-dir> [--against <baseline-dir>]"); process.exit(2); }
const inside = (dir, path) => { const r = relative(dir, path); return r === "" || (!r.startsWith("..") && !isAbsolute(r)); };
if (inside(resolve("docs/screenshots"), out)) { console.error("Refusing to write into docs/screenshots/, which the walk and the smokes own."); process.exit(2); }
if (!existsSync("dist/index.html")) { console.error("No dist/. Run npm run build first."); process.exit(2); }
mkdirSync(out, { recursive: true });

// ---------- the built app, served the way the walk serves it ----------
const PORT = 4196;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".csv": "text/csv", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const path = join("dist", url === "/" ? "index.html" : url);
    const file = existsSync(path) && !url.endsWith("/") ? path : join("dist", "index.html");
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, r));
const origin = "http://localhost:" + PORT;

const executablePath = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => existsSync(p));
if (!executablePath) { console.error("No Chrome or Edge found."); server.close(); process.exit(1); }
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb", "--hide-scrollbars"] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const captured = [];

async function settle(page, height) {
  await page.waitForNetworkIdle({ idleTime: 250, timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);
  // Grow the viewport to the content, so a screen that scrolls inside its shell is captured whole.
  const full = await page.evaluate(() => Math.ceil(Math.max(document.documentElement.scrollHeight,
    ...[...document.querySelectorAll("main, [role=main]")].map((e) => e.getBoundingClientRect().top + e.scrollHeight))));
  return Math.min(Math.max(full, height), 9000);
}

async function capture(page, name, width, height) {
  const tall = await settle(page, height);
  await page.setViewport({ width, height: tall });
  await sleep(300);
  const file = join(out, name + "-" + width + ".png");
  await page.screenshot({ path: file });
  await page.setViewport({ width, height });
  captured.push({ name, width, file });
}

async function go(page, hash) {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  await page.waitForFunction((h) => window.location.hash === h, { timeout: 8000 }, hash).catch(() => {});
}

try {
  for (const [width, height] of WIDTHS) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(width + " px: " + String(e)));
    await page.setViewport({ width, height });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.evaluateOnNewDocument((start) => {
      const Real = Date;
      const shift = start - Real.now();
      function Fixed(...a) {
        if (!new.target) return new Real(Real.now() + shift).toString();
        return a.length ? new Real(...a) : new Real(Real.now() + shift);
      }
      Object.setPrototypeOf(Fixed, Real);
      Fixed.prototype = Real.prototype;
      Fixed.now = () => Real.now() + shift;
      globalThis.Date = Fixed;
      let seed = 20261029;
      Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    }, START);
    await page.goto(origin + "/#/index", { waitUntil: "networkidle0" });
    for (const [name, hash] of SIGNED_OUT) { await go(page, hash); await capture(page, name, width, height); }
    await go(page, "#/login");
    await page.waitForSelector('[data-demo-id="login-P-SOBRI"]', { visible: true, timeout: 15000 });
    await page.click('[data-demo-id="login-P-SOBRI"]');
    await page.waitForFunction(() => window.__lyceum?.getState().currentPersonId === "P-SOBRI", { timeout: 15000 });
    for (const [name, hash] of SIGNED_IN) { await go(page, hash); await capture(page, name, width, height); }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log("Captured " + captured.length + " stops into " + out + (errors.length ? "; page errors:\n  " + errors.join("\n  ") : "; no page errors."));
if (!baseline) process.exit(errors.length ? 1 : 0);

// ---------- the comparison ----------
mkdirSync(join(out, "diff"), { recursive: true });
const rows = [];
for (const { name, width, file } of captured) {
  const base = join(baseline, name + "-" + width + ".png");
  if (!existsSync(base)) { rows.push({ name, width, pct: 100, note: "no baseline" }); continue; }
  const a = PNG.sync.read(readFileSync(base)), b = PNG.sync.read(readFileSync(file));
  if (a.width !== b.width || a.height !== b.height) { rows.push({ name, width, pct: 100, note: "size " + b.width + "x" + b.height + ", baseline " + a.width + "x" + a.height }); continue; }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const pct = (100 * n) / (a.width * a.height);
  if (n > LIMIT) writeFileSync(join(out, "diff", name + "-" + width + ".png"), PNG.sync.write(diff));
  rows.push({ name, width, pct, n, note: n + " px" });
}
const failed = (r) => r.n === undefined || r.n > LIMIT;
const over = rows.filter(failed);
for (const r of rows) console.log((failed(r) ? "FAIL " : "ok   ") + (r.name + " " + r.width).padEnd(24) + r.pct.toFixed(3).padStart(8) + " %  " + r.note);
console.log(over.length ? "\nPIXEL DIFF FAILED: " + over.length + " of " + rows.length + " stops over " + LIMIT + " differing pixels; the differences are in " + join(out, "diff") : "\nPIXEL DIFF OK: " + rows.length + " stops within " + LIMIT + " differing pixels of the baseline.");
process.exit(over.length || errors.length ? 1 : 0);
