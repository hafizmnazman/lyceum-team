# Lyceum: lecturer and section guide

Reviewed 11 October 2026. Generated from the same section catalogue used by the in-app **Guide & progress** page. Run `node scripts/generate-guide.mjs` after changing that catalogue.

## Start a useful lecturer session

1. Start the app (`npm run dev`; use `npm.cmd` in Windows PowerShell). Choose Dr Sobri or Ms Tan on the demo sign-in page. These are local personas, not authenticated accounts.
2. Open **Courses**. Choose an assigned course or **Create course workspace** to enter a unique code, title and optional programme. A personal workspace is private preparation, not an official university course.
3. Open **Outcomes & topics**. An existing course needs **Start course revision**; a new personal course starts with an empty revision.
4. Record the course brief and only the constraints you know. Add CLO wording, Bloom level, achievement evidence and optional programme-outcome mappings. Add topics, hours, weeks, CLO links and prerequisites. Protect foundational content that must remain.
5. **Save revision**, then **Check saved revision**. Incomplete drafts can be saved. Errors such as broken links, prerequisite cycles and exceeded time budgets block use of the candidate. Unknown budgets and missing evidence remain visible warnings.
6. Inspect **Before and after** and affected teaching work. Record why you are changing the course and the teaching term. Review the acknowledgement, then choose **Use as my course version**. This activates the local outline and preserves the baseline; university approval stays in its existing process. **Discard revision** requires a reason and leaves the current version unchanged.
7. Open **Evidence**. Run a research run against a permitted employer board (Greenhouse or Lever, through the local API) or the dated saved sample, keep the postings worth reading, scan them for the skills you name and confirm each exact quotation (a paraphrase is rejected), mark the extraction reviewed so the postings count, map each quoted skill to an outcome with a reviewed coverage stage and target, freeze a snapshot of the reviewed evidence at each review and compare the next window with it, then prepare a meeting brief to download or send to a colleague; with a snapshot, the brief reports what changed since it. You can also paste a document you are permitted to keep. Shares show the numerator and denominator with a 95% Wilson interval. Collection happens only when you ask, and nothing changes the course by itself.
8. Open **Teaching plan**. Save course notes and add a session with a week, topic, duration, CLO links, activity and check for understanding. Ready/delivered sessions require preparation details; those checks do not establish teaching effectiveness. Course changes flag affected sessions and assessments for review while retaining the content. **Teaching pack (.pptx)** on any session downloads an editable deck built from the saved session and the evidence linked to its outcomes; the meeting brief also downloads as slides. No model writes a word of either.
9. Use **Export current outline** or **Export plan (.md)** for a readable Markdown document. **History** lets you inspect and export previous course versions and read revision decisions. These documents are not slide decks or restorable backups.
10. In **Guide & progress** or **Courses → Backups**, download a JSON workspace backup. To restore, choose the JSON file, review counts and export date, acknowledge replacement, then restore. Download the pre-restore recovery copy to recover the previous workspace. Backups exclude original uploaded files, credentials and unsaved edits.
11. **Assessment** can prepare a blueprint without a proposal and keeps saved drafts selectable. Item generation uses local templates; exact marks/task/rubric work remains pending. An affected assessment requires a recorded course-change review and repaired links before another submission. **Proposal** retains the prototype review workflow and illustrative forecasts.

## Saving and navigation

- Courses, saved revisions, version history, plans and notes are kept in this browser. There is one teaching plan per course, shared by its assigned local personas. There is no cross-device sync, separate term archive or institutional database yet.
- Each editor has an explicit Save button. Changing tabs preserves an open editor. Leaving the page/course, switching persona or closing the page warns about unsaved edits. Save before downloading a JSON backup; it contains saved workspace data.
- A visible storage warning means changes cannot survive closing the page. Download a JSON backup or Markdown export while the page is open. A restore that cannot be written to storage leaves the current workspace unchanged.
- Reset workspace removes local saved work and restores seed examples. Download a JSON backup first. A Markdown outline/plan cannot be restored; only the validated JSON workspace format can.
- Play demo is available on sign-in/public screens and Guide & progress. It resets the local workspace; existing saved work triggers a confirmation first. Download a workspace backup before continuing.
- The journey bar in a course workspace and the Start here card on Home read your saved work: a step is done only when the workspace holds its result. **How it works** shows the seven roles and the real record of each step on your course; **Evaluation** shows the live checks and benchmarks.
- Use **How to use [section]** above each signed-in page for contextual instructions. **Guide & progress** includes every section, a role filter, search and unfinished development work.
- Ctrl+K opens navigation search. Course tabs support Left/Right Arrow, Home and End. Small screens use the Navigation button. Keyboard focus is visible and a skip link leads to main content.

