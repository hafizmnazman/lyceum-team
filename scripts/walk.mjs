// Headless integration walk: open the built app, sign in, visit every screen
// and every step of the course loop through its path, exercise the real upload
// pipeline on a sample file from Learn, and fail on any page error. Screenshots
// land in docs/screenshots. Run `npm run build` first, then
// `node scripts/walk.mjs` (it serves dist/ itself).
//
// Uses the system Chrome/Edge via puppeteer-core (no Chromium download).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
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
  check("public landing renders", await page.evaluate(() => document.body.innerText.includes("Course decisions, with receipts")));
  await page.evaluate(() => (window.location.hash = "#/login"));
  await sleep(300);

  // Sign in as Dr Sobri (coordinator + lecturer).
  await click("login-P-SOBRI");
  await sleep(400);
  await shot("03-inbox");

  // Visit every screen in his navigation plus the shared ones (the sandbox in its fold), then every
  // step of the loop through its path, entered from the sidebar's selected course chip.
  const screens = ["courses", "acceptance", "trends", "backtest", "dataroom", "office", "evaluation", "index", "inbox"];
  const sandbox = new Set(["acceptance", "trends", "backtest", "dataroom", "index"]);
  for (const s of screens) {
    if (sandbox.has(s) && !(await page.$eval(".nav-fold", (fold) => fold.open))) await click("nav-sandbox");
    const selector = `[data-demo-id="nav-${s}"]`;
    const el = await page.$(selector);
    if (!el) {
      check(`nav to ${s}`, false, "nav item missing");
      continue;
    }
    await el.click();
    await sleep(s === "trends" ? 1200 : 450);
    await shot(`10-${s}`);
    check(`screen ${s} renders`, await page.evaluate((target) => window.__lyceum.getState().screen === target, s));
  }
  const steps = { course: "studio", watch: "watch", report: "report", decide: "decide", update: "studio", teach: "studio", learn: "learn", history: "studio" };
  await click(await page.$eval('.course-chip[aria-pressed="true"]', (chip) => chip.dataset.demoId));
  for (const [step, screen] of Object.entries(steps)) {
    await click("rail-" + step);
    await sleep(450);
    await shot(`11-${step}`);
    const hash = await page.evaluate(() => location.hash);
    check(`loop step ${step} renders at its address`, await page.evaluate((target) => window.__lyceum.getState().screen === target, screen) && (step === "course" ? /^#\/course\/[^/]+$/.test(hash) : hash.includes("/" + step)), hash);
  }

  // Track C's two new addresses: the course's term recap from History, and the judge's page from the Guide, signed in.
  await click("history-recap");
  await sleep(450);
  await shot("12-recap");
  check("the term recap renders at its address", await page.evaluate(() => window.__lyceum.getState().screen === "recap" && /^#\/course\/[^/]+\/recap$/.test(location.hash) && Boolean(document.querySelector('[data-demo-id="recap"]'))));
  await click("nav-guide");
  await sleep(300);
  await click("guide-judge");
  await sleep(450);
  await shot("13-judge");
  check("the judge's page renders signed in", await page.evaluate(() => location.hash === "#/judge" && Boolean(document.querySelector('[data-demo-id="judge-greeting"]'))));
  // Back to the course's History, where the path across the top leads on to Learn.
  await page.evaluate(() => (window.location.hash = "#/course/" + window.__lyceum.getState().selectedSubjectId + "/history"));
  await sleep(450);

  // The real upload pipeline on a sample file, from Learn (xlsx parses in-browser
  // here, since there is no api server: the fallback path under test).
  await click("rail-learn");
  await sleep(300);
  await click("sample-results");
  await page.waitForSelector('[data-demo-id="upload-confirm"]', { timeout: 15000 });
  await shot("20-upload-review");
  await click("upload-confirm");
  await sleep(500);
  const receipt = await page.$('[data-demo-id="upload-receipt"]');
  check("sample results file files end to end", Boolean(receipt));
  await shot("21-upload-receipt");

  // Tier 2: the OBE course report, saved as printed, on CS310's results filed under the loop's term as the tour files them;
  // and the student's survey address, which renders outside the shell and, with no collector behind a short link, says so.
  const term = "2026/2027 semester 1";
  await page.evaluate(() => (window.location.hash = "#/course/CS310"));
  await page.waitForSelector('[data-demo-id="course-term"]', { timeout: 8000 });
  await page.click('[data-demo-id="course-term"]', { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type('[data-demo-id="course-term"]', term);
  await click("course-term-save");
  await sleep(300);
  await page.evaluate(() => (window.location.hash = "#/course/CS310/learn"));
  await page.waitForSelector('[data-demo-id="sample-results"]', { timeout: 8000 });
  await click("sample-results");
  await page.waitForSelector('[data-demo-id="upload-confirm"]', { timeout: 15000 });
  await page.click('[data-demo-id="upload-term"]', { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type('[data-demo-id="upload-term"]', term);
  await click("upload-confirm");
  await page.waitForSelector('[data-demo-id="obe-live"]', { timeout: 10000 });
  check("the OBE course report renders from the filed results", await page.evaluate(() => /at 55 or above/i.test(document.querySelector('[data-demo-id="obe-live"]')?.textContent ?? "") && document.querySelectorAll('[data-demo-id="obe-live"] tbody tr').length > 0));
  await click("obe-save");
  await sleep(300);
  check("the OBE course report saves as printed", await page.evaluate(() => window.__lyceum.getState().obeReports.length === 1));
  await page.evaluate(() => (window.location.hash = "#/survey/t/" + "A".repeat(22)));
  await page.waitForSelector('[data-demo-id="survey-page"]', { timeout: 8000 });
  await sleep(800);
  await shot("22-survey-page");
  check("the student's survey address renders alone, and says when its collector is not there", await page.evaluate(() => !document.querySelector(".app-header") && /could not be loaded/i.test(document.body.innerText)));
  await page.evaluate(() => (window.location.hash = "#/course/" + window.__lyceum.getState().selectedSubjectId + "/learn"));
  await sleep(450);

  // Tier 3: the week 7 sample quiz on Teach, the programme wall on Courses, and the booth's kiosk, signed in, left again so
  // its idle return does not follow the rest of the walk.
  await page.evaluate(() => (window.location.hash = "#/course/CS310/teach"));
  await page.waitForSelector('[data-demo-id^="session-items-list-"]', { timeout: 8000 });
  check("the week 7 sample quiz shows its ten items on Teach", await page.evaluate(() => [...document.querySelectorAll('[data-demo-id^="session-items-list-"]')]
    .some((list) => list.querySelectorAll('[data-demo-id^="item-"]:not([data-demo-id^="item-editor-"])').length === 10)));
  await page.evaluate(() => (window.location.hash = "#/courses"));
  await page.waitForSelector('[data-demo-id="programme-heat"]', { timeout: 8000 });
  check("the programme wall shows every course of the programme, and the matrix only the recorded outline", await page.evaluate(() =>
    document.querySelectorAll('[data-demo-id="wall-rings"] > li').length === window.__lyceum.getState().programme.subjectIds.length
    && document.querySelectorAll('[data-demo-id="programme-heat"] td.heat-none').length === window.__lyceum.getState().programme.subjectIds.length - 1));
  await page.evaluate(() => (window.location.hash = "#/kiosk"));
  await page.waitForSelector('[data-demo-id="kiosk"]', { timeout: 8000 });
  await page.waitForFunction(() => document.querySelector('[data-demo-id="kiosk-film"]') || /not on this laptop/.test(document.querySelector('[data-demo-id="kiosk-film-missing"]')?.textContent ?? ""), { timeout: 8000 });
  await shot("23-kiosk");
  check("the kiosk renders bare, Tualang resting, with its film or the line saying it is not on this laptop", await page.evaluate(() => !document.querySelector(".app-header")
    && Boolean(document.querySelector('[data-demo-id="kiosk-touch"]')) && sessionStorage.getItem("lyceum.kiosk") === "on"));
  await click("kiosk-leave");
  await page.waitForSelector('[data-demo-id="judge-greeting"]', { timeout: 8000 });
  check("leaving kiosk mode ends it", await page.evaluate(() => sessionStorage.getItem("lyceum.kiosk") === null));
  await page.evaluate(() => (window.location.hash = "#/course/CS310/learn"));
  await sleep(450);

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

// The repository tracks only some of these captures (docs/decisions.md, A4); the rest this run wrote are deleted.
const tracked = new Set(spawnSync("git", ["ls-files", "docs/screenshots"], { encoding: "utf8" }).stdout.split("\n").filter(Boolean));
if (tracked.size) for (const f of readdirSync("docs/screenshots")) if (!tracked.has("docs/screenshots/" + f)) unlinkSync(join("docs/screenshots", f));

console.log(failed === 0 ? "\nWALK OK" : `\n${failed} checks failed`);
process.exit(failed === 0 ? 0 : 1);
