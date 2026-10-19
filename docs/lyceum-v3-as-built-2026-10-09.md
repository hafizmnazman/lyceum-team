# Lyceum v3: as-built report, 9 October 2026, with the 11 October addendum

This report describes the prototype as it exists and was verified on 9 October 2026. It replaces the July 2026 as-built document, which is kept in `docs/history/` for the record and describes an earlier storyline that the current build no longer claims. Every statement here was checked against the running code on the owner's machine on 9 October; the verification table lists the commands and their results.

## 1. Summary

Lyceum is a lecturer's course workspace. It helps a lecturer gather what employers ask for from permitted sources, keep every requirement as an exact quotation from its source, count honestly with the denominator in view, map skills to course outcomes with cited course evidence, revise outcomes and topics under explicit constraints, prepare teaching sessions, and take a meeting brief with every receipt to colleagues. Nothing runs by itself, nothing changes a course without the lecturer, and no AI key is needed for any of it.

The product runs locally: a React and TypeScript web workspace with a browser-local store and validated JSON backups, plus a thin Node and Hono API that parses documents and fetches postings from two documented public job-board APIs on request. It is a working local prototype with automated verification. It is not yet a shared, multi-user service.

## 2. Problem and positioning

A lecturer who wants to refresh a course has three jobs: find out what employers actually ask for, work out what the course already introduces, practises and assesses, and defend the change to colleagues and the quality committee. Today that evidence lives in browser tabs, inboxes and memory, and the decision is hard to explain later. In Malaysia, DOSM counted 5.98 million graduates in 2024 with unemployment at 3.2 percent but underemployment at 32.2 percent, and MOHE reviews courses for relevance.

Lyceum is advisory. Lecturers accept, edit, reject or defer every suggestion. Formal syllabus approval stays in the university's existing process. Lyceum does not claim to monitor the labour market, score employability, predict learning gains or certify accreditation.

## 3. What a lecturer can do today

**Home.** Resume the latest teaching plan, see the work queue for the current role, read notifications. An evidence brief sent by a colleague opens here with its receipts and can be downloaded.

**Courses.** Search and filter the catalogue, open an assigned course, or create a personal course workspace with a code, title and optional programme. A personal workspace is private preparation, not an official course.

**Course Studio, Outcomes and topics.** Start a revision from the current version; add, edit or remove course learning outcomes with Bloom level, achievement evidence and programme outcome mappings; add topics with hours, weeks, outcome links, prerequisites and protected foundations. Save incomplete drafts. Check constraints: broken links, prerequisite cycles and reversed order, exceeded contact or self-study budgets and removed protected topics block a candidate; unknown budgets stay visible warnings. Compare before and after, record a rationale and teaching term, then explicitly adopt the candidate as the local course version. The baseline, the version history and the decision record are preserved; affected teaching sessions and assessments are flagged for review rather than rewritten.

**Course Studio, Evidence.** The research run:
1. Search. Choose a source with a stated policy: the Greenhouse job board API, the Lever postings API, or a dated saved sample of real postings. Enter role keywords, fetch, keep the postings worth reading and import them. Each imported posting is a source with its title, employer, link, publication date as published, retrieval time, text and text fingerprint. Identical texts become duplicate copies and count once.
2. Read. Name the skills that matter, with aliases. The scan proposes, per posting and term, the first sentence that uses the term, as an exact substring, with a heuristic reading of required or preferred that the lecturer can change. The lecturer confirms or dismisses each quotation. A quotation that is not in the retained text is rejected, including hand-typed paraphrases. Every stored quotation is re-verified on display and on backup import.
3. Review. The lecturer vouches that a posting's extraction is complete. Only reviewed postings enter the denominator.
4. See the trend. Observed requirements show, per skill, the numerator and denominator, the share, a 95 percent Wilson interval, required against preferred wording, distinct employers, contextual documents, the reviewed coverage stage against its target, and the shortfall. Empty evidence is unknown, never zero. A demand-weighted coverage index is reported with the share of quoted weight whose stage or target is unknown. No trend over time is shown until a comparable earlier window exists.
5. Decide and brief. Map a skill to one or more course outcomes with a documented stage and cited course evidence. Prepare a meeting brief with the decision requested, the evidence base, the table, the options, the lecturer's notes, the limitations and every receipt. Download it as Markdown or as editable slides (one receipt slide per source), or send it to colleagues inside Lyceum. The evidence report itself also exports as Markdown with receipts.

