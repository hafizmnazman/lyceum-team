// Proofs for the Watch step: frozen evidence windows and their comparison.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import {
  changesSinceLastSnapshot, compareEvidenceWindows, confirmProposals, evidenceTrendNote, exportWorkspaceBackup, getState, importCollectedPostings, login,
  prepareEvidenceBrief, previewWorkspaceBackup, removeEvidenceSnapshot, removeEvidenceSource, resetDemoState, restoreWorkspaceBackup, runCollection,
  scanForRequirements, setSkillLexicon, setSkillMapping, setSourcesReviewed, takeEvidenceSnapshot, type CollectRun,
} from "./app/store.ts";
import { CURRENT_ID, compareSnapshots, comparisonMarkdown } from "./lib/snapshots.ts";
import { parseWorkspaceBackup } from "./lib/workspaceBackup.ts";
import type { CollectedPosting, CoverageStage, EvidenceSnapshot } from "./types.ts";

// ---------- pure comparison ----------
function windowOf(label: string, eligible: number, skills: Array<[string, number, CoverageStage?]>, lookedFor: string[], postings: Array<[string, string]> = []): EvidenceSnapshot {
  const ids = Array.from({ length: eligible }, (_, i) => label + "-P" + i);
  return {
    id: "SN-" + label, subjectId: "CS310", label, takenBy: PEOPLE_IDS.sobri, takenAt: "2026-01-01T00:00:00.000Z",
    eligible, organisations: 3, unreviewed: 0, duplicates: 0, contextual: 0, lookedFor,
    skills: skills.map(([key, n, stage]) => ({ key, skill: key, postings: n, required: n, preferred: 0, stage: stage ?? "unknown", target: "practised", sourceIds: ids.slice(0, n) })),
    postings: postings.length ? postings.map(([identity, hash], i) => ({ id: label + "-P" + i, identity, title: identity, organisation: "Acme", url: "", sourceDate: "", textHash: hash }))
      : ids.map((id) => ({ id, identity: "posting:" + id, title: id, organisation: "Acme", url: "", sourceDate: "", textHash: "h" })),
  };
}

