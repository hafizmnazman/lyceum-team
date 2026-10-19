// Isolated browser; external requests blocked. Exercises actual lecturer actions.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { preview } from "vite";
import puppeteer from "puppeteer-core";

const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
assert.ok(executablePath, "An installed Chrome or Edge is required");
const output = mkdtempSync(join(tmpdir(), "lyceum-workspace-"));
console.log("Browser artifacts: " + output);
const origin = "http://127.0.0.1:4212";
const server = await preview({ configFile: false, preview: { host: "127.0.0.1", port: 4212, strictPort: true } });
let browser;
try {
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 15000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on("request", (request) => { const url = request.url(); void (url.startsWith(origin + "/") || url.startsWith("data:") || url.startsWith("blob:") ? request.continue() : request.abort()); });
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: output });
  const selector = (id) => '[data-demo-id="' + id + '"]';
  const click = async (id) => { await page.waitForSelector(selector(id), { visible: true }); await page.click(selector(id)); };
  const textIncludes = (text) => page.waitForFunction((value) => document.body.innerText.includes(value), {}, text);
  const clickText = async (text) => {
    const handle = await page.evaluateHandle((value) => [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === value && button.getClientRects().length), text);
    assert.ok(handle.asElement(), "Missing button " + text);
    await handle.asElement().click(); await handle.dispose();
  };
  const fillLabel = async (label, value) => {
    const id = await page.evaluate((value) => [...document.querySelectorAll("label")].find((label) => label.textContent === value)?.htmlFor, label);
    assert.ok(id, "Missing label " + label);
    await page.type('[id="' + id + '"]', value);
  };
  async function noPageOverflow(label) {
    const sizes = await page.evaluate(() => ({ viewport: window.innerWidth, body: document.documentElement.scrollWidth, main: document.querySelector("main").clientWidth, content: document.querySelector("main").scrollWidth }));
    assert.ok(sizes.body <= sizes.viewport + 1 && sizes.content <= sizes.main + 1, label + " overflow " + JSON.stringify(sizes));
  }

  await page.goto(origin, { waitUntil: "networkidle0" });
  await click("login-P-SOBRI");
  await textIncludes("Your work queue");
  await click("nav-courses");
  await page.type(selector("course-search"), "no matching course");
  await textIncludes("No courses match");
  await clickText("Clear filters");
  await click("course-open-CS310");
  await textIncludes("Current learning outcomes");
  assert.equal(await page.$eval(selector("tab-overview"), (e) => e.getAttribute("aria-selected")), "true");
  await page.focus(selector("tab-overview"));
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.$eval(selector("tab-curriculum"), (e) => e.getAttribute("aria-selected")), "true");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.$eval(selector("tab-evidence"), (e) => e.getAttribute("aria-selected")), "true");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.$eval(selector("tab-plan"), (e) => e.getAttribute("aria-selected")), "true");
  console.log("PASS course without a proposal has an overview and keyboard-accessible teaching plan");

  await click("plan-add");
  await page.type(selector("session-topic"), "Designing clear visual encodings");
  page.once("dialog", (dialog) => void dialog.dismiss());
  await click("nav-inbox");
  assert.equal(await page.evaluate(() => window.__lyceum.getState().screen), "studio");
  assert.equal(await page.$eval(selector("session-topic"), (e) => e.value), "Designing clear visual encodings");
  await page.select(selector("session-status"), "ready");
  await click("session-save");
  await textIncludes("Link at least one CLO");
  assert.equal(await page.evaluate(() => window.__lyceum.getState().teachingPlans.length), 0);
  await click("session-clo-CLO5");
  await page.type(selector("session-activity"), "Critique two charts in pairs and redesign the weaker example.");
  await page.type(selector("session-check"), "Explain one justified encoding choice in an exit ticket.");
  await page.type(selector("session-resources"), "Slide brief: misleading axes, worked comparison, student redesign. Sources to review.");
  const focus = await page.$eval(selector("session-resources"), (e) => ({ label: e.labels.length, outline: getComputedStyle(e).outlineStyle, description: !!document.getElementById(e.getAttribute("aria-describedby")) }));
  assert.ok(focus.label > 0 && focus.description);
  await page.keyboard.press("Tab");
  await page.keyboard.down("Shift"); await page.keyboard.press("Tab"); await page.keyboard.up("Shift");
  assert.equal(await page.$eval(selector("session-resources"), (e) => getComputedStyle(e).outlineStyle), "solid");
  await click("session-save");
  await page.waitForFunction(() => window.__lyceum.getState().teachingPlans[0]?.sessions.length === 1);
  await page.reload({ waitUntil: "networkidle0" });
  assert.equal(await page.evaluate(() => window.__lyceum.getState().teachingPlans[0].sessions[0].topic), "Designing clear visual encodings");
  await click("tab-plan");
  await clickText("Edit course notes");
  await fillLabel("Teaching term", "September 2026");
  await fillLabel("Course notes", "Students have completed the introductory statistics module.");
  await clickText("Save course notes");
  await textIncludes("Course notes saved.");
  await click("plan-export");
  const file = join(output, "CS310-teaching-plan.md");
  for (let tries = 0; tries < 40 && !existsSync(file); tries++) await new Promise((r) => setTimeout(r, 100));
  assert.ok(existsSync(file), "Teaching plan download did not complete");
  const exported = readFileSync(file, "utf8");
  assert.ok(exported.includes("September 2026") && exported.includes("exit ticket") && exported.includes("misleading axes"));
  await page.screenshot({ path: join(output, "teaching-plan-desktop.png"), fullPage: true });
  console.log("PASS readiness validation, labelled fields, visible focus, refresh persistence, course notes and Markdown export");

  await click("nav-inbox");
  await textIncludes("Continue teaching plan");
  await page.screenshot({ path: join(output, "home-desktop.png"), fullPage: true });
  await page.click('[aria-label="Open proposal for CS220"]');
  await page.waitForSelector(selector("mode-hybrid"), { visible: true });
  assert.equal(await page.$eval(selector("tab-content"), (e) => e.getAttribute("aria-selected")), "true");
  await click("nav-inbox");
  await click("home-resume");
  assert.equal(await page.$eval(selector("tab-plan"), (e) => e.getAttribute("aria-selected")), "true");
  await clickText("Edit session");
  await page.select(selector("session-status"), "delivered");
  await click("session-save");
  await page.waitForFunction(() => window.__lyceum.getState().teachingPlans[0].sessions[0].status === "delivered");
  await click("nav-guide");
  await textIncludes("What has not been built yet");
  await clickText("All roles");
  assert.equal(await page.$$(".guide-entry").then((entries) => entries.length), 15);
  await page.type('input[type="search"]', "slide");
  assert.ok(await page.$$(".guide-entry").then((entries) => entries.length) > 0);
  console.log("PASS resume path, session updates and all-role section guide");

  await page.setViewport({ width: 390, height: 844 });
  await noPageOverflow("mobile guide");
  await page.click('[aria-label="Toggle navigation"]');
  await click("nav-inbox");
  await noPageOverflow("mobile home");
  await page.screenshot({ path: join(output, "home-mobile.png"), fullPage: true });
  await click("home-resume");
  await noPageOverflow("mobile teaching plan");
  await click("tab-overview");
  await noPageOverflow("mobile course overview");
  await page.waitForFunction(() => window.__lyceum.getState().persistenceStatus === "saved");
  await page.screenshot({ path: join(output, "course-mobile.png"), fullPage: true });
  await page.setViewport({ width: 320, height: 800 });
  await noPageOverflow("320px course overview");
  console.log("PASS 390px and 320px layouts with no page overflow");

  await page.setViewport({ width: 1440, height: 1000 });
  await click("account-menu"); await click("switch-P-TAN");
  const courseOptions = await page.$$eval('[aria-label="Choose course"] option', (options) => options.map((o) => o.value));
  assert.deepEqual(courseOptions, ["CS310", "CS340"]);
  await page.evaluate(() => { Storage.prototype.setItem = function () { throw new DOMException("Storage quota test", "QuotaExceededError"); }; });
  await click("tab-plan");
  await page.waitForFunction(() => window.__lyceum.getState().persistenceStatus === "unavailable");
  await textIncludes("Browser storage is unavailable.");
  assert.equal(await page.evaluate(() => window.__lyceum.getState().teachingPlans[0].sessions.length), 1);
  console.log("PASS role-scoped course selection and visible storage failure without losing in-memory work");

  const blocked = await browser.newPage();
  blocked.on("pageerror", (e) => errors.push(String(e)));
  await blocked.setRequestInterception(true);
  blocked.on("request", (request) => void (request.url().startsWith(origin + "/") ? request.continue() : request.abort()));
  await blocked.evaluateOnNewDocument(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Storage is blocked", "SecurityError"); } });
  });
  await blocked.goto(origin, { waitUntil: "networkidle0" });
  await blocked.click(selector("login-P-SOBRI"));
  await blocked.waitForFunction(() => window.__lyceum.getState().persistenceStatus === "unavailable");
  assert.ok(await blocked.evaluate(() => document.body.innerText.includes("Browser storage is unavailable.")));
  await blocked.close();
  console.log("PASS browser storage blocked at load still opens a usable workspace with a warning");
  assert.deepEqual(errors, []);
  console.log("PASS zero page errors");
  console.log("Screenshots and exported plan: " + output);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
