-- Uploaded files (api/storage.ts): the original bytes are in Cloudflare R2 under key; this row says whose they are and
-- what they were. One row per account and file content, so the same file uploaded twice is kept once.
create table public.files (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  key        text not null unique,          -- uploads/<owner>/<sha256>.<ext> in the bucket
  name       text not null,                 -- the file's name as uploaded, latest upload wins
  type       text not null,
  size       integer not null,
  sha256     text not null,
  created_at timestamptz not null default now(),
  unique (owner, sha256)
);

-- Only the Lyceum API reads or writes it, as with the other tables: row-level security on, no policies.
alter table public.files enable row level security;
