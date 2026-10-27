import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import {
  confirmProposals, evidenceReportForCourse, exportWorkspaceBackup, getState, importCollectedPostings, login, openNotification,
  prepareEvidenceBrief, previewWorkspaceBackup, recordDecision, resetDemoState, restoreWorkspaceBackup, runCollection, scanForRequirements,
  sendEvidenceBrief, setSkillLexicon, setSourcesReviewed, type CollectRun,
} from "./app/store.ts";
import { classifyRequirement, locateExcerpt, parseLexicon, proposeMentions } from "./lib/evidence.ts";
import { parseWorkspaceBackup, workspaceFingerprint } from "./lib/workspaceBackup.ts";
import type { CollectedPosting } from "./types.ts";

const RETRIEVED = "2026-10-09T03:00:00.000Z";
const SAMPLE: CollectedPosting[] = [
  { id: "sample:x:1", provider: "sample", board: "x", title: "Data Analyst", organisation: "Acme", location: "KL", url: "https://x/1", publishedAt: "2026-09-01T00:00:00.000Z", updatedAt: "",
    text: "We need SQL and Python. Dashboards are a plus.\nCommunicate with stakeholders weekly.", retrievedAt: RETRIEVED },
  { id: "sample:x:2", provider: "sample", board: "x", title: "Data Analyst, Intern", organisation: "Acme", location: "Toronto", url: "https://x/2", publishedAt: "2026-10-01T00:00:00.000Z", updatedAt: "",
    text: "Build dashboards for stakeholders. SQL required. Unique intern text.", retrievedAt: RETRIEVED },
  { id: "sample:x:3", provider: "sample", board: "x", title: "Backend Engineer", organisation: "Acme", location: "Dublin", url: "https://x/3", publishedAt: "", updatedAt: "",
    text: "Write Go services and own their reliability.", retrievedAt: RETRIEVED },
];
const loader = async (run: Pick<CollectRun, "query">) => ({ ok: true as const, postings: SAMPLE.filter((p) => !run.query || p.title.toLowerCase().includes(run.query)), retrievedAt: RETRIEVED, cached: false, total: SAMPLE.length, label: "Test sample" });

async function collected() {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal((await runCollection("CS310", { provider: "sample", board: "", query: "analyst", inText: false }, loader)).ok, true);
  assert.equal(getState().collectRun?.status, "done"); assert.equal(getState().collectRun?.postings.length, 2);
  assert.equal(getState().collectRun?.log.length, 3); assert.match(getState().collectRun!.log[0], /Loading the saved sample/); assert.match(getState().collectRun!.log[2], /Kept 2 of 3/);
  const result = importCollectedPostings("CS310", ["sample:x:1", "sample:x:2"]);
  assert.equal(result.ok, true); assert.equal(result.imported, 2);
  return getState().evidenceSources.filter((s) => s.subjectId === "CS310");
}

test("a research run fetches on request and imports only what the lecturer keeps", async () => {
  const sources = await collected();
  assert.equal(sources.length, 2);
  assert.equal(sources[0].provenance, "collected"); assert.equal(sources[0].collection?.provider, "sample"); assert.equal(sources[0].collection?.postingId, "sample:x:1");
  assert.equal(sources[0].sourceDate, "2026-09-01"); assert.equal(sources[0].url, "https://x/1"); assert.equal(sources[0].reviewed, false);
  const again = importCollectedPostings("CS310", ["sample:x:1"]);
  assert.equal(again.ok, true); assert.equal(again.imported, 0); assert.equal(again.skipped, 1);
  assert.equal(importCollectedPostings("CS310", ["sample:x:999"]).ok, false);
  login(PEOPLE_IDS.lim);
  assert.equal((await runCollection("CS310", { provider: "sample", board: "", query: "", inText: false }, loader)).ok, false);
  assert.equal(importCollectedPostings("CS310", ["sample:x:1"]).ok, false);
  login(PEOPLE_IDS.sobri);
  assert.equal((await runCollection("CS310", { provider: "greenhouse", board: "bad token!", query: "", inText: false }, loader)).ok, false);
});

