// Assessment items (depth plan Section 10): deterministic templates per Bloom level with the University of Arkansas verb
// list, the course's recorded misconceptions as distractors and the outcome's words in the stem; a surface lint that names
// each rule and says what no rule can judge; and writers for Moodle XML (multichoice, shortanswer, essay, with the elements
// docs/research/slides-items-and-surveys-tech-2026-10-22.md Section 3 lists), QTI 2.1 (unvalidated: the 1EdTech schema is
// not on this machine) and the rubric grid as spreadsheet rows. An item is drafted for the lecturer's review; the app never
// marks one approved, and a template never writes the key: a deterministic generator cannot know what is true.

import type { BloomLevel, CourseDefinition, CourseOutcome, DraftItem, Person, Rubric, TeachingSession } from "../types.ts";

/** The University of Arkansas verb list (26 July 2022), by level. */
export const BLOOM_VERBS: Record<BloomLevel, string[]> = {
  Remember: ["list", "define", "name", "label", "recall"],
  Understand: ["describe", "explain", "paraphrase", "summarise", "interpret"],
  Apply: ["calculate", "predict", "solve", "demonstrate", "use"],
  Analyse: ["classify", "categorise", "diagram", "break down"],
  Evaluate: ["judge", "defend", "justify", "argue"],
  Create: ["design", "formulate", "compose", "develop"],
};
/** The verb an essay template opens with, one per level, from the list above. */
const ESSAY_VERB: Record<BloomLevel, string> = { Remember: "recall", Understand: "explain", Apply: "demonstrate", Analyse: "break down", Evaluate: "justify", Create: "design" };

export const LEVEL_NOTE = "A verb in a stem does not make an item test that level; the lecturer's review decides what it tests.";
export const LINT_LIMIT = "The lint catches what a rule can catch. It cannot judge whether the key is defensible or the distractors plausible; the lecturer's review does.";
export const MOODLE_LABEL = "Not yet imported into a Moodle; the import test is planned.";
export const QTI_LABEL = "Unvalidated: the 1EdTech QTI 2.1 schema is not on this machine, so the package is checked as well-formed XML only.";
export const KIND_LABEL: Record<DraftItem["kind"], string> = { multichoice: "Multiple choice", shortanswer: "Short answer", essay: "Essay" };

const trimEnd = (s: string) => s.trim().replace(/[.\s]+$/, "");
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- the templates ----------

/** The misconceptions recorded for a session, its own topic's first, then those of the other topics that teach its outcomes. */
export function recordedMisconceptions(definition: CourseDefinition | null, session: Pick<TeachingSession, "topicId" | "week" | "cloIds">): string[] {
  const topics = definition?.topics ?? [];
  const own = topics.find((t) => t.id === session.topicId) ?? topics.find((t) => t.week === session.week);
  const others = topics.filter((t) => t !== own && t.cloIds.some((id) => session.cloIds.includes(id)));
  return [...new Set([own, ...others].flatMap((t) => t?.misconceptions ?? []))];
}

/** Every misconception the course records, for the lint's distractor rule. */
export function courseMisconceptions(definition: CourseDefinition | null): string[] {
  return [...new Set((definition?.topics ?? []).flatMap((t) => t.misconceptions ?? []))];
}

/** Draft items for a session from Lyceum's templates: for each linked outcome (two at most), a multiple-choice item whose
 *  distractors are recorded misconceptions and whose key the lecturer writes, a short answer whose accepted answers the
 *  lecturer writes, and an essay that puts the outcome's words in the stem with a verb from its level. */
