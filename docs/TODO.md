# Lyceum to-do

What is being built, what is done, and what is next. Tick a box when it is merged into the branch it belongs to, and add
the branch name. Newest work at the top of each section.

## In progress (`feat/onboarding-auth`)

- [ ] **Try the outline import with a real model and a real outline.** Built and tested with a scripted model only; set
      `LYCEUM_AGENT_*` in `.env`, upload a real course outline in onboarding, and check what it proposes.

## Next: a real loop, end to end (no fixtures on the main path)

The goal: a fresh account, a real outline and real postings run Watch → Report → Decide → Update → Teach → Learn with
nothing typed in by hand. **Nothing hardcoded is removed:** the fixtures, the demo personas and the CS310 sample stay for
the short pitch and the booth demo, and the live path is added beside them. A course runs live when a model is set and it
has real data; the demo runs on the fixtures.

### Agents: from fixtures to live
- [x] **One model config for every agent** (`refactor/unify-agent-model`). Intake, authoring, evaluator, analogy and
      signal now call the `LYCEUM_AGENT_*` model through `openAiChat`, like agent web search and the outline reader;
      `ANTHROPIC_API_KEY`, `LYCEUM_MODEL` and the Anthropic SDK are gone. The fixtures still answer with no model set.
- [x] **Signal from real evidence** (`feat/signal-from-evidence`). `signalFromEvidence` (`src/agents/signal.ts`) gives each
      outcome its demand (share of reviewed postings for its most-asked mapped skill), coverage (the coverage index per
      outcome) and gap, and flags the course when demand's 95% lower bound beats coverage by 0.5. Shown on Report → Map;
      `currentSignal()` feeds Programme (which now lists the lecturer's own courses), `routeDrift`, and `currentGaps()`
      feeds Trends, for every course that has reviewed evidence; the fixture covers the rest. The Trends reveal animation
      still plays the fixture's story (see "Signal reveal driven by the run").
- [ ] **Signal reveal driven by the run.** `src/app/signalSim.ts` animates a fixed answer. Show the real run's steps (the
      postings read, the skills found, the CLOs mapped) as they happen; the scripted reveal stays for the demo.
- [ ] **Market sources from real runs.** Replace `MARKET_SOURCES` (`src/data/market.ts`, the made-up JobStreet and
      LinkedIn counts) with the research runs actually done: board, date, postings kept, on real courses. The synthetic
      list stays, labelled, for the demo (Trends, DataRoom, Index).
- [x] **Intake live** (already, since `refactor/unify-agent-model`). The Upload screen sends a real file to
      `/api/agent/intake` on the configured model, with `intakeLocal.ts` as the fallback with no model. The one-click
      `uploadResults` path and `runIntake`'s fixture stay for the demo and the proofs.
- [x] **Authoring live: Quill on the Update step** (`feat/live-intake-authoring`). With a revision open, "Suggest changes"
      sends the outline and the quoted skills the course is below target on or has not mapped (with counts and a quotation)
      to the model, which suggests single changes: reword an outcome, add one, add a topic. Each is checked
      (`src/lib/revision.ts`: unknown outcomes and kinds dropped, Bloom levels normalised) and the lecturer applies or
      dismisses it into the open revision; saving, checking and adopting are unchanged. The sandbox Proposal screen
      (`draftWithAgent`, `requestAgentReview`) keeps its CS220 fixture for the demo.
- [x] **Atlas proposes mappings** (`feat/atlas-lens-proposals`). "Suggest mappings" on Report → Map sends the quoted skills
      with no mapping (count and one quotation each) and the outcomes by label; Atlas proposes the outcomes each belongs
      to, or says it fits none (a gap). Applying records the mapping with stage and target unknown: those stay the
      lecturer's (`src/lib/proposals.ts`).
- [x] **Lens scan with a model** (`feat/atlas-lens-proposals`). "Find with Lens" on Report → Quote sends the 10
      least-quoted postings, three to a call in parallel, with the skills already quoted from each. A proposal is kept only
      if `locateExcerpt` finds it in its posting; the rest join the scan's list and are confirmed the same way. The
      keyword scan stays.
