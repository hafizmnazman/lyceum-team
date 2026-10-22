import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import { PEOPLE_IDS } from "./data/seed.ts";
import {
  confirmProposals, evidenceReportForCourse, getState, importCollectedPostings, login, prepareEvidenceBrief, resetDemoState, runCollection,
  saveTeachingSession, scanForRequirements, setSkillLexicon, setSkillMapping, setSourcesReviewed, type CollectRun,
} from "./app/store.ts";
import { briefDeck, deckBuffer, sessionDeck } from "./lib/slides.ts";
import type { CollectedPosting } from "./types.ts";

const RETRIEVED = "2026-10-09T03:00:00.000Z";
const SAMPLE: CollectedPosting[] = [
  { id: "sample:x:1", provider: "sample", board: "x", title: "Data Analyst", organisation: "Acme", location: "KL", url: "https://x/1", publishedAt: "2026-09-01T00:00:00.000Z", updatedAt: "", text: "We need SQL and Python. Dashboards are a plus. Communicate with stakeholders weekly.", retrievedAt: RETRIEVED },
  { id: "sample:x:2", provider: "sample", board: "x", title: "Data Analyst, Intern", organisation: "Acme", location: "Toronto", url: "https://x/2", publishedAt: "2026-10-01T00:00:00.000Z", updatedAt: "", text: "Build dashboards for stakeholders. SQL required. Unique intern text.", retrievedAt: RETRIEVED },
];
const loader = async (_run: Pick<CollectRun, "query">) => ({ ok: true as const, postings: SAMPLE, retrievedAt: RETRIEVED, cached: false, total: 2, label: "Test sample" });

async function prepared() {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  await runCollection("CS310", { provider: "sample", board: "", query: "", inText: false }, loader);
  importCollectedPostings("CS310", ["sample:x:1", "sample:x:2"]);
  setSkillLexicon("CS310", ["SQL", "dashboards|dashboard"]); scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
  setSourcesReviewed("CS310", getState().evidenceSources.map((s) => s.id), true);
  setSkillMapping("CS310", { skill: "dashboards", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 6 lab covers charts." });
  const brief = prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard exercise in week 6." });
  saveTeachingSession("CS310", { week: 6, topic: "Dashboard lab", minutes: 90, cloIds: ["CLO5"], activity: "Build a dashboard from a messy dataset in pairs.", learningCheck: "Explain one design choice and what it hides.", resources: "Course notes chapter 6.", status: "ready" });
  return brief.briefId!;
}
async function slideTexts(buffer: Uint8Array) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const texts = await Promise.all(names.map((n) => zip.file(n)!.async("string")));
  const notes = Object.keys(zip.files).filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n));
  const charts = Object.keys(zip.files).filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n));
  const layouts = await Promise.all(Object.keys(zip.files).filter((n) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n)).map((n) => zip.file(n)!.async("string")));
  return { count: names.length, texts, notes: notes.length, charts: charts.length, layouts, strip: (xml: string) => xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") };
}

test("the meeting brief renders as an editable deck with the table and every receipt", async () => {
  const briefId = await prepared();
  const state = getState(), subject = state.subjects.find((s) => s.id === "CS310")!, brief = state.evidenceBriefs.find((b) => b.id === briefId)!;
  const spec = briefDeck(subject, brief, evidenceReportForCourse("CS310"), state.evidenceSources, state.skillMentions, state.clos.filter((c) => c.subjectId === "CS310"), state.people, "2026-10-09T04:00:00Z");
  assert.equal(spec.fileName, "CS310-meeting-brief.pptx");
  assert.equal(spec.slides.length, 8 + 2);
  assert.equal(spec.slides[0].kind, "title");
  assert.deepEqual(spec.slides[3].table!.rows.map((r) => r[0]), ["dashboards", "SQL"]);
  assert.equal(spec.slides[3].table!.rows[0][1], "2 of 2");
  assert.deepEqual(spec.slides[4].chart!.categories, ["dashboards", "SQL"]); assert.deepEqual(spec.slides[4].chart!.values, [2, 2]); assert.equal(spec.slides[4].chart!.max, 2);
  assert.ok(spec.slides[6].bullets!.some((b) => b === "Small refresh within existing hours (recommended)"));
  assert.ok(spec.slides[8].bullets!.some((b) => b.includes("\"SQL required.\" (SQL, required)") || b.includes("\"We need SQL and Python.\" (SQL, required)")));
  const deck = await slideTexts(await deckBuffer(spec));
  assert.equal(deck.count, 10); assert.equal(deck.notes, 10); assert.equal(deck.charts, 1);
  assert.match(deck.strip(deck.texts[0]), /CS310 Data Visualisation|CS310/); assert.match(deck.strip(deck.texts[1]), /Decision requested/);
  assert.match(deck.strip(deck.texts[3]), /2 of 2/); assert.match(deck.strip(deck.texts[8]), /Receipt: Data Analyst/);
  assert.match(deck.strip(deck.texts[4]), /The same counts as a picture/);
  assert.match(deck.strip(deck.texts[7]), /convenience sample/);
  assert.match(deck.strip(deck.texts[9]), /SQL required/);
});

test("a saved session renders as a teaching pack with its outcomes and the evidence behind them", async () => {
  await prepared();
  const state = getState(), subject = state.subjects.find((s) => s.id === "CS310")!, session = state.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => s.topic === "Dashboard lab")!;
  const spec = sessionDeck(subject, session, state.clos.filter((c) => c.subjectId === "CS310"), evidenceReportForCourse("CS310"), state.skillMentions, state.evidenceSources, state.people, "2026-10-09T04:00:00Z");
  assert.equal(spec.fileName, "CS310-week-6-teaching-pack.pptx");
  assert.equal(spec.slides.length, 6);
  assert.ok(spec.slides[1].bullets![0].startsWith("CLO5: "));
  assert.ok(spec.slides[2].bullets![0].startsWith("dashboards: 2 of 2 reviewed postings"));
  assert.ok(spec.slides[2].bullets![1].startsWith("  \""));
  assert.deepEqual(spec.slides[3].paragraphs, ["Build a dashboard from a messy dataset in pairs."]);
  const deck = await slideTexts(await deckBuffer(spec));
  assert.equal(deck.count, 6);
  assert.match(deck.strip(deck.texts[0]), /week 6: Dashboard lab/); assert.match(deck.strip(deck.texts[2]), /dashboards: 2 of 2/);
  assert.match(deck.strip(deck.texts[4]), /Explain one design choice/);
  assert.ok(deck.layouts.some((l) => /Generated by Lyceum from saved data/.test(l)), "the footer, in the masters (depth plan Section 5.2)");
});

test("a session with no linked evidence says so instead of inventing content", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  saveTeachingSession("CS310", { week: 1, topic: "Intro", minutes: 60, cloIds: [], activity: "", learningCheck: "", resources: "", status: "draft" });
  const state = getState(), subject = state.subjects.find((s) => s.id === "CS310")!, session = state.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => s.topic === "Intro")!;
  const spec = sessionDeck(subject, session, state.clos.filter((c) => c.subjectId === "CS310"), evidenceReportForCourse("CS310"), [], [], state.people, "2026-10-09T04:00:00Z");
  assert.deepEqual(spec.slides[1].bullets, ["No course outcome linked yet. Link one in the teaching plan."]);
  assert.match(spec.slides[2].bullets![0], /No evidence is linked/);
  assert.deepEqual(spec.slides[3].paragraphs, ["Add an activity students will take part in."]);
});
