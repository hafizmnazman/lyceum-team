-- Accounts, their sessions (only a hash of each token), each account's workspace, and the sign-in audit log.
CREATE TABLE users (
  id            uuid PRIMARY KEY,
  email         text NOT NULL UNIQUE,          -- kept in lower case
  name          text NOT NULL,
  password      text NOT NULL DEFAULT '',      -- scrypt$N$r$p$salt$hash; empty for an account with no password (Google)
  google_sub    text UNIQUE,                   -- Google's stable account id; an account is keyed on it, never on its email
  institution   text NOT NULL DEFAULT '',
  job_role      text CHECK (job_role IN ('lecturer', 'coordinator', 'programme-leader', 'head-of-department', 'other')),
  created_at    timestamptz NOT NULL,
  last_login_at timestamptz,
  onboarded_at  timestamptz                    -- null while pending: an unfinished sign up, deleted on sign out or after a day
);
CREATE INDEX users_pending ON users (created_at) WHERE onboarded_at IS NULL;

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,                 -- sha256 of the cookie's token; the token itself is never stored
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_id ON sessions (user_id);

CREATE TABLE workspaces (
  user_id    uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  backup     jsonb NOT NULL,                   -- the workspace backup (src/lib/workspaceBackup.ts), validated on every save
  version    integer NOT NULL,                 -- saved only over the version the client last saw
  updated_at timestamptz NOT NULL
);

CREATE TABLE auth_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event      text NOT NULL CHECK (event IN ('signup', 'login', 'login_failed', 'logout')),
  user_id    uuid REFERENCES users (id) ON DELETE SET NULL, -- the history survives a deleted account
  email      text,
  reason     text,                             -- why a sign in failed, or why a sign out deleted the account
  method     text,                             -- password or google
  ip         text,
  user_agent text,
  created_at timestamptz NOT NULL
);
CREATE INDEX auth_events_created_at ON auth_events (created_at DESC);
