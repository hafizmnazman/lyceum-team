# The local database

Accounts, sessions, each account's workspace and the sign-in audit log live in PostgreSQL. The demo personas never touch
it: their work stays in the browser, and Lyceum runs without the database (the account routes then answer that it is not
reachable, and everything else works).

## Starting it

`npm start` starts everything at once: PostgreSQL and SearXNG in Docker (waiting until both are up), then the web app and
the API. Or step by step:

```bash
npm run db:up          # PostgreSQL 17 in Docker, on localhost:5432 only, waits until it is ready
npm run db:migrate     # optional: the API applies migrations itself when it starts; this prints each table and its rows
npm run dev            # the API connects to DATABASE_URL (.env), postgres://lyceum:lyceum@localhost:5432/lyceum by default
npm run services:down  # stops it (and SearXNG); the data stays in the lyceum-pgdata Docker volume
```

Docker must be reachable from WSL: in Docker Desktop, **Settings > Resources > WSL integration**, turn on your distro.
If something else already uses port 5432 (a Postgres installed on Windows), stop it or change the port in
`docker-compose.yml` and `DATABASE_URL` together.

To start over with an empty database: `docker compose down -v` (the `-v` deletes the volume), then `npm run db:up`.

## Schema and migrations

The schema is the numbered files in `server/migrations/`. Each runs once, in order, in a transaction, recorded in the
`schema_migrations` table, under an advisory lock so two servers starting together never run one twice. To change the
schema, add the next file (`002_what_it_does.sql`); never edit one that has already run.

| Table | Holds |
|:--|:--|
| `users` | One row per account: email (lower case), name, scrypt password hash (empty for a Google account), Google's `google_sub`, institution, role, and `onboarded_at`, empty while the sign up is unfinished |
| `sessions` | One row per signed-in browser: the SHA-256 of its cookie token (never the token), the account and the expiry |
| `workspaces` | One row per account: its workspace as JSON (`jsonb`), and a version number that stops two windows saving over each other |
| `auth_events` | Every sign up, sign in, failed sign in and sign out, with the method, the reason, the IP and the browser |
| `watch_schedules` | One row per account and course being watched: the board or agent brief, keywords, every how many days, and the next run (`server/watch.ts`) |
| `watch_runs` | Each scheduled run: when, the source, ok or failed with the error, the source's total and the postings kept (`jsonb`); the last 10 per course are kept |
| `schema_migrations` | Which migration files have run, and when |

An account whose onboarding is unfinished (`onboarded_at` empty) is deleted when its owner signs out or cancels, and one
left for a day is deleted when the API next starts.

## Opening it in DBeaver

1. **Database > New Database Connection > PostgreSQL > Next.**
2. **Host** `localhost`, **Port** `5432`, **Database** `lyceum`, **Username** `lyceum`, **Password** `lyceum` (or what you
   set in `.env`). Tick **Save password**.
3. **Test Connection**; let DBeaver download the PostgreSQL driver when it asks. Then **Finish**.
4. The tables are under **lyceum > Databases > lyceum > Schemas > public > Tables**. Press **F5** to see new rows.

DBeaver on Windows reaches `localhost:5432` inside WSL through WSL's port forwarding, so no extra setup is needed. Editing
rows by hand while the API runs can sign a browser out or make its next save conflict; read-only is the safe default
(**Edit Connection > General > Read-only connection**).

## The proofs

`npm run prove:auth` needs no server: it runs on PGlite, PostgreSQL compiled to run inside Node, a fresh database per test.
