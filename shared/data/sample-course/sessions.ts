// CS310's teaching sessions for the term (depth plan Section 5.1): one per week of the schedule, all labelled sample
// and written by the build session for this prototype (the owner's answer to Section 18 item 1, 22 October 2026).
// Weeks 1, 6, 7 and 12 carry full slides with speaker notes in a lecturer's voice; the other ten carry none, so the
// generator builds an outline pack from the topic record and says so. Lab sheets for weeks 1, 6 and 7 and the
// project brief at week 8. None of it is a lecturer's own work, and none of it counts as this term's teaching.

import type { SlideDraft, TeachingPlan, TeachingSession } from "../../types.ts";
import { CS310_BEFORE } from "./cs310.ts";
import { WEEK_7_QUIZ } from "./quiz.ts";

const PREPARED_AT = "2026-09-01T00:00:00Z"; // before the term, so the sessions are the plan the term starts from
const BY = "P-SOBRI";

const WEEK_1: SlideDraft[] = [
  { title: "A chart answers a question", bullets: [
    "Every chart in this course starts from a question someone needs answered",
    "One table can answer many questions, and each needs its own chart",
    "Today: what a chart is for, and how we judge whether it works",
  ], notes: "Open with the question, not the tool. Ask the room for the last chart they looked at and what they wanted from it; write two answers on the board and come back to them at the end." },
  { title: "Three questions before any chart", bullets: [
    "What: what kind of data is in front of us?",
    "Why: what is the reader trying to do: look something up, compare, find a trend?",
    "How: which marks and channels will carry it?",
  ], notes: "This is the what, why and how framework from Munzner 2014, and the whole course hangs on it. Stress that the why comes before the how." },
  { title: "One table, two questions", bullets: ["Question: which region sold most?", "Task: compare", "Chart: bars, sorted"], right: ["Question: did sales grow each month?", "Task: follow a trend", "Chart: a line over time"],
    notes: "Same twelve rows on both sides. Let students argue for the chart before you show it; the point is that the question picked the chart." },
  { title: "What a good chart gets right", bullets: [
    "It answers the question it was made for",
    "A reader gets the answer without decoding the legend twice",
    "It shows where the data came from and how sure we are",
    "It still works for a reader with colour-vision deficiency",
  ], notes: "These four lines return as criteria in the critique essay and the project rubric. Keep them on the wall." },
  { title: "Traps we will learn to avoid", bullets: [
    "Starting from the tool's default chart",
    "Decorating instead of encoding",
    "Choosing the chart before stating the question",
  ], notes: "Show one example of each from the course notes. Do not name the publisher; the aim is to see the pattern, not to shame anyone." },
  { title: "The course in three blocks", bullets: ["Fourteen weeks, five outcomes, one project"], figure: { kind: "table", header: ["Weeks", "Focus"], rows: [
    ["1 to 4", "Abstraction, perception, colour and accessibility"],
    ["5 to 11", "Charts for comparison, time, interaction, maps, networks and uncertainty"],
    ["12 to 14", "Data stories, the project studio and the defence"],
  ], alt: "The fourteen weeks in three blocks with their focus" }, notes: "Point to where each outcome is assessed: the labs from week 2, the quizzes in weeks 7 and 12, the essay in week 9, the project from week 8." },
  { title: "In the lab today", bullets: [
    "Install the course tool chain from the course page",
    "Reproduce the first chart from the supplied notebook",
    "Write one sentence: the question your chart answers",
  ], notes: "Lab sheet 1 has the steps. Nothing is marked this week; the aim is that every student leaves with a working setup." },
];