export function templateItems(definition: CourseDefinition | null, session: TeachingSession, outcomes: CourseOutcome[], nextId: () => string): DraftItem[] {
  const misconceptions = recordedMisconceptions(definition, session);
  // The session's topic is a title, often with a colon, so it is quoted rather than run into the sentence.
  const topic = "“" + trimEnd(session.topic) + "”";
  const linked = session.cloIds.map((id) => outcomes.find((o) => o.id === id)).filter((o): o is CourseOutcome => Boolean(o)).slice(0, 2);
  const draft = { source: "template" as const, reviewedBy: null, reviewedAt: null };
  return linked.flatMap((o, k) => {
    const distractors = misconceptions.slice(k * 3, k * 3 + 3);
    const at = (session.week + k) % (distractors.length + 1);
    const options = distractors.map((text) => ({ text, correct: false, feedback: "A misconception recorded for this course." }));
    options.splice(at, 0, { text: "", correct: true, feedback: "" });
    return [
      { ...draft, id: nextId(), kind: "multichoice" as const, cloId: o.id, bloomLevel: "Understand" as BloomLevel, marks: 1,
        stem: "Which statement about the topic " + topic + " is accurate?", options },
      { ...draft, id: nextId(), kind: "shortanswer" as const, cloId: o.id, bloomLevel: "Remember" as BloomLevel, marks: 1,
        stem: "In one or two words, name the idea at the centre of this outcome: " + trimEnd(o.text) + ".", answers: [] },
      { ...draft, id: nextId(), kind: "essay" as const, cloId: o.id, bloomLevel: o.bloomLevel, marks: 5, responseLines: 12,
        stem: upperFirst(ESSAY_VERB[o.bloomLevel]) + " how you would " + lowerFirst(trimEnd(o.text)) + ", using an example from the session " + topic + ".",
        graderInfo: "Marked against " + o.label + ": " + trimEnd(o.text) + "." },
    ];
  });
}

// ---------- the lint ----------

export interface LintCheck { rule: string; ok: boolean; note?: string }
/** The rules, each named on screen (Haladyna, Downing and Rodriguez 2002, the ones a rule can enforce). */
export const RULES = {
  stem: "A positive stem that carries the main idea",
  options: "Three or four options",
  key: "One keyed answer, written",
  length: "Options of similar length",
  allNone: "No all or none of the above",
  absolutes: "No absolutes in the options",
  grammar: "No grammar clue",
  misconceptions: "Distractors from recorded misconceptions",
  answers: "Accepted answers written",
  shortAnswers: "Accepted answers of four words or fewer",
  grader: "What the marker looks for, written",
  positions: "Key positions varied",
} as const;

const NEGATIVE = /\b(not|except|never)\b/i;
const ABSOLUTE = /\b(always|never|all|none|every|everyone|everything|nothing|only|completely|absolutely|entirely|certainly)\b/i;
const ALL_NONE = /\b(all|none|both|neither) of the (above|options|answers|following)\b/i;
const normal = (s: string) => trimEnd(s).toLowerCase();

/** One item against the rules for its kind. `misconceptions` are the course's recorded ones. */
export function lintItem(item: DraftItem, misconceptions: string[]): LintCheck[] {
  const words = item.stem.trim().split(/\s+/).filter(Boolean).length;
  const negative = NEGATIVE.exec(item.stem)?.[1];
  const out: LintCheck[] = [{ rule: RULES.stem, ok: words >= 6 && !negative,
    note: words < 6 ? "the stem is under six words" : negative ? "the stem is negative (\"" + negative + "\")" : undefined }];
  if (item.kind === "multichoice") {
    const options = item.options ?? [];
    const texts = options.map((o) => o.text.trim());
    const keys = options.filter((o) => o.correct);
    out.push({ rule: RULES.options, ok: options.length === 3 || options.length === 4, note: options.length === 3 || options.length === 4 ? undefined : options.length + " options" });
    out.push({ rule: RULES.key, ok: keys.length === 1 && keys[0].text.trim().length > 0,
      note: keys.length !== 1 ? keys.length + " keyed" : !keys[0].text.trim() ? "the keyed answer is not written yet" : undefined });
    const lengths = texts.map((t) => t.length);
    const key = keys.length === 1 ? keys[0].text.trim().length : 0;
    const longestDistractor = Math.max(0, ...options.filter((o) => !o.correct).map((o) => o.text.trim().length));
    const similar = lengths.every((n) => n > 0) && Math.max(...lengths) <= 3 * Math.min(...lengths) && key <= 1.5 * longestDistractor;
    out.push({ rule: RULES.length, ok: lengths.length > 0 && similar,
      note: lengths.some((n) => n === 0) ? "an option is empty" : key > 1.5 * longestDistractor ? "the key is the longest by more than half" : similar ? undefined : "the longest option is over three times the shortest" });
    const allNone = texts.find((t) => ALL_NONE.test(t));
    out.push({ rule: RULES.allNone, ok: !allNone, note: allNone ? "\"" + allNone + "\"" : undefined });
    const absolute = texts.map((t) => ABSOLUTE.exec(t)?.[1]).find(Boolean);
    out.push({ rule: RULES.absolutes, ok: !absolute, note: absolute ? "\"" + absolute + "\"" : undefined });
    const article = /\b(an?)\s*[:.]?\s*$/i.exec(item.stem.trim())?.[1]?.toLowerCase();
    const vowel = (t: string) => /^[aeiou]/i.test(t);
    out.push({ rule: RULES.grammar, ok: !article || texts.every((t) => (article === "an") === vowel(t)), note: article ? "the stem ends with \"" + article + "\"" : undefined });
    const recorded = new Set(misconceptions.map(normal));
    const stray = options.filter((o) => !o.correct && !recorded.has(normal(o.text)));
    out.push({ rule: RULES.misconceptions, ok: options.some((o) => !o.correct) && stray.length === 0,
      note: stray.length ? stray.length + (stray.length === 1 ? " distractor is" : " distractors are") + " not a recorded misconception" : undefined });
  } else if (item.kind === "shortanswer") {
    const answers = (item.answers ?? []).map((a) => a.trim()).filter(Boolean);
    out.push({ rule: RULES.answers, ok: answers.length > 0, note: answers.length ? undefined : "no accepted answer is written yet" });
    out.push({ rule: RULES.shortAnswers, ok: answers.every((a) => a.split(/\s+/).length <= 4) });
  } else {
    out.push({ rule: RULES.grader, ok: Boolean(item.graderInfo?.trim()), note: item.graderInfo?.trim() ? undefined : "nothing is written for the marker yet" });
  }
  return out;
}