test("the scan proposes exact sentences and the lecturer confirms them", async () => {
  const sources = await collected();
  assert.deepEqual(parseLexicon(" SQL,, dashboards|dashboard \n stakeholders|stakeholder, sql "), ["SQL", "dashboards|dashboard", "stakeholders|stakeholder"]);
  assert.equal(setSkillLexicon("CS310", parseLexicon("SQL, dashboards|dashboard, stakeholders|stakeholder, Rust")).ok, true);
  const scan = scanForRequirements("CS310");
  assert.equal(scan.ok, true); assert.equal(scan.count, 6);
  for (const proposal of getState().scanProposals) {
    const source = sources.find((s) => s.id === proposal.sourceId)!;
    assert.ok(source.text.includes(proposal.excerpt), "proposal must be an exact substring: " + proposal.excerpt);
    assert.ok(locateExcerpt(source.text, proposal.excerpt).ok);
  }
  const byKey = (skill: string, title: string) => getState().scanProposals.find((p) => p.skill === skill && p.sourceTitle === title)!;
  assert.equal(byKey("dashboards", "Data Analyst").requirement, "preferred");
  assert.equal(byKey("SQL", "Data Analyst, Intern").requirement, "required");
  assert.equal(byKey("SQL", "Data Analyst").requirement, "required");
  assert.equal(byKey("stakeholders", "Data Analyst").excerpt, "Communicate with stakeholders weekly.");
  assert.equal(classifyRequirement("Experience with Tableau is preferred."), "preferred");
  assert.equal(classifyRequirement("Must hold a degree."), "required");
  assert.equal(classifyRequirement("You will use Excel."), "unclear");
  const confirmed = confirmProposals("CS310", getState().scanProposals);
  assert.equal(confirmed.added, 6); assert.equal(confirmed.skipped, 0); assert.equal(getState().scanProposals.length, 0);
  assert.equal(getState().skillMentions.filter((m) => m.subjectId === "CS310").length, 6);
  assert.equal(scanForRequirements("CS310").count, 0);
  assert.equal(proposeMentions(sources, ["sql|structured query language"], getState().skillMentions).length, 0);
  assert.equal(proposeMentions(sources, ["Go"], []).length, 0);
});

test("bulk review makes the postings count and the report shows honest shares", async () => {
  const sources = await collected();
  setSkillLexicon("CS310", ["SQL", "dashboards|dashboard"]); scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
  assert.equal(evidenceReportForCourse("CS310").eligible, 0);
  assert.equal(setSourcesReviewed("CS310", sources.map((s) => s.id), true).ok, true);
  const report = evidenceReportForCourse("CS310");
  assert.equal(report.eligible, 2);
  assert.equal(report.rows.find((r) => r.skill === "SQL")?.postings, 2); assert.equal(report.rows.find((r) => r.skill === "SQL")?.share, 1);
  assert.equal(report.rows.find((r) => r.skill === "dashboards")?.required, 0); assert.equal(report.rows.find((r) => r.skill === "dashboards")?.preferred, 1);
  login(PEOPLE_IDS.lim);
  assert.equal(setSourcesReviewed("CS310", sources.map((s) => s.id), false).ok, false);
});

