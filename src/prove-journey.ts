// The guidance proofs: the journey marks a step done only when the workspace
// holds its result, the How it works timeline is derived from records in the
// order they were saved (a saved-sample import is named as such), and every
// figure on the landing page carries a source and a link. Run with `node --test`.

import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import {
  adoptCurriculumRevision, checkCurriculumRevision, confirmProposals, getState, importCollectedPostings, login, prepareEvidenceBrief, resetDemoState,
  runCollection, saveCurriculumRevision, saveTeachingSession, scanForRequirements, setSkillLexicon, setSkillMapping, setSourcesReviewed,
  startCurriculumRevision, type CollectRun,
} from "./app/store.ts";
import { journeyFor, nextJourneyStep } from "./app/journey.ts";
import { runTimeline } from "./app/runs.ts";
import { PAIN_STATS } from "./data/painStats.ts";
import type { CollectedPosting } from "./types.ts";

const RETRIEVED = "2026-10-09T03:00:00.000Z";
const SAMPLE: CollectedPosting[] = [
  { id: "sample:x:1", provider: "sample", board: "x", title: "Data Analyst", organisation: "Acme", location: "KL", url: "https://x/1", publishedAt: "2026-09-01T00:00:00.000Z", updatedAt: "", text: "We need SQL and Python. Dashboards are a plus. Communicate with stakeholders weekly.", retrievedAt: RETRIEVED },
  { id: "sample:x:2", provider: "sample", board: "x", title: "Data Analyst, Intern", organisation: "Acme", location: "Toronto", url: "https://x/2", publishedAt: "2026-10-01T00:00:00.000Z", updatedAt: "", text: "Build dashboards for stakeholders. SQL required. Unique intern text.", retrievedAt: RETRIEVED },
];
const loader = async (_run: Pick<CollectRun, "query">) => ({ ok: true as const, postings: SAMPLE, retrievedAt: RETRIEVED, cached: false, total: 2, label: "Test sample" });
const done = (id: string) => journeyFor(getState(), "CS310").find((s) => s.id === id)!.done;