export const passes = (checks: LintCheck[]) => checks.every((c) => c.ok);

/** The rule over a set: once three or more multiple-choice items are keyed, no one position holds more than half the keys. */
export function lintSet(items: DraftItem[]): LintCheck {
  const positions = items.filter((i) => i.kind === "multichoice").map((i) => (i.options ?? []).findIndex((o) => o.correct)).filter((p) => p >= 0);
  if (positions.length < 3) return { rule: RULES.positions, ok: true, note: "fewer than three keyed multiple-choice items" };
  const counts = new Map<number, number>();
  for (const p of positions) counts.set(p, (counts.get(p) ?? 0) + 1);
  const most = Math.max(...counts.values());
  return { rule: RULES.positions, ok: most <= positions.length / 2, note: most > positions.length / 2 ? most + " of " + positions.length + " keys share one position" : undefined };
}

// ---------- the writers ----------

export interface ItemContext {
  subjectId: string; week: number; topic: string; labels: (cloId: string) => string; people: Person[]; demoLine: string | null;
}
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (s: string) => "<![CDATA[" + s.split("]]>").join("]]]]><![CDATA[>") + "]]>";
const para = (s: string) => cdata("<p>" + xml(s) + "</p>");
const personName = (people: Person[], id: string) => people.find((p) => p.id === id)?.name ?? id;
const itemName = (ctx: ItemContext, n: number) => ctx.subjectId + " W" + String(ctx.week).padStart(2, "0") + " Q" + String(n + 1).padStart(2, "0");

/** Who reviewed a set, by name and date, or that no person has. */
export function reviewLine(items: DraftItem[], people: Person[]): string {
  if (!items.length || items.some((i) => !i.reviewedBy)) return items.some((i) => i.reviewedBy) ? "Partly reviewed: " + items.filter((i) => i.reviewedBy).length + " of " + items.length + " items reviewed by a person." : "Drafted, not reviewed by a person.";
  const by = [...new Set(items.map((i) => personName(people, i.reviewedBy!) + " on " + i.reviewedAt!.slice(0, 10)))];
  return "Reviewed by " + by.join(" and ") + ".";
}

/** Moodle XML for a set of items: UTF-8, the declaration alone on line 1, a category, and each item as multichoice,
 *  shortanswer or essay with the documented elements. Items that fail the lint are the caller's to leave out. */
