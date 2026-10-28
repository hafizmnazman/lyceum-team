# The database

Accounts and the database are Supabase. Supabase Auth signs people in (email and password, or Google) and keeps the
`auth.users` table; Lyceum's own tables sit beside it in `public`. The demo personas never touch it: their work stays in
the browser, and Lyceum runs without Supabase set up (the account form then says which settings are missing, and
everything else works).

The browser talks to Supabase only to sign in. Everything else goes through the Lyceum API, which checks the session's
token on each request (`api/account.ts`) and reads and writes the tables as the database owner (`api/db.ts`).

## Settings

| File | Setting | What it is |
|:--|:--|:--|
| `web/.env` | `VITE_SUPABASE_URL` | The project's API URL. Public |
| `web/.env` | `VITE_SUPABASE_PUBLISHABLE_KEY` | The publishable key (`sb_publishable_...`). Public by design |
| `api/.env` | `SUPABASE_URL` | The same URL, for the API |
| `api/.env` | `SUPABASE_SECRET_KEY` | The secret key (`sb_secret_...`). **Secret**: the API only, never in `web/.env`, never with a `VITE_` prefix |
| `api/.env` | `DATABASE_URL` | Postgres connection string. Local default `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Both `.env` files are ignored by Git; copy them from the `.env.example` beside each. Both halves must name the same
project: if they don't, signing in works but the API refuses the token, and the login screen says so.

## Cloud (the shared project)

Values come from the Supabase dashboard:

- **Project Settings > API Keys**: the URL, the publishable key and the secret key.
- **Connect > Session pooler**: the `DATABASE_URL`. Leave `?sslmode=` off the end: TLS is set in code and verified against
  Supabase's certificate, committed at `supabase/ca.crt` (not a secret). A database on this computer gets no TLS.

Put a password containing `#`, `@` or `:` in the URL percent-encoded (`#` is `%23`).

## Local (optional)

The Supabase CLI runs a whole Supabase in Docker. Docker must be reachable from WSL: in Docker Desktop, **Settings >
Resources > WSL integration**, turn on your distro.

```bash
npm run db:up          # supabase start: Postgres on :54322, the API on :54321, Studio on http://localhost:54323
npx supabase status    # prints the URL, the publishable key and the secret key for the two .env files
npm run db:reset       # an empty database with every migration applied (deletes local data)
npm run db:down        # supabase stop; the data is kept for the next db:up
```

Then point `web/.env` and `api/.env` at `http://127.0.0.1:54321` and the keys `supabase status` printed;
`DATABASE_URL`'s default already matches. Local settings (ports, sign-in options) are in `supabase/config.toml`.

## Schema and migrations

The schema is `supabase/migrations/`, one file per change, named `<timestamp>_<what_it_does>.sql`. The Supabase CLI
applies them and records each in `supabase_migrations.schema_migrations`. To change the schema, add a new file
(`npx supabase migration new what_it_does`); never edit one that has already run anywhere.

```bash
npx supabase link --project-ref <project-ref>   # once per machine: which cloud project db:push goes to
npm run db:push                                 # applies new migrations to the cloud project
```

`db:push` changes the shared database for everyone: run it once, when a migration is merged.

| Table | Holds |
|:--|:--|
| `auth.users` | Supabase Auth's accounts: email, password hash or Google identity, and what sign up sent (`raw_user_meta_data`) |
| `profiles` | One row per account, made by a trigger at sign up: name, institution, role, and `onboarded_at`, empty while the sign up is unfinished |
| `workspaces` | One row per account: its workspace as JSON (`jsonb`), and a version number that stops two windows saving over each other |
| `watch_schedules` | One row per account and course being watched: the board or agent brief, keywords, every how many days, and the next run (`api/watch.ts`) |
| `watch_runs` | Each scheduled run: when, the source, ok or failed with the error, the source's total and the postings kept (`jsonb`); the last 10 per course are kept |

Every Lyceum table belongs to an account in `auth.users` and goes with it when the account is deleted. Row-level security
is on with no policies, so Supabase's automatic REST API cannot read them even with the publishable key; only the API,
connected as the owner, can.

An account whose onboarding is unfinished is deleted when its owner signs out or cancels, and one left for a day is
deleted by the API (at start and then hourly).

## Sign-in settings

- **Confirm email is off**, so sign up signs the person in straight away (no email is sent). In the cloud:
  **Authentication > Sign In / Providers > Email**. Locally: `enable_confirmations = false` in `supabase/config.toml`.
- **Google**: turned on in Supabase, not in Lyceum. In the cloud: **Authentication > Sign In / Providers > Google**, with
  the client ID and secret from Google Cloud Console; Google's redirect URI is the one Supabase shows there. Locally:
  `[auth.external.google]` in `supabase/config.toml`, with the secret in `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`
  (in `supabase/.env` or the shell; never committed).
- **Redirect URLs**: the address people open Lyceum at (`http://localhost:5173` while developing) must be in
  **Authentication > URL Configuration**, or Google's sign in cannot come back. Locally: `site_url` and
  `additional_redirect_urls` in `supabase/config.toml`.
- **Online**: `LYCEUM_REQUIRE_SIGN_IN=1` in `api/.env` limits the model, search, settings and parse routes to signed-in
  people. Off by default, since on a laptop the API answers only that laptop.

## Looking at the data

- **Cloud**: the dashboard's **Table Editor** and **SQL Editor**.
- **Local**: Studio at `http://localhost:54323`.
- **DBeaver** (either): **New Database Connection > PostgreSQL**, with the host, port, database, user and password from
  `DATABASE_URL`. For the cloud, also **SSL > Use SSL** with `supabase/ca.crt` as the CA certificate.

Editing rows by hand while the API runs can sign a browser out or make its next save conflict; read-only is the safe
default (in DBeaver: **Edit Connection > General > Read-only connection**).

## The proofs

The proofs need no Supabase: they run on PGlite, PostgreSQL compiled to run inside Node, a fresh database per test. A
stand-in `auth.users` table is created first (`memoryDb` in `api/db.ts`), then the real `supabase/migrations/` run on it,
so a migration that fails there fails the proofs. `npm run prove:account` covers the account routes and
`npm run prove:watch` the scheduled runs, with Supabase Auth faked.
