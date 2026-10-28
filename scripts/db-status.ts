// Is the database at DATABASE_URL reachable, and which of supabase/migrations/ has it not applied yet? Read-only: it
// connects the way the API does (TLS checked against supabase/ca.crt), runs SELECT 1, and compares the migration files
// with supabase_migrations.schema_migrations, where the Supabase CLI records each one it applies.
// Prints the pending files and exits 0 when reachable, 1 when not. In GitHub Actions it also writes pending=<count>.
//   node scripts/db-status.ts            (DATABASE_URL from the shell, or api/.env)
import "../api/env.ts";
import { appendFileSync, readdirSync } from "node:fs";
import { DATABASE_URL, MIGRATIONS_DIR, postgresDb } from "../api/db.ts";

const hidden = DATABASE_URL.replace(/:[^:@/]+@/, ":****@");
const db = postgresDb();
try {
  await db.query("SELECT 1");
  const applied = new Set(
    (await db.query<{ version: string }>("SELECT version FROM supabase_migrations.schema_migrations").catch(() => ({ rows: [] }))).rows.map((r) => r.version),
  );
  const pending = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_[\w-]+\.sql$/.test(f)).sort().filter((f) => !applied.has(f.split("_")[0]));
  console.log("Reachable: " + hidden);
  console.log(pending.length ? pending.length + " pending:\n  " + pending.join("\n  ") : "Up to date: every migration in supabase/migrations/ is applied.");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "pending=" + pending.length + "\n");
} catch (err) {
  console.error("Not reachable: " + hidden + "\n  " + (err instanceof Error ? err.message : String(err)));
  process.exitCode = 1;
} finally {
  await db.close();
}
