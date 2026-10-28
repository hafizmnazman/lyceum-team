// Loads api/.env (or LYCEUM_ENV_FILE) into process.env. index.ts and db-migrate.ts import this file FIRST: imports run
// before a module's own code, so loading .env in index.ts's body came too late for settings other modules read as they
// load (DATABASE_URL in db.ts), and those silently fell back to their defaults. A missing .env is fine: fixture mode,
// local defaults. The path is this folder's, so the API reads the same file from the repo root or from api/.
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile?.(process.env.LYCEUM_ENV_FILE || fileURLToPath(new URL(".env", import.meta.url)));
} catch {
  // no .env
}
