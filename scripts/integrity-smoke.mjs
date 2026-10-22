// Run after a production build. Uses an isolated headless browser, blocks
// external requests, and saves review screenshots in an OS temporary directory.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { preview } from "vite";
import puppeteer from "puppeteer-core";

const executablePath = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
assert.ok(executablePath, "Chrome or Edge must be installed");

const output = mkdtempSync(join(tmpdir(), "lyceum-integrity-"));
const origin = "http://127.0.0.1:4211";
const server = await preview({
  configFile: false,
  preview: { host: "127.0.0.1", port: 4211, strictPort: true },
});
let browser;
try {
  console.log("Launching isolated headless browser");
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 15000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (url.startsWith(`${origin}/`) || url.startsWith("data:") || url.startsWith("blob:")) {
      void request.continue();
    } else {
      void request.abort();
    }
  });
  const click = async (id) => {
    const selector = `[data-demo-id="${id}"]`;
    await page.waitForSelector(selector, { timeout: 8000 });
    await page.click(selector);
  };

  await page.goto(origin, { waitUntil: "networkidle0" });
  await click("view-index");
  await page.waitForFunction(() => document.body.innerText.includes("Course decisions, with receipts"));
  // The public landing page carries no synthetic figure, so it carries no prototype-data notice.
  assert.equal(await page.$$eval('[aria-label="Prototype data limitations"]', (elements) => elements.length), 0);
  assert.ok(!(await page.evaluate(() => document.body.innerText.includes("synthetic fixture"))));
  assert.ok(await page.evaluate(() => document.body.innerText.includes("Not built yet")));
  await page.screenshot({ path: join(output, "landing.png"), fullPage: true });
  console.log("PASS public landing page: no synthetic figures, limits stated, no notice");

  await click("index-signin");
  await click("login-P-SOBRI");
  // The notice shows only where synthetic data is on screen: the research sandbox.
  const noticeScreens = new Set(["acceptance", "trends", "backtest", "dataroom", "index"]);
  // The course workspace and the upload screen are reached through the course's loop (Course and Learn),
  // entered from the sidebar's selected course chip; the sandbox screens sit in a fold that opens on click.
  const enterCourse = async () => click(await page.$eval('.course-chip[aria-pressed="true"]', (chip) => chip.dataset.demoId));
  const go = async (screen) => {
    if (screen === "studio") return enterCourse();
    if (screen === "learn") { await enterCourse(); return click("rail-learn"); }
    if (noticeScreens.has(screen) && !(await page.$eval(".nav-fold", (fold) => fold.open))) await click("nav-sandbox");
    return click(`nav-${screen}`);
  };
  for (const screen of ["courses", "studio", "acceptance", "trends", "backtest", "dataroom", "office", "evaluation", "index", "learn", "inbox"]) {
    await go(screen);
    await page.waitForFunction((target) => window.__lyceum?.getState().screen === target, {}, screen);
    assert.equal(await page.$$eval('[aria-label="Prototype data limitations"]', (elements) => elements.length), noticeScreens.has(screen) ? 1 : 0, screen);
    if (screen === "index") {
      await click("index-CS310");
      await page.waitForFunction(() => document.body.innerText.includes("sources disagree"));
      await page.waitForFunction(() => [...document.querySelectorAll(".fade-in")].every((element) => getComputedStyle(element).opacity === "1"));
      assert.ok(await page.evaluate(() => document.body.innerText.includes("synthetic fixture")));
      await page.screenshot({ path: join(output, "relevance-index-sandbox.png"), fullPage: true });
    }
    if (screen === "dataroom") {
      assert.ok(await page.evaluate(() => document.body.innerText.includes("illustrative records")));
      await page.screenshot({ path: join(output, "data-room.png"), fullPage: true });
    }
    if (screen === "learn") {
      assert.ok(await page.evaluate(() => document.body.innerText.includes("No learning gain is claimed; the benchmark has not been run.")), "Learn says what it cannot claim");
      await page.screenshot({ path: join(output, "learn.png"), fullPage: true });
    }
    if (screen === "office") {
      assert.ok(await page.evaluate(() => document.body.innerText.includes("step by step")));
      await page.screenshot({ path: join(output, "how-it-works.png"), fullPage: true });
    }
    if (screen === "evaluation") {
      await page.waitForFunction(() => document.body.innerText.includes("Requirement scan benchmark"));
      await page.screenshot({ path: join(output, "evaluation.png"), fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  console.log("PASS eleven signed-in screens, notice only on sandbox screens, fixture labels kept, zero page errors");
  console.log(`Screenshots: ${output}`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