- [x] **Prism drafts quiz items** (`feat/prism-quiz-items`). "Draft with Prism" on a session's items sends its topic, linked
      outcomes (two at most) and recorded misconceptions to the model, which writes a multiple-choice item, a short answer
      and an essay per outcome with keys, accepted answers and marker guidance. Each is checked (`readModelItems`: one key,
      known outcome), then the lint runs and the items it fails go back once with their broken rules; a fix replaces its
      item only if it passes. Items join the session unreviewed, tagged "Drafted by Prism"; the review and the
      lint-gated Moodle/QTI export are unchanged. The templates stay as the no-model path. Note: a recorded misconception
      worded with an absolute ("every") can never pass both the absolutes and the misconceptions rules; reword it.
- [x] **Prism drafts slide content** (`feat/prism-slide-content`). "Draft slides with Prism" on the lecturer's own session sends
      the session, its outcomes, its topic's activities, readings and misconceptions, and the evidence mapped to its
      outcomes; the model writes the teaching body (six to ten slides with speaker notes), checked by `readSlides`. The pack
      keeps its generated cover, outcomes, evidence, check, resources and closing around them, and the cover and every
      slide's footer say the text was drafted by the model. Kept through a session edit; redraft or discard on the card;
      the lecturer edits the downloaded .pptx in PowerPoint. Samples stay as written.
- [ ] **Steward drafts the brief's prose.** The numbers stay computed; the model writes the summary and recommendation,
      citing only confirmed quotations.

### Scheduling and running in the background
- [x] **Watch on a schedule** (`feat/scheduled-watch`). A signed-in lecturer saves the Watch form's source (Greenhouse or
      Lever board, or an agent search brief) as a schedule every 1 to 90 days. The API checks every 15 minutes
      (`server/watch.ts`, `LYCEUM_WATCH=off` to stop it), claims each due schedule so it runs once, and keeps each run,
      failures included, in `watch_runs` (last 10 per course; migration 002). Watch lists the runs and how many postings
      are not yet imported; Open loads a run into the usual results table to import. Run now runs it on request. Demo
      personas have no account, so the panel asks them to sign in. Email when a run finds something is still open (see
      People and sharing).
- [ ] **Agent runs on the server, not in the tab.** Persist each run (status, steps, tool calls, cost) so a run survives a
      closed tab and can be audited; show it on the agent's card. Retries, a per-run token budget, a usage log.

### Decide and Learn: the mock cohort
- [ ] **Cohort from the course's own data.** `src/data/synthetic-cohort.json` (200 made-up students) and the knobs in
      `src/config.ts` feed the verdict. Build the cohort from the course's uploaded results and CLO surveys; keep the
      synthetic cohort for the demo.
- [ ] **Lock predictions, then score them.** Freeze the cohort's predictions before a term starts, then score them against
      that term's results and CLO/SSRT survey on Learn. Until two terms are scored, keep "no learning gain is claimed".
- [ ] **Backtest on uploaded history.** `src/data/historical-backtest.json` is a fixed v1 cohort; run the backtest on a
      past term the lecturer uploads.
- [ ] **Staged reveal from the real run.** `src/app/sim.ts` replays a precomputed result over 16 s; show real progress on
      real courses, and keep the replay for the demo.

### People and sharing
- [ ] **Shared programme workspaces and invitations** (see role-based onboarding below). Without it, "send the brief to a
      colleague" (`sendEvidenceBrief`, `store.ts:2653`) only reaches the seeded demo personas.
- [ ] **Email notifications** for a sent brief, a decision needed, a finished scheduled run.
- [ ] **Survey answers in the database.** The booth keeps responses in a `Map` in `server/index.ts`; a restart loses them.

### Data out of the code and into the database
- [ ] **Keep the fake numbers as demo data, not as tables.** The Signal constants, the market source counts and the canned
      intake and authoring fixtures stay in the code for the pitch; the work above computes the real ones. They are not
      copied into tables, since editing a made-up number does not make it real.
- [ ] **Reference data as tables, editable from Settings.** Bloom verbs (`items.ts` `BLOOM_VERBS`), the skills lexicon,
      accreditors (`src/data/accreditors.ts`), institution details (`src/data/institution.ts`), pass marks and KPI
      targets, the model knobs (`src/config.ts`). One migration each, seeded with today's values, read through one
      endpoint. Per-institution rows where it differs by institution.
- [ ] **The demo as one seed, not scattered constants.** Move `src/data/seed.ts`, `sample-course/` and the demo personas
      into a script that creates a demo account with that workspace in the database (`npm run db:seed-demo`). The browser
      no longer ships the seed.
