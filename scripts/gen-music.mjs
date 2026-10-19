// Generate an original, royalty-free ambient bed for the demo, written to
// public/demo-music.wav. It is synthesised from scratch (a calm four-chord pad
// progression with a soft sub bass and a sparse bell arpeggio), so it carries no
// copyright, needs no attribution, and cannot be flagged. Deterministic: same
// output every run. The user can still drop their own public/demo-music.mp3 to
// override it (audio.ts prefers the mp3).
//
// Run with:  node scripts/gen-music.mjs   (or npm run gen:music)

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SR = 44100;
const LOOP = 30; // seconds, seamless loop
const XF = 0.6; // loop crossfade seconds
const TOTAL = LOOP + XF;
const N = Math.floor(TOTAL * SR);
const TAU = Math.PI * 2;

// A calm progression: Cmaj7 - Am7 - Fmaj7 - G. Warm, unresolved, easy to loop.
const CHORDS = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 392.0], // G
];
const BASS = [130.81, 110.0, 87.31, 98.0]; // C3, A2, F2, G2
const SLOT = LOOP / CHORDS.length; // 7.5s per chord
const CHXF = 1.6; // chord crossfade seconds

function chordInfo(t) {
  const tl = ((t % LOOP) + LOOP) % LOOP;
  const slotIdx = Math.floor(tl / SLOT);
  const idx = slotIdx % CHORDS.length;
  const tin = tl - slotIdx * SLOT;
  let blend = 0;
  if (tin > SLOT - CHXF) blend = (tin - (SLOT - CHXF)) / CHXF;
  return { idx, next: (idx + 1) % CHORDS.length, blend };
}

// A soft voice: sine plus a gentle second harmonic, detuned by cents for width.
function voice(f, t, cents) {
  const d = f * Math.pow(2, cents / 1200);
  return Math.sin(TAU * d * t) * 0.8 + Math.sin(TAU * 2 * d * t) * 0.12;
}

function pad(t, cents) {
  const c = chordInfo(t);
  let s = 0;
  for (const f of CHORDS[c.idx]) s += voice(f, t, cents) * (1 - c.blend);
  for (const f of CHORDS[c.next]) s += voice(f, t, cents) * c.blend;
  return s / (CHORDS[0].length * 1.6);
}

function bass(t) {
  const c = chordInfo(t);
  return (Math.sin(TAU * BASS[c.idx] * t) * (1 - c.blend) + Math.sin(TAU * BASS[c.next] * t) * c.blend) * 0.5;
}

const ARP = 1.875; // a soft bell every 1.875s
function arp(t) {
  const k = Math.floor(t / ARP);
  const dt = t - k * ARP;
  if (dt < 0 || dt > 1.6) return { s: 0, pan: 0 };
  const c = chordInfo(k * ARP);
  const tone = CHORDS[c.idx][k % CHORDS[c.idx].length] * 2; // up an octave
  const env = Math.exp(-3.2 * dt);
  return { s: Math.sin(TAU * tone * dt) * env * 0.4, pan: k % 2 === 0 ? -1 : 1 };
}

const L = new Float64Array(N);
const R = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const lfo = 0.85 + 0.15 * Math.sin(TAU * 0.05 * t); // slow breathing
  const b = bass(t);
  const a = arp(t);
  const aL = a.pan < 0 ? a.s : a.s * 0.35;
  const aR = a.pan > 0 ? a.s : a.s * 0.35;
  let l = (pad(t, -5) * 0.5 + b * 0.42 + aL) * lfo;
  let r = (pad(t, 5) * 0.5 + b * 0.42 + aR) * lfo;
  L[i] = Math.tanh(l * 1.05) * 0.92;
  R[i] = Math.tanh(r * 1.05) * 0.92;
}

// Seamless loop: crossfade the head with the continuation past the loop point.
const outLen = Math.floor(LOOP * SR);
const xfn = Math.floor(XF * SR);
const outL = new Float64Array(outLen);
const outR = new Float64Array(outLen);
for (let i = 0; i < outLen; i++) {
  if (i < xfn) {
    const a = i / xfn;
    const fin = Math.sin((a * Math.PI) / 2);
    const fout = Math.cos((a * Math.PI) / 2);
    outL[i] = L[i] * fin + L[outLen + i] * fout;
    outR[i] = R[i] * fin + R[outLen + i] * fout;
  } else {
    outL[i] = L[i];
    outR[i] = R[i];
  }
}

// Normalise to a calm peak.
let peak = 0;
for (let i = 0; i < outLen; i++) peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
const g = peak > 0 ? 0.85 / peak : 1;

// Write a 16-bit stereo PCM WAV.
const channels = 2;
const bytesPerSample = 2;
const dataLen = outLen * channels * bytesPerSample;
const buf = Buffer.alloc(44 + dataLen);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + dataLen, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(channels, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * channels * bytesPerSample, 28);
buf.writeUInt16LE(channels * bytesPerSample, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(dataLen, 40);
let off = 44;
for (let i = 0; i < outLen; i++) {
  for (const ch of [outL, outR]) {
    const v = Math.max(-1, Math.min(1, ch[i] * g));
    buf.writeInt16LE(Math.round(v * 32767), off);
    off += 2;
  }
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "demo-music.wav");
writeFileSync(outPath, buf);
console.log(`wrote ${outPath}  (${(buf.length / 1048576).toFixed(2)} MB, ${LOOP}s loop, peak ${peak.toFixed(3)})`);
