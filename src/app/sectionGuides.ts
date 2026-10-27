import type { Screen } from "./roles.ts";

export interface SectionGuide {
  screen: Exclude<Screen, "login">;
  title: string;
  audience: string;
  purpose: string;
  steps: string[];
  output: string;
  limitation: string;
  status: "Working locally" | "Partial" | "Demonstration";
}

export const SECTION_GUIDES: SectionGuide[] = [
  {
    screen: "inbox", title: "Home", audience: "Everyone",
    purpose: "Resume course preparation and respond to work routed to you.", status: "Working locally",
    steps: ["Read the receipts ring for your course in Start here: each step says Done only when its record exists this term, and Continue opens the next one.", "Open a brief waiting for a decision. The list opens by itself when one is waiting; a brief sent to you opens here with its receipts, and if you hold the decide position you record adopt, retain, defer or return with the reason.", "Open a notification to see the request in context. A decision on your own brief opens that course's Decide step. Your courses, with their loop summaries, are in the last disclosure."],
    output: "A next action tied to an actual course, brief or session in this workspace.",
    limitation: "No real timetable, deadlines, email reminders or institutional notifications are connected.",
  },
  {
    screen: "courses", title: "Courses", audience: "Lecturers and coordinators",
    purpose: "Find your courses and see what preparation each one needs.", status: "Working locally",
    steps: ["Search by course code or title; filter by year or preparation status.", "Choose Create course workspace to prepare your own course with a unique code, title and optional programme; this does not create an official university course.", "Open Outcomes & topics to build or revise the outline, or Teaching plan to prepare classes.", "Use Backups to download or restore a validated JSON copy of this browser workspace.", "Read the programme wall below your courses: each course of the programme as a ring for this term, closed or open, and the CLO to PLO matrix across the programme from the recorded outlines, where a course without one says so. A lecturer sees the courses they hold; coordinators and the programme owner see them all."],
    output: "A course workspace with the selected course carried into Studio.",
    limitation: "The initial catalogue is illustrative. Personal courses use your entered content and have no calibrated market or learning score. Counts describe saved work, not academic quality.",
  },
  {
    screen: "studio", title: "Course, Update, Teach and History", audience: "Assigned lecturers and coordinators",
    purpose: "Set up the course, make the decided change, prepare classes and keep a traceable local history.", status: "Partial",
    steps: ["Course: set the term this loop runs for first, so every record in it carries the term. A course with a course record shows it in the order of a course file (synopsis and learning time, outcomes and the CLO to PLO matrix, the assessment plan with its table of specifications and rubrics, the schedule with each week's material, references), and Export the course file (.zip) writes it with an honest manifest; otherwise the outline as cards, outcomes with their Bloom level and topics with their hours against the contact-hour budget. One action: Watch employers while the course has no evidence, Start a revision once it has. Teaching context, documents, the preparation checklist and the illustrative sandbox sit behind disclosures.", "Update: start a revision. The hours meters, the number of changes and the check state open it. Add, edit or remove CLOs and topics; record achievement evidence, PLO mappings, hours, prerequisites and protected foundations. Save and check it, inspect the warnings and the before and after (the summary in words, each changed outcome as a redline, each topic's hours as a dumbbell and as current against proposed), then record the rationale and teaching term. The coordinator, or the owner of a personal course, makes it the course version; university approval stays in its existing process. The sessions and assessments a change affects are listed behind a disclosure. When the decision was retain, Update shows no change this term, and says so if a version was adopted anyway; with no revision open it shows the change in use against the version before.", "Teach: session cards by week, your own first, each with its linked outcomes, a preview of its editable teaching pack (.pptx) built from the session, the course record and the employer evidence behind its outcomes, and what changed in the pack since the previous version. The demo course's sample sessions follow, labelled synthetic, with full slides for four weeks, outline packs for the rest, the lab sheets and the project brief. Save CLO-linked sessions, activities, learning checks and references, and export the plan. A session's check can carry items: the templates draft a multiple-choice item, a short answer and an essay for each linked outcome from its words and the course's recorded misconceptions; you write each key and accepted answer, the lint names each rule an item fails, a person marks the items reviewed, and the items that pass export for Moodle (XML) and as QTI 2.1. The week 7 sample quiz has ten. The assessment blueprint and template items sit behind a disclosure. Review affected sessions after a course change.", "History: versions and decisions on one timeline, newest first. Each version names the decision that authorised it and opens it, or says there is none, and compares itself with the version it replaced, the week's pack under both included, with a changed slide to swipe or fade between the two; a scrubber steps through the versions oldest to newest, each stop with who saved it, when and what changed; each entry opens to its outline, with an export, or to its decision and reason; the revision log sits behind a disclosure. The term recap opens from here."],
    output: "An editable course definition, candidate and active local versions, the decision history, a teaching plan, Markdown outlines and an assessment draft.",
    limitation: "One teaching plan per course in this browser. Local version activation does not attest institutional approval. Slide packs are generated from saved data and the generator adds no text of its own; the sample course's slides are written for this prototype and labelled synthetic. Model-drafted slide content and template import remain to be built. A template never writes an item's key, and the lint cannot judge whether a key is defensible or a distractor plausible; the Moodle export is not yet imported into a Moodle and the QTI package is unvalidated. Configurable institution-wide reviews, term archives and accurate assessment allocation remain to be built. Agent drafting still uses fixtures.",
  },
  {
    screen: "watch", title: "Watch", audience: "Assigned lecturers and coordinators",
    purpose: "See what employers are asking for, right now and over time.", status: "Working locally",
    steps: ["Run a research run against a permitted employer board (Greenhouse or Lever, through the local API) or the dated saved sample. Collection happens only when you ask.", "Keep the postings worth reading. Each keeps its link, publication date, retrieval time and fingerprint; a copy of a kept posting is flagged as a duplicate and not counted twice.", "Paste a document you are permitted to keep, such as an employer letter or an advisory board note, with its exact text.", "Freeze a snapshot of the reviewed evidence at each review and compare a later window with it. A skill is called rising or falling only when the two 95% intervals separate."],
    output: "Dated sources with their receipts, and frozen snapshots to compare.",
    limitation: "Two documented board APIs and a dated saved sample only; no other sites, no scheduled refresh and no employer-balanced view. A convenience sample describes the postings kept, not the labour market.",
  },
  {
    screen: "report", title: "Report", audience: "Assigned lecturers and coordinators",
    purpose: "Say exactly what employers ask, how often, and what the course does about it.", status: "Working locally",
    steps: ["Quote: name the skills, scan the kept postings and confirm each proposed sentence beside its source, with the matched words highlighted. A paraphrase is rejected.", "Review: mark the postings you have read so they join the denominator. Unreviewed postings are not counted.", "Count: read each skill's share as postings of reviewed postings, with its Wilson 95% interval. There is no score.", "Map: place each quoted skill on an outcome's coverage ladder (absent, introduced, practised, assessed) against a target.", "Brief: prepare the meeting brief with every receipt, download it as a document or as editable slides, and send it to the people who decide. With a snapshot, the brief reports what changed since it."],
    output: "Confirmed quotations, a reviewed denominator, counts with intervals, coverage mappings and a meeting brief with receipts.",
    limitation: "Counts describe the recorded set only. The scan proposes and a person confirms; nothing counts without review. The brief recommends; it does not decide.",
  },
  {
    screen: "decide", title: "Decide", audience: "Coordinators and the programme owner; lecturers send briefs",
    purpose: "Record what will be done about the brief, by whom, when and why.", status: "Working locally",
    steps: ["Open the latest brief from Home or this step. It shows its recipients, who has read it and what each person decided.", "Choose adopt, retain, defer or return and write the reason. The note travels with the record.", "A decision on your own brief is self-recorded and the step stays open until a second person decides, except on a personal single-owner course.", "To change your mind, record again: the earlier record stays and the newest is your standing decision. A newer brief supersedes the older one, whose decisions stay on record. A decision taken before the evidence changed is marked as such."],
    output: "An immutable decision record bound to the brief, the course version and the term, on the course timeline.",
    limitation: "Positions are local personas and role checks are not authenticated server authorization. A recorded decision does not by itself establish official university approval. The mock-cohort try is illustrative.",
  },
  {
    screen: "proposal", title: "Change proposal", audience: "Lecturers and coordinators",
    purpose: "Explore the prototype's earlier proposal and approval chain in the illustrative sandbox.", status: "Demonstration",
    steps: ["Start a draft for a course or continue an open one.", "Edit the proposed outcomes and topics, ask for an agent review and submit for coordinator review.", "Run the acceptance scenario and pass the proposal to the approval sandbox."],
    output: "An illustrative proposal with its review history.",
    limitation: "This is the earlier approval chain, kept for exploration. Course decisions are recorded in each course's Decide step. Forecasts are uncalibrated and agent drafting uses fixtures.",
  },
  {
    screen: "learn", title: "Learn", audience: "Assigned lecturers and coordinators",
    purpose: "See what came back for each outcome, as far as we can honestly tell.", status: "Partial",
    steps: ["Read attainment per outcome from the latest results file: the students at or above the institution's pass mark over n, the KPI, the mean and its spread, and n of N, where N is the students the file lists; an interval shows only when some have no mark.",
      "Read the OBE course report: the Course Outcome Survey's share beside the marks, never averaged with them, and the programme outcomes listed with no index. Write the CQI note, save the report as printed, and print it at A4.", "Read Results between terms: each outcome's share from last term's sample file to this term's at today's pass mark, as lines with the same numbers in a table; an outcome reworded between the terms is drawn broken and not compared.", "File the term's results or a CLO survey. You see what was read beside what it was taken to mean, and you confirm the course version the results are for; by default it is the version this term's sessions were saved on.", "Check the results and surveys filed for the course. A seeded example is labelled and never counts.", "Run the term's two surveys: prepare the Course Outcome Survey and the SSRT, a demo instrument, from the course record. At the booth, open one for the collector and show its QR to phones on the laptop's network. On a campus, download it as a document for Microsoft Forms Quick Import, import the results from Microsoft Forms, Google Forms or Moodle Feedback, or share the paste way's link and read back the codes students paste, which are not anonymous to the channel they are pasted into. Nothing beyond the count shows until the floor is met and the coordinator records grades released, and booth answers never count.", "Open the benchmark protocol and its status, and read what is planned for the pilot."],
    output: "A results file matched to the version taught, attainment per outcome against a stated threshold with n of N, and the OBE course report saved as printed.",
    limitation: "No learning gain is claimed; the benchmark has not been run. Pooling, frozen predictions, comment themes and the programme's PLO figure are planned. N is read from the file, not from an enrolment record.",
  },
  {
    screen: "upload", title: "Upload", audience: "Assigned lecturers and coordinators",
    purpose: "Read a document and review its interpretation before filing it.", status: "Partial",
    steps: ["Choose a supported PDF, PPTX or spreadsheet with the local API running. Results and surveys can also be filed from Learn.", "Check extracted text/tables, document type, course and term in the preview; for results, confirm the course version taught.", "Correct the interpretation and confirm; inspect the filed record in Learn or the Data room."],
    output: "Extracted records and source metadata in this browser's workspace.",
    limitation: "Confirmation records a reviewed upload and never marks it institutionally verified. Original files are not a durable library or part of JSON backups. Structured survey/result matching needs further validation.",
  },
  {
    screen: "acceptance", title: "Acceptance test", audience: "Assigned lecturers and coordinators",
    purpose: "Explore the prototype's curriculum sequencing and readiness scenario.", status: "Demonstration",
    steps: ["Prepare a proposal in the sandbox; a lecturer-authored proposal needs coordinator review first.", "Run the scenario from the proposal.", "Inspect the explanation, assumptions and drill-down before treating it as a discussion aid."],
    output: "An illustrative report routed into the management review workflow.",
    limitation: "The model is uncalibrated. Editing teaching sessions or topic wording does not cause a validated learning forecast. Never treat this score as approval evidence on its own.",
  },
  {
    screen: "trends", title: "Trends", audience: "Management, department and coordinators",
    purpose: "Explore how a market signal could prompt curriculum review.", status: "Demonstration",
    steps: ["Inspect a course's signal and source context.", "Run the staged signal reveal to understand the proposed flow.", "Route an update request to the coordinator or a new-subject request to the department."],
    output: "A local notification with the example signal context.",
    limitation: "Demand and coverage figures are seeded. Scrapling, live vacancies, deduplication and evidence-backed scoring are not connected.",
  },
  {
    screen: "approval", title: "Approvals", audience: "Management",
    purpose: "Review a tested proposal in the illustrative sandbox and record a decision with its reasoning.", status: "Partial",
    steps: ["Read the proposed changes, illustrative scenario report and review history.", "Approve the tested candidate or return it with a reason. Changes after testing require a new check; a changed baseline cannot be approved.", "Inspect the resulting local course version in Studio History and the illustrative prediction in Closed loop."],
    output: "Actual candidate CLO/topic edits in a new local version, the preserved baseline and a local decision event; approval also records an illustrative prediction.",
    limitation: "This remains the prototype's fixed review chain with uncalibrated forecasts, kept in the sandbox; decisions on the loop are recorded in Decide. Role checks are local, not authenticated server authorization. A local decision does not independently establish official university approval.",
  },
  {
    screen: "programme", title: "Programme", audience: "Department",
    purpose: "Inspect the programme and coordinate work across subjects.", status: "Partial",
    steps: ["Review the flagged subjects or expand the full catalogue.", "Inspect a subject's context.", "Use New subject or Assignments to scope work and give someone responsibility."],
    output: "Programme context and a route into subject creation or staffing.",
    limitation: "Flags use example signals. Programme-level outcome mapping, credit constraints and accreditation exports are not implemented.",
  },
  {
    screen: "new-subject", title: "New subject", audience: "Department",
    purpose: "Create a proposed course and assign its first coordinator.", status: "Working locally",
    steps: ["Enter a unique code, title, year and semester.", "Choose a coordinator and write the first learning outcome.", "Create the proposed subject and continue with that coordinator's workspace."],
    output: "A proposed course, first CLO, assignment and draft in local state.",
    limitation: "This does not publish an approved institutional course or validate credits and accreditation rules.",
  },
  {
    screen: "assignments", title: "Assignments", audience: "Department",
    purpose: "Assign lecturer and coordinator responsibilities by subject.", status: "Working locally",
    steps: ["Inspect existing responsibilities.", "Choose a person, subject and role.", "Add the assignment, then switch the demo person to inspect their course access."],
    output: "Updated local course responsibilities and navigation.",
    limitation: "People are prototype identities. There are no invitations, real institutional sign-in or shared accounts yet.",
  },
  {
    screen: "backtest", title: "Closed loop", audience: "Everyone",
    purpose: "Inspect recorded predictions and how comparison with later results might work.", status: "Demonstration",
    steps: ["Approve a tested proposal to record a prediction.", "File later results through Upload and run the comparison.", "Use the historical example to inspect how residuals are displayed."],
    output: "Local predicted/actual comparisons and an illustrative historical analysis.",
    limitation: "Historical outcomes are synthetic. Matching does not yet enforce cohort, term and course-version identity; model calibration has not been established.",
  },
  {
    screen: "dataroom", title: "Data room", audience: "Everyone",
    purpose: "Inspect the data behind the workspace and distinguish fixtures from uploaded records.", status: "Partial",
    steps: ["Inspect source type, course, term, record count and ingestion date.", "Read model assumptions and evidence provenance.", "Use Upload to add your own records after checking their contents."],
    output: "A source inventory and an explanation of the current model inputs.",
    limitation: "This is not a complete source archive, citation verifier or document download library. Seed sources remain illustrative.",
  },
  {
    screen: "office", title: "How it works", audience: "Everyone",
    purpose: "See the loop with the host at its centre and the seven helpers at their stations, what each reads, produces and cannot do, and the real record of what happened on your course.", status: "Working locally",
    steps: ["Choose a helper on the loop, or its card, to read what it reads, produces and cannot do. Decide is the station where people decide.", "Choose See the record on this course to open its timeline. Lines from the event log (briefs prepared, sent and read, decisions, snapshots, adoptions, term changes) carry the time they happened; lines worked out from the records are labelled derived.", "Use Open on a timeline entry to jump to the step that holds it."],
    output: "A step-by-step record of the work done on a course, told by role, with a link to each result.",
    limitation: "Roles are deterministic workflow steps with optional model help, not autonomous agents. The timeline shows only recorded work; it never invents reasoning or activity, and a derived line never claims a time it does not have.",
  },
  {
    screen: "evaluation", title: "Evaluation", audience: "Everyone",
    purpose: "See how Lyceum is tested: live checks on this workspace, the requirement scan benchmark, the automated suites, and the protocol for benchmarking the student-simulation agent against course outcomes and surveys.", status: "Partial",
    steps: ["Read the live checks; they recompute from the data in this browser on every visit.", "Open the scan benchmark and its disagreements; extend the labelled set to test it further.", "Read the student-agent benchmark protocol and what it needs before any learning claim is made."],
    output: "Verifiable numbers with their denominators and dates, and a benchmark plan with success criteria.",
    limitation: "The student-agent benchmark has not been run on real course data. The synthetic backtest error is not evidence of real accuracy, and no learning gain is claimed.",
  },
  {
    screen: "index", title: "Relevance Index", audience: "Public and signed-in users",
    purpose: "Explore the prototype's course relevance and source-agreement presentation.", status: "Demonstration",
    steps: ["Browse the catalogue and open a course.", "Inspect its outcome, example evidence and disagreement warning.", "Read the prototype-data notice before citing any figure."],
    output: "An illustrative course-level relevance view.",
    limitation: "Source agreement describes direction only, not reliability or truth. All shipped market records are synthetic; this is not a live labour-market ranking.",
  },
  {
    screen: "guide", title: "Institution settings", audience: "Everyone reads; a coordinator edits",
    purpose: "Say which campus the workspace runs for and every setting that shapes a figure: the pass mark and share for attainment, the survey scale and response floor, the release rule, the platform and the data controller.", status: "Working locally",
    steps: ["Open Guide & progress and the Institution panel.", "Read each setting with where its default comes from; the demo profile is UTP's, labelled demo.", "As a coordinator, change a setting and save it; it travels in the workspace backup."],
    output: "One institution profile per workspace, saved in the backup.",
    limitation: "One profile per browser workspace; a pilot tenant would set its own, with permission to show its own mark.",
  },
  {
    screen: "judge", title: "For judges", audience: "Everyone, signed in or not",
    purpose: "Meet the loop in a few minutes: walk it stop by stop on the sample workspace, see one change before and after, or read how the local door answers.", status: "Working locally",
    steps: ["Open the judge's page from the landing page or from this Guide.", "Choose Walk the loop: ten stops over the real app on the sample workspace, the tour's end state. Next, Back and Esc move it, and each stop's caption says what is real and what is synthetic.", "Choose Before and after for one change three ways, or Ask the door for the question to put to the local door.", "Read what is proven today, the register's four figures counted up once as they come into view, and what is not built, word for word from this Guide."],
    output: "A guided look at every step's record on one course, with the honesty label at every stop.",
    limitation: "The walk replaces this browser's workspace with the sample workspace and keeps the current one as a recovery copy under Backups. The door runs only on a laptop with Claude Desktop configured; the page cannot reach it.",
  },
  {
    screen: "kiosk", title: "The booth's kiosk", audience: "The team at the booth",
    purpose: "Between judge teams: the 90-second loop playing by itself, Tualang resting, and a touch to walk the loop.", status: "Working locally",
    steps: ["Copy the film beside the app once: node scripts/kiosk-film.mjs copies the existing Loop90 render with its date. Without it the kiosk says the film is not on this laptop.", "Open #/kiosk on the booth laptop. Kiosk mode stays on in that tab until Leave kiosk mode.", "The loop plays muted on repeat and Pause stops it; under reduced motion it waits for Play.", "A touch anywhere walks the loop on the sample workspace, without asking.", "Thirty seconds without a touch, a key or a scroll anywhere in the app bring the next visitor back to the kiosk, after a ten-second warning; a playing tour holds it."],
    output: "A booth screen that resets itself between visitors.",
    limitation: "The film is the render of 22 October, a capture of the app as it was that afternoon; screens added since are not in it until it is rendered again. Chrome's kiosk flag and a browser-only account on the laptop are set up by hand.",
  },
  {
    screen: "recap", title: "Term recap", audience: "Everyone who may open the course",
    purpose: "One page per course and term from the records: what employers asked for, what was decided, what changed, what was taught and what came back.", status: "Working locally",
    steps: ["Open it from History, or from Home once the ring closes.", "Read each part: every number is read from a record in this workspace, and the sample course says it is synthetic.", "Print it, or save it as a PDF, at A4."],
    output: "A printable A4 recap with the sample line and the honesty line.",
    limitation: "The OBE report shows here once it is saved on Learn, as printed. The recap does not attest institutional approval.",
  },
];

