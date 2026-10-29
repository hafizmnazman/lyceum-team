// Kept uploads (api/storage.ts) on the real migrations, with the bucket faked as a Map: the bytes go in before the row,
// the same file twice is kept once, and forgetting an account takes its files out of the bucket and its rows out of the
// table, leaving everyone else's. With no S3_* settings there is no bucket.
// Run: node --test tests/prove-storage.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb, migrate } from "../api/db.ts";
import { forgetUploads, keepUpload, r2FromEnv, type Bucket } from "../api/storage.ts";

const A = "00000000-0000-4000-8000-00000000000a", B = "00000000-0000-4000-8000-00000000000b";

test("uploads are kept once each, and forgetting an account removes only its files", async () => {
  const db = await memoryDb();
  await migrate(db);
  for (const id of [A, B]) await db.query("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, '{}')", [id, id + "@x.edu"]);
  const objects = new Map<string, Buffer>();
  const bucket: Bucket = {
    async put(key, body) { objects.set(key, body); },
    async get(key) { return objects.get(key)!; },
    async remove(keys) { for (const k of keys) objects.delete(k); },
  };

  const outline = Buffer.from("%PDF CS101 outline");
  const first = await keepUpload(db, bucket, A, "CS101 outline.pdf", outline);
  const again = await keepUpload(db, bucket, A, "renamed.pdf", outline);
  assert.equal(again.id, first.id, "the same file again is the same row");
  assert.match(first.key, /^uploads\/0{8}-0{4}-4000-8000-0{11}a\/[0-9a-f]{64}\.pdf$/);
  assert.deepEqual(await bucket.get(first.key), outline);
  assert.equal((await db.query("SELECT name FROM files WHERE id = $1", [first.id])).rows[0].name, "renamed.pdf", "the latest name wins");

  await keepUpload(db, bucket, A, "marks.xlsx", Buffer.from("marks"));
  const other = await keepUpload(db, bucket, B, "CS101 outline.pdf", outline);
  assert.notEqual(other.key, first.key, "the same bytes from another account are its own file");
  assert.equal(objects.size, 3);

  assert.equal(await forgetUploads(db, bucket, A), 2);
  assert.deepEqual([...objects.keys()], [other.key], "only B's file is left in the bucket");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM files")).rows[0].n, 1);

  // a bucket that fails keeps the rows, so nothing is left behind and a later try can finish
  await keepUpload(db, bucket, A, "again.pdf", outline);
  const down: Bucket = { ...bucket, async remove() { throw new Error("R2 unreachable"); } };
  await assert.rejects(forgetUploads(db, down, A), /unreachable/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM files WHERE owner = $1", [A])).rows[0].n, 1);
});

test("no S3_* settings, no bucket: nothing is stored", () => {
  assert.equal(r2FromEnv({}), null);
  assert.equal(r2FromEnv({ S3_ENDPOINT: "https://x.r2.cloudflarestorage.com", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s" }), null, "a missing bucket name is no bucket");
  assert.notEqual(r2FromEnv({ S3_ENDPOINT: "https://x.r2.cloudflarestorage.com", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s", S3_BUCKET: "lyceum-prod" }), null);
});