- [ ] **Split the workspace blob into tables, one entity at a time.** `workspaces.backup` is one `jsonb` per account,
      which blocks shared programmes and querying. Start with what is shared or searched: programmes, courses, CLOs,
      evidence sources, quotations, mappings, decisions, versions. Keep the backup export working throughout.
- [ ] **Stay Supabase-ready.** Plain Postgres and SQL migrations only (Supabase is Postgres, so the move is a
      `DATABASE_URL` change plus `pg_dump`). Keep auth and permissions in the server, not in Supabase-only features,
      until the move; then decide whether Supabase Auth and row-level security replace ours. Files stay on R2 either way.
- [ ] **Uploaded files in Cloudflare R2.** Outlines, results and slides are parsed and dropped; keep the originals in R2
      (free tier, S3-compatible, so the AWS S3 client works with R2's endpoint) so a quotation or a figure can link back
      to its file. Keys in `.env`; a local folder when they are not set.

### Front end
- [ ] **Move the styles to Tailwind.** `src/theme/global.css` is about 2,600 lines of hand-written CSS with tokens in
      `src/theme/tokens.ts` and `gen:theme`. Map the tokens into the Tailwind theme first, then move one screen at a time,
      deleting its CSS as it goes, and keep `check:contrast` passing.

## Next

- [ ] **Scanned outlines.** A PDF that is only page images has no text to read; it needs OCR, or the model reading the
      pages as images.
- [ ] **Import an outline later, not only at onboarding.** The same reader on Course or Update, proposing a revision.
- [ ] **Role-based onboarding.** A programme leader or head of department sets up the programme, its PLOs and its courses
      and invites lecturers; a lecturer joins an existing programme. Needs shared programme workspaces and invitations on
      the server; today every account gets its own single-owner lecturer workspace.
- [ ] **Search like Odysseus, the rest.** Read several pages per fetch, with only the passages that match a query (Odysseus
      `web_fetch` with `urls` and `query`).
- [ ] **Google logo on the consent screen.** Needs a real domain, a home page and privacy policy, publishing the app and
      Google's brand verification (`public/brand/google-oauth-logo-120.png` is uploaded and waiting).
- [ ] **Accounts:** email verification, password reset, changing a password.
- [ ] **Browser checks.** The four headless smokes need a Chrome or Edge the scripts can find from WSL; the new screens
      (sign in, onboarding, Settings, Home) have not been checked in a browser by the tooling.

## Done

### `feat/onboarding-auth`
- [x] Onboarding: import the course outline (PDF or Word). The model proposes outcomes with Bloom levels, topics with hours,
      hours, weeks, credits and programme outcomes; each outcome is marked as in the document or reworded; the lecturer
      edits and accepts row by row, and the accepted outline becomes the course's first version (`npm run prove:outline`).
- [x] Onboarding: the term and where graduates go; the latter is agent web search's starting brief on Watch.
- [x] Real accounts: email and password (scrypt, lockout, HttpOnly session cookie, origin guard, audit log).
- [x] Sign in with Google (OpenID Connect with PKCE, docs/GOOGLE_AUTH_PORTABLE.md), official G on the button.
- [x] Each account's workspace saved on the server, version-checked; the demo personas stay in the browser.
- [x] Onboarding: about you (name, role, institution, programme), then the first course.
- [x] An account counts only once onboarding is finished; unfinished sign ups are deleted.
- [x] Sign up asks for full name, work email, institution, role, password and its confirmation; the demo list hides there.
- [x] PostgreSQL in Docker with numbered migrations (`npm run db:up`, `npm run db:migrate`, docs/database.md);
      the proofs run on PGlite. `npm start` starts the database, SearXNG, the web app and the API.
- [x] Custom dropdown and a sliding selection for toggles and tabs.
- [x] Sign in page redesigned; tooltips; pop and wait animations; mascots' idle life and chat bubbles.

### `feat/agent-web-search`
- [x] Agent web search on Watch, with any OpenAI-compatible model; settings in `.env`, shown on Settings.
- [x] Search chain like Odysseus: SearXNG, then DuckDuckGo, then keyed providers, with a default time window.
- [x] SearXNG in Docker (`npm run search:up`).
- [x] Full-width pages, the Home redesign, the ring's animations.

### `chore/update-dependencies`
- [x] Dependency upgrades, merged with `main`.
