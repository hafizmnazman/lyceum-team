// Accounts on Supabase. Supabase Auth signs people in and issues access tokens; this file checks the token on each
// request, then serves what only Lyceum knows: the profile (name, institution, role, whether onboarding is finished)
// and the account's workspace, saved in the backup format and checked by the same validator as a restored backup,
// with a version number so two windows cannot silently overwrite each other. Tables: supabase/migrations/.

import type { Context, Hono, MiddlewareHandler } from "hono";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_BACKUP_BYTES,
  parseWorkspaceBackup,
} from "../shared/lib/workspaceBackup.ts";
import { JOB_ROLES, type JobRole } from "../shared/types.ts";
import type { Db } from "./db.ts";

const PENDING_MS = 24 * 60 * 60 * 1000;
export interface User {
  id: string;
  email: string;
  name: string;
  personId: string;
  institution: string;
  jobRole: JobRole | null;
  onboarded: boolean;
}
export class AccountError extends Error {
  status: 400 | 401 | 409 | 413;
  constructor(status: AccountError["status"], message: string) {
    super(message);
    this.status = status;
  }
}

/** What the routes need from Supabase, so the proofs can pass fakes. */
export interface AuthDeps {
  /** The account a bearer token belongs to, or null when the token is missing, forged or expired. */
  verify(token: string): Promise<{ id: string; email: string } | null>;
  /** Delete an account in Supabase Auth; its profile and workspace go with it (ON DELETE CASCADE). */
  deleteUser(id: string): Promise<void>;
}
/** The real thing: Supabase's server client on the secret key. getClaims checks the token's signature against the
 *  project's published keys (cached), or asks Supabase Auth when the project still signs with a shared secret. */
export function supabaseDeps(
  url = process.env.SUPABASE_URL ?? "",
  secretKey = process.env.SUPABASE_SECRET_KEY ?? "",
): AuthDeps {
  // Made on first use, so the API (and the demo) still starts before Supabase is set up in api/.env.
  let client: SupabaseClient | null = null;
  const admin = () => {
    if (!url || !secretKey)
      throw new Error(
        "Set SUPABASE_URL and SUPABASE_SECRET_KEY in api/.env, then restart the API.",
      );
    return (client ??= createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }));
  };
  return {
    async verify(token) {
      const { data, error } = await admin().auth.getClaims(token);
      if (error || !data || typeof data.claims.sub !== "string") return null;
      return {
        id: data.claims.sub,
        email: typeof data.claims.email === "string" ? data.claims.email : "",
      };
    },
    async deleteUser(id) {
      const { error } = await admin().auth.admin.deleteUser(id);
      if (error) throw error;
    },
  };
}

type Row = Record<string, unknown>;
const iso = (v: unknown) =>
  v instanceof Date ? v.toISOString() : String(v ?? "");
const toUser = (row: Row, email: string): User => ({
  id: String(row.id),
  email,
  name: String(row.name ?? ""),
  personId: "U-" + String(row.id).slice(0, 8),
  institution: typeof row.institution === "string" ? row.institution : "",
  jobRole: JOB_ROLES.includes(row.job_role as JobRole)
    ? (row.job_role as JobRole)
    : null,
  onboarded: row.onboarded_at != null,
});
export function profileError(input: {
  name?: string;
  institution?: string;
  jobRole?: string;
}): string | null {
  if (
    input.name !== undefined &&
    (!input.name.trim() || input.name.trim().length > 100)
  )
    return "Enter your name, up to 100 characters.";
  if (
    input.institution !== undefined &&
    (!input.institution.trim() || input.institution.trim().length > 200)
  )
    return "Enter your institution, up to 200 characters.";
  if (
    input.jobRole !== undefined &&
    !JOB_ROLES.includes(input.jobRole as JobRole)
  )
    return "Choose your role.";
  return null;
}

