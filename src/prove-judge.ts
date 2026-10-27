// Proof of the judge's way through (depth plan Sections 9.1 and 12): every walk stop's target exists on the screen that renders
// it and its route opens that screen, the captions keep to twenty words with their honesty labels, the host speaks at a walk's
// first and last stop only, the judge's page shows the not-built list word for word, the walk starts from the sample workspace
// with the current one kept, the recap's numbers equal the records they cite, and D6b's three: the programme wall's heat
// table read from the recorded outlines, the kiosk's idle return on time, and the register's figures counting up to exactly
// their values.
//   node --test src/prove-judge.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { SAMPLE_PATH } from "../mcp/sample.ts";
import { recapFor } from "./app/recap.ts";
import { parseRoute } from "./app/routes.ts";
import { navAllows } from "./app/roles.ts";
import { REMAINING_WORK, SECTION_GUIDES } from "./app/sectionGuides.ts";
import { stepDef } from "./app/loop.ts";
import { getRecoveryBackup, getState, login, resetDemoState, restoreSampleWorkspace, saveTeachingSession } from "./app/store.ts";
import { PROOF } from "./data/proof.ts";
import { PEOPLE, PEOPLE_IDS } from "./data/seed.ts";
import { idlePhase, isKioskFilm, KIOSK_IDLE_MS, kioskOn } from "./demo/kiosk.ts";
import { hasSavedWork } from "./demo/savedWork.ts";
import { BEFORE_AFTER, SAMPLE_WORKSPACE_URL, WALK, WALK_PERSON, words, type WalkStop } from "./demo/walk.ts";
import { evidenceReport } from "./lib/evidence.ts";
import { NO_LINKS, NO_OUTLINE, programmeHeat } from "./lib/programme.ts";
import { countedText } from "./ui/motion.ts";
import type { CourseDefinition } from "./types.ts";

const RAW = readFileSync(SAMPLE_PATH, "utf8");
const LABELS = new Set(["Real", "Prototype", "Sample, synthetic", "Synthetic marks", "Planned", "Illustrative"]);
const DASHES = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]"); // built from code points, so this file holds neither
const source = (file: string) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
/** A target is on its screen when the file renders it: the exact id, or for a prefix the id built from it. */
const rendered = (file: string, target: string) => {
  const text = source(file);
  if (!target.endsWith("*")) return text.includes('data-demo-id="' + target + '"') || text.includes('data-demo-id={"' + target + '"}');
  const prefix = target.slice(0, -1);
  return text.includes('data-demo-id={"' + prefix + '" +') || text.includes("data-demo-id={`" + prefix + "${");
};
const screenOf = (stop: WalkStop) => {
  const route = parseRoute(stop.route);
  assert.ok(route, stop.id + ": the route parses");
  return "course" in route ? stepDef(route.course.step).screen : "screen" in route ? route.screen : "recap";
};

test("every stop's target is rendered by the file named for it, and its route opens a screen", () => {
  for (const stop of [...WALK, ...BEFORE_AFTER]) {
    assert.ok(rendered(stop.screen, stop.target), stop.id + ": " + stop.target + " is rendered in " + stop.screen);
    assert.ok(screenOf(stop), stop.id);
  }
  assert.deepEqual(WALK.map((s) => s.id), ["course", "watch", "quote", "count", "decide", "update", "teach", "learn", "history", "home"], "the ten stops in loop order (Section 9.1)");
  assert.deepEqual(WALK.map(screenOf), ["studio", "watch", "report", "report", "decide", "studio", "studio", "learn", "studio", "inbox"]);
});