export function moodleXml(items: DraftItem[], ctx: ItemContext): string {
  const comment = ("Lyceum: " + items.length + " items for " + ctx.subjectId + " week " + ctx.week + ", " + ctx.topic + ", drafted for a lecturer's review. "
    + reviewLine(items, ctx.people) + " " + MOODLE_LABEL + (ctx.demoLine ? " " + ctx.demoLine : "")).replace(/-{2,}/g, "-");
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<!-- " + comment + " -->", "<quiz>",
    '  <question type="category">', "    <category><text>" + xml("$course$/top/" + ctx.subjectId + " week " + ctx.week) + "</text></category>",
    '    <info format="html"><text></text></info>', "  </question>"];
  items.forEach((item, n) => {
    const tags = ["lyceum-drafted", item.reviewedBy ? "reviewed" : "not-reviewed", ctx.labels(item.cloId), item.bloomLevel.toLowerCase()];
    lines.push('  <question type="' + item.kind + '">',
      "    <name><text>" + xml(itemName(ctx, n)) + "</text></name>",
      '    <questiontext format="html"><text>' + para(item.stem) + "</text></questiontext>",
      '    <generalfeedback format="html"><text></text></generalfeedback>',
      "    <defaultgrade>" + item.marks + "</defaultgrade>",
      "    <penalty>" + (item.kind === "essay" ? "0" : "0.3333333") + "</penalty>",
      "    <hidden>0</hidden>",
      "    <idnumber>" + xml(item.id) + "</idnumber>");
    if (item.kind === "multichoice") {
      lines.push("    <single>true</single>", "    <shuffleanswers>true</shuffleanswers>", "    <answernumbering>abc</answernumbering>",
        '    <correctfeedback format="html"><text>Your answer is correct.</text></correctfeedback>',
        '    <partiallycorrectfeedback format="html"><text>Your answer is partially correct.</text></partiallycorrectfeedback>',
        '    <incorrectfeedback format="html"><text>Your answer is incorrect.</text></incorrectfeedback>',
        ...(item.options ?? []).map((o) => '    <answer fraction="' + (o.correct ? 100 : 0) + '" format="html"><text>' + para(o.text) + '</text><feedback format="html"><text>' + (o.feedback ? para(o.feedback) : "") + "</text></feedback></answer>"));
    } else if (item.kind === "shortanswer") {
      lines.push("    <usecase>0</usecase>",
        ...(item.answers ?? []).map((a) => '    <answer fraction="100" format="moodle_auto_format"><text>' + xml(a.trim()) + '</text><feedback format="html"><text></text></feedback></answer>'));
    } else {
      lines.push("    <responseformat>editor</responseformat>", "    <responserequired>1</responserequired>", "    <responsefieldlines>" + (item.responseLines ?? 15) + "</responsefieldlines>",
        "    <minwordlimit></minwordlimit>", "    <maxwordlimit></maxwordlimit>", "    <attachments>0</attachments>", "    <attachmentsrequired>0</attachmentsrequired>",
        "    <maxbytes>0</maxbytes>", "    <filetypeslist></filetypeslist>",
        '    <graderinfo format="html"><text>' + para(item.graderInfo ?? "") + "</text></graderinfo>",
        '    <responsetemplate format="html"><text></text></responsetemplate>');
    }
    lines.push("    <tags>" + tags.map((t) => "<tag><text>" + xml(t) + "</text></tag>").join("") + "</tags>", "  </question>");
  });
  lines.push("</quiz>", "");
  return lines.join("\n");
}

const QTI_NS = 'xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"';
const qtiId = (s: string) => ("I" + s).replace(/[^A-Za-z0-9_.-]/g, "-");

/** One item as a QTI 2.1 assessmentItem: a choice interaction matched to its key, a text entry mapped to its answers, or an
 *  extended text with the marker's guidance in a scorer's rubric block and no automatic scoring. */
export function qtiItemXml(item: DraftItem, title: string): string {
  const head = ['<?xml version="1.0" encoding="UTF-8"?>', "<assessmentItem " + QTI_NS + ' identifier="' + qtiId(item.id) + '" title="' + xml(title) + '" adaptive="false" timeDependent="false">'];
  const score = '  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>';
  if (item.kind === "multichoice") {
    const options = item.options ?? [];
    const key = options.findIndex((o) => o.correct);
    return [...head,
      '  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier"><correctResponse><value>CHOICE_' + (key + 1) + "</value></correctResponse></responseDeclaration>",
      score, "  <itemBody>", '    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">', "      <prompt>" + xml(item.stem) + "</prompt>",
      ...options.map((o, i) => '      <simpleChoice identifier="CHOICE_' + (i + 1) + '">' + xml(o.text) + "</simpleChoice>"),
      "    </choiceInteraction>", "  </itemBody>",
      '  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>', "</assessmentItem>", ""].join("\n");
  }
  if (item.kind === "shortanswer") {
    const answers = (item.answers ?? []).map((a) => a.trim()).filter(Boolean);
    return [...head,
      '  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string">',
      "    <correctResponse>" + answers.slice(0, 1).map((a) => "<value>" + xml(a) + "</value>").join("") + "</correctResponse>",
      '    <mapping defaultValue="0">' + answers.map((a) => '<mapEntry mapKey="' + xml(a) + '" mappedValue="' + item.marks + '" caseSensitive="false"/>').join("") + "</mapping>",
      "  </responseDeclaration>", score,
      "  <itemBody>", "    <p>" + xml(item.stem) + "</p>", '    <p><textEntryInteraction responseIdentifier="RESPONSE" expectedLength="30"/></p>', "  </itemBody>",
      '  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/map_response"/>', "</assessmentItem>", ""].join("\n");
  }
  return [...head,
    '  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>', score,
    "  <itemBody>", '    <rubricBlock view="scorer"><p>' + xml(item.graderInfo ?? "") + "</p></rubricBlock>",
    '    <extendedTextInteraction responseIdentifier="RESPONSE" expectedLines="' + (item.responseLines ?? 15) + '"><prompt>' + xml(item.stem) + "</prompt></extendedTextInteraction>",
    "  </itemBody>", "</assessmentItem>", ""].join("\n");
}

