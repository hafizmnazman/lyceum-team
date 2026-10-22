// The automated suites and their check counts, shown on Evaluation. The counts come from running each suite
// (`npm run prove:all`); the landing page states their total, and prove-journey checks the two agree.

export const SUITES: Array<[string, number, string]> = [
  ["Acceptance scenario (illustrative spine)", 12, "canonical numbers of the synthetic scenario"],
  ["Backtest (synthetic)", 4, "closed-loop arithmetic on synthetic data"],
  ["Flow and roles", 28, "store, permissions, state machine"],
  ["Signal reveal (fixture)", 12, "the staged fixture reveal"],
  ["Intake parsing", 18, "xlsx, csv, pdf, pptx parse and interpret"],
  ["Integrity", 13, "evidence edge cases, approval guards"],
  ["Teaching plans", 10, "scope, validation, export"],
  ["Curriculum", 28, "revisions, constraints, adoption, recovery"],
  ["Evidence", 13, "citations, duplicates, Wilson intervals, mappings, backups"],
  ["Collector", 6, "text extraction, cache, rate limits, timeouts"],
  ["Research run", 5, "import on request, exact proposals, briefs, decisions and events in backups"],
  ["Slides", 3, "decks unzipped and read back, chart part included"],
  ["Benchmark and self-checks", 5, "labelled scan set, metric arithmetic, live quotation re-verification, denominator rules"],
  ["The loop and the record", 9, "done rules per term, the decision record, a new term, the event log first in the timeline, Learn matched to the version taught, the term set inside the ring, the routes, every landing figure in the claims register and every quoted clause in its note"],
  ["Evidence snapshots", 6, "frozen windows, change called only when intervals separate, identity matching, backups"],
  ["Moods", 8, "each mood a pure function of the records, the requests in flight and the clock"],
  ["The local door", 5, "every MCP tool through the protocol against the sample workspace: receipts, the export time, read-only annotations, the pack never overwriting, nothing written to the workspace, refusals and the call log"],
];

export const SUITE_TOTAL = SUITES.reduce((n, s) => n + s[1], 0);
