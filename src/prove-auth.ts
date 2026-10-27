// Real accounts, through the routes, on an in-memory database: sign up, sign in and out, the cookie's flags, a wrong
// password and the lock after five, a session that expires, the origin guard, a workspace saved only over the version
// it was based on and only when it passes the backup validator, and Google sign-in against a fake token endpoint.
// Run: node --test src/prove-auth.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { AuthStore, authRoutes, hashPassword, pkceChallenge, signupError, verifyPassword } from "../server/auth.ts";
import { DEMO_INSTITUTION } from "./data/institution.ts";
import { BACKUP_SCHEMA_VERSION, WORKSPACE_DATA_KEYS } from "./lib/workspaceBackup.ts";

let clock = Date.parse("2026-10-27T08:00:00Z");
function setup() {
  const store = new AuthStore(":memory:", () => clock);
  const app = new Hono();
  authRoutes(app, store);
  let cookie = "";
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await app.request(path, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0].endsWith("=") ? "" : set.split(";")[0];
    return { status: res.status, body: await res.json() as Record<string, any>, setCookie: set };
  };
  return { store, call, dropCookie: () => { cookie = ""; } };
}
const ME = { name: "Dr Aina", email: "Aina@Example.edu", password: "correct horse battery" };

/** A minimal valid workspace in the backup format, owned by one person. */
function backup(personId: string, title = "Data Mining") {
  const data: Record<string, unknown> = Object.fromEntries(WORKSPACE_DATA_KEYS.map((k) => [k, k === "idSeq" ? 1 : k === "skillLexicon" || k === "courseDefinitions" ? {} : []]));
  data.programme = { id: "PRG-1", title: "Computing", departmentOwnerId: personId, subjectIds: ["CS101"] };
  data.institution = { ...DEMO_INSTITUTION, name: "Example University", shortName: "EU", demo: false, showMark: false };
  data.subjects = [{ id: "CS101", title, programmeId: "PRG-1", year: 1, semester: 1, cloIds: [], prerequisiteSubjectIds: [], sharedWithProgrammeIds: [], status: "proposed", currentVersionId: "V1", workspaceOnly: true }];
  data.assignments = [{ personId, subjectId: "CS101", hat: "lecturer" }];
  return JSON.stringify({ application: "Lyceum", schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: "2026-10-27T08:00:00.000Z", data });
}

test("passwords are scrypt hashes that verify only the right password", async () => {
  const h = await hashPassword("correct horse battery");
  assert.match(h, /^scrypt\$16384\$8\$1\$/);
  assert.ok(!h.includes("correct horse"));
  assert.equal(await verifyPassword("correct horse battery", h), true);
  assert.equal(await verifyPassword("correct horse batterY", h), false);
  assert.notEqual(h, await hashPassword("correct horse battery"), "a fresh salt each time");
  assert.equal(signupError({ name: "A", email: "a@b.co", password: "short" }), "Use a password of at least 10 characters.");
  assert.equal(signupError({ name: "A", email: "not-an-email", password: "long enough pw" }), "Enter a valid email address.");
  assert.equal(signupError({ name: "A", email: "a@b.co", password: "A@B.CO" + "" }), "Use a password of at least 10 characters.");
});

