// Generates the two sample decks into docs/presentation/ the way the app builds
// them, a meeting brief deck and a teaching pack, from the one dataset every
// presentation artefact uses (plan Section 15): mcp/sample-workspace.json, the
// tour's end state on CS310, which the screenshots and the local door read too.
// On Windows with PowerPoint installed, the teaching pack is then opened in
// PowerPoint and its slides exported as PNGs (docs/presentation/pack/), so the
// deck shows the pack as PowerPoint draws it.
//   node scripts/gen-sample-decks.mjs
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadWorkspace } from "../mcp/workspace.ts";
import { SAMPLE_PATH } from "../mcp/sample.ts";
import { PEOPLE } from "../src/data/seed.ts";
import { evidenceReport } from "../src/lib/evidence.ts";
import { brandFor, briefDeck, deckBuffer, sessionDeck } from "../src/lib/slides.ts";

const OUT = new URL("../docs/presentation/", import.meta.url);
const loaded = loadWorkspace(SAMPLE_PATH);
if (!loaded.ok) throw new Error(loaded.error);
const { backup } = loaded, d = backup.data, at = backup.exportedAt; // the export time, so a rerun writes the same slides
const subject = d.subjects.find((s) => s.id === "CS310"), clos = d.clos.filter((c) => c.subjectId === "CS310");
const report = evidenceReport("CS310", d.evidenceSources, d.skillMentions, d.skillMappings, clos);
const brief = d.evidenceBriefs.filter((b) => b.subjectId === "CS310").at(-1);
// The tour's own session, not one of the term's sample sessions (depth plan Section 5.1), branded the way the app brands it.
const session = d.teachingPlans.find((p) => p.subjectId === "CS310").sessions.find((s) => !s.sample);
const definition = d.courseDefinitions.CS310 ?? null;
const markFile = new URL("../public" + (d.institution.mark.wide ?? d.institution.mark.png), import.meta.url);
const markData = existsSync(markFile) ? readFileSync(markFile).toString("base64") : null;
const briefSpec = briefDeck(subject, brief, report, d.evidenceSources, d.skillMentions, clos, PEOPLE, at);
const packSpec = sessionDeck(subject, session, clos, report, d.skillMentions, d.evidenceSources, PEOPLE, at,
  { definition, brand: brandFor(d.institution, definition, subject, session.week, markData) });
writeFileSync(new URL("sample-" + briefSpec.fileName, OUT), await deckBuffer(briefSpec));
writeFileSync(new URL("sample-" + packSpec.fileName, OUT), await deckBuffer(packSpec));
console.log("wrote sample-" + briefSpec.fileName + " (" + briefSpec.slides.length + " slides) and sample-" + packSpec.fileName + " (" + packSpec.slides.length + " slides)");

// The pack as PowerPoint draws it.
const powerpoint = ["C:/Program Files/Microsoft Office/root/Office16/POWERPNT.EXE", "C:/Program Files (x86)/Microsoft Office/root/Office16/POWERPNT.EXE"].some(existsSync);
if (process.platform === "win32" && powerpoint) {
  const dir = join("docs", "presentation", "pack");
  rmSync(dir, { recursive: true, force: true });
  const run = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/render-pptx.ps1", "-In", join("docs", "presentation", "sample-" + packSpec.fileName), "-Out", dir, "-Width", "1920"],
    { encoding: "utf8", timeout: 120000 });
  if (run.status !== 0) throw new Error("PowerPoint could not render the pack: " + (run.stderr || run.stdout).slice(0, 400));
  const read = JSON.parse(run.stdout);
  if (read.slides !== packSpec.slides.length) throw new Error("PowerPoint read " + read.slides + " slides; the pack has " + packSpec.slides.length + ".");
  console.log("PowerPoint opened the pack: " + read.slides + " slides, each with its notes; exported to " + dir);
} else console.log("PowerPoint is not installed here, so the pack's slides were not exported; the deck keeps the last export.");