export class AccountStore {
  private db: Db;
  private deps: AuthDeps;
  private now: () => number;
  constructor(db: Db, deps: AuthDeps, now: () => number = Date.now) {
    this.db = db;
    this.deps = deps;
    this.now = now;
  }
  /** The profile the sign-up trigger made; created here as well if the trigger was missing when the account was made. */
  async user(id: string, email: string): Promise<User> {
    const found = (
      await this.db.query("SELECT * FROM profiles WHERE id = $1", [id])
    ).rows[0];
    if (found) return toUser(found, email);
    const made = (
      await this.db.query(
        "INSERT INTO profiles (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id RETURNING *",
        [id, email.split("@")[0].slice(0, 100)],
      )
    ).rows[0];
    return toUser(made, email);
  }
  async updateProfile(
    user: User,
    input: { name?: string; institution?: string; jobRole?: string },
  ): Promise<User> {
    const error = profileError(input);
    if (error) throw new AccountError(400, error);
    await this.db.query(
      "UPDATE profiles SET name = COALESCE($1, name), institution = COALESCE($2, institution), job_role = COALESCE($3, job_role) WHERE id = $4",
      [
        input.name?.trim() ?? null,
        input.institution?.trim() ?? null,
        input.jobRole ?? null,
        user.id,
      ],
    );
    return this.user(user.id, user.email);
  }
  async markOnboarded(user: User): Promise<User> {
    await this.db.query(
      "UPDATE profiles SET onboarded_at = COALESCE(onboarded_at, $1) WHERE id = $2",
      [new Date(this.now()), user.id],
    );
    return this.user(user.id, user.email);
  }
  /** Delete the account if onboarding was never finished; true when it was. */
  async cancelIfPending(user: User): Promise<boolean> {
    if (user.onboarded) return false;
    await this.deps.deleteUser(user.id);
    return true;
  }
  /** Sign-ups left unfinished for a day are deleted, as before. Run at start-up and then hourly. */
  async purgePending(): Promise<number> {
    const stale = (
      await this.db.query(
        "SELECT id FROM profiles WHERE onboarded_at IS NULL AND created_at < $1",
        [new Date(this.now() - PENDING_MS)],
      )
    ).rows;
    for (const row of stale) await this.deps.deleteUser(String(row.id));
    return stale.length;
  }
  async getWorkspace(
    userId: string,
  ): Promise<{ backup: string; version: number; updatedAt: string } | null> {
    const row = (
      await this.db.query(
        "SELECT backup, version, updated_at FROM workspaces WHERE user_id = $1",
        [userId],
      )
    ).rows[0];
    return row
      ? {
          backup: JSON.stringify(row.backup),
          version: Number(row.version),
          updatedAt: iso(row.updated_at),
        }
      : null;
  }
  /** Save only over the version the client last saw; the check and the write are one statement. */
  async putWorkspace(
    user: User,
    backup: string,
    expectedVersion: number,
  ): Promise<{ version: number; updatedAt: string }> {
    if (Buffer.byteLength(backup) > MAX_BACKUP_BYTES)
      throw new AccountError(
        413,
        "The workspace is larger than " + MAX_BACKUP_BYTES / 1048576 + " MB.",
      );
    const parsed = parseWorkspaceBackup(backup, [user.personId]);
    if (!parsed.ok)
      throw new AccountError(
        400,
        "The workspace did not pass validation: " + parsed.error,
      );
    const at = new Date(this.now());
    const saved =
      expectedVersion === 0
        ? await this.db.query(
            "INSERT INTO workspaces (user_id, backup, version, updated_at) VALUES ($1, $2, 1, $3) ON CONFLICT (user_id) DO NOTHING RETURNING version",
            [user.id, backup, at],
          )
        : await this.db.query(
            "UPDATE workspaces SET backup = $1, version = version + 1, updated_at = $2 WHERE user_id = $3 AND version = $4 RETURNING version",
            [backup, at, user.id, expectedVersion],
          );
    if (!saved.rows.length)
      throw new AccountError(
        409,
        "This workspace was saved from another window.",
      );
    return {
      version: Number(saved.rows[0].version),
      updatedAt: at.toISOString(),
    };
  }
}

