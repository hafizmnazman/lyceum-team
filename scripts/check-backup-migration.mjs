// A0, extended in A2a and Track C's D0: prove the backup migration through the real store.
// Schema 6 carries the institution profile; schema 5 files (without it) restore with
// the demo profile, and schema 4 and 3 files (without the decision record and the
// event log, and schema 3 without snapshots) still restore.
// Usage: node scripts/check-backup-migration.mjs   (from the repo root)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2] ?? process.cwd();
const mod = (p) => import(pathToFileURL(join(root, p)).href);
const store = await mod("src/app/store.ts");
const { PEOPLE_IDS } = await mod("src/data/seed.ts");
const sample = JSON.parse(readFileSync(join(root, "public/demo/collected-sample.json"), "utf8"));

let failed = 0;
const check = (name, ok, detail = "") => { console.log((ok ? "PASS  " : "FAIL  ") + name + (detail ? "  (" + detail + ")" : "")); if (!ok) failed++; };
const S = () => store.getState();

// Build real evidence from the saved sample, freeze one snapshot, brief it and record a decision.
store.resetDemoState(); store.login(PEOPLE_IDS.sobri);
store.setSkillLexicon("CS310", ["SQL", "Python", "Tableau"]);
const loader = async () => ({ ok: true, postings: sample.postings, retrievedAt: sample.retrievedAt, cached: false, total: sample.postings.length, label: sample.label });
check("collection from the saved sample", (await store.runCollection("CS310", { provider: "sample", board: "", query: "", inText: false }, loader)).ok);
check("postings imported", store.importCollectedPostings("CS310", sample.postings.map((p) => p.id)).ok);
store.scanForRequirements("CS310"); store.confirmProposals("CS310", S().scanProposals);
const unreviewed = S().evidenceSources.filter((s) => s.subjectId === "CS310" && !s.reviewed).map((s) => s.id);
check("postings marked reviewed", store.setSourcesReviewed("CS310", unreviewed, true).ok);
const snap = store.takeEvidenceSnapshot("CS310", "Migration check");
check("snapshot frozen", snap.ok, snap.error ?? "");
const brief = store.prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Migration check brief." });
check("brief prepared and sent", brief.ok && store.sendEvidenceBrief(brief.briefId, [PEOPLE_IDS.rahman]).ok);
store.login(PEOPLE_IDS.rahman);
check("decision recorded by a recipient", store.recordDecision(brief.briefId, "retain", "Keep the course as it is this term.").ok);
store.login(PEOPLE_IDS.sobri);
const profile = structuredClone(S().institution);
profile.kpi.passMark = 60;
check("the coordinator saves an institution setting (pass mark 60)", store.saveInstitutionProfile(profile).ok);
const counts = () => ({ sources: S().evidenceSources.length, mentions: S().skillMentions.length, snapshots: S().evidenceSnapshots.length, decisions: S().briefDecisions.length, events: S().events.length });
const before = counts();
console.log("Workspace before export:", JSON.stringify(before));

const restore = (raw, label) => {
  store.resetDemoState(); store.login(PEOPLE_IDS.sobri);
  const preview = store.previewWorkspaceBackup(raw);
  check(label + " preview", preview.ok, preview.error ?? "");
  const restored = store.restoreWorkspaceBackup(raw, preview.fingerprint, true);
  check(label + " restore", restored.ok, restored.error ?? "");
};

// Schema 6: export, then restore into a fresh workspace.
const raw6 = store.exportWorkspaceBackup();
const parsed6 = JSON.parse(raw6);
check("export reports schemaVersion 6", parsed6.schemaVersion === 6, String(parsed6.schemaVersion));
check("export carries the snapshot, the decision, the events and the institution profile", parsed6.data.evidenceSnapshots?.length === 1 && parsed6.data.briefDecisions?.length === 1 && parsed6.data.events?.length === before.events && parsed6.data.institution?.kpi?.passMark === 60);
restore(raw6, "schema 6");
check("schema 6 restore keeps sources, quotations, the snapshot, the decision and the events", JSON.stringify(counts()) === JSON.stringify(before), JSON.stringify(counts()));
check("schema 6 restore keeps the institution's saved pass mark", S().institution.kpi.passMark === 60, String(S().institution.kpi.passMark));
const eligible = S().evidenceSnapshots[0].eligible;
check("the restored snapshot still compares with the current evidence (every reviewed posting carried)", store.changesSinceLastSnapshot("CS310")?.carried === eligible, store.changesSinceLastSnapshot("CS310")?.carried + " of " + eligible);
const bad = JSON.parse(raw6); bad.data.institution.kpi.passMark = 500;
store.resetDemoState(); store.login(PEOPLE_IDS.sobri);
check("a schema 6 backup with an impossible pass mark is refused", !store.previewWorkspaceBackup(JSON.stringify(bad)).ok);

// Schema 5: no institution profile yet; the demo profile stands in.
const five = JSON.parse(raw6); five.schemaVersion = 5; delete five.data.institution;
restore(JSON.stringify(five), "schema 5");
check("schema 5 restore keeps sources, quotations, the snapshot, the decision and the events", JSON.stringify(counts()) === JSON.stringify(before), JSON.stringify(counts()));
check("schema 5 restore takes the demo institution profile", S().institution.name.includes("(demo)") && S().institution.kpi.passMark === 55, S().institution.name + ", " + S().institution.kpi.passMark);

// Schema 4: no decision record and no event log yet.
const four = JSON.parse(JSON.stringify(five)); four.schemaVersion = 4; delete four.data.briefDecisions; delete four.data.events;
four.data.notifications = four.data.notifications.filter((n) => n.kind !== "brief-decision");
restore(JSON.stringify(four), "schema 4");
check("schema 4 restore has an empty decision record and event log", S().briefDecisions.length === 0 && S().events.length === 0);
check("schema 4 restore keeps sources, quotations and the snapshot", S().evidenceSources.length === before.sources && S().skillMentions.length === before.mentions && S().evidenceSnapshots.length === 1);

// Schema 3: no snapshots either.
const three = JSON.parse(JSON.stringify(four)); three.schemaVersion = 3; delete three.data.evidenceSnapshots;
restore(JSON.stringify(three), "schema 3");
check("schema 3 restore has empty snapshots", Array.isArray(S().evidenceSnapshots) && S().evidenceSnapshots.length === 0, String(S().evidenceSnapshots?.length));
check("schema 3 restore keeps sources and quotations", S().evidenceSources.length === before.sources && S().skillMentions.length === before.mentions);
check("schema 3 workspace re-exports at schema 6", JSON.parse(store.exportWorkspaceBackup()).schemaVersion === 6);

console.log(failed ? failed + " checks failed" : "BACKUP MIGRATION OK");
process.exit(failed ? 1 : 0);
