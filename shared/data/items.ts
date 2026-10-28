// Assessment items, three per CLO at a spread of Bloom levels (Section 4.3 /
// Section 5 agent 3). For the spine proof these are hand-shaped fixtures; the
// Assessment agent will write real item text later, but the shape is identical
// (Item) so nothing downstream changes.
//
// Each CLO's three levels are chosen so the mean difficulty reflects how the
// outcome is pitched: foundational CLOs lean Remember/Understand, the
// machine-learning and deep-learning CLOs reach up to Analyse.

import type { BloomLevel, CLOId, Item } from "../types.ts";
import { difficultyForLevel } from "../lib/spine/difficulty.ts";

const PLAN: Record<CLOId, BloomLevel[]> = {
  CLO1: ["Remember", "Understand", "Understand"],
  CLO2: ["Understand", "Understand", "Apply"],
  CLO3: ["Remember", "Understand", "Understand"],
  CLO4: ["Understand", "Apply", "Apply"],
  CLO5: ["Remember", "Understand", "Understand"],
  CLO6: ["Remember", "Remember", "Understand"],
  CLO7: ["Understand", "Apply", "Apply"],
};

export const ITEMS: Item[] = Object.entries(PLAN).flatMap(([cloId, levels]) =>
  levels.map((level, i) => ({
    id: `${cloId}-IT${i + 1}`,
    text: `${cloId} item ${i + 1} (${level})`,
    targetCLO: cloId,
    bloomLevel: level,
    difficulty: difficultyForLevel(level),
  })),
);

/** Generate three items per CLO at its pitched Bloom level, for a new subject the
 *  hand-shaped PLAN does not cover (the Analogy-tested new-subject path). Same
 *  Item shape, so the spine treats them identically. */
export function itemsForCLOs(clos: Array<{ id: CLOId; bloomLevel: BloomLevel }>): Item[] {
  return clos.flatMap((clo) =>
    [0, 1, 2].map((i) => ({
      id: `${clo.id}-IT${i + 1}`,
      text: `${clo.id} item ${i + 1} (${clo.bloomLevel})`,
      targetCLO: clo.id,
      bloomLevel: clo.bloomLevel,
      difficulty: difficultyForLevel(clo.bloomLevel),
    })),
  );
}