## How to read the status labels

- **Working locally:** usable with browser-local state; not a production service.
- **Partial:** some actions work, with material workflow or persistence gaps.
- **Demonstration:** illustrates a proposed workflow with synthetic data or unvalidated calculations.

The seeded catalogue, market figures and learner examples are illustrative. Uploaded material is user-provided; confirmation does not independently verify a source. No feature status implies WCAG conformance or validated educational predictions.

## Home

**For:** Everyone · **Status:** Working locally

Resume course preparation and respond to work routed to you.

1. Open a course to continue preparation.
2. Use the work queue for drafts or reviews in your role.
3. Open a notification to see the request in context. An evidence brief opens here with its receipts and can be downloaded.

**Output:** A next action tied to an actual course, session or proposal in this workspace.

**Current limit:** No real timetable, deadlines, email reminders or institutional notifications are connected.

## Courses

**For:** Lecturers and coordinators · **Status:** Working locally

Find your courses and see what preparation each one needs.

1. Search by course code or title; filter by year or preparation status.
2. Choose Create course workspace to prepare your own course with a unique code, title and optional programme; this does not create an official university course.
3. Open Outcomes & topics to build or revise the outline, or Teaching plan to prepare classes.
4. Use Backups to download or restore a validated JSON copy of this browser workspace.

**Output:** A course workspace with the selected course carried into Studio.

**Current limit:** The initial catalogue is illustrative. Personal courses use your entered content and have no calibrated market or learning score. Counts describe saved work, not academic quality.

## Course Studio

**For:** Assigned lecturers and coordinators · **Status:** Partial

Develop the course outline, prepare classes and keep a traceable local revision history.

1. Overview: inspect current outcomes, prerequisites, source records and unfinished preparation.
2. Outcomes & topics: start a revision. Add, edit or remove CLOs and topics; record achievement evidence, PLO mappings, hours, prerequisites and protected foundations.
3. Save and check the revision. Fix errors, inspect warnings and the before/after comparison, then record your rationale and teaching term. Use as my course version requires your explicit review; university approval stays in its existing process.
4. Evidence: run a research run against a permitted employer board or the dated saved sample, keep the postings worth reading, scan them for the skills you name and confirm each exact quotation (paraphrases are rejected), mark the extraction reviewed so the postings count, map each quoted skill to an outcome with a reviewed coverage stage and target, freeze a snapshot of the reviewed evidence at each review and compare a later window with it (a skill is called rising or falling only when the two 95% intervals separate), then prepare a meeting brief to download as a document or as editable slides, or send to a colleague; once a snapshot exists the brief reports what changed since it. Shares show the numerator, denominator and a Wilson interval. Collection happens only when you ask.
5. Teaching plan: save CLO-linked sessions, activities, learning checks and references; export the plan; download an editable teaching pack (.pptx) for any session with its outcomes, the employer evidence behind them, the activity and the check. Review affected sessions after a course change.
6. Assessment: prepare a blueprint independently of a proposal, select preserved drafts and inspect illustrative item generation. A changed course requires another assessment review before submission. Proposal retains the legacy review workflow.
7. History: inspect preserved course versions and revision decisions, and export a previous outline.

**Output:** An editable course definition, candidate and active local versions, decision history, evidence receipts with an exportable report, teaching plan, Markdown outlines and assessment draft.

**Current limit:** One teaching plan per course in this browser. Local version activation does not attest institutional approval. Evidence describes the recorded set only. Collection is on request from two documented board APIs (Greenhouse and Lever) through the local API, or from the dated saved sample; snapshots compare frozen windows, but employer-balanced views and scheduled refresh are not built. Slide packs are generated from saved data with no model-written text; model-drafted slide content and template import remain to be built. Configurable institution-wide reviews, term archives and accurate assessment allocation remain to be built. Agent drafting still uses fixtures.

