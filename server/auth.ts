// Real accounts on the local API: email and password, a session in an HttpOnly cookie, and each account's workspace kept
// on the server so it follows the person to another browser. Stored in PostgreSQL (server/db.ts, schema in server/migrations/). Passwords are hashed with scrypt and a random salt; only a hash of each session token is stored; five wrong
// passwords lock an email for fifteen minutes. A workspace is saved in the backup format and checked by the same
// validator as a restored backup, with a version number so two windows cannot silently overwrite each other.

import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import type { Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { MAX_BACKUP_BYTES, parseWorkspaceBackup } from "../src/lib/workspaceBackup.ts";
import { migrate, type Db } from "./db.ts";
import { JOB_ROLES, type JobRole } from "../src/app/account.ts";

export const SESSION_COOKIE = "lyceum_session";
const SESSION_DAYS = 30, LOCK_AFTER = 5, LOCK_MS = 15 * 60 * 1000, PENDING_MS = 24 * 60 * 60 * 1000;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export interface User { id: string; email: string; name: string; personId: string; createdAt: string; institution: string; jobRole: JobRole | null; onboarded: boolean }
export interface Client { ip: string | null; userAgent: string | null }
export class AuthError extends Error {
  status: 400 | 401 | 403 | 409 | 413 | 429;
  constructor(status: AuthError["status"], message: string) { super(message); this.status = status; }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const scryptAsync = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) =>
  scrypt(password.normalize("NFKC"), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, key) => (err ? reject(err) : resolve(key))));
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), (await scryptAsync(password, salt)).toString("base64")].join("$");
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, , , , salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64"), actual = await scryptAsync(password, Buffer.from(salt, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Where and as what someone teaches: required at sign up, asked in onboarding of a Google account. */
export function profileError(input: { institution?: string; jobRole?: string }): string | null {
  if (input.institution !== undefined && (!input.institution.trim() || input.institution.trim().length > 200)) return "Enter your institution, up to 200 characters.";
  if (input.jobRole !== undefined && !JOB_ROLES.includes(input.jobRole as JobRole)) return "Choose your role.";
  return null;
}
export function signupError(input: { name: string; email: string; password: string; institution?: string; jobRole?: string }): string | null {
  if (!input.name.trim() || input.name.trim().length > 100) return "Enter your name, up to 100 characters.";
  if (!EMAIL.test(normaliseEmail(input.email)) || input.email.length > 254) return "Enter a valid email address.";
  if (input.password.length < 10) return "Use a password of at least 10 characters.";
  if (input.password.length > 200) return "Use a password of at most 200 characters.";
  if (input.password.toLowerCase() === normaliseEmail(input.email)) return "Choose a password that is not your email address.";
  return profileError({ institution: input.institution ?? "", jobRole: input.jobRole ?? "" });
}

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ""));

export class AuthStore {
  private db: Db;
  private fails = new Map<string, { count: number; until: number }>();
  private now: () => number;
  private constructor(db: Db, now: () => number) { this.db = db; this.now = now; }
  /** The store on a database, its migrations applied (server/migrations/) and day-old pending sign ups cleared. */
  static async open(db: Db, now: () => number = Date.now): Promise<AuthStore> {
    await migrate(db);
    const store = new AuthStore(db, now);
    await store.purgePending();
    return store;
  }
  private at = () => new Date(this.now());
  private toUser(row: Row | undefined): User | null {
    return row ? { id: String(row.id), email: String(row.email), name: String(row.name), personId: "U-" + String(row.id).slice(0, 8), createdAt: iso(row.created_at),
      institution: typeof row.institution === "string" ? row.institution : "", jobRole: JOB_ROLES.includes(row.job_role as JobRole) ? (row.job_role as JobRole) : null,
      onboarded: row.onboarded_at != null } : null;
  }
  private async userById(id: string, db: Db = this.db) { return this.toUser((await db.query("SELECT * FROM users WHERE id = $1", [id])).rows[0]); }

