// The teaching material proofs (depth plan Sections 5 and 12): fourteen packs render and unzip, four with full slides and
// ten outline packs that say so; every slide has a unique title and notes; body text is 18 pt or larger; the mark carries its
// alt text in every master and is absent when the profile hides it; every content slide carries the demo line on the sample
// course; the repair for pptxgenjs issue 1449 removes exactly the parts the file declares but does not hold; the preview lists
// the same slides as the file; and sample sessions never count as the term's teaching. Run with `node --test`.

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { DEMO_INSTITUTION } from "./data/institution.ts";
import { DEMO_LINE } from "./data/sample-course/index.ts";
import { CS310_BEFORE, cs310After } from "./data/sample-course/cs310.ts";
import { CS310_SESSIONS } from "./data/sample-course/sessions.ts";
import { PEOPLE_IDS } from "./data/seed.ts";
import { evidenceReportForCourse, getState, login, resetDemoState, saveTeachingSession } from "./app/store.ts";
import { loopState, taughtVersionId } from "./app/loop.ts";
import { runTimeline } from "./app/runs.ts";
import { previewSlides } from "./lib/deckLayout.ts";
import { DECK_FOOTER, OUTLINE_LABEL, brandFor, deckBuffer, renderDeck, repairPptx, sessionDeck, type DeckSpec } from "./lib/slides.ts";
import { planSummary, suggestedWeek } from "./lib/teachingPlan.ts";
import { withDerivedFields } from "./lib/curriculum.ts";
import type { InstitutionProfile, TeachingSession } from "./types.ts";

const MARK = readFileSync(new URL("../public/brand/partners/utp-wide.png", import.meta.url)).toString("base64");
const ALT = DEMO_INSTITUTION.mark.alt;

