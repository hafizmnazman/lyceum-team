// The browser's side of real accounts (server/auth.ts): sign up, sign in and out, who is signed in, and the account's
// workspace. The session lives in an HttpOnly cookie the page never reads; every call here sends it with the request.

/** Where someone stands in their institution, asked at sign up (server/migrations/003_profile.sql). */
export const JOB_ROLES = ["lecturer", "coordinator", "programme-leader", "head-of-department", "other"] as const;
export type JobRole = (typeof JOB_ROLES)[number];
export const JOB_ROLE_LABEL: Record<JobRole, string> = {
  lecturer: "Lecturer", coordinator: "Course coordinator", "programme-leader": "Programme leader", "head-of-department": "Head of department", other: "Other",
};
export interface AccountUser { id: string; email: string; name: string; personId: string; institution: string; jobRole: JobRole | null; onboarded: boolean }
type Result<T> = ({ ok: true } & T) | { ok: false; error: string; status?: number };

async function call<T>(method: string, path: string, body?: unknown, keepalive = false): Promise<Result<T>> {
  try {
    const res = await fetch(path, { method, credentials: "same-origin", keepalive, headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !data) return { ok: false, status: res.status, error: data?.error ?? (res.status === 404 ? "The local API is not running. Start it with npm run dev." : "HTTP " + res.status) };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "The local API is not reachable. Start it with npm run dev." };
  }
}

export const authProviders = () => call<{ password: boolean; google: boolean }>("GET", "/api/auth/providers");
/** What the Google callback's ?auth_error= means, in words (docs/GOOGLE_AUTH_PORTABLE.md, section 7). */
export const GOOGLE_ERRORS: Record<string, string> = {
  cancelled: "Google sign-in was cancelled.",
  state: "That sign-in link expired. Please try again.",
  "email-taken": "That Google account's email already has a password account here. Sign in with the password instead.",
  unavailable: "Google sign-in is not set up on this Lyceum server.",
};
export const googleErrorText = (code: string) => GOOGLE_ERRORS[code] ?? "Google sign-in failed. Please try again.";
export const signUp = (input: { name: string; email: string; password: string; institution: string; jobRole: string }) => call<{ user: AccountUser }>("POST", "/api/auth/signup", input);
export const signIn = (email: string, password: string) => call<{ user: AccountUser }>("POST", "/api/auth/login", { email, password });
export const signOut = () => call<{ ok: true }>("POST", "/api/auth/logout", {});
export const whoAmI = () => call<{ user: AccountUser | null }>("GET", "/api/auth/me");
export const updateProfile = (input: { name?: string; institution?: string; jobRole?: string }) => call<{ user: AccountUser }>("PATCH", "/api/auth/me", input);
/** Onboarding is finished: from now on the account counts, and signs in by password. */
export const markOnboarded = () => call<{ user: AccountUser }>("POST", "/api/auth/onboarded", {});
export const loadWorkspace = () => call<{ workspace: { backup: string; version: number; updatedAt: string } | null }>("GET", "/api/workspace");
/** A save keeps going while the page closes when it is small enough for the browser to allow (keepalive caps a body at 64 kB). */
export const saveWorkspace = (backup: string, version: number) =>
  call<{ version: number; updatedAt: string }>("PUT", "/api/workspace", { backup, version }, backup.length < 60000);
