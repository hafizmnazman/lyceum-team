# Lyceum v3: Implementation Spec (the real app)

> Historical specification. The [5 October 2026 audit and improvement plan](docs/lyceum-improvement-plan.md)
> supersedes its fixed-number, evidence, agent and validation requirements.
> Statements below describe the original intent, not verified implementation.

> The build contract for v3, in a fresh folder. v2 proved the idea (the spine, the
> flow, the numbers). v3 makes it an actual product: live agents, real file intake
> (xlsx, pdf, pptx), test creation, a professional design system, and an app that
> feels like a tool people use, not a dashboard people look at.
>
> Where this spec is concrete, follow it exactly. Do not invent, assume, or
> substitute. If something is genuinely missing, stop and ask.

---

## 0. Problem, goal, objectives (the frame everything serves)

**Problem statement, one sentence:** A university has no independent,
data-grounded way to know which of its courses have drifted from industry
demand until its graduates fail to get hired.

The drift is structural, not accidental: curricula are reviewed on 3-to-5-year
accreditation cycles while industry reprices skills every 12 to 18 months. The
symptom (graduate skills mismatch, underemployment) is well documented in
Malaysian graduate tracer and labour data; the missing piece is the mechanism
that detects the drift, localises it to specific courses, and grounds the fix
in evidence. Lyceum is that mechanism.

**Goal:** be the independent advisory layer that continuously rates every
course against triangulated industry demand, helps the faculty fix the drift
it finds, and proves its own advice by scoring every adopted recommendation
against the next term's real results.

**Objectives, each with its build home:**
1. **Demand truth.** Triangulate skill demand from multiple market sources
   (job platforms + government labour data), never a single feed, with
   per-source provenance and a cross-source agreement level on every claim
   (Signal agent, 5.2).
2. **Supply truth.** Read what a course actually teaches from the university's
   published record (official syllabus documents, public course pages), not
   from self-reported forms. Self-entered content is labelled unverified until
   it matches a published document (Intake, 5.1; verification, Section 4).
3. **Localised advisory.** A relevance rating per subject and per CLO with the
   why attached (which skills moved, which sources agree), routed to the
   person who owns the fix (Relevance Index 6.8, Trends 6.6, routing 7).
4. **Grounded remediation.** Every proposed change is stress-tested against a
   psychometrically real cohort before adoption (the v2 spine, unchanged, 5.5).
5. **Self-scoring.** Every adopted change records a prediction; next term's
   uploads score it. The backtest is the advisory's credential (Section 8).
6. **Verified people.** Coordinators are verified (institutional email domain
   + presence on the official course page) before their word carries weight
   (Section 4).