A document the lecturer is permitted to keep can also be pasted in as a source.

**Course Studio, Teaching plan.** Save sessions with week, topic, duration, outcome links, activity, learning check and resources; ready and delivered sessions require preparation details. Export the plan as Markdown. Any saved session downloads as an editable teaching pack (.pptx): a title slide, the session's outcomes, the employer evidence linked to those outcomes with exact quotations, the activity, the check and the resources, each with speaker notes. No model writes a word of it. A course change flags affected sessions for review while keeping their content.

**Course Studio, Assessment and Proposal.** Prepare a blueprint without a proposal; item generation uses local templates. An affected assessment needs a recorded course-change review and repaired links before another submission. The Proposal tab retains the earlier review workflow, whose scenario results are illustrative.

**Guide and progress.** Section guides for every screen, a role filter, search, the list of unbuilt work, and workspace backup and restore: a schema-versioned JSON file with a preview, validation of every record and link, a replacement acknowledgement and a pre-restore recovery copy. Older backup versions restore with later collections empty.

**The self-driving demo.** Play demo on the sign-in screen plays a full tour of CS310 over the real app with a simulated cursor, in about five and a half minutes after three intro cards: a course revision under constraint checks with its version history, the research run on the saved sample, exact quotations with a rejected paraphrase, bulk review, a coverage mapping, a teaching session with its slide pack downloaded, a template assessment, a meeting brief with slides sent to the programme owner, the guide and backup page, and the recipient reading the brief.

## 4. What is real and what is illustrative

| Area | Status |
|---|---|
| Live collection from the Greenhouse and Lever board APIs | Real, on request, through the local API. Verified 9 October: Stripe board 727 postings, Palantir site 313 postings. |
| Saved sample | Real postings from the Stripe board, retrieved 9 October 2026, truncated, labelled as a sample wherever shown. |
| Quotations, counts, intervals, coverage index, briefs, backups | Real and deterministic; covered by automated checks. |
| Curriculum revisions, constraint checks, version history, teaching plans | Real, browser-local. |
| Teaching packs and brief decks (.pptx) | Real and deterministic, generated from saved data with speaker notes; the checks unzip the files and read the slides. |
| The five personas and seeded courses | Prototype identities and example courses. |
| Trends, Relevance Index, Acceptance test, Closed loop | Earlier screens on synthetic market figures and synthetic learner records; labelled illustrative; not evidence of readiness. |
| Optional model streaming for drafting | Exists behind a key; never changes a number; not used in the demo. |

## 5. Verification on 9 October 2026

| Command | Result |
|---|---|
| `npm run typecheck` | Passed. |
| `npm run prove:all` | 152 checks passed across twelve suites: acceptance, backtest, flow, signal, intake, integrity, teaching, curriculum, evidence, collector, research and slides. |
| `npm run build` | Passed with the normal Vite CLI; the main chunk exceeds 500 kB, a warning only. |
| `npm run smoke:curriculum` | Passed: course creation, constraint failure and correction, local adoption, outline export, teaching session and its downloaded teaching pack, assessment review, version history, evidence receipts, rejected misquote, scan, brief sent and its downloaded deck, JSON backup and restore, 390 and 320 pixel reflow, zero page errors. Both decks are unzipped and their slides read. |
| `npm run smoke:workspace` and `npm run smoke:integrity` | Passed. |
| `npm run smoke` | Passed: the full-tour demo adopts a revision, imports sample postings, confirms quotations, maps CLO5, saves a session, generates template items, downloads the teaching pack and the brief deck, sends the brief and has it read, with no page errors. |
| `node scripts/generate-guide.mjs --check` | The generated lecturer guide matches the in-app catalogue. |
| Live API | Greenhouse and Lever fetched; cache, token validation, unknown board, unknown provider and rapid-retry responses behaved as specified. |

