# Lyceum to-do

What is being built, what is done, and what is next. Tick a box when it is merged into the branch it belongs to, and add
the branch name. Newest work at the top of each section.

## In progress (`feat/onboarding-auth`)

- [ ] **Try the outline import with a real model and a real outline.** Built and tested with a scripted model only; set
      `LYCEUM_AGENT_*` in `.env`, upload a real course outline in onboarding, and check what it proposes.

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
