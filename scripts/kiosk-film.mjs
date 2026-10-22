// The kiosk's film (depth plan Section 9.1, D6b): copies the existing Loop90 render beside the app, with its render date
// and fingerprint, so #/kiosk can play it. It renders nothing: the film comes from video/out, where the render left it,
// and public/media/ is ignored by git, as the deck's copy is.
// Usage: node scripts/kiosk-film.mjs [--check]

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "loop90-720p.mp4";
const SOURCE = join(root, "video", "out", FILE);
const DIR = join(root, "public", "media");
const check = process.argv.includes("--check");
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

if (!existsSync(SOURCE)) {
  console.log("No render at video/out/" + FILE + ", so nothing to copy; the kiosk says the film is not on this laptop.");
  process.exit(check ? 0 : 1);
}
const stat = statSync(SOURCE);
const info = { file: FILE, renderedAt: stat.mtime.toISOString(), sha256: sha(SOURCE), bytes: stat.size };
const dest = join(DIR, FILE), json = join(DIR, "loop90.json");

if (check) {
  const ok = existsSync(dest) && existsSync(json) && sha(dest) === info.sha256 && readFileSync(json, "utf8") === JSON.stringify(info, null, 2) + "\n";
  console.log(ok ? "The kiosk's film matches the render of " + info.renderedAt.slice(0, 10) + "." : "The kiosk's film is missing or older than the render: run node scripts/kiosk-film.mjs.");
  process.exit(ok ? 0 : 1);
}
mkdirSync(DIR, { recursive: true });
copyFileSync(SOURCE, dest);
writeFileSync(json, JSON.stringify(info, null, 2) + "\n");
console.log("Copied the Loop90 render of " + info.renderedAt.slice(0, 10) + " (" + Math.round(info.bytes / 1024) + " KB) to public/media/ for the kiosk.");
