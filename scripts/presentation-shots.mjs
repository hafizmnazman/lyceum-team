// Screenshots for the pitch deck, taken from the real build after the
// self-driving demo has run under turbo and filled the workspace: the Evidence
// section with its bar list and table, the meeting brief, the recipient's Home
// page with the brief, How it works with the record of the run, and the public
// landing page. Taken in a stable state after the tour, so the demo's own
// timing never races the camera.
// Run `npm run build` first, then `node scripts/presentation-shots.mjs`.
import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 4197;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wav": "audio/wav", ".png": "image/png", ".svg": "image/svg+xml" };
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
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, timeout = 300000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(fn)) return true; await sleep(300); } return false; };
const click = async (id) => { const sel = `[data-demo-id="${id}"]`; await page.waitForSelector(sel, { timeout: 15000 }); await page.click(sel); await sleep(700); };
const shotOf = async (id, file) => {
  await page.$eval(`[data-demo-id="${id}"]`, (el) => el.scrollIntoView({ block: "start" }));
  await sleep(500);
  const el = await page.$(`[data-demo-id="${id}"]`);
  await el.screenshot({ path: join("docs/presentation", file) });
  console.log("wrote", file);
};
mkdirSync("docs/presentation", { recursive: true });
try {
  await page.goto(`http://localhost:${PORT}/?demoTurbo`, { waitUntil: "networkidle0" });
  await page.click('[data-demo-id="play-demo"]');
  const read = await until(() => window.__lyceum?.getState().notifications.some((n) => n.kind === "evidence-brief" && n.read));
  if (!read) throw new Error("the demo did not reach the brief being read");
  await sleep(8000); // the end card

  // The recipient's Home page, with the brief open.
  await click("nav-inbox");
  await page.waitForSelector('[data-demo-id="inbox-brief"]', { timeout: 15000 });
  await shotOf("inbox-brief", "shot-inbox-brief.png");
  await page.screenshot({ path: "docs/presentation/shot-home-with-brief.png" });
  console.log("wrote shot-home-with-brief.png");

  // Back as the lecturer: the Evidence section and the meeting brief.
  await click("account-menu");
  await click("switch-P-SOBRI");
  await click("subject-CS310");
  await page.screenshot({ path: "docs/presentation/shot-studio-journey.png" });
  console.log("wrote shot-studio-journey.png");
  await click("tab-evidence");
  await shotOf("observed-requirements", "shot-evidence-table.png");
  await shotOf("meeting-brief", "shot-meeting-brief.png");

  // How it works: the record of the afternoon, by role.
  await click("nav-office");
  await until(() => document.body.innerText.includes("step by step"), 10000);
  // The seven role cards alone, wrapped onto two rows as on a narrower screen.
  await page.$eval(".pipeline", (el) => { el.style.maxWidth = "660px"; });
  await sleep(400);
  await (await page.$(".pipeline")).screenshot({ path: "docs/presentation/shot-agents.png" });
  console.log("wrote shot-agents.png");
  await page.$eval(".pipeline", (el) => { el.style.maxWidth = ""; });
  await page.click('[data-demo-id="role-scout"]');
  await sleep(400);
  await page.screenshot({ path: "docs/presentation/shot-how-it-works.png", fullPage: true });
  console.log("wrote shot-how-it-works.png");

  // The public landing page, signed out.
  const visitor = await browser.newPage();
  await visitor.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await visitor.goto(`http://localhost:${PORT}/#/index`, { waitUntil: "networkidle0" });
  await sleep(800);
  await visitor.screenshot({ path: "docs/presentation/shot-landing.png", fullPage: true });
  console.log("wrote shot-landing.png");
  await visitor.close();
} finally { await browser.close(); server.close(); }
