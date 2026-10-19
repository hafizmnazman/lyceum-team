## 1. Bugs and correctness risks

- **High, demo can erase work without warning.** `Landing.tsx:50,56` dispatches `lyceum:play-demo`. `DemoOverlay.tsx:71` omits evidence, mappings, briefs and curriculum drafts from `hasSavedWork`; line 78 resets everything. Evidence-only work can disappear silently. **Fix:** detect changes across all persisted collections, or run the tour in an isolated workspace.

- **High, initial deep links are overwritten.** `App.tsx:43` pushes the stored screen before line 65 reads the hash. A fresh `#/index` becomes `#/login`. Subsequently, signed-out private hashes are ignored, leaving the URL inconsistent with the rendered screen. **Fix:** resolve and authorize the initial hash before synchronizing state; replace rejected URLs with the public route.

- **Demo reentrancy and stale timers.** `DemoOverlay.tsx:58,70,98`: `playRef` avoids a stale initial closure, but repeated events can start concurrent runs. The uncancelled delayed `stop()` can terminate a newer run. **Fix:** use a synchronous running guard, cancellation token and tracked timeout.

- **Date parsing and ordering.** `runs.ts:49,50,68`: normal timestamps produce valid ISO strings. However, an imported `2026-10-11` produces invalid `2026-10-11:00.000Z`; timestamps with offsets are incorrectly relabelled UTC. Lexical sorting mishandles mixed representations. Stable sorting preserves construction order for ties, which is grouped by record type, not actual activity order. **Fix:** validate and normalize timestamps, sort numerically, and preserve an event sequence for ties.

- **Timeline fabricates historical timing.** `runs.ts:54,56` dates current counts using source creation time; line 63 dates assessment generation using course-version time, or silently drops it when the version is missing. Editing or deleting records rewrites history. **Fix:** persist actual events and timestamps, or label this a current-record summary.

- **Unstable timeline identity.** `Office.tsx:46` uses array indexes as keys. Inserting or removing earlier events reuses focused “Open” buttons for different records. **Fix:** add stable source/event IDs to `RunEvent` and use them as keys.

- **Progress completion is too permissive.** `journey.ts:29,31,35,36,38`: any nonempty ID counts as a course, seeded topics count as confirmation, unrelated quotations and reviewed sources satisfy confirmation, any mapping qualifies, and an unlinked draft session completes planning. **Fix:** validate the selected course and require the specific reviewed, linked outputs described by each step.

- **Null course can open the wrong workspace.** `Journey.tsx:11,47` allows later steps with `subjectId=null`, retaining an existing global selection or opening Studio without a course. **Fix:** route these actions to course selection until a valid subject exists.

- **Benchmark errors disappear from diagnostics.** `benchmark.ts:39,40` compares skills but ignores requirement levels. Changing one gold level produced **96.15% level accuracy with zero misses**, allowing `Evaluation.tsx:57` to claim every label matches. `scanBenchmark.ts:35` also labels “R is welcome” as required because one level covers the entire sentence. **Fix:** label and compare requirement levels per skill.

- **Undefined versus zero is confused.** `benchmark.ts:38` returns null F1 when precision and recall are both zero despite nonempty gold/proposals. Other denominator guards in this file and `evidenceReport` prevent division by zero. **Fix:** return zero for that defined failure case; reserve null for missing denominators.

- **Brand fallback persists across prop changes.** `BrandImage.tsx:8,9`: after one image fails, changing `name` never retries. **Fix:** associate failure with the requested URL or reset the component by URL.

## 2. Accessibility and UX problems