const WEEK_6: SlideDraft[] = [
  { title: "Time has a direction", bullets: [
    "Time is ordered, so readers expect earlier on the left and later on the right",
    "Most questions about time are about change: a trend, a season, a break",
    "Today: lines, seasonality and small multiples",
  ], notes: "Start with a monthly series on the screen and ask what changed. Collect three different answers; each is a different question." },
  { title: "Line or bar?", bullets: [
    "A line for continuous change across many points",
    "Bars for counts in a few separate periods",
    "Never join points that are not a sequence",
  ], notes: "The classic error is a line through categories. Show it once, then never again." },
  { title: "Seeing the season", bullets: [
    "A yearly cycle can hide the trend beneath it",
    "Plot each month across the years to see the season",
    "Or take the season out and show what is left",
  ], figure: { kind: "placeholder", label: "Figure: a monthly series with its yearly cycle marked, drawn in the lab from this week's dataset" },
    notes: "Do the seasonal plot live if the projector allows; otherwise describe it and let the lab show it." },
  { title: "Small multiples", bullets: [
    "One small chart per category, all on the same scale",
    "The eye compares shapes across the panels",
    "Shared axes keep the comparison honest",
  ], notes: "Tufte's term. The key decision is the shared scale; free scales make every panel look equally dramatic." },
  { title: "Two y-axes, one trap", bullets: ["Two scales chosen freely", "Any crossing point can be manufactured", "Readers compare heights that mean nothing"],
    right: ["Index both series to 100", "Or two panels on one time axis", "Say the units in the title"],
    notes: "Ask a volunteer to move one axis and make the lines cross. The room will see why the chart proves nothing." },
  { title: "Annotate the change", bullets: [
    "Mark the event that explains a break",
    "Put the label on the line, not in a legend",
    "One annotation the reader needs beats five they do not",
  ], notes: "This is the habit the project report is marked on under clarity: the reader should not have to guess why the line moved." },
  { title: "In the lab today", bullets: [
    "Build small multiples of a monthly series by region",
    "Annotate one change for a reader",
    "Lab 5 is assessed: submit the notebook by the end of the week",
  ], notes: "Lab sheet 5 has the dataset and the steps. Walk the room at the half hour and ask each pair what their annotation explains." },
];

const WEEK_7: SlideDraft[] = [
  { title: "Quiz first, then the workshop", section: true, bullets: [
    "Quiz 1: thirty minutes at the start of the lecture slot",
    "Then: how charts mislead, and how to say so precisely",
  ], notes: "Hand out the quiz as students arrive. Collect it before you start the slides." },
  { title: "Five ways a chart misleads", bullets: [
    "A bar chart whose axis does not start at zero",
    "Areas that grow faster than the numbers they show",
    "A time window picked to tell one story",
    "Two y-axes that manufacture a crossing",
    "A colour scale with no neutral middle",
  ], notes: "Each of these appears in this afternoon's workshop charts. Do not give away which is which." },
  { title: "Misleading, or just zoomed?", bullets: ["Bars encode length, so they start at zero", "A cut axis exaggerates every difference"],
    right: ["Lines encode position, so they may zoom", "Say so on the axis and in the title"],
    notes: "The rule is about the channel, not a blanket ban on truncated axes. Expect pushback; it is a good argument to have." },
  { title: "How to write a critique", bullets: [
    "State the chart's question fairly",
    "Locate the problem: which mark, which channel",
    "Say what a reader would wrongly conclude",
    "Propose a fix, and show it",
  ], notes: "This is the order the critique essay follows. A critique without a fix is a complaint." },
  { title: "What the essay is marked on", bullets: ["The essay is due in week 9; 10% of the course"], figure: { kind: "table", header: ["Part", "What we look for"], rows: [
    ["The question", "The chart's question stated fairly"],
    ["The diagnosis", "The misleading element located precisely"],
    ["The criteria", "Perception, Gestalt, accessibility or ethics, cited"],
    ["The fix", "A redesign that answers the question honestly"],
  ], alt: "What the critique essay is marked on, in four parts" }, notes: "Read the table aloud once. The essay brief on the course page has the same four parts." },
  { title: "In the workshop", bullets: [
    "Pairs take three published charts",
    "Find where each one misleads, and why",
    "Sketch one honest redesign",
    "Not marked: practice for the essay",
  ], notes: "The workshop sheet has the three charts and four questions per chart. Close by asking two pairs to show a redesign." },
];

