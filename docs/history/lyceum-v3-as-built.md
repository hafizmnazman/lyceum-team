# Lyceum, as built

> Historical report with known overclaims. The market inputs and seeded learners
> are synthetic; the historical backtest does not establish empirical validity.
> Read the [5 October 2026 audit and improvement plan](docs/lyceum-improvement-plan.md)
> before reusing any claims below in a report or presentation.

One document containing the full picture of the shipped system: the problem,
the goal, the objectives, the positioning, what was built, how it is grounded,
how it is validated, and what it does not claim. Written to be lifted into a
report; every number in here is reproducible from the repository.

---

## 1. Problem statement

**A university has no independent, data-grounded way to know which of its
courses have drifted from industry demand until its graduates fail to get
hired.**

The drift is structural, not accidental. Curricula are reviewed on 3-to-5-year
accreditation cycles, while industry reprices skills every 12 to 18 months. The
symptom, graduate skills mismatch and underemployment, is well documented in
national graduate tracer and labour-market reporting. What is missing is not
awareness of the symptom; it is the mechanism: something that detects the
drift continuously, localises it to specific courses and specific learning
outcomes, grounds the fix in evidence about the actual student cohort, and
then checks whether the fix worked. Lyceum is that mechanism.

Three gaps make the problem hard, and each shaped the system:

1. **No single source of truth for demand.** Any one job platform is a biased
   sample. A defensible demand signal has to be triangulated across several
   independent sources, with the disagreement between them surfaced rather
   than hidden.
2. **No reliable source of truth for supply.** If a platform asks lecturers to
   type in what their course covers, it measures optimism, not curriculum.
   Supply truth has to come from the published record: the official syllabus
   document, the public course page.
3. **No consequence for advice.** Curriculum advice is usually unfalsifiable.
   An advisory that matters has to make predictions that reality can score.

## 2. Goal

Be the independent advisory layer that continuously rates every course against
triangulated industry demand, helps the faculty fix the drift it finds, and
proves its own advice by scoring every adopted recommendation against the next
term's real results.

## 3. Objectives (each mapped to what was built)

1. **Demand truth.** Triangulate skill demand from multiple market sources
   with per-source provenance and a cross-source agreement level on every
   claim. Built: four prepared market snapshots (JobStreet Malaysia, LinkedIn
   Job Insights, Glassdoor Postings, TalentCorp Critical Occupations List),
   the Signal agent, and an agreement score rendered wherever a rating
   appears; below 0.5 the UI shows "sources disagree" and downgrades the claim
   from a finding to a lead.
2. **Supply truth.** Read what a course teaches from published documents, not
   self-reported forms. Built: a real document-intake pipeline (xlsx, csv,
   pdf, pptx, docx) with a preview-and-confirm step; syllabus uploads mark the
   subject's record verified; self-entered content is labelled unverified.
3. **Localised advisory.** A relevance rating per subject and per learning
   outcome, with the why attached, routed to the person who owns the fix.
   Built: the Relevance Index (public), the Trends screen (management), the
   Courses annotations (coordinators), and one-click routing that sends the
   agent's findings with the ping.
4. **Grounded remediation.** Stress-test every proposed change against a
   psychometrically real cohort before adoption. Built: the acceptance test, a
   Rasch 1PL simulation over 200 real survey respondents, revealed at human
   pace, with a drill-down from the verdict to a single learner and item.
5. **Self-scoring.** Every adopted change records a prediction; the next
   term's uploads score it. Built: the closed loop (open and scored
   predictions) plus the historical backtest as the credential.
6. **Verified people.** A coordinator's word carries weight only once their
   identity is verified. Built: institutional-email verification state on
   every person, surfaced in the approval gate, the assignments table, and the
   account menu.

## 4. Positioning

Lyceum is **an advisory to the university, not a replacement for its
judgment**. It never changes a curriculum. It rates, recommends, and
simulates; the university's own chain (coordinator review, management
approval) decides. This framing is deliberate: it is the claim that survives
an informed academic audience, and it converts the platform's outputs from
instructions into evidence.

**The wedge is the public Relevance Index.** The rating is built from public
data (market snapshots plus published syllabi) and exists whether a university
joins or not. Joining gives the university the pen: verify the listing,
respond, act on the rating, improve it. The retention hook is the workspace:
everything else in the product is what a member faculty uses to act.