**Positioning (the mentor's frame, adopted):** Lyceum is an advisory to the
university, not a replacement for its judgment. It never changes a
curriculum; it rates, recommends, simulates, and the university's own chain
approves. The public wedge is the **Relevance Index** (6.8): a rating built
from public data that exists whether a university joins or not; joining gives
the university the pen (verify the listing, respond, act, improve the
rating). The retention hook is the workspace: everything else in this spec is
what a member faculty uses to act on its rating.

**Honesty guardrail (v2's, extended):** demand derived from job-ad frequency
is a proxy for demand and is labelled as such in the UI. Ability derived from
self-reported mastery is labelled as such. The answer to "how do you know the
rating is right" is the closed loop: the model scores itself every term.

---

## 0a. The one-paragraph definition

Lyceum is a curriculum decision platform for a university faculty. Four roles work
in it (management, department, coordinator, lecturer), each with their own calm
workspace. A network of seven role-bound agents sits on one shared data spine (the
CLO mastery survey, the SSRT survey, uploaded results). Lecturers upload real
files; agents read them. Coordinators author changes with agent help, including
drafting whole tests. Every change is stress-tested against a psychometrically
grounded cohort before management approves it, and every approval records a
prediction that next term's results will score. It is a network, not a pipeline:
each agent wakes where its user works.

### What v3 changes from v2, exactly

| Area | v2 | v3 |
|---|---|---|
| Agents | 5 of 7 are fixtures, `live` throws | All 7 real. LLM agents call Claude, streaming, with a fixture fallback for the recorded demo |
| Upload | One blessed xlsx, never parsed | Real parsing of xlsx, csv, pdf, pptx, docx; extraction preview; agent maps content to CLOs |
| Authoring | A fixture paragraph | Real drafting: topics, CLOs, full test drafts with items, lab sheets; review and critique modes |
| Test creation | Absent | An assessment studio: blueprint, item bank, Bloom coverage, agent-generated items, coordinator review |
| Theme | Petrol/ochre graph paper (poster look) | A quiet professional design system (Section 3), light-first, product look |
| Feel | Screens of numbers with toggles | Task-first workspaces, an inbox-driven home, one primary action per screen, command palette |
| Backend | None | A thin local server for LLM calls and file parsing (still one repo, one command) |
| Demo | Self-driving cursor video | Carried over and rewritten for the new UI, same runner architecture |

### What carries over from v2 byte-identical (do not reimplement)

- `src/lib/spine/*` (ability, difficulty, link, outcome, cohort, confidence,
  mastery, scenario, index), `src/lib/rng.ts`, `src/lib/stats.ts`,
  `src/lib/backtest.ts`. The audited Rasch 1PL maths.
- `src/data/synthetic-cohort.*` (200 students) and
  `src/data/historical-backtest.*` (186 students). The ground.
- The canonical numbers and the worked example: CS220 before MA201, mastery 0.60
  to 0.58, CLO4 at 0.45, drill-down S-0488 / ML-14 / P = 0.43, backtest MAE 0.009.
- The Layer 0 data model (`src/types.ts`) and the roles/permissions table, with
  the additions in Section 4.
- The proposal state machine and its guards (including the adversarial-review
  fixes: actor-gated `canRunTest`, idempotent approve/reject, deduped pings).
- The proof-script discipline (`npm run prove:all`) and the headless demo smoke.
- The demo runner architecture (`runner.ts`: eased cursor, real DOM events,
  state-polling waits, captions, turbo mode). The script content is rewritten.

Everything else, every screen, the shell, the theme, the agents' internals, is
rebuilt.

### This is an app, not a demo (binding on every stage)

v3 is a working product that happens to contain a demo, never the reverse.

- **Every flow works on arbitrary input.** Any xlsx/csv/pdf/pptx/docx parses;
  any subject can be created and edited; any proposal drafted, reviewed,
  tested; any person pinged. The shipped demo files are sample inputs, not the
  only inputs the code paths accept.
- **No demo rails in product code.** Screens read the store; nothing is
  hardcoded to CS220 except seed data. The demo script drives the same UI a
  human uses. If a screen only works when the demo drives it, it is wrong.
- **State persists.** The store snapshots to localStorage (versioned key,
  debounced) so a refresh does not reset the world. A "Reset workspace" action
  in the account menu restores the seed. This one behaviour does more for
  "feels like a real app" than any styling.
- **Real app furniture everywhere:** loading, empty, and error states on every
  screen; a toast for every mutation; hash-based routes per screen so refresh,
  back, and deep links work; inline form validation; keyboard palette.
- **The fixture/live switch affects only agent output, never app capability.**

---

## 1. Stack and repo layout

- **Client:** React 18 + TypeScript + Vite (same as v2).
- **Server:** a thin Node server in the same repo (`server/`), Hono or Express,
  started alongside Vite with one command (`npm run dev` runs both via
  `concurrently`). It does two jobs only:
  1. `/api/agent/:name` , proxies to the Anthropic API (key in `.env`, never in
     the client), streams responses back over SSE.
  2. `/api/parse` , accepts a file upload and returns extracted text/tables
     (heavy parsers stay off the UI thread and out of the bundle).
- **LLM:** `@anthropic-ai/sdk`, `claude-sonnet-5` for all five LLM agents
  (fast, cheap enough for a demo, smart enough for the job). Model id in one
  config constant.
- **File parsing (server-side):**
  - xlsx/csv: `xlsx` (SheetJS).
  - pdf: `pdf-parse` (text) with per-page structure.
  - pptx/docx: `jszip` + a small XML walk of `ppt/slides/slide*.xml` and
    `word/document.xml` (both are just zipped XML, no heavyweight dependency).
- **State:** the v2 pattern, one external store + `useSyncExternalStore`, plus a
  `pendingAgentRuns` slice so any screen can render a live agent working.
- **Fixture fallback stays.** Every LLM agent keeps `fixture | live`. Live is the
  default when `ANTHROPIC_API_KEY` is present; fixture is the deterministic path
  for the recorded demo, offline judging, and the proof scripts. This is a
  feature, say it plainly in the README: reproducible on any machine without a
  key, live with one.
- **Never block on the LLM.** Every live call has a timeout and falls back to the
  fixture with a visible note ("offline draft"), so the app never hangs in front
  of a judge.

```
lyceum-v3/
  package.json  vite.config.ts  tsconfig.json  .env.example
  server/
    index.ts            Hono app: /api/agent/:name (SSE), /api/parse
    llm.ts              Anthropic client, prompts, streaming, timeout + fallback
    parse/              xlsx.ts pdf.ts pptx.ts docx.ts (extractors -> ParsedDoc)
  public/
    demo/               the demo files (Section 13): results.xlsx, syllabus.pdf,
                        lecture-slides.pptx, clo-survey.csv
  src/
    types.ts            Layer 0 contract (v2 + Section 4 additions)
    theme/              tokens.ts  global.css  (Section 3)
    lib/                spine/ rng stats backtest   (copied from v2, unchanged)
    data/               seed.ts items.ts canonical.ts synthetic-cohort.ts
                        historical-backtest.ts      (carried from v2)
    agents/             client wrappers: call the server, stream, fixture fallback
      fixtures/         one fixture per agent (recorded real outputs, see 5.6)
    app/                store.ts roles.ts sim.ts signalSim.ts (logic from v2)
    ui/
      primitives/       Button Input Select Card Tag Toast Modal EmptyState ...
      shell/            AppShell Sidebar Topbar CommandPalette AgentPanel
      screens/          per-role screens (Section 6)
    demo/               runner.ts script.ts timing.ts DemoOverlay.tsx segments/
  scripts/              prove-*.ts  demo-smoke.mjs  shots.mjs  gen-demo-files.mjs
```

---

## 2. The design problem v3 solves (read before building any screen)

v2's screens are correct but read as "AI-generated dashboard": a themed poster of
numbers. The root causes, each with its v3 rule:

1. **Cause: the graph-paper canvas and dual display fonts.** They style every
   screen like an infographic. **Rule: plain surfaces, one UI font, no decorative
   canvas. The product's character comes from spacing, hierarchy, and motion, not
   from a texture.**
2. **Cause: number-first screens.** Trends opens on a gap figure; Approval opens
   on mastery values. **Rule: verb-first screens. Every screen opens on the thing
   to DO (review this, upload this, approve this). Numbers are evidence attached
   to the task, one click deep.**
3. **Cause: no persistent app chrome.** v2's nav rail is thin and screens feel
   like slides. **Rule: a real app shell (Section 6.1), sidebar with the user's
   scope, topbar with search and notifications, breadcrumbs, keyboard palette.
   It should feel like Linear or Notion, an app you live in.**
4. **Cause: agents are invisible except in the Office.** **Rule: agents appear
   where they work, as an inline presence (Section 5.7): a compact status line or
   side panel on the page they serve, streaming their output as they think.**

---

## 3. The design system (replaces petrol/ochre/cream entirely)

Direction: a quiet, credible academic workspace. Swiss-modernist bones (strict
grid, generous whitespace, real hierarchy), warm paper-white surfaces so it does
not feel like a generic admin template, one restrained accent. Light-first; no
dark mode in scope (one theme done well beats two done half).

### 3.1 Tokens (`src/theme/tokens.ts`, CSS variables in `global.css`)

```
Surfaces
  --bg          #F7F7F5   app background (warm near-white, not grey, not cream)
  --surface     #FFFFFF   cards, panels, inputs
  --surface-2   #F1F1EE   quiet wells (code, previews, agent panel)
Ink
  --ink         #191C1F   headings, primary text
  --ink-2       #55595E   secondary text
  --ink-3       #8A8E94   placeholders, timestamps
Accent (one)
  --accent      #3B5BDB   actions, links, focus, selection (deep indigo)
  --accent-ink  #FFFFFF
  --accent-soft #EDF0FC   selected rows, active nav, quiet highlights
Semantic
  --ok          #1F7A4D   approved, prediction held
  --warn        #B3630B   flags, drift, pending review
  --danger      #C0392B   reject, conflicts, destructive
  each with a -soft tint for backgrounds (#E7F3EC, #FCF0E0, #FAE9E7)
Lines and depth
  --border      #E4E4E0   hairlines everywhere borders are earned
  --shadow-1    0 1px 2px rgba(25,28,31,.06)        (cards)
  --shadow-2    0 4px 16px rgba(25,28,31,.10)       (popovers, modals)
  --radius-s 6px   --radius-m 10px   --radius-l 14px
Type
  --font-ui     'Inter', system-ui, sans-serif      (everything)
  --font-display 'Newsreader', Georgia, serif       (page titles + wordmark ONLY)
  numbers: font-variant-numeric: tabular-nums (no separate mono font)
Spacing: 4px base scale (4 8 12 16 24 32 48 64). Content max-width 1120px.
Motion: 150 to 250ms, ease-out in, ease-in out; one slow exception, the staged
  acceptance run. Respect prefers-reduced-motion.
```

The serif is the whole "academic" note: page titles and the wordmark in
Newsreader give it a collegiate voice without any texture or costume. Everything
else is Inter. **No ad-hoc hex anywhere; every colour is a token.**

### 3.2 Layout rules (binding on every screen)

- **App shell always present** (except Login and demo overlays): sidebar 240px,
  topbar 56px, content column max 1120px, left-aligned.
- **One primary action per screen**, one accent-filled button. Everything else is
  quiet (ghost or outline).
- **Cards are earned.** A card wraps an actionable object (a proposal, an upload,
  a subject). Lists are borderless rows with hairline separators. Never a grid of
  equal boxes.
- **No connector arrows, no centred stacks, no uppercase label rain** (the v2
  bans still hold).
- **Progressive disclosure everywhere:** every screen opens with at most three
  visual groups; density is opt-in by clicking into a record.
- **Empty states teach.** Every list's empty state says what will appear there
  and offers the action that creates it.
- **Icons:** Lucide, 16/20px, stroke 1.75, never emoji.
- Focus rings visible (2px accent), contrast AA minimum, hit targets 40px+.

---

## 4. Data model additions (Layer 0)

Keep the entire v2 `types.ts`, add:

```typescript
// ---------- real intake ----------
type UploadedFileKind = "xlsx" | "csv" | "pdf" | "pptx" | "docx";

interface ParsedDoc {                 // what /api/parse returns, agent-agnostic
  fileName: string;
  kind: UploadedFileKind;
  pages: Array<{ index: number; text: string }>;    // slides = pages
  tables: Array<{ name: string; rows: string[][] }>; // sheets and detected tables
}

interface IntakeInterpretation {      // what the Intake agent makes of a ParsedDoc
  docType: "results" | "clo-survey" | "syllabus" | "slides" | "unknown";
  subjectGuess?: SubjectId;
  termGuess?: string;
  mappedRows?: ResultUpload["rows"];  // when docType === "results"
  surveyRecords?: SurveyRecord[];     // when docType === "clo-survey"
  contentSummary?: string;            // syllabus/slides: filed as subject material
  confidence: number;                 // 0..1, shown to the user
  notes: string[];                    // "column 'Avg' read as meanScore", etc.
}

// ---------- test creation ----------
interface AssessmentBlueprint {       // the coordinator's contract for a test
  subjectId: SubjectId;
  totalMarks: number;
  cloWeights: Array<{ cloId: CLOId; weight: number }>;  // must sum to 1
  bloomMix: Partial<Record<BloomLevel, number>>;
}

interface TestDraft {
  id: string;
  subjectId: SubjectId;
  proposalId?: ProposalId;            // when part of a change proposal
  blueprint: AssessmentBlueprint;
  items: Array<Item & { marks: number; modelAnswer?: string; source: "agent" | "human" }>;
  status: "drafting" | "coordinator-review" | "approved";
  authorId: PersonId;
}

// ---------- agent presence ----------
interface AgentRun {                  // one live invocation, drives all agent UI
  id: string;
  agent: "intake" | "signal" | "curriculum" | "authoring" | "cohort" | "analogy" | "evaluator";
  status: "queued" | "thinking" | "streaming" | "done" | "failed" | "fallback";
  startedAt: string;
  streamText?: string;                // grows while streaming
  resultRef?: string;                 // id of whatever it produced
  onPage: string;                     // the screen it belongs to
}
```

```typescript
// ---------- demand truth (multi-source, the mentor's "no single source") ----------
interface MarketSource {
  id: string;                       // "jobstreet" | "linkedin" | "glassdoor" | "mohe-col"
  name: string;
  kind: "job-platform" | "gov-labour" | "industry-report";
  snapshotDate: string;             // shown in the UI: "prepared snapshot, <date>"
  recordCount: number;
}

interface DemandEvidence {          // one source's view of one skill
  sourceId: string;
  skill: string;
  demandScore: number;              // 0..1 normalised within the source
  delta12m: number;                 // change vs 12 months ago
}

interface RelevanceRating {         // the advisory's core output, per subject
  subjectId: SubjectId;
  score: number;                    // 0..1
  band: "aligned" | "drifting" | "misaligned" | "unrated";
  perCLO: Array<{ cloId: CLOId; score: number; movedBy: string[] }>;
  evidence: DemandEvidence[];       // the receipts, grouped by source in the UI
  agreement: number;                // 0..1 cross-source agreement; < 0.5 renders "sources disagree"
  ratedAt: string;
}

// ---------- supply truth + verification (the "lecturers could lie" patch) ----------
// Person gains:  email?: string;  verified: boolean;
//   verified = institutional email domain + presence on the official course page.
//   Unverified people can work, but their edits carry an "unverified" tag and the
//   approval gate shows it.
// Subject gains: syllabusSourceUrl?: string; syllabusVerifiedAt?: string;
//   Content ingested from a published document (the official syllabus pdf, the
//   public course page) is marked verified with its source. Self-entered content
//   is labelled "unverified" until it matches a published source. The Data room
//   shows both states.
```

`ChangeProposal.draft` gains `testDraftId?: string`. Roles table unchanged, plus:
lecturers can author a `TestDraft` on their subjects; only the coordinator
approves one.

---

## 5. The agent network, live

Seven agents, same roster and wake conditions as v2. What changes is that they
are real. Each LLM agent is one server-side prompt + one client wrapper that
creates an `AgentRun`, streams into it, and writes its typed result to the store.

### 5.1 Intake (LLM + parsers), lives on Upload
Input: a `ParsedDoc`. Prompt: classify the document, map its content onto the
known subjects/CLOs/terms (the prompt includes the curriculum as context), return
an `IntakeInterpretation` as JSON (use a forced tool/JSON schema, never free
text). The UI shows the extraction preview (what was read) beside the
interpretation (what the agent made of it), with confidence and notes, and the
user confirms with one click before it files. **The confirm step is the product
answering "can I trust the agent": the human always sees what was read.**

### 5.2 Signal (LLM), lives on Trends and feeds the Relevance Index
Input: **multiple** market snapshots, one file per source in
`src/data/market/` (`jobstreet.json`, `linkedin.json`, `glassdoor.json`,
`mohe-col.json`, each a `MarketSource` + `DemandEvidence[]`, prepared once,
cited as "prepared snapshot of <source>, <date>" in the UI). Prompt:
triangulate the sources, rank rising skills, map onto the programme's CLOs,
and return `cloDemand` + `subjectDrift` + a `RelevanceRating` per subject with
its evidence and a cross-source `agreement` score. **A claim supported by one
source is a lead; a claim supported by three is a finding, and the UI renders
the difference** (agreement below 0.5 shows a "sources disagree" tag and
lowers the band). The staged Signal reveal from v2 is kept but restyled, and
its reading phase now walks the sources one by one; in live mode the phases
follow the actual stream.

### 5.3 Curriculum (deterministic, from v2), lives on Courses
Unchanged logic: prerequisite graph + Signal output to per-subject annotations.

### 5.4 Authoring (LLM), lives in Course Studio and the Assessment studio
Three jobs, now real:
- `draft`: from the subject, its CLOs, and the target ("refresh CLO4 for
  transformer-era ML"), produce topics, CLO edits, and optionally a full
  `TestDraft` against the blueprint.
- `review`: critique a human draft (specific, line-level, constructive).
- `fix`: apply its own critique.
Streaming matters here most: the draft types itself into the editor, visibly.

### 5.5 Cohort + Analogy + Evaluator
- Cohort: the v2 Rasch spine, unchanged, with the 16s staged reveal.
- Analogy: keep the deterministic CLO-similarity matching from v2, add one LLM
  call that explains the borrowing in plain words ("borrowing evidence from ST201
  and CS230, whose outcomes overlap 0.81 and 0.74").
- Evaluator: real LLM verdict from the full `VerdictReport` + proposal history:
  three sentences, a recommendation, and the two numbers that matter.

### 5.6 Fixtures are recorded, not invented
Run each live agent once on the seed data, save its actual output as the fixture.
The fixture path then replays real model output, which keeps the recorded demo
honest ("this is a recorded run of the same agent").

### 5.7 Agent presence (replaces dashboard-style agent UI)
- Every screen with an agent has an **agent strip**: one quiet line under the
  header ("Intake read 3 tables from results.xlsx", with a working shimmer while
  streaming). Clicking it opens the **agent panel**, a right-side sheet showing
  the stream, what the agent read, and what it wrote. This is the network made
  visible in place.
- The **Office** survives as the "Agents" page: seven desks, state-driven from
  `AgentRun`s exactly as v2 derived it, restyled to the new tokens (line-drawn
  desks on --surface, no graph paper). It is the status surface, not the pitch.

---

## 6. The app, screen by screen

### 6.1 The shell
- **Sidebar:** wordmark (Newsreader), then the person's nav for their role, then
  their subjects with hat badges (C / L), then Agents and Data room at the
  bottom. Active item in --accent-soft.
- **Topbar:** breadcrumb, global search (Cmd+K command palette: jump to any
  subject, person, proposal, action), notification bell with badge, person
  switcher (the demo's role switching, styled as an account menu).
- **Home = Inbox for every role.** The first screen after login is "what needs
  me": pings, reviews waiting, tests to approve, each a row with one button.
  An empty inbox says "Nothing needs you", the calm resting state.

### 6.2 Login
The v2 idea restyled: wordmark + one line ("Stress-test a curriculum change
before you commit, grounded in your real cohort."), then the demo people as
clean rows (name, role, scope). No graph paper, no footer decoration.

### 6.3 Lecturer workspace
- **Upload:** a real dropzone (drag or browse; accepts xlsx, csv, pdf, pptx,
  docx). On drop: parse on the server, extraction preview (pages/tables),
  Intake's interpretation with confidence, one confirm button, then a "filed"
  receipt showing exactly where it went (subject, term, N rows) and a line:
  "This ground now feeds the cohort." Recent uploads listed below as rows.
- **My subjects:** their subjects with the Curriculum annotations.
- **Course Studio (lecturer mode):** propose a change on their subject: edit
  topics/CLOs/materials in self, agent, or hybrid mode; build a `TestDraft`
  in the assessment studio; submit to the coordinator.

### 6.4 Coordinator workspace
- **Courses:** their subjects, flagged ones first, annotation and why.
- **Course Studio:** the centrepiece. Left: the subject (topics, CLOs with Bloom
  tags, materials, version history). Right: the working draft. Modes self /
  agent / hybrid; agent output streams in; review panel when a lecturer authored
  it (approve, request changes with comments, or edit directly).
- **Assessment studio** (inside the Studio, its own tab): set the blueprint
  (weights per CLO, Bloom mix, total marks), let Authoring generate items
  against it, edit any item inline, coverage meter shows blueprint fit. This is
  the "test creation" that v2 lacked.
- **Acceptance test:** the staged 16s run, restyled: provenance line up top
  ("grounded in 200 learners' CLO mastery survey and 3 terms of results", click
  through to the Data room), histogram filling, verdict, then the six-hop
  drill-down ending at P = 0.43.

### 6.5 Department workspace
Programme (degree by year, flags first), New subject (create, assign coordinator,
Analogy offers the proxy cohort), Assignments (the hat table).

### 6.6 Management workspace
- **Trends:** the Signal reveal, then one sentence ("CS220 is drifting from
  demand, gap 0.62") and one button ("Route to coordinator"). Demand chart one
  click deep.
- **Approval:** the proposal as a document: what changes (before/after diff of
  CLOs and topics), what the cohort says (verdict + drill-down behind
  disclosure), what the Evaluator recommends, then Approve / Reject with a
  required reason on reject.

### 6.7 Shared
Data room (each source, term, freshness, record count, which uploads fed it,
and the verified/unverified state of each subject's supply-side record),
Closed loop (open predictions, scored predictions, the historical backtest),
Agents (the office).

### 6.8 The Relevance Index (the public wedge)
One surface reachable from the login screen **without signing in** ("View the
index"): the programme's subjects, each with its `RelevanceRating` band,
score, and receipts (the sources, their agreement, the skills that moved).
Built entirely from public data (job-ad snapshots + published syllabi), and it
says so. Two jobs:
- **The pitch:** the rating exists whether a university joins or not; joining
  gives the pen. A "Claim this programme" action leads into the login and
  verification story.
- **Continuity:** inside the app the same rating renders on Trends, Courses,
  and the Studio header, so the advisory and the workspace read as one
  continuous surface, not a marketing page bolted onto a tool.

---

## 7. Flows (unchanged from v2, restated as binding)

The proposal state machine, the routing rules, the notification model, the
closed loop (approve writes an OPEN prediction, a later upload scores it), and
the permission guards all carry over exactly, including the review gate: a
lecturer draft cannot reach testing without coordinator review, and only
management approves. `TestDraft` rides inside its proposal and follows the same
review chain.

---

## 8. What stays deliberately theatrical (and honest)

- The **staged acceptance run** (16s, deterministic) and the **Signal reveal**:
  real computation revealed at human pace. Keep both; they are the demo's pulse.
- The **drill-down**: six hops from the verdict to one learner, one item,
  P = 0.43. This is the single most convincing beat; give it room.
- The **backtest**: predicted 0.534 vs actual 0.536, MAE 0.009. Lead the pitch
  with it.

---

## 9. The self-driving demo (v3 script)

Carry the runner (cursor easing, real events, state-polling waits, captions,
progress bar, turbo smoke). Rewrite the script for the new UI and the new
powers. Target 5:00 to 6:30, never over 8:00.

1. Login as Ms Tan (lecturer). Inbox is calm. caption: "A lecturer's morning."
2. Upload `results.xlsx`. The parse preview appears, Intake interprets it live,
   she confirms, the receipt shows it filed to CS310. caption: "She drops the
   term's results. The agent reads the sheet, she confirms what it read."
3. Upload `lecture-slides.pptx` for the same subject, filed as material.
   caption: "Slides too. Any document becomes ground."
4. Switch to Prof Lim (management). Trends: the Signal reveal plays, lands on
   CS220, gap 0.62. Route to coordinator. caption: "Management sees the drift
   and pings the coordinator."
5. Switch to Dr Sobri (coordinator). Inbox has the ping with the agent's
   findings. Open CS220 in the Studio. caption: "The ping carries the why."
6. Hybrid mode: Authoring streams a draft update to CLO4, he edits one line.
   Open the assessment studio, generate items against the blueprint, tweak one.
   caption: "He updates the subject and drafts the test, the agent assisting."
7. Run the acceptance test. The 16s reveal, the office alive, then the verdict
   and the six-hop drill to P = 0.43. caption: "Tested against 200 real
   learners before anyone commits."
8. Submit. Switch to management. The approval reads as a document: diff,
   verdict, Evaluator's recommendation. Approve. caption: "A decision with
   evidence attached."
9. Closed loop: the open prediction, and the historical backtest (MAE 0.009).
   caption: "Every approval is a prediction, and the system scores itself."

---

## 10. Demo assets to generate (`scripts/gen-demo-files.mjs`)

Real, openable files in `public/demo/`, generated by script so they are
reproducible: `results.xlsx` (per-CLO means for CS310, headers a real lecturer
would write, slightly messy on purpose so Intake visibly earns its keep),
`clo-survey.csv` (a term of survey rows), `syllabus.pdf` (a one-page CS220
syllabus, the supply-side truth document Intake verifies against),
`lecture-slides.pptx` (five slides of ML content). The pdf and pptx can be
minimal hand-built OOXML/PDF, same trick as v2's xlsx generator.

Plus the demand snapshots in `src/data/market/`: `jobstreet.json`,
`linkedin.json`, `glassdoor.json`, `mohe-col.json`, each a `MarketSource` with
`DemandEvidence[]`, skill lists consistent enough that machine learning tops
three of four sources (agreement high) while one deliberately disagrees on a
minor skill (so the "sources disagree" state has something real to render).

---

## 11. Build order (each stage ends runnable and proven)

1. **Scaffold + theme.** New repo, Vite + server skeleton, tokens, global.css,
   primitives, shell (sidebar, topbar, palette, toasts). A styled empty app.
2. **Carry the core.** Copy spine, data, types (+ Section 4), store, roles,
   state machine, sims. Port the v2 proof scripts; all green before any screen.
3. **Screens on fixtures.** All workspaces (Sections 6.2 to 6.7) against seed
   data and v2-style fixtures. The app is fully walkable offline. Screenshot
   review pass against Section 3.2.
4. **Real parsing.** `/api/parse` + the four extractors + the Upload flow with
   preview and confirm. Prove: the demo xlsx round-trips into the exact
   `ResultUpload` the seed expects.
5. **Live agents.** `/api/agent/:name`, prompts, streaming, `AgentRun` UI
   (strip + panel), fixture fallback + timeout. Record real outputs as the new
   fixtures (5.6).
6. **Assessment studio.** Blueprint, generation, coverage meter, review chain.
7. **The demo.** Port the runner, write the Section 9 script, smoke it headless.
8. **Polish pass.** Empty states, keyboard nav, focus, reduced-motion, contrast
   check, the office restyle.

## 12. Acceptance criteria

All v2 proof criteria still hold (canonical numbers, state machine, permissions,
analogy, closed loop, staged reveal timing), plus:
- Dropping each of the four demo files parses, interprets, and files correctly
  end to end, with the preview shown, in live AND fixture mode.
- The assessment studio produces a `TestDraft` meeting its blueprint (weights
  sum, Bloom mix within tolerance), and a lecturer-authored test cannot ship
  without coordinator approval.
- Every LLM agent: streams visibly, survives a killed network mid-call
  (fallback, no hang, visible note), and never blocks the UI thread.
- No hex outside `tokens.ts`. No emoji icons. Every screen has exactly one
  accent-filled action. The shell is present on every authed screen.
- The self-driving demo plays end to end in fixture mode with no key and no
  network, under 8:00.

## 13. Decisions made for you to overrule

- **Light theme only**, indigo accent, Inter + Newsreader. Swap the accent by
  changing two tokens if it does not feel right.
- **Thin server over browser-direct LLM calls** (keeps the key out of the
  client and makes file parsing clean). Costs one process.
- **The office stays** as the Agents status page, not the pitch centrepiece.
- **Home is the Inbox** for all four roles.
- **Sonnet for all agents.** Bump Authoring to a bigger model later if drafts
  feel thin.
- Management/department stay separate; hats stay per-subject and stackable
  (unchanged v2 calls).
