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
- [x] **Signal from real evidence** (`feat/signal-from-evidence`). `signalFromEvidence` (`shared/agents/signal.ts`) gives each
      outcome its demand (share of reviewed postings for its most-asked mapped skill), coverage (the coverage index per
      outcome) and gap, and flags the course when demand's 95% lower bound beats coverage by 0.5. Shown on Report → Map;
      `currentSignal()` feeds Programme (which now lists the lecturer's own courses), `routeDrift`, and `currentGaps()`
      feeds Trends, for every course that has reviewed evidence; the fixture covers the rest. The Trends reveal animation
      still plays the fixture's story (see "Signal reveal driven by the run").
- [ ] **Signal reveal driven by the run.** `web/src/app/signalSim.ts` animates a fixed answer. Show the real run's steps (the
      postings read, the skills found, the CLOs mapped) as they happen; the scripted reveal stays for the demo.
- [ ] **Market sources from real runs.** Replace `MARKET_SOURCES` (`shared/data/market.ts`, the made-up JobStreet and
      LinkedIn counts) with the research runs actually done: board, date, postings kept, on real courses. The synthetic
      list stays, labelled, for the demo (Trends, DataRoom, Index).
- [x] **Intake live** (already, since `refactor/unify-agent-model`). The Upload screen sends a real file to
      `/api/agent/intake` on the configured model, with `intakeLocal.ts` as the fallback with no model. The one-click
      `uploadResults` path and `runIntake`'s fixture stay for the demo and the proofs.
- [x] **Authoring live: Quill on the Update step** (`feat/live-intake-authoring`). With a revision open, "Suggest changes"
      sends the outline and the quoted skills the course is below target on or has not mapped (with counts and a quotation)
      to the model, which suggests single changes: reword an outcome, add one, add a topic. Each is checked
      (`shared/lib/revision.ts`: unknown outcomes and kinds dropped, Bloom levels normalised) and the lecturer applies or
      dismisses it into the open revision; saving, checking and adopting are unchanged. The sandbox Proposal screen
      (`draftWithAgent`, `requestAgentReview`) keeps its CS220 fixture for the demo.
- [x] **Atlas proposes mappings** (`feat/atlas-lens-proposals`). "Suggest mappings" on Report → Map sends the quoted skills
      with no mapping (count and one quotation each) and the outcomes by label; Atlas proposes the outcomes each belongs
      to, or says it fits none (a gap). Applying records the mapping with stage and target unknown: those stay the
      lecturer's (`shared/lib/proposals.ts`).
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
- [x] ~~**Prism drafts slide content**~~ (`feat/prism-slide-content`), replaced by slide suggestions below. "Draft slides with Prism" on the lecturer's own session sends
      the session, its outcomes, its topic's activities, readings and misconceptions, and the evidence mapped to its
      outcomes; the model writes the teaching body (six to ten slides with speaker notes), checked by `readSlides`. The pack
      keeps its generated cover, outcomes, evidence, check, resources and closing around them, and the cover and every
      slide's footer say the text was drafted by the model. Kept through a session edit; redraft or discard on the card;
      the lecturer edits the downloaded .pptx in PowerPoint. Samples stay as written.
- [ ] **Steward drafts the brief's prose.** The numbers stay computed; the model writes the summary and recommendation,
      citing only confirmed quotations.