  /** One row per sign up, sign in, failed sign in and sign out, kept when the account is deleted. */
  async audit(event: "signup" | "login" | "login_failed" | "logout", details: { userId?: string; email?: string; reason?: string; method?: "password" | "google"; client?: Client } = {}, db: Db = this.db) {
    await db.query("INSERT INTO auth_events (event, user_id, email, reason, method, ip, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [event, details.userId ?? null, details.email ?? null, details.reason ?? null, details.method ?? null, details.client?.ip ?? null, details.client?.userAgent ?? null, this.at()]);
  }
  async auditTrail(): Promise<Row[]> { return (await this.db.query("SELECT event, user_id, email, reason, method FROM auth_events ORDER BY id")).rows; }

  // An account counts once its onboarding is finished (onboarded_at). Until then it is pending: it can save its workspace
  // so a refresh resumes onboarding, but a password sign in does not find it, signing up again with its email replaces
  // it, signing out of it or cancelling deletes it, and one left a day is deleted here. Its sessions and workspace go with
  // it (ON DELETE CASCADE); its audit rows stay, unlinked.
  async purgePending() { await this.db.query("DELETE FROM users WHERE onboarded_at IS NULL AND created_at < $1", [new Date(this.now() - PENDING_MS)]); }
  private async dropPendingEmail(email: string, db: Db = this.db) { await db.query("DELETE FROM users WHERE email = $1 AND onboarded_at IS NULL", [email]); }
  /** Delete the account if it is still pending; true when it was. */
  async deleteIfPending(userId: string): Promise<boolean> { return (await this.db.query("DELETE FROM users WHERE id = $1 AND onboarded_at IS NULL", [userId])).count > 0; }
  async markOnboarded(userId: string): Promise<User> {
    await this.db.query("UPDATE users SET onboarded_at = COALESCE(onboarded_at, $1) WHERE id = $2", [this.at(), userId]);
    return (await this.userById(userId))!;
  }

  /** A verified Google identity: find the account by its sub or create it, start a session and record both, in one
   *  transaction, so a sign in is never saved without its audit row or the reverse. An email that already belongs to a
   *  finished password account is refused rather than linked: linking by email would let whoever registered that email
   *  first, unverified, into the Google user's account. */
  async googleSignIn(claims: { sub: string; email: string; name?: string }, client: Client): Promise<{ user: User; token: string }> {
    const email = normaliseEmail(claims.email);
    return this.db.tx(async (db) => {
      const found = (await db.query("SELECT id FROM users WHERE google_sub = $1", [claims.sub])).rows[0];
      let id: string;
      if (found) {
        id = String(found.id);
        await db.query("UPDATE users SET email = $1, last_login_at = $2 WHERE id = $3", [email, this.at(), id]);
      } else {
        await this.dropPendingEmail(email, db); // a password sign up never finished does not hold the email
        if ((await db.query("SELECT 1 FROM users WHERE email = $1", [email])).rows.length) throw new AuthError(409, "email-taken");
        id = randomUUID();
        const name = (claims.name ?? "").trim().slice(0, 100) || email.split("@")[0];
        await db.query("INSERT INTO users (id, email, name, google_sub, created_at, last_login_at) VALUES ($1, $2, $3, $4, $5, $5)", [id, email, name, claims.sub, this.at()]);
      }
      const user = (await this.userById(id, db))!;
      const token = await this.createSession(user.id, db);
      if (!found) await this.audit("signup", { userId: user.id, email, method: "google", client }, db);
      await this.audit("login", { userId: user.id, email, method: "google", client }, db);
      return { user, token };
    });
  }
  async signup(input: { name: string; email: string; password: string; institution: string; jobRole: string }): Promise<User> {
    const error = signupError(input);
    if (error) throw new AuthError(400, error);
    const email = normaliseEmail(input.email);
    await this.purgePending();
    await this.dropPendingEmail(email); // an earlier sign up with this email that never finished onboarding is replaced
    if ((await this.db.query("SELECT 1 FROM users WHERE email = $1", [email])).rows.length) throw new AuthError(409, "An account with this email already exists. Sign in instead.");
    const id = randomUUID();
    await this.db.query("INSERT INTO users (id, email, name, password, institution, job_role, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, email, input.name.trim(), await hashPassword(input.password), input.institution.trim(), input.jobRole, this.at()]);
    return (await this.userById(id))!;
  }
  async login(emailRaw: string, password: string): Promise<User> {
    const email = normaliseEmail(emailRaw), at = this.now();
    const lock = this.fails.get(email);
    if (lock && lock.until > at) throw new AuthError(429, "Too many wrong passwords. Try again in " + Math.ceil((lock.until - at) / 60000) + " minutes.");
    // Only finished accounts sign in by password; a pending one is answered as if it did not exist.
    const row = (await this.db.query("SELECT * FROM users WHERE email = $1 AND onboarded_at IS NOT NULL", [email])).rows[0];
    // A missing account still pays for one hash, so the answer takes the same time either way.
    const ok = row ? await verifyPassword(password, String(row.password)) : (await hashPassword(password), false);
    if (!ok) {
      // A live lock was refused above, so a lock here is either still counting (until 0) or has run out (start again).
      const count = (lock && lock.until === 0 ? lock.count : 0) + 1;
      this.fails.set(email, { count, until: count >= LOCK_AFTER ? at + LOCK_MS : 0 });
      throw new AuthError(401, "Email or password is incorrect.");
    }
    this.fails.delete(email);
    await this.db.query("UPDATE users SET last_login_at = $1 WHERE id = $2", [this.at(), row.id]);
    return this.toUser(row)!;
  }
  async createSession(userId: string, db: Db = this.db): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await db.query("DELETE FROM sessions WHERE expires_at < $1", [this.at()]);
    await db.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [hashToken(token), userId, new Date(this.now() + SESSION_DAYS * 86400000)]);
    return token;
  }
  async userForSession(token: string | undefined): Promise<User | null> {
    if (!token) return null;
    return this.toUser((await this.db.query("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > $2", [hashToken(token), this.at()])).rows[0]);
  }
  /** End a session and return whose it was, for the audit row. */
  async endSession(token: string | undefined): Promise<User | null> {
    if (!token) return null;
    const user = await this.userForSession(token);
    await this.db.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
    return user;
  }
  /** Change the name, institution or role; a field left out stays as it is. */
  async updateProfile(userId: string, input: { name?: string; institution?: string; jobRole?: string }): Promise<User> {
    if (input.name !== undefined && (!input.name.trim() || input.name.trim().length > 100)) throw new AuthError(400, "Enter your name, up to 100 characters.");
    const error = profileError(input);
    if (error) throw new AuthError(400, error);
    await this.db.query("UPDATE users SET name = COALESCE($1, name), institution = COALESCE($2, institution), job_role = COALESCE($3, job_role) WHERE id = $4",
      [input.name?.trim() ?? null, input.institution?.trim() ?? null, input.jobRole ?? null, userId]);
    return (await this.userById(userId))!;
  }
  async getWorkspace(userId: string): Promise<{ backup: string; version: number; updatedAt: string } | null> {
    const row = (await this.db.query("SELECT backup, version, updated_at FROM workspaces WHERE user_id = $1", [userId])).rows[0];
    return row ? { backup: JSON.stringify(row.backup), version: Number(row.version), updatedAt: iso(row.updated_at) } : null;
  }
  /** Save only over the version the client last saw; anything else is a conflict the client resolves by reloading. The
   *  check and the write are one statement, so two saves at once cannot both pass it. */
  async putWorkspace(user: User, backup: string, expectedVersion: number): Promise<{ version: number; updatedAt: string }> {
    if (Buffer.byteLength(backup) > MAX_BACKUP_BYTES) throw new AuthError(413, "The workspace is larger than " + MAX_BACKUP_BYTES / 1048576 + " MB.");
    const parsed = parseWorkspaceBackup(backup, [user.personId]);
    if (!parsed.ok) throw new AuthError(400, "The workspace did not pass validation: " + parsed.error);
    const at = this.at();
    const saved = expectedVersion === 0
      ? await this.db.query("INSERT INTO workspaces (user_id, backup, version, updated_at) VALUES ($1, $2, 1, $3) ON CONFLICT (user_id) DO NOTHING RETURNING version", [user.id, backup, at])
      : await this.db.query("UPDATE workspaces SET backup = $1, version = version + 1, updated_at = $2 WHERE user_id = $3 AND version = $4 RETURNING version", [backup, at, user.id, expectedVersion]);
    if (!saved.rows.length) throw new AuthError(409, "This workspace was saved from another window.");
    return { version: Number(saved.rows[0].version), updatedAt: at.toISOString() };
  }
}

