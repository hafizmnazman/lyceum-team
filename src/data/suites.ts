// The automated suites and their check counts, shown on Evaluation. The counts come from running each suite
// (`npm run prove:all`); the landing page states their total, and prove-journey checks the two agree.

export const SUITES: Array<[string, number, string]> = [
  ["Acceptance scenario (illustrative spine)", 12, "canonical numbers of the synthetic scenario"],
  ["Backtest (synthetic)", 4, "closed-loop arithmetic on synthetic data"],
  ["Flow and roles", 28, "store, permissions, state machine"],
  ["Signal reveal (fixture)", 12, "the staged fixture reveal"],
  ["Intake parsing", 22, "xlsx, csv, pdf, pptx parse and interpret; each results column on its own course's outcome by label, the listed students, the marks kept sorted with no identifier and the missing counted"],
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
  ["The local door", 6, "every MCP tool through the protocol against the sample workspace: receipts, the export time, read-only annotations, the course record with the course file's manifest, attainment as the app shows it with a seeded file never counted, the pack never overwriting, nothing written to the workspace, refusals and the call log"],
  ["The course record", 12, "the sample course in both states, its learning time, the assessment plan and its table of specifications, the matrix levels, the references gap, the rubrics, the tour's revision through the store, and the course file with its manifest"],
  ["Teaching material", 8, "the fourteen sample sessions and their packs read back slide by slide, 18 pt body text, the mark and the demo line in every master, the repair of the parts pptxgenjs declares but does not write, the preview against the file, and samples kept out of the term's teaching"],
  ["Before and after", 10, "the word diff and both texts back from it, topic hours before and after, the week 6 pack under each version changing only where the outcome did, a region for every changed part, renamed and added slides, results marked not comparable when an outcome is reworded, the summary in words, the decision behind each version read from the event log, the two terms' shares each in its own version's words with the reworded outcome not compared, and the version scrubber's stops oldest first"],
  ["The judge's way through", 8, "every walk stop rendered by its screen with a route that opens it, captions within twenty words with their labels, the host at the two ends only, the not-built list word for word, the sample workspace restored with the current one kept, the recap's numbers against their records, the programme wall's heat table from the recorded outlines, the kiosk's idle return on time with Tualang silent, and the register's figures counting up to exactly their values"],
  ["The two student surveys", 12, "the instruments from the record and the profile, the link under 2,000 characters with no secret in it, the collector's token against its own hash, the floor and the release showing nothing early, one response per device and booth responses never as evidence, the Microsoft Forms importer on its fixture, backups, the sample's counts, the Google Forms importer on its CSV fixture, the Moodle Feedback importer with no repeat dropped without a time column, the document for Forms Quick Import, and the paste code read once per device"],
  ["Attainment against a stated threshold", 10, "the direct line against a hand-computed fixture with missing marks, no interval at a census and the finite-population interval below it, the recomputation after a change to the pass mark with the saved report keeping its own, the survey beside the marks never averaged and never from the booth, the programme outcomes listed with no index, marks without identifiers, the CQI note, Lens's moods, and backups"],
  ["Assessment items and exports", 9, "every Bloom level's Arkansas verbs, templates that leave each key to the lecturer, each lint rule failing alone on its fixture, the week 7 sample quiz passing with its distractors from the record, Moodle XML and QTI 2.1 well-formed with their documented elements and labels, the rubric read back as a spreadsheet, reviews as a person's record cleared on a change, and backups"],
];

export const SUITE_TOTAL = SUITES.reduce((n, s) => n + s[1], 0);