### Recording what the helpers do (designed 29 October 2026, by grilling)
- [x] **Every model call and every proposal recorded in Supabase** (`feat/live-agents`). `agent_calls`: one row per call
      (helper, route, account or demo, course, provider, model, tokens, cost when the provider reports it, duration, ok,
      unreadable, timeout or error), with the prompt and reply kept 30 days, then cleared hourly. `agent_proposals`: each
      thing a helper offers (Folio's outline rows, Scout's postings, Atlas's mappings, Lens's quotations, Quill's
      suggestions, Prism's items) with the lecturer's verdict: accepted, edited, or dismissed with a reason
      (`POST /api/proposals/:id/verdict`, accounts only). Views `agent_calls_daily` and `agent_acceptance` for the
      dashboard. `api/record.ts`, migration `20261029090000_agent_records.sql`, `npm run prove:record`. A database that is
      down pauses recording for a minute; the helpers carry on.
- [ ] **An in-app metrics page** reading the same views, after the dashboard has shown which numbers matter.

### Prism: slide suggestions instead of slide drafts (designed 29 October 2026, by grilling)
- [x] **Suggestions on the lecturer's own slides** (`feat/live-agents`). On a session: upload the deck (`.pptx` or PDF; the text is kept, the
      original goes to R2 once that is built), then "Suggest with Prism": a checklist, each item with where (slide N, or a
      new slide after N), the kind (add, change, remove, reorder, pacing), what to do, and why, citing a record (an
      outcome, a recorded misconception, or employer evidence with its count and quotation); only layout and pacing advice
      may stand without one. Each item is marked done or dismissed, and recorded as a proposal.
- [x] **No deck: a session plan** of timed segments (minutes, what, which outcome, the cited record), the same checklist.
- [x] **Slides to add**, not a pack: the record-built slides (outcomes, employer evidence, activity, check,
      resources) as a set to copy into the lecturer's deck; suggestions can point at them.
- [x] **A revised deck is a new round**; earlier rounds stay under History with their marks. Checking whether an earlier
      suggestion was addressed comes later, as its own check.
- [x] **"Draft slides with Prism" removed** (the model no longer writes slides). Slides it drafted before still carry its
      label on every slide and can be discarded. `readSlideSuggestions` checks each suggestion against the session's
      records; `npm run prove:slides`.
- [ ] **Check whether an earlier suggestion was addressed** in a revised deck, as its own check (see the round above).

### Scheduling and running in the background
- [x] **Watch on a schedule** (`feat/scheduled-watch`). A signed-in lecturer saves the Watch form's source (Greenhouse or
      Lever board, or an agent search brief) as a schedule every 1 to 90 days. The API checks every 15 minutes
      (`api/watch.ts`, `LYCEUM_WATCH=off` to stop it), claims each due schedule so it runs once, and keeps each run,
      failures included, in `watch_runs` (last 10 per course; migration 002). Watch lists the runs and how many postings
      are not yet imported; Open loads a run into the usual results table to import. Run now runs it on request. Demo
      personas have no account, so the panel asks them to sign in. Email when a run finds something is still open (see
      People and sharing).
- [ ] **Agent runs on the server, not in the tab.** Persist each run (status, steps, tool calls, cost) so a run survives a
      closed tab and can be audited; show it on the agent's card. Retries, a per-run token budget, a usage log.

### Decide and Learn: the mock cohort
- [ ] **Cohort from the course's own data.** `shared/data/synthetic-cohort.json` (200 made-up students) and the knobs in
      `shared/config.ts` feed the verdict. Build the cohort from the course's uploaded results and CLO surveys; keep the
      synthetic cohort for the demo.
- [ ] **Lock predictions, then score them.** Freeze the cohort's predictions before a term starts, then score them against
      that term's results and CLO/SSRT survey on Learn. Until two terms are scored, keep "no learning gain is claimed".
- [ ] **Backtest on uploaded history.** `shared/data/historical-backtest.json` is a fixed v1 cohort; run the backtest on a
      past term the lecturer uploads.
- [ ] **Staged reveal from the real run.** `web/src/app/sim.ts` replays a precomputed result over 16 s; show real progress on
      real courses, and keep the replay for the demo.

### People and sharing
- [ ] **Shared programme workspaces and invitations** (see role-based onboarding below). Without it, "send the brief to a
      colleague" (`sendEvidenceBrief`, `store.ts:2653`) only reaches the seeded demo personas.
- [ ] **Email notifications** for a sent brief, a decision needed, a finished scheduled run.
- [ ] **Survey answers in the database.** The booth keeps responses in a `Map` in `api/index.ts`; a restart loses them.