test("captions keep to twenty words, carry an honesty label from the set, and the host speaks at the first and last stop only", () => {
  for (const walk of [WALK, BEFORE_AFTER]) {
    for (const stop of walk) {
      assert.ok(words(stop.caption) <= 20, stop.id + " has " + words(stop.caption) + " words");
      if (stop.label) assert.ok(LABELS.has(stop.label), stop.id + ": " + stop.label);
      assert.ok(!DASHES.test(stop.caption + (stop.host ?? "")), "no en or em dash");
    }
    assert.deepEqual(walk.map((s) => Boolean(s.host)), walk.map((_, i) => i === 0 || i === walk.length - 1), "the host's lines sit at the two ends");
    assert.ok(walk.every((s) => !s.host || words(s.host) <= 12), "and they greet or sign off, they do not explain");
  }
  for (const id of ["watch", "quote", "count"]) assert.equal(WALK.find((s) => s.id === id)!.label, "Real", "the postings and quotations are real");
  for (const id of ["course", "update", "teach"]) assert.equal(WALK.find((s) => s.id === id)!.label, "Sample, synthetic", "the course record and the packs are a labelled sample");
  assert.equal(WALK.find((s) => s.id === "learn")!.label, "Synthetic marks");
});

test("the judge's page greets once, shows the register's figures and lists REMAINING_WORK word for word", () => {
  const page = source("src/ui/screens/Judge.tsx");
  assert.ok(page.includes("REMAINING_WORK.map((item)") && page.includes("<dt>{item.title}</dt><dd>{item.detail}</dd>"), "the not-built card prints the list as written");
  assert.ok(page.includes("PROOF.map((p)"), "the four figures from the register");
  assert.equal((page.match(/mood="greeting"/g) ?? []).length, 1, "one greeting");
  assert.equal(REMAINING_WORK.length, 8);
  assert.ok(REMAINING_WORK.some((r) => r.detail.includes("One institution profile per workspace works")), "the list says what D0 built, not that it is missing");
  assert.ok(REMAINING_WORK.some((r) => r.title === "Results and student surveys" && r.detail.includes("the OBE course report saved as printed") && r.detail.includes("booth collector")),
    "and what D3a and D4a built, with what stays planned");
  assert.ok(SECTION_GUIDES.some((g) => g.screen === "judge") && SECTION_GUIDES.some((g) => g.screen === "recap"), "both new screens have a section guide");
  assert.equal(SAMPLE_WORKSPACE_URL, "/demo/sample-workspace.json");
  assert.equal(readFileSync(new URL("../public" + SAMPLE_WORKSPACE_URL, import.meta.url), "utf8").replace(/\r\n/g, "\n"), RAW.replace(/\r\n/g, "\n"), "the browser's copy is the sample workspace");
});

test("the walk starts from the sample workspace, signed in as Dr Sobri, with the current workspace kept as the recovery copy", () => {
  resetDemoState(); login(PEOPLE_IDS.tan);
  assert.equal(hasSavedWork(getState()), false, "a fresh workspace holds nothing a person made, sample sessions and all");
  assert.equal(saveTeachingSession("CS310", { week: 3, topic: "Mine", minutes: 60, cloIds: [], activity: "", learningCheck: "", resources: "", status: "draft" }).ok, true);
  assert.equal(hasSavedWork(getState()), true, "a lecturer's session is saved work, so the walk asks first");
  const restored = restoreSampleWorkspace(RAW, WALK_PERSON);
  assert.equal(restored.ok, true);
  const s = getState();
  assert.deepEqual([s.currentPersonId, s.screen], ["P-SOBRI", "inbox"]);
  assert.equal(s.subjectVersions.filter((v) => v.subjectId === "CS310").length, 2, "the tour's end state");
  assert.ok(getRecoveryBackup()?.includes("\"topic\": \"Mine\"") || getRecoveryBackup()?.includes("\"topic\":\"Mine\""), "the workspace it replaced is kept for recovery");
  assert.equal(restoreSampleWorkspace("{ not json", WALK_PERSON).ok, false, "a damaged file restores nothing");
  assert.equal(restoreSampleWorkspace(RAW, "P-NOBODY").ok, false);
});

