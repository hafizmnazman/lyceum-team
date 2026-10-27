// Onboarding's outline import, with a scripted model: what the model returns is checked against the document (an outcome
// is marked as in it or reworded, malformed rows are dropped, Bloom levels normalised), a reply wrapped in prose or a code
// fence still reads, and the accepted rows become the course's first version with its term, through the store.
// Run: node --test src/prove-outline.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { inDocument, jsonFromReply, outlineDefinition, readProposal } from "./lib/outline.ts";
import { readOutline, OUTLINE_PROMPT } from "../server/outline.ts";
import { settingsFromEnv } from "./lib/agentSettings.ts";

const DOC = `CS101 Introduction to Programming. Credits: 3. 14 weeks, 42 contact hours.
Course Learning Outcomes
CLO1: Explain the role of variables, types and control flow in a program.
CLO2 - Write small programs that solve well-defined problems using functions.
Weekly topics: Week 1 Variables and types (3 hours). Week 2 Control flow (3 hours).`;

test("an outcome copied from the document is marked as in it; a reworded or invented one is not", () => {
  assert.equal(inDocument("Explain the role of variables, types and control flow in a program.", DOC), true);
  assert.equal(inDocument("CLO2: Write small programs that solve well-defined problems using functions", DOC), true, "numbering and punctuation aside");
  assert.equal(inDocument("Describe how variables and control flow work in programs.", DOC), false, "reworded");
  assert.equal(inDocument("Design distributed systems.", DOC), false, "invented");
  assert.equal(inDocument("types", DOC), false, "too short to count as a match");
});

test("the model's answer is checked: Bloom levels normalised, malformed rows dropped, topic links kept in range", () => {
  const p = readProposal({
    code: "cs 101", title: "Introduction to Programming", credits: "3", teachingWeeks: 14, contactHours: 42,
    outcomes: [
      { text: "Explain the role of variables, types and control flow in a program.", bloom: "understand" },
      { text: "Write small programs that solve well-defined problems using functions.", bloom: "Analyze" },
      { text: "", bloom: "Apply" }, // too short: dropped
      "not an object", // malformed: dropped
    ],
    topics: [{ title: "Variables and types", hours: 3, week: 1, outcomes: [1, 9] }, { title: "", hours: 3 }],
    programmeOutcomes: ["PLO1 Apply computing knowledge"],
  }, DOC, "cs101-outline.pdf");
  assert.equal(p.code, "CS101");
  assert.equal(p.credits, 3);
  assert.deepEqual(p.outcomes.map((o) => o.bloom), ["Understand", "Analyse"], "lower case and US spelling normalised");
  assert.ok(p.outcomes.every((o) => o.inDocument));
  assert.deepEqual(p.topics, [{ title: "Variables and types", hours: 3, week: 1, outcomes: [1] }], "an empty title dropped, an outcome beyond the list dropped");
  assert.equal(p.source, "cs101-outline.pdf");
  assert.deepEqual(readProposal({ outcomes: "nonsense", credits: -4 }, DOC, "x").outcomes, [], "nonsense reads as nothing found");
});

test("a reply wrapped in a code fence or a sentence still reads; no JSON is an error", () => {
  assert.deepEqual(jsonFromReply('Here it is:\n```json\n{"title":"A"}\n```'), { title: "A" });
  assert.deepEqual(jsonFromReply('Sure! {"title":"B"} Hope that helps.'), { title: "B" });
  assert.throws(() => jsonFromReply("I could not find an outline."), /did not return an outline/);
});

test("readOutline sends the document as data with the prompt, and returns the checked proposal", async () => {
  const seen: string[] = [];
  const chat = async (messages: Array<{ role: string; content: string | null }>) => {
    seen.push(...messages.map((m) => m.role + ":" + (m.content ?? "")));
    return { content: '{"code":"CS101","title":"Intro","outcomes":[{"text":"Explain the role of variables, types and control flow in a program.","bloom":"Understand"},{"text":"Build a web app.","bloom":"Create"}],"topics":[],"programmeOutcomes":[]}' };
  };
  const p = await readOutline(DOC, "outline.pdf", settingsFromEnv({}), chat as never);
  assert.equal(seen[0], "system:" + OUTLINE_PROMPT);
  assert.ok(seen[1].includes("CLO1: Explain the role") && seen[1].includes("outline.pdf"));
  assert.deepEqual(p.outcomes.map((o) => o.inDocument), [true, false], "the invented outcome is flagged for the lecturer");
});

test("the accepted rows become the course's first version with its term, through the store, and the workspace still validates", async () => {
  const { openAccountWorkspace, createCourseWorkspace, applyOnboardingOutline, getState, definitionForCourse } = await import("./app/store.ts");
  const { loopState, termWindow } = await import("./app/loop.ts");
  const { parseWorkspaceBackup, serializeWorkspaceBackup } = await import("./lib/workspaceBackup.ts");
  const user = { id: "7a1b2c3d-0000-4000-8000-000000000000", email: "aina@example.edu", name: "Dr Aina", personId: "U-7a1b2c3d", institution: "UTP", jobRole: "lecturer" as const, onboarded: false };
  openAccountWorkspace(user, null);
  const made = createCourseWorkspace({ code: "CS101", title: "Introduction to Programming", programmeTitle: "Computing", year: 1, semester: 1 });
  assert.equal(made.ok, true);
  const applied = applyOnboardingOutline("CS101", {
    outcomes: [{ text: "Explain the role of variables, types and control flow in a program.", bloom: "Understand" },
      { text: "Write small programs that solve well-defined problems using functions.", bloom: "Apply" }],
    topics: [{ title: "Variables and types", hours: 3, week: 1, outcomes: [1] }, { title: "Functions", hours: 3, week: 2, outcomes: [2] }],
    credits: 3, teachingWeeks: 14, contactHours: 42, programmeOutcomes: ["Apply computing knowledge"], targetRoles: "junior developer roles in Malaysia",
  }, "2026/2027 Semester 1", "cs101-outline.pdf");
  assert.deepEqual(applied, { ok: true });
  const s = getState();
  assert.deepEqual(s.clos.filter((c) => c.subjectId === "CS101").map((c) => c.id), ["CS101-CLO1", "CS101-CLO2"]);
  const def = definitionForCourse("CS101")!;
  assert.deepEqual(def.topics.map((t) => [t.title, t.contactHours, t.cloIds.join()]), [["Variables and types", 3, "CS101-CLO1"], ["Functions", 3, "CS101-CLO2"]]);
  assert.equal(def.brief.targetRoles, "junior developer roles in Malaysia", "where graduates go, for Watch's agent brief");
  assert.equal(def.brief.contactHours, 42);
  assert.equal(termWindow(s, "CS101").term, "2026/2027 Semester 1");
  const loop = loopState(s, "CS101");
  assert.equal(loop.steps.find((x) => x.id === "course")?.done, true, "the Course step is done");
  assert.equal(loop.next, "watch", "and Watch is next");
  assert.match(s.subjectVersions.filter((v) => v.subjectId === "CS101").at(-1)!.reason, /imported from cs101-outline\.pdf/);
  assert.equal(parseWorkspaceBackup(serializeWorkspaceBackup(s, "2026-10-27T08:00:00.000Z"), [user.personId]).ok, true, "the server's validator accepts it");
  assert.deepEqual(outlineDefinition(def, "CS9", { outcomes: [], topics: [{ title: "T", hours: null, week: null, outcomes: [3] }], credits: null, teachingWeeks: null, contactHours: null, programmeOutcomes: [], targetRoles: "" }).topics[0].cloIds, [],
    "a topic naming an outcome that was not kept links to none");
});