export const REMAINING_WORK = [
  { title: "Evidence collection", detail: "On-request collection from the Greenhouse and Lever board APIs, exact-excerpt receipts, fingerprint duplicate detection, lexicon-assisted scanning, reviewed denominators and meeting briefs work. Scrapling page adapters, snapshots of arbitrary sites, cross-site vacancy clustering, scheduled refresh and refresh-failure reporting remain planned. Frozen evidence snapshots and their comparison work; a re-collected posting is matched by its board posting id." },
  { title: "Defensible calculations", detail: "Observed shares with explicit numerators and denominators, Wilson intervals, reviewed coverage stages and a demand-weighted coverage index work for recorded evidence. Comparable time windows, employer-balanced sensitivity views, publication gates and validation against real course/cohort data remain planned." },
  { title: "Institutional review", detail: "Local CLO/topic editing, constraints, word-level before and after views and version activation work; decisions on briefs are recorded with their reason, person, course version and term, and each version names the decision behind it. One institution profile per workspace works, the demo's, labelled demo. Configurable review authorities, positions as data, term archives and server-enforced decisions remain to be built." },
  { title: "Teaching materials", detail: "Editable PPTX teaching packs and brief decks are generated from saved sessions, outcomes and evidence receipts, with speaker notes; the generator adds no text of its own. The sample course's packs carry slide masters with the demo institution's mark, and its sample slides are written for this prototype and labelled synthetic. A session's check can carry items, drafted from templates with a surface lint and a person's review, exported as Moodle XML and QTI 2.1. Model-drafted slide content with lecturer review, selective regeneration, a campus's own template, handouts, accessibility checks of exported decks, a real import into a Moodle, validation against the QTI schema and item statistics remain planned." },
  { title: "Results and student surveys", detail: "Attainment per outcome against a stated pass mark, with n of N and an interval only when some students have no mark, works, and so does the OBE course report saved as printed, with the Course Outcome Survey beside the marks, the programme outcomes listed and the CQI note. The two student surveys work with a booth collector on the local API, importers for Microsoft Forms, Google Forms and Moodle Feedback exports (the Moodle one not yet tried on a Moodle export), a document for Microsoft Forms Quick Import (not yet imported into Forms), a paste code labelled not anonymous, a response floor and a release rule. Pooling, frozen predictions, comment themes, the programme's PLO figure and a validated survey instrument remain planned." },
  { title: "Agent integrations", detail: "A local, read-only MCP server over an exported workspace works (mcp/, docs/doors.md), with a skill folder for assistants. Remote access with OAuth, the Teams, Google Workspace and LMS doors, structured model output, provider SDK adapters, job retries, usage and cost controls and evaluation fixtures remain planned." },
  { title: "Shared institutional workspace", detail: "Database, authenticated roles, durable source files, validated legacy migration, term/cohort separation and collaboration. JSON backup/restore works locally; it does not include original uploaded files." },
  { title: "Accessibility and pilot validation", detail: "Full WCAG 2.2 AA audit, screen-reader testing, accessible exports and a real lecturer trial. Current improvements are not a compliance certification." },
];