const WEEK_12: SlideDraft[] = [
  { title: "From charts to a story", bullets: [
    "A stakeholder has a decision to make, not a dataset to explore",
    "A story orders charts so each one answers the question the last one raised",
    "Today: the shape of a data story, in a two-page static report",
  ], notes: "Quiz 2 runs first, as in week 7. Then open with a report that buries its finding on page three, and ask where the stakeholder stopped reading." },
  { title: "The shape of a data story", bullets: [
    "The question the stakeholder asked",
    "What the data says: one finding for each chart",
    "What it means for them",
    "What they could do next",
  ], notes: "Four parts, in this order. Every project report should be readable from its chart titles alone." },
  { title: "One finding, one chart", bullets: [
    "Title each chart with its finding, not its axes",
    "Cut the charts that answer no question",
    "Put the evidence they will ask for in an appendix",
  ], notes: "Show the same chart titled Sales by month and Sales fell after the price change. Ask which one a busy reader keeps." },
  { title: "Know your stakeholder", bullets: ["A manager", "Needs the decision and the risk", "Reads the first page"],
    right: ["An analyst", "Needs the method and the caveats", "Reads the appendix"],
    notes: "Most reports serve one reader. Name yours in the first line of the report." },
  { title: "Honesty in a story", bullets: [
    "Show uncertainty where the decision depends on it",
    "Say what the data cannot tell",
    "Cite every source on the chart it supports",
  ], notes: "A story is persuasive by design, so this is where the ethics of week 11 earns its place." },
  { title: "In the lab today", bullets: [
    "Structure a two-page report for a named stakeholder",
    "Title every chart with its finding",
    "Next week: the project studio critiques your draft",
  ], notes: "Pairs swap reports at the half hour and read only the chart titles. If the story does not survive that, it needs work." },
];

const LAB_1 = `# Lab sheet 1: the tool chain and a first chart

Sample, synthetic: written for this prototype. Week 1, not marked.

## Goal

Install the course tool chain and reproduce one chart from a supplied notebook, so every later lab starts from a working setup.

## Steps

1. Install the tool chain listed on the course page, in the order given there.
2. Open the week 1 notebook and run it from the top. Every cell should finish without an error.
3. Reproduce the bar chart of the supplied sales table.
4. Change one encoding, the colour or the order of the bars, and note what changed for a reader.
5. Under the chart, write the question it answers in one sentence.

## Check before you leave

Show a demonstrator your running notebook and your sentence.

## If you are stuck

The course page lists the known installation problems and their fixes. Ask the person next to you before you ask a demonstrator.
`;

const LAB_6 = `# Lab sheet 5: small multiples of a monthly series

Sample, synthetic: written for this prototype. Week 6, assessed with the other labs (15% in all).

## Goal

Show how a monthly measure changed in each region, so a reader can compare the shapes and see one change explained.

## Data

The week 6 dataset on the course page: a synthetic monthly series for six regions over three years.

## Steps

1. Plot all six regions as lines on one chart. Note how hard it is to compare them.
2. Facet the same data into small multiples, one panel a region, all on one shared scale.
3. Find one change worth a reader's attention and annotate it on the line, not in a legend.
4. Title the figure with its finding, not its axes.
5. In two sentences, say why the shared scale matters here.

## Hand in

The notebook, by the end of week 6. It must rebuild the figure from the raw file.

## Marked on

The shared scale, the annotation, the finding title and a notebook that runs from the top.
`;

const LAB_7 = `# Critique workshop: misleading charts

Sample, synthetic: written for this prototype. Week 7, not marked: practice for the critique essay due in week 9.

## In pairs

You have three published charts on the workshop sheet. For each one, answer:

1. What question is this chart trying to answer?
2. Which mark or channel misleads, exactly?
3. What would a reader wrongly conclude?
4. What one change would make it honest? Sketch it.

## Before you leave

Pick your best redesign and be ready to show it in two minutes. The essay follows the same four questions.
`;

