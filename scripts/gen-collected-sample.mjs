// Builds public/demo/collected-sample.json, the dated saved sample used by the
// self-driving demo and by rehearsals without network access. Input: a raw
// Greenhouse Job Board API response (jobs?content=true) saved to disk.
//   node scripts/gen-collected-sample.mjs <board.json> [board-token] [retrievedAt ISO]
import { readFileSync, writeFileSync } from "node:fs";
import { normaliseGreenhouseJob } from "../src/lib/collect.ts";

const [, , input, board = "stripe", retrievedAt = new Date().toISOString()] = process.argv;
if (!input) { console.error("Usage: node scripts/gen-collected-sample.mjs <board.json> [board] [retrievedAt]"); process.exit(1); }
const raw = JSON.parse(readFileSync(input, "utf8"));
const wanted = /data analyst|data scientist|analytics engineer|business intelligence|data engineer|visuali|insights analyst|data science/i;

function trimForSample(text) {
  const start = text.search(/about the team|what you.ll do|what you will do|the role|the team/i);
  const body = start > 0 ? text.slice(start) : text;
  const max = 2400;
  if (body.length <= max) return body;
  const cut = body.lastIndexOf("\n", max);
  return body.slice(0, cut > 900 ? cut : max).trimEnd() + "\n\n[Sample truncated for the demo. The full posting is at the link.]";
}

const postings = raw.jobs
  .filter((job) => wanted.test(job.title))
  .map((job) => normaliseGreenhouseJob(job, board, retrievedAt))
  .filter(Boolean)
  .sort((a, b) => a.title.localeCompare(b.title))
  .slice(0, 10)
  .map((p) => ({ ...p, id: "sample:" + board + ":" + p.id.split(":").pop(), provider: "sample", text: trimForSample(p.text) }));

const sample = {
  label: "Saved sample: real postings from the " + board + " Greenhouse board, retrieved " + retrievedAt.slice(0, 10) + " and truncated for the demo",
  board, retrievedAt, postings,
};
writeFileSync(new URL("../public/demo/collected-sample.json", import.meta.url), JSON.stringify(sample, null, 2), "utf8");
console.log("wrote " + postings.length + " sample postings: " + postings.map((p) => p.title).join(" | "));
