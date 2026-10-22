// Isolated browser; external requests blocked. Exercises actual lecturer actions.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { preview } from "vite";
import puppeteer from "puppeteer-core";
import JSZip from "jszip";
import { SECTION_GUIDES } from "../src/app/sectionGuides.ts";
import { PROOF } from "../src/data/proof.ts";
import { WALK } from "../src/demo/walk.ts";

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
  await textIncludes("Briefs waiting for a decision");
  await click("nav-courses");
  await page.type(selector("course-search"), "no matching course");
  await textIncludes("No courses match");
  await clickText("Clear filters");
  await click("course-open-CS310");
  await textIncludes("The course record");
  assert.equal(await page.$eval(selector("rail-course"), (e) => e.getAttribute("aria-current")), "page");
  assert.equal(await page.evaluate(() => location.hash), "#/course/CS310");
  // The step path is reached by keyboard: Tab walks the steps in order and Enter opens one.
  await page.focus(selector("rail-course"));
  for (const step of ["watch", "report", "decide", "update", "teach"]) {
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-demo-id")), "rail-" + step);
  }
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.hash === "#/course/CS310/teach");
  assert.equal(await page.$eval(selector("rail-teach"), (e) => e.getAttribute("aria-current")), "page");
  console.log("PASS course without a proposal has an overview and a keyboard-accessible step path to the teaching plan");

  await click("plan-add");
  await page.type(selector("session-topic"), "Designing clear visual encodings");
  page.once("dialog", (dialog) => void dialog.dismiss());
  await click("nav-inbox");
  assert.equal(await page.evaluate(() => window.__lyceum.getState().screen), "studio");
  assert.equal(await page.$eval(selector("session-topic"), (e) => e.value), "Designing clear visual encodings");
  await page.select(selector("session-status"), "ready");
  await click("session-save");
  await textIncludes("Link at least one CLO");
  assert.equal(await page.evaluate(() => window.__lyceum.getState().teachingPlans.find((p) => p.subjectId === "CS310").sessions.filter((s) => !s.sample).length), 0, "no session of the lecturer's own yet, beside the sample ones");
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
  await page.waitForFunction(() => window.__lyceum.getState().teachingPlans.find((p) => p.subjectId === "CS310").sessions.filter((s) => !s.sample).length === 1);
  await page.reload({ waitUntil: "networkidle0" });
  assert.equal(await page.evaluate(() => window.__lyceum.getState().teachingPlans.find((p) => p.subjectId === "CS310").sessions.filter((s) => !s.sample)[0].topic), "Designing clear visual encodings");
  await click("rail-teach");
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
  // The old proposal chain lives in the illustrative sandbox, folded away in the sidebar, not in the loop.
  await click("nav-sandbox");
  await click("nav-proposal");
  await page.waitForFunction(() => document.querySelector(".page-eyebrow")?.textContent === "Sandbox · illustrative");
  await page.select('[aria-label="Choose course for the proposal"]', "CS220");
  await page.waitForSelector(selector("mode-hybrid"), { visible: true });
  await page.select('[aria-label="Choose course for the proposal"]', "CS310");
  await click("nav-inbox");
  await click("home-resume");
  await page.waitForFunction(() => location.hash === "#/course/CS310/teach");
  assert.equal(await page.$eval(selector("rail-teach"), (e) => e.getAttribute("aria-current")), "page");
  await clickText("Edit session");
  await page.select(selector("session-status"), "delivered");
  await click("session-save");
  await page.waitForFunction(() => window.__lyceum.getState().teachingPlans.find((p) => p.subjectId === "CS310").sessions.filter((s) => !s.sample)[0].status === "delivered");
  await click("nav-guide");
  await textIncludes("What has not been built yet");
  await clickText("All roles");
  assert.equal(await page.$$(".guide-entry").then((entries) => entries.length), SECTION_GUIDES.length, "every section guide, the kiosk's included");
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
  await click("strip-course");
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
  await click("rail-teach");
  await page.waitForFunction(() => window.__lyceum.getState().persistenceStatus === "unavailable");
  await textIncludes("Browser storage is unavailable.");
  assert.equal(await page.evaluate(() => window.__lyceum.getState().teachingPlans.find((p) => p.subjectId === "CS310").sessions.filter((s) => !s.sample).length), 1);
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

  // The judge's walk (depth plan Section 9.1): from the judge's page signed out, every stop by keyboard on the sample
  // workspace, a spotlight at each, the host's line at the first and the last stop only, at 1440 and 320 px; Esc leaves.
  const walkPage = await browser.newPage();
  walkPage.on("pageerror", (e) => errors.push(String(e)));
  walkPage.on("dialog", (dialog) => void dialog.accept());
  await walkPage.setRequestInterception(true);
  walkPage.on("request", (request) => void (request.url().startsWith(origin + "/") ? request.continue() : request.abort()));
  for (const [width, height] of [[1440, 1000], [320, 800]]) {
    await walkPage.setViewport({ width, height });
    await walkPage.goto(origin + "/#/judge", { waitUntil: "networkidle0" });
    await walkPage.evaluate(() => localStorage.clear());
    await walkPage.goto(origin + "/#/judge", { waitUntil: "networkidle0" });
    await walkPage.click(selector("judge-walk"));
    await walkPage.waitForSelector(selector("walk-card"), { timeout: 15000 });
    const seen = [];
    for (let n = 1; n <= WALK.length; n++) {
      await walkPage.waitForFunction((k, total) => document.querySelector('[data-demo-id="walk-count"]')?.textContent === "Stop " + k + " of " + total, { timeout: 15000 }, n, WALK.length);
      await walkPage.waitForSelector(".walk-spotlight", { timeout: 15000 });
      seen.push(await walkPage.evaluate(() => ({ hash: location.hash, host: Boolean(document.querySelector('[data-demo-id="walk-host-line"]')),
        focus: document.activeElement?.getAttribute("data-demo-id"), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })));
      await walkPage.keyboard.press("ArrowRight");
    }
    await walkPage.waitForFunction(() => !document.querySelector('[data-demo-id="walk-card"]'));
    assert.deepEqual(seen.map((s) => s.hash), WALK.map((s) => s.route), "every stop opened its route at " + width);
    assert.deepEqual(seen.map((s) => s.host), WALK.map((_, i) => i === 0 || i === WALK.length - 1), "the host spoke at the two ends only");
    assert.ok(seen.every((s) => s.focus === "walk-next" && s.overflow === 0), "Next holds the focus and nothing overflows at " + width);
    await walkPage.screenshot({ path: join(output, "walk-end-" + width + ".png") });
  }
  await walkPage.click(selector("journey-recap"));
  await walkPage.waitForSelector(selector("recap"));
  assert.equal(await walkPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, "the recap fits 320 px");
  await walkPage.goto(origin + "/#/judge", { waitUntil: "networkidle0" });
  await walkPage.click(selector("judge-walk"));
  await walkPage.waitForFunction(() => document.querySelector('[data-demo-id="walk-count"]')?.textContent?.startsWith("Stop 1 "), { timeout: 15000 });
  await walkPage.keyboard.press("ArrowRight");
  await walkPage.waitForFunction(() => document.querySelector('[data-demo-id="walk-count"]')?.textContent?.startsWith("Stop 2 "), { timeout: 15000 });
  await walkPage.keyboard.press("Escape");
  await walkPage.waitForFunction(() => !document.querySelector('[data-demo-id="walk-card"]'));
  assert.equal(await walkPage.evaluate(() => location.hash), WALK[1].route, "Esc leaves the walk where it stood");
  // The course file (depth plan Section 4.4), downloaded from CS310 on the sample workspace: its manifest names what has shipped.
  const walkCdp = await walkPage.createCDPSession();
  await walkCdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: output });
  await walkPage.setViewport({ width: 1440, height: 1000 });
  await walkPage.evaluate(() => { location.hash = "#/course/CS310"; });
  await walkPage.waitForSelector(selector("course-file-export"), { visible: true });
  await walkPage.click(selector("course-file-export"));
  const zipPath = join(output, "CS310-course-file.zip");
  for (let tries = 0; tries < 300 && !existsSync(zipPath); tries++) await new Promise((r) => setTimeout(r, 200));
  assert.ok(existsSync(zipPath), "the course file downloaded");
  await new Promise((r) => setTimeout(r, 500));
  const courseFile = await JSZip.loadAsync(readFileSync(zipPath));
  const manifest = await courseFile.file("MANIFEST.md").async("string");
  for (const [item, status] of [["the quiz items", "sample"], ["The OBE course report with its CQI note", "not included"], ["the lab sheets", "sample"], ["the project brief", "sample"], ["the teaching packs", "sample"], ["Assessment rubrics", "sample"], ["Decisions and versions", "present"], ["The external examiner's report", "not included"]])
    assert.ok(manifest.includes(item + " | " + status + " |"), "the manifest marks " + item + " " + status);
  assert.ok(manifest.includes("No accreditation is claimed.") && manifest.includes("A demo course at UTP"));
  const names = Object.keys(courseFile.files).filter((n) => !courseFile.files[n].dir);
  assert.equal(names.filter((n) => n.startsWith("packs/") && n.endsWith(".pptx")).length, 15, "fourteen sample packs and the lecturer's own");
  assert.equal(names.filter((n) => n.startsWith("lab-sheets/")).length, 3);
  await walkPage.close();
  console.log("PASS the judge's walk by keyboard on the sample workspace at 1440 and 320 px, the host at the two ends, Esc leaves, the recap from Home, and the course file with its manifest");
  // The survey's booth round trip (depth plan Section 7.2): the local API on a spare port and the built app served with
  // its proxy; the lecturer prepares and opens the Course Outcome Survey, a phone at 320 px answers through the short link
  // the QR carries, and the lecturer collects one response from one device, never counted as the course's evidence.
  const api = spawn(process.execPath, ["server/index.ts"], { env: { ...process.env, PORT: "8792" }, stdio: ["ignore", "pipe", "pipe"] });
  let boothServer;
  try {
    await new Promise((resolve, reject) => { api.stdout.on("data", (d) => { if (String(d).includes("lyceum api")) resolve(); }); api.on("exit", () => reject(new Error("the local API exited"))); });
    const boothOrigin = "http://127.0.0.1:4213";
    boothServer = await preview({ configFile: false, preview: { host: "127.0.0.1", port: 4213, strictPort: true, proxy: { "/api": { target: "http://127.0.0.1:8792", changeOrigin: true } } } });
    const open = async (width, height, mobile) => {
      const p = await browser.newPage();
      await p.setViewport({ width, height, isMobile: mobile, hasTouch: mobile });
      p.on("pageerror", (e) => errors.push("booth: " + String(e)));
      await p.setRequestInterception(true);
      p.on("request", (request) => { const url = request.url(); void (url.startsWith(boothOrigin + "/") || url.startsWith("data:") || url.startsWith("blob:") ? request.continue() : request.abort()); });
      return p;
    };
    const lecturer = await open(1440, 1000, false);
    await lecturer.goto(boothOrigin, { waitUntil: "networkidle0" });
    await lecturer.click(selector("login-P-SOBRI"));
    await lecturer.waitForSelector(selector("nav-courses"), { visible: true });
    await lecturer.evaluate(() => { location.hash = "#/course/CS310"; });
    await lecturer.waitForSelector(selector("course-term"), { visible: true });
    await lecturer.type(selector("course-term"), "2026/2027 semester 1");
    await lecturer.click(selector("course-term-save"));
    await lecturer.evaluate(() => { location.hash = "#/course/CS310/learn"; });
    await lecturer.waitForSelector(selector("surveys-create"), { visible: true });
    await lecturer.click(selector("surveys-create"));
    const cosId = await lecturer.evaluate(() => window.__lyceum.getState().surveys.find((x) => !x.sample && x.kind === "course-outcome").id);
    await lecturer.waitForSelector(selector("survey-class-" + cosId), { visible: true });
    await lecturer.type(selector("survey-class-" + cosId), "38");
    await lecturer.click(selector("survey-open-" + cosId));
    await lecturer.waitForSelector(selector("survey-link-" + cosId) + " img.booth-qr", { timeout: 15000 });
    const link = await lecturer.$eval(selector("survey-link-" + cosId) + " .booth-url", (e) => e.textContent);
    assert.match(link, /#\/survey\/t\/[A-Za-z0-9_-]{22}$/, "the QR carries the short link");
    const phone = await open(320, 700, true);
    await phone.goto(boothOrigin + "/" + link.split("/").slice(3).join("/"), { waitUntil: "networkidle0" });
    await phone.waitForSelector(selector("survey-submit"), { visible: true });
    assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && !document.querySelector(".app-header")), "the student page alone, no horizontal scroll at 320 px");
    assert.ok(await phone.evaluate(() => /nothing you submit identifies you/i.test(document.body.innerText) && /synthetic/i.test(document.body.innerText)), "the consent line and the demo line");
    await phone.click(selector("survey-Q1-4"));
    await phone.click(selector("survey-Q2-5"));
    await phone.click(selector("survey-submit"));
    await phone.waitForSelector(selector("survey-done"), { timeout: 10000 });
    await phone.reload({ waitUntil: "networkidle0" });
    await phone.waitForSelector(selector("survey-done"), { timeout: 10000 });
    await phone.close();
    await lecturer.bringToFront();
    await lecturer.click(selector("survey-collect-" + cosId));
    await lecturer.waitForSelector(selector("booth-" + cosId), { timeout: 10000 });
    assert.match(await lecturer.$eval(selector("booth-" + cosId), (e) => e.textContent), /Booth responses: 1 from 1 device\./);
    const status = await lecturer.$eval(selector("survey-status-" + cosId), (e) => e.textContent);
    assert.ok(status.startsWith("0 responses (0 of 38, 0%)") && status.includes("the floor is 10") && status.includes("results open when grades are released"), "the booth answer never counts: " + status);
    console.log("PASS the survey's booth round trip: opened on Learn, answered from a 320 px phone through the short link, one answer per device, collected as 1 from 1 device and never counted");

    // D3b (depth plan Section 7.2): a campus's other ways in on the same survey. The document for Microsoft Forms downloads;
    // a Google Forms CSV imports with its repeat dropped; a phone on the paste way's link makes a code, and the code pasted
    // twice is read once.
    const lecturerCdp = await lecturer.createCDPSession();
    await lecturerCdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: output });
    await lecturer.click(selector("survey-docx-" + cosId));
    const docxPath = join(output, cosId + "-for-microsoft-forms.docx");
    for (let tries = 0; tries < 100 && !existsSync(docxPath); tries++) await new Promise((r) => setTimeout(r, 200));
    await new Promise((r) => setTimeout(r, 300));
    const docx = await JSZip.loadAsync(readFileSync(docxPath));
    assert.match(await docx.file("word/document.xml").async("string"), />1\. Q1\. I can /, "the document numbers the questions with their ids");
    const csvInput = await lecturer.$(selector("survey-import-" + cosId));
    await csvInput.uploadFile(join("public", "demo", "course-outcome-survey-google.csv"));
    await lecturer.waitForSelector(selector("survey-import-result-" + cosId), { timeout: 10000 });
    assert.equal(await lecturer.$eval(selector("survey-import-result-" + cosId), (e) => e.textContent),
      "Read as a Google Forms export: 31 responses imported from 32 rows; 1 repeated row dropped; dropped at import: Timestamp.");
    await lecturer.$eval(selector("paste-way-" + cosId), (d) => { d.open = true; });
    const pasteLink = await lecturer.$eval(selector("paste-link-" + cosId), (e) => e.value);
    const pastePhone = await open(320, 700, true);
    await pastePhone.goto(boothOrigin + "/" + pasteLink.split("/").slice(3).join("/"), { waitUntil: "networkidle0" });
    await pastePhone.waitForSelector(selector("survey-paste-warning"), { visible: true });
    assert.equal(await pastePhone.$eval(selector("survey-paste-warning"), (e) => e.textContent), "Not anonymous: the channel you paste it into identifies you.");
    await pastePhone.click(selector("survey-Q1-4"));
    await pastePhone.click(selector("survey-Q2-5"));
    await pastePhone.click(selector("survey-submit"));
    await pastePhone.waitForSelector(selector("survey-code"), { timeout: 10000 });
    const pasted = await pastePhone.$eval(selector("survey-code"), (e) => e.value);
    assert.match(pasted, /^LYC1-[A-Za-z0-9+$-]+$/, "the phone made a code and sent nothing");
    assert.ok(await pastePhone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the code fits a 320 px phone");
    await pastePhone.close();
    await lecturer.bringToFront();
    await lecturer.type(selector("paste-codes-" + cosId), "From the course page: " + pasted + "\nand again by email: " + pasted);
    await lecturer.click(selector("paste-read-" + cosId));
    await lecturer.waitForSelector(selector("paste-result-" + cosId), { timeout: 10000 });
    assert.equal(await lecturer.$eval(selector("paste-result-" + cosId), (e) => e.textContent), "2 codes read: 1 added, 1 repeated from a device already read.");
    assert.ok((await lecturer.$eval(selector("survey-status-" + cosId), (e) => e.textContent)).startsWith("32 responses (32 of 38, 84%)"), "the import and the paste count; the booth answer still does not");
    await lecturer.close();
    console.log("PASS a campus's other ways in: the Forms document downloaded, a Google Forms CSV imported with its repeat dropped, and a paste code made on a 320 px phone and read once from two pastes");
  } finally {
    api.kill();
    if (boothServer) await new Promise((resolve) => boothServer.httpServer.close(resolve));
  }

  // D6b (depth plan Section 9.1): the kiosk signed out, its film playing muted and paused when the render is on this laptop,
  // or its line saying it is not; a touch starts the walk without a question, and an idle visitor is back at the kiosk after
  // thirty seconds with the warning first; leaving kiosk mode ends it. Then the register's figures counted to their values on
  // the judge's page, and the programme wall on Courses at 1440 and 320 px.
  const kiosk = await browser.newPage();
  kiosk.on("pageerror", (e) => errors.push("kiosk: " + String(e)));
  const asked = [];
  kiosk.on("dialog", (dialog) => { asked.push(dialog.message()); void dialog.accept(); });
  await kiosk.setRequestInterception(true);
  kiosk.on("request", (request) => void (request.url().startsWith(origin + "/") ? request.continue() : request.abort()));
  await kiosk.bringToFront();
  await kiosk.setViewport({ width: 1440, height: 900 });
  await kiosk.goto(origin + "/#/kiosk", { waitUntil: "networkidle0" });
  await kiosk.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await kiosk.reload({ waitUntil: "networkidle0" });
  if (existsSync(join("dist", "media", "loop90.json"))) {
    await kiosk.waitForFunction(() => { const v = document.querySelector('[data-demo-id="kiosk-film"]'); return v && !v.paused && v.muted && v.loop; }, { timeout: 10000 });
    assert.match(await kiosk.$eval(".kiosk-film figcaption", (e) => e.textContent), /a capture of the real app in its demo mode, rendered \d{1,2} \w+ 20\d\d\. Silent here\./);
    await kiosk.click(selector("kiosk-pause"));
    assert.equal(await kiosk.$eval(selector("kiosk-film"), (v) => v.paused), true, "Pause stops the film");
  } else {
    await kiosk.waitForFunction(() => /The film is not on this laptop\./.test(document.querySelector('[data-demo-id="kiosk-film-missing"]')?.textContent ?? ""), { timeout: 10000 });
  }
  assert.equal(await kiosk.$(selector("play-demo")), null, "the kiosk offers the walk alone");
  await kiosk.click(selector("kiosk-touch"));
  await kiosk.waitForSelector(selector("walk-card"), { timeout: 15000 });
  assert.deepEqual(asked, [], "a touch at the kiosk walks the loop without a question");
  const idleFrom = Date.now();
  await kiosk.waitForSelector(selector("kiosk-idle"), { timeout: 25000 });
  assert.match(await kiosk.$eval(selector("kiosk-idle"), (e) => e.textContent), /^Back to the start in (10|9) s\. Touch anywhere to stay\.$/);
  await kiosk.waitForFunction(() => location.hash === "#/kiosk" && document.querySelector('[data-demo-id="kiosk"]') && !document.querySelector('[data-demo-id="walk-card"]'), { timeout: 15000 });
  const idleSeconds = (Date.now() - idleFrom) / 1000;
  assert.ok(idleSeconds >= 29 && idleSeconds < 34, "back at the kiosk after thirty idle seconds, not " + idleSeconds);
  await kiosk.click(selector("kiosk-leave"));
  await kiosk.waitForSelector(selector("judge-hero"));
  assert.equal(await kiosk.evaluate(() => sessionStorage.getItem("lyceum.kiosk")), null, "leaving kiosk mode ends the idle return");
  await kiosk.$eval(selector("judge-proof-proof-checks"), (e) => e.scrollIntoView({ block: "center" }));
  await kiosk.waitForFunction((values) => { const shown = [...document.querySelectorAll(".stat-tile .stat-value > [aria-hidden]")].map((e) => e.textContent); return shown.join("|") === values.join("|"); },
    { timeout: 5000 }, PROOF.map((p) => p.value));
  assert.deepEqual(await kiosk.$$eval(".stat-tile .stat-value > .sr-only", (els) => els.map((e) => e.textContent)), PROOF.map((p) => p.value), "a screen reader reads the exact values");
  for (const [width, height] of [[1440, 1000], [320, 800]]) {
    await kiosk.setViewport({ width, height });
    await kiosk.evaluate(() => { location.hash = "#/courses"; });
    await kiosk.waitForSelector(selector("programme-heat"), { timeout: 10000 });
    const wall = await kiosk.evaluate(() => ({
      rings: [...document.querySelectorAll('[data-demo-id="wall-rings"] > li')].map((li) => li.getAttribute("data-demo-id") + (li.classList.contains("is-closed") ? " closed" : "")),
      none: [...document.querySelectorAll('[data-demo-id="programme-heat"] td.heat-none')].map((td) => td.textContent),
      cs310: [...document.querySelectorAll('[data-demo-id="programme-heat"] tbody tr')].find((tr) => tr.querySelector("th")?.textContent.startsWith("CS310"))?.querySelectorAll("td.heat-cell.is-h").length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    assert.equal(wall.rings.length, 8, "every course of the programme as a ring at " + width);
    assert.ok(wall.rings.includes("wall-ring-CS310 closed"), "CS310's loop closed on the sample workspace");
    assert.deepEqual(wall.none, Array(7).fill("no outline recorded"), "seven courses without a recorded outline say so");
    assert.equal(wall.cs310, 4, "CS310 links four PLOs at H");
    assert.ok(wall.overflow <= 1, "the wall fits " + width + " px");
    await kiosk.screenshot({ path: join(output, "programme-wall-" + width + ".png") });
  }
  await kiosk.close();
  console.log("PASS the kiosk signed out, its film paused or its missing line, a touch walking the loop without a question, back at the kiosk after thirty idle seconds with the warning first, the register's figures counted to their values, and the programme wall at 1440 and 320 px");

  assert.deepEqual(errors, []);
  console.log("PASS zero page errors");
  console.log("Screenshots and exported plan: " + output);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
