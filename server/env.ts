// Loads .env into process.env. index.ts imports this file FIRST: imports run before a module's own code, so loading .env
// in index.ts's body came too late for settings other modules read as they load (DATABASE_URL in db.ts, LYCEUM_MODEL in
// llm.ts), and those silently fell back to their defaults. A missing .env is fine: fixture mode, local defaults.
try {
  process.loadEnvFile?.();
} catch {
  // no .env
}