// ---------- the routes ----------
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, personId: u.personId, institution: u.institution, jobRole: u.jobRole, onboarded: u.onboarded });

// Google sign-in, OpenID Connect's authorization code flow with PKCE (docs/GOOGLE_AUTH_PORTABLE.md, section 2's rules).
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const FLOW_COOKIE = "google_flow", FLOW_PATH = "/api/auth/google", FLOW_SECONDS = 10 * 60;
export type GoogleFailure = "cancelled" | "state" | "exchange" | "token" | "email-taken";
export interface AuthOptions {
  google?: { clientId: string; clientSecret: string } | null; // both from .env; without them the Google button is hidden
  appUrl?: string; // the origin the browser uses; the redirect URI is this plus /api/auth/google/callback
  fetcher?: typeof fetch; // the token endpoint call, replaced in the proofs
}
const b64url = (buf: Buffer) => buf.toString("base64url");
const randomToken = () => b64url(randomBytes(32));
export const pkceChallenge = (verifier: string) => b64url(createHash("sha256").update(verifier).digest());

/** What an account route answers while the database is down; everything else in Lyceum keeps working. */
export const DATABASE_DOWN = "Accounts are unavailable: the database is not reachable. Start it with npm run db:up (docs/database.md).";

/** The account routes. getStore opens the store on first use and is asked again after a failure, so the server starts
 *  without its database and the routes work as soon as it is reachable. */