**Why a university joins:**
- The rating exists anyway; claiming it beats ignoring it.
- Accreditation support: programme accreditation requires demonstrated
  industry alignment and periodic curriculum review. Lyceum generates that
  evidence continuously instead of in a five-yearly scramble.
- Employability KPIs: the instrument that localises a bad employability
  number to the specific courses and outcomes behind it.
- The remediation loop: not just "what is wrong" but a tested, evidence-backed
  path to fixing it.

**The honest novelty** (what stands apart from both descriptive
curriculum-mapping incumbents and generic agentic entries): the grounded
cohort simulation, the validated backtest, the cold-start solution, and the
self-scoring loop. The agent network is the mechanism, not the headline.

## 5. The system, as shipped

### 5.1 Roles and workspaces

Capability is modelled as person x subject ("hats"), not fixed identity: one
person can coordinate CS220, teach it, and merely teach CS310. Four tiers,
each with a calm, task-first workspace whose home screen is an Inbox ("what
needs me now"):

| Role | Workspace |
|---|---|
| Management | Inbox, Trends (the drift and its receipts), Approvals (the change as a document: diff, verdict, recommendation, approve/reject with reasons) |
| Department | Inbox, Programme (degree by year, flags first), New subject, Assignments (the hat table) |
| Coordinator | Inbox, Courses (annotated), Course Studio (content + assessment + history), Acceptance test |
| Lecturer | Inbox, Upload (document intake), Courses, Course Studio (draft and submit for review) |

Shared surfaces: the Data room (every source, term, freshness, verified
state), the Closed loop (predictions and the backtest), Agents (the live
office), and the public Relevance Index.

### 5.2 The agent network

Seven agents on one shared data spine, each waking where its user works. Two
are pure computation, five are LLM-backed with a deterministic fallback:

| Agent | Lives on | Kind | Does |
|---|---|---|---|
| Intake | Upload | LLM + parsers | Reads any dropped document, classifies it, maps content onto subjects and CLOs, shows its reading for confirmation |
| Signal | Trends, Index | LLM over snapshots | Triangulates the market sources, ranks rising skills, maps them onto outcomes, computes drift and agreement |
| Curriculum | Courses, Programme | Deterministic | Prerequisite-graph reasoning; per-subject annotations (update needed, conflict, fine) |
| Authoring | Course Studio | LLM | Drafts updates, critiques human drafts, generates test items against a blueprint |
| Cohort | Acceptance test | Deterministic (Rasch) | Runs the change against the grounded cohort; the verdict and the drill-down |
| Analogy | New subjects | Deterministic + LLM narration | Builds a proxy cohort for history-less subjects from outcome-similar courses |
| Evaluator | Approvals | LLM | Compiles the plain-language verdict for the gate |

Agent presence is in-place, not a dashboard: each screen carries a one-line
agent strip (with a working shimmer while streaming) that opens a right-side
activity panel showing what each agent read, thought, and produced. A separate
Agents page renders the seven desks as a live status surface.

### 5.3 The data spine

- The **CLO mastery survey**: 200 learners' 1-to-10 self-ratings per learning
  outcome, the ability ground. Labelled as self-reported, never presented as
  measured ability.
- **Filed results**: real uploads (per-CLO means, standard deviations, counts)
  parsed from lecturers' actual files.
- **The published record**: syllabi and course material filed through intake,
  carrying verified/unverified state.
- **Market snapshots**: four sources with snapshot dates and record counts,
  cited in the UI as prepared snapshots.
- The curriculum itself: programme, subjects, CLOs with Bloom levels, the
  prerequisite graph, per-subject version history.

### 5.4 The measurement model

The cohort simulation is a Rasch 1PL psychometric model, not LLM roleplay:

- Ability theta per learner per outcome, derived from the survey self-rating
  centred on the grand mean.
- Item difficulty b from a Bloom-level ladder (or a stored calibrated value).
- P(correct) = sigma(theta minus b); outcomes drawn with a seeded RNG so every
  run is identical.
- A proposed change is expressed as a scenario (for example, a subject
  scheduled before its prerequisite applies a penalty to the dependent outcome
  and a cascade to downstream outcomes), and the full cohort is run under
  current and proposed states.

The worked example, carried and proven: CS220 (Applied Machine Learning)
scheduled before its prerequisite MA201 (Linear Algebra) drops projected
cohort mastery from 0.60 to 0.58, driven by CLO4 collapsing to 0.45, and the
drill-down reaches learner S-0488 failing item ML-14 at P(correct) = 0.43.
Every step of that chain is inspectable in the UI.

### 5.5 The flows

Proposal lifecycle, enforced as a state machine with permission guards:

```
drafting -> (lecturer submits) coordinator-review -> (approve) testing
drafting -> (coordinator's own draft) testing
testing -> (acceptance run done) management-approval
management-approval -> approved (writes an open Prediction; bumps the version)
management-approval -> rejected (returns to drafting with reasons)
```

A lecturer's draft cannot reach a test without coordinator review; management
cannot author; the department cannot approve; only academics with a hat on a
subject can run its test. Test drafts (the assessment studio) follow the same
review chain. Notifications tie the tiers together, and every ping carries the
agent findings that prompted it.

**The closed loop:** approval records a prediction at the projected mastery.
It stays open until a later results upload for that subject arrives, which
fills the actual and the residual. The historical backtest is the same
comparison run on a held-out past cohort where the outcome is known.

### 5.6 Cold start

A brand-new subject has no cohort history. The Analogy agent searches all
courses for similar learning outcomes and assembles a proxy cohort from their
real mastery data, so even a subject nobody has taught is tested on real
ground. Verdicts on proxy cohorts are labelled as such.

## 6. Validation (all reproducible from the repo)

| Check | Result |
|---|---|
| Acceptance test on the canonical proposal | projected 0.58, current 0.60, CLO4 0.45, drill P = 0.43 |
| Historical backtest | predicted 0.534 vs actual 0.536, MAE 0.009, 7 of 7 outcomes within 0.05 |
| Deterministic proof scripts | 74 checks across five suites (spine, backtest, flows/permissions, signal reveal, document intake), all passing |
| Document intake | all four shipped sample files (xlsx, csv, pdf, pptx) parse, classify, map, and file correctly, offline |
| Headless app walk | every screen renders signed-in, a real upload files end to end, state survives a reload, zero page errors |
| Headless demo run | the full self-driving demo plays to the end state (approval + recorded prediction + P = 0.43), zero page errors |
| Static analysis | TypeScript strict, clean; production build, clean |

Honesty guardrails, enforced in the UI: demand from job-ad frequency is
labelled a proxy; ability from self-reported mastery is labelled self-reported;
offline agent output is labelled "offline read"; proxy cohorts are labelled;
predictions are only scored by results filed after they were made.

## 7. Engineering

- **Stack:** React 18 + TypeScript + Vite; a thin Hono server for document
  parsing and LLM streaming; Claude (Sonnet) for the five LLM agents.
- **Runs three ways:** fully static (no server, no key: spreadsheets parse in
  the browser, agents use deterministic local logic), server without a key
  (all five file formats parse), or fully live (agents stream real model
  output). The app is complete in all three; live output augments the
  deterministic path and never replaces the audited numbers.
- **A real app, by construction:** persistent workspace (localStorage,
  versioned), hash routing with deep links, command palette, notification
  badge, empty/loading/error states everywhere, keyboard focus, reduced-motion
  support, one design system with zero ad-hoc styling.
- **Layers:** data contract (types), the audited spine (pure maths, carried
  from v2 byte-identical), agents, store and state machines, UI, demo. The
  spine was not reimplemented; 56 v2 proof checks passed against the v3 store
  before any screen was built.

## 8. The self-driving demo

A Play control performs the entire storyline over the real app with a
simulated cursor at human pace: a lecturer files a messy results xlsx and a
slide deck through the actual parse pipeline, management watches the Signal
agent triangulate four sources and routes the CS220 drift, the coordinator
opens the ping, drafts in hybrid mode, edits a line, generates a test against
the blueprint, runs the acceptance test (a 16-second staged reveal of real
computation), walks the six-hop drill-down to P = 0.43, submits, management
approves with the evidence attached, and the closed loop shows the recorded
prediction and the backtest. Captions narrate every beat; nothing is mocked;
judges can take the controls at any point because the demo drives the same
interface a human uses.

## 9. Limitations and future work (stated, not hidden)

- The market snapshots are prepared once and cited as snapshots; live
  connectors to the platforms are the productionisation step.
- The ability signal is self-reported mastery; the model treats it as such,
  and the closed loop exists precisely to calibrate against real outcomes.
- One programme is seeded; cross-programme ripple (shared subjects flagging
  downstream degrees) is modelled in the data contract but not yet surfaced.
- Coordinator verification is institutional-email based in this build; the
  full design cross-checks the public course page.
- The recorded demo runs the deterministic path by design (identical every
  run); a live-streaming take is a per-recording choice.
