// The film's footage (plan Section 16, step 2): the real app in demo mode at 1920
// by 1080, recorded by script, never by hand, so a change to the app means a
// re-run, not a reshoot. It plays the self-driving tour once with ?demoSample
// (the dated saved sample of Stripe's public board from the start, offline and
// identical on every run), hides the tour's own caption bar, progress bar and
// controls (its cursor stays), and logs the moment each caption appears. The
// film cuts its excerpts from that one recording by caption (video/script.md,
// the Clips lines), so every scene shows the step it narrates.
//
// The frames come from the browser's own screencast and go straight into ffmpeg,
// which stamps each with the moment it arrived (-use_wallclock_as_timestamps), so
// the video keeps the tour's clock and the captions' times hold. A two-pixel
// heartbeat in a corner keeps the page painting through the still moments.
//
// Writes video/remotion/public/capture/tour.mp4 (H.264, 30 fps, no sound) and
// markers.json. Run `npm run build` in the repository first, then
// `node video/capture/capture.mjs` from the repository root. Needs Chrome or Edge
// and ffmpeg on the PATH.
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = join(REPO, "dist");
const OUT = join(REPO, "video/remotion/public/capture");
const PORT = 4201;
const LAST = "Lyceum. Real job postings"; // the tour's closing caption
if (!existsSync(join(DIST, "index.html"))) throw new Error("Build the app first: npm run build");
if (spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status !== 0) throw new Error("ffmpeg must be on the PATH");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xlsx": "application/octet-stream", ".csv": "text/csv", ".pdf": "application/pdf", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  try {
    const url = (req.url ?? "/").split("?")[0];
    const path = join(DIST, url === "/" ? "index.html" : url);
    const body = await readFile(existsSync(path) ? path : join(DIST, "index.html"));
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, r));

const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath, headless: true });
const work = mkdtempSync(join(tmpdir(), "lyceum-capture-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });
const mp4 = join(OUT, "tour.mp4");
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: work }); // the pack and the brief deck land here
  await page.goto(`http://localhost:${PORT}/?demoSample`, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: '[data-demo-part="caption"], [data-demo-part="progress"], [data-demo-part="controls"] { display: none !important; }' });
  await page.addStyleTag({ content: "#capture-heartbeat { position: fixed; right: 0; bottom: 0; width: 2px; height: 2px; z-index: 2147483647; pointer-events: none; animation: capture-beat 66ms steps(1) infinite; } @keyframes capture-beat { 0% { background: var(--mint); } 50% { background: var(--white); } }" });
  await page.evaluate(() => { const beat = document.createElement("div"); beat.id = "capture-heartbeat"; document.body.append(beat); });
  await page.waitForSelector('[data-demo-id="play-demo"]', { timeout: 15000 });

  // the recorder: screencast frames into ffmpeg, timed by their arrival
  const ffmpeg = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-use_wallclock_as_timestamps", "1", "-c:v", "mjpeg", "-i", "pipe:0",
    "-vf", "fps=30,scale=1920:1080,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-an", mp4], { stdio: ["pipe", "ignore", "pipe"] });
  let ffErr = "";
  ffmpeg.stderr.on("data", (d) => { ffErr += d; });
  let firstAt = 0, frames = 0;
  cdp.on("Page.screencastFrame", (e) => {
    cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
    if (!firstAt) firstAt = Date.now();
    ffmpeg.stdin.write(Buffer.from(e.data, "base64"));
    frames += 1;
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  while (!firstAt) await sleep(20);

  await page.click('[data-demo-id="play-demo"]');
  const markers = [];
  let last = "", ended = 0;
  while (Date.now() - firstAt < 15 * 60 * 1000) {
    const caption = await page.evaluate(() => document.querySelector('[data-demo-part="caption"]')?.textContent ?? "");
    if (caption && caption !== last) { markers.push({ t: +((Date.now() - firstAt) / 1000).toFixed(2), caption }); last = caption; }
    if (last.startsWith(LAST) && !caption && !ended) ended = Date.now();
    if (ended && Date.now() - ended > 2500) break;
    await sleep(100);
  }
  await cdp.send("Page.stopScreencast");
  const wallSeconds = (Date.now() - firstAt) / 1000;
  ffmpeg.stdin.end();
  await once(ffmpeg, "close");
  if (ffmpeg.exitCode !== 0) throw new Error("ffmpeg could not encode the recording: " + ffErr.slice(0, 400));
  if (!last.startsWith(LAST)) throw new Error("the tour did not reach its last caption; the recording is incomplete");
  if (errors.length) throw new Error("page errors during the tour: " + errors.slice(0, 3).join(" | "));

  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], { encoding: "utf8" });
  const durationSeconds = +(+probe.stdout.trim()).toFixed(2);
  // The captions' times are wall-clock times; they hold only if the video kept the same clock.
  if (Math.abs(durationSeconds - wallSeconds) > 2) throw new Error("the recording lasts " + durationSeconds + " s but the tour took " + wallSeconds.toFixed(1) + " s; its frames did not keep time");
  writeFileSync(join(OUT, "markers.json"), JSON.stringify({
    source: "The self-driving tour of the built app with ?demoSample, at 1920 by 1080, its captions hidden",
    capturedAt: new Date().toISOString(), durationSeconds, frames, markers,
  }, null, 1) + "\n");
  console.log("Recorded the tour: " + durationSeconds + " s against " + wallSeconds.toFixed(1) + " s of tour, " + frames + " frames, " + markers.length + " captions marked, into video/remotion/public/capture/.");
} finally {
  await browser.close();
  server.close();
}
