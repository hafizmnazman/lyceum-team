// The database: PostgreSQL, through pg in the app (DATABASE_URL, docker-compose.yml runs one on localhost:5432) and through
// PGlite, Postgres compiled to run in-process, in the proofs. Both sit behind one small interface. The schema is the
// numbered files in server/migrations/: each runs once, in order, in a transaction, recorded in schema_migrations, under
// an advisory lock so two servers starting together do not run one twice. npm run db:migrate applies them by hand.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const DATABASE_URL = process.env.DATABASE_URL || "postgres://lyceum:lyceum@localhost:5432/lyceum";
export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[]; count: number }>;
  /** Several statements at once, no parameters: a migration file. */
  exec(sql: string): Promise<void>;
  /** Run fn inside one transaction: committed when it returns, rolled back when it throws. Inside it, tx runs on the same one. */
  tx<R>(fn: (db: Db) => Promise<R>): Promise<R>;
  close(): Promise<void>;
}

type Result = { rows: unknown[]; rowCount?: number | null; affectedRows?: number };
type Queryable = { query: (sql: string, params?: unknown[]) => Promise<Result>; exec?: (sql: string) => Promise<unknown> };
/** One connection (or a transaction on one) as a Db; within it a nested tx simply joins it. */
function onConnection(q: Queryable): Db {
  const db: Db = {
    async query<T>(sql: string, params?: unknown[]) {
      const r = await q.query(sql, params);
      return { rows: r.rows as T[], count: r.rowCount ?? r.affectedRows ?? 0 };
    },
    // pg runs a parameterless query as a simple query, which takes several statements; PGlite has exec for that.
    async exec(sql) { if (q.exec) await q.exec(sql); else await q.query(sql); },
    tx: (fn) => fn(db),
    close: async () => undefined,
  };
  return db;
}

/** A pool on a Postgres server. */
export function postgresDb(url = DATABASE_URL): Db {
  const pool = new pg.Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 5000 });
  pool.on("error", (err) => console.error("postgres pool:", err.message)); // an idle client dropped by the server
  const onPool = onConnection(pool);
  return {
    query: onPool.query,
    exec: onPool.exec,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn(onConnection(client));
        await client.query("COMMIT");
        return out;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

/** Postgres in this process (PGlite), for the proofs: no server, a fresh database each time. */
export async function memoryDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const lite = new PGlite();
  const base = onConnection(lite as unknown as Queryable);
  return {
    ...base,
    tx: (fn) => lite.transaction((t) => fn(onConnection(t as unknown as Queryable))),
    close: () => lite.close(),
  };
}

/** Apply every migration not yet recorded, in file order. Returns the ones applied now. */
export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  await db.query("CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const files = readdirSync(dir).filter((f) => /^\d{3}_[\w-]+\.sql$/.test(f)).sort();
  const applied: string[] = [];
  for (const file of files) {
    const id = file.replace(/\.sql$/, "");
    await db.tx(async (t) => {
      await t.query("SELECT pg_advisory_xact_lock(7203913)"); // Lyceum's migrations, one runner at a time
      if ((await t.query("SELECT 1 FROM schema_migrations WHERE id = $1", [id])).rows.length) return;
      try {
        await t.exec(readFileSync(join(dir, file), "utf8"));
      } catch (err) {
        throw new Error("Migration " + file + " failed and was rolled back: " + (err instanceof Error ? err.message : String(err)));
      }
      await t.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
      applied.push(id);
    });
  }
  return applied;
}
