# Lyceum: lecturer and section guide

Reviewed 22 October 2026. Generated from the same section catalogue used by the in-app **Guide & progress** page. Run `node scripts/generate-guide.mjs` after changing that catalogue.

## Start a useful lecturer session

1. Start the app (`npm run dev`; use `npm.cmd` in Windows PowerShell). Choose Dr Sobri or Ms Tan on the demo sign-in page. These are local personas, not authenticated accounts.
2. Open **Courses**. Choose an assigned course or **Create course workspace** to enter a unique code, title and optional programme. A personal workspace is private preparation, not an official university course. Below your courses, **the programme wall** shows each course of the programme as a ring for this term and the CLO to PLO matrix across the programme from the recorded outlines; a lecturer sees the courses they hold, and coordinators and the programme owner see them all.
3. The course opens on **Course**, the setup step: what the course promises today. Set the term this loop runs for first, so the brief, the decision, the version and the results all carry it. The path across the top of every step lists the six steps that follow, **Watch**, **Report**, **Decide**, **Update**, **Teach** and **Learn**, with **History** as the record beside it; the step's helper asks its question just below. A step says Done only when its record exists this term; a new term starts a new loop and keeps the last one on the record. A course with a course record (the demo's CS310, a labelled sample) shows it in the order of a course file: synopsis and learning time, outcomes and the CLO to PLO matrix, the assessment plan and rubrics, the fourteen-week schedule with each week's material, and references; **Export the course file (.zip)** writes it with a manifest that marks each item present, sample, not yet built or not included.
4. **Watch**. Run a research run against a permitted employer board (Greenhouse or Lever, through the local API) or the dated saved sample, keep the postings worth reading, or paste a document you are permitted to keep. Freeze a snapshot of the reviewed evidence at each review and compare the next window with it. Collection happens only when you ask, and nothing changes the course by itself.
5. **Report** has its own five steps. **Quote**: name the skills, scan, and confirm each proposed sentence beside its source (a paraphrase is rejected). **Review**: mark the postings you have read so they count. **Count**: each skill's share with its numerator, denominator and 95% Wilson interval. **Map**: place each skill on an outcome's coverage ladder against a target. **Brief**: prepare the meeting brief with its receipts, download it as a document or editable slides, or send it to the people who decide; with a snapshot, the brief reports what changed since it.
6. **Decide**. A coordinator or the programme owner who received the brief records adopt, retain, defer or return with a required reason. A decision on your own brief is self-recorded and stays open until a second person decides, except on a personal single-owner course. A record is never edited; deciding again adds a new one. Retain is a complete outcome: Update then shows no change this term.
7. **Update**. An existing course needs **Start course revision**; a new personal course starts with an empty revision. Record the course brief and only the constraints you know; add CLO wording, Bloom level, achievement evidence and optional programme-outcome mappings; add topics, hours, weeks, CLO links and prerequisites; protect foundational content that must remain. **Save revision**, then **Check saved revision**: errors such as broken links, prerequisite cycles and exceeded time budgets block the candidate, while unknown budgets and missing evidence remain visible warnings. Inspect **Before and after** (the change in words, each changed outcome as a redline with **Hide changes** for the clean text, each topic's hours as a dumbbell, and the topics and hours as current against proposed) and the affected teaching work, record why and the teaching term, then the coordinator (or the owner of a personal course) chooses **Use as my course version**. The baseline is preserved; university approval stays in its existing process. **Discard revision** requires a reason and leaves the current version unchanged. With no revision open, Update shows the change in use against the version it replaced; **History** names the decision behind each version and compares it with the one before, the week's pack included, with a changed slide to swipe or fade between the two; a scrubber steps through the versions, oldest to newest.
8. **Teach**. Save course notes and add a session with a week, topic, duration, CLO links, activity and check for understanding. Ready and delivered sessions require preparation details; those checks do not establish teaching effectiveness. Course changes flag affected sessions and assessments for review while keeping the content. **Teaching pack (.pptx)** on any session downloads an editable deck built from the saved session and the evidence linked to its outcomes, with a preview of every slide on its card; the meeting brief also downloads as slides. The generator adds no text of its own. A session's check can carry items: the templates draft a multiple-choice item, a short answer and an essay for each linked outcome from its words and the course's recorded misconceptions; you write each key and accepted answer, the lint names each rule an item fails, a person marks the items reviewed, and the items that pass export for Moodle (XML) and as QTI 2.1. The week 7 sample quiz has ten. The Moodle XML is not yet imported into a Moodle, and the QTI package is unvalidated. On the demo course, the term's fourteen sample sessions sit below your own, with four weeks of full slides, outline packs for the rest, lab sheets and the project brief, all written for this prototype and labelled synthetic; they stay as written and never count as your teaching. A card whose pack changed with a new course version shows what changed, slide by slide. The assessment blueprint and template items sit behind a disclosure on this step; an affected assessment needs a recorded course-change review and repaired links before another submission.
9. **Learn**. File the term's results or a CLO survey on this step; you confirm the course version the results are for, by default the version this term's sessions were saved on, and the step is done when this term's results are filed and matched to it. Attainment per outcome is shown against the institution's stated pass mark and KPI, with n of N. The OBE course report sets the Course Outcome Survey beside the marks, never averaged with them, lists the programme outcomes with no index and keeps the CQI note; save it as printed, and print it at A4. The term's two surveys run from here: the booth collector with a QR for phones, or for a campus a document for Microsoft Forms Quick Import, importers for Microsoft Forms, Google Forms and Moodle Feedback, and a paste code that says it is not anonymous; no result shows below the floor or before grades are released. **Results between terms** draws each outcome's share from last term's sample file to this term's at today's pass mark, with the same numbers in a table; an outcome reworded between the terms is drawn broken and not compared. No learning gain is claimed; the benchmark has not been run. **History** keeps the course versions and the recorded decisions on one timeline and exports a previous outline. **Export current outline** and **Export plan (.md)** write readable Markdown documents, which are not slide decks or restorable backups.
10. In **Guide & progress** or the Backups panel on **Courses**, download a JSON workspace backup. To restore, choose the JSON file, review counts and export date, acknowledge replacement, then restore. Download the pre-restore recovery copy to recover the previous workspace. Backups exclude original uploaded files, credentials and unsaved edits.
11. The earlier proposal and approval chain, with its illustrative acceptance forecast, is kept in the research sandbox and labelled illustrative. Decisions on the loop are recorded in Decide.

## Saving and navigation

- Courses, saved revisions, version history, plans and notes are kept in this browser. There is one teaching plan per course, shared by its assigned local personas. There is no cross-device sync, separate term archive or institutional database yet.
- Each editor has an explicit Save button. Moving between Course, Update, Teach and History preserves an open editor. Leaving for another page or course, switching persona or closing the page warns about unsaved edits. Save before downloading a JSON backup; it contains saved workspace data.
- A visible storage warning means changes cannot survive closing the page. Download a JSON backup or Markdown export while the page is open. A restore that cannot be written to storage leaves the current workspace unchanged.
- Reset workspace removes local saved work and restores seed examples. Download a JSON backup first. A Markdown outline/plan cannot be restored; only the validated JSON workspace format can.
- Play demo is available on sign-in/public screens and Guide & progress. It resets the local workspace; existing saved work triggers a confirmation first. Download a workspace backup before continuing.
- **For judges: walk with Tualang** (the landing page and Guide & progress) opens the judge's page. **Walk the loop** restores the sample workspace, the tour's end state, keeping the current workspace as the recovery copy under Backups, and moves stop by stop with Next, Back and Esc. **The term recap** (Home once the ring closes, or History) prints one A4 page from the records. At the booth, **#/kiosk** plays the 90-second loop muted with a pause, a touch walks the loop, and thirty seconds without a touch return to it; copy the film beside the app first with `node scripts/kiosk-film.mjs`.
- The path across a course's steps and the receipts ring on Home read your saved work: a step is done only when its record exists this term. **How it works** shows the seven roles and the record of each step on your course, with derived lines labelled; **Evaluation** shows the live checks and benchmarks.
- Use **How to use [section]** above each signed-in page for contextual instructions. **Guide & progress** includes every section, a role filter, search and unfinished development work.
- Ctrl+K opens navigation search. The Report sub-rail supports Left and Right Arrow, Home and End. Small screens use the Navigation button and a step strip above each step. Keyboard focus is visible and a skip link leads to main content.

## How to read the status labels

- **Working locally:** usable with browser-local state; not a production service.
- **Partial:** some actions work, with material workflow or persistence gaps.
- **Demonstration:** illustrates a proposed workflow with synthetic data or unvalidated calculations.

The seeded catalogue, market figures and learner examples are illustrative. Uploaded material is user-provided; confirmation does not independently verify a source. No feature status implies WCAG conformance or validated educational predictions.

## Home

**For:** Everyone · **Status:** Working locally

Resume course preparation and respond to work routed to you.

1. Read the receipts ring for your course in Start here: each step says Done only when its record exists this term, and Continue opens the next one.
2. Open a brief waiting for a decision. The list opens by itself when one is waiting; a brief sent to you opens here with its receipts, and if you hold the decide position you record adopt, retain, defer or return with the reason.
3. Open a notification to see the request in context. A decision on your own brief opens that course's Decide step. Your courses, with their loop summaries, are in the last disclosure.

**Output:** A next action tied to an actual course, brief or session in this workspace.

**Current limit:** No real timetable, deadlines, email reminders or institutional notifications are connected.

## Courses

**For:** Lecturers and coordinators · **Status:** Working locally

Find your courses and see what preparation each one needs.

1. Search by course code or title; filter by year or preparation status.
2. Choose Create course workspace to prepare your own course with a unique code, title and optional programme; this does not create an official university course.
3. Open Outcomes & topics to build or revise the outline, or Teaching plan to prepare classes.
4. Use Backups to download or restore a validated JSON copy of this browser workspace.
5. Read the programme wall below your courses: each course of the programme as a ring for this term, closed or open, and the CLO to PLO matrix across the programme from the recorded outlines, where a course without one says so. A lecturer sees the courses they hold; coordinators and the programme owner see them all.

**Output:** A course workspace with the selected course carried into Studio.

**Current limit:** The initial catalogue is illustrative. Personal courses use your entered content and have no calibrated market or learning score. Counts describe saved work, not academic quality.

## Course, Update, Teach and History

**For:** Assigned lecturers and coordinators · **Status:** Partial

Set up the course, make the decided change, prepare classes and keep a traceable local history.

1. Course: set the term this loop runs for first, so every record in it carries the term. A course with a course record shows it in the order of a course file (synopsis and learning time, outcomes and the CLO to PLO matrix, the assessment plan with its table of specifications and rubrics, the schedule with each week's material, references), and Export the course file (.zip) writes it with an honest manifest; otherwise the outline as cards, outcomes with their Bloom level and topics with their hours against the contact-hour budget. One action: Watch employers while the course has no evidence, Start a revision once it has. Teaching context, documents, the preparation checklist and the illustrative sandbox sit behind disclosures.
2. Update: start a revision. The hours meters, the number of changes and the check state open it. Add, edit or remove CLOs and topics; record achievement evidence, PLO mappings, hours, prerequisites and protected foundations. Save and check it, inspect the warnings and the before and after (the summary in words, each changed outcome as a redline, each topic's hours as a dumbbell and as current against proposed), then record the rationale and teaching term. The coordinator, or the owner of a personal course, makes it the course version; university approval stays in its existing process. The sessions and assessments a change affects are listed behind a disclosure. When the decision was retain, Update shows no change this term, and says so if a version was adopted anyway; with no revision open it shows the change in use against the version before.
3. Teach: session cards by week, your own first, each with its linked outcomes, a preview of its editable teaching pack (.pptx) built from the session, the course record and the employer evidence behind its outcomes, and what changed in the pack since the previous version. The demo course's sample sessions follow, labelled synthetic, with full slides for four weeks, outline packs for the rest, the lab sheets and the project brief. Save CLO-linked sessions, activities, learning checks and references, and export the plan. A session's check can carry items: the templates draft a multiple-choice item, a short answer and an essay for each linked outcome from its words and the course's recorded misconceptions; you write each key and accepted answer, the lint names each rule an item fails, a person marks the items reviewed, and the items that pass export for Moodle (XML) and as QTI 2.1. The week 7 sample quiz has ten. The assessment blueprint and template items sit behind a disclosure. Review affected sessions after a course change.
4. History: versions and decisions on one timeline, newest first. Each version names the decision that authorised it and opens it, or says there is none, and compares itself with the version it replaced, the week's pack under both included, with a changed slide to swipe or fade between the two; a scrubber steps through the versions oldest to newest, each stop with who saved it, when and what changed; each entry opens to its outline, with an export, or to its decision and reason; the revision log sits behind a disclosure. The term recap opens from here.

**Output:** An editable course definition, candidate and active local versions, the decision history, a teaching plan, Markdown outlines and an assessment draft.

**Current limit:** One teaching plan per course in this browser. Local version activation does not attest institutional approval. Slide packs are generated from saved data and the generator adds no text of its own; the sample course's slides are written for this prototype and labelled synthetic. Model-drafted slide content and template import remain to be built. A template never writes an item's key, and the lint cannot judge whether a key is defensible or a distractor plausible; the Moodle export is not yet imported into a Moodle and the QTI package is unvalidated. Configurable institution-wide reviews, term archives and accurate assessment allocation remain to be built. Agent drafting still uses fixtures.

## Watch

**For:** Assigned lecturers and coordinators · **Status:** Working locally

See what employers are asking for, right now and over time.

1. Run a research run against a permitted employer board (Greenhouse or Lever, through the local API) or the dated saved sample. Collection happens only when you ask.
2. Keep the postings worth reading. Each keeps its link, publication date, retrieval time and fingerprint; a copy of a kept posting is flagged as a duplicate and not counted twice.
3. Paste a document you are permitted to keep, such as an employer letter or an advisory board note, with its exact text.
4. Freeze a snapshot of the reviewed evidence at each review and compare a later window with it. A skill is called rising or falling only when the two 95% intervals separate.

**Output:** Dated sources with their receipts, and frozen snapshots to compare.

**Current limit:** Two documented board APIs and a dated saved sample only; no other sites, no scheduled refresh and no employer-balanced view. A convenience sample describes the postings kept, not the labour market.

## Report

**For:** Assigned lecturers and coordinators · **Status:** Working locally

Say exactly what employers ask, how often, and what the course does about it.

1. Quote: name the skills, scan the kept postings and confirm each proposed sentence beside its source, with the matched words highlighted. A paraphrase is rejected.
2. Review: mark the postings you have read so they join the denominator. Unreviewed postings are not counted.
3. Count: read each skill's share as postings of reviewed postings, with its Wilson 95% interval. There is no score.
4. Map: place each quoted skill on an outcome's coverage ladder (absent, introduced, practised, assessed) against a target.
5. Brief: prepare the meeting brief with every receipt, download it as a document or as editable slides, and send it to the people who decide. With a snapshot, the brief reports what changed since it.

**Output:** Confirmed quotations, a reviewed denominator, counts with intervals, coverage mappings and a meeting brief with receipts.

**Current limit:** Counts describe the recorded set only. The scan proposes and a person confirms; nothing counts without review. The brief recommends; it does not decide.

## Decide

**For:** Coordinators and the programme owner; lecturers send briefs · **Status:** Working locally

Record what will be done about the brief, by whom, when and why.

1. Open the latest brief from Home or this step. It shows its recipients, who has read it and what each person decided.
2. Choose adopt, retain, defer or return and write the reason. The note travels with the record.
3. A decision on your own brief is self-recorded and the step stays open until a second person decides, except on a personal single-owner course.
4. To change your mind, record again: the earlier record stays and the newest is your standing decision. A newer brief supersedes the older one, whose decisions stay on record. A decision taken before the evidence changed is marked as such.

**Output:** An immutable decision record bound to the brief, the course version and the term, on the course timeline.

**Current limit:** Positions are local personas and role checks are not authenticated server authorization. A recorded decision does not by itself establish official university approval. The mock-cohort try is illustrative.

## Change proposal

**For:** Lecturers and coordinators · **Status:** Demonstration

Explore the prototype's earlier proposal and approval chain in the illustrative sandbox.

1. Start a draft for a course or continue an open one.
2. Edit the proposed outcomes and topics, ask for an agent review and submit for coordinator review.
3. Run the acceptance scenario and pass the proposal to the approval sandbox.

**Output:** An illustrative proposal with its review history.

**Current limit:** This is the earlier approval chain, kept for exploration. Course decisions are recorded in each course's Decide step. Forecasts are uncalibrated and agent drafting uses fixtures.

## Learn

**For:** Assigned lecturers and coordinators · **Status:** Partial

See what came back for each outcome, as far as we can honestly tell.

1. Read attainment per outcome from the latest results file: the students at or above the institution's pass mark over n, the KPI, the mean and its spread, and n of N, where N is the students the file lists; an interval shows only when some have no mark.
2. Read the OBE course report: the Course Outcome Survey's share beside the marks, never averaged with them, and the programme outcomes listed with no index. Write the CQI note, save the report as printed, and print it at A4.
3. Read Results between terms: each outcome's share from last term's sample file to this term's at today's pass mark, as lines with the same numbers in a table; an outcome reworded between the terms is drawn broken and not compared.
4. File the term's results or a CLO survey. You see what was read beside what it was taken to mean, and you confirm the course version the results are for; by default it is the version this term's sessions were saved on.
5. Check the results and surveys filed for the course. A seeded example is labelled and never counts.
6. Run the term's two surveys: prepare the Course Outcome Survey and the SSRT, a demo instrument, from the course record. At the booth, open one for the collector and show its QR to phones on the laptop's network. On a campus, download it as a document for Microsoft Forms Quick Import, import the results from Microsoft Forms, Google Forms or Moodle Feedback, or share the paste way's link and read back the codes students paste, which are not anonymous to the channel they are pasted into. Nothing beyond the count shows until the floor is met and the coordinator records grades released, and booth answers never count.
7. Open the benchmark protocol and its status, and read what is planned for the pilot.

**Output:** A results file matched to the version taught, attainment per outcome against a stated threshold with n of N, and the OBE course report saved as printed.

**Current limit:** No learning gain is claimed; the benchmark has not been run. Pooling, frozen predictions, comment themes and the programme's PLO figure are planned. N is read from the file, not from an enrolment record.

## Upload

**For:** Assigned lecturers and coordinators · **Status:** Partial

Read a document and review its interpretation before filing it.

1. Choose a supported PDF, PPTX or spreadsheet with the local API running. Results and surveys can also be filed from Learn.
2. Check extracted text/tables, document type, course and term in the preview; for results, confirm the course version taught.
3. Correct the interpretation and confirm; inspect the filed record in Learn or the Data room.

**Output:** Extracted records and source metadata in this browser's workspace.

**Current limit:** Confirmation records a reviewed upload and never marks it institutionally verified. Original files are not a durable library or part of JSON backups. Structured survey/result matching needs further validation.

## Acceptance test

**For:** Assigned lecturers and coordinators · **Status:** Demonstration

Explore the prototype's curriculum sequencing and readiness scenario.

1. Prepare a proposal in the sandbox; a lecturer-authored proposal needs coordinator review first.
2. Run the scenario from the proposal.
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

Review a tested proposal in the illustrative sandbox and record a decision with its reasoning.

1. Read the proposed changes, illustrative scenario report and review history.
2. Approve the tested candidate or return it with a reason. Changes after testing require a new check; a changed baseline cannot be approved.
3. Inspect the resulting local course version in Studio History and the illustrative prediction in Closed loop.

**Output:** Actual candidate CLO/topic edits in a new local version, the preserved baseline and a local decision event; approval also records an illustrative prediction.

**Current limit:** This remains the prototype's fixed review chain with uncalibrated forecasts, kept in the sandbox; decisions on the loop are recorded in Decide. Role checks are local, not authenticated server authorization. A local decision does not independently establish official university approval.

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

See the loop with the host at its centre and the seven helpers at their stations, what each reads, produces and cannot do, and the real record of what happened on your course.

1. Choose a helper on the loop, or its card, to read what it reads, produces and cannot do. Decide is the station where people decide.
2. Choose See the record on this course to open its timeline. Lines from the event log (briefs prepared, sent and read, decisions, snapshots, adoptions, term changes) carry the time they happened; lines worked out from the records are labelled derived.
3. Use Open on a timeline entry to jump to the step that holds it.

**Output:** A step-by-step record of the work done on a course, told by role, with a link to each result.

**Current limit:** Roles are deterministic workflow steps with optional model help, not autonomous agents. The timeline shows only recorded work; it never invents reasoning or activity, and a derived line never claims a time it does not have.

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

## Institution settings

**For:** Everyone reads; a coordinator edits · **Status:** Working locally

Say which campus the workspace runs for and every setting that shapes a figure: the pass mark and share for attainment, the survey scale and response floor, the release rule, the platform and the data controller.

1. Open Guide & progress and the Institution panel.
2. Read each setting with where its default comes from; the demo profile is UTP's, labelled demo.
3. As a coordinator, change a setting and save it; it travels in the workspace backup.

**Output:** One institution profile per workspace, saved in the backup.

**Current limit:** One profile per browser workspace; a pilot tenant would set its own, with permission to show its own mark.

## For judges

**For:** Everyone, signed in or not · **Status:** Working locally

Meet the loop in a few minutes: walk it stop by stop on the sample workspace, see one change before and after, or read how the local door answers.

1. Open the judge's page from the landing page or from this Guide.
2. Choose Walk the loop: ten stops over the real app on the sample workspace, the tour's end state. Next, Back and Esc move it, and each stop's caption says what is real and what is synthetic.
3. Choose Before and after for one change three ways, or Ask the door for the question to put to the local door.
4. Read what is proven today, the register's four figures counted up once as they come into view, and what is not built, word for word from this Guide.

**Output:** A guided look at every step's record on one course, with the honesty label at every stop.

**Current limit:** The walk replaces this browser's workspace with the sample workspace and keeps the current one as a recovery copy under Backups. The door runs only on a laptop with Claude Desktop configured; the page cannot reach it.

## The booth's kiosk

**For:** The team at the booth · **Status:** Working locally

Between judge teams: the 90-second loop playing by itself, Tualang resting, and a touch to walk the loop.

1. Copy the film beside the app once: node scripts/kiosk-film.mjs copies the existing Loop90 render with its date. Without it the kiosk says the film is not on this laptop.
2. Open #/kiosk on the booth laptop. Kiosk mode stays on in that tab until Leave kiosk mode.
3. The loop plays muted on repeat and Pause stops it; under reduced motion it waits for Play.
4. A touch anywhere walks the loop on the sample workspace, without asking.
5. Thirty seconds without a touch, a key or a scroll anywhere in the app bring the next visitor back to the kiosk, after a ten-second warning; a playing tour holds it.

**Output:** A booth screen that resets itself between visitors.

**Current limit:** The film is the render of 22 October, a capture of the app as it was that afternoon; screens added since are not in it until it is rendered again. Chrome's kiosk flag and a browser-only account on the laptop are set up by hand.

## Term recap

**For:** Everyone who may open the course · **Status:** Working locally

One page per course and term from the records: what employers asked for, what was decided, what changed, what was taught and what came back.

1. Open it from History, or from Home once the ring closes.
2. Read each part: every number is read from a record in this workspace, and the sample course says it is synthetic.
3. Print it, or save it as a PDF, at A4.

**Output:** A printable A4 recap with the sample line and the honesty line.

**Current limit:** The OBE report shows here once it is saved on Learn, as printed. The recap does not attest institutional approval.

## What has not been built yet

- **Evidence collection:** On-request collection from the Greenhouse and Lever board APIs, exact-excerpt receipts, fingerprint duplicate detection, lexicon-assisted scanning, reviewed denominators and meeting briefs work. Scrapling page adapters, snapshots of arbitrary sites, cross-site vacancy clustering, scheduled refresh and refresh-failure reporting remain planned. Frozen evidence snapshots and their comparison work; a re-collected posting is matched by its board posting id.
- **Defensible calculations:** Observed shares with explicit numerators and denominators, Wilson intervals, reviewed coverage stages and a demand-weighted coverage index work for recorded evidence. Comparable time windows, employer-balanced sensitivity views, publication gates and validation against real course/cohort data remain planned.
- **Institutional review:** Local CLO/topic editing, constraints, word-level before and after views and version activation work; decisions on briefs are recorded with their reason, person, course version and term, and each version names the decision behind it. One institution profile per workspace works, the demo's, labelled demo. Configurable review authorities, positions as data, term archives and server-enforced decisions remain to be built.
- **Teaching materials:** Editable PPTX teaching packs and brief decks are generated from saved sessions, outcomes and evidence receipts, with speaker notes; the generator adds no text of its own. The sample course's packs carry slide masters with the demo institution's mark, and its sample slides are written for this prototype and labelled synthetic. A session's check can carry items, drafted from templates with a surface lint and a person's review, exported as Moodle XML and QTI 2.1. Model-drafted slide content with lecturer review, selective regeneration, a campus's own template, handouts, accessibility checks of exported decks, a real import into a Moodle, validation against the QTI schema and item statistics remain planned.
- **Results and student surveys:** Attainment per outcome against a stated pass mark, with n of N and an interval only when some students have no mark, works, and so does the OBE course report saved as printed, with the Course Outcome Survey beside the marks, the programme outcomes listed and the CQI note. The two student surveys work with a booth collector on the local API, importers for Microsoft Forms, Google Forms and Moodle Feedback exports (the Moodle one not yet tried on a Moodle export), a document for Microsoft Forms Quick Import (not yet imported into Forms), a paste code labelled not anonymous, a response floor and a release rule. Pooling, frozen predictions, comment themes, the programme's PLO figure and a validated survey instrument remain planned.
- **Agent integrations:** A local, read-only MCP server over an exported workspace works (mcp/, docs/doors.md), with a skill folder for assistants. Remote access with OAuth, the Teams, Google Workspace and LMS doors, structured model output, provider SDK adapters, job retries, usage and cost controls and evaluation fixtures remain planned.
- **Shared institutional workspace:** Database, authenticated roles, durable source files, validated legacy migration, term/cohort separation and collaboration. JSON backup/restore works locally; it does not include original uploaded files.
- **Accessibility and pilot validation:** Full WCAG 2.2 AA audit, screen-reader testing, accessible exports and a real lecturer trial. Current improvements are not a compliance certification.

The [implementation plan](lyceum-improvement-plan.md) contains the evidence, mathematical design, provider/subscription options, release phases and audit findings. The lecturer workspace is a first implementation slice of that plan; the full vision remains in development.
