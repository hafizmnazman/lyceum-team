-- What the helpers do, kept for logs and metrics (docs/database.md). Written only by the Lyceum API.
--   agent_calls      one row per call to the model: who, which helper, the model, tokens, cost, time, how it ended, and
--                    (for 30 days) what was sent and what came back
--   agent_proposals  one row per thing a helper offered the lecturer, and what the lecturer did with it
-- A demo persona has no account: its rows have no user_id, and count as demo.

create table public.agent_calls (
  id                bigint generated always as identity primary key,
  request_id        uuid not null,                      -- one API request; its calls and proposals share it
  at                timestamptz not null default now(),
  helper            text not null,                      -- folio, scout, atlas, lens, quill, prism, sandbox, settings
  route             text not null,                      -- the API route, e.g. /api/agent/items
  user_id           uuid references auth.users (id) on delete set null,
  demo              boolean not null,                   -- true when no account made the call
  subject_id        text,                               -- the course code, when the request named one
  provider          text not null,
  model             text not null,
  prompt_tokens     integer,
  completion_tokens integer,
  cost              numeric,                            -- in US dollars, only when the provider reported it
  duration_ms       integer not null,
  status            text not null check (status in ('ok', 'unreadable', 'timeout', 'error')),
  error             text,
  prompt            jsonb,                              -- the messages sent; cleared after 30 days
  reply             jsonb                               -- what came back; cleared after 30 days
);
create index agent_calls_at on public.agent_calls (at);
create index agent_calls_request on public.agent_calls (request_id);

create table public.agent_proposals (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null,
  at          timestamptz not null default now(),
  helper      text not null,
  kind        text not null,                           -- mapping, quote, revision, item, slide, outcome, topic, posting
  user_id     uuid references auth.users (id) on delete set null,
  demo        boolean not null,
  subject_id  text,
  summary     text not null,                           -- one line a person can read in the dashboard
  payload     jsonb not null,                          -- the proposal as the helper made it
  status      text not null default 'proposed' check (status in ('proposed', 'accepted', 'edited', 'dismissed')),
  reason      text,                                    -- why it was dismissed, when the lecturer said
  decided_at  timestamptz
);
create index agent_proposals_at on public.agent_proposals (at);
create index agent_proposals_user on public.agent_proposals (user_id, at);

alter table public.agent_calls     enable row level security;
alter table public.agent_proposals enable row level security;

-- The metrics, for the dashboard's SQL editor. security_invoker: a view reads as whoever asks, so the publishable key
-- (row-level security, no policies) sees nothing through them either.
create view public.agent_calls_daily with (security_invoker = true) as
select date_trunc('day', at)::date                            as day,
       helper, model, demo,
       count(*)                                               as calls,
       count(*) filter (where status = 'ok')                  as ok,
       count(*) filter (where status = 'unreadable')          as unreadable,
       count(*) filter (where status = 'timeout')             as timeouts,
       count(*) filter (where status = 'error')               as errors,
       round(100.0 * count(*) filter (where status <> 'ok') / count(*), 1) as failure_pct,
       sum(prompt_tokens)                                     as prompt_tokens,
       sum(completion_tokens)                                 as completion_tokens,
       sum(cost)                                              as cost,
       round(avg(duration_ms))                                as avg_ms,
       max(duration_ms)                                       as max_ms
from public.agent_calls
group by 1, 2, 3, 4;

create view public.agent_acceptance with (security_invoker = true) as
select helper, kind, demo,
       count(*)                                               as proposed,
       count(*) filter (where status = 'accepted')            as accepted,
       count(*) filter (where status = 'edited')              as edited,
       count(*) filter (where status = 'dismissed')           as dismissed,
       count(*) filter (where status = 'proposed')            as undecided,
       round(100.0 * count(*) filter (where status in ('accepted', 'edited'))
             / nullif(count(*) filter (where status <> 'proposed'), 0), 1) as taken_pct
from public.agent_proposals
group by 1, 2, 3;
