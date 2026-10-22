// Run after a production build. Uses an isolated headless browser, blocks
// external requests, and saves review screenshots in an OS temporary directory.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { preview } from "vite";
import puppeteer from "puppeteer-core";
import { REMAINING_WORK } from "../src/app/sectionGuides.ts";
import { PROOF } from "../src/data/proof.ts";

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

  // The judge's page (depth plan Section 9.1), reached from the landing page signed out: one greeting, three ways in, the
  // register's figures as written (the exact values for a screen reader at once, the shown ones once the count ends), and the
  // not-built card word for word from the Guide's list, at 1440 and 320 px.
  await click("index-judge");
  await page.waitForSelector('[data-demo-id="judge-greeting"]');
  const judge = await page.evaluate(() => ({
    greeting: document.querySelector('[data-demo-id="judge-greeting"]').textContent,
    buttons: ["judge-walk", "judge-compare", "judge-door"].map((id) => Boolean(document.querySelector(`[data-demo-id="${id}"]`))),
    proof: [...document.querySelectorAll('[data-demo-id^="judge-proof-"] .stat-value > .sr-only')].map((e) => e.textContent),
    remaining: [...document.querySelectorAll('[data-demo-id="judge-not-built"] dl > div')].map((d) => [d.querySelector("dt").textContent, d.querySelector("dd").textContent]),
    notice: document.querySelectorAll('[aria-label="Prototype data limitations"]').length,
  }));
  assert.ok(judge.greeting.endsWith("Six steps, one course, one term. Walk with me, or watch."));
  assert.deepEqual(judge.buttons, [true, true, true]);
  assert.deepEqual(judge.proof, PROOF.map((p) => p.value));
  await page.waitForFunction((values) => [...document.querySelectorAll('[data-demo-id^="judge-proof-"] .stat-value > [aria-hidden]')].map((e) => e.textContent).join("|") === values.join("|"),
    { timeout: 5000 }, PROOF.map((p) => p.value));
  assert.deepEqual(judge.remaining, REMAINING_WORK.map((r) => [r.title, r.detail]));
  assert.equal(judge.notice, 0);
  await page.screenshot({ path: join(output, "judge.png"), fullPage: true });
  await page.setViewport({ width: 320, height: 800 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, "the judge's page fits 320 px");
  await page.screenshot({ path: join(output, "judge-320.png"), fullPage: true });
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(origin + "/#/index", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.innerText.includes("Course decisions, with receipts"));
  console.log("PASS the judge's page: one greeting, three ways in, the register's figures and the not-built list word for word, at 1440 and 320 px");

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
