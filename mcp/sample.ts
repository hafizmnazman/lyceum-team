// The door's sample workspace (plan Section 15: one dataset for everything):
// the self-driving tour's end state on CS310, built through the same store
// actions the tour drives, from the dated saved sample of the Stripe board and
// the sample results file in public/demo. The store's clock is pinned outside
// the browser, so the file is identical on every run. A real booth run uses a
// fresh export from the app instead (docs/doors.md).
//
// Write it:  node mcp/sample.ts        Check it: node mcp/sample.ts --check
// It writes the same file to public/demo/ too, where the judge's guided walk fetches it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as store from "../src/app/store.ts";
import { PEOPLE_IDS } from "../src/data/seed.ts";
import { interpretLocally } from "../src/agents/intakeLocal.ts";
import { parseSheet } from "../server/parse/sheet.ts";
import type { CollectedPosting } from "../src/types.ts";
import { cs310After } from "../src/data/sample-course/cs310.ts";

const ROOT = new URL("../", import.meta.url);
export const SAMPLE_PATH = fileURLToPath(new URL("mcp/sample-workspace.json", ROOT));
/** The same file where the browser fetches it, for the judge's guided walk (depth plan Section 9.1 item 2). */
export const PUBLIC_SAMPLE_PATH = fileURLToPath(new URL("public/demo/sample-workspace.json", ROOT));

const must = (result: { ok: boolean; error?: string }, step: string) => { if (!result.ok) throw new Error(step + ": " + (result.error ?? "failed")); };

/** Build the tour's end state and return it as a workspace backup, exactly as the app exports one. */
export async function buildSampleBackup(): Promise<string> {
  const sample = JSON.parse(readFileSync(new URL("public/demo/collected-sample.json", ROOT), "utf8")) as { label: string; retrievedAt: string; postings: CollectedPosting[] };
  const S = store.getState;
  store.resetDemoState(); store.login(PEOPLE_IDS.sobri);

  // Course: the term this loop runs for, set first so every record carries it.
  must(store.saveTeachingPlanDetails("CS310", { term: "2026/2027 semester 1", notes: "" }), "term");

  // Watch: the dated saved sample of the Stripe board, every posting kept.
  must(await store.runCollection("CS310", { provider: "sample", board: "", query: "", inText: false },
    async () => ({ ok: true as const, postings: sample.postings, retrievedAt: sample.retrievedAt, cached: false, total: sample.postings.length, label: sample.label })), "collect");
  must(store.importCollectedPostings("CS310", sample.postings.map((p) => p.id)), "import");

  // Report: quotations confirmed, the denominator reviewed, the window frozen, one mapping, the brief sent.
  must(store.setSkillLexicon("CS310", ["SQL", "Python", "dashboards|dashboard", "stakeholders|stakeholder", "statistics|statistical"]), "lexicon");
  store.scanForRequirements("CS310"); store.confirmProposals("CS310", S().scanProposals);
  must(store.setSourcesReviewed("CS310", S().evidenceSources.filter((s) => s.subjectId === "CS310").map((s) => s.id), true), "review");
  must(store.takeEvidenceSnapshot("CS310", "2026 Semester 1 review"), "snapshot");
  must(store.setSkillMapping("CS310", { skill: "dashboards", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 6 lab touches this; no dedicated exercise yet." }), "mapping");
  const brief = store.prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard exercise in week 6 within existing hours; keep the statistics foundation." });
  must(brief, "brief");
  must(store.sendEvidenceBrief(brief.briefId!, [PEOPLE_IDS.rahman]), "send");

  // Decide: the programme owner reads the brief and records a decision with a reason.
  store.login(PEOPLE_IDS.rahman);
  const arrived = S().notifications.find((n) => n.kind === "evidence-brief" && n.toPersonId === PEOPLE_IDS.rahman)!;
  store.openNotification(arrived.id);
  must(store.recordDecision(brief.briefId!, "adopt", "Adopt the dashboard exercise within the existing hours; review after one term."), "decision");

  // Update: the coordinator makes the change the decision approved.
  store.login(PEOPLE_IDS.sobri);
  const started = store.startCurriculumRevision("CS310"); must(started, "revision");
  const draft = S().curriculumDrafts.find((d) => d.id === started.draftId)!;
  // The tour's typed change: CLO5's wording extended, the dashboard topic with three contact hours in the next free slot.
  const definition = cs310After(draft.definition);
  must(store.saveCurriculumRevision(draft.id, draft.revision, { definition, reason: "Adopted by the programme owner on the brief: add a dashboard exercise within the existing hours.", effectiveTerm: "2026/2027 semester 1" }), "save");
  const saved = S().curriculumDrafts.find((d) => d.id === draft.id)!;
  must(store.checkCurriculumRevision(saved.id, saved.revision), "check");
  must(store.adoptCurriculumRevision(saved.id, saved.revision, true), "adopt");

  // Teach: the session and, in the app, its pack.
  must(store.saveTeachingSession("CS310", { week: 6, topic: "Dashboard lab: from a messy dataset to a decision", minutes: 90, cloIds: ["CLO5"],
    activity: "In pairs, build a dashboard from the sample dataset and defend one design choice.", learningCheck: "Exit question: which chart here would mislead a stakeholder, and why?", resources: "", status: "ready" }), "session");

  // Learn: the sample results file, read and interpreted as the app does offline, matched to the version taught.
  const doc = parseSheet(readFileSync(new URL("public/demo/results.xlsx", ROOT)), "results.xlsx", "xlsx");
  store.stagePendingIntake({ ...doc, sample: true }, { ...interpretLocally(doc, S().subjects, S().clos), termGuess: "2026/2027 semester 1" }); // the tour's sample file, filed under this loop's term
  if (!store.confirmPendingIntake()) throw new Error("results: nothing was filed");
  return store.exportWorkspaceBackup();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raw = await buildSampleBackup();
  if (process.argv.includes("--check")) {
    // A Windows checkout may hold the file with CRLF line ends (core.autocrlf); the content is what is compared.
    for (const [path, name] of [[SAMPLE_PATH, "mcp/sample-workspace.json"], [PUBLIC_SAMPLE_PATH, "public/demo/sample-workspace.json"]])
      if (readFileSync(path, "utf8").replace(/\r\n/g, "\n") !== raw) throw new Error(name + " is stale. Run node mcp/sample.ts.");
    console.log("The sample workspace matches the tour's end state, in mcp/ and in public/demo/.");
  } else {
    writeFileSync(SAMPLE_PATH, raw, "utf8");
    writeFileSync(PUBLIC_SAMPLE_PATH, raw, "utf8");
    console.log("Wrote mcp/sample-workspace.json and public/demo/sample-workspace.json (" + raw.length + " characters).");
  }
}
