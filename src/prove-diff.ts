// Proof of the before and after library (depth plan Sections 6.1, 6.2 and 12): the word diff, the topic deltas, the
// structural deck diff on the tour's own end state (the sample workspace), the result deltas with the not-comparable mark,
// the change summary, the decision link read from the event log, the slopegraph's data between two terms and the
// version scrubber's stops.
//   node --test src/prove-diff.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorkspace } from "../mcp/workspace.ts";
import { SAMPLE_PATH } from "../mcp/sample.ts";
import { CS310_BEFORE, cs310After } from "./data/sample-course/cs310.ts";
import { PEOPLE, SEED_RESULT_UPLOADS } from "./data/seed.ts";
import { termResults } from "./lib/attainment.ts";
import { authorisingDecision } from "./lib/decisions.ts";
import { changeSummary, deckDiff, hoursDelta, resultDeltas, topicDeltas, versionChange, versionStops, wordDiff, type DiffRun } from "./lib/diff.ts";
import { withDerivedFields } from "./lib/curriculum.ts";
import { previewSlides } from "./lib/deckLayout.ts";
import { brandFor, packUnderVersion, type DeckSpec } from "./lib/slides.ts";
import { changedOutcomeWeek, sessionInWeek } from "./lib/teachingPlan.ts";
import type { BriefDecision, CourseDefinition, CurriculumDraft, LoopEvent } from "./types.ts";

const side = (runs: DiffRun[], keep: "deleted" | "inserted") => runs.filter((r) => r.kind === "kept" || r.kind === keep).map((r) => r.text).join("");
const loaded = loadWorkspace(SAMPLE_PATH);
if (!loaded.ok) throw new Error(loaded.error);
const d = loaded.backup.data, at = loaded.backup.exportedAt;
const subject = d.subjects.find((s) => s.id === "CS310")!;
const [v1, v2] = d.subjectVersions.filter((v) => v.subjectId === "CS310").sort((a, b) => a.changedAt.localeCompare(b.changedAt));
const sessions = d.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions;
const evidence = { sources: d.evidenceSources, mentions: d.skillMentions, mappings: d.skillMappings };
const pack = (session: (typeof sessions)[number], version: typeof v1) =>
  packUnderVersion(subject, session, version, evidence, PEOPLE, at, brandFor(d.institution, version.definition, subject, session.week, null));
const OLD = "Use charts to tell a data story to a stakeholder audience";
const NEW = OLD + " with dashboards that answer a stakeholder's question";

test("the word diff keeps what stayed, strikes what went and inserts what came, and both texts come back from it", () => {
  const tour = wordDiff(OLD, NEW);
  assert.deepEqual(tour, [{ kind: "kept", text: OLD }, { kind: "inserted", text: " with dashboards that answer a stakeholder's question" }]);
  const swap = wordDiff("Explain a quick chart to a client", "Explain a clear chart to a stakeholder audience");
  assert.deepEqual(swap.filter((r) => r.kind !== "kept").map((r) => r.kind + ":" + r.text), ["deleted:quick", "inserted:clear", "deleted:client", "inserted:stakeholder audience"]);
  for (const [a, b] of [[OLD, NEW], ["Explain a quick chart to a client", "Explain a clear chart to a stakeholder audience"], ["", "New outcome"], ["Removed outcome", ""], ["Same words", "Same words"]]) {
    const runs = wordDiff(a, b);
    assert.equal(side(runs, "deleted"), a, "the old text comes back");
    assert.equal(side(runs, "inserted"), b, "and the new");
    assert.ok(runs.every((r, i) => i === 0 || r.kind !== runs[i - 1].kind), "runs of one kind are merged");
  }
  assert.deepEqual(wordDiff("Same words", "Same words"), [{ kind: "kept", text: "Same words" }]);
  const long = Array.from({ length: 2500 }, (_, i) => "w" + i).join(" ");
  assert.deepEqual(wordDiff(long, long + " more").map((r) => r.kind), ["deleted", "inserted"], "past the alignment limit, the old is struck and the new inserted");
});