test("the recap's numbers equal the records they cite", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(restoreSampleWorkspace(RAW, WALK_PERSON).ok, true);
  const s = getState(), at = "2026-10-22T10:00:00Z";
  const recap = recapFor(s, "CS310", at)!;
  const clos = s.clos.filter((c) => c.subjectId === "CS310");
  const report = evidenceReport("CS310", s.evidenceSources, s.skillMentions, s.skillMappings, clos);
  const reviewed = s.evidenceSources.filter((x) => x.subjectId === "CS310" && x.kind === "job-posting" && x.reviewed && !x.duplicateOf).length;
  assert.equal(recap.evidence.reviewed, reviewed, "the reviewed postings, counted from the sources themselves");
  for (const skill of recap.evidence.skills) {
    const row = report.rows.find((r) => r.skill === skill.skill)!;
    const quoting = new Set(s.skillMentions.filter((m) => m.subjectId === "CS310" && m.skill === skill.skill && s.evidenceSources.some((x) => x.id === m.sourceId && x.reviewed && !x.duplicateOf)).map((m) => m.sourceId)).size;
    assert.deepEqual([skill.postings, skill.of], [row.postings, reviewed], skill.skill);
    assert.ok(skill.postings <= quoting, skill.skill + ": no more postings than distinct reviewed sources quoting it");
  }
  const decision = s.briefDecisions.find((d) => d.subjectId === "CS310")!;
  assert.deepEqual([recap.decision?.id, recap.decision?.by, recap.decision?.outcome, recap.decision?.note], [decision.id, "Dr Rahman", "adopt", decision.note]);
  const [v1, v2] = s.subjectVersions.filter((v) => v.subjectId === "CS310").sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  assert.deepEqual([recap.change?.from, recap.change?.to, recap.change?.summary], [v1.id, v2.id, "1 outcome reworded, 1 topic added, 3 h added, 1 slide changed"]);
  const own = s.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.filter((x) => !x.sample);
  assert.deepEqual(recap.taught.map((t) => [t.id, t.week, t.topic, t.versionId]), own.map((x) => [x.id, x.week, x.topic, x.courseVersionId]));
  assert.equal(recap.taught[0].slides, 6, "the lecturer's pack: cover, outcomes, evidence, activity, check, resources");
  assert.equal(recap.samples, s.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.filter((x) => x.sample).length);
  const upload = s.resultUploads.find((u) => u.subjectId === "CS310" && u.uploadedBy === "P-SOBRI")!;
  assert.deepEqual([recap.results?.file, recap.results?.N, recap.results?.versionId, recap.results?.sample], [upload.sourceFileName, Math.max(...upload.rows.map((r) => r.n)), upload.courseVersionId, true]);
  assert.deepEqual(recap.results?.rows.map((r) => [r.mean, r.n]), upload.rows.map((r) => [r.meanScore, r.n]));
  assert.equal(recap.term, "2026/2027 semester 1");
  assert.ok(recap.demoLine?.startsWith("A demo course at UTP"), "the sample course says so on the page");
});

