Prioritize a visible, traceable journey from employer quotation to course decision. The strongest demonstration is already functional: a judge can inspect a source, reject a paraphrase, understand a count, review a mapping and download an editable pack.

The requested documents conflict in places. README’s opening limitations say collection and slide export are unimplemented, while its later sections, the as-built report and implementation describe working features. Reconcile these claims alongside the UI.

**1. Ten highest-value changes, in priority order**

P0: before the competition. P1: before a lecturer pilot. P2: after benchmark data exists.

| Priority | Exact screen and component | One-sentence design spec | Honesty note |
|---|---|---|---|
| 1, P0 | All signed-in screens: `Shell` and `NavItem`, `Shell.tsx`; `STUDIO_TABS`, `Studio.tsx` | Group navigation around Courses, Evidence, Teaching and Review, moving synthetic Trends, Index, Acceptance and Closed loop into a clearly labelled Research sandbox. | Navigation polish must not imply shared accounts, institutional permissions or validated predictions. |
| 2, P0 | Course Studio, Evidence: `EvidencePanel`, `EvidenceWorkspace.tsx` | Replace the continuous stack of panels with a clickable five-step rail: Collect → Quote → Review → Map → Brief, showing one active task and its output preview. | Progress means saved work, not readiness, employability or autonomous agent activity. |
| 3, P0 | Home after login: `InboxScreen`; course Overview: `CourseOverview` | Add an illustrated starting card with Choose a course, Inspect one quotation and Prepare an output, plus one state-derived Resume action. | Seeded examples must not count as work the lecturer completed. |
| 4, P0 | Evidence, Scan and Sources: `RequirementScan`, `SourceCard` | Present a source reading pane beside the proposed quotation, highlight the matched passage and keep Confirm, Edit classification and Dismiss beside it. | A string match verifies wording, not interpretation or complete extraction. |
| 5, P0 | Evidence, Observed requirements: `MappingRow` | Replace the default ten-column table with expandable skill cards showing quoted postings out of reviewed postings, a labelled interval and a skill-to-CLO coverage ladder. | Counts describe the selected set; Wilson intervals do not correct selection bias, and documented coverage is not learner attainment. |
| 6, P0 | Evidence, Collection: `ResearchRun` | Show source choice cards, a persistent Sample/Live/Cache badge, a compact selection funnel and a posting preview, with technical logs under Details. | Fetching one employer board is not searching or monitoring the whole labour market; identical text detection is not comprehensive vacancy deduplication. |
| 7, P0 | Evidence, Meeting brief: `MeetingBriefPanel`; Teaching plan: `TeachingPlanPanel` | Add slide thumbnails and a decision-first preview using a quotation, coverage graphic, proposed action and receipt appendix, preserving editable text and speaker notes. | Existing packs are deterministic; exports must disclose whether they use the brief’s saved evidence or today’s evidence. |
| 8, P1 | Outcomes & topics: `CurriculumPanel`, `RevisionEditor`; History: `CurriculumHistoryPanel` | Show a before/after outline with an hours budget graphic, prerequisite links and a linked list of affected sessions and assessments. | Passing configured constraints is not accreditation or proof of educational quality; unknown budgets remain unknown. |
| 9, P2 | Research sandbox, Acceptance and Closed loop: `AcceptanceScreen`, `BacktestScreen` | Replace the headline prediction with a benchmark explorer showing observed CLO attainment, survey responses, model estimates and baseline errors separately. | Synthetic cohorts and the pinned 0.009 error provide no evidence of predictive validity. |
| 10, P0 | Login and judge walkthrough: `LoginScreen`; proposed context drawer in `GuideScreen` | Introduce the pitch with a visual lecturer problem, an Asia context panel and a sourced competitor comparison, then immediately open an interactive quotation example. | Regional employment problems do not prove curriculum causes them, customer demand or Lyceum’s impact. |

Across these changes, extend `global.css` with shared diagram, stepper and preview styles. Retain existing keyboard focus, reduced-motion support and responsive foundations. Graphics need text equivalents, labelled states and keyboard interaction.

**2. Visual onboarding**

First run:

1. **Choose a route:** “Use my course” or “Explore the dated sample”, illustrated with course and source cards.
2. **Establish context:** select or create a course, show its current outcomes and version, then choose a task.
3. **Complete one meaningful action:** highlight and confirm a quotation, or save a teaching session.
4. **Reveal the next connection:** show how that quotation links to a CLO and appears in a brief or pack.

Keep onboarding skippable and resumable. The full journey lives on Home and Guide & progress. Studio carries the compact step rail; existing `SectionHelp` becomes task-specific guidance with a small annotated example. Avoid recurring modal tours.

Derive progress per course from persisted records:

| Milestone | Real completion evidence |
|---|---|
| Course established | Saved course definition and CLO records, with seed/example provenance distinguished. |
| Evidence available | Retained `evidenceSources`, rather than a successful fetch alone. |
| Quotation confirmed | Stored `skillMentions` that still validate against retained source text. |
| Posting reviewed | Original posting marked `reviewed`; duplicates excluded. |
| Mapping documented | `skillMappings` with active CLO links, known stage and target, and course evidence. |
| Revision adopted | Adopted curriculum draft tied to the current course version; checking alone is insufficient. |
| Teaching prepared | Saved session meeting preparation requirements and without unresolved course-change review. |
| Brief prepared | Persisted `evidenceBriefs` record. |

