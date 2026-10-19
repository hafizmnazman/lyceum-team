// Headless demo smoke: play the entire self-driving demo under ?demoTurbo
// (paced holds shrink; the end state is identical) and assert what the
// recording would show: real sample postings imported for CS310, exact
// quotations confirmed, a reviewed denominator, a coverage mapping, a meeting
// brief sent to the programme owner and read by him, and no page errors.
//
// Run `npm run build` first, then `npm run smoke`.

import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 4198;
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

const browser = await puppeteer.launch({ executablePath, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const downloads = mkdtempSync(join(tmpdir(), "lyceum-demo-"));
const cdp = await page.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });

let failed = 0;
const check = (name, ok, detail = "") => {
  if (ok) console.log(`PASS  ${name}`);
  else {
    failed += 1;
    console.error(`FAIL  ${name}  ${detail}`);
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await page.goto(`http://localhost:${PORT}/?demoTurbo`, { waitUntil: "networkidle0" });
  await page.waitForSelector('[data-demo-id="play-demo"]', { timeout: 8000 });
  await page.click('[data-demo-id="play-demo"]');

  // Poll the store until the programme owner has read the brief or we time out.
  const t0 = Date.now();
  let end = null;
  while (Date.now() - t0 < 300000) {
    const snap = await page.evaluate(() => {
      const s = window.__lyceum?.getState();
      if (!s) return null;
      const sources = s.evidenceSources.filter((x) => x.subjectId === "CS310");
      const brief = s.evidenceBriefs.find((b) => b.subjectId === "CS310");
      const notification = s.notifications.find((n) => n.kind === "evidence-brief" && n.toPersonId === "P-RAHMAN");
      return {
        sources: sources.length,
        collected: sources.filter((x) => x.provenance === "collected").length,
        reviewed: sources.filter((x) => x.reviewed && !x.duplicateOf).length,
        mentions: s.skillMentions.filter((m) => m.subjectId === "CS310").length,
        mappings: s.skillMappings.filter((m) => m.subjectId === "CS310" && m.cloIds.includes("CLO5")).length,
        briefSent: Boolean(brief?.sentAt), briefRecipients: brief?.recipients ?? [], briefMarkdown: brief?.markdown ?? "",
        read: Boolean(notification?.read), currentPerson: s.currentPersonId,
        adopted: s.curriculumDrafts.filter((d) => d.subjectId === "CS310" && d.status === "adopted").length,
        versions: s.subjectVersions.filter((v) => v.subjectId === "CS310").length,
        sessions: s.teachingPlans.find((p) => p.subjectId === "CS310")?.sessions.length ?? 0,
        items: s.testDrafts.find((t) => t.subjectId === "CS310")?.items.length ?? 0,
      };
    });
    if (snap && snap.read) { end = snap; break; }
    await sleep(500);
  }

  check("the programme owner read the brief", Boolean(end));
  if (end) {
    check("real postings were imported as collected sources (live board or saved sample)", end.collected >= 3 && end.collected === end.sources, end.sources + "/" + end.collected);
    check("the reviewed denominator is non-empty", end.reviewed >= 3, String(end.reviewed));
    check("exact quotations were confirmed", end.mentions >= 5, String(end.mentions));
    check("a coverage mapping links a skill to CLO5", end.mappings === 1, String(end.mappings));
    check("the brief was sent to Dr Rahman", end.briefSent && end.briefRecipients.includes("P-RAHMAN"), JSON.stringify(end.briefRecipients));
    check("the brief carries the table and the receipts", /Small refresh within existing hours \(recommended\)/.test(end.briefMarkdown) && /## Appendix: evidence report with receipts/.test(end.briefMarkdown) && /convenience sample/.test(end.briefMarkdown));
    check("the reader is Dr Rahman", end.currentPerson === "P-RAHMAN", String(end.currentPerson));
    check("a course revision was checked and adopted with the baseline kept", end.adopted === 1 && end.versions >= 2, end.adopted + "/" + end.versions);
    check("a teaching session was saved", end.sessions === 1, String(end.sessions));
    check("template assessment items were generated", end.items > 0, String(end.items));
    await sleep(1500);
    const files = readdirSync(downloads);
    check("the teaching pack deck was downloaded", files.some((f) => /^CS310-week-\d+-teaching-pack\.pptx$/.test(f)), files.join(", "));
    check("the meeting brief deck was downloaded", files.includes("CS310-meeting-brief.pptx"), files.join(", "));
  }

  // Let the closing beats play out, then confirm no errors surfaced.
  await sleep(8000);
  check("no page errors during the demo", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  server.close();
}

console.log(failed === 0 ? "\nDEMO SMOKE OK" : `\n${failed} checks failed`);
process.exit(failed === 0 ? 0 : 1);
