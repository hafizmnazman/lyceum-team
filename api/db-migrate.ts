// npm run db:migrate: apply the pending migrations to DATABASE_URL and print what the database holds.
import { DATABASE_URL, migrate, postgresDb } from "./db.ts";

const db = postgresDb();
try {
  const now = await migrate(db);
  console.log("Database: " + DATABASE_URL.replace(/:[^:@/]+@/, ":****@") + (now.length ? "  (applied now: " + now.join(", ") + ")" : "  (up to date)"));
  for (const m of (await db.query<{ id: string; applied_at: Date }>("SELECT id, applied_at FROM schema_migrations ORDER BY id")).rows) console.log("  applied  " + m.id + "  " + m.applied_at.toISOString());
  for (const t of (await db.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")).rows) {
    const n = (await db.query<{ n: string }>('SELECT COUNT(*) AS n FROM "' + t.table_name + '"')).rows[0].n;
    console.log("  table    " + t.table_name + " (" + n + " rows)");
  }
} catch (err) {
  console.error("Could not reach the database at " + DATABASE_URL.replace(/:[^:@/]+@/, ":****@") + ": " + (err instanceof Error ? err.message : err) + "\nStart it with npm run db:up (docs/database.md).");
  process.exitCode = 1;
} finally {
  await db.close();
}
