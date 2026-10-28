// Section 4.3, item difficulty (assigned, not fitted).
//
// No item-response history exists, so difficulty is set by cognitive level, not
// calibrated. This is why it is Rasch-STYLE, not full IRT. Each item is written
// at a Bloom level anyway, and that level reads straight off as difficulty.

import type { BloomLevel, Item } from "../../types.ts";
import { config } from "../../config.ts";

export function difficultyForLevel(level: BloomLevel): number {
  return config.bloomLadder[level];
}

/** The difficulty (b) used by the link. A stored item.difficulty is
 *  authoritative when present and finite; otherwise b is read off the Bloom
 *  ladder. Default items store exactly the ladder value, so the two agree. The
 *  override exists so the Assessment agent and backtest fixtures can carry a
 *  calibrated, off-ladder b (e.g. the canonical ML-14 at b = 0.70, which is not
 *  on the 0.5-step ladder) without the link snapping it back to the ladder. */
export function difficulty(item: Item): number {
  return Number.isFinite(item.difficulty)
    ? item.difficulty
    : difficultyForLevel(item.bloomLevel);
}
