-- Lyceum on Supabase: one profile and one workspace per account, both owned by Supabase Auth's auth.users.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text not null default '' check (length(name) <= 100),
  institution  text not null default '' check (length(institution) <= 200),
  job_role     text check (job_role in ('lecturer', 'coordinator', 'programme-leader', 'head-of-department', 'other')),
  created_at   timestamptz not null default now(),
  onboarded_at timestamptz                      -- null until onboarding is finished
);
create index profiles_pending on public.profiles (created_at) where onboarded_at is null;

create table public.workspaces (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  backup     jsonb not null,                    -- src/lib/workspaceBackup.ts format, validated by the API
  version    integer not null,
  updated_at timestamptz not null
);

-- Only the Lyceum API (connected as the database owner) reads or writes these tables. With row-level security on and
-- no policies, Supabase's automatic REST API can reach neither, even with the publishable key.
alter table public.profiles   enable row level security;
alter table public.workspaces enable row level security;

-- A profile for every new account, filled from what sign-up sent (email) or what Google returned.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, name, institution, job_role)
  values (
    new.id,
    left(coalesce(nullif(trim(meta->>'name'), ''), nullif(trim(meta->>'full_name'), ''), split_part(new.email, '@', 1)), 100),
    left(coalesce(trim(meta->>'institution'), ''), 200),
    case when meta->>'job_role' in ('lecturer', 'coordinator', 'programme-leader', 'head-of-department', 'other') then meta->>'job_role' end
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();