const PROJECT_BRIEF = `# The project brief

Sample, synthetic: written for this prototype. Released in week 8.

## The task

In teams of three, take a public dataset from raw file to a written data story for a stakeholder you name. The story must answer the stakeholder's question and end in actions they could take.

## What you hand in

1. A packaged workbook that rebuilds every chart from the raw data with documented steps.
2. A written report of at most six pages: the stakeholder and their question; the dataset and how you cleaned it; the descriptive figures; the core charts, with at least one map; the story; and the actions you recommend.
3. A usability check of your main chart with at least three readers outside your team: what they misread, and what you changed.

## The defence

Each student defends the team's design choices in a 10 to 15 minute conversation in week 14, using the evidence from the usability check. The defence is marked for each student on their own.

## Dates

Brief in week 8; draft to the studio critique in week 13; report at the end of week 13; defences in week 14.

## Marking

Team report, 15% of the course, on the project rubric: design and accessibility (3), reproducibility of the pipeline (2), clarity and integrity of the communication (5), insight for the audience (5). Individual defence, 10%, on the defence rubric.

## Integrity

Cite every dataset and every source on the chart it supports. A chart you cannot rebuild from the workbook is not yet part of the report.
`;

const CHECKS: Record<number, string> = {
  1: "Exit question: write the question a chart you saw this week answers, and the task it supports.",
  2: "Classify each attribute of a supplied table as categorical, ordered or quantitative.",
  3: "Rank four encodings of one value by how accurately they are read, and justify the first.",
  4: "Name the colour scale you would use for a measure with a meaningful middle, and say why.",
  5: "Choose a chart for each of four comparison tasks, in one sentence each.",
  6: "Point to the change your annotation explains, and say why it needed a label.",
  7: "Locate the misleading element in a new chart in two sentences: the mark, and the wrong conclusion.",
  8: "Name one task where linked highlighting helps and one where it adds nothing.",
  9: "Explain why the map must be normalised by population before regions are compared.",
  10: "Say when a matrix serves better than a node-link diagram, with one example.",
  11: "Add an uncertainty band to a forecast and say what it does and does not cover.",
  12: "Order four charts into a story for a named stakeholder and title each with its finding.",
  13: "Name the rubric criterion your draft is weakest on, and the change you will make.",
  14: "Defend one design choice with evidence from your usability check.",
};

const FULL: Record<number, SlideDraft[]> = { 1: WEEK_1, 6: WEEK_6, 7: WEEK_7, 12: WEEK_12 };
const LAB: Record<number, string> = { 1: LAB_1, 6: LAB_6, 7: LAB_7 };

/** The fourteen sessions, one for each week of the schedule as the term begins. */
export const CS310_SESSIONS: TeachingSession[] = CS310_BEFORE.topics.map((t) => {
  const week = t.week!;
  return {
    id: "CS310-S" + String(week).padStart(2, "0"), week, topic: t.title, minutes: t.contactHours * 60, cloIds: [...t.cloIds],
    activity: t.activities ?? "", learningCheck: CHECKS[week], resources: t.readings ?? "",
    status: FULL[week] ? "ready" : "draft", updatedAt: PREPARED_AT, updatedBy: BY,
    courseVersionId: "CS310-v1", needsReview: false, sample: true, topicId: t.id,
    ...(FULL[week] ? { slides: FULL[week] } : {}),
    ...(LAB[week] ? { labSheet: LAB[week] } : {}),
    ...(week === 8 ? { projectBrief: PROJECT_BRIEF } : {}),
    // The mid-semester quiz as ten drafted items, not reviewed (depth plan Section 10).
    ...(week === 7 ? { items: structuredClone(WEEK_7_QUIZ) } : {}),
  };
});

/** The plan the term starts from. Its term is left blank: the lecturer sets the term at the Course step. */
export const CS310_TEACHING_PLAN: TeachingPlan = { subjectId: "CS310", term: "", notes: "", sessions: CS310_SESSIONS, updatedAt: PREPARED_AT, updatedBy: BY };

/** The label every outline pack carries. */
export const OUTLINE_LABEL = "Outline pack: the lecturer's slides are not written yet.";
