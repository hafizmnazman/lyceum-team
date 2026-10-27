-- Sign in with Google (docs/GOOGLE_AUTH_PORTABLE.md): an account is keyed on Google's stable sub, never on its email.
ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN last_login_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id);
