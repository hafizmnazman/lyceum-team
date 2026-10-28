// Where someone stands in their institution, asked at sign up. Its own file so the server can import it without
// pulling in the browser's Supabase client.
export const JOB_ROLES = [
  "lecturer",
  "coordinator",
  "programme-leader",
  "head-of-department",
  "other",
] as const;
export type JobRole = (typeof JOB_ROLES)[number];
export const JOB_ROLE_LABEL: Record<JobRole, string> = {
  lecturer: "Lecturer",
  coordinator: "Course coordinator",
  "programme-leader": "Programme leader",
  "head-of-department": "Head of department",
  other: "Other",
};