test("a meeting brief carries the evidence and reaches a colleague's inbox", async () => {
  const sources = await collected();
  setSkillLexicon("CS310", ["SQL", "dashboards|dashboard"]); scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
  setSourcesReviewed("CS310", sources.map((s) => s.id), true);
  const prepared = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard lab in week 6." });
  assert.equal(prepared.ok, true);
  const brief = getState().evidenceBriefs.find((b) => b.id === prepared.briefId)!;
  assert.equal(brief.createdBy, PEOPLE_IDS.sobri); assert.equal(brief.sentAt, null); assert.equal(getState().selectedBriefId, brief.id);
  assert.match(brief.markdown, /# Meeting brief: CS310/); assert.match(brief.markdown, /Small refresh within existing hours \(recommended\)/);
  assert.match(brief.markdown, /2 of 2/); assert.match(brief.markdown, /Add a dashboard lab in week 6\./); assert.match(brief.markdown, /## Appendix: evidence report with receipts/);
  assert.match(brief.markdown, /Test sample/); assert.match(brief.markdown, /convenience sample/);
  assert.equal(sendEvidenceBrief(brief.id, []).ok, false);
  assert.equal(sendEvidenceBrief(brief.id, ["P-NOBODY"]).ok, false);
  const sent = sendEvidenceBrief(brief.id, [PEOPLE_IDS.rahman, PEOPLE_IDS.sobri]);
  assert.equal(sent.ok, true);
  const after = getState().evidenceBriefs.find((b) => b.id === brief.id)!;
  assert.deepEqual(after.recipients, [PEOPLE_IDS.rahman]); assert.ok(after.sentAt);
  const notification = getState().notifications.find((n) => n.kind === "evidence-brief" && n.toPersonId === PEOPLE_IDS.rahman)!;
  assert.ok(notification); assert.equal(notification.briefId, brief.id); assert.equal(notification.subjectId, "CS310");
  assert.equal(sendEvidenceBrief(brief.id, [PEOPLE_IDS.lim]).ok, false);
  login(PEOPLE_IDS.rahman);
  openNotification(notification.id);
  assert.equal(getState().notifications.find((n) => n.id === notification.id)?.read, true);
  assert.equal(getState().selectedBriefId, brief.id); assert.equal(getState().screen, "inbox");
  assert.deepEqual(getState().events.map((e) => [e.kind, e.byPersonId, e.refs.briefId]), [["brief-prepared", PEOPLE_IDS.sobri, brief.id], ["brief-sent", PEOPLE_IDS.sobri, brief.id], ["brief-read", PEOPLE_IDS.rahman, brief.id]],
    "the brief's life is on the event log: prepared, sent and read, each by the person who did it");
  const decided = recordDecision(brief.id, "adopt", "Run the dashboard lab in week 6.");
  assert.equal(decided.ok, true);
  const decision = getState().briefDecisions.find((d) => d.id === decided.decisionId)!;
  assert.deepEqual({ briefId: decision.briefId, subjectId: decision.subjectId, by: decision.byPersonId, outcome: decision.outcome, note: decision.note },
    { briefId: brief.id, subjectId: "CS310", by: PEOPLE_IDS.rahman, outcome: "adopt", note: "Run the dashboard lab in week 6." });
  assert.equal(getState().events.at(-1)!.kind, "decision-recorded"); assert.equal(getState().events.at(-1)!.refs.decisionId, decision.id);
  assert.ok(getState().notifications.some((n) => n.kind === "brief-decision" && n.toPersonId === PEOPLE_IDS.sobri && n.briefId === brief.id), "the author is told");
  assert.equal(prepareEvidenceBrief("CS310", { recommendation: "keep", notes: "" }).ok, false);
  login(PEOPLE_IDS.tan);
  assert.equal(prepareEvidenceBrief("CS310", { recommendation: "keep", notes: "" }).ok, true);
});

test("backups carry briefs, lexicons, decisions and events at schema 6 and older schemas still restore", async () => {
  const sources = await collected();
  setSkillLexicon("CS310", ["SQL"]); scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals); setSourcesReviewed("CS310", sources.map((s) => s.id), true);
  const prepared = prepareEvidenceBrief("CS310", { recommendation: "revise", notes: "" }); sendEvidenceBrief(prepared.briefId!, [PEOPLE_IDS.rahman]);
  login(PEOPLE_IDS.rahman);
  assert.equal(recordDecision(prepared.briefId!, "defer", "Wait for the committee.").ok, true);
  login(PEOPLE_IDS.sobri);
  const raw = exportWorkspaceBackup(), people = getState().people.map((p) => p.id);
  assert.equal(JSON.parse(raw).schemaVersion, 6);
  const parsed = parseWorkspaceBackup(raw, people);
  assert.ok(parsed.ok);
  assert.equal(parsed.backup.data.evidenceBriefs.length, 1); assert.deepEqual(parsed.backup.data.skillLexicon.CS310, ["SQL"]);
  assert.equal(parsed.backup.data.evidenceSources[0].collection?.provider, "sample");
  assert.equal(parsed.backup.data.briefDecisions.length, 1);
  assert.deepEqual(parsed.backup.data.events.map((e) => e.kind), ["brief-prepared", "brief-sent", "decision-recorded"]);
  for (const mutate of [
    (x: any) => { x.data.notifications.find((n: any) => n.kind === "evidence-brief").briefId = "missing"; },
    (x: any) => { x.data.evidenceBriefs[0].recipients = ["P-NOBODY"]; },
    (x: any) => { x.data.skillLexicon.NOPE = ["x"]; },
    (x: any) => { x.data.evidenceSources[0].collection.provider = "linkedin"; },
    (x: any) => { x.data.briefDecisions[0].briefId = "missing"; },
    (x: any) => { x.data.briefDecisions[0].note = "  "; },
    (x: any) => { x.data.briefDecisions[0].outcome = "approve"; },
    (x: any) => { x.data.briefDecisions[0].byPersonId = "P-NOBODY"; },
    (x: any) => { x.data.briefDecisions[0].subjectId = "CS220"; },
    (x: any) => { x.data.events[0].kind = "brief-deleted"; },
    (x: any) => { x.data.events.at(-1).refs.decisionId = "missing"; },
    (x: any) => { x.data.events.push({ ...x.data.events[0] }); },
  ]) {
    const candidate = JSON.parse(raw); mutate(candidate);
    assert.equal(parseWorkspaceBackup(JSON.stringify(candidate), people).ok, false, mutate.toString());
  }
  const four = JSON.parse(raw); four.schemaVersion = 4; delete four.data.briefDecisions; delete four.data.events;
  four.data.notifications = four.data.notifications.filter((n: any) => n.kind !== "brief-decision");
  const restoredFour = parseWorkspaceBackup(JSON.stringify(four), people);
  assert.ok(restoredFour.ok); assert.deepEqual(restoredFour.backup.data.briefDecisions, []); assert.deepEqual(restoredFour.backup.data.events, []);
  const older = JSON.parse(raw); older.schemaVersion = 2;
  for (const key of ["evidenceBriefs", "skillLexicon", "evidenceSnapshots", "briefDecisions", "events"]) delete older.data[key];
  older.data.notifications = older.data.notifications.filter((n: any) => n.kind !== "evidence-brief" && n.kind !== "brief-decision");
  const restoredOlder = parseWorkspaceBackup(JSON.stringify(older), people);
  assert.ok(restoredOlder.ok); assert.deepEqual(restoredOlder.backup.data.evidenceBriefs, []); assert.deepEqual(restoredOlder.backup.data.skillLexicon, {});
  const before = workspaceFingerprint(getState());
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const preview = previewWorkspaceBackup(raw); assert.ok(preview.ok);
  assert.equal(restoreWorkspaceBackup(raw, preview.fingerprint, true).ok, true);
  assert.equal(workspaceFingerprint(getState()), before);
  assert.equal(getState().evidenceBriefs.length, 1); assert.equal(getState().briefDecisions.length, 1); assert.equal(getState().events.length, 3);
});
