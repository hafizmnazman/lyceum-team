// Demo timing: the paced-hold durations, the cursor pacing, and a turbo scale so
// the headless smoke can play the whole thing quickly. The staged reveals keep
// their real tick counts; turbo only shortens the interval period and the paced
// holds, so the end state is identical every run.
//
// The runtime estimate (estimateTotalMs) returns when the v3 demo script lands;
// the store only needs the reveal constants and scaleMs, which live here so the
// app and the demo share one clock.

// ---- turbo (smoke only) ----
export function isTurbo(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const w = window as unknown as { __demoTurbo?: boolean };
    if (w.__demoTurbo) return true;
    return new URLSearchParams(window.location.search).has("demoTurbo");
  } catch {
    return false;
  }
}

/** Shrink a paced duration under turbo; full speed (identity) otherwise. */
export function scaleMs(ms: number): number {
  return isTurbo() ? Math.max(16, Math.round(ms * 0.05)) : ms;
}

// ---- cursor pacing (human, not a bot) ----
export const TWEEN_MS = 760; // cursor move, ease-in-out, slowing near the target
export const PRE_ACT_MS = 1400; // readable pause after landing, before acting
export const TYPE_CHAR_MS = 32; // per-character typing
export const SWITCH_PAD_MS = 200; // small settle on a user switch

// ---- staged-reveal durations (real, driven by the store timers) ----
export const DRILL_STEP_MS = 6500; // per hop
export const DRILL_STEPS = 6;
export const SIGNAL_REVEAL_MS = 12000;
export const ACCEPTANCE_REVEAL_MS = 16000;
export const DRILL_REVEAL_MS = DRILL_STEP_MS * DRILL_STEPS; // 39000
