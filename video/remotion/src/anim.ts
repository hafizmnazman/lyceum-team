// Motion from video/style.md: springy pops, smooth glides, numbers counting up,
// lines drawing in, and a gentle idle float so nothing is ever completely still.
import { Easing, interpolate, spring } from "remotion";

const FPS = 30;
const clampBoth = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Things that pop: a spring with a little overshoot (damping about 12). */
export const pop = (frame: number, at: number, damping = 12) =>
  frame < at ? 0 : spring({ frame: frame - at, fps: FPS, config: { damping, mass: 0.6, stiffness: 140 } });

/** Smooth moves (damping 200). */
export const glide = (frame: number, at: number, duration = 20) =>
  frame < at ? 0 : spring({ frame: frame - at, fps: FPS, config: { damping: 200 }, durationInFrames: duration });

/** Lines and bars draw in over 1 to 1.5 s. */
export const draw = (frame: number, at: number, duration = 36) =>
  interpolate(frame, [at, at + duration], [0, 1], { ...clampBoth, easing: Easing.inOut(Easing.cubic) });

/** Numbers count up over 0.6 to 1.0 s and stop on the exact value. */
export const count = (frame: number, at: number, duration = 24) =>
  interpolate(frame, [at, at + duration], [0, 1], { ...clampBoth, easing: Easing.out(Easing.cubic) });

export const fade = (frame: number, at: number, duration = 8) => interpolate(frame, [at, at + duration], [0, 1], clampBoth);

/** 3 to 5 px on a slow sine, about 3 s a cycle. */
export const float = (frame: number, seed = 0, amp = 4, period = 90) => Math.sin(((frame + seed * 37) / period) * Math.PI * 2) * amp;

/** Words appearing one by one with a two-frame stagger, from a start frame. */
export const wordsShown = (frame: number, at: number, total: number) => Math.max(0, Math.min(total, Math.floor((frame - at) / 2) + 1));