### Data out of the code and into the database
- [ ] **Keep the fake numbers as demo data, not as tables.** The Signal constants, the market source counts and the canned
      intake and authoring fixtures stay in the code for the pitch; the work above computes the real ones. They are not
      copied into tables, since editing a made-up number does not make it real.
- [ ] **Reference data as tables, editable from Settings.** Bloom verbs (`items.ts` `BLOOM_VERBS`), the skills lexicon,
      accreditors (`shared/data/accreditors.ts`), institution details (`shared/data/institution.ts`), pass marks and KPI
      targets, the model knobs (`shared/config.ts`). One migration each, seeded with today's values, read through one
      endpoint. Per-institution rows where it differs by institution.
- [ ] **The demo as one seed, not scattered constants.** Move `shared/data/seed.ts`, `sample-course/` and the demo personas
      into a script that creates a demo account with that workspace in the database (`npm run db:seed-demo`). The browser
      no longer ships the seed.
- [ ] **Split the workspace blob into tables, one entity at a time.** `workspaces.backup` is one `jsonb` per account,
      which blocks shared programmes and querying. Start with what is shared or searched: programmes, courses, CLOs,
      evidence sources, quotations, mappings, decisions, versions. Keep the backup export working throughout.
- [ ] **Stay Supabase-ready.** Plain Postgres and SQL migrations only (Supabase is Postgres, so the move is a
      `DATABASE_URL` change plus `pg_dump`). Keep auth and permissions in the server, not in Supabase-only features,
      until the move; then decide whether Supabase Auth and row-level security replace ours. Files stay on R2 either way.
- [x] **Uploaded files in Cloudflare R2: storing** (`main`). `api/storage.ts` keeps a signed-in account's upload in R2 on
      `/api/parse`, before it is read (so a scanned outline is kept for OCR), and a `files` row (migration
      `20261030090000_files.sql`); the same file twice is kept once; the parsed reply carries its `fileId`. Deleting an
      account (a cancelled or stale sign-up) deletes its files first. No `S3_*` set: nothing is stored. `npm run prove:storage`.
      Also fixed: the browser now sends the session's token to `/api/parse`, which online (`LYCEUM_REQUIRE_SIGN_IN=1`)
      refused every upload. Still open below: linking a file to its course and its records, reading it back (OCR, re-reading).
