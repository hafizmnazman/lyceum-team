import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import { PEOPLE_IDS } from "../shared/data/seed.ts";
import {
  confirmProposals, evidenceReportForCourse, getState, importCollectedPostings, login, prepareEvidenceBrief, resetDemoState, runCollection,
  addSlideRound, exportWorkspaceBackup, markSlideSuggestion, saveTeachingSession, scanForRequirements, sessionSuggestionRequest, setSessionSlides, setSkillLexicon, setSkillMapping, setSourcesReviewed, type CollectRun,
} from "../web/src/app/store.ts";
import { DECK_FOOTER, MAX_DECK_SLIDES, MAX_SLIDE_CHARS, PRISM_FOOTER, SLIDES_TO_ADD, briefDeck, deckBuffer, readSlideSuggestions, sessionDeck } from "../shared/lib/slides.ts";
import { footerText } from "../shared/lib/deckLayout.ts";
import { suggestSlides } from "../api/llm.ts";
import { settingsFromEnv } from "../shared/lib/agentSettings.ts";
import { parseWorkspaceBackup } from "../shared/lib/workspaceBackup.ts";
import type { CollectedPosting } from "../shared/types.ts";

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

test("slides Prism drafted before it suggested instead: still labelled on every slide, and discarded on request", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveTeachingSession("CS310", { week: 6, topic: "Dashboard lab", minutes: 90, cloIds: ["CLO5"], activity: "Build a dashboard in pairs.", learningCheck: "Exit question.", resources: "", status: "ready" }).ok, true);
  const own = () => getState().teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => !s.sample && s.week === 6)!;
  const slides = [{ title: "Start from the stakeholder's question", bullets: ["Name the decision", "Then pick the chart"], notes: "Ask who reads it." }];
  assert.equal(setSessionSlides("CS310", own().id, slides).ok, true);
  const report = evidenceReportForCourse("CS310"), clos = getState().clos.filter((c) => c.subjectId === "CS310");
  const deck = sessionDeck(getState().subjects.find((x) => x.id === "CS310")!, own(), clos, report, getState().skillMentions, getState().evidenceSources, getState().people, "2026-10-28T00:00:00Z");
  assert.equal(footerText(deck).endsWith(PRISM_FOOTER), true, "every slide says the text was drafted by the model");
  assert.equal(setSessionSlides("CS310", own().id, null).ok, true);
  const plain = sessionDeck(getState().subjects.find((x) => x.id === "CS310")!, own(), clos, report, getState().skillMentions, getState().evidenceSources, getState().people, "2026-10-28T00:00:00Z");
  assert.equal(footerText(plain).endsWith(DECK_FOOTER), true, "back to the generator's own line");
  assert.deepEqual(plain.slides.slice(1).map((x) => x.title), SLIDES_TO_ADD, "the slides to add are the pack's record-built slides, after its cover");
});

test("Prism's suggestions are checked against the session's records: a real slide, a known kind, and the record named in the reason", () => {
  const base = { course: "CS310 Data Mining", topic: "Evaluating classifiers", minutes: 90, activity: "Pairs compute precision and recall.", learningCheck: "Which metric for fraud?",
    outcomes: [{ label: "CLO2", text: "Evaluate classifiers" }], topicNotes: { activities: "", readings: "", misconceptions: ["Accuracy alone shows a model is good on imbalanced data."] },
    evidence: [{ skill: "Model evaluation", postings: 7, eligible: 20, quote: "Evaluate ML models with precision and recall." }], toAdd: SLIDES_TO_ADD };
  const deck = { ...base, deck: ["Title", "Accuracy", "Confusion matrix", "Summary"] };
  const s = (x: Record<string, unknown>) => ({ text: "Do something useful here", why: "Because CLO2 asks for it", cites: "outcome", ...x });
  const read = readSlideSuggestions({ suggestions: [
    s({ kind: "change", slide: 2, why: "Recorded misconception: accuracy alone shows a model is good on imbalanced data.", cites: "misconception" }),
    s({ kind: "add", slide: 3, text: "Add the employer evidence slide", why: "Model evaluation: 7 of 20 postings", cites: "evidence" }),
    s({ kind: "add", slide: 0, why: "CLO2 first" }),
    s({ kind: "Layout", slide: 3, why: "Too many bullets to read", cites: null }),
    s({ kind: "pacing", slide: null, why: "No activity in the first hour", cites: null }),
    s({ kind: "change", slide: 9 }),
    s({ kind: "remove", slide: null }),
    s({ kind: "change", slide: 1, why: "Employers want SQL", cites: "evidence" }),
    s({ kind: "change", slide: 1, why: "It reads better", cites: null }),
    s({ kind: "segment", minutes: 10 }),
    s({ kind: "rewrite", slide: 1 }),
  ] }, deck);
  assert.deepEqual(read.map((x) => [x.kind, x.slide, x.after]), [["change", 2, false], ["add", 3, true], ["add", 0, true], ["layout", 3, false], ["pacing", null, false]],
    "a slide past the deck, a removal with no slide, evidence not in the records, content without a citation, a plan segment on a deck, an unknown kind: all dropped");
  const plan = readSlideSuggestions({ suggestions: [
    s({ kind: "segment", minutes: 15, outcome: "clo2" }), s({ kind: "segment", minutes: 20, why: "The pairs activity", cites: "session" }),
    s({ kind: "segment", minutes: 200 }), s({ kind: "segment", minutes: null }), s({ kind: "change", slide: 1 }),
  ] }, { ...base, deck: null });
  assert.deepEqual(plan.map((x) => [x.kind, x.minutes, x.outcome, x.slide]), [["segment", 15, "CLO2", null], ["segment", 20, null, null]], "without a deck, only timed segments within the session");
  assert.deepEqual(readSlideSuggestions({ nope: 1 }, deck), []);
});