const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  personId: u.personId,
  institution: u.institution,
  jobRole: u.jobRole,
  onboarded: u.onboarded,
});
const bearer = (c: Context) =>
  c.req.header("authorization")?.match(/^Bearer (.+)$/)?.[1];

/** Who a request is from, by its Supabase token; null when it carries none, or a forged or expired one. */
export const signedInAs = (c: Context, deps: AuthDeps) => {
  const token = bearer(c);
  return token ? deps.verify(token) : Promise.resolve(null);
};

/** Middleware for any route that needs a signed-in person, such as the model routes once Lyceum is online. */
export const requireUser =
  (deps: AuthDeps): MiddlewareHandler =>
  async (c, next) => {
    const token = bearer(c);
    if (!token || !(await deps.verify(token)))
      return c.json({ error: "Sign in first." }, 401);
    await next();
  };

/** The account routes: who am I, the profile, onboarding, cancelling a sign-up, and the workspace. */
export function accountRoutes(app: Hono, store: AccountStore, deps: AuthDeps) {
  const signedIn = async (c: Context) => {
    const token = bearer(c);
    const who = token ? await deps.verify(token) : null;
    if (!who) throw new AccountError(401, "Sign in first.");
    return store.user(who.id, who.email);
  };
  const body = async (c: Context) => {
    try {
      return (await c.req.json()) as Record<string, unknown>;
    } catch {
      throw new AccountError(400, "Send JSON.");
    }
  };
  const opt = (v: unknown) => (typeof v === "string" ? v : undefined);
  const route =
    (fn: (c: Context) => Promise<Response>) => async (c: Context) => {
      try {
        return await fn(c);
      } catch (err) {
        if (err instanceof AccountError)
          return c.json({ error: err.message }, err.status);
        console.error("account route failed:", err);
        return c.json({ error: "Something went wrong. Try again." }, 500);
      }
    };

  app.get(
    "/api/me",
    route(async (c) => {
      const token = bearer(c),
        who = token ? await deps.verify(token) : null;
      return c.json({
        user: who ? publicUser(await store.user(who.id, who.email)) : null,
      });
    }),
  );
  app.patch(
    "/api/me",
    route(async (c) => {
      const user = await signedIn(c),
        b = await body(c);
      return c.json({
        user: publicUser(
          await store.updateProfile(user, {
            name: opt(b.name),
            institution: opt(b.institution),
            jobRole: opt(b.jobRole),
          }),
        ),
      });
    }),
  );
  app.post(
    "/api/me/onboarded",
    route(async (c) =>
      c.json({
        user: publicUser(await store.markOnboarded(await signedIn(c))),
      }),
    ),
  );
  app.post(
    "/api/me/cancel",
    route(async (c) =>
      c.json({ deleted: await store.cancelIfPending(await signedIn(c)) }),
    ),
  );

  app.get(
    "/api/workspace",
    route(async (c) =>
      c.json({ workspace: await store.getWorkspace((await signedIn(c)).id) }),
    ),
  );
  app.put(
    "/api/workspace",
    route(async (c) => {
      const user = await signedIn(c),
        b = await body(c);
      if (typeof b.backup !== "string" || typeof b.version !== "number")
        throw new AccountError(
          400,
          "Send the workspace backup and the version it was based on.",
        );
      try {
        return c.json(await store.putWorkspace(user, b.backup, b.version));
      } catch (err) {
        if (err instanceof AccountError && err.status === 409)
          return c.json(
            {
              error: err.message,
              version: (await store.getWorkspace(user.id))?.version ?? 0,
            },
            409,
          );
        throw err;
      }
    }),
  );
}
