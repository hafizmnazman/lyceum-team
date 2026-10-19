// Section 4.5, concrete outcomes (for the drill-down).
//
// The drill-down needs to say "this student failed this item", which needs a
// concrete 0/1, not just a probability. Draw it, seeded, so the demo is
// reproducible.

import type { Rng } from "../rng.ts";

export function drawOutcome(p: number, rng: Rng): 0 | 1 {
  return rng.next() < p ? 1 : 0;
}