export function authRoutes(app: Hono, getStore: () => Promise<AuthStore>, options: AuthOptions = {}) {
  const appUrl = (options.appUrl ?? "http://localhost:5173").replace(/\/+$/, "");
  const redirectUri = appUrl + "/api/auth/google/callback";
  const google = options.google?.clientId && options.google.clientSecret ? options.google : null;
  const fetcher = options.fetcher ?? fetch;

  // A request that changes anything must come from this computer's own pages: a page on another site cannot sign in,
  // sign out or save a workspace with the person's cookie (SameSite=Lax already withholds it from cross-site posts).
  app.use("/api/auth/*", originGuard);
  app.use("/api/workspace", originGuard);

  const secure = (c: Context) => new URL(c.req.url).protocol === "https:" || c.req.header("x-forwarded-proto") === "https";
  const client = (c: Context): Client => ({
    ip: c.req.header("x-forwarded-for")?.split(",")[0].trim() || (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming?.socket?.remoteAddress || null,
    userAgent: c.req.header("user-agent")?.slice(0, 500) ?? null,
  });
  const setSession = (c: Context, token: string) =>
    setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: SESSION_DAYS * 86400, secure: secure(c) });
  const body = async (c: Context) => { try { return (await c.req.json()) as Record<string, unknown>; } catch { throw new AuthError(400, "Send JSON."); } };
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const opt = (v: unknown) => (typeof v === "string" ? v : undefined);
  /** Each route: the store (or 503 while the database is down), then its work, every error answered the same way. */
  const route = (fn: (c: Context, store: AuthStore) => Promise<Response>) => async (c: Context) => {
    let store: AuthStore;
    try { store = await getStore(); } catch (err) {
      console.error("database not reachable:", err instanceof Error ? err.message : err);
      return c.json({ error: DATABASE_DOWN }, 503);
    }
    try { return await fn(c, store); } catch (err) {
      if (err instanceof AuthError) return c.json({ error: err.message }, err.status);
      console.error("auth failed:", err);
      return c.json({ error: "Something went wrong. Try again." }, 500);
    }
  };
  const signedIn = async (c: Context, store: AuthStore) => {
    const user = await store.userForSession(getCookie(c, SESSION_COOKIE));
    if (!user) throw new AuthError(401, "Sign in first.");
    return user;
  };

  app.get("/api/auth/providers", (c) => c.json({ password: true, google: Boolean(google) }));

  app.post("/api/auth/signup", route(async (c, store) => {
    const b = await body(c);
    const user = await store.signup({ name: str(b.name), email: str(b.email), password: str(b.password), institution: str(b.institution), jobRole: str(b.jobRole) });
    setSession(c, await store.createSession(user.id));
    await store.audit("signup", { userId: user.id, email: user.email, method: "password", client: client(c) });
    await store.audit("login", { userId: user.id, email: user.email, method: "password", client: client(c) });
    return c.json({ user: publicUser(user) });
  }));
  app.post("/api/auth/login", route(async (c, store) => {
    const b = await body(c), email = str(b.email);
    try {
      const user = await store.login(email, str(b.password));
      setSession(c, await store.createSession(user.id));
      await store.audit("login", { userId: user.id, email: user.email, method: "password", client: client(c) });
      return c.json({ user: publicUser(user) });
    } catch (err) {
      if (err instanceof AuthError && (err.status === 401 || err.status === 429))
        await store.audit("login_failed", { email: normaliseEmail(email).slice(0, 254), reason: err.status === 429 ? "locked" : "password", method: "password", client: client(c) });
      throw err;
    }
  }));
  // Signing out of an account that never finished onboarding, or cancelling the sign up, deletes it.
  app.post("/api/auth/logout", route(async (c, store) => {
    const user = await store.endSession(getCookie(c, SESSION_COOKIE));
    if (user) await store.audit("logout", { userId: user.id, email: user.email, reason: user.onboarded ? undefined : "sign up not finished, account deleted", client: client(c) });
    if (user && !user.onboarded) await store.deleteIfPending(user.id);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  }));
  app.post("/api/auth/onboarded", route(async (c, store) => c.json({ user: publicUser(await store.markOnboarded((await signedIn(c, store)).id)) })));
  app.get("/api/auth/me", route(async (c, store) => {
    const user = await store.userForSession(getCookie(c, SESSION_COOKIE));
    return c.json({ user: user ? publicUser(user) : null });
  }));
  app.patch("/api/auth/me", route(async (c, store) => {
    const user = await signedIn(c, store), b = await body(c);
    return c.json({ user: publicUser(await store.updateProfile(user.id, { name: opt(b.name), institution: opt(b.institution), jobRole: opt(b.jobRole) })) });
  }));

  // 1. Send the browser to Google with a fresh state (against forgery), PKCE verifier and nonce (against replay), all
  //    three in a ten-minute HttpOnly cookie that only the callback's path receives. A real navigation, not a fetch.
  app.get("/api/auth/google", (c) => {
    if (!google) return c.redirect(appUrl + "/?auth_error=unavailable#/login");
    const state = randomToken(), verifier = randomToken(), nonce = randomToken();
    setCookie(c, FLOW_COOKIE, state + "." + verifier + "." + nonce, { httpOnly: true, sameSite: "Lax", path: FLOW_PATH, maxAge: FLOW_SECONDS, secure: secure(c) });
    const url = new URL(GOOGLE_AUTH_URL);
    url.search = new URLSearchParams({ client_id: google.clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile",
      state, nonce, code_challenge: pkceChallenge(verifier), code_challenge_method: "S256", prompt: "select_account" }).toString();
    return c.redirect(url.href);
  });

  // 2. Google sends the browser back with a one-time code. Every failure is recorded and goes back to sign in with a reason.
  //    A navigation, not a fetch, so even a database that is down answers with a redirect and a message, never JSON.
  app.get("/api/auth/google/callback", async (c) => {
    const [state, verifier, nonce] = getCookie(c, FLOW_COOKIE)?.split(".") ?? [];
    deleteCookie(c, FLOW_COOKIE, { path: FLOW_PATH });
    const to = (reason: string) => c.redirect(appUrl + "/?auth_error=" + reason + "#/login");
    if (!google) return to("unavailable");
    let store: AuthStore;
    try { store = await getStore(); } catch { return to("database"); }
    const back = async (reason: GoogleFailure, email?: string) => {
      await store.audit("login_failed", { email, reason, method: "google", client: client(c) }).catch(() => undefined);
      return to(reason);
    };
    const code = c.req.query("code"), returnedState = c.req.query("state");
    if (c.req.query("error")) return back("cancelled");
    if (!code || !state || !verifier || !nonce || returnedState !== state) return back("state");

    // 3. The code for tokens, server to server, with the secret and the verifier. The secret never reaches the browser.
    let idToken: string;
    try {
      const res = await fetcher(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: google.clientId, client_secret: google.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }) });
      if (!res.ok) throw new Error(res.status + " " + (await res.text()).slice(0, 300));
      idToken = String(((await res.json()) as { id_token?: unknown }).id_token ?? "");
      if (!idToken) throw new Error("no id_token");
    } catch (err) {
      console.error("google token exchange failed:", err);
      return back("exchange");
    }

    // 4. The ID token's claims. It came straight from Google's token endpoint over TLS, so (OpenID Connect Core 3.1.3.7)
    //    that stands in for checking its signature. A token from anywhere else would need the signature checked against JWKS.
    let claims: { iss?: string; aud?: string | string[]; exp?: number; nonce?: string; sub?: string; email?: string; email_verified?: boolean; name?: string };
    try { claims = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8")); } catch { return back("token"); }
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const valid = GOOGLE_ISSUERS.includes(claims.iss ?? "") && audience.includes(google.clientId) && typeof claims.exp === "number" && claims.exp * 1000 > Date.now()
      && claims.nonce === nonce && claims.email_verified === true && typeof claims.sub === "string" && claims.sub.length > 0 && typeof claims.email === "string";
    if (!valid) return back("token", typeof claims.email === "string" ? claims.email : undefined);

    // 5. The account, its session and the audit rows in one transaction; the cookie only after it commits.
    try {
      const { token } = await store.googleSignIn({ sub: claims.sub!, email: claims.email!, name: claims.name }, client(c));
      setSession(c, token);
      return c.redirect(appUrl + "/");
    } catch (err) {
      if (err instanceof AuthError && err.message === "email-taken") return back("email-taken", claims.email);
      console.error("google sign in failed:", err);
      return back("token");
    }
  });

  app.get("/api/workspace", route(async (c, store) => c.json({ workspace: await store.getWorkspace((await signedIn(c, store)).id) })));
  app.put("/api/workspace", route(async (c, store) => {
    const user = await signedIn(c, store), b = await body(c);
    if (typeof b.backup !== "string" || typeof b.version !== "number") throw new AuthError(400, "Send the workspace backup and the version it was based on.");
    try {
      return c.json(await store.putWorkspace(user, b.backup, b.version));
    } catch (err) {
      if (err instanceof AuthError && err.status === 409) return c.json({ error: err.message, version: (await store.getWorkspace(user.id))?.version ?? 0 }, 409);
      throw err;
    }
  }));
}

export async function originGuard(c: Context, next: () => Promise<void>) {
  const origin = c.req.header("origin");
  if (c.req.method !== "GET" && origin && !LOCAL_ORIGIN.test(origin)) return c.json({ error: "Requests that change an account must come from this computer's own pages." }, 403);
  await next();
}
