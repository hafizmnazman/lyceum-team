// What is proven today (plan Section 5.1), each figure with its date, for the
// landing page and the deck. Every figure is a row in docs/claims.md, measured
// by this project; the proofs check the two agree.

export interface ProofFigure { claim: string; value: string; label: string }

export const PROOF: ProofFigure[] = [
  { claim: "proof-checks", value: "185", label: "automated checks passed on 22 October 2026, plus four headless browser runs" },
  { claim: "proof-live-board", value: "727", label: "real postings fetched live from one employer's public board on request, 9 October 2026" },
  { claim: "proof-no-keys", value: "0", label: "AI keys needed. The core is deterministic; file parsing and live collection use the local API" },
  { claim: "proof-no-paraphrase", value: "0", label: "paraphrases accepted as evidence. A quotation must match its source text or it is rejected" },
];