test("suggestions: an unreadable answer is asked once more, then an error; long decks are cut to size", async () => {
  const request = { course: "CS310", topic: "T", minutes: 60, activity: "Pairs", learningCheck: "", outcomes: [{ label: "CLO1", text: "x" }], topicNotes: { activities: "", readings: "", misconceptions: [] },
    evidence: [], toAdd: SLIDES_TO_ADD, deck: Array.from({ length: 120 }, (_, i) => "Slide " + (i + 1) + " " + "x".repeat(2000)) };
  const st = settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "m" });
  const sent: string[] = [];
  const ok = await suggestSlides(st, request, async (m) => { // the deck arrives cut to size, and still whole JSON
    sent.push(m[1].content ?? "");
    assert.match(m[0].content ?? "", /You never write the slides/);
    return { content: sent.length === 1 ? "I would change a few things." : JSON.stringify({ suggestions: [{ kind: "change", slide: 60, text: "Tighten the last slide", why: "CLO1 again", cites: "outcome" }] }) };
  });
  assert.deepEqual([sent.length, ok.length, ok[0].slide], [2, 1, 60]);
  const seen = JSON.parse(sent[0]) as { deck: string[] };
  assert.deepEqual([seen.deck.length, seen.deck[0].length], [MAX_DECK_SLIDES, MAX_SLIDE_CHARS]);
  await assert.rejects(suggestSlides(st, request, async () => ({ content: JSON.stringify({ suggestions: [{ kind: "change", slide: 999, text: "nowhere at all", why: "CLO1", cites: "outcome" }] }) })), /no suggestion Lyceum could check/);
});

test("rounds of suggestions on the lecturer's own session: marked done or dismissed with a reason, kept as history, in the backup", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveTeachingSession("CS310", { week: 6, topic: "Dashboard lab", minutes: 90, cloIds: ["CLO5"], activity: "Build a dashboard in pairs.", learningCheck: "Exit question.", resources: "", status: "ready" }).ok, true);
  const own = () => getState().teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => !s.sample && s.week === 6)!;
  const request = sessionSuggestionRequest("CS310", own().id, ["Title", "Charts"]);
  assert.ok(typeof request !== "string");
  assert.deepEqual([request.topic, request.outcomes.map((o) => o.label), request.deck, request.toAdd], ["Dashboard lab", ["CLO5"], ["Title", "Charts"], SLIDES_TO_ADD]);
  assert.ok(request.topicNotes.misconceptions.length > 0, "the topic's recorded misconceptions go to Prism");
  const one = { kind: "change" as const, slide: 2, after: false, minutes: null, outcome: null, text: "Show one chart per question", why: "CLO5 asks for chart choice", cites: "outcome" as const };
  assert.equal(addSlideRound("CS310", own().id, { fileName: "week6.pptx", slides: ["Title", "Charts"] }, []).ok, false);
  assert.equal(addSlideRound("CS310", own().id, { fileName: "week6.pptx", slides: ["Title", "Charts"] }, [one, { ...one, slide: 1, text: "Add the evidence slide after the title" }]).ok, true);
  const [round] = own().slideRounds!;
  assert.deepEqual(round.suggestions.map((x) => x.status), ["open", "open"]);
  assert.equal(markSlideSuggestion("CS310", own().id, round.id, round.suggestions[0].id, "done").ok, true);
  assert.equal(markSlideSuggestion("CS310", own().id, round.id, round.suggestions[1].id, "dismissed", "  we cover it in week 7  ").ok, true);
  assert.deepEqual(own().slideRounds![0].suggestions.map((x) => [x.status, x.reason]), [["done", undefined], ["dismissed", "we cover it in week 7"]]);
  assert.equal(markSlideSuggestion("CS310", own().id, round.id, round.suggestions[1].id, "open").ok, true);
  assert.deepEqual(own().slideRounds![0].suggestions[1].reason, undefined, "reopened: the reason goes with the dismissal");
  assert.equal(markSlideSuggestion("CS310", own().id, round.id, "SUG-nope", "done").ok, false);
  assert.equal(addSlideRound("CS310", own().id, null, [{ ...one, kind: "segment", slide: null, minutes: 20, outcome: "CLO5" }]).ok, true, "a plan without a deck");
  assert.deepEqual(own().slideRounds!.map((r) => [r.deck?.fileName ?? null, r.suggestions.length]), [["week6.pptx", 2], [null, 1]], "the earlier round stays, oldest first");
  assert.equal(saveTeachingSession("CS310", { ...own(), topic: "Dashboard lab, revised" }).ok, true);
  assert.equal(own().slideRounds?.length, 2, "editing the session keeps the rounds");
  assert.ok(parseWorkspaceBackup(exportWorkspaceBackup(), getState().people.map((p) => p.id)).ok, "a backup with rounds validates");
  const sample = getState().teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((x) => x.sample)!;
  assert.equal(addSlideRound("CS310", sample.id, null, [one]).ok, false, "samples stay as written");
});
