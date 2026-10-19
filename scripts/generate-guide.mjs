import { readFileSync, writeFileSync } from "node:fs";
import { SECTION_GUIDES, REMAINING_WORK } from "../src/app/sectionGuides.ts";

const lines = [
  "# Lyceum: lecturer and section guide", "",
  "Reviewed 11 October 2026. Generated from the same section catalogue used by the in-app **Guide & progress** page. Run `node scripts/generate-guide.mjs` after changing that catalogue.", "",
  "## Start a useful lecturer session", "",
  "1. Start the app (\`npm run dev\`; use \`npm.cmd\` in Windows PowerShell). Choose Dr Sobri or Ms Tan on the demo sign-in page. These are local personas, not authenticated accounts.",
  "2. Open **Courses**. Choose an assigned course or **Create course workspace** to enter a unique code, title and optional programme. A personal workspace is private preparation, not an official university course.",
  "3. Open **Outcomes & topics**. An existing course needs **Start course revision**; a new personal course starts with an empty revision.",
  "4. Record the course brief and only the constraints you know. Add CLO wording, Bloom level, achievement evidence and optional programme-outcome mappings. Add topics, hours, weeks, CLO links and prerequisites. Protect foundational content that must remain.",
  "5. **Save revision**, then **Check saved revision**. Incomplete drafts can be saved. Errors such as broken links, prerequisite cycles and exceeded time budgets block use of the candidate. Unknown budgets and missing evidence remain visible warnings.",
  "6. Inspect **Before and after** and affected teaching work. Record why you are changing the course and the teaching term. Review the acknowledgement, then choose **Use as my course version**. This activates the local outline and preserves the baseline; university approval stays in its existing process. **Discard revision** requires a reason and leaves the current version unchanged.",
  "7. Open **Evidence**. Run a research run against a permitted employer board (Greenhouse or Lever, through the local API) or the dated saved sample, keep the postings worth reading, scan them for the skills you name and confirm each exact quotation (a paraphrase is rejected), mark the extraction reviewed so the postings count, map each quoted skill to an outcome with a reviewed coverage stage and target, then prepare a meeting brief to download or send to a colleague. You can also paste a document you are permitted to keep. Shares show the numerator and denominator with a 95% Wilson interval. Collection happens only when you ask, and nothing changes the course by itself.",
  "8. Open **Teaching plan**. Save course notes and add a session with a week, topic, duration, CLO links, activity and check for understanding. Ready/delivered sessions require preparation details; those checks do not establish teaching effectiveness. Course changes flag affected sessions and assessments for review while retaining the content. **Teaching pack (.pptx)** on any session downloads an editable deck built from the saved session and the evidence linked to its outcomes; the meeting brief also downloads as slides. No model writes a word of either.",
  "9. Use **Export current outline** or **Export plan (.md)** for a readable Markdown document. **History** lets you inspect and export previous course versions and read revision decisions. These documents are not slide decks or restorable backups.",
  "10. In **Guide & progress** or **Courses → Backups**, download a JSON workspace backup. To restore, choose the JSON file, review counts and export date, acknowledge replacement, then restore. Download the pre-restore recovery copy to recover the previous workspace. Backups exclude original uploaded files, credentials and unsaved edits.",
  "11. **Assessment** can prepare a blueprint without a proposal and keeps saved drafts selectable. Item generation uses local templates; exact marks/task/rubric work remains pending. An affected assessment requires a recorded course-change review and repaired links before another submission. **Proposal** retains the prototype review workflow and illustrative forecasts.", "",
  "## Saving and navigation", "",
  "- Courses, saved revisions, version history, plans and notes are kept in this browser. There is one teaching plan per course, shared by its assigned local personas. There is no cross-device sync, separate term archive or institutional database yet.",
  "- Each editor has an explicit Save button. Changing tabs preserves an open editor. Leaving the page/course, switching persona or closing the page warns about unsaved edits. Save before downloading a JSON backup; it contains saved workspace data.",
  "- A visible storage warning means changes cannot survive closing the page. Download a JSON backup or Markdown export while the page is open. A restore that cannot be written to storage leaves the current workspace unchanged.",
  "- Reset workspace removes local saved work and restores seed examples. Download a JSON backup first. A Markdown outline/plan cannot be restored; only the validated JSON workspace format can.",
  "- Play demo is available on sign-in/public screens and Guide & progress. It resets the local workspace; existing saved work triggers a confirmation first. Download a workspace backup before continuing.",
  "- The journey bar in a course workspace and the Start here card on Home read your saved work: a step is done only when the workspace holds its result. **How it works** shows the seven roles and the real record of each step on your course; **Evaluation** shows the live checks and benchmarks.",
  "- Use **How to use [section]** above each signed-in page for contextual instructions. **Guide & progress** includes every section, a role filter, search and unfinished development work.",
  "- Ctrl+K opens navigation search. Course tabs support Left/Right Arrow, Home and End. Small screens use the Navigation button. Keyboard focus is visible and a skip link leads to main content.", "",
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
  if (readFileSync(file, "utf8") !== result) throw new Error("Lecturer guide is stale. Run node scripts/generate-guide.mjs.");
  console.log("Lecturer guide matches the in-app section catalogue.");
} else {
  writeFileSync(file, result, "utf8");
  console.log("Wrote docs/lecturer-guide.md");
}