test("sign up starts a session in an HttpOnly, SameSite cookie; me, sign out and sign in follow it", async () => {
  const { call, dropCookie } = setup();
  const up = await call("POST", "/api/auth/signup", ME);
  assert.equal(up.status, 200);
  assert.equal(up.body.user.email, "aina@example.edu", "emails are kept in lower case");
  assert.match(up.body.user.personId, /^U-[0-9a-f]{8}$/);
  assert.match(up.setCookie!, /lyceum_session=[\w-]{40,}/);
  assert.match(up.setCookie!, /HttpOnly/i); assert.match(up.setCookie!, /SameSite=Lax/i); assert.match(up.setCookie!, /Path=\//);
  assert.equal((await call("GET", "/api/auth/me")).body.user.name, "Dr Aina");
  assert.equal((await call("POST", "/api/auth/signup", ME)).status, 409, "one account per email");
  await call("POST", "/api/auth/logout");
  assert.equal((await call("GET", "/api/auth/me")).body.user, null, "signed out");
  dropCookie();
  const back = await call("POST", "/api/auth/login", { email: " AINA@example.edu ", password: ME.password });
  assert.equal(back.status, 200);
  assert.equal((await call("PATCH", "/api/auth/me", { name: "Dr Aina Rahim" })).body.user.name, "Dr Aina Rahim");
});

test("a wrong password says nothing about the account, and five lock the email for fifteen minutes", async () => {
  const { call } = setup();
  await call("POST", "/api/auth/signup", ME);
  const wrong = await call("POST", "/api/auth/login", { email: ME.email, password: "nope nope nope" });
  const nobody = await call("POST", "/api/auth/login", { email: "ghost@example.edu", password: "nope nope nope" });
  assert.equal(wrong.status, 401); assert.equal(nobody.status, 401);
  assert.equal(wrong.body.error, nobody.body.error, "the same answer for a wrong password and a missing account");
  for (let i = 0; i < 4; i++) await call("POST", "/api/auth/login", { email: ME.email, password: "nope nope nope" });
  const locked = await call("POST", "/api/auth/login", { email: ME.email, password: ME.password });
  assert.equal(locked.status, 429, "even the right password waits out the lock");
  clock += 15 * 60 * 1000 + 1;
  assert.equal((await call("POST", "/api/auth/login", { email: ME.email, password: ME.password })).status, 200, "the lock runs out");
});

test("a session ends after thirty days, and only a hash of its token is stored", async () => {
  const { store, call } = setup();
  const up = await call("POST", "/api/auth/signup", ME);
  const token = up.setCookie!.split(";")[0].split("=")[1];
  assert.ok(store.userForSession(token));
  assert.equal((store as unknown as { db: { prepare: (q: string) => { all: () => unknown[] } } }).db.prepare("SELECT * FROM sessions").all().some((r) => JSON.stringify(r).includes(token)), false);
  clock += 30 * 86400000 + 1;
  assert.equal((await call("GET", "/api/auth/me")).body.user, null);
});

test("pages on another site cannot sign in or save; this computer's pages can", async () => {
  const { call } = setup();
  assert.equal((await call("POST", "/api/auth/signup", ME, { origin: "https://evil.example" })).status, 403);
  assert.equal((await call("POST", "/api/auth/signup", ME, { origin: "http://localhost:5173" })).status, 200);
  assert.equal((await call("PUT", "/api/workspace", { backup: "{}", version: 0 }, { origin: "https://evil.example" })).status, 403);
});

test("the workspace: signed in only, validated, and saved only over the version it was based on", async () => {
  const { call, dropCookie } = setup();
  assert.equal((await call("GET", "/api/workspace")).status, 401);
  const me = (await call("POST", "/api/auth/signup", ME)).body.user;
  assert.equal((await call("GET", "/api/workspace")).body.workspace, null, "a new account has no workspace yet");
  const first = await call("PUT", "/api/workspace", { backup: backup(me.personId), version: 0 });
  assert.equal(first.status, 200); assert.equal(first.body.version, 1);
  assert.equal((await call("PUT", "/api/workspace", { backup: backup(me.personId, "Stale"), version: 0 })).status, 409, "a second window's older copy is refused");
  const second = await call("PUT", "/api/workspace", { backup: backup(me.personId, "Data Mining II"), version: 1 });
  assert.equal(second.body.version, 2);
  const read = await call("GET", "/api/workspace");
  assert.match(read.body.workspace.backup, /Data Mining II/);
  assert.equal((await call("PUT", "/api/workspace", { backup: backup("U-someoneelse"), version: 2 })).status, 400, "a workspace naming another person fails validation");
  assert.equal((await call("PUT", "/api/workspace", { backup: "not json", version: 2 })).status, 400);
  dropCookie();
  const other = (await call("POST", "/api/auth/signup", { name: "Mr Lee", email: "lee@example.edu", password: "another long password" })).body.user;
  assert.equal((await call("GET", "/api/workspace")).body.workspace, null, "one account never sees another's workspace");
  assert.ok(other.personId !== me.personId);
});

test("a new account's workspace, as the store builds it, passes the server's validator before and after onboarding", async () => {
  const { openAccountWorkspace, createCourseWorkspace, getState, saveOnboardingProfile } = await import("./app/store.ts");
  const { parseWorkspaceBackup, serializeWorkspaceBackup } = await import("./lib/workspaceBackup.ts");
  const { navFor, navAllows } = await import("./app/roles.ts");
  const user = { id: "0f3c9a1e-0000-4000-8000-000000000000", email: "aina@example.edu", name: "Dr Aina", personId: "U-0f3c9a1e" };
  assert.deepEqual(openAccountWorkspace(user, null), { ok: true });
  let s = getState();
  assert.equal(s.screen, "onboarding", "a new account starts at onboarding");
  assert.deepEqual(s.people.map((p) => p.id), [user.personId], "only this person, none of the demo's");
  assert.equal(s.subjects.length, 0);
  const check = () => parseWorkspaceBackup(serializeWorkspaceBackup(getState(), "2026-10-27T08:00:00.000Z"), [user.personId]);
  assert.equal(check().ok, true, "the fresh workspace saves");
  assert.deepEqual(await saveOnboardingProfile({ name: "Dr Aina", institution: "Universiti Teknologi PETRONAS", programme: "Bachelor of Computer Science" }), { ok: true });
  assert.equal(getState().institution.shortName, "UTP");
  assert.equal(createCourseWorkspace({ code: "cs101", title: "Introduction to Programming", programmeTitle: getState().programme.title, year: 1, semester: 1 }).ok, true);
  s = getState();
  assert.deepEqual(s.subjects.map((x) => x.id), ["CS101"]);
  const after = check();
  assert.equal(after.ok, true, after.ok ? "" : after.error);
  const me = s.people[0];
  assert.ok(!navFor(me, s.assignments).includes("acceptance"), "the illustrative sandbox is not in an account's nav");
  assert.ok(navAllows(me, s.assignments, "onboarding") && !navAllows({ ...me, account: false }, s.assignments, "onboarding"));
  const reopened = openAccountWorkspace(user, { backup: serializeWorkspaceBackup(s, "2026-10-27T08:00:00.000Z"), version: 3 });
  assert.deepEqual(reopened, { ok: true });
  assert.equal(getState().screen, "inbox", "an account with a course opens at Home");
  assert.equal(getState().account?.version, 3);
});

// ---------- Google sign-in (docs/GOOGLE_AUTH_PORTABLE.md): the flow against a fake token endpoint ----------
const CLIENT = { clientId: "client-123.apps.googleusercontent.com", clientSecret: "secret-xyz" };
const idToken = (claims: Record<string, unknown>) => "h." + Buffer.from(JSON.stringify(claims)).toString("base64url") + ".sig";
function googleSetup(claimsFor: (nonce: string) => Record<string, unknown>, tokenStatus = 200) {
  const store = new AuthStore(":memory:", () => clock);
  const app = new Hono();
  const exchanges: URLSearchParams[] = [];
  let nonceSent = "";
  const fetcher = (async (_url: string, init: RequestInit) => {
    exchanges.push(new URLSearchParams(String(init.body)));
    return new Response(JSON.stringify({ id_token: idToken(claimsFor(nonceSent)) }), { status: tokenStatus });
  }) as unknown as typeof fetch;
  authRoutes(app, store, { google: CLIENT, appUrl: "http://localhost:5173", fetcher });
  const jar = new Map<string, string>();
  const go = async (path: string) => {
    const res = await app.request(path, { headers: { cookie: [...jar].map(([k, v]) => k + "=" + v).join("; ") } });
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";"), [k, v] = pair.split("=");
      if (v) jar.set(k, v); else jar.delete(k);
    }
    return { status: res.status, location: res.headers.get("location") ?? "", cookies: res.headers.getSetCookie() };
  };
  /** Start, read what was sent to Google, and come back with a code and the state (or another state). */
  const signIn = async (overrideState?: string, extra = "") => {
    const start = await go("/api/auth/google");
    const sent = new URL(start.location).searchParams;
    nonceSent = sent.get("nonce") ?? "";
    const back = await go("/api/auth/google/callback?code=abc&state=" + (overrideState ?? sent.get("state")) + extra);
    return { start, sent, back };
  };
  return { store, app, go, signIn, exchanges, jar };
}
const goodClaims = (nonce: string) => ({ iss: "https://accounts.google.com", aud: CLIENT.clientId, exp: Math.floor(Date.now() / 1000) + 600, nonce,
  sub: "google-sub-1", email: "Aina@gmail.com", email_verified: true, name: "Aina Rahim" });

