// The browser's side of accounts. Supabase Auth signs people up and in (email and password, or Google) and keeps the
// session; every call to Lyceum's own API carries that session's access token, which the API checks (server/account.ts).
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.ts";

import type { JobRole } from "./jobRoles.ts";
export { JOB_ROLES, JOB_ROLE_LABEL, type JobRole } from "./jobRoles.ts";
export interface AccountUser {
  id: string;
  email: string;
  name: string;
  personId: string;
  institution: string;
  jobRole: JobRole | null;
  onboarded: boolean;
}
type Result<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string; status?: number };

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  keepalive = false,
): Promise<Result<T>> {
  try {
    const {
      data: { session },
    } = await supabase().auth.getSession(); // throws, and is answered below, if .env lacks Supabase
    const headers: Record<string, string> = {};
    if (session) headers.authorization = "Bearer " + session.access_token;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(path, {
      method,
      keepalive,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as
      | (T & { error?: string })
      | null;
    if (!res.ok || !data)
      return {
        ok: false,
        status: res.status,
        error:
          data?.error ??
          (res.status === 404
            ? "The local API is not running. Start it with npm run dev."
            : "HTTP " + res.status),
      };
    return { ok: true, ...data };
  } catch (err) {
    return {
      ok: false,
      error:
        missingConfig(err) ??
        "The local API is not reachable. Start it with npm run dev.",
    };
  }
}
/** The message when .env lacks Supabase's settings, so the demo keeps working and the account form says what to set. */
const missingConfig = (err: unknown) =>
  err instanceof Error && err.message.startsWith("Set VITE_SUPABASE")
    ? err.message
    : null;
/** Runs a sign-in step, turning a thrown error (such as missing settings) into a message on the form. */
async function guard<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (err) {
    return {
      ok: false,
      error:
        missingConfig(err) ??
        (err instanceof Error ? err.message : String(err)),
    };
  }
}
const failed = (error: { message: string }) => ({
  ok: false as const,
  error: error.message,
});
/** Where Supabase sends people back to after Google: the app's root; the hash route is restored after. */
const home = () => window.location.origin + "/";

/** Who is signed in, as Lyceum knows them (the profile the API keeps beside the Supabase account). */
export const whoAmI = () =>
  call<{ user: AccountUser | null }>("GET", "/api/me");
async function signedInUser(): Promise<Result<{ user: AccountUser }>> {
  const me = await whoAmI();
  if (!me.ok) return me;
  return me.user
    ? { ok: true, user: me.user }
    : {
        ok: false,
        error: "Signed in, but Lyceum could not load your profile. Try again.",
      };
}

/** Sign up. Confirm email is off (no email is ever sent), so Supabase signs the person in straight away. */
export const signUp = (input: {
  name: string;
  email: string;
  password: string;
  institution: string;
  jobRole: string;
}) =>
  guard<{ user: AccountUser }>(async () => {
    const { data, error } = await supabase().auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          name: input.name.trim(),
          institution: input.institution.trim(),
          job_role: input.jobRole,
        },
      },
    });
    if (error) return failed(error);
    // Only happens if Confirm email was left on in Supabase: say how to fix it rather than waiting for an email.
    if (!data.session)
      return {
        ok: false,
        error:
          "The account was made, but Supabase did not sign you in. Turn off Confirm email in Supabase (Authentication, Email provider).",
      };
    return signedInUser();
  });
export const signIn = (email: string, password: string) =>
  guard<{ user: AccountUser }>(async () => {
    const { error } = await supabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? failed(error) : signedInUser();
  });
/** Leaves the page for Google; the person comes back to home() signed in, or with ?error_description= if it failed. */
export const signInWithGoogle = () =>
  guard<object>(async () => {
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: home() },
    });
    return error ? failed(error) : { ok: true };
  });
export const signOut = () =>
  guard<object>(async () => {
    const { error } = await supabase().auth.signOut();
    return error ? failed(error) : { ok: true };
  });
/** True when Supabase holds a session in this browser (signed in, whether or not Lyceum has opened the account yet). */
export async function hasSession(): Promise<boolean> {
  try {
    return Boolean((await supabase().auth.getSession()).data.session);
  } catch {
    return false;
  }
}
/** Supabase's sign-in events. Keep the callback quick and synchronous: start other Supabase calls with setTimeout. */
export function onAuthChange(fn: (event: AuthChangeEvent) => void): () => void {
  try {
    const { data } = supabase().auth.onAuthStateChange((event) => fn(event));
    return () => data.subscription.unsubscribe();
  } catch {
    return () => undefined; // no Supabase settings: the demo runs without accounts
  }
}

export const updateProfile = (input: {
  name?: string;
  institution?: string;
  jobRole?: string;
}) => call<{ user: AccountUser }>("PATCH", "/api/me", input);
/** Onboarding is finished: from now on the account counts. */
export const markOnboarded = () =>
  call<{ user: AccountUser }>("POST", "/api/me/onboarded", {});
/** Cancel an unfinished sign-up: the API deletes the account if onboarding was never finished. */
export const cancelSignUp = () =>
  call<{ deleted: boolean }>("POST", "/api/me/cancel", {});
export const loadWorkspace = () =>
  call<{
    workspace: { backup: string; version: number; updatedAt: string } | null;
  }>("GET", "/api/workspace");
/** A save keeps going while the page closes when it is small enough for the browser to allow (keepalive caps a body at 64 kB). */
export const saveWorkspace = (backup: string, version: number) =>
  call<{ version: number; updatedAt: string }>(
    "PUT",
    "/api/workspace",
    { backup, version },
    backup.length < 60000,
  );