- [ ] **Uploaded files in Cloudflare R2.** Outlines, results and slides are parsed and dropped (`api/index.ts` reads
      the upload into a buffer and keeps only the text); keep the originals so a quotation or a figure can link back to its
      file, OCR and the outline reader can run again on old uploads, and OCR can become a background job.
      - R2 for dev and prod, no local storage container: two buckets (`lyceum-dev`, `lyceum-prod`), each with its own
        API token. R2 is S3-compatible, so `@aws-sdk/client-s3` with R2's endpoint; only `.env` differs (`S3_ENDPOINT`,
        keys, bucket). Free tier is 10 GB, no egress fees.
      - R2 holds the bytes, Postgres holds the record. They never talk to each other; the API server does both: put the
        file in R2 under a key, insert a row in `files` (key, owner, course, name, type, size, sha256, created; migration
        003). Reading: look up the row, fetch by key or hand out a short-lived signed URL. The move to Supabase changes
        only `DATABASE_URL`; R2 is untouched.
      - `api/storage.ts`: `put(key, buf, type)` and `get(key)`, about 30 lines. No R2 keys set → skip storing, so the
        proofs (PGlite, offline) stay offline.
      - First caller: the outline upload in onboarding stores the original before parsing. Then scanned outlines (OCR)
        read from the stored key.
      - Later, not now: presigned browser uploads (when files get large), lifecycle rules, a local MinIO/Garage container
        (only if offline dev or keyless CI needs it; MinIO's community edition stopped shipping images in late 2025).
        Supabase Storage is S3-compatible too, so a switch would be an endpoint change; R2 stays the pick for no egress.

### Compliance (designed 29 October 2026, by grilling; research in `docs/research/education-compliance-2026-10-28.md`)
- [x] **Country on the profile** (`supabase/migrations/20261030100000_country.sql`): asked at onboarding, editable in
      Settings → Data & AI, a banner on Home until set. Malaysia, Singapore, UK, US, EU, Australia, India or Other.
- [x] **The country's rules in every prompt** (`shared/lib/compliance.ts`, added once in `api/record.ts` `withContext`): its
      accreditation framework, data law, no student personal data, use only the material given; Scout prefers vacancies in
      that country. The copied "Use your own AI" prompt carries the same block. A demo persona follows Malaysia's rules.
- [x] **AI use citations** in UTM Circular 3/2024's form on Prism's items and slide suggestions and Quill's applied
      changes, and an "AI use statement" in the items and course outline exports.
- [x] **Student identity out of Intake**: name, matric/ID, email, IC and phone columns removed (browser and API) before the
      model reads a results file; the upload notes say what was removed.
- [x] **Data notice** in onboarding and the **Data & AI** section in Settings (services and regions, retention, no
      training, the 72-hour/7-day breach aim, the country's rules with sources). A summary, not a legal document.
- [x] **AI use statement in the teaching-pack .pptx and the course file manifest** (`sessionAiUse` in `shared/lib/slides.ts`): a slide before the close listing the citations of Prism's items and the suggestions marked done; the manifest lists the whole course's.
- [ ] **Privacy notice, terms and a DPA template** for procurement: need a legal entity and a lawyer.
- [ ] **Rules for more countries**, each from a dated research note, never from memory.

### Front end
- [ ] **Move the styles to Tailwind.** Started on `main`: Tailwind 4 beside `global.css` (in a lower cascade layer, no
      preflight), the theme generated from `tokens.ts` with only token colours, and global.css's breakpoints as `narrow:`,
      `phone:` and `short:` (`web/src/theme/index.css`). Moved: the landing page's own blocks, sign in, onboarding.
      Next, each single-screen block when that screen is next changed (Inbox, CurriculumWorkspace, EvidenceWorkspace,
      Office, ObeReport, CourseWorkspace, StepFrame, CourseRecord...), deleting its CSS as it goes; primitives, the shell,
      shared rules, SVG and print stay as CSS. Keep `check:contrast` passing.

## Next

- [ ] **Scanned outlines.** A PDF that is only page images has no text to read; it needs OCR, or the model reading the
      pages as images. Builds on the R2 file store: the job reads the original by its key.
- [ ] **Import an outline later, not only at onboarding.** The same reader on Course or Update, proposing a revision.
- [ ] **Role-based onboarding.** A programme leader or head of department sets up the programme, its PLOs and its courses
      and invites lecturers; a lecturer joins an existing programme. Needs shared programme workspaces and invitations on
      the server; today every account gets its own single-owner lecturer workspace.
- [ ] **Search like Odysseus, the rest.** Read several pages per fetch, with only the passages that match a query (Odysseus
      `web_fetch` with `urls` and `query`).
- [ ] **Google logo on the consent screen.** Needs a real domain, a home page and privacy policy, publishing the app and
      Google's brand verification (`web/public/brand/google-oauth-logo-120.png` is uploaded and waiting).
- [ ] **Accounts:** email verification, password reset, changing a password.
- [ ] **Browser checks.** The four headless smokes need a Chrome or Edge the scripts can find from WSL; the new screens
      (sign in, onboarding, Settings, Home) have not been checked in a browser by the tooling.

## Done

### `main`
- [x] Onboarding: read the outline with your own AI as well as by upload. "Use your own AI" shows the same prompt the server
      model gets (`ASSISTANT_OUTLINE_PROMPT`, `shared/lib/outline.ts`) to copy into ChatGPT, Claude or Gemini with the
      outline; the pasted reply is checked by the same `readProposal`, with no model on the server. Lyceum never sees the
      document that way, so no outcome is marked as in it or reworded (`npm run prove:outline`).

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
