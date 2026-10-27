// npm run db:migrate: apply the pending migrations to data/lyceum.db (or LYCEUM_DB) and print what the database holds.
import { DB_PATH, openDatabase } from "./db.ts";

const db = openDatabase();
const applied = db.prepare("SELECT id, applied_at FROM schema_migrations ORDER BY id").all() as Array<{ id: string; applied_at: string }>;
console.log("Database: " + DB_PATH);
for (const m of applied) console.log("  applied  " + m.id + "  " + m.applied_at);
const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>).map((t) => t.name);
for (const t of tables) console.log("  table    " + t + " (" + (db.prepare("SELECT COUNT(*) AS n FROM " + t).get() as { n: number }).n + " rows)");
db.close();
