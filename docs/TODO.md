# Lyceum to-do

What is being built, what is done, and what is next. Tick a box when it is merged into the branch it belongs to, and add
the branch name. Newest work at the top of each section.

## In progress (`feat/onboarding-auth`)

- [ ] **Try the outline import with a real model and a real outline.** Built and tested with a scripted model only; set
      `LYCEUM_AGENT_*` in `.env`, upload a real course outline in onboarding, and check what it proposes.

## Next: a real loop, end to end (no fixtures on the main path)

The goal: a fresh account, a real outline and real postings run Watch → Report → Decide → Update → Teach → Learn with
nothing typed in by hand. The demo personas and the CS310 sample stay, but only behind a demo switch.

### Agents: from fixtures to live
- [ ] **One model config for every agent.** `server/llm.ts` (Anthropic, `ANTHROPIC_API_KEY`, `LYCEUM_MODEL`) and the
      agent search / outline reader (`LYCEUM_AGENT_*`) are two separate setups. Move intake, authoring, evaluator, analogy and
      signal onto the `LYCEUM_AGENT_*` client, and remove the second setup.
- [ ] **Signal from real evidence.** `src/agents/signal.ts` hard-codes demand and coverage per CLO (CLO4 = 0.88 and so on)
      and its live mode throws. Compute demand per CLO from Lens's confirmed quotations and mappings (`src/lib/evidence.ts`,
      share and Wilson interval), coverage from the course's topics and hours, and the drift flag from those. Programme,
      Trends and `routeDrift` (`src/app/store.ts:987`) read it.
- [ ] **Signal reveal driven by the run.** `src/app/signalSim.ts` animates a fixed answer. Show the real run's steps (the
      postings read, the skills found, the CLOs mapped) as they happen, or drop the animation.
- [ ] **Market sources from real runs.** Replace `MARKET_SOURCES` (`src/data/market.ts`, the made-up JobStreet and
      LinkedIn counts) with the research runs actually done: board, date, postings kept. Delete the synthetic list
      (Trends, DataRoom, Index).
- [ ] **Intake live.** `src/agents/intake.ts` returns a canned filing that ignores the file. Run the model, with
      `intakeLocal.ts` as the fallback with no model, and remove `liveNotImplemented` (`src/agents/mode.ts`).
- [ ] **Authoring live.** `store.ts:1278` and `:1316` pass `"fixture"`. Draft and critique with the model on the course's
      real outline and evidence. The lecturer still accepts each change.
- [ ] **Atlas proposes mappings.** Skill → CLO mapping is all by hand today. The model proposes a mapping with a reason;
      the lecturer confirms each one, the same way as quotations.
- [ ] **Lens scan with a model.** `proposeMentions` uses a keyword list only. Add model-proposed quotations, still checked
      word for word against the posting (`locateExcerpt`) before they can be confirmed.
- [ ] **Prism drafts quiz items.** `src/lib/items.ts` uses templates. The model drafts stem, key and distractors per CLO
      and Bloom level; the existing lint and the lecturer's review stay the gate. Keep templates as the no-model fallback.
- [ ] **Prism drafts slide content.** The slides use only saved text. The model drafts each session's slides from its
      CLOs, topics and evidence into the existing .pptx writer (`src/lib/slides.ts`).
- [ ] **Steward drafts the brief's prose.** The numbers stay computed; the model writes the summary and recommendation,
      citing only confirmed quotations.

### Scheduling and running in the background
- [ ] **Watch on a schedule.** A server-side job per course (weekly or per term) that runs collection and agent search,
      stores the run, and shows "new since last run" on Watch. Today it runs only when the lecturer asks.
- [ ] **Agent runs on the server, not in the tab.** Persist each run (status, steps, tool calls, cost) so a run survives a
      closed tab and can be audited; show it on the agent's card. Retries, a per-run token budget, a usage log.

### Decide and Learn: the mock cohort
- [ ] **Cohort from the course's own data.** `src/data/synthetic-cohort.json` (200 made-up students) and the knobs in
      `src/config.ts` feed the verdict. Build the cohort from the course's uploaded results and CLO surveys; keep the
      synthetic cohort for the demo only.
- [ ] **Lock predictions, then score them.** Freeze the cohort's predictions before a term starts, then score them against
      that term's results and CLO/SSRT survey on Learn. Until two terms are scored, keep "no learning gain is claimed".
- [ ] **Backtest on uploaded history.** `src/data/historical-backtest.json` is a fixed v1 cohort; run the backtest on a
      past term the lecturer uploads.
- [ ] **Staged reveal from the real run.** `src/app/sim.ts` replays a precomputed result over 16 s; show real progress.

### People and sharing
- [ ] **Shared programme workspaces and invitations** (see role-based onboarding below). Without it, "send the brief to a
      colleague" (`sendEvidenceBrief`, `store.ts:2653`) only reaches the seeded demo personas.
- [ ] **Email notifications** for a sent brief, a decision needed, a finished scheduled run.
- [ ] **Survey answers in the database.** The booth keeps responses in a `Map` in `server/index.ts`; a restart loses them.

### Data out of the code and into the database
- [ ] **Delete the numbers that are fake, don't move them.** The Signal constants, the market source counts, the canned
      intake and authoring fixtures are replaced by the work above, not copied into tables.
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
      until the move; then decide whether Supabase Auth, Storage (uploaded files) and row-level security replace ours.
- [ ] **Uploaded files in object storage.** Outlines, results and slides are parsed and dropped; keep the originals
      (local disk now, Supabase Storage or S3 later) so a quotation or a figure can link back to its file.

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
