-- Watching on a schedule (server/watch.ts): one schedule per account and course, and the runs it made. A run keeps the
-- postings it found; nothing reaches the workspace until the lecturer opens a run and imports what it wants.
CREATE TABLE watch_schedules (
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id  text NOT NULL,                 -- the course code in the account's workspace
  provider    text NOT NULL CHECK (provider IN ('greenhouse', 'lever', 'agent')),
  board       text NOT NULL,                 -- a board token, or the agent's brief
  query       text NOT NULL DEFAULT '',
  in_text     boolean NOT NULL DEFAULT false,
  every_days  integer NOT NULL CHECK (every_days BETWEEN 1 AND 90),
  next_run_at timestamptz NOT NULL,
  created_at  timestamptz NOT NULL,
  PRIMARY KEY (user_id, subject_id)
);
CREATE INDEX watch_schedules_due ON watch_schedules (next_run_at);

CREATE TABLE watch_runs (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  ran_at     timestamptz NOT NULL,
  provider   text NOT NULL,
  board      text NOT NULL,
  status     text NOT NULL CHECK (status IN ('ok', 'failed')),
  error      text,
  total      integer NOT NULL DEFAULT 0,       -- postings the source returned, before the keyword filter
  postings   jsonb NOT NULL DEFAULT '[]'       -- the postings kept, as CollectedPosting
);
CREATE INDEX watch_runs_course ON watch_runs (user_id, subject_id, ran_at DESC);
