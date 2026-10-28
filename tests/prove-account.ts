// Accounts on Supabase (api/account.ts), through its routes, on the real migrations (supabase/migrations/) in PGlite. Supabase
// Auth is faked: a token is just "token-" + the account's id, and deleting an account deletes its auth.users row, so the
// cascade to its profile and workspace is the database's own. What it proves: the sign-up trigger makes the profile, a
// request without a valid token is refused, onboarding and cancelling, the workspace saved only over the version it was
// based on, and unfinished sign-ups purged after a day.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { AccountStore, accountRoutes, type AuthDeps } from "../api/account.ts";
import { memoryDb, migrate, type Db } from "../api/db.ts";
import { DEMO_INSTITUTION } from "../shared/data/institution.ts";
import { BACKUP_SCHEMA_VERSION, WORKSPACE_DATA_KEYS } from "../shared/lib/workspaceBackup.ts";

const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";

/** A minimal valid workspace in the backup format, owned by one person. */
function backup(personId: string, title = "Data Mining") {
  const data: Record<string, unknown> = Object.fromEntries(WORKSPACE_DATA_KEYS.map((k) => [k, k === "idSeq" ? 1 : k === "skillLexicon" || k === "courseDefinitions" ? {} : []]));
  data.programme = { id: "PRG-1", title: "Computing", departmentOwnerId: personId, subjectIds: ["CS101"] };
  data.institution = { ...DEMO_INSTITUTION, name: "Example University", shortName: "EU", demo: false, showMark: false };
  data.subjects = [{ id: "CS101", title, programmeId: "PRG-1", year: 1, semester: 1, cloIds: [], prerequisiteSubjectIds: [], sharedWithProgrammeIds: [], status: "proposed", currentVersionId: "V1", workspaceOnly: true }];
  data.assignments = [{ personId, subjectId: "CS101", hat: "lecturer" }];
  return JSON.stringify({ application: "Lyceum", schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: "2026-10-28T08:00:00.000Z", data });
}

async function setup(now = () => Date.now()) {
  const db: Db = await memoryDb();
  await migrate(db);
  const signUp = (id: string, meta: Record<string, string>) =>
    db.query("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)", [id, id.slice(-1) + "@x.edu", JSON.stringify(meta)]);
  const deps: AuthDeps = {
    verify: async (token) => {
      const id = token.replace(/^token-/, "");
      const row = (await db.query<{ email: string }>("SELECT email FROM auth.users WHERE id::text = $1", [id])).rows[0];
      return row ? { id, email: row.email } : null;
    },
    deleteUser: async (id) => { await db.query("DELETE FROM auth.users WHERE id = $1", [id]); },
  };
  const store = new AccountStore(db, deps, now);
  const app = new Hono();
  accountRoutes(app, store, deps);
  const call = async (as: string | null, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = body === undefined ? {} : { "content-type": "application/json" };
    if (as) headers.authorization = "Bearer token-" + as;
    const res = await app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: (await res.json()) as Record<string, any> };
  };
  return { db, store, signUp, call };
}

test("sign-up makes the profile from what was sent; no token or a bad one is nobody", async () => {
  const { signUp, call } = await setup();
  await signUp(A, { name: " Aina ", institution: "UTP", job_role: "lecturer" });
  const me = await call(A, "GET", "/api/me");
  assert.equal(me.body.user.name, "Aina");
  assert.equal(me.body.user.institution, "UTP");
  assert.equal(me.body.user.jobRole, "lecturer");
  assert.equal(me.body.user.onboarded, false);
  assert.match(me.body.user.personId, /^U-[0-9a-f]{8}$/);
  assert.equal((await call(null, "GET", "/api/me")).body.user, null);
  assert.equal((await call(B, "GET", "/api/me")).body.user, null, "a token for no account");
  assert.equal((await call(null, "PATCH", "/api/me", { name: "X" })).status, 401);
  await signUp(B, { job_role: "dean" });
  const b = await call(B, "GET", "/api/me");
  assert.equal(b.body.user.name, "b", "no name sent: the email's local part");
  assert.equal(b.body.user.jobRole, null, "a role off the list is not kept");
  assert.equal((await call(B, "PATCH", "/api/me", { jobRole: "dean" })).status, 400);
  assert.equal((await call(B, "PATCH", "/api/me", { jobRole: "coordinator" })).body.user.jobRole, "coordinator");
});

test("onboarding finishes once; cancelling deletes only an unfinished sign-up", async () => {
  const { db, signUp, call } = await setup();
  await signUp(A, { name: "Aina" });
  await signUp(B, { name: "Badrul" });
  assert.equal((await call(A, "POST", "/api/me/onboarded", {})).body.user.onboarded, true);
  assert.equal((await call(A, "POST", "/api/me/cancel", {})).body.deleted, false, "a finished account is kept");
  assert.equal((await call(B, "POST", "/api/me/cancel", {})).body.deleted, true);
  assert.equal((await db.query("SELECT 1 FROM profiles WHERE id = $1", [B])).rows.length, 0, "its profile went with it");
  assert.equal((await call(A, "GET", "/api/me")).body.user.onboarded, true);
});

test("the workspace: signed in only, validated, and saved only over the version it was based on", async () => {
  const { db, signUp, call } = await setup();
  await signUp(A, { name: "Aina" });
  await signUp(B, { name: "Badrul" });
  assert.equal((await call(null, "GET", "/api/workspace")).status, 401);
  const me = (await call(A, "GET", "/api/me")).body.user;
  assert.equal((await call(A, "GET", "/api/workspace")).body.workspace, null, "a new account has no workspace yet");
  assert.equal((await call(A, "PUT", "/api/workspace", { backup: backup(me.personId), version: 0 })).body.version, 1);
  assert.equal((await call(A, "PUT", "/api/workspace", { backup: backup(me.personId, "Stale"), version: 0 })).status, 409, "a second window's older copy is refused");
  assert.equal((await call(A, "PUT", "/api/workspace", { backup: backup(me.personId, "Data Mining II"), version: 1 })).body.version, 2);
  assert.match((await call(A, "GET", "/api/workspace")).body.workspace.backup, /Data Mining II/);
  assert.equal((await call(A, "PUT", "/api/workspace", { backup: backup("U-someoneelse"), version: 2 })).status, 400, "a workspace naming another person fails validation");
  assert.equal((await call(A, "PUT", "/api/workspace", { backup: "not json", version: 2 })).status, 400);
  assert.equal((await call(B, "GET", "/api/workspace")).body.workspace, null, "one account never sees another's workspace");
  await db.query("DELETE FROM auth.users WHERE id = $1", [A]);
  assert.equal((await db.query("SELECT 1 FROM workspaces WHERE user_id = $1", [A])).rows.length, 0, "deleting the account deletes its workspace");
});

test("sign-ups left unfinished for a day are purged; finished ones and fresh ones stay", async () => {
  let clock = Date.parse("2026-10-28T08:00:00Z");
  const { db, store, signUp, call } = await setup(() => clock);
  await signUp(A, { name: "Aina" });
  await signUp(B, { name: "Badrul" });
  await call(A, "POST", "/api/me/onboarded", {});
  await db.query("UPDATE profiles SET created_at = $1", [new Date(clock - 2 * 3600 * 1000)]);
  assert.equal(await store.purgePending(), 0, "two hours old: kept");
  clock += 25 * 3600 * 1000;
  assert.equal(await store.purgePending(), 1);
  assert.deepEqual((await db.query<{ id: string }>("SELECT id FROM auth.users")).rows.map((r) => r.id), [A]);
});
