// The determinism check (plan Section 16, A7's verification): the film rendered
// twice from the same inputs and diffed, frame by frame, before any encoding,
// because a single changed pixel spreads over dozens of frames once H.264 has
// encoded it. A frame that is not the same file is decoded and measured: how
// many pixels differ and by how many levels out of 255. Then the first render's
// frames are encoded twice, to show the encoder adds no difference of its own.
//
// It fails on a missing frame, on any pixel more than TOLERANCE levels apart, or
// on two different encodes. Something in the film that depends on more than its
// inputs (a clock, a random number, a font that loaded late, a blurred shadow)
// moves pixels by tens of levels; Chrome's rasteriser alone leaves, now and then,
// one level in a few pixels of the background, which the report counts.
// Run `node scripts/sync.mjs` first, then `node scripts/determinism.mjs Loop90`.
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { encode, renderFrames } from "./render.mjs";

const TOLERANCE = 2; // levels out of 255: below anything an eye can see
const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(PROJECT, "../out");
const cut = process.argv[2] ?? "Loop90";

/** The pixels of an 8-bit, non-interlaced PNG, as Remotion writes them. */
export function decodePng(buf) {
  let pos = 8, width = 0, height = 0, channels = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[data[9]];
      if (data[8] !== 8 || !channels || data[12] !== 0) throw new Error("not an 8-bit, non-interlaced PNG");
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels, px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride, up = row - stride;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? px[row + x - channels] : 0, b = y ? px[up + x] : 0, c = x >= channels && y ? px[up + x - channels] : 0;
      let p = raw[src + x];
      if (filter === 1) p += a;
      else if (filter === 2) p += b;
      else if (filter === 3) p += (a + b) >> 1;
      else if (filter === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[row + x] = p & 255;
    }
  }
  return { width, height, channels, px };
}
export function measure(fileA, fileB) {
  const a = decodePng(readFileSync(fileA)), b = decodePng(readFileSync(fileB));
  if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) return { pixels: a.width * a.height, maxLevel: 255 };
  let pixels = 0, maxLevel = 0;
  for (let i = 0; i < a.px.length; i += a.channels) {
    let d = 0;
    for (let k = 0; k < a.channels; k += 1) d = Math.max(d, Math.abs(a.px[i + k] - b.px[i + k]));
    if (d) { pixels += 1; maxLevel = Math.max(maxLevel, d); }
  }
  return { pixels, maxLevel };
}

if (process.argv[1] && process.argv[1].endsWith("determinism.mjs")) {
  const work = [mkdtempSync(join(tmpdir(), "lyceum-det-a-")), mkdtempSync(join(tmpdir(), "lyceum-det-b-"))];
  try {
    const runs = work.map((w) => renderFrames(cut, w));
    const names = [...new Set([...runs[0].files, ...runs[1].files])].sort();
    const missing = names.filter((f) => !runs[0].files.includes(f) || !runs[1].files.includes(f));
    const differing = [];
    for (const f of names) {
      if (missing.includes(f)) continue;
      const pa = join(runs[0].dir, f), pb = join(runs[1].dir, f);
      if (!readFileSync(pa).equals(readFileSync(pb))) differing.push({ frame: +f.match(/(\d+)\.png$/)[1], ...measure(pa, pb) });
    }
    const files = [join(work[0], "a1.mp4"), join(work[0], "a2.mp4")];
    for (const f of files) encode(runs[0], f, { crf: 18 });
    const sha = files.map((f) => createHash("sha256").update(readFileSync(f)).digest("hex"));
    const maxLevel = differing.reduce((m, d) => Math.max(m, d.maxLevel), 0);
    const report = { cut, renderedAt: new Date().toISOString(), frames: names.length, missing, identical: names.length - missing.length - differing.length,
      differing, maxLevel, tolerance: TOLERANCE, encoderSameBytes: sha[0] === sha[1], sha256: sha[0],
      passed: !missing.length && maxLevel <= TOLERANCE && sha[0] === sha[1] };
    mkdirSync(join(OUT, "determinism"), { recursive: true });
    writeFileSync(join(OUT, "determinism", cut.toLowerCase() + "-report.json"), JSON.stringify(report, null, 1) + "\n");
    const what = differing.length
      ? differing.length + " differ, by at most " + maxLevel + " level" + (maxLevel === 1 ? "" : "s") + " in " + Math.min(...differing.map((d) => d.pixels)) + " to " + Math.max(...differing.map((d) => d.pixels)) + " pixels (frames " + differing.slice(0, 8).map((d) => d.frame).join(", ") + (differing.length > 8 ? ", ..." : "") + ")"
      : "none differ";
    console.log(cut + ": " + names.length + " frames rendered twice; " + report.identical + " identical byte for byte, " + what + (missing.length ? "; " + missing.length + " missing" : "") +
      "; the encoder gave " + (report.encoderSameBytes ? "the same file byte for byte" : "two different files") + " from the same frames. " + (report.passed ? "Passed" : "FAILED") + " (tolerance " + TOLERANCE + " levels).");
    if (!report.passed) process.exitCode = 1;
  } finally {
    for (const w of work) rmSync(w, { recursive: true, force: true }); // two sets of frames, gigabytes
  }
}