References below use [WCAG 2.2](https://www.w3.org/TR/WCAG22/). These are source-based findings, not a completed browser or screen-reader audit.

- **Focus management:** `Shell.tsx:56,84,107` removes focused account/sidebar controls without returning focus to their trigger. Changing Office’s course selector also moves focus to `<main>`, interrupting continued selection. Restore trigger focus on dismissal and retain selector focus when only its value changes. Relevant: 2.4.3.

- **Button names omit visible words:** `Journey.tsx:47` displays “Do it” but names it “Do [step]”. `Shell.tsx:231,248` displays “Search or jump to” but names it “Search (Ctrl+K)”. Include the complete visible label in the accessible name. Relevant: 2.5.3.

- **Colour-only progress:** `Journey.tsx:44` and `global.css:370` identify the next card through coloured borders/shadows. Completed checkmarks are hidden from assistive technology. Add explicit “Next” and “Done” status text to each card. Relevant: 1.4.1 and 1.3.1.

- **Contrast:** `global.css:6,10` defines `--ink-3: #62676d` on white, approximately **5.71:1**, so this pairing does **not** fail normal-text AA. However, `ShareBar.tsx:15` draws those interval whiskers over blue bars, with approximately **1.1:1** contrast. Give the whiskers a contrasting backing or separate track. Relevant: 1.4.11.

- **Hover-only numbers:** `ShareBar.tsx:11` exposes interval endpoints through an SVG title and accessible name, but provides no persistent equivalent for sighted keyboard or touch users. Print the interval alongside the percentage. Native browser tooltips are exempt from 1.4.13’s additional-content requirements; this remains an access problem.

- **List semantics:** `ShareBar.tsx:26` renders related chart rows as anonymous divs. Use a list or table to associate labels and values. Lists elsewhere with `list-style:none`, including `global.css:394,431,436`, need Safari/VoiceOver verification; explicit list roles can preserve semantics.

- **Mobile reflow:** `Evaluation.tsx:51` fixes bars at 260px. At 360px, the supplied padding leaves approximately 290px, so that chart fits. At WCAG’s 320px reflow width, approximately 250px remains and the SVG exceeds it. `global.css:456` stacks rows but does not resize SVGs. Use responsive width and a viewBox. Relevant: 1.4.10.

- **Reduced motion:** `global.css:180` covers CSS animation, but `demo/runner.ts:32` still animates the cursor through `requestAnimationFrame`. Respect the media preference in JavaScript and provide immediate positioning or a static walkthrough. This is good practice; interaction-animation criterion 2.3.3 is AAA.

## 3. Honesty check

- **The four PROOF figures, `Landing.tsx:19` through `22`:**
  - **152:** matches the suite sum and the as-built report’s October 9 result. Hardcoding “pass on the current code” does not establish current success. `Evaluation.tsx:62` similarly asserts an October 11 run without linking a result. Show a dated verification artifact and commit.
  - **727 in 1.7 seconds:** the as-built report, line 46, supports 727 Stripe postings on October 9. Neither requested reference establishes 1.7 seconds. Name the board, date and recorded timing conditions.
  - **0 keys, works offline:** no model key is required, but live collection needs network access and the local API; document parsing also uses the API. Scope “offline” to supported saved-data workflows.
  - **100%, every view:** quotation cards and Evaluation revalidate, but `evidenceReport` and `runTimeline` do not verify excerpts before counting them. Replace this universal claim with the specific verification points.

- **“See the trend,” `Landing.tsx:14`:** the code reports a cross-sectional sample. `evidence.ts:185` explicitly says no comparable earlier window exists. Rename it “See the counts”.

- **“What actually happened,” `Office.tsx:44`:** reconstructed records cannot establish creation order or actual agent execution. `runs.ts:44` also describes saved-sample imports as fetched activity. Distinguish recorded, imported and live-fetched work.

- **“The proofs re-run it,” `Evaluation.tsx:58`:** no proof script references `runScanBenchmark`. Add it to verification or remove the sentence.

- **Duplicate “Pass,” `Evaluation.tsx:43`:** always true. `benchmark.ts:55` counts stored `duplicateOf` flags without recomputing fingerprints or checking counting integrity. Call it a recorded duplicate count, or implement the claimed check.

- **“Your data stays in your browser,” `Landing.tsx:92`:** uploads go to `/api/parse`; configured model requests send payloads onward. Say “Workspace storage is local” and disclose request processing. Likewise, `Shell.tsx:349` claims “Verified coordinator identity” despite prototype personas and no institutional verification.

- **“In an afternoon,” `Landing.tsx:87`, and colleagues receiving briefs:** no lecturer pilot establishes the timing, and delivery is browser-local persona switching. Label these as intended workflow and local demonstration.

- **Reference inconsistency:** `README.md:19,33` says collection and slide export are absent, contradicting its lines 49 to 62 and the as-built report. Correct the README; those stale statements are not evidence that the implemented features are fictitious.