function packFor(session: TeachingSession, institution: InstitutionProfile = DEMO_INSTITUTION, definition = CS310_BEFORE): DeckSpec {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const s = getState(), subject = s.subjects.find((x) => x.id === "CS310")!;
  return sessionDeck(subject, session, s.clos.filter((c) => c.subjectId === "CS310"), evidenceReportForCourse("CS310"), s.skillMentions, s.evidenceSources, s.people, "2026-10-22T10:00:00Z",
    { definition, brand: brandFor(institution, definition, subject, session.week, MARK) });
}
/** The file read back: each slide's XML, its layout's XML and name, its notes, and the media and content types. */
async function readBack(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const order = (f: string) => Number(f.match(/(\d+)\.\w+$/)?.[1] ?? 0);
  const n = (re: RegExp) => Object.keys(zip.files).filter((f) => re.test(f) && !zip.files[f].dir).sort((a, b) => order(a) - order(b));
  const text = (f: string) => zip.file(f)!.async("string");
  const slides = [];
  for (const f of n(/^ppt\/slides\/slide\d+\.xml$/)) {
    const rels = await text(f.replace("slides/", "slides/_rels/") + ".rels");
    const layoutFile = "ppt/slideLayouts/" + rels.match(/slideLayout\d+\.xml/)![0];
    const layout = await text(layoutFile);
    slides.push({ xml: await text(f), layout, layoutName: layout.match(/<p:cSld name="([^"]+)"/)?.[1] ?? "" });
  }
  return { slides, notes: n(/^ppt\/notesSlides\/notesSlide\d+\.xml$/).length, media: n(/^ppt\/media\//).length, types: await text("[Content_Types].xml"), zip };
}
/** Each shape of a slide, cut at its end, so a table that follows a shape is not read as part of it. */
const shapes = (xml: string) => xml.split("<p:sp>").slice(1).map((part) => part.split("</p:sp>")[0]);
const titleOf = (xml: string) => {
  const sp = shapes(xml).find((part) => /<p:ph\s[^>]*type="title"/.test(part)) ?? "";
  return [...sp.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join("").replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&quot;/g, "\"");
};

test("fourteen sample sessions: full slides for weeks 1, 6, 7 and 12, outline packs for the rest, lab sheets for weeks 1, 6 and 7 and the brief at week 8", () => {
  assert.deepEqual(CS310_SESSIONS.map((s) => s.week), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.deepEqual(CS310_SESSIONS.filter((s) => s.slides?.length).map((s) => s.week), [1, 6, 7, 12]);
  for (const s of CS310_SESSIONS.filter((x) => x.slides?.length)) {
    assert.ok(s.slides!.length >= 6 && s.slides!.length <= 9, "week " + s.week + " has six to nine slides");
    for (const slide of s.slides!) assert.ok(slide.title && slide.notes.length > 30 && (slide.bullets.length || slide.figure), "week " + s.week + ": " + slide.title);
  }
  assert.deepEqual(CS310_SESSIONS.filter((s) => s.labSheet).map((s) => s.week), [1, 6, 7]);
  assert.deepEqual(CS310_SESSIONS.filter((s) => s.projectBrief).map((s) => s.week), [8]);
  for (const s of CS310_SESSIONS) {
    assert.equal(s.sample, true, "every fixture says it is a sample");
    assert.ok(s.topicId && CS310_BEFORE.topics.some((t) => t.id === s.topicId && t.week === s.week), "week " + s.week + " teaches its topic");
    for (const doc of [s.labSheet, s.projectBrief].filter(Boolean)) assert.match(doc!, /Sample, synthetic: written for this prototype/);
  }
  assert.ok(!/dashboard/i.test(JSON.stringify(CS310_SESSIONS.map((s) => ({ ...s, resources: s.week === 12 ? "" : s.resources, slides: (s.slides ?? []).map((x) => ({ ...x, notes: "" })) })))), "before the revision the material teaches no dashboard");
});

test("every pack renders and unzips: fourteen packs, four full and ten outline, each slide with a unique title and its notes", async () => {
  let full = 0, outline = 0;
  for (const session of CS310_SESSIONS) {
    const spec = packFor(session);
    const back = await readBack(await deckBuffer(spec));
    assert.equal(back.slides.length, spec.slides.length, "week " + session.week + ": every slide is in the file");
    assert.equal(back.notes, spec.slides.length, "week " + session.week + ": notes on every slide");
    const titles = back.slides.map((s) => titleOf(s.xml));
    assert.deepEqual(titles, spec.slides.map((s) => s.title), "week " + session.week + ": the titles in order");
    assert.equal(new Set(titles).size, titles.length, "week " + session.week + ": unique titles");
    if (session.slides?.length) { full++; assert.equal(spec.slides.length, session.slides.length + 5, "title, the saved slides, evidence, check, resources, closing"); }
    else { outline++; assert.equal(spec.slides.length, 5); assert.ok(back.slides[2].xml.includes(OUTLINE_LABEL.replace(/'/g, "&apos;")) || back.slides[2].xml.includes(OUTLINE_LABEL), "week " + session.week + " says it is an outline pack"); }
  }
  assert.deepEqual([full, outline], [4, 10]);
});

test("body text is 18 pt or larger; only the slide number, in each master, is smaller", async () => {
  for (const week of [1, 6, 7, 12, 3]) {
    const back = await readBack(await deckBuffer(packFor(CS310_SESSIONS[week - 1])));
    for (const [i, slide] of back.slides.entries()) {
      const sizes = shapes(slide.xml).filter((sp) => !/type="sldNum"/.test(sp)).flatMap((sp) => [...sp.matchAll(/ sz="(\d+)"/g)].map((m) => Number(m[1])));
      assert.ok(sizes.length && Math.min(...sizes) >= 1800, "week " + week + ", slide " + (i + 1) + ": " + Math.min(...sizes) / 100 + " pt");
    }
  }
});

test("the mark sits in every master with its alt text, and the demo line is on every content slide of the sample course", async () => {
  const back = await readBack(await deckBuffer(packFor(CS310_SESSIONS[5])));
  const media = Object.keys(back.zip.files).filter((f) => f.startsWith("ppt/media/") && !back.zip.files[f].dir);
  assert.equal(media.length, 5, "the mark once in each of the five masters");
  for (const f of media) assert.equal(Buffer.from(await back.zip.file(f)!.async("uint8array")).toString("base64"), MARK, f + " is the institution's own PNG, unchanged");
  for (const [i, slide] of back.slides.entries()) {
    assert.ok(slide.layout.includes("descr=\"" + ALT + "\""), "slide " + (i + 1) + ": the mark with its alt text");
    assert.ok(slide.layout.includes(DEMO_LINE), "slide " + (i + 1) + ": the demo line");
    assert.ok(slide.layout.includes("CS310 · week 6"), "slide " + (i + 1) + ": the course and the week");
  }
  assert.deepEqual([...new Set(back.slides.map((s) => s.layoutName))].sort(), ["CLOSING", "CONTENT", "TITLE", "TWO_COLUMN"].sort(), "week 6 uses four of the five masters");
  assert.ok(back.slides.some((s) => /Figure: a monthly series/.test(s.xml)), "the placeholder figure says what it stands for");
});

test("the mark is absent when the profile hides it, and a lecturer's own course keeps the plain line", async () => {
  const hidden = await readBack(await deckBuffer(packFor(CS310_SESSIONS[0], { ...DEMO_INSTITUTION, showMark: false })));
  assert.equal(hidden.media, 0, "no image when showMark is false");
  assert.ok(hidden.slides.every((s) => !s.layout.includes("descr=\"" + ALT)), "no mark in any master");
  assert.ok(hidden.slides.every((s) => s.layout.includes(DEMO_LINE)), "the sample course still says it is a demo");
  const own = await readBack(await deckBuffer(packFor({ ...CS310_SESSIONS[0], sample: false, slides: undefined }, DEMO_INSTITUTION, { ...CS310_BEFORE, sample: false })));
  assert.equal(own.media, 0, "a course that is not the sample carries no mark");
  assert.ok(own.slides.every((s) => !s.layout.includes(DEMO_LINE) && s.layout.includes(DECK_FOOTER)), "and keeps the plain line");
  assert.equal(own.slides.length, 6, "a lecturer's session without slides keeps the six-slide pack");
});

test("pptxgenjs declares parts it does not write (issue 1449); the repair removes exactly those and nothing else", async () => {
  const spec = packFor(CS310_SESSIONS[0]);
  const Pptx = ((await import("pptxgenjs")) as unknown as { default: new () => never }).default;
  const raw = (await (await renderDeck(spec, Pptx) as unknown as { write: (o: { outputType: string }) => Promise<Uint8Array> }).write({ outputType: "nodebuffer" }));
  const missing = async (bytes: Uint8Array) => {
    const zip = await JSZip.loadAsync(bytes);
    const types = await zip.file("[Content_Types].xml")!.async("string");
    return [...types.matchAll(/PartName="([^"]+)"/g)].map((m) => m[1]).filter((p) => !zip.file(p.slice(1)));
  };
  const before = await missing(raw);
  assert.ok(before.length > 0 && before.every((p) => /slideMaster\d+\.xml$/.test(p)), "the fault is there before the repair, and only in the masters' overrides");
  const repaired = await repairPptx(raw);
  assert.deepEqual(repaired.dropped.sort(), before.sort(), "the repair drops those overrides");
  assert.deepEqual(await missing(repaired.bytes), [], "and the file then declares only what it holds");
  const a = await JSZip.loadAsync(raw), b = await JSZip.loadAsync(repaired.bytes);
  assert.deepEqual(Object.keys(b.files).sort(), Object.keys(a.files).sort(), "no part is added or removed");
});

test("the preview lists the same slides as the file, on the same masters, with the mark where the file has it", async () => {
  for (const week of [6, 9]) {
    const spec = packFor(CS310_SESSIONS[week - 1]);
    const preview = previewSlides(spec), back = await readBack(await deckBuffer(spec));
    assert.deepEqual(preview.map((p) => p.title), back.slides.map((s) => titleOf(s.xml)), "week " + week + ": titles");
    assert.deepEqual(preview.map((p) => p.master), back.slides.map((s) => s.layoutName), "week " + week + ": masters");
    assert.ok(preview.every((p) => p.mark), "week " + week + ": the mark on every previewed slide, as in every master");
    assert.ok(preview.filter((p) => p.master !== "TITLE").every((p) => p.texts.some((t) => t.lines.join(" ").includes("A demo course at UTP"))), "the demo line in the previewed footers");
  }
});

test("sample sessions never count as the term's teaching, stay as written, and a new session after the tour's revision starts in week 6", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const plan = () => getState().teachingPlans.find((p) => p.subjectId === "CS310");
  const clos = getState().clos.filter((c) => c.subjectId === "CS310");
  assert.equal(loopState(getState(), "CS310").steps.find((s) => s.id === "teach")!.done, false, "fourteen sample sessions do not tick Teach");
  assert.equal(loopState(getState(), "CS310").steps.find((s) => s.id === "teach")!.count, "0 sessions");
  assert.equal(taughtVersionId(getState(), "CS310"), "CS310-v1", "with only samples, the version taught is the current one");
  const before = planSummary(plan(), clos);
  assert.deepEqual([before.sessions.length, before.samples.length, before.next, before.unmapped.length], [0, 14, undefined, 5], "the summary counts the lecturer's sessions; the samples sit apart");
  assert.equal(runTimeline(getState(), "CS310").filter((e) => e.title.startsWith("Session saved")).length, 0, "the timeline never shows a sample as saved");
  const sample = plan()!.sessions.find((s) => s.sample)!;
  const refused = saveTeachingSession("CS310", { ...sample, topic: "Rewritten in place" });
  assert.equal(refused.ok, false, "a sample session stays as written");
  assert.equal(plan()!.sessions.find((s) => s.id === sample.id)!.topic, sample.topic);
  assert.equal(saveTeachingSession("CS310", { ...sample, id: undefined, topic: "A copy that claims to be a sample", activity: "Do it.", learningCheck: "Show it." }).ok, true);
  const copy = plan()!.sessions.find((s) => s.topic === "A copy that claims to be a sample")!;
  assert.deepEqual([copy.sample, copy.slides, copy.labSheet], [undefined, undefined, undefined], "what a lecturer saves is their own, without the sample text");
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(saveTeachingSession("CS310", { week: 6, topic: "My own session", minutes: 90, cloIds: ["CLO5"], activity: "Build it.", learningCheck: "Explain it.", resources: "", status: "ready" }).ok, true);
  assert.equal(loopState(getState(), "CS310").steps.find((s) => s.id === "teach")!.done, true, "the lecturer's own session does");
  const after = withDerivedFields(cs310After());
  assert.equal(suggestedWeek(CS310_SESSIONS, after, CS310_BEFORE), 6, "the first week that teaches the reworded CLO5");
  assert.equal(suggestedWeek(CS310_SESSIONS, CS310_BEFORE, null), 1, "with no change, the week after the lecturer's own last session, samples aside");
  assert.equal(suggestedWeek([...CS310_SESSIONS, { ...CS310_SESSIONS[2], id: "x", sample: false }], CS310_BEFORE, null), 4);
});