test("topic deltas: the tour adds one topic of 3 h, 1 lecture and 2 lab, and leaves the other fourteen unchanged", () => {
  const before = withDerivedFields(CS310_BEFORE), after = withDerivedFields(cs310After());
  const deltas = topicDeltas(before, after);
  const added = deltas.filter((t) => t.status === "added");
  assert.equal(added.length, 1);
  assert.deepEqual([added[0].before, added[0].after, added[0].delta], [null, { contact: 3, lecture: 1, lab: 2 }, 3]);
  assert.equal(deltas.filter((t) => t.status === "unchanged").length, 14);
  assert.equal(deltas.reduce((n, t) => n + t.delta, 0), 3);
  // A changed, a moved and a removed topic, each with the cells to outline.
  const edited: CourseDefinition = structuredClone(before);
  edited.topics[4] = { ...edited.topics[4], contactHours: 5, labHours: 3 };
  edited.topics[8] = { ...edited.topics[8], week: 10 };
  edited.topics.splice(10, 1);
  const e = topicDeltas(before, edited);
  const by = (id: string) => e.find((t) => t.id === id)!;
  assert.deepEqual([by(before.topics[4].id).status, by(before.topics[4].id).changed, by(before.topics[4].id).delta], ["changed", ["contact", "lab"], 1]);
  assert.deepEqual([by(before.topics[8].id).status, by(before.topics[8].id).week], ["moved", { before: 9, after: 10 }]);
  assert.deepEqual([by(before.topics[10].id).status, by(before.topics[10].id).after, by(before.topics[10].id).delta], ["removed", null, -4]);
  assert.deepEqual([hoursDelta(3), hoursDelta(-2), hoursDelta(0), hoursDelta(1.5)], ["+3 h", "-2 h", "no change", "+1.5 h"]);
});

test("the week 6 pack under each version: only the line with CLO5 changes, on the outcomes slide of the lecturer's pack", () => {
  assert.equal(changedOutcomeWeek(v2.definition!, v1.definition!), 6, "the first week that teaches the reworded outcome");
  const own = sessionInWeek(sessions, 6)!;
  assert.equal(own.sample, undefined, "the lecturer's own session comes first");
  const changes = deckDiff(pack(own, v1), pack(own, v2));
  assert.equal(changes.length, 1);
  assert.deepEqual([changes[0].kind, changes[0].title, changes[0].parts], ["changed", "Learning outcomes for this session", [{ part: "body", removed: ["CLO5: " + OLD], added: ["CLO5: " + NEW] }]]);
  const sample = sessions.find((s) => s.sample && s.week === 6)!;
  const sampleChanges = deckDiff(pack(sample, v1), pack(sample, v2));
  assert.deepEqual(sampleChanges.map((c) => c.title), ["Outcomes revisited, and next week"], "the sample week's full pack names the outcomes on its closing slide");
  assert.deepEqual(deckDiff(pack(own, v2), pack(own, v2)), [], "a pack compared with itself has no change");
});

test("every changed part except the notes has a region on its slide's preview to outline", () => {
  for (const session of sessions.filter((s) => s.week === 6 || s.week === 12)) {
    const after = pack(session, v2), slides = previewSlides(after);
    for (const c of deckDiff(pack(session, v1), after))
      for (const p of c.parts) if (p.part !== "notes") assert.ok(slides[c.afterIndex!].regions[p.part], session.id + " " + c.title + " " + p.part);
  }
});

test("slides added and removed are found by title, and a renamed slide in its place is a changed slide", () => {
  const base: DeckSpec = { fileName: "x.pptx", title: "x", author: "x", generatedAt: at, footer: "f", slides: [
    { title: "One", bullets: ["a"] }, { title: "Two", bullets: ["b"] }, { title: "Three", bullets: ["c"] }] };
  const next: DeckSpec = { ...base, slides: [{ title: "One", bullets: ["a"] }, { title: "Two, renamed", bullets: ["b"] }, { title: "Four", bullets: ["d"], placeholder: "A figure" }] };
  const changes = deckDiff(base, next);
  assert.deepEqual(changes.map((c) => c.kind + ":" + c.title), ["changed:Two, renamed", "removed:Three", "added:Four"]);
  assert.deepEqual(changes[0].parts, [{ part: "title", removed: ["Two"], added: ["Two, renamed"] }]);
});