test("the programme wall's heat table reads each course's recorded outline: CS310's links with their strength, seven others with none", () => {
  const d = JSON.parse(RAW).data;
  const rows = programmeHeat(d.programme.plos, d.programme.subjectIds, d.subjects, d.courseDefinitions);
  assert.deepEqual(rows.map((r) => r.subjectId), ["CS101", "MA101", "ST201", "CS220", "MA201", "CS230", "CS310", "CS340"], "the programme's eight courses, in its own order");
  assert.deepEqual(rows.filter((r) => r.subjectId !== "CS310").map((r) => [r.cells, r.note]), Array(7).fill([null, NO_OUTLINE]),
    "a course without a recorded outline says so, and nothing is inferred from its CLOs");
  const cs310 = rows.find((r) => r.subjectId === "CS310")!;
  assert.equal(cs310.note, null);
  assert.deepEqual(cs310.cells!.map((c) => [c.ploId, c.level, c.linked.length]),
    [["PLO1", "H", 1], ["PLO2", "H", 3], ["PLO3", null, 0], ["PLO4", "H", 2], ["PLO5", "H", 2], ["PLO6", "M", 1], ["PLO7", "M", 1], ["PLO8", null, 0]]);
  // Counted by hand from the course record's matrix: PLO2 takes CLO1 at M, CLO3 at H and CLO4 at H, so its strongest is H.
  assert.deepEqual(cs310.cells![1].linked, [{ label: "CLO1", level: "M" }, { label: "CLO3", level: "H" }, { label: "CLO4", level: "H" }]);
  // Links mapped without a strength are shown as linked and never given one; an outline without links says that instead.
  const def: CourseDefinition = structuredClone(d.courseDefinitions.CS310);
  def.outcomes = def.outcomes.map((o) => ({ ...o, ploLinks: undefined }));
  const unrated = programmeHeat(d.programme.plos, ["CS310"], d.subjects, { CS310: def })[0];
  assert.deepEqual([unrated.cells![1].level, unrated.cells![1].linked.length, unrated.note], [null, 3, null]);
  def.outcomes = def.outcomes.map((o) => ({ ...o, ploIds: [] }));
  assert.equal(programmeHeat(d.programme.plos, ["CS310"], d.subjects, { CS310: def })[0].note, NO_LINKS);
});

test("the kiosk is public like the judge's page, Tualang rests on it in silence, and an idle visitor is back at thirty seconds after ten of warning", () => {
  assert.deepEqual(parseRoute("#/kiosk"), { screen: "kiosk" });
  for (const p of PEOPLE) assert.ok(navAllows(p, [], "kiosk"), p.id + " may open the kiosk");
  const kiosk = source("src/ui/screens/Kiosk.tsx");
  assert.ok(kiosk.includes('mood="resting"') && !/mood="(greeting|celebrating|reflecting)"/.test(kiosk), "Tualang rests and says nothing");
  assert.equal(KIOSK_IDLE_MS, 30_000);
  assert.deepEqual([0, 19_999].map((ms) => idlePhase(ms).kind), ["active", "active"]);
  assert.deepEqual([idlePhase(20_000), idlePhase(29_001)], [{ kind: "warning", secondsLeft: 10 }, { kind: "warning", secondsLeft: 1 }]);
  assert.deepEqual([30_000, 45_000].map((ms) => idlePhase(ms).kind), ["return", "return"]);
  assert.equal(kioskOn(), false, "kiosk mode is off until the kiosk opens in a tab");
  assert.ok(SECTION_GUIDES.some((g) => g.screen === "kiosk"), "the kiosk has its section guide");
  const film = { file: "loop90-720p.mp4", renderedAt: "2026-10-22T06:33:50.039Z", sha256: "a".repeat(64), bytes: 2823642 };
  assert.equal(isKioskFilm(film), true, "the record scripts/kiosk-film.mjs writes beside the render");
  for (const bad of [null, { ...film, file: "../secret.mp4" }, { ...film, file: "loop90.webm" }, { ...film, renderedAt: "yesterday" }, { ...film, bytes: "2" }])
    assert.equal(isKioskFilm(bad), false, JSON.stringify(bad));
});

test("the register's figures count up to exactly their values and never past them, separators and decimals kept", () => {
  for (const p of PROOF) {
    assert.equal(countedText(p.value, 1), p.value, p.claim + " ends on the register's value");
    assert.match(countedText(p.value, 0), /^[^1-9]*$/, p.claim + " starts from zero");
    const final = Number(p.value.replace(/,/g, ""));
    for (let k = 0; k <= 1; k += 0.05) assert.ok(Number(countedText(p.value, k).replace(/,/g, "")) <= final, p.claim + " never passes " + p.value);
  }
  assert.equal(countedText("1,034 postings", 0.5), "517 postings");
  assert.equal(countedText("2,000 of 9,000", 0.75), "1,500 of 6,750");
  assert.deepEqual([countedText("7.9 points", 0), countedText("7.9 points", 1)], ["0.0 points", "7.9 points"]);
});
