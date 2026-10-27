-- Accounts, their sessions (only a hash of each token), each account's workspace in the backup format, and the audit log.
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,        -- a random UUID
  email      TEXT NOT NULL UNIQUE,    -- kept in lower case
  name       TEXT NOT NULL,
  password   TEXT NOT NULL,           -- scrypt$N$r$p$salt$hash; the empty string for an account with no password
  created_at TEXT NOT NULL            -- ISO 8601
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,        -- sha256 of the cookie's token; the token itself is never stored
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL         -- milliseconds since 1970
);
CREATE TABLE IF NOT EXISTS workspaces (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  backup     TEXT NOT NULL,           -- the workspace backup JSON (src/lib/workspaceBackup.ts), validated on every save
  version    INTEGER NOT NULL,        -- saved only over the version the client last saw
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event      TEXT NOT NULL CHECK (event IN ('signup', 'login', 'login_failed', 'logout')),
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL, -- the history survives a deleted account
  email      TEXT,
  reason     TEXT,                    -- login_failed only: password, locked, cancelled, state, exchange, token, email-taken
  method     TEXT,                    -- password or google
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_events_created_at ON auth_events (created_at DESC);
