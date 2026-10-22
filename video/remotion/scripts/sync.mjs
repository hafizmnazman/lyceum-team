// The film's sync (video/README.md): reads video/script.md, video/storyboard.md,
// the recordings and transcripts if they exist, docs/claims.md and the captured
// tour, and writes src/generated/timeline.json (both cuts: scenes, lines, words,
// cues, clips, captions, speakers) and src/generated/envelopes.json (the voices'
// loudness per frame, which opens the mouths). Copies the bundled fonts, the
// architecture diagram and the recordings into public/. Fails on a cue word the
// lines do not hold, a clip anchor the tour never showed, a number in a caption
// that is not in the claims register, or an en or em dash.
// Run from video/remotion: `node scripts/sync.mjs` (npm run sync).
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { claimsRegister, digitsIn } from "../../../scripts/lib/claims-node.mjs";

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VIDEO = resolve(PROJECT, ".."), REPO = resolve(VIDEO, "..");
const PUBLIC = join(PROJECT, "public"), GENERATED = join(PROJECT, "src/generated");
const FPS = 30, WIDTH = 1920, HEIGHT = 1080;
const WORDS_PER_SECOND = 2.6; // the estimate until the voices are recorded
const LEAD = 0.5, GAP = 0.35; // seconds before the first line of a scene, and between lines
const CAPTION_CHARS = 42;
const CUTS = ["Loop90", "Afternoon"];
const FILM_CLAIMS = ["deck-receipt", "world-skills-and-approval", "deck-trl", "proof-checks"];
const DASH = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
const read = (p) => readFileSync(p, "utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
const problems = [];

// ---------- the script ----------
/** Words with their stress: **bold** spans are stressed, every word inside them. */
function tokenize(text) {
  const words = [];
  for (const part of text.split(/(\*\*[^*]+\*\*)/)) {
    const stressed = part.startsWith("**");
    const tokens = part.replace(/\*\*/g, "").split(/\s+/);
    // punctuation straight after a stressed word ("**ring**.") stays on that word
    if (!stressed && words.length && tokens[0]) words.at(-1).w += tokens.shift();
    for (const w of tokens.filter(Boolean)) words.push({ w, b: stressed });
  }
  return words;
}
function parseScript() {
  const cuts = {};
  let cut = null, scene = null;
  for (const raw of read(join(VIDEO, "script.md")).split("\n")) {
    const line = raw.trim();
    let m;
    if ((m = line.match(/^# (Loop90|Afternoon)$/))) { cut = m[1]; cuts[cut] = []; scene = null; continue; }
    if (!cut) continue;
    if ((m = line.match(/^## ([a-z0-9-]+): (.+)$/))) { scene = { id: m[1], title: m[2], visual: "", chapter: null, helpers: [], clipSpec: [], hold: 0.6, lines: [] }; cuts[cut].push(scene); continue; }
    if (!scene) continue;
    if ((m = line.match(/^Visual: (\w+)$/))) scene.visual = m[1];
    else if ((m = line.match(/^Chapter: (.+)$/))) scene.chapter = m[1] === "none" ? null : m[1];
    else if ((m = line.match(/^Helpers: (.+)$/))) scene.helpers = m[1].split(",").map((s) => s.trim());
    else if ((m = line.match(/^Hold: ([\d.]+)$/))) scene.hold = +m[1];
    else if ((m = line.match(/^Clips: (.+)$/))) scene.clipSpec = [...m[1].matchAll(/"([^"]+)"\s+([\d.]+)/g)].map((x) => ({ anchor: x[1], seconds: +x[2] }));
    else if ((m = line.match(/^(Host|Lecturer): (.+)$/))) scene.lines.push({ speaker: m[1].toLowerCase(), text: m[2] });
  }
  return cuts;
}
let receiptSpec = null;
function parseCues() {
  const cues = {};
  let id = null;
  for (const line of read(join(VIDEO, "storyboard.md")).split("\n")) {
    let m;
    if ((m = line.match(/^## ([a-z0-9-]+)\s*$/))) { id = m[1]; cues[id] = []; }
    else if (id && (m = line.match(/^Cue: (\w+) at "([^"]+)"$/))) cues[id].push({ name: m[1], word: m[2] });
    else if ((m = line.match(/^Receipt: (\S+) (\S+)$/))) receiptSpec = { hash: m[1], skill: m[2] };
  }
  return cues;
}
/** The receipt's posting and sentence, from the sample workspace the deck and the shots use. */
function receiptSource() {
  if (!receiptSpec) throw new Error("video/storyboard.md names no Receipt: line");
  const d = JSON.parse(read(join(REPO, "mcp/sample-workspace.json"))).data;
  const src = d.evidenceSources.find((s) => s.textHash === receiptSpec.hash);
  const mention = src && d.skillMentions.find((m) => m.sourceId === src.id && m.skill === receiptSpec.skill);
  if (!src || !mention || !src.text.includes(mention.excerpt)) throw new Error("The receipt " + receiptSpec.hash + " " + receiptSpec.skill + " is not a confirmed quotation in mcp/sample-workspace.json");
  const reviewed = d.evidenceSources.filter((s) => s.subjectId === src.subjectId && s.reviewed && !s.duplicateOf).length;
  return { source: { employer: src.organisation, title: src.title, published: src.sourceDate, retrieved: src.collection.retrievedAt.slice(0, 10), link: src.url.replace(/^https?:\/\//, ""), hash: src.textHash, sentence: mention.excerpt }, reviewed };
}
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9%]/g, "");

// ---------- the voices, once recorded ----------
function readWav(file) {
  const buf = readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error(file + " is not a WAV file");
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4), size = buf.readUInt32LE(pos + 4);
    if (id === "fmt ") { let format = buf.readUInt16LE(pos + 8); if (format === 0xfffe) format = buf.readUInt16LE(pos + 32); fmt = { format, channels: buf.readUInt16LE(pos + 10), sampleRate: buf.readUInt32LE(pos + 12), bits: buf.readUInt16LE(pos + 22) }; }
    else if (id === "data") data = { offset: pos + 8, size: Math.min(size, buf.length - pos - 8) };
    pos += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(file + ": no fmt or data chunk");
  const bytes = fmt.bits / 8, frames = Math.floor(data.size / (bytes * fmt.channels)), mono = new Float32Array(frames);
  for (let i = 0, o = data.offset; i < frames; i += 1) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c += 1, o += bytes) {
      s += fmt.format === 3 && fmt.bits === 32 ? buf.readFloatLE(o) : fmt.bits === 16 ? buf.readInt16LE(o) / 32768 : fmt.bits === 24 ? buf.readIntLE(o, 3) / 8388608 : buf.readInt32LE(o) / 2147483648;
    }
    mono[i] = s / fmt.channels;
  }
  return { sampleRate: fmt.sampleRate, samples: mono };
}
/** The loudness per frame, 0 to 100: -48 dBFS and quieter is a closed mouth, -18 and louder wide open. */
function envelope({ sampleRate, samples }) {
  const hop = sampleRate / FPS, frames = Math.ceil(samples.length / hop), out = [];
  let prev = 0;
  for (let f = 0; f < frames; f += 1) {
    const a = Math.floor(f * hop), b = Math.min(samples.length, Math.floor((f + 1) * hop));
    let s = 0;
    for (let i = a; i < b; i += 1) s += samples[i] * samples[i];
    const db = b > a ? 10 * Math.log10(s / (b - a) + 1e-12) : -120;
    const v = Math.max(0, Math.min(1, (db + 48) / 30));
    prev = v > prev ? v : prev * 0.55 + v * 0.45;
    out.push(Math.round(prev * 100));
  }
  return out;
}
const envelopes = {};
/** A line's recording and its word timings: video/audio/<cut>/<scene>-<n>.wav and video/audio/transcripts/<cut>/<scene>-<n>.json. */
function recording(cut, file, words) {
  const wav = join(VIDEO, "audio", cut, file + ".wav");
  if (!existsSync(wav)) return null;
  const audio = readWav(wav), seconds = audio.samples.length / audio.sampleRate;
  envelopes[cut + "/" + file] = envelope(audio);
  mkdirSync(join(PUBLIC, "audio", cut), { recursive: true });
  copyFileSync(wav, join(PUBLIC, "audio", cut, file + ".wav"));
  const tj = join(VIDEO, "audio", "transcripts", cut, file + ".json");
  let times = null;
  if (existsSync(tj)) {
    const said = JSON.parse(read(tj)); // [{ word, start, end }] in seconds, from faster-whisper
    if (said.length === words.length) times = said.map((x) => [x.start, x.end]);
    else if (said.length) { const a = said[0].start, z = said.at(-1).end; times = words.map((_, k) => [a + (k * (z - a)) / words.length, a + ((k + 1) * (z - a)) / words.length]); }
  }
  return { seconds, times, src: "audio/" + cut + "/" + file + ".wav" };
}

// ---------- the claims ----------
function figureColumn() {
  const rows = new Map();
  for (const line of read(join(REPO, "docs/claims.md")).split("\n")) {
    const m = line.match(/^\|\s*`([a-z0-9-]+)`\s*\|([^|]*)\|/);
    if (m && !rows.has(m[1])) rows.set(m[1], m[2].trim()); // the first row is the registered one
  }
  return rows;
}
const REGISTER = claimsRegister(), FIGURE = figureColumn();
const need = (id, re) => { const m = (FIGURE.get(id) ?? "").match(re); if (!m) throw new Error("docs/claims.md has no figure for " + id + " matching " + re); return m; };
const receipt = need("deck-receipt", /(\d+) of (\d+)/), approval = need("world-skills-and-approval", /(\d+) to (\d+) months/);
const churn = need("world-skills-and-approval", /(\d+)%/), trl = need("deck-trl", /TRL (\d+)/), checks = need("proof-checks", /^(\d+)/);
const figures = {
  receipt: { text: receipt[0], num: +receipt[1], den: +receipt[2] },
  approval: { text: approval[0], lo: +approval[1], hi: +approval[2] },
  churn: { text: churn[0], value: +churn[1] },
  trl: { text: trl[0], level: +trl[1] },
  checks: { text: checks[1], value: +checks[1] },
};
const ALLOWED = new Set(FILM_CLAIMS.flatMap((id) => digitsIn(REGISTER.get(id) ?? "")));

// ---------- the captured tour ----------
const markersFile = join(PUBLIC, "capture", "markers.json");
const capture = existsSync(markersFile) && existsSync(join(PUBLIC, "capture", "tour.mp4")) ? JSON.parse(read(markersFile)) : null;
function clipsFor(scene, durationInFrames) {
  if (!scene.clipSpec.length) return [];
  if (!capture) return [];
  const total = scene.clipSpec.reduce((n, c) => n + c.seconds, 0);
  let at = 0;
  return scene.clipSpec.map((c, i) => {
    const marker = capture.markers.find((m) => m.caption.startsWith(c.anchor));
    if (!marker) { problems.push(scene.id + ": the tour never showed a caption starting \"" + c.anchor + "\" (re-run video/capture/capture.mjs, or fix the Clips line)"); return null; }
    const frames = i === scene.clipSpec.length - 1 ? durationInFrames - at : Math.round((durationInFrames * c.seconds) / total);
    const rate = Math.max(0.6, Math.min(1.6, c.seconds / (frames / FPS)));
    const clip = { start: +(marker.t + 0.2).toFixed(2), from: at, durationInFrames: frames, rate: +rate.toFixed(3), anchor: c.anchor };
    at += frames;
    return clip;
  }).filter(Boolean);
}

// ---------- captions ----------
/** A line's words in caption chunks: a sentence or a clause at a time, at most two lines of 42 characters. */
function chunks(words) {
  const out = [];
  let cur = [];
  const len = (ws) => ws.map((w) => w.w).join(" ").length;
  for (const w of words) {
    cur.push(w);
    const end = /[.?!:]$/.test(w.w) || (/,$/.test(w.w) && len(cur) > CAPTION_CHARS);
    if (end || len(cur) > CAPTION_CHARS * 2 - 10) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}
function wrap(words) {
  const lines = [[]];
  for (const w of words) {
    const line = lines.at(-1);
    if (line.length && [...line, w].map((x) => x.w).join(" ").length > CAPTION_CHARS) lines.push([w]); else line.push(w);
  }
  return lines.map((line) => {
    const runs = [];
    line.forEach((w, i) => { const t = (i ? " " : "") + w.w; const last = runs.at(-1); if (last && last.b === w.b) last.t += t; else runs.push({ t, b: w.b }); });
    return runs;
  });
}

// ---------- the timeline ----------
const script = parseScript(), cues = parseCues();
const { source: RECEIPT, reviewed: REVIEWED } = receiptSource();
if (REVIEWED !== figures.receipt.den) problems.push("The register says " + figures.receipt.text + " but the sample holds " + REVIEWED + " reviewed postings");
figures.receiptSource = RECEIPT;
const timeline = { fps: FPS, width: WIDTH, height: HEIGHT, figures, cuts: {}, capture: capture ? { src: "capture/tour.mp4", capturedAt: capture.capturedAt, durationSeconds: capture.durationSeconds } : null, voices: { recorded: 0, lines: 0 } };
for (const cut of CUTS) {
  const scenes = [], captions = [], speakers = [];
  let frame = 0;
  for (const s of script[cut] ?? []) {
    let t = LEAD;
    const lines = s.lines.map((l, i) => {
      const words = tokenize(l.text), file = s.id + "-" + (i + 1);
      const rec = recording(cut, file, words);
      timeline.voices.lines += 1; if (rec) timeline.voices.recorded += 1;
      const seconds = rec ? rec.seconds : Math.max(1.3, words.length / WORDS_PER_SECOND);
      const times = rec?.times ?? words.map((_, k) => [(k * seconds) / words.length, ((k + 1) * seconds) / words.length]);
      const line = { speaker: l.speaker, file, audio: rec?.src ?? null, envelope: rec ? cut + "/" + file : null,
        from: Math.round(t * FPS), to: Math.round((t + seconds) * FPS),
        words: words.map((w, k) => ({ w: w.w, b: w.b, from: Math.round((t + times[k][0]) * FPS), to: Math.round((t + times[k][1]) * FPS) })) };
      t += seconds + GAP;
      return line;
    });
    const durationInFrames = Math.round((t - GAP + s.hold) * FPS);
    const cueFrames = {};
    for (const c of cues[s.id] ?? []) {
      const target = norm(c.word);
      const hit = lines.flatMap((l) => l.words).find((w) => norm(w.w) === target);
      if (!hit) problems.push(s.id + ": the cue word \"" + c.word + "\" is not in its lines (storyboard.md)");
      else cueFrames[c.name] = hit.from;
    }
    const clips = clipsFor(s, durationInFrames);
    scenes.push({ id: s.id, title: s.title, visual: s.visual, chapter: s.chapter, helpers: s.helpers, hold: s.hold, from: frame, durationInFrames, lines, cues: cueFrames, clips, sample: s.clipSpec.length > 0 });
    for (const l of lines) {
      for (const ws of chunks(l.words)) {
        const text = ws.map((w) => w.w).join(" ");
        if (DASH.test(text)) problems.push(s.id + ": a dash in a caption: " + text);
        for (const d of digitsIn(text)) if (!ALLOWED.has(d)) problems.push(s.id + ": " + d + " in a caption is not a figure the film registers: " + text);
        captions.push({ from: frame + ws[0].from, to: frame + Math.max(ws.at(-1).to, ws[0].from + 30), speaker: l.speaker, text, lines: wrap(ws) });
      }
      speakers.push({ speaker: l.speaker, from: frame + l.from, to: frame + l.to, envelope: l.envelope, audio: l.audio });
    }
    frame += durationInFrames;
  }
  // a caption never overlaps the next one
  captions.forEach((c, i) => { if (captions[i + 1] && c.to > captions[i + 1].from) c.to = captions[i + 1].from; });
  timeline.cuts[cut] = { durationInFrames: frame, scenes, captions, speakers };
}

// ---------- the assets ----------
mkdirSync(join(PUBLIC, "fonts"), { recursive: true });
for (const f of readdirSync(join(REPO, "public/fonts")).filter((f) => f.endsWith(".woff2"))) copyFileSync(join(REPO, "public/fonts", f), join(PUBLIC, "fonts", f));
mkdirSync(join(PUBLIC, "doors"), { recursive: true });
copyFileSync(join(REPO, "docs/presentation/architecture.png"), join(PUBLIC, "doors", "architecture.png"));

if (problems.length) { console.error("SYNC FAILED\n  " + problems.join("\n  ")); process.exit(1); }
mkdirSync(GENERATED, { recursive: true });
writeFileSync(join(GENERATED, "timeline.json"), JSON.stringify(timeline) + "\n");
writeFileSync(join(GENERATED, "envelopes.json"), JSON.stringify(envelopes) + "\n");
const clock = (frames) => { const s = Math.round(frames / FPS); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
for (const cut of CUTS) console.log(cut + ": " + clock(timeline.cuts[cut].durationInFrames) + ", " + timeline.cuts[cut].scenes.length + " scenes, " + timeline.cuts[cut].captions.length + " captions");
console.log("Voices: " + timeline.voices.recorded + " of " + timeline.voices.lines + " lines recorded" + (timeline.voices.recorded ? "" : "; timing estimated from the script at " + WORDS_PER_SECOND + " words a second") + ". Footage: " + (capture ? "the tour captured " + capture.capturedAt.slice(0, 16) : "not captured yet (run video/capture/capture.mjs)") + ".");