## Upload

**For:** Assigned lecturers and coordinators · **Status:** Partial

Read a document and review its interpretation before filing it.

1. Choose a supported PDF, PPTX or spreadsheet with the local API running.
2. Check extracted text/tables, document type, course and term in the preview.
3. Correct the interpretation and confirm; inspect the filed record in Data room.

**Output:** Extracted records and source metadata in this browser's workspace.

**Current limit:** Confirmation records a reviewed upload and never marks it institutionally verified. Original files are not a durable library or part of JSON backups. Structured survey/result matching needs further validation.

## Acceptance test

**For:** Assigned lecturers and coordinators · **Status:** Demonstration

Explore the prototype's curriculum sequencing and readiness scenario.

1. Prepare a proposal; a lecturer-authored proposal needs coordinator review first.
2. Run the scenario from the proposal in Studio.
3. Inspect the explanation, assumptions and drill-down before treating it as a discussion aid.

**Output:** An illustrative report routed into the management review workflow.

**Current limit:** The model is uncalibrated. Editing teaching sessions or topic wording does not cause a validated learning forecast. Never treat this score as approval evidence on its own.

## Trends

**For:** Management, department and coordinators · **Status:** Demonstration

Explore how a market signal could prompt curriculum review.

1. Inspect a course's signal and source context.
2. Run the staged signal reveal to understand the proposed flow.
3. Route an update request to the coordinator or a new-subject request to the department.

**Output:** A local notification with the example signal context.

**Current limit:** Demand and coverage figures are seeded. Scrapling, live vacancies, deduplication and evidence-backed scoring are not connected.

## Approvals

**For:** Management · **Status:** Partial

Review a tested proposal and record a decision with its reasoning.

1. Read the proposed changes, illustrative scenario report and review history.
2. Approve the tested candidate or return it with a reason. Changes after testing require a new check; a changed baseline cannot be approved.
3. Inspect the resulting local course version in Studio History and the illustrative prediction in Closed loop.

**Output:** Actual candidate CLO/topic edits in a new local version, the preserved baseline and a local decision event; approval also records an illustrative prediction.

**Current limit:** This remains the prototype's fixed review chain with uncalibrated forecasts. Role checks are local, not authenticated server authorization. A local decision does not independently establish official university approval.

## Programme

**For:** Department · **Status:** Partial

Inspect the programme and coordinate work across subjects.

1. Review the flagged subjects or expand the full catalogue.
2. Inspect a subject's context.
3. Use New subject or Assignments to scope work and give someone responsibility.

**Output:** Programme context and a route into subject creation or staffing.

**Current limit:** Flags use example signals. Programme-level outcome mapping, credit constraints and accreditation exports are not implemented.

## New subject

**For:** Department · **Status:** Working locally

Create a proposed course and assign its first coordinator.

1. Enter a unique code, title, year and semester.
2. Choose a coordinator and write the first learning outcome.
3. Create the proposed subject and continue with that coordinator's workspace.

**Output:** A proposed course, first CLO, assignment and draft in local state.

**Current limit:** This does not publish an approved institutional course or validate credits and accreditation rules.

## Assignments

**For:** Department · **Status:** Working locally

Assign lecturer and coordinator responsibilities by subject.

1. Inspect existing responsibilities.
2. Choose a person, subject and role.
3. Add the assignment, then switch the demo person to inspect their course access.

**Output:** Updated local course responsibilities and navigation.

**Current limit:** People are prototype identities. There are no invitations, real institutional sign-in or shared accounts yet.

## Closed loop

**For:** Everyone · **Status:** Demonstration

Inspect recorded predictions and how comparison with later results might work.

1. Approve a tested proposal to record a prediction.
2. File later results through Upload and run the comparison.
3. Use the historical example to inspect how residuals are displayed.

**Output:** Local predicted/actual comparisons and an illustrative historical analysis.

