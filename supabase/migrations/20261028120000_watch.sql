-- Watching on a schedule (api/watch.ts): one schedule per account and course, and the runs it made. A run keeps the
-- postings it found; nothing reaches the workspace until the lecturer opens a run and imports what it wants.
create table public.watch_schedules (
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject_id  text not null,                 -- the course code in the account's workspace
  provider    text not null check (provider in ('greenhouse', 'lever', 'agent')),
  board       text not null,                 -- a board token, or the agent's brief
  query       text not null default '',
  in_text     boolean not null default false,
  every_days  integer not null check (every_days between 1 and 90),
  next_run_at timestamptz not null,
  created_at  timestamptz not null,
  primary key (user_id, subject_id)
);
create index watch_schedules_due on public.watch_schedules (next_run_at);

create table public.watch_runs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  subject_id text not null,
  ran_at     timestamptz not null,
  provider   text not null,
  board      text not null,
  status     text not null check (status in ('ok', 'failed')),
  error      text,
  total      integer not null default 0,       -- postings the source returned, before the keyword filter
  postings   jsonb not null default '[]'       -- the postings kept, as CollectedPosting
);
create index watch_runs_course on public.watch_runs (user_id, subject_id, ran_at desc);

-- Only the Lyceum API reads or writes these, as with profiles and workspaces: row-level security on, no policies.
alter table public.watch_schedules enable row level security;
alter table public.watch_runs      enable row level security;
