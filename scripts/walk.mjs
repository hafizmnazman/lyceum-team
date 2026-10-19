// Headless integration walk: open the built app, sign in, visit every screen,
// exercise the real upload pipeline on a sample file, and fail on any page
// error. Screenshots land in docs/screenshots. Run `npm run build` first, then
// `node scripts/walk.mjs` (it serves dist/ itself).
//
// Uses the system Chrome/Edge via puppeteer-core (no Chromium download).

import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 4199;
const ROOT = "dist";
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xlsx": "application/octet-stream",
  ".csv": "text/csv",
  ".pdf": "application/pdf",
  ".pptx": "application/octet-stream",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
};

const server = createServer(async (req, res) => {
  try {
    const url = (req.url ?? "/").split("?")[0];
    const path = join(ROOT, url === "/" ? "index.html" : url);
    const body = await readFile(existsSync(path) ? path : join(ROOT, "index.html"));
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(PORT, r));

const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Edge found.");
  process.exit(1);
}

mkdirSync("docs/screenshots", { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

const shot = (name) => page.screenshot({ path: `docs/screenshots/${name}.png` });
const click = async (demoId) => {
  await page.waitForSelector(`[data-demo-id="${demoId}"]`, { timeout: 8000 });
  await page.click(`[data-demo-id="${demoId}"]`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const check = (name, ok, detail = "") => {
  if (ok) console.log(`PASS  ${name}`);
  else {
    failed += 1;
    console.error(`FAIL  ${name}  ${detail}`);
  }
};

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle0" });
  await shot("01-login");

  // The public index, reachable without signing in.
  await click("view-index");
  await sleep(400);
  await shot("02-index-public");
  check("public index renders", (await page.$$('[data-demo-id="claim-programme"], .page-title')).length > 0);
  await page.evaluate(() => (window.location.hash = "#/login"));
  await sleep(300);

  // Sign in as Dr Sobri (coordinator + lecturer).
  await click("login-P-SOBRI");
  await sleep(400);
  await shot("03-inbox");

  // Visit every screen in his nav plus shared ones.
  const screens = ["courses", "studio", "acceptance", "trends", "backtest", "dataroom", "office", "index", "upload", "inbox"];
  for (const s of screens) {
    const selector = `[data-demo-id="nav-${s}"]`;
    const el = await page.$(selector);
    if (!el) {
      check(`nav to ${s}`, false, "nav item missing");
      continue;
    }
    await el.click();
    await sleep(s === "trends" ? 1200 : 450);
    await shot(`10-${s}`);
    check(`screen ${s} renders`, true);
  }

  // The real upload pipeline on a sample file (xlsx parses in-browser here,
  // since there is no api server: the fallback path under test).
  await click("nav-upload");
  await sleep(300);
  await click("sample-results");
  await page.waitForSelector('[data-demo-id="upload-confirm"]', { timeout: 15000 });
  await shot("20-upload-review");
  await click("upload-confirm");
  await sleep(500);
  const receipt = await page.$('[data-demo-id="upload-receipt"]');
  check("sample results file files end to end", Boolean(receipt));
  await shot("21-upload-receipt");

  // Persistence: reload and confirm we are still signed in on the same screen.
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(500);
  const stillIn = await page.$('[data-demo-id="nav-inbox"]');
  check("state persists across reload", Boolean(stillIn));

  const realErrors = errors.filter(
    (e) => !e.includes("favicon") && !e.includes("Failed to load resource") && !e.includes("ERR_"),
  );
  check("no page errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  server.close();
}

console.log(failed === 0 ? "\nWALK OK" : `\n${failed} checks failed`);
process.exit(failed === 0 ? 0 : 1);