**Current limit:** Historical outcomes are synthetic. Matching does not yet enforce cohort, term and course-version identity; model calibration has not been established.

## Data room

**For:** Everyone · **Status:** Partial

Inspect the data behind the workspace and distinguish fixtures from uploaded records.

1. Inspect source type, course, term, record count and ingestion date.
2. Read model assumptions and evidence provenance.
3. Use Upload to add your own records after checking their contents.

**Output:** A source inventory and an explanation of the current model inputs.

**Current limit:** This is not a complete source archive, citation verifier or document download library. Seed sources remain illustrative.

## How it works

**For:** Everyone · **Status:** Working locally

See the seven roles in order, what each reads, produces and cannot do, and the real record of what happened on your course.

1. Open a role card to read what it reads, produces and cannot do.
2. Choose a course to see its timeline: every line is derived from a saved record, in order.
3. Use Open on a timeline entry to jump to the tab that holds it.

**Output:** A step-by-step record of the work done on a course, told by role, with a link to each result.

**Current limit:** Roles are deterministic workflow steps with optional model help, not autonomous agents. The timeline shows only recorded work; it never invents reasoning or activity.

## Evaluation

**For:** Everyone · **Status:** Partial

See how Lyceum is tested: live checks on this workspace, the requirement scan benchmark, the automated suites, and the protocol for benchmarking the student-simulation agent against course outcomes and surveys.

1. Read the live checks; they recompute from the data in this browser on every visit.
2. Open the scan benchmark and its disagreements; extend the labelled set to test it further.
3. Read the student-agent benchmark protocol and what it needs before any learning claim is made.

**Output:** Verifiable numbers with their denominators and dates, and a benchmark plan with success criteria.

**Current limit:** The student-agent benchmark has not been run on real course data. The synthetic backtest error is not evidence of real accuracy, and no learning gain is claimed.

## Relevance Index

**For:** Public and signed-in users · **Status:** Demonstration

Explore the prototype's course relevance and source-agreement presentation.

1. Browse the catalogue and open a course.
2. Inspect its outcome, example evidence and disagreement warning.
3. Read the prototype-data notice before citing any figure.

**Output:** An illustrative course-level relevance view.

**Current limit:** Source agreement describes direction only, not reliability or truth. All shipped market records are synthetic; this is not a live labour-market ranking.

## What has not been built yet

- **Evidence collection:** On-request collection from the Greenhouse and Lever board APIs, exact-excerpt receipts, fingerprint duplicate detection, lexicon-assisted scanning, reviewed denominators and meeting briefs work. Scrapling page adapters, snapshots of arbitrary sites, cross-site vacancy clustering, scheduled refresh and refresh-failure reporting remain planned. Frozen evidence snapshots and their comparison work; a re-collected posting is matched by its board posting id.
- **Defensible calculations:** Observed shares with explicit numerators and denominators, Wilson intervals, reviewed coverage stages and a demand-weighted coverage index work for recorded evidence. Comparable time windows, employer-balanced sensitivity views, publication gates and validation against real course/cohort data remain planned.
- **Institutional review:** Local CLO/topic editing, constraints, diffs and version activation work. Institution profiles, configurable review authorities, term archives and server-enforced decisions remain to be built.
- **Teaching materials:** Editable PPTX teaching packs and brief decks are generated from saved sessions, outcomes and evidence receipts, with speaker notes and no model-written text. Model-drafted slide content with lecturer review, selective regeneration, institutional templates, handouts and accessibility checks of exported decks remain planned.
- **Agent integrations:** Distinct branded roles, structured model output, provider SDK adapters, job retries, usage/cost controls and evaluation fixtures.
- **Shared institutional workspace:** Database, authenticated roles, durable source files, validated legacy migration, term/cohort separation and collaboration. JSON backup/restore works locally; it does not include original uploaded files.
- **Accessibility and pilot validation:** Full WCAG 2.2 AA audit, screen-reader testing, accessible exports and a real lecturer trial. Current improvements are not a compliance certification.

The [implementation plan](lyceum-improvement-plan.md) contains the evidence, mathematical design, provider/subscription options, release phases and audit findings. The lecturer workspace is a first implementation slice of that plan; the full vision remains in development.
