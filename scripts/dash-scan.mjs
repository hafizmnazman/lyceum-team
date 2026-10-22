// The dash scan: no en dash (U+2013) or em dash (U+2014) in any text file the
// repository tracks or is about to track (house rule, plan Section 0).
// Usage: node scripts/dash-scan.mjs [--all]
//   Without --all it skips docs/history/ and docs/review/, which keep superseded
//   documents and Codex reviews as they were written. It always skips the saved
//   sample of real postings: that text is evidence, quoted and fingerprinted as
//   the employer published it, so it is never edited (docs/decisions.md).

import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const TEXT = new Set([".md", ".ts", ".tsx", ".mjs", ".js", ".cjs", ".css", ".html", ".json", ".txt", ".srt", ".yml", ".yaml", ".svg", ".d2"]);
const KEPT_AS_WRITTEN = [/^docs\/history\//, /^docs\/review\//];
// The door's sample workspace stores the same postings, verbatim, as its sources (docs/decisions.md, A0 and A5).
const VERBATIM_EVIDENCE = [/^public\/demo\/collected-sample\.json$/, /^mcp\/sample-workspace\.json$/];
const all = process.argv.includes("--all");

const listed = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8", maxBuffer: 1 << 28 });
if (listed.status !== 0) { console.error(listed.stderr); process.exit(2); }
const files = [...new Set(listed.stdout.split("\0").filter(Boolean))]
  .filter((p) => TEXT.has(extname(p).toLowerCase()))
  .filter((p) => !VERBATIM_EVIDENCE.some((re) => re.test(p)))
  .filter((p) => all || !KEPT_AS_WRITTEN.some((re) => re.test(p)))
  .filter((p) => { try { return statSync(p).isFile(); } catch { return false; } });

const DASH = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
let hits = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (DASH.test(line)) { hits++; if (hits <= 200) console.log(file + ":" + (i + 1) + ": " + line.trim().slice(0, 160)); }
  });
}
console.log((hits ? hits + " lines with an en or em dash" : "No en or em dash") + " in " + files.length + " text files" + (all ? "" : " (docs/history and docs/review kept as written)") + ".");
process.exit(hits ? 1 : 0);