test("result deltas give the change in points, and a reworded outcome is marked not comparable instead of drawn as a change", () => {
  const deltas = resultDeltas(
    [{ cloId: "CLO1", label: "CLO1", text: "Explain", share: 0.55 }, { cloId: "CLO5", label: "CLO5", text: OLD, share: 0.6 }, { cloId: "CLO2", label: "CLO2", text: "Build", share: null }],
    [{ cloId: "CLO1", label: "CLO1", text: "Explain ", share: 0.62 }, { cloId: "CLO5", label: "CLO5", text: NEW, share: 0.7 }, { cloId: "CLO2", label: "CLO2", text: "Build", share: 0.5 }, { cloId: "CLO6", label: "CLO6", text: "New", share: 0.4 }]);
  const by = (id: string) => deltas.find((x) => x.cloId === id)!;
  assert.deepEqual([by("CLO1").comparable, by("CLO1").points], [true, 7], "spacing alone is not a rewording");
  assert.deepEqual([by("CLO5").comparable, by("CLO5").points, by("CLO5").reason], [false, null, "reworded between terms; not comparable"]);
  assert.deepEqual([by("CLO2").comparable, by("CLO2").reason], [false, "no result in one of the terms"]);
  assert.deepEqual([by("CLO6").comparable, by("CLO6").reason, by("CLO6").before], [false, "not assessed in the earlier term", null]);
});

test("the change summary says the tour's change in words, slides included, and says no change when there is none", () => {
  const own = sessionInWeek(sessions, 6)!;
  assert.equal(changeSummary(v1.definition!, v2.definition!, deckDiff(pack(own, v1), pack(own, v2))), "1 outcome reworded, 1 topic added, 3 h added, 1 slide changed");
  assert.equal(changeSummary(v1.definition!, v1.definition!), "no change");
  const two: CourseDefinition = structuredClone(v1.definition!);
  two.outcomes[0] = { ...two.outcomes[0], text: two.outcomes[0].text + " again", bloomLevel: "Create" };
  two.outcomes[1] = { ...two.outcomes[1], text: "Reworded" };
  two.topics = two.topics.slice(0, -1);
  assert.equal(changeSummary(v1.definition!, two), "2 outcomes reworded, 1 outcome at a new Bloom level, 1 topic removed, 1 h removed");
});

test("History's decision link: the tour's version names Dr Rahman's decision, read from the event log, and a change without one names none", () => {
  const found = authorisingDecision(v2.id, d.events, d.briefDecisions, d.curriculumDrafts);
  assert.deepEqual([found?.byPersonId, found?.outcome, found?.courseVersionId], ["P-RAHMAN", "adopt", v1.id]);
  assert.equal(authorisingDecision(v1.id, d.events, d.briefDecisions, d.curriculumDrafts), null, "the first version has no adoption");
  const ev = (kind: LoopEvent["kind"], refs: Partial<LoopEvent["refs"]>): LoopEvent => ({ id: kind + JSON.stringify(refs), at, byPersonId: "P-RAHMAN", kind, refs: { subjectId: "CS310", ...refs } });
  const dec = (id: string, outcome: BriefDecision["outcome"], version = "V1"): BriefDecision => ({ id, briefId: "B", subjectId: "CS310", courseVersionId: version, term: "t", byPersonId: "P-RAHMAN", at, outcome, note: "n" });
  const drafts = [{ id: "R", baselineVersionId: "V1" } as CurriculumDraft];
  const adopt = ev("version-adopted", { versionId: "V2", draftId: "R" });
  assert.equal(authorisingDecision("V2", [ev("decision-recorded", { decisionId: "D1" }), adopt], [dec("D1", "adopt")], drafts)?.id, "D1");
  assert.equal(authorisingDecision("V2", [ev("decision-recorded", { decisionId: "D1" }), ev("decision-recorded", { decisionId: "D2" }), adopt], [dec("D1", "adopt"), dec("D2", "retain")], drafts), null, "an amendment to retain withdraws it");
  assert.equal(authorisingDecision("V2", [ev("decision-recorded", { decisionId: "D1" }), adopt], [dec("D1", "adopt", "V0")], drafts), null, "a decision on another version does not authorise this one");
  assert.equal(authorisingDecision("V2", [adopt, ev("decision-recorded", { decisionId: "D1" })], [dec("D1", "adopt")], drafts), null, "nor does one recorded after the adoption");
  assert.equal(authorisingDecision("V2", [ev("decision-recorded", { decisionId: "D1" }), adopt], [dec("D1", "adopt")], []), null, "nor one without the revision's record");
});

