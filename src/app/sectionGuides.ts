import type { Screen } from "./roles.ts";

export interface SectionGuide {
  screen: Exclude<Screen, "login" | "guide">;
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
    steps: ["Open a course to continue preparation.", "Use the work queue for drafts or reviews in your role.", "Open a notification to see the request in context. An evidence brief opens here with its receipts and can be downloaded."],
    output: "A next action tied to an actual course, session or proposal in this workspace.",
    limitation: "No real timetable, deadlines, email reminders or institutional notifications are connected.",
  },
  {
    screen: "courses", title: "Courses", audience: "Lecturers and coordinators",
    purpose: "Find your courses and see what preparation each one needs.", status: "Working locally",
    steps: ["Search by course code or title; filter by year or preparation status.", "Choose Create course workspace to prepare your own course with a unique code, title and optional programme; this does not create an official university course.", "Open Outcomes & topics to build or revise the outline, or Teaching plan to prepare classes.", "Use Backups to download or restore a validated JSON copy of this browser workspace."],
    output: "A course workspace with the selected course carried into Studio.",
    limitation: "The initial catalogue is illustrative. Personal courses use your entered content and have no calibrated market or learning score. Counts describe saved work, not academic quality.",
  },
  {
    screen: "studio", title: "Course Studio", audience: "Assigned lecturers and coordinators",
    purpose: "Develop the course outline, prepare classes and keep a traceable local revision history.", status: "Partial",
    steps: ["Overview: inspect current outcomes, prerequisites, source records and unfinished preparation.", "Outcomes & topics: start a revision. Add, edit or remove CLOs and topics; record achievement evidence, PLO mappings, hours, prerequisites and protected foundations.", "Save and check the revision. Fix errors, inspect warnings and the before/after comparison, then record your rationale and teaching term. Use as my course version requires your explicit review; university approval stays in its existing process.", "Evidence: run a research run against a permitted employer board or the dated saved sample, keep the postings worth reading, scan them for the skills you name and confirm each exact quotation (paraphrases are rejected), mark the extraction reviewed so the postings count, map each quoted skill to an outcome with a reviewed coverage stage and target, then prepare a meeting brief to download as a document or as editable slides, or send to a colleague. Shares show the numerator, denominator and a Wilson interval. Collection happens only when you ask.", "Teaching plan: save CLO-linked sessions, activities, learning checks and references; export the plan; download an editable teaching pack (.pptx) for any session with its outcomes, the employer evidence behind them, the activity and the check. Review affected sessions after a course change.", "Assessment: prepare a blueprint independently of a proposal, select preserved drafts and inspect illustrative item generation. A changed course requires another assessment review before submission. Proposal retains the legacy review workflow.", "History: inspect preserved course versions and revision decisions, and export a previous outline."],
    output: "An editable course definition, candidate and active local versions, decision history, evidence receipts with an exportable report, teaching plan, Markdown outlines and assessment draft.",
    limitation: "One teaching plan per course in this browser. Local version activation does not attest institutional approval. Evidence describes the recorded set only. Collection is on request from two documented board APIs (Greenhouse and Lever) through the local API, or from the dated saved sample; comparable time windows, employer-balanced views and scheduled refresh are not built. Slide packs are generated from saved data with no model-written text; model-drafted slide content and template import remain to be built. Configurable institution-wide reviews, term archives and accurate assessment allocation remain to be built. Agent drafting still uses fixtures.",
  },
  {
    screen: "upload", title: "Upload", audience: "Assigned lecturers and coordinators",
    purpose: "Read a document and review its interpretation before filing it.", status: "Partial",
    steps: ["Choose a supported PDF, PPTX or spreadsheet with the local API running.", "Check extracted text/tables, document type, course and term in the preview.", "Correct the interpretation and confirm; inspect the filed record in Data room."],
    output: "Extracted records and source metadata in this browser's workspace.",
    limitation: "Confirmation records a reviewed upload and never marks it institutionally verified. Original files are not a durable library or part of JSON backups. Structured survey/result matching needs further validation.",
  },
  {
    screen: "acceptance", title: "Acceptance test", audience: "Assigned lecturers and coordinators",
    purpose: "Explore the prototype's curriculum sequencing and readiness scenario.", status: "Demonstration",
    steps: ["Prepare a proposal; a lecturer-authored proposal needs coordinator review first.", "Run the scenario from the proposal in Studio.", "Inspect the explanation, assumptions and drill-down before treating it as a discussion aid."],
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
    purpose: "Review a tested proposal and record a decision with its reasoning.", status: "Partial",
    steps: ["Read the proposed changes, illustrative scenario report and review history.", "Approve the tested candidate or return it with a reason. Changes after testing require a new check; a changed baseline cannot be approved.", "Inspect the resulting local course version in Studio History and the illustrative prediction in Closed loop."],
    output: "Actual candidate CLO/topic edits in a new local version, the preserved baseline and a local decision event; approval also records an illustrative prediction.",
    limitation: "This remains the prototype's fixed review chain with uncalibrated forecasts. Role checks are local, not authenticated server authorization. A local decision does not independently establish official university approval.",
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
    purpose: "See the seven roles in order, what each reads, produces and cannot do, and the real record of what happened on your course.", status: "Working locally",
    steps: ["Open a role card to read what it reads, produces and cannot do.", "Choose a course to see its timeline: every line is derived from a saved record, in order.", "Use Open on a timeline entry to jump to the tab that holds it."],
    output: "A step-by-step record of the work done on a course, told by role, with a link to each result.",
    limitation: "Roles are deterministic workflow steps with optional model help, not autonomous agents. The timeline shows only recorded work; it never invents reasoning or activity.",
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
];

export const REMAINING_WORK = [
  { title: "Evidence collection", detail: "On-request collection from the Greenhouse and Lever board APIs, exact-excerpt receipts, fingerprint duplicate detection, lexicon-assisted scanning, reviewed denominators and meeting briefs work. Scrapling page adapters, snapshots of arbitrary sites, cross-site vacancy clustering, scheduled refresh and refresh-failure reporting remain planned." },
  { title: "Defensible calculations", detail: "Observed shares with explicit numerators and denominators, Wilson intervals, reviewed coverage stages and a demand-weighted coverage index work for recorded evidence. Comparable time windows, employer-balanced sensitivity views, publication gates and validation against real course/cohort data remain planned." },
  { title: "Institutional review", detail: "Local CLO/topic editing, constraints, diffs and version activation work. Institution profiles, configurable review authorities, term archives and server-enforced decisions remain to be built." },
  { title: "Teaching materials", detail: "Editable PPTX teaching packs and brief decks are generated from saved sessions, outcomes and evidence receipts, with speaker notes and no model-written text. Model-drafted slide content with lecturer review, selective regeneration, institutional templates, handouts and accessibility checks of exported decks remain planned." },
  { title: "Agent integrations", detail: "Distinct branded roles, structured model output, provider SDK adapters, job retries, usage/cost controls and evaluation fixtures." },
  { title: "Shared institutional workspace", detail: "Database, authenticated roles, durable source files, validated legacy migration, term/cohort separation and collaboration. JSON backup/restore works locally; it does not include original uploaded files." },
  { title: "Accessibility and pilot validation", detail: "Full WCAG 2.2 AA audit, screen-reader testing, accessible exports and a real lecturer trial. Current improvements are not a compliance certification." },
];