test("Google: the start sends state, a PKCE S256 challenge and a nonce, with the flow in a ten-minute cookie on its own path", async () => {
  const { go, jar } = googleSetup(goodClaims);
  const start = await go("/api/auth/google");
  assert.equal(start.status, 302);
  const url = new URL(start.location), q = url.searchParams;
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(q.get("client_id"), CLIENT.clientId);
  assert.equal(q.get("redirect_uri"), "http://localhost:5173/api/auth/google/callback");
  assert.equal(q.get("scope"), "openid email profile");
  assert.equal(q.get("code_challenge_method"), "S256");
  assert.equal(q.get("response_type"), "code");
  const flow = start.cookies.find((c) => c.startsWith("google_flow="))!;
  assert.match(flow, /HttpOnly/i); assert.match(flow, /Path=\/api\/auth\/google/); assert.match(flow, /Max-Age=600/); assert.match(flow, /SameSite=Lax/i);
  const [state, verifier, nonce] = jar.get("google_flow")!.split(".");
  assert.equal(q.get("state"), state); assert.equal(q.get("nonce"), nonce);
  assert.equal(q.get("code_challenge"), pkceChallenge(verifier), "the challenge is base64url(sha256(verifier))");
  assert.ok(!start.location.includes(CLIENT.clientSecret) && !start.location.includes(verifier), "neither the secret nor the verifier goes to the browser");
});