Browser checks run in isolated headless profiles with external requests blocked, except the explicit live API check.

## 6. Architecture

A diagram is at `docs/presentation/architecture.png`.

- Browser workspace: React and TypeScript, hash routing, a single persistent store, browser-local persistence with exit flush and visible storage failure, validated JSON backups at schema version 3.
- Deterministic core in `src/lib/`: curriculum constraints and diffs, teaching plans, evidence calculations (citation validator, fingerprints, Wilson intervals, coverage stages, report and brief), board payload normalisation and keyword filters, backup validation.
- Local API: Hono on Node 24. `/api/parse` for xlsx, csv, pdf, pptx and docx. `/api/collect/:provider/:board` for the two permitted job-board hosts, with board-token validation, a one-hour cache, a 15-second gap between fetches of the same board, at most 20 fetches per ten minutes, a 15 MB size cap, a 20-second timeout and plain error messages. `/api/agent` for optional model streaming with a deterministic fallback.
- Planned: a shared API and identity (plan W02) as the contract for Teams through Copilot Studio, Slack and LTI surfaces, so a university reaches Lyceum from the tools it already uses.

## 7. Data, sources and policies

- Source policies are shown in the app for each collection source: owner, method, retention, refresh, policy review date and a note on intended use. Greenhouse and Lever publish these APIs for employers' career pages; Lyceum fetches a named employer's board at low volume on request and does not collect from LinkedIn or anything behind a login. Scheduled or bulk collection would need confirmation of intended use first.
- Provenance per source: lecturer-supplied or collected, with provider, board, posting id, retrieval time and policy label. Publication dates are shown as published and never manufactured from the retrieval time.
- Everything is stored in the lecturer's browser. Backups may contain course material and uploaded learner records and belong to the lecturer. No data is sent to a provider unless a model key is configured, and then only the payload of the specific request.

## 8. Known limitations and not built

- No shared accounts, server permissions, server store or multi-device sync; the browser is the only persistence, with JSON backups as the recovery path.
- Collection covers two documented board APIs and manual paste. No page collectors for employer sites without an API, no snapshots of arbitrary sites, no cross-site vacancy clustering, no scheduled refresh.
- The Lever API does not state the employer name, so the site token is used.
- No comparable time windows yet, so no trend over time is reported.
- Assessment items are template-based; exact mark allocation, model answers and rubrics are pending.
- Slide packs are generated from saved data with no model-written text. Model-drafted slide content with lecturer review, selective regeneration, institutional templates, handouts, and DOCX or PDF export of the brief are pending.
- The Trends, Relevance Index, Acceptance test, Closed loop and Data room screens remain on synthetic fixtures. Since 11 October they sit in a sidebar group labelled Research sandbox, illustrative, carry the prototype-data notice, and never appear on the public landing page (Section 12).
- The optional model integration uses an older SDK and a previous-generation model id; the intake route forces a tool call that current models reject. This is scheduled work.
- Accessibility: labels, focus, keyboard tabs, reflow and contrast are checked by the smokes; a full WCAG 2.2 AA audit with a screen reader is pending.
- No lecturer pilot has run; no educational or commercial validation is claimed.

## 9. Next steps

In order (the synthetic screens were quarantined on 11 October): the provider upgrade; comparable time windows for trends; employer naming for Lever; model-drafted slide content with lecturer review on top of the deterministic packs; DOCX and PDF export of the brief; code splitting; an accessibility pass; an OpenAPI description of collect, report and brief as the contract for the shared API; the shared API and identity when a pilot has a date; then the Teams or Slack surface for the pilot institution's tool.

## 10. Market and pitch references