test("a change is called only when the 95% intervals separate; a small-sample wobble is no clear change", () => {
  const before = windowOf("S1", 20, [["sql", 2, "introduced"], ["excel", 15], ["python", 3], ["dbt", 0]], ["sql", "excel", "python", "dbt"]);
  const after = windowOf("S2", 20, [["sql", 15, "practised"], ["excel", 2], ["python", 4], ["dbt", 12], ["rust", 9]], ["sql", "excel", "python", "dbt", "rust"]);
  const c = compareSnapshots(before, after);
  const kind = (k: string) => c.skills.find((s) => s.key === k)!;
  assert.equal(kind("sql").kind, "rising");
  assert.equal(kind("excel").kind, "falling");
  assert.equal(kind("python").kind, "steady", "3 of 20 to 4 of 20 must not be reported as a change");
  assert.equal(kind("dbt").kind, "rising"); assert.equal(kind("dbt").newlyQuoted, true);
  assert.equal(kind("rust").kind, "not-comparable", "a skill not looked for earlier has an unknown, not zero, earlier count");
  assert.match(kind("rust").reason, /Not looked for in S1/);
  assert.equal(kind("sql").coverageChanged, true); assert.equal(kind("sql").stageBefore, "introduced"); assert.equal(kind("sql").stageAfter, "practised");
  assert.equal(kind("excel").coverageChanged, false);
  assert.deepEqual(c.counts, { rising: 2, falling: 1, steady: 1, "not-comparable": 1 });
  assert.deepEqual(c.skills.map((s) => s.kind), ["rising", "rising", "falling", "steady", "not-comparable"], "changes are listed first");
  assert.match(c.note, /2 skills rising and 1 falling/);
  assert.match(compareSnapshots(windowOf("A", 20, [["sql", 2]], ["sql"]), windowOf("B", 20, [["sql", 15]], ["sql"])).note, /1 skill rising and 0 falling/);
  const md = comparisonMarkdown(c).join("\n");
  assert.match(md, /\| sql \| 2 of 20 \(10%, .* \| 15 of 20 \(75%, .* \| Rising \|/);
  assert.match(md, /do not overlap/);
});

test("an empty window is not comparable, and postings are matched across windows by identity", () => {
  const empty = compareSnapshots(windowOf("S1", 0, [], ["sql"]), windowOf("S2", 10, [["sql", 9]], ["sql"]));
  assert.equal(empty.comparable, false);
  assert.ok(empty.skills.every((s) => s.kind === "not-comparable"));
  assert.match(empty.note, /Not comparable: S1 has no reviewed postings/);
  const before = windowOf("S1", 3, [], [], [["posting:a", "h1"], ["posting:b", "h2"], ["posting:c", "h3"]]);
  const after = windowOf("S2", 3, [], [], [["posting:a", "h1"], ["posting:b", "CHANGED"], ["posting:d", "h4"]]);
  const c = compareSnapshots(before, after);
  assert.equal(c.carried, 1);
  assert.deepEqual(c.postingsAdded.map((p) => p.identity), ["posting:d"]);
  assert.deepEqual(c.postingsGone.map((p) => p.identity), ["posting:c"]);
  assert.equal(c.textChanged.length, 1); assert.equal(c.textChanged[0].before.textHash, "h2"); assert.equal(c.textChanged[0].after.textHash, "CHANGED");
  assert.match(c.note, /No clear change/);
});

// ---------- the workflow in the store ----------
const T1 = "2026-03-01T03:00:00.000Z", T2 = "2026-09-01T03:00:00.000Z";
const posting = (n: number, text: string, retrievedAt: string): CollectedPosting => ({ id: "sample:x:" + n, provider: "sample", board: "x", title: "Data Analyst " + n, organisation: "Org " + (n % 4),
  location: "KL", url: "https://x/" + n, publishedAt: "", updatedAt: "", text, retrievedAt });
const loaderFor = (postings: CollectedPosting[], retrievedAt: string) => async (_run: Pick<CollectRun, "query">) => ({ ok: true as const, postings, retrievedAt, cached: false, total: postings.length, label: "Test sample" });

async function window(postings: CollectedPosting[], at: string) {
  assert.equal((await runCollection("CS310", { provider: "sample", board: "", query: "", inText: false }, loaderFor(postings, at))).ok, true);
  assert.equal(importCollectedPostings("CS310", postings.map((p) => p.id)).ok, true);
  scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
  const ids = getState().evidenceSources.filter((s) => s.subjectId === "CS310" && !s.reviewed).map((s) => s.id);
  assert.equal(setSourcesReviewed("CS310", ids, true).ok, true);
}
// Semester 1: Excel in 9 of 10 postings, SQL looked for but in none. Semester 2 adds 20 postings: SQL in all, Excel in none.
const SEM1 = Array.from({ length: 10 }, (_, i) => posting(i, (i < 9 ? "Excel modelling is required. " : "") + "Posting number " + i + " for semester one.", T1));
const SEM2 = Array.from({ length: 20 }, (_, i) => posting(100 + i, "SQL is required. Posting number " + (100 + i) + " for semester two.", T2));

async function twoSemesters() {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(setSkillLexicon("CS310", ["SQL", "Excel"]).ok, true);
  await window(SEM1, T1);
  const first = takeEvidenceSnapshot("CS310", "2026 Semester 1");
  assert.equal(first.ok, true);
  return first.snapshotId!;
}

test("a snapshot needs a planner, a distinct name and a reviewed denominator, and it stays frozen", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(takeEvidenceSnapshot("CS310", "Empty").ok, false, "no reviewed posting, no snapshot");
  assert.match((takeEvidenceSnapshot("CS310", "Empty") as { error: string }).error, /no denominator/);
  assert.match(evidenceTrendNote("CS310"), /Trend unavailable/);
  const firstId = await twoSemesters();
  const snap = getState().evidenceSnapshots.find((s) => s.id === firstId)!;
  assert.equal(snap.eligible, 10); assert.equal(snap.postings.length, 10);
  assert.equal(snap.skills.find((s) => s.key === "excel")!.postings, 9); assert.equal(snap.skills.find((s) => s.key === "sql"), undefined);
  assert.deepEqual(snap.lookedFor, ["excel", "sql"]);
  assert.equal(takeEvidenceSnapshot("CS310", " 2026  semester 1 ").ok, false, "names are unique within a course, ignoring case and spacing");
  assert.equal(takeEvidenceSnapshot("CS310", "").ok, false);
  assert.equal(takeEvidenceSnapshot("CS310", "x".repeat(81)).ok, false);
  login(PEOPLE_IDS.lim);
  assert.equal(takeEvidenceSnapshot("CS310", "Not mine").ok, false);
  assert.equal(removeEvidenceSnapshot(firstId).ok, false);
  login(PEOPLE_IDS.sobri);
  const frozen = JSON.stringify(snap);
  removeEvidenceSource(getState().evidenceSources.find((s) => s.subjectId === "CS310")!.id);
  assert.equal(JSON.stringify(getState().evidenceSnapshots.find((s) => s.id === firstId)), frozen, "later edits never rewrite a frozen window");
  assert.equal(changesSinceLastSnapshot("CS310")!.postingsGone.length, 1);
});

test("the next window is compared with the last snapshot, and the brief reports what changed with the rule", async () => {
  const firstId = await twoSemesters();
  await window(SEM2, T2);
  const live = changesSinceLastSnapshot("CS310")!;
  assert.equal(live.after.id, CURRENT_ID); assert.equal(live.after.eligible, 30);
  const sql = live.skills.find((s) => s.key === "sql")!;
  assert.equal(sql.kind, "rising"); assert.equal(sql.newlyQuoted, true); // 0 of 10, looked for, to 20 of 30
  assert.equal(live.skills.find((s) => s.key === "excel")!.kind, "falling"); // 9 of 10 to 9 of 30
  assert.equal(live.postingsAdded.length, 20); assert.equal(live.carried, 10);
  assert.equal(evidenceTrendNote("CS310"), live.note);
  setSkillMapping("CS310", { skill: "SQL", cloIds: [], stage: "introduced", target: "practised", evidence: "Week 4 lab." });
  const brief = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "" });
  const md = getState().evidenceBriefs.find((b) => b.id === brief.briefId)!.markdown;
  assert.match(md, /## Changes since 2026 Semester 1/);
  assert.match(md, /1 skill rising and 1 falling/);
  assert.match(md, /\| SQL \| 0 of 10 .* \| 20 of 30 .* \| Rising \(newly quoted\) \| Unknown \(target Unknown\) to Introduced \(target Practised\) \|/);
  assert.doesNotMatch(md, /Trend unavailable/);
  const second = takeEvidenceSnapshot("CS310", "2026 Semester 2");
  assert.equal(second.ok, true);
  const saved = compareEvidenceWindows("CS310", firstId, second.snapshotId!);
  assert.ok(saved.ok); assert.equal(saved.comparison!.after.label, "2026 Semester 2");
  assert.equal(compareEvidenceWindows("CS310", firstId, firstId).ok, false);
  assert.equal(compareEvidenceWindows("CS310", "SN-missing", CURRENT_ID).ok, false);
});

