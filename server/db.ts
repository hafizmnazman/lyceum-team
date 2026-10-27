// The local database: SQLite through node:sqlite (built into Node 24), one file at data/lyceum.db, its schema in numbered
// files in server/migrations/. Each runs once, in order, inside a transaction, and is recorded in schema_migrations, so a
// database tool (DBeaver, the sqlite3 shell) sees the same tables the server does. npm run db:migrate applies them by hand.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DB_PATH = process.env.LYCEUM_DB || "data/lyceum.db";
export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export function openDatabase(path = DB_PATH): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // WAL lets a database tool read while the server writes; foreign keys are per connection in SQLite.
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
}

/** A database made before migrations existed already has what 001 (and maybe 002) create: record them as applied. */
function adoptEarlierDatabase(db: DatabaseSync) {
  const has = (sql: string) => Boolean(db.prepare(sql).get());
  if (has("SELECT 1 FROM schema_migrations") || !has("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'")) return;
  const at = new Date().toISOString(), mark = db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)");
  mark.run("001_init", at);
  const columns = (db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>).map((c) => c.name);
  if (columns.includes("google_sub")) mark.run("002_google_sign_in", at);
}

/** Apply every migration not yet recorded, in file order. Returns the ones applied now. */
export function migrate(db: DatabaseSync, dir = MIGRATIONS_DIR): string[] {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  adoptEarlierDatabase(db);
  const done = new Set((db.prepare("SELECT id FROM schema_migrations").all() as Array<{ id: string }>).map((r) => r.id));
  const applied: string[] = [];
  for (const file of readdirSync(dir).filter((f) => /^\d{3}_[\w-]+\.sql$/.test(f)).sort()) {
    const id = file.replace(/\.sql$/, "");
    if (done.has(id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(readFileSync(join(dir, file), "utf8"));
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(id, new Date().toISOString());
      db.exec("COMMIT");
      applied.push(id);
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error("Migration " + file + " failed and was rolled back: " + (err instanceof Error ? err.message : String(err)));
    }
  }
  return applied;
}
