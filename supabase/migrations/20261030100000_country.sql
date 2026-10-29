-- The country a lecturer teaches in (shared/lib/compliance.ts): it picks the rules every helper's prompt carries. Null
-- until the lecturer chooses one, at onboarding or in Settings; the prompts then carry the general rules only.
alter table public.profiles add column country text check (country in ('MY', 'SG', 'GB', 'US', 'EU', 'AU', 'IN', 'OTHER'));