/** A QTI 2.1 content package: one file per item and the IMS manifest that lists them. */
export function qtiPackage(items: DraftItem[], ctx: ItemContext): Map<string, string> {
  const files = new Map<string, string>();
  items.forEach((item, n) => files.set("items/" + qtiId(item.id) + ".xml", qtiItemXml(item, itemName(ctx, n))));
  const manifest = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/qtiv2p1_imscpv1p2_v1p0.xsd" identifier="' + qtiId(ctx.subjectId + "-W" + ctx.week) + '">',
    "  <metadata><schema>QTIv2.1 Package</schema><schemaversion>1.0.0</schemaversion></metadata>", "  <organizations/>", "  <resources>",
    ...[...files.keys()].map((path) => '    <resource identifier="R' + path.replace(/^items\/|\.xml$/g, "") + '" type="imsqti_item_xmlv2p1" href="' + path + '"><file href="' + path + '"/></resource>'),
    "  </resources>", "</manifest>", ""].join("\n");
  files.set("imsmanifest.xml", manifest);
  return files;
}

/** A readable listing of a set: each item with its key or answers, the marker's guidance and its lint, for the course file. */
export function itemsMarkdown(items: DraftItem[], ctx: ItemContext, misconceptions: string[]): string {
  const lines = ["# " + ctx.subjectId + " week " + ctx.week + ": " + ctx.topic + ", the check's items", ""];
  if (ctx.demoLine) lines.push("> " + ctx.demoLine, "");
  lines.push(reviewLine(items, ctx.people) + " " + LEVEL_NOTE + " " + LINT_LIMIT, "", "Exported for Moodle as XML: " + MOODLE_LABEL, "");
  items.forEach((item, n) => {
    const checks = lintItem(item, misconceptions);
    lines.push("## " + (n + 1) + ". " + KIND_LABEL[item.kind] + ", " + ctx.labels(item.cloId) + ", " + item.bloomLevel + ", " + item.marks + (item.marks === 1 ? " mark" : " marks"), "", item.stem, "");
    for (const o of item.options ?? []) lines.push("- " + (o.correct ? "**Key:** " : "") + (o.text || "(the key is not written yet)"));
    if (item.answers) lines.push("Accepted answers: " + (item.answers.join("; ") || "none written yet"));
    if (item.graderInfo !== undefined) lines.push("For the marker: " + (item.graderInfo || "nothing written yet"));
    lines.push("", "Lint: " + (passes(checks) ? "every rule passes." : checks.filter((c) => !c.ok).map((c) => c.rule + (c.note ? " (" + c.note + ")" : "")).join("; ") + "."), "");
  });
  return lines.join("\n");
}

/** The rubric grid as spreadsheet rows (the title, the demo line on a sample, the header, one row per criterion, the total). */
export function rubricRows(rubric: Rubric, labels: (cloId: string) => string, demoLine: string | null): Array<Array<string | number>> {
  return [[rubric.title], ...(demoLine ? [[demoLine]] : []), [],
    ["Criterion", "Marks", "Outcomes", "Capstone", "Milestone 2", "Milestone 1", "Benchmark"],
    ...rubric.criteria.map((c) => [c.name, c.marks, c.cloIds.map(labels).join(", "), ...c.levels]),
    [], ["Total", rubric.criteria.reduce((n, c) => n + c.marks, 0)]];
}
