// Generates two sample decks into docs/presentation/ from the saved sample
// postings, the same way the app does: a meeting brief deck and a teaching
// pack. Useful to open in PowerPoint before a presentation.
//   node scripts/gen-sample-decks.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { PEOPLE_IDS } from "../src/data/seed.ts";
import {
  confirmProposals, evidenceReportForCourse, getState, importCollectedPostings, login, prepareEvidenceBrief, resetDemoState, runCollection,
  saveTeachingSession, scanForRequirements, setSkillLexicon, setSkillMapping, setSourcesReviewed,
} from "../src/app/store.ts";
import { filterPostings } from "../src/lib/collect.ts";
import { briefDeck, deckBuffer, sessionDeck } from "../src/lib/slides.ts";

const sample = JSON.parse(readFileSync(new URL("../public/demo/collected-sample.json", import.meta.url), "utf8"));
resetDemoState(); login(PEOPLE_IDS.sobri);
await runCollection("CS310", { provider: "sample", board: "", query: "analyst", inText: false }, async (run) => ({
  ok: true, postings: filterPostings(sample.postings, run.query), retrievedAt: sample.retrievedAt, cached: false, total: sample.postings.length, label: sample.label,
}));
importCollectedPostings("CS310", getState().collectRun.postings.map((p) => p.id));
setSkillLexicon("CS310", ["SQL", "Python", "dashboards|dashboard", "stakeholders|stakeholder", "statistics|statistical"]);
scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
setSourcesReviewed("CS310", getState().evidenceSources.map((s) => s.id), true);
setSkillMapping("CS310", { skill: "dashboards", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 6 lab covers charts; no dashboard exercise yet." });
const brief = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard exercise in week 6 within existing hours; keep the statistics foundation." });
saveTeachingSession("CS310", { week: 6, topic: "Dashboard lab: from a messy dataset to a decision", minutes: 90, cloIds: ["CLO5"],
  activity: "In pairs, build a dashboard from the sample dataset and defend one design choice.", learningCheck: "Exit question: which chart here would mislead a stakeholder, and why?",
  resources: "Course notes chapter 6; the postings quoted in this pack.", status: "ready" });
const s = getState(), subject = s.subjects.find((x) => x.id === "CS310"), clos = s.clos.filter((c) => c.subjectId === "CS310"), at = new Date().toISOString();
const report = evidenceReportForCourse("CS310");
const briefSpec = briefDeck(subject, s.evidenceBriefs.find((x) => x.id === brief.briefId), report, s.evidenceSources, s.skillMentions, clos, s.people, at);
const packSpec = sessionDeck(subject, s.teachingPlans.find((p) => p.subjectId === "CS310").sessions[0], clos, report, s.skillMentions, s.evidenceSources, s.people, at);
const out = new URL("../docs/presentation/", import.meta.url);
writeFileSync(new URL("sample-" + briefSpec.fileName, out), await deckBuffer(briefSpec));
writeFileSync(new URL("sample-" + packSpec.fileName, out), await deckBuffer(packSpec));
console.log("wrote sample-" + briefSpec.fileName + " (" + briefSpec.slides.length + " slides) and sample-" + packSpec.fileName + " (" + packSpec.slides.length + " slides)");
