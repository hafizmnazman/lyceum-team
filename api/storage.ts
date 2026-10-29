// Uploaded files, kept: the original bytes in Cloudflare R2 (S3-compatible), the record of them in Postgres (files,
// migration 20261030090000). The two never talk to each other; this server does both. A file is stored under its owner
// and its sha256, so uploading the same file again stores nothing new. With the S3_* settings unset there is no bucket
// and nothing is stored, so local runs and the proofs need no keys.

import { createHash } from "node:crypto";
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Db } from "./db.ts";

export interface Bucket {
  put(key: string, body: Buffer, type: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(keys: string[]): Promise<void>;
}

/** R2 from the S3_* settings in api/.env, or null when any is missing. The endpoint is https://<account id>.r2.cloudflarestorage.com. */
export function r2FromEnv(env: NodeJS.ProcessEnv = process.env): Bucket | null {
  const { S3_ENDPOINT: endpoint, S3_ACCESS_KEY_ID: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey, S3_BUCKET: Bucket } = env;
  if (!endpoint || !accessKeyId || !secretAccessKey || !Bucket) return null;
  const s3 = new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } });
  return {
    async put(Key, Body, ContentType) { await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType })); },
    async get(Key) { return Buffer.from(await (await s3.send(new GetObjectCommand({ Bucket, Key }))).Body!.transformToByteArray()); },
    // ponytail: one request of up to 1,000 keys, the S3 limit; batch it if an account ever holds more files
    async remove(keys) { if (keys.length) await s3.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } })); },
  };
}

const TYPES: Record<string, string> = {
  pdf: "application/pdf", csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Keep an account's upload: the bytes first, then the row, so a row always has its file. The same file again is the same row. */
export async function keepUpload(db: Db, bucket: Bucket, owner: string, name: string, body: Buffer): Promise<{ id: string; key: string }> {
  const sha256 = createHash("sha256").update(body).digest("hex");
  const ext = /\.([a-z0-9]{1,8})$/i.exec(name)?.[1]?.toLowerCase() ?? "bin";
  const key = "uploads/" + owner + "/" + sha256 + "." + ext, type = TYPES[ext] ?? "application/octet-stream";
  await bucket.put(key, body, type);
  const { rows } = await db.query<{ id: string; key: string }>(
    "INSERT INTO files (owner, key, name, type, size, sha256) VALUES ($1, $2, $3, $4, $5, $6) " +
      "ON CONFLICT (owner, sha256) DO UPDATE SET name = EXCLUDED.name RETURNING id, key",
    [owner, key, name.slice(0, 200), type, body.length, sha256],
  );
  return rows[0];
}

/** Before an account is deleted: its files leave the bucket, then their rows. Throws if the bucket cannot be reached, so the
 *  account is kept and deleted on a later try rather than leaving its files behind. */
export async function forgetUploads(db: Db, bucket: Bucket, owner: string): Promise<number> {
  const { rows } = await db.query<{ key: string }>("SELECT key FROM files WHERE owner = $1", [owner]);
  await bucket.remove(rows.map((r) => r.key));
  await db.query("DELETE FROM files WHERE owner = $1", [owner]);
  return rows.length;
}
