// Real accounts on the local API: email and password, a session in an HttpOnly cookie, and each account's workspace kept
// on the server so it follows the person to another browser. Stored in SQLite (server/db.ts, schema in server/migrations/). Passwords are hashed with scrypt and a random salt; only a hash of each session token is stored; five wrong
// passwords lock an email for fifteen minutes. A workspace is saved in the backup format and checked by the same
// validator as a restored backup, with a version number so two windows cannot silently overwrite each other.

import type { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import type { Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { MAX_BACKUP_BYTES, parseWorkspaceBackup } from "../src/lib/workspaceBackup.ts";
import { DB_PATH, openDatabase } from "./db.ts";
import { JOB_ROLES, type JobRole } from "../src/app/account.ts";

export const SESSION_COOKIE = "lyceum_session";
const SESSION_DAYS = 30, LOCK_AFTER = 5, LOCK_MS = 15 * 60 * 1000;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export interface User { id: string; email: string; name: string; personId: string; createdAt: string; institution: string; jobRole: JobRole | null }
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

export class AuthStore {
  private db: DatabaseSync;
  private fails = new Map<string, { count: number; until: number }>();
  private now: () => number;
  constructor(path = DB_PATH, now: () => number = Date.now) {
    this.now = now;
    // The schema lives in server/migrations/ and is applied, once each, by openDatabase (server/db.ts).
    this.db = openDatabase(path);
  }
  /** One row per sign up, sign in, failed sign in and sign out, kept when the account is deleted. */
  audit(event: "signup" | "login" | "login_failed" | "logout", details: { userId?: string; email?: string; reason?: string; method?: "password" | "google"; client?: Client } = {}) {
    this.db.prepare("INSERT INTO auth_events (event, user_id, email, reason, method, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(event, details.userId ?? null, details.email ?? null, details.reason ?? null, details.method ?? null, details.client?.ip ?? null, details.client?.userAgent ?? null, new Date(this.now()).toISOString());
  }
  auditTrail(): Array<Record<string, unknown>> { return this.db.prepare("SELECT event, user_id, email, reason, method FROM auth_events ORDER BY id").all() as Array<Record<string, unknown>>; }
  /** A verified Google identity: find the account by its sub or create it, start a session and record both, in one
   *  transaction, so a sign in is never saved without its audit row or the reverse. An email that already belongs to a
   *  password account is refused rather than linked: linking by email would let whoever registered that email first,
   *  unverified, into the Google user's account. */
  googleSignIn(claims: { sub: string; email: string; name?: string }, client: Client): { user: User; token: string } {
    const email = normaliseEmail(claims.email), at = new Date(this.now()).toISOString();
    this.db.exec("BEGIN");
    try {
      let row = this.db.prepare("SELECT * FROM users WHERE google_sub = ?").get(claims.sub) as Record<string, unknown> | undefined;
      const inserted = !row;
      if (row) {
        this.db.prepare("UPDATE users SET email = ?, last_login_at = ? WHERE id = ?").run(email, at, String(row.id));
      } else {
        if (this.db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) throw new AuthError(409, "email-taken");
        const id = randomUUID(), name = (claims.name ?? "").trim().slice(0, 100) || email.split("@")[0];
        this.db.prepare("INSERT INTO users (id, email, name, password, created_at, google_sub, last_login_at) VALUES (?, ?, ?, '', ?, ?, ?)").run(id, email, name, at, claims.sub, at);
      }
      row = this.db.prepare("SELECT * FROM users WHERE google_sub = ?").get(claims.sub) as Record<string, unknown>;
      const user = this.toUser(row)!;
      const token = this.createSession(user.id);
      if (inserted) this.audit("signup", { userId: user.id, email, method: "google", client });
      this.audit("login", { userId: user.id, email, method: "google", client });
      this.db.exec("COMMIT");
      return { user, token };
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
  private toUser(row: Record<string, unknown> | undefined): User | null {
    return row ? { id: String(row.id), email: String(row.email), name: String(row.name), personId: "U-" + String(row.id).slice(0, 8), createdAt: String(row.created_at),
      institution: typeof row.institution === "string" ? row.institution : "", jobRole: JOB_ROLES.includes(row.job_role as JobRole) ? (row.job_role as JobRole) : null } : null;
  }
  async signup(input: { name: string; email: string; password: string; institution: string; jobRole: string }): Promise<User> {
    const error = signupError(input);
    if (error) throw new AuthError(400, error);
    const email = normaliseEmail(input.email);
    if (this.db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) throw new AuthError(409, "An account with this email already exists. Sign in instead.");
    const id = randomUUID(), createdAt = new Date(this.now()).toISOString();
    this.db.prepare("INSERT INTO users (id, email, name, password, created_at, institution, job_role) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, email, input.name.trim(), await hashPassword(input.password), createdAt, input.institution.trim(), input.jobRole);
    return this.toUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown>)!;
  }
  async login(emailRaw: string, password: string): Promise<User> {
    const email = normaliseEmail(emailRaw), at = this.now();
    const lock = this.fails.get(email);
    if (lock && lock.until > at) throw new AuthError(429, "Too many wrong passwords. Try again in " + Math.ceil((lock.until - at) / 60000) + " minutes.");
    const row = this.db.prepare("SELECT * FROM users WHERE email = ?").get(email) as Record<string, unknown> | undefined;
    // A missing account still pays for one hash, so the answer takes the same time either way.
    const ok = row ? await verifyPassword(password, String(row.password)) : (await hashPassword(password), false);
    if (!ok) {
      // A live lock was refused above, so a lock here is either still counting (until 0) or has run out (start again).
      const count = (lock && lock.until === 0 ? lock.count : 0) + 1;
      this.fails.set(email, { count, until: count >= LOCK_AFTER ? at + LOCK_MS : 0 });
      throw new AuthError(401, "Email or password is incorrect.");
    }
    this.fails.delete(email);
    return this.toUser(row)!;
  }
  createSession(userId: string): string {
    const token = randomBytes(32).toString("base64url");
    this.db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(this.now());
    this.db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(hashToken(token), userId, this.now() + SESSION_DAYS * 86400000);
    return token;
  }
  userForSession(token: string | undefined): User | null {
    if (!token) return null;
    const row = this.db.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?").get(hashToken(token), this.now()) as Record<string, unknown> | undefined;
    return this.toUser(row);
  }
  /** End a session and return whose it was, for the audit row. */
  endSession(token: string | undefined): User | null {
    if (!token) return null;
    const user = this.userForSession(token);
    this.db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return user;
  }
  /** Change the name, institution or role; a field left out stays as it is. */
  updateProfile(userId: string, input: { name?: string; institution?: string; jobRole?: string }): User {
    if (input.name !== undefined && (!input.name.trim() || input.name.trim().length > 100)) throw new AuthError(400, "Enter your name, up to 100 characters.");
    const error = profileError(input);
    if (error) throw new AuthError(400, error);
    if (input.name !== undefined) this.db.prepare("UPDATE users SET name = ? WHERE id = ?").run(input.name.trim(), userId);
    if (input.institution !== undefined) this.db.prepare("UPDATE users SET institution = ? WHERE id = ?").run(input.institution.trim(), userId);
    if (input.jobRole !== undefined) this.db.prepare("UPDATE users SET job_role = ? WHERE id = ?").run(input.jobRole, userId);
    return this.toUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as Record<string, unknown>)!;
  }
  getWorkspace(userId: string): { backup: string; version: number; updatedAt: string } | null {
    const row = this.db.prepare("SELECT backup, version, updated_at FROM workspaces WHERE user_id = ?").get(userId) as Record<string, unknown> | undefined;
    return row ? { backup: String(row.backup), version: Number(row.version), updatedAt: String(row.updated_at) } : null;
  }
  /** Save only over the version the client last saw; anything else is a conflict the client resolves by reloading. */
  putWorkspace(user: User, backup: string, expectedVersion: number): { version: number; updatedAt: string } {
    if (Buffer.byteLength(backup) > MAX_BACKUP_BYTES) throw new AuthError(413, "The workspace is larger than " + MAX_BACKUP_BYTES / 1048576 + " MB.");
    const parsed = parseWorkspaceBackup(backup, [user.personId]);
    if (!parsed.ok) throw new AuthError(400, "The workspace did not pass validation: " + parsed.error);
    const current = this.getWorkspace(user.id)?.version ?? 0;
    if (current !== expectedVersion) throw new AuthError(409, "This workspace was saved from another window.");
    const version = current + 1, updatedAt = new Date(this.now()).toISOString();
    this.db.prepare("INSERT INTO workspaces (user_id, backup, version, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET backup = excluded.backup, version = excluded.version, updated_at = excluded.updated_at")
      .run(user.id, backup, version, updatedAt);
    return { version, updatedAt };
  }
}

// ---------- the routes ----------
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, personId: u.personId, institution: u.institution, jobRole: u.jobRole });

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

export function authRoutes(app: Hono, store: AuthStore, options: AuthOptions = {}) {
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
  const current = (c: Context) => store.userForSession(getCookie(c, SESSION_COOKIE));
  const fail = (c: Context, err: unknown) => {
    if (err instanceof AuthError) return c.json({ error: err.message }, err.status);
    console.error("auth failed:", err);
    return c.json({ error: "Something went wrong. Try again." }, 500);
  };

  app.get("/api/auth/providers", (c) => c.json({ password: true, google: Boolean(google) }));

  app.post("/api/auth/signup", async (c) => {
    try {
      const b = await body(c);
      const user = await store.signup({ name: str(b.name), email: str(b.email), password: str(b.password), institution: str(b.institution), jobRole: str(b.jobRole) });
      setSession(c, store.createSession(user.id));
      store.audit("signup", { userId: user.id, email: user.email, method: "password", client: client(c) });
      store.audit("login", { userId: user.id, email: user.email, method: "password", client: client(c) });
      return c.json({ user: publicUser(user) });
    } catch (err) { return fail(c, err); }
  });
  app.post("/api/auth/login", async (c) => {
    let email = "";
    try {
      const b = await body(c);
      email = str(b.email);
      const user = await store.login(email, str(b.password));
      setSession(c, store.createSession(user.id));
      store.audit("login", { userId: user.id, email: user.email, method: "password", client: client(c) });
      return c.json({ user: publicUser(user) });
    } catch (err) {
      if (err instanceof AuthError && (err.status === 401 || err.status === 429))
        store.audit("login_failed", { email: normaliseEmail(email).slice(0, 254), reason: err.status === 429 ? "locked" : "password", method: "password", client: client(c) });
      return fail(c, err);
    }
  });
  app.post("/api/auth/logout", (c) => {
    const user = store.endSession(getCookie(c, SESSION_COOKIE));
    if (user) store.audit("logout", { userId: user.id, email: user.email, client: client(c) });
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });
  app.get("/api/auth/me", (c) => {
    const user = current(c);
    return c.json({ user: user ? publicUser(user) : null });
  });
  app.patch("/api/auth/me", async (c) => {
    const user = current(c);
    if (!user) return c.json({ error: "Sign in first." }, 401);
    try {
      const b = await body(c), opt = (v: unknown) => (typeof v === "string" ? v : undefined);
      return c.json({ user: publicUser(store.updateProfile(user.id, { name: opt(b.name), institution: opt(b.institution), jobRole: opt(b.jobRole) })) });
    } catch (err) { return fail(c, err); }
  });

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
  app.get("/api/auth/google/callback", async (c) => {
    const [state, verifier, nonce] = getCookie(c, FLOW_COOKIE)?.split(".") ?? [];
    deleteCookie(c, FLOW_COOKIE, { path: FLOW_PATH });
    const back = (reason: GoogleFailure, email?: string) => {
      store.audit("login_failed", { email, reason, method: "google", client: client(c) });
      return c.redirect(appUrl + "/?auth_error=" + reason + "#/login");
    };
    if (!google) return c.redirect(appUrl + "/?auth_error=unavailable#/login");
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
      const { token } = store.googleSignIn({ sub: claims.sub!, email: claims.email!, name: claims.name }, client(c));
      setSession(c, token);
      return c.redirect(appUrl + "/");
    } catch (err) {
      if (err instanceof AuthError && err.message === "email-taken") return back("email-taken", claims.email);
      throw err;
    }
  });

  app.get("/api/workspace", (c) => {
    const user = current(c);
    if (!user) return c.json({ error: "Sign in first." }, 401);
    return c.json({ workspace: store.getWorkspace(user.id) });
  });
  app.put("/api/workspace", async (c) => {
    const user = current(c);
    if (!user) return c.json({ error: "Sign in first." }, 401);
    try {
      const b = await body(c);
      if (typeof b.backup !== "string" || typeof b.version !== "number") throw new AuthError(400, "Send the workspace backup and the version it was based on.");
      return c.json(store.putWorkspace(user, b.backup, b.version));
    } catch (err) {
      if (err instanceof AuthError && err.status === 409) return c.json({ error: err.message, version: store.getWorkspace(user.id)?.version ?? 0 }, 409);
      return fail(c, err);
    }
  });
}

async function originGuard(c: Context, next: () => Promise<void>) {
  const origin = c.req.header("origin");
  if (c.req.method !== "GET" && origin && !LOCAL_ORIGIN.test(origin)) return c.json({ error: "Requests that change an account must come from this computer's own pages." }, 403);
  await next();
}