test("the slopegraph's data: each outcome's share at today's pass mark in both terms, in each term's own words, CLO5 not compared", () => {
  const seeded = new Set(SEED_RESULT_UPLOADS.map((u) => u.id));
  const prior = d.resultUploads.find((u) => u.subjectId === "CS310" && seeded.has(u.id))!;
  const current = d.resultUploads.find((u) => u.subjectId === "CS310" && !seeded.has(u.id) && u.rows.some((r) => r.marks))!;
  assert.deepEqual([prior.courseVersionId, current.courseVersionId], [v1.id, v2.id], "last term was taught on the first version, this term on the tour's");
  const clos = d.clos.filter((c) => c.subjectId === "CS310");
  const { passMark, studentShare } = d.institution.kpi;
  const before = termResults(prior, clos, passMark, studentShare, d.subjectVersions);
  const after = termResults(current, clos, passMark, studentShare, d.subjectVersions);
  assert.deepEqual([before.find((r) => r.cloId === "CLO5")?.text, after.find((r) => r.cloId === "CLO5")?.text], [OLD, NEW], "each term's CLO5 in its own version's words");
  const rows = new Map(resultDeltas(before, after).map((r) => [r.label, r]));
  assert.deepEqual([rows.get("CLO5")?.comparable, rows.get("CLO5")?.points, rows.get("CLO5")?.reason], [false, null, "reworded between terms; not comparable"]);
  // Counted by hand from the two sample files: CLO1 28 of 38 then 31 of 38, CLO2 27 then 29, CLO3 24 of 38 then 22 of the
  // 35 with a mark, CLO4 15 then 17.
  assert.deepEqual([rows.get("CLO1")?.before, rows.get("CLO1")?.after], [28 / 38, 31 / 38]);
  assert.deepEqual(["CLO1", "CLO2", "CLO3", "CLO4"].map((l) => [l, rows.get(l)?.comparable, rows.get(l)?.points]),
    [["CLO1", true, 7.9], ["CLO2", true, 5.3], ["CLO3", true, -0.3], ["CLO4", true, 5.3]]);
});

test("the scrubber's stops run oldest first: the first version on record with no change, the tour's with its change in words", () => {
  const change = (v: typeof v1) => versionChange(v, d.subjectVersions, d.events, d.curriculumDrafts, sessions, pack);
  const stops = versionStops([v2, v1], (v) => change(v).summary);
  assert.deepEqual(stops.map((s) => [s.id, s.by, s.when, s.summary]),
    [[v1.id, v1.changedBy, "2026-01-05", null], [v2.id, v2.changedBy, "2026-10-22", "1 outcome reworded, 1 topic added, 3 h added, 1 slide changed"]]);
  const tour = change(v2);
  assert.deepEqual([tour.prev?.id, tour.packSession?.week, tour.packSession?.sample], [v1.id, 6, undefined], "the version it replaced, and the lecturer's own week 6 pack built under both");
});
