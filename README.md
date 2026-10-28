<p align="center">
  <a href="#hafizlyceum-team-npm-run-proveall"><img src="https://img.shields.io/badge/checks-185_passing-8BC34A?style=for-the-badge&labelColor=161b22" alt="checks: 185 passing"></a>
  <a href="#hafizlyceum-team-cat-how-we-work"><img src="https://img.shields.io/badge/repo-private_team_sandbox-B8F23A?style=for-the-badge&labelColor=161b22" alt="repo: private team sandbox"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-proprietary-B9CDBF?style=for-the-badge&labelColor=161b22" alt="licence: proprietary"></a>
</p>

```text
hafiz@lyceum-team:~$ cat ./about
lyceum turns real job postings into a course decision with receipts,
every semester. this is the team's copy of the working code: branch off
main, build, check, and open a pull request when something is worth a look.

hafiz@lyceum-team:~$ npm run prove:journey | grep -E "^ℹ (tests|pass|fail)"
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

### <samp>hafiz@lyceum-team:~$ npm run dev</samp>

Node.js 24 or newer (the scripts run TypeScript directly), and Chrome or Edge for the browser checks. On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

```bash
npm install                            # once, at the root: installs for web/ and api/ together
cp api/.env.example api/.env           # the API's settings: the model, search, the database, Google sign in
cp web/.env.example web/.env           # optional: only the API's port for the dev proxy
cp .env.example .env                   # optional: Postgres and SearXNG for Docker

npm start          # Docker (Postgres, SearXNG), then the web app on http://localhost:5173 and the API on :8787
npm run dev        # the same without Docker
```

Each side also runs on its own from its folder: `cd web && npm run dev` for the frontend, `cd api && npm run dev` for the backend (`npm run db:migrate` there too). The web app forwards `/api` to the API, so start both for anything that signs in, saves to the server or calls a model.

Choose **Dr Sobri** on the sign-in screen for the whole lecturer workflow, or **Play demo** for the self-driving tour (about 7 minutes). The demo personas save in the browser and need no AI key and no account. Live board collection (Greenhouse and Lever) and document parsing go through the API; the dated saved sample works without it. Never commit a `.env`.

### <samp>hafiz@lyceum-team:~$ npm run prove:all</samp>

```bash
npm run typecheck
npm run prove:all          # 185 checks in seventeen suites
npm run build
npm run smoke              # the whole tour in a headless browser
npm run smoke:integrity    # also smoke:workspace and smoke:curriculum, after a build
```

The guide, the palette and the prose have their own checks: `node scripts/generate-guide.mjs --check`, `node scripts/contrast-check.mjs`, `node scripts/dash-scan.mjs`. The pitch builds and checks itself with `npm run deck`. Run these before a pull request; consolidation runs the same.

### <samp>hafiz@lyceum-team:~$ tree -L 2</samp>

```text
web/              FRONTEND: the React app (Vite). index.html, public/, vite.config.ts, .env.example
  src/ui/screens/     one file per loop step, plus Home, Courses, How it works, Evaluation, the landing page and the sandbox
  src/ui/shell/       the header, the sidebar and the loop's path across the top of every step (LoopRail.tsx)
  src/ui/primitives/  shared components: buttons, fields, tags, the ring, the handoff card
  src/ui/mascots/     the host and the seven helpers, drawn in code
  src/theme/          the generated global.css
  src/app/            the store, roles, the loop and its ring, routes, the event log, moods, the account client
  src/demo/           the self-driving tour
api/              BACKEND: the Hono API. Accounts, the database and its migrations/, file parsing (parse/), job-board
                  collection, scheduled Watch, the agents' model calls. .env.example
shared/           code both sides run, imported by relative path
  lib/                the deterministic core: evidence maths, collection, curriculum checks, slides, benchmark
  agents/             the agents' fixtures and the browser's client for them
  data/               seed data, sourced figures, the labelled scan benchmark
  theme/tokens.ts     the only source of colour and type
  types.ts            the domain types
tests/            prove-*.ts, the automated checks
mcp/              the local door: a read-only MCP server over an exported workspace
scripts/          browser smokes, the screenshot, deck, brief and poster generators
deck/             the pitch, an HTML deck with its PDF and PPTX export
video/            the film: script, storyboard, style, the capture and the Remotion project
```

### <samp>hafiz@lyceum-team:~$ cat ./ui-rules</samp>

- Colours and type come from `shared/theme/tokens.ts` only; a hand-written hex anywhere else fails the contrast check. Fonts are bundled, never fetched.
- Lime sits on forest surfaces only. Anything outlined with a lip is a control; a flat pill is a label. The look lives in one block at the end of `web/src/theme/global.css`.
- Every step screen reads the same way: the path, the helper's question in a bubble, the work, the handoff to the next step (`web/src/ui/screens/StepFrame.tsx`).
- Honesty labels on every surface: real, prototype, illustrative, planned. Synthetic data says synthetic, and every number on a surface is registered with its source in `docs/claims.md`.
- Nothing moves without a real request or a saved record, and the characters never appear on an error.
- No en or em dashes, anywhere.

### <samp>hafiz@lyceum-team:~$ ls docs</samp>

| file | what it is |
|:--|:--|
| [FEEDBACK.md](FEEDBACK.md) | what the organizer said, what is done and what is open |
| [docs/claims.md](docs/claims.md) | every number on every surface, with its source and the check that holds it |
| [docs/research/](docs/research/) | the dated research notes behind the figures; the proofs read them |
| [docs/lecturer-guide.md](docs/lecturer-guide.md) | how each screen is used, generated by `scripts/generate-guide.mjs` |
| [docs/design/](docs/design/) | the palette poster and its WCAG audit, the source of `tokens.ts` |
| [docs/doors.md](docs/doors.md) | the local door: setting it up in Claude Desktop or Claude Code, and a recorded session |
| [docs/brand-use.md](docs/brand-use.md) | each third-party mark, its source and its terms |
| `docs/presentation/` | generated: the screenshots, the architecture diagram, the brief, the poster and the sample decks |

### <samp>hafiz@lyceum-team:~$ cat ./how-we-work</samp>

We work swarm style: everyone builds in their own branches, and Hafiz consolidates.

- `main` is Hafiz's. Don't push to it; it moves when work is consolidated.
- Branch from `main` and name the branch after yourself and the work, for example `aina/mascot-art`. Push as often as you like. Nothing in a branch can break `main`, so experiment freely.
- Overlap is fine. If two people try the same thing, the better version wins, or the best parts of both.
- When something is worth a look, open a pull request into `main` and fill in the template. Hafiz reviews it and takes what helps into `main`, sometimes only part of it, then closes the PR. A closed PR is not a rejected idea.
- When `main` moves, merge it into your branch before you carry on.
- No secrets, keys or personal data in the repo. `.env` is ignored for a reason.
