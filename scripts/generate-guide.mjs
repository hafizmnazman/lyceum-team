import { readFileSync, writeFileSync } from "node:fs";
import { SECTION_GUIDES, REMAINING_WORK } from "../src/app/sectionGuides.ts";

const lines = [
  "# Lyceum: lecturer and section guide", "",
  "Reviewed 22 October 2026. Generated from the same section catalogue used by the in-app **Guide & progress** page. Run `node scripts/generate-guide.mjs` after changing that catalogue.", "",
  "## Start a useful lecturer session", "",
  "1. Start the app (\`npm run dev\`; use \`npm.cmd\` in Windows PowerShell). Choose Dr Sobri or Ms Tan on the demo sign-in page. These are local personas, not authenticated accounts.",
  "2. Open **Courses**. Choose an assigned course or **Create course workspace** to enter a unique code, title and optional programme. A personal workspace is private preparation, not an official university course.",
  "3. The course opens on **Course**, the setup step: what the course promises today. Set the term this loop runs for first, so the brief, the decision, the version and the results all carry it. The path across the top of every step lists the six steps that follow, **Watch**, **Report**, **Decide**, **Update**, **Teach** and **Learn**, with **History** as the record beside it; the step's helper asks its question just below. A step says Done only when its record exists this term; a new term starts a new loop and keeps the last one on the record.",
  "4. **Watch**. Run a research run against a permitted employer board (Greenhouse or Lever, through the local API) or the dated saved sample, keep the postings worth reading, or paste a document you are permitted to keep. Freeze a snapshot of the reviewed evidence at each review and compare the next window with it. Collection happens only when you ask, and nothing changes the course by itself.",
  "5. **Report** has its own five steps. **Quote**: name the skills, scan, and confirm each proposed sentence beside its source (a paraphrase is rejected). **Review**: mark the postings you have read so they count. **Count**: each skill's share with its numerator, denominator and 95% Wilson interval. **Map**: place each skill on an outcome's coverage ladder against a target. **Brief**: prepare the meeting brief with its receipts, download it as a document or editable slides, or send it to the people who decide; with a snapshot, the brief reports what changed since it.",
  "6. **Decide**. A coordinator or the programme owner who received the brief records adopt, retain, defer or return with a required reason. A decision on your own brief is self-recorded and stays open until a second person decides, except on a personal single-owner course. A record is never edited; deciding again adds a new one. Retain is a complete outcome: Update then shows no change this term.",
  "7. **Update**. An existing course needs **Start course revision**; a new personal course starts with an empty revision. Record the course brief and only the constraints you know; add CLO wording, Bloom level, achievement evidence and optional programme-outcome mappings; add topics, hours, weeks, CLO links and prerequisites; protect foundational content that must remain. **Save revision**, then **Check saved revision**: errors such as broken links, prerequisite cycles and exceeded time budgets block the candidate, while unknown budgets and missing evidence remain visible warnings. Inspect **Before and after** and the affected teaching work, record why and the teaching term, then the coordinator (or the owner of a personal course) chooses **Use as my course version**. The baseline is preserved; university approval stays in its existing process. **Discard revision** requires a reason and leaves the current version unchanged.",
  "8. **Teach**. Save course notes and add a session with a week, topic, duration, CLO links, activity and check for understanding. Ready and delivered sessions require preparation details; those checks do not establish teaching effectiveness. Course changes flag affected sessions and assessments for review while keeping the content. **Teaching pack (.pptx)** on any session downloads an editable deck built from the saved session and the evidence linked to its outcomes; the meeting brief also downloads as slides. No model writes a word of either. The assessment blueprint and template items sit behind a disclosure on this step; an affected assessment needs a recorded course-change review and repaired links before another submission.",
  "9. **Learn**. File the term's results or a CLO survey on this step; you confirm the course version the results are for, by default the version this term's sessions were saved on, and the step is done when this term's results are filed and matched to it. Attainment per outcome is shown as filed, with n of N. No learning gain is claimed; the benchmark has not been run. **History** keeps the course versions and the recorded decisions on one timeline and exports a previous outline. **Export current outline** and **Export plan (.md)** write readable Markdown documents, which are not slide decks or restorable backups.",
  "10. In **Guide & progress** or the Backups panel on **Courses**, download a JSON workspace backup. To restore, choose the JSON file, review counts and export date, acknowledge replacement, then restore. Download the pre-restore recovery copy to recover the previous workspace. Backups exclude original uploaded files, credentials and unsaved edits.",
  "11. The earlier proposal and approval chain, with its illustrative acceptance forecast, is kept in the research sandbox and labelled illustrative. Decisions on the loop are recorded in Decide.", "",
  "## Saving and navigation", "",
  "- Courses, saved revisions, version history, plans and notes are kept in this browser. There is one teaching plan per course, shared by its assigned local personas. There is no cross-device sync, separate term archive or institutional database yet.",
  "- Each editor has an explicit Save button. Moving between Course, Update, Teach and History preserves an open editor. Leaving for another page or course, switching persona or closing the page warns about unsaved edits. Save before downloading a JSON backup; it contains saved workspace data.",
  "- A visible storage warning means changes cannot survive closing the page. Download a JSON backup or Markdown export while the page is open. A restore that cannot be written to storage leaves the current workspace unchanged.",
  "- Reset workspace removes local saved work and restores seed examples. Download a JSON backup first. A Markdown outline/plan cannot be restored; only the validated JSON workspace format can.",
  "- Play demo is available on sign-in/public screens and Guide & progress. It resets the local workspace; existing saved work triggers a confirmation first. Download a workspace backup before continuing.",
  "- The path across a course's steps and the receipts ring on Home read your saved work: a step is done only when its record exists this term. **How it works** shows the seven roles and the record of each step on your course, with derived lines labelled; **Evaluation** shows the live checks and benchmarks.",
  "- Use **How to use [section]** above each signed-in page for contextual instructions. **Guide & progress** includes every section, a role filter, search and unfinished development work.",
  "- Ctrl+K opens navigation search. The Report sub-rail supports Left and Right Arrow, Home and End. Small screens use the Navigation button and a step strip above each step. Keyboard focus is visible and a skip link leads to main content.", "",
  "## How to read the status labels", "",
  "- **Working locally:** usable with browser-local state; not a production service.",
  "- **Partial:** some actions work, with material workflow or persistence gaps.",
  "- **Demonstration:** illustrates a proposed workflow with synthetic data or unvalidated calculations.", "",
  "The seeded catalogue, market figures and learner examples are illustrative. Uploaded material is user-provided; confirmation does not independently verify a source. No feature status implies WCAG conformance or validated educational predictions.", "",
];
for (const guide of SECTION_GUIDES) {
  lines.push("## " + guide.title, "", "**For:** " + guide.audience + " · **Status:** " + guide.status, "", guide.purpose, "",
    ...guide.steps.map((step, index) => (index + 1) + ". " + step), "",
    "**Output:** " + guide.output, "", "**Current limit:** " + guide.limitation, "");
}
lines.push("## What has not been built yet", "");
for (const item of REMAINING_WORK) lines.push("- **" + item.title + ":** " + item.detail);
lines.push("", "The [implementation plan](lyceum-improvement-plan.md) contains the evidence, mathematical design, provider/subscription options, release phases and audit findings. The lecturer workspace is a first implementation slice of that plan; the full vision remains in development.", "");
const result = lines.join("\n");
const file = new URL("../docs/lecturer-guide.md", import.meta.url);
if (process.argv.includes("--check")) {
  // A Windows checkout may hold the file with CRLF line ends (core.autocrlf); the content is what is compared.
  if (readFileSync(file, "utf8").replace(/\r\n/g, "\n") !== result) throw new Error("Lecturer guide is stale. Run node scripts/generate-guide.mjs.");
  console.log("Lecturer guide matches the in-app section catalogue.");
} else {
  writeFileSync(file, result, "utf8");
  console.log("Wrote docs/lecturer-guide.md");
}
