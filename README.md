# Lyceum

Lyceum is a course workspace for university lecturers. It collects what employers ask for from job postings, keeps every requirement as an exact quote from its source, counts honestly, and turns that into a meeting brief, a revised course outline and teaching materials (slides and quiz items) mapped to the Course Learning Outcomes. The lecturer stays in charge: nothing changes a course until a person approves it.

This is the team repo, and it is private. Lyceum is a working local prototype today: the app runs in the browser with a small local API, and no AI key is needed.

## Run it

You need Node 24 or newer, and Chrome or Edge for the browser checks.

```
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if `npm` is blocked. Open the URL it prints and choose Dr Sobri on the sign-in screen for the full lecturer workflow, or press **Play demo** there for the self-driving tour (about six minutes).

`npm run dev` also starts the local API, which live job-board collection and file parsing need. Copy `.env.example` to `.env` only if you want the optional model features, and never commit `.env`.

## Check your work

```
npm run typecheck
npm run prove:all     # 166 checks today
npm run build
npm run smoke         # the full demo tour in a headless browser
```

More browser checks: `npm run smoke:integrity`, `npm run smoke:workspace`, `npm run smoke:curriculum` (run `npm run build` first).

## Read these first

| file | what it is |
|:--|:--|
| [FEEDBACK.md](FEEDBACK.md) | what the organizer said, what's done and what's open, on one page |
| [docs/lyceum-improvement-plan.md](docs/lyceum-improvement-plan.md) | the master plan: Section 29 is the review, Section 18 the work packages (W14 to W17 are the newest) |
| [docs/lyceum-v3-as-built-2026-10-09.md](docs/lyceum-v3-as-built-2026-10-09.md) | what is built and verified, with the 11 October addendum |
| [DECISIONS.md](DECISIONS.md) | why things are the way they are |
| [docs/presentation/lyceum-brief.pdf](docs/presentation/lyceum-brief.pdf) | a three-page summary of the idea and the review |
| [docs/research/pain-and-market-2026-10-11.md](docs/research/pain-and-market-2026-10-11.md) | the problem and the market, with sources |
| [docs/lecturer-guide.md](docs/lecturer-guide.md) | how each screen is used |
| [JUDGES.md](JUDGES.md) | the five-minute walkthrough |

## Where the code is

```
src/
  ui/screens/     one file per screen (Evidence, Studio, How it works, Evaluation, Landing, ...)
  ui/primitives/  shared components
  app/            the store, roles, the journey, the run timeline
  lib/            the deterministic core: evidence maths, collection, curriculum checks, slides, benchmark
  data/           seed data, sourced figures, the labelled scan benchmark
  demo/           the self-driving demo
  prove-*.ts      the automated checks
server/           the local API: file parsing, job-board collection, optional model streaming
scripts/          browser smokes, screenshot and document generators
docs/             plan, as-built, research, presentation material, history
```

## How we work

We work swarm style: everyone builds in their own branches, and Hafiz consolidates.

- `main` is Hafiz's. Don't push to it; it moves when work is consolidated.
- Branch from `main` and name the branch after yourself and the work, for example `aina/mascot-art`. Push as often as you like. Nothing in a branch can break `main`, so experiment freely.
- Overlap is fine. If two people try the same thing, the better version wins, or the best parts of both.
- When something is worth a look, open a pull request into `main` and fill in the template. Hafiz reviews it and takes what helps into `main`, sometimes only part of it, then closes the PR. A closed PR is not a rejected idea.
- When `main` moves, merge it into your branch before you carry on.
- Good places to start: the open work in [FEEDBACK.md](FEEDBACK.md).

Ground rules:

- No secrets, keys or personal data in the repo. `.env` is ignored for a reason.
- Keep claims honest. Synthetic data is labelled synthetic, numbers come with their source, and anything not built yet is called planned.
- Keep the checks green on your branch, or say in the PR what is broken.
- One idea per branch keeps review quick.