test("a re-imported posting with new text is reported as changed, not as new", async () => {
  await twoSemesters();
  const source = getState().evidenceSources.find((s) => s.collection?.postingId === "sample:x:5")!;
  removeEvidenceSource(source.id);
  const edited = { ...SEM1[5], text: "Excel modelling is required. This posting was rewritten by the employer.", retrievedAt: T2 };
  await window([edited], T2);
  const c = changesSinceLastSnapshot("CS310")!;
  assert.equal(c.textChanged.length, 1); assert.equal(c.postingsAdded.length, 0); assert.equal(c.postingsGone.length, 0);
  assert.equal(c.textChanged[0].after.title, "Data Analyst 5");
});

test("backups carry snapshots at schema 5, reject inconsistent ones, and older backups restore without them", async () => {
  await twoSemesters();
  const raw = exportWorkspaceBackup(), people = getState().people.map((p) => p.id);
  assert.equal(JSON.parse(raw).schemaVersion, 5);
  assert.equal(JSON.parse(raw).data.events.filter((e: any) => e.kind === "snapshot-frozen").length, 1, "a frozen snapshot is on the event log");
  const parsed = parseWorkspaceBackup(raw, people);
  assert.ok(parsed.ok); assert.equal(parsed.backup.data.evidenceSnapshots.length, 1);
  for (const mutate of [
    (x: any) => { x.data.evidenceSnapshots[0].eligible = 11; },
    (x: any) => { x.data.evidenceSnapshots[0].skills[0].postings = 99; },
    (x: any) => { x.data.evidenceSnapshots[0].skills[0].sourceIds = ["not-a-posting"]; },
    (x: any) => { x.data.evidenceSnapshots[0].subjectId = "NOPE"; },
    (x: any) => { x.data.evidenceSnapshots[0].takenBy = "P-NOBODY"; },
    (x: any) => { x.data.evidenceSnapshots.push({ ...x.data.evidenceSnapshots[0], id: "SN-other" }); },
    (x: any) => { x.data.evidenceSnapshots[0].skills.push(x.data.evidenceSnapshots[0].skills[0]); },
  ]) {
    const candidate = JSON.parse(raw); mutate(candidate);
    assert.equal(parseWorkspaceBackup(JSON.stringify(candidate), people).ok, false, mutate.toString());
  }
  const older = JSON.parse(raw); older.schemaVersion = 3; delete older.data.evidenceSnapshots; delete older.data.briefDecisions; delete older.data.events;
  const restoredOlder = parseWorkspaceBackup(JSON.stringify(older), people);
  assert.ok(restoredOlder.ok); assert.deepEqual(restoredOlder.backup.data.evidenceSnapshots, []);
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const preview = previewWorkspaceBackup(raw); assert.ok(preview.ok);
  assert.equal(restoreWorkspaceBackup(raw, preview.fingerprint, true).ok, true);
  assert.equal(getState().evidenceSnapshots.length, 1);
  assert.equal(changesSinceLastSnapshot("CS310")!.carried, 10);
});