Recompute after edits, deletion and restore. Distinguish Complete, Needs review and Missing information. Add provenance where current state cannot distinguish personal work from fixtures. Do not claim a file was downloaded or opened without corresponding evidence.

**3. Step-by-step workflow visualization**

Use a horizontal artifact trail on desktop and stacked cards on mobile:

**Course → Source → Quotation → Coverage → Revision → Teaching pack → Review**

Each card exposes Input, Operation, Output and Human decision. The proposed branded names are role labels, not seven autonomous services.

| Step and role | Real data visible when expanded |
|---|---|
| 1. Folio, course reader | Course version, CLO wording, topic hours, supplied document locator and lecturer confirmation; show unknown constraints. |
| 2. Scout, collection | Provider, board, query, retrieval time, publication date separately, sample/cache status, matches and imported sources. |
| 3. Scout, requirement reading | Saved terms and aliases, proposed sentence, retained source passage, requirement classification and confirmed or dismissed result. |
| 4. Lens, evidence analysis | Unique reviewed denominator, skill numerator, required/preferred counts, employers, exclusions and interval. |
| 5. Atlas, mapping | Selected skill and CLO, documented coverage stage, target, course evidence and retired-link warnings; today the lecturer supplies the mapping. |
| 6. Quill and Steward, revision | Actual edited candidate, before/after differences, configured constraint results, rationale and explicit local adoption. |
| 7. Prism and Steward, preparation | Saved session, CLO links, activity, learning check, generated slide preview, brief recommendation and local recipient status. |

Keep student simulation as an optional Lens branch. Animate only actual events. If durable run history is missing, add it before presenting a replay. Do not invent reasoning transcripts or agents talking to each other.

**4. Student-simulation benchmark**

Define the target first: **the probability that a learner meets a specified CLO threshold on a specified assessment in a specified term and course version**. A course-wide scenario score cannot be presented as this prediction without changing and evaluating the model.

Use lecturer-approved, CLO-linked assessment results as the attainment reference. Surveys measure confidence, perceived difficulty or experience separately. Never convert a self-rating directly into demonstrated mastery.

**Minimal exploratory dataset:** one course, three CLOs, two successive cohorts of approximately 30 consenting learners each. This supports a feasibility study, not general validation.

Retain:

- Pseudonymous learner ID, cohort, term, course version and assessment date.
- Item ID, CLO mapping, rubric, maximum marks, earned marks and predefined attainment threshold.
- Survey question wording, scale anchors, CLO, collection date, response and missingness.
- Prediction timestamp, model version, inputs available then and frozen predicted probability.

Use the earlier cohort for development and freeze the model before evaluating the later cohort. Do not mix records from one learner across development and evaluation. Match course version, assessment and term explicitly; upload date alone is insufficient.

Compare against a prior-cohort CLO attainment-rate baseline and a simple prior-performance baseline.

| Measure | What the interface shows |
|---|---|
| Observed attainment | Learners meeting threshold divided by learners assessed, per CLO. |
| Probability error | Brier score for model and baselines, with sample size and uncertainty. |
| Calibration | Predicted versus observed attainment, with bin counts; suppress unstable summaries. |
| Aggregate error | Absolute percentage-point error per CLO. |
| Survey comparison | Response distribution, response rate and association with measured attainment. |
| Data quality | Unmatched records, missing assessments, missing surveys and version mismatches. |

Display “Benchmark unavailable” when matching data is absent. Register success criteria before evaluation. Better prediction would still not demonstrate that a proposed curriculum change causes learning gains.

**5. Asia context, market research and novelty**

Open the pitch with the lecturer’s fragmented evidence-to-review process. Then show regional context: the ILO reported Asia-Pacific youth unemployment of 13.9% in 2023, with substantial subregional differences. Label the year and population; this is context, not a curriculum-effect estimate. [ILO regional brief](https://www.ilo.org/publications/employment-trends-youth-asia-and-pacific)

Separate three evidence types:

- **Problem research:** interview lecturers and coordinators across several Asian institutions; observe current review tasks and measure time, handoffs and missing evidence.
- **Product market research:** test the department buyer, procurement constraints and willingness to pay; treat Section 27’s market figures as estimates requiring verification.
- **Course market intelligence:** show the actual boards, employers, locations, dates and reviewed sample behind each requirement; reserve trend graphics for comparable collection windows.

Skillabi already offers curriculum-to-labour-market alignment and scores, so avoid claiming the category is new. Lyceum’s defensible differentiation is the lecturer-controlled chain from exact quotation through constrained revision to an editable teaching artifact and review brief. [Lightcast Skillabi](https://lightcast.io/solutions/software/skillabi)

Measure pilot value through task completion, time to a usable brief, citation integrity and repeat use.

**6. Code anti-patterns found**

- `EvidenceWorkspace.tsx`: contradictory “nothing is collected from the web” banner; ten-column table; repeated source forms create a long page.
- `EvidenceResearch.tsx`: bulk confirmation is visually prominent without adjacent source context; raw Markdown preview obscures document hierarchy; error messages sometimes use success styling.
- `EvidenceResearch.tsx`: historical brief selection coexists with slides generated from current evidence, creating a version-consistency risk.
- `Studio.tsx`: seven equal-weight tabs mix current work with legacy proposals; “Live. The prediction is recorded” overstates the illustrative workflow.
- `Shell.tsx`: synthetic screens sit under “EVIDENCE”; “Verified coordinator identity” suggests verification the prototype lacks.
- `global.css`: nested scrolling in source and brief panels complicates reading; text-heavy panels lack a shared visual workflow vocabulary.