Labelled estimates with sources are in the improvement plan, Sections 26 to 28: over 22,000 accredited institutions and over 14 million tertiary teachers worldwide (UNESCO); roughly 45,000 lecturers in Malaysia (MOHE 2023) across 20 public universities and about 355 private institutions (MIDA); adjacent curriculum software spend estimated between USD 0.48 billion and USD 3.5 billion for 2025 by publishers who disagree; incumbents Lightcast Skillabi and Chmura JobsEQ selling to institutions from above. The pitch follows the AWS five-V structure: Value, Visualize, Validate, Verify, Venture.

## 11. Repository map

- `docs/lyceum-improvement-plan.md`: the master plan with dated execution records.
- `DECISIONS.md`: the decisions log.
- `README.md`, `JUDGES.md`, `docs/lecturer-guide.md`: how to run, judge and use the prototype.
- `docs/presentation/`: pitch pack, deck brief, architecture diagram and app screenshots.
- `src/lib/evidence.ts`, `src/lib/collect.ts`, `server/collect.ts`: the research run's logic and collector.
- `docs/research/`: the pain and market research note of 11 October 2026, every figure with its source.
- `docs/review/`: the Codex planning and review runs, kept as written.
- `src/app/journey.ts`, `src/app/runs.ts`, `src/lib/benchmark.ts`, `src/data/painStats.ts`, `src/data/scanBenchmark.ts`: the journey, the role record, the benchmark and the sourced figures.
- `src/lib/slides.ts`: the teaching pack and brief deck generator.
- `src/lib/curriculum.ts`, `src/lib/teachingPlan.ts`, `src/lib/workspaceBackup.ts`: curriculum, teaching and backup logic.
- `src/prove-*.ts` and `scripts/*-smoke.mjs`: the automated checks named in Section 5.
- `docs/history/`: the July 2026 implementation specification and as-built report, superseded by this document.

## 12. Addendum, 11 October 2026: guided journey, How it works, Evaluation, public landing page

Written after the organizer's review of the pitch on 11 October, which asked for graphics instead of prose, the agents shown step by step instead of numbers first, a benchmark for the student-simulation agent, the pain at Asia and world level, market intelligence, novelty, and guidance after sign-in. Every statement below was checked against the running code on the owner's machine on 11 October; the verification table lists the commands and their results.

### What changed

- **Public landing page.** Signed out, `#/index` shows a landing page instead of the illustrative Relevance Index: the pain with sources at Malaysia, Asia and world level (nine figures, three per scope, each with its publisher and a link; the fuller list with caveats is `docs/research/pain-and-market-2026-10-11.md`), the ILOSTAT comparators from the same DOSM release, what the MQA code of practice asks of every programme, the five steps, what is proven, what is not built, and two ways in (sign in, or watch the tour). No synthetic figure appears on it. The Relevance Index stays behind sign-in, labelled.
- **Navigation regrouped.** Work screens first; then UNDERSTAND (How it works, Evaluation, Guide and progress); then RESEARCH SANDBOX, labelled illustrative (Trends, Acceptance test, Closed loop, Data room, Relevance Index). The prototype-data notice appears only on those sandbox screens and on Approvals, instead of on every screen.
- **A guided journey computed from real state.** A seven-step bar in Course Studio and a Start here card on Home: open a course, confirm the outline, collect evidence, confirm quotations, map to outcomes, plan a class, brief the meeting. A step is done only when the workspace holds its result: an adopted version, a reviewed posting that carries a confirmed quotation, a mapping to a current outcome, a session linked to an outcome, a prepared brief. Seeded examples never count. The next step is always one action, and each step opens the tab where it happens.
- **How it works, in place of Agents.** Seven role cards (Folio, Scout, Atlas, Quill, Prism, Lens, Steward), each stating what it reads, produces and cannot do; four principles; and a timeline for the selected course derived from saved records: revisions and adoptions, fetches named as live or as the dated saved sample, pasted documents, confirmed quotations grouped by minute, the current count over the reviewed denominator, mappings, sessions, template items, briefs prepared and sent with how many recipients have read them. Each entry opens the tab that holds it. The page says it is a record of saved work, not a log of agent activity, and nothing on it is invented.
- **Evaluation.** Live checks recomputed on every visit: every stored quotation re-verified against its source text, duplicate copies, the eligible denominator, and the validity of a backup of the current workspace. A hand-labelled requirement scan benchmark with precision, recall, F1 and level accuracy and the list of disagreements. The automated suites table. The protocol for benchmarking the student-simulation agent against course outcomes and surveys (ground truth, prediction frozen before the term, scoring against a naive baseline, transparency), labelled not yet run, with the synthetic backtest error shown under a synthetic label. Pilot measures.
- **Charts where numbers live.** Thin single-hue share bars with Wilson whiskers in the Observed requirements table, a top-requirements bar list above it with the exact figures printed beside each bar, and a chart slide in the generated brief deck: one series, the count written on each bar, the axis ending at the reviewed denominator.
- **The demo** visits How it works after the brief is sent, so the judge sees the record of the afternoon by role. Its reset warning now detects evidence, quotations, mappings, briefs and revisions as saved work.
- **Honesty fixes from a Codex code review** (`docs/review/codex-ui-review-2026-10-11.md`): "See the trend" became "See the counts" because no comparable earlier window exists; the landing footer says that file parsing and live collection go through the local API; a fresh deep link to the landing page is no longer overwritten on first load; the demo-data "verified" flag no longer reads as institutional verification; a signed-out private link is replaced by the public route.