test("Google: a good sign in exchanges the code server to server, keys the account on sub, and audits signup then login", async () => {
  const { store, signIn, exchanges, go, jar } = googleSetup(goodClaims);
  const first = await signIn();
  assert.equal(first.back.status, 302);
  assert.equal(first.back.location, "http://localhost:5173/");
  assert.ok(jar.get("lyceum_session"), "signed in");
  assert.ok(!jar.has("google_flow"), "the flow cookie is cleared on the callback");
  const sent = exchanges[0];
  assert.equal(sent.get("client_secret"), CLIENT.clientSecret);
  assert.equal(sent.get("code"), "abc");
  assert.equal(sent.get("grant_type"), "authorization_code");
  assert.equal(pkceChallenge(sent.get("code_verifier")!), first.sent.get("code_challenge"), "the verifier matches the challenge sent");
  const me = store.userForSession(jar.get("lyceum_session"));
  assert.equal(me?.email, "aina@gmail.com"); assert.equal(me?.name, "Aina Rahim");
  jar.delete("lyceum_session");
  await signIn();
  assert.equal(store.userForSession(jar.get("lyceum_session"))?.id, me?.id, "signing in again finds the same account, no second one");
  assert.deepEqual(store.auditTrail().map((e) => e.event + ":" + e.method), ["signup:google", "login:google", "login:google"]);
  await (async () => { const r = await go("/api/auth/google/callback?code=abc&state=x"); assert.match(r.location, /auth_error=state/); })();
});

test("Google: cancelled, a wrong state and a failed exchange go back to sign in with their reason, each audited", async () => {
  const cancelled = await googleSetup(goodClaims).signIn(undefined, "&error=access_denied");
  assert.equal(cancelled.back.location, "http://localhost:5173/?auth_error=cancelled#/login");
  const forged = googleSetup(goodClaims);
  const r = await forged.signIn("not-the-state");
  assert.match(r.back.location, /auth_error=state/);
  assert.equal(forged.exchanges.length, 0, "a wrong state never reaches the token endpoint");
  assert.deepEqual(forged.store.auditTrail().map((e) => e.event + ":" + e.reason), ["login_failed:state"]);
  const broken = googleSetup(goodClaims, 400);
  assert.match((await broken.signIn()).back.location, /auth_error=exchange/);
  assert.ok(!broken.jar.has("lyceum_session"));
});

test("Google: an ID token with a wrong issuer, audience or nonce, expired, or with an unverified email is refused", async () => {
  const cases: Array<[string, (n: string) => Record<string, unknown>]> = [
    ["issuer", (n) => ({ ...goodClaims(n), iss: "https://evil.example" })],
    ["audience", (n) => ({ ...goodClaims(n), aud: "someone-else" })],
    ["nonce", () => ({ ...goodClaims("x"), nonce: "replayed" })],
    ["expired", (n) => ({ ...goodClaims(n), exp: Math.floor(Date.now() / 1000) - 10 })],
    ["unverified email", (n) => ({ ...goodClaims(n), email_verified: false })],
  ];
  for (const [why, claims] of cases) {
    const s = googleSetup(claims);
    const r = await s.signIn();
    assert.match(r.back.location, /auth_error=token/, why);
    assert.ok(!s.jar.has("lyceum_session"), why + ": no session");
  }
});

test("Google: an email that already has a password account is refused, not linked", async () => {
  const s = googleSetup(goodClaims);
  await s.store.signup({ name: "Squatter", email: "aina@gmail.com", password: "registered first" });
  const r = await s.signIn();
  assert.match(r.back.location, /auth_error=email-taken/);
  assert.ok(!s.jar.has("lyceum_session"));
  assert.equal((await s.store.login("aina@gmail.com", "registered first")).name, "Squatter", "the password account is untouched");
});

test("Google: hidden and refused when no client is configured", async () => {
  const store = new AuthStore(":memory:", () => clock), app = new Hono();
  authRoutes(app, store, { google: { clientId: "", clientSecret: "" } });
  assert.deepEqual(await (await app.request("/api/auth/providers")).json(), { password: true, google: false });
  const res = await app.request("/api/auth/google");
  assert.match(res.headers.get("location") ?? "", /auth_error=unavailable/);
});
