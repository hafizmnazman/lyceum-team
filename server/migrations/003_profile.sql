-- What a person tells us when they create an account (or in onboarding, for a Google account): where and as what they teach.
ALTER TABLE users ADD COLUMN institution TEXT;
ALTER TABLE users ADD COLUMN job_role TEXT; -- lecturer, coordinator, programme-leader, head-of-department or other