### Scan benchmark, 11 October 2026

37 sentences in job-posting style, hand-labelled by the owner against a fixed lexicon of 10 terms, deliberately including indirect mentions (a Postgres warehouse for SQL), negations (no SQL is needed), inflections (dashboarding, communicating) and a job title. Result on 11 October: precision 94.1% (32 of 34 proposals right), recall 84.2% (32 of 38 labelled skills found), F1 88.9%, level accuracy 90.6% (29 of 32 true positives read at the labelled level); 10 sentences disagree and are listed on the page with the expected and found skills and levels. The proofs assert that recall stays below 100% and that the known hard cases miss, so the set can never be tuned into a perfect score. It measures the deterministic scan, not a model; the lecturer still confirms every proposal.

### Verification on 11 October 2026

| Command | Result |
|---|---|
| `npm run typecheck` | Passed. |
| `npm run prove:all` | 160 checks passed across fourteen suites: the twelve from 9 October plus the benchmark suite (labelled set well formed, metric arithmetic, strong on direct mentions and provably weak on indirect ones, live re-verification catching a tampered quotation, duplicates and unreviewed postings excluded from the denominator) and the journey suite (a step is done only when its result exists, the timeline is derived in saved order and names a sample import, every landing figure has a source and a link). The slides suite now also asserts the chart part of the brief deck. |
| `npm run build` | Passed; the main chunk size warning is unchanged. |
| `npm run smoke:integrity` | Passed: the landing page carries no synthetic figure and no notice; eleven signed-in screens carry the notice only on the five sandbox screens; the Relevance Index keeps its fixture labels and split-source warning; zero page errors. |
| `npm run smoke:workspace` | Passed, after the expected guide count moved from 14 to 15 for the new Evaluation guide. |
| `npm run smoke:curriculum` | Passed. |
| `npm run smoke` | Passed: the full tour, 14 checks, both decks downloaded, no page errors. |
| `node scripts/generate-guide.mjs --check` | The generated lecturer guide matches the in-app catalogue. |

Browser checks run in isolated headless profiles with external requests blocked. No live API call was made on 11 October; the 9 October live results stand.

### Still not built

Everything in Section 8 except the quarantine. In addition: brand artwork (the landing page falls back to inline art until the owner drops Gemini images into `public/brand/`; prompts are in `docs/presentation/gemini-asset-brief.md`), the pitch deck itself (talk track and visual notes in `docs/presentation/pitch-v2.md`), the student-agent benchmark on real course data, a reduced-motion mode for the demo cursor, and the next UI package the Codex plan ranks highest: a step rail inside Evidence, a source pane beside each proposed quotation, and skill cards in place of the ten-column table.
