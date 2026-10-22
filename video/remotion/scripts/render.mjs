// Renders one cut (video/style.md, Export): the master (H.264, CRF 18, yuv420p,
// 1920 by 1080, 30 fps) and a 1280 by 720 review copy into video/out/, with the
// captions as <cut>.srt and the chapters as <cut>-chapters.txt beside them.
//
// Remotion draws every frame once as a PNG, losslessly, and the system ffmpeg
// encodes the master and the review copy from those frames with the project's
// own settings and colour tags; the same frames give the same file byte for
// byte. scripts/determinism.mjs renders the frames twice and compares them.
// Once the voices are recorded, the sound is rendered by Remotion as a WAV and
// muxed in as AAC. The frames are temporary. Renders are never committed. Run
// `node scripts/sync.mjs` first (the npm scripts do), then
// `node scripts/render.mjs Loop90` from video/remotion.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(PROJECT, "../out");
const timeline = JSON.parse(readFileSync(join(PROJECT, "src/generated/timeline.json"), "utf8"));
const FPS = timeline.fps;

/** The system Chrome or Edge, so a render needs no browser download. */
export const BROWSER = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome"].find(existsSync);

/** Remotion's own CLI script, run by node with no shell between, so a path with a space stays one argument. */
function remotion(args) {
  const run = spawnSync(process.execPath, [join(PROJECT, "node_modules/@remotion/cli/remotion-cli.js"), ...args, ...(BROWSER ? ["--browser-executable=" + BROWSER] : [])], { cwd: PROJECT, stdio: "inherit" });
  if (run.status !== 0) throw new Error("remotion " + args[0] + " failed");
}
function ffmpeg(args) {
  const run = spawnSync("ffmpeg", ["-y", "-v", "error", ...args], { encoding: "utf8" });
  if (run.status !== 0) throw new Error("ffmpeg failed: " + run.stderr.slice(0, 400));
}

/** Draw a composition as PNG frames into a folder; returns the folder, the sorted frame files and ffmpeg's input arguments for them. */
export function renderFrames(composition, work) {
  const dir = join(work, "frames");
  remotion(["render", "src/index.ts", composition, dir, "--sequence", "--image-format=png"]);
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  const m = files[0]?.match(/^(.*?)(\d+)\.png$/);
  if (!m) throw new Error("Remotion wrote no frames for " + composition);
  const input = ["-framerate", String(FPS), "-start_number", String(+m[2]), "-i", join(dir, m[1] + "%0" + m[2].length + "d.png")];
  return { dir, files, input };
}

/** Encode frames to an MP4: H.264 at a given CRF, scaled to a height if asked, with a voice track if given. */
export function encode(frames, file, { crf = 18, height = 0, voice = null } = {}) {
  ffmpeg([...frames.input, ...(voice ? ["-i", voice] : []), ...(height ? ["-vf", "scale=-2:" + height + ":flags=lanczos"] : []),
    "-c:v", "libx264", "-preset", "medium", "-crf", String(crf), "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    ...(voice ? ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest"] : ["-an"]), "-movflags", "+faststart", file]);
}

/** Render a composition once and encode every output from the same frames, the voices muxed in when they exist. */
export function render(composition, outputs) {
  const work = mkdtempSync(join(tmpdir(), "lyceum-frames-"));
  try {
    const frames = renderFrames(composition, work);
    const voiced = timeline.cuts[composition].speakers.some((s) => s.audio);
    const voice = voiced ? join(work, "voice.wav") : null;
    if (voiced) remotion(["render", "src/index.ts", composition, voice, "--codec=wav"]);
    for (const o of outputs) encode(frames, o.file, { ...o, voice });
  } finally {
    rmSync(work, { recursive: true, force: true }); // the temporary frames, gigabytes for a long cut
  }
}

const stamp = (frames) => {
  const ms = Math.round((frames / FPS) * 1000), p = (n, w = 2) => String(n).padStart(w, "0");
  return p(Math.floor(ms / 3600000)) + ":" + p(Math.floor(ms / 60000) % 60) + ":" + p(Math.floor(ms / 1000) % 60) + "," + p(ms % 1000, 3);
};
const clock = (frames) => { const s = Math.round(frames / FPS); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

if (process.argv[1] && process.argv[1].endsWith("render.mjs")) {
  const cut = process.argv[2];
  if (!["Loop90", "Afternoon"].includes(cut)) throw new Error("Name a cut: Loop90 or Afternoon");
  const c = timeline.cuts[cut];
  mkdirSync(OUT, { recursive: true });
  const master = join(OUT, cut.toLowerCase() + ".mp4");
  render(cut, [{ file: master, crf: 18 }, ...(process.argv.includes("--master-only") ? [] : [{ file: join(OUT, cut.toLowerCase() + "-720p.mp4"), crf: 28, height: 720 }])]);
  writeFileSync(join(OUT, cut.toLowerCase() + ".srt"), c.captions.map((x, i) => (i + 1) + "\n" + stamp(x.from) + " --> " + stamp(x.to) + "\n" + x.lines.map((l) => l.map((r) => r.t).join("")).join("\n") + "\n").join("\n"));
  const chapters = [];
  for (const s of c.scenes) if (s.chapter && !chapters.some((x) => x.title === s.chapter)) chapters.push({ at: s.from, title: s.chapter });
  writeFileSync(join(OUT, cut.toLowerCase() + "-chapters.txt"), ["0:00 Opening", ...chapters.map((x) => clock(x.at) + " " + x.title)].join("\n") + "\n");
  console.log("Rendered " + cut + ": " + clock(c.durationInFrames) + ", " + statSync(master).size + " bytes, with " + c.captions.length + " captions and " + (chapters.length + 1) + " chapters beside it in video/out/." + (timeline.voices.recorded ? "" : " No voice yet: the captions are timed from the script."));
}