test("a step is done only when the workspace holds its result; the next step is always the first undone one", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.deepEqual(journeyFor(getState(), null).map((s) => s.done), [false, false, false, false, false, false, false]);
  assert.equal(journeyFor(getState(), "ZZ999")[0].done, false, "an unknown course id is not an open course");
  let steps = journeyFor(getState(), "CS310");
  assert.deepEqual(steps.map((s) => s.done), [true, false, false, false, false, false, false], "a seeded course with its seeded outline counts as opened, nothing more");
  assert.equal(nextJourneyStep(steps)!.id, "outline");

  const started = startCurriculumRevision("CS310");
  assert.equal(started.ok, true);
  assert.equal(done("outline"), false, "a started revision is not a confirmed outline");
  const draft = getState().curriculumDrafts.find((d) => d.id === started.draftId)!;
  const definition = structuredClone(draft.definition);
  definition.outcomes[0].text = definition.outcomes[0].text + " that answer a stakeholder's question";
  assert.equal(saveCurriculumRevision(draft.id, draft.revision, { definition, reason: "Sharpen the outcome wording.", effectiveTerm: "2026-S2" }).ok, true);
  const saved = getState().curriculumDrafts.find((d) => d.id === draft.id)!;
  assert.equal(checkCurriculumRevision(saved.id, saved.revision).ok, true);
  assert.equal(done("outline"), false, "a checked revision is still not adopted");
  assert.equal(adoptCurriculumRevision(saved.id, saved.revision, true).ok, true);
  assert.equal(done("outline"), true);
  assert.equal(nextJourneyStep(journeyFor(getState(), "CS310"))!.id, "collect");

  await runCollection("CS310", { provider: "sample", board: "", query: "", inText: false }, loader);
  assert.equal(done("collect"), false, "fetching alone saves nothing");
  importCollectedPostings("CS310", ["sample:x:1", "sample:x:2"]);
  assert.equal(done("collect"), true);

  setSkillLexicon("CS310", ["SQL", "dashboards|dashboard"]); scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
  assert.ok(getState().skillMentions.some((m) => m.subjectId === "CS310"));
  assert.equal(done("confirm"), false, "quotations on unreviewed postings do not count");
  setSourcesReviewed("CS310", getState().evidenceSources.map((s) => s.id), true);
  assert.equal(done("confirm"), true);

  assert.equal(done("map"), false);
  assert.equal(setSkillMapping("CS310", { skill: "dashboards", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 6 lab covers charts." }).ok, true);
  assert.equal(done("map"), true);

  assert.equal(saveTeachingSession("CS310", { week: 2, topic: "Orientation", minutes: 60, cloIds: [], activity: "", learningCheck: "", resources: "", status: "draft" }).ok, true);
  assert.equal(done("plan"), false, "a session with no outcome link is not a planned class");
  assert.equal(saveTeachingSession("CS310", { week: 6, topic: "Dashboard lab", minutes: 90, cloIds: ["CLO5"], activity: "Build a dashboard in pairs.", learningCheck: "Explain one design choice.", resources: "", status: "ready" }).ok, true);
  assert.equal(done("plan"), true);

  assert.equal(done("brief"), false);
  assert.equal(prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard exercise in week 6." }).ok, true);
  steps = journeyFor(getState(), "CS310");
  assert.deepEqual(steps.map((s) => s.done), [true, true, true, true, true, true, true]);
  assert.equal(nextJourneyStep(steps), null);
});

test("the How it works timeline is derived from saved records, in saved order, and names a sample import as such", async () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.deepEqual(runTimeline(getState(), null), []);
  assert.deepEqual(runTimeline(getState(), "ZZ999"), [], "a course with no records has no timeline");
  const before = runTimeline(getState(), "CS310").length;
  await runCollection("CS310", { provider: "sample", board: "", query: "", inText: false }, loader);
  importCollectedPostings("CS310", ["sample:x:1", "sample:x:2"]);
  setSkillLexicon("CS310", ["SQL", "dashboards|dashboard"]); scanForRequirements("CS310"); confirmProposals("CS310", getState().scanProposals);
  setSourcesReviewed("CS310", getState().evidenceSources.map((s) => s.id), true);
  setSkillMapping("CS310", { skill: "dashboards", cloIds: ["CLO5"], stage: "introduced", target: "practised", evidence: "Week 6 lab covers charts." });
  saveTeachingSession("CS310", { week: 6, topic: "Dashboard lab", minutes: 90, cloIds: ["CLO5"], activity: "Build a dashboard in pairs.", learningCheck: "Explain one design choice.", resources: "", status: "ready" });
  prepareEvidenceBrief("CS310", { recommendation: "refresh", notes: "Add a dashboard exercise in week 6." });
  const events = runTimeline(getState(), "CS310");
  assert.ok(events.length >= before + 5);
  for (let i = 1; i < events.length; i += 1) assert.ok(events[i - 1].at <= events[i].at, "events are in saved order");
  for (const e of events) assert.ok(e.at && e.title && e.detail, "every event has a time, a title and a detail");
  const scout = events.find((e) => e.role === "scout")!;
  assert.ok(scout.title.startsWith("Imported from the dated saved sample, 2 postings kept"), scout.title);
  const quotations = events.find((e) => e.role === "atlas" && e.title.includes("exact quotations confirmed"))!;
  const earliest = getState().skillMentions.filter((m) => m.subjectId === "CS310").map((m) => m.addedAt).sort()[0];
  assert.equal(quotations.at, earliest, "a quotation group carries the time of its first quotation, never a rounded one");
  assert.ok(events.some((e) => e.role === "lens" && e.title.startsWith("Current count over 2 reviewed postings")));
  assert.ok(events.some((e) => e.role === "atlas" && e.title === "Mapped dashboards to CLO5"));
  assert.ok(events.some((e) => e.role === "prism" && e.title === "Session saved: week 6, Dashboard lab"));
  assert.ok(events.some((e) => e.role === "steward" && e.title === "Meeting brief prepared"));
  assert.ok(!events.some((e) => e.title.startsWith("Fetched live")), "nothing was fetched live, so nothing says so");
});

test("every figure on the landing page carries a source and a link, three per scope", () => {
  assert.equal(PAIN_STATS.length, 9);
  for (const scope of ["Malaysia", "Asia", "World"] as const) assert.equal(PAIN_STATS.filter((s) => s.scope === scope).length, 3, scope);
  for (const s of PAIN_STATS) {
    assert.ok(s.value.trim() && s.label.trim() && s.source.trim(), s.label);
    assert.ok(s.url.startsWith("https://"), s.url);
    assert.ok(!new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]").test(s.label + s.source), "no dashes");
  }
  assert.equal(new Set(PAIN_STATS.map((s) => s.scope + s.value)).size, PAIN_STATS.length, "no repeated figure within a scope");
});
