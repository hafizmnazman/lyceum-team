// Section 4.6, aggregate to CLO mastery.
//
//   rows       = [ p(s, it) for s in cohort.students, it in items
//                  if it.targetCLO == clo ]
//   meanP      = mean(rows)
//   spread     = sd(rows)
//   confidence = groundingConfidence(clo, cohort)

import type { CLOId, CLOMastery, Item, Student } from "../../types.ts";
import { mean, sd } from "../stats.ts";
import { difficulty } from "./difficulty.ts";
import { pCorrect } from "./link.ts";
import { groundingConfidence } from "./confidence.ts";

export function cloMastery(
  cloId: CLOId,
  students: Student[],
  items: Item[],
  batchSupport: number,
): CLOMastery {
  const relevant = items.filter((it) => it.targetCLO === cloId);
  const ps: number[] = [];
  for (const s of students) {
    const theta = s.ability[cloId];
    if (typeof theta !== "number") continue;
    for (const it of relevant) {
      ps.push(pCorrect(theta, difficulty(it)));
    }
  }
  // No grounding rows at all (no items on this CLO, or no student rated it).
  // Report confidence 0 as the explicit "no estimate" marker rather than
  // letting mean([]) = 0 masquerade as 0% mastery (the no-black-box guardrail:
  // a number that cannot be backed must not look like a real reading).
  if (ps.length === 0) {
    return { cloId, meanP: 0, spread: 0, confidence: 0 };
  }
  const meanP = mean(ps);
  return {
    cloId,
    meanP,
    spread: sd(ps, meanP),
    confidence: groundingConfidence(cloId, students, batchSupport),
  };
}
