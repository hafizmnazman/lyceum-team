// Screenshots for the deck, the brief and the poster, from the real build at
// 2x (plan Sections 14.2 and 14.3: real screens, no mockups). One dataset for
// everything (Section 15): after one capture of a proposed quotation beside its
// source (proposals only exist before they are confirmed), the workspace is
// restored from mcp/sample-workspace.json, the self-driving tour's end state on
// CS310, and every loop screen is captured from it. The landing page is
// captured signed out. Run `npm run build` first, then
// `node scripts/presentation-shots.mjs`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 4197;
const OUT = "docs/presentation";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xlsx": "application/octet-stream", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  try {
    const url = (req.url ?? "/").split("?")[0];
    const path = join("dist", url === "/" ? "index.html" : url);
    const body = await readFile(existsSync(path) ? path : join("dist", "index.html"));
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, r));
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
// A narrower window than a laptop's, so each panel is compact and its text stays legible on a slide or a page.
await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sel = (id) => `[data-demo-id="${id}"]`;
const click = async (id) => { await page.waitForSelector(sel(id), { timeout: 15000 }); await page.$eval(sel(id), (el) => el.scrollIntoView({ block: "center" })); await page.click(sel(id)); await sleep(500); };
const type = async (id, text) => { await page.waitForSelector(sel(id), { visible: true }); await page.click(sel(id), { clickCount: 3 }); await page.type(sel(id), text); };
/** Capture one element, scrolled into view. Toasts are hidden by a style rule; removing React's nodes would break the app. */
const shot = async (selector, file) => {
  await page.waitForSelector(selector, { visible: true, timeout: 15000 });
  await page.$eval(selector, (el) => el.scrollIntoView({ block: "start" }));
  await sleep(450);
  await (await page.$(selector)).screenshot({ path: join(OUT, file) });
  console.log("wrote " + file);
};
/** Capture a panel from its top down to the bottom of one of its parts, so a form below a record stays out of the picture. */
const shotUntil = async (selector, lastPart, file) => {
  await page.waitForSelector(selector + " " + lastPart, { visible: true, timeout: 15000 });
  await page.$eval(selector, (el) => el.scrollIntoView({ block: "start" }));
  await sleep(450);
  const clip = await page.$eval(selector, (el, part) => {
    const a = el.getBoundingClientRect(), b = el.querySelector(part).getBoundingClientRect();
    return { x: a.left + window.scrollX, y: a.top + window.scrollY, width: a.width, height: b.bottom - a.top + 24 }; // the clip is in page coordinates
  }, lastPart);
  await page.screenshot({ path: join(OUT, file), clip });
  console.log("wrote " + file);
};
/** Capture from the top of one element to the bottom of a later one, with a margin of the page around both. */
const shotSpan = async (first, last, file) => {
  await page.waitForSelector(last, { visible: true, timeout: 15000 });
  await page.$eval(first, (el) => { el.scrollIntoView({ block: "start" }); document.querySelector('[data-demo-id="main-scroll"]').scrollBy(0, -16); });
  await sleep(450);
  const clip = await page.evaluate((a, b) => {
    const top = document.querySelector(a).getBoundingClientRect(), end = document.querySelector(b).getBoundingClientRect();
    const left = Math.min(top.left, end.left) - 12, right = Math.max(top.right, end.right) + 12;
    return { x: left + window.scrollX, y: top.top + window.scrollY - 12, width: right - left, height: end.bottom - top.top + 32 }; // the bubble's shadow included
  }, first, last);
  await page.screenshot({ path: join(OUT, file), clip });
  console.log("wrote " + file);
};
mkdirSync(OUT, { recursive: true });
try {
  await page.goto(`http://localhost:${PORT}/#/login`, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: ".toast { display: none !important; }" });
  await click("login-P-SOBRI");

  // 1. A proposed quotation beside its source, from the dated saved sample.
  await click("nav-courses"); await click("course-open-CS310"); await click("course-watch");
  await page.select(sel("collect-provider"), "sample"); await click("collect-run");
  await page.waitForFunction(() => window.__lyceum.getState().collectRun?.status === "done", { timeout: 20000 });
  await click("collect-select-all"); await click("collect-import");
  await click("rail-report"); await click("subrail-quote");
  await type("lexicon-terms", "dashboards|dashboard, SQL, stakeholders|stakeholder"); await click("lexicon-save"); await click("scan-run");
  // The proposal from the posting the deck's receipt cites (Stripe's Data Analyst, Intern, which repeats the sentence of an older posting).
  const proposal = await page.evaluateHandle(() => [...document.querySelectorAll(".proposal-item")].find((el) => el.textContent.includes("Data Analyst, Intern") && el.textContent.includes("dashboards")) ?? null);
  if (!proposal.asElement()) throw new Error("no dashboards proposal from the Data Analyst, Intern posting");
  await proposal.asElement().evaluate((el) => el.scrollIntoView({ block: "start" })); await sleep(450);
  await proposal.asElement().screenshot({ path: join(OUT, "shot-report-quote.png") }); console.log("wrote shot-report-quote.png");
  // and a paraphrase refused before anything is stored
  await click("scan-confirm-all");
  await type("mention-skill", "Python"); await type("mention-excerpt", "experience with Python"); await click("mention-add");
  await page.waitForSelector('section[aria-labelledby="quote-by-hand"] .form-error', { visible: true, timeout: 15000 });
  await shot('section[aria-labelledby="quote-by-hand"]', "shot-report-paraphrase.png");

  // 2. The tour's end state, restored from the sample workspace through the app's own restore.
  await click("nav-guide");
  await (await page.$(sel("backup-file"))).uploadFile(resolve("mcp/sample-workspace.json"));
  await page.waitForSelector(sel("backup-preview"), { visible: true, timeout: 15000 });
  await click("backup-ack"); await click("backup-restore");
  await page.waitForFunction(() => document.body.innerText.includes("Workspace restored"), { timeout: 15000 });

  await click("nav-inbox");
  await shot(sel("journey-card"), "shot-home-ring.png");
  await click("nav-courses"); await click("course-open-CS310");
  await click("rail-report"); await click("subrail-count");
  // The step's frame, at a laptop's width: the loop's path across the top and the helper asking the step's question.
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 }); await sleep(400);
  await shotSpan(".step-path", ".step-hero", "shot-step.png");
  await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 }); await sleep(400);
  await shot(sel("observed-requirements"), "shot-report-count.png");
  await shot(sel("skill-card-dashboards"), "shot-report-card.png");
  await click("subrail-map");
  await shot(".ladder-list", "shot-report-map.png");
  await click("rail-decide");
  await shotUntil(".decide-panel", ".decide-records", "shot-decide.png");
  await click("rail-teach");
  await shot(".session-card", "shot-teach.png");
  await click("rail-learn");
  await shot(sel("learn-attainment"), "shot-learn.png");
  await click("rail-history");
  await shot(sel("history-timeline"), "shot-history.png");
  await click("nav-office");
  await shot(sel("loop-graphic"), "shot-loop.png");

  // 3. The public landing page, signed out.
  const visitorContext = await browser.createBrowserContext(); // no shared storage, so the visitor is signed out
  const visitor = await visitorContext.newPage();
  await visitor.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await visitor.goto(`http://localhost:${PORT}/#/index`, { waitUntil: "networkidle0" });
  await sleep(600);
  await (await visitor.$(".landing-hero-card")).screenshot({ path: join(OUT, "shot-landing.png") });
  console.log("wrote shot-landing.png");
  await visitorContext.close();
  if (errors.length) throw new Error("page errors: " + errors.slice(0, 3).join(" | "));
  // The README's pairs, copied where the house style keeps them (the pack slide comes from gen-sample-decks).
  mkdirSync(".github/readme/shots", { recursive: true });
  for (const [from, to] of [["shot-step.png", "step.png"], ["shot-report-quote.png", "report-quote.png"], ["shot-report-card.png", "report-card.png"],
    ["shot-decide.png", "decide.png"], ["shot-history.png", "history.png"], ["shot-learn.png", "learn.png"], ["pack/slide-03.png", "pack.png"]]) {
    if (existsSync(join(OUT, from))) copyFileSync(join(OUT, from), join(".github/readme/shots", to));
  }
  console.log("copied the README's screenshots into .github/readme/shots");
} finally { await browser.close(); server.close(); }
