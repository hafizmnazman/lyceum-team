// Section 4.4, the link (Rasch 1PL).
//
// One student, one item, one probability, every term on screen:
//   p = 1 / (1 + exp( -(theta - b) ))
// This is the standard logistic sigmoid of (theta - difficulty).

/** The logistic sigmoid, sigma(x) = 1 / (1 + e^-x). */
export function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** P(correct) for one student's ability theta against one item's difficulty b. */
export function pCorrect(theta: number, b: number): number {
  return sigma(theta - b);
}
