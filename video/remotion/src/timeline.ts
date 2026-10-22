// The timeline scripts/sync.mjs builds from the script, the storyboard, the
// recordings, the claims register and the captured tour.
import timelineJson from "./generated/timeline.json";
import envelopesJson from "./generated/envelopes.json";

export type CutId = "Loop90" | "Afternoon";
export type Speaker = "host" | "lecturer";
export type Run = { t: string; b: boolean };
export type Word = { w: string; b: boolean; from: number; to: number };
export type Line = { speaker: Speaker; file: string; audio: string | null; envelope: string | null; from: number; to: number; words: Word[] };
export type Clip = { start: number; from: number; durationInFrames: number; rate: number; anchor: string };
export type Scene = {
  id: string; title: string; visual: string; chapter: string | null; helpers: string[]; hold: number;
  from: number; durationInFrames: number; lines: Line[]; cues: Record<string, number>; clips: Clip[]; sample: boolean;
};
export type Caption = { from: number; to: number; speaker: Speaker; text: string; lines: Run[][] };
export type Speaking = { speaker: Speaker; from: number; to: number; envelope: string | null; audio: string | null };
export type Cut = { durationInFrames: number; scenes: Scene[]; captions: Caption[]; speakers: Speaking[] };
export type ReceiptSource = { employer: string; title: string; published: string; retrieved: string; link: string; hash: string; sentence: string };
export type Figures = {
  receipt: { text: string; num: number; den: number };
  approval: { text: string; lo: number; hi: number };
  churn: { text: string; value: number };
  trl: { text: string; level: number };
  checks: { text: string; value: number };
  receiptSource: ReceiptSource;
};

export const timeline = timelineJson as unknown as {
  fps: number; width: number; height: number; figures: Figures; cuts: Record<CutId, Cut>;
  capture: { src: string; capturedAt: string; durationSeconds: number } | null;
  voices: { recorded: number; lines: number };
};
export const envelopes = envelopesJson as unknown as Record<string, number[]>;

/** How open a speaker's mouth is, 0 to 1, from the loudness of its recording; 0 with no recording. */
export const loudness = (key: string | null, frameInLine: number): number => {
  if (!key) return 0;
  const e = envelopes[key];
  if (!e || frameInLine < 0 || frameInLine >= e.length) return 0;
  return e[frameInLine] / 100;
};

/** A cue's frame inside its scene; a missing cue throws, so a storyboard edit cannot pass unseen. */
export const cueOf = (scene: Scene) => (name: string): number => {
  const f = scene.cues[name];
  if (f === undefined) throw new Error("Scene " + scene.id + " has no cue \"" + name + "\" (video/storyboard.md)");
  return f;
};
