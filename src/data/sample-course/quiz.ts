// The week 7 quiz for CS310 (depth plan Section 10): ten items written by the build session for this prototype, a labelled
// fixture, synthetic, drafted and not reviewed until a person on the team marks them reviewed. They test the quiz's share of
// the assessment plan (CS310-1 at Understand, CS310-3 at Analyse) on weeks 1 to 6. Each multiple-choice distractor is a
// misconception the course record holds, word for word, and every item passes the surface lint in src/lib/items.ts, which
// is all a rule can say about it.

import type { DraftItem, ItemOption } from "../../types.ts";

const recorded = (text: string, week: number): ItemOption => ({ text, correct: false, feedback: "A misconception recorded for week " + week + "." });
const key = (text: string, feedback: string): ItemOption => ({ text, correct: true, feedback });
const sample = { source: "sample" as const, reviewedBy: null, reviewedAt: null };
const id = (n: number) => "CS310-W07-Q" + String(n).padStart(2, "0");

export const WEEK_7_QUIZ: DraftItem[] = [
  { ...sample, id: id(1), kind: "multichoice", cloId: "CS310-1", bloomLevel: "Understand", marks: 1,
    stem: "Which statement about how people read marks and channels is accurate?",
    options: [recorded("Angle and area are read as accurately as position.", 3),
      key("Position on a common scale is read more accurately than angle.", "Position along a common scale is read most accurately; angle and area less so."),
      recorded("Hue can show an order.", 3)] },
  { ...sample, id: id(2), kind: "multichoice", cloId: "CS310-1", bloomLevel: "Understand", marks: 1,
    stem: "Which statement about colour and accessibility in a chart is accurate?",
    options: [key("A sequential colour map suits a quantity ordered from low to high.", "Lightness that rises with the value reads as an order; a rainbow adds bands the data does not have."),
      recorded("A rainbow colour map is neutral.", 4),
      recorded("Accessibility is a final check rather than a design choice.", 4)] },
  { ...sample, id: id(3), kind: "multichoice", cloId: "CS310-3", bloomLevel: "Analyse", marks: 1,
    stem: "A colleague wants to compare eight departments' budgets on one chart. Which advice holds?",
    options: [recorded("A pie chart compares many parts well.", 5),
      recorded("A bar chart's axis can start anywhere.", 5),
      key("Use bars on a common axis that starts at zero.", "Bar length encodes the value, so the axis starts at zero and the bars share it.")] },
  { ...sample, id: id(4), kind: "multichoice", cloId: "CS310-3", bloomLevel: "Analyse", marks: 1,
    stem: "Two monthly sales series share one time axis. Which design lets a reader compare them fairly?",
    options: [recorded("Two series on two y-axes are easy to compare.", 6),
      key("One y-axis for both series, or small multiples on one scale.", "A shared scale lets the eye compare heights; two axes invite a false crossing."),
      recorded("Small multiples need different scales to be fair.", 6)] },
  { ...sample, id: id(5), kind: "multichoice", cloId: "CS310-1", bloomLevel: "Understand", marks: 1,
    stem: "Which statement about designing a chart from a table of data is accurate?",
    options: [key("Design starts from the question the chart has to answer.", "The question decides the task, and the task decides the chart."),
      recorded("A chart is decoration added once the analysis is finished.", 1),
      recorded("A spreadsheet's layout is the data's structure.", 2)] },
  { ...sample, id: id(6), kind: "shortanswer", cloId: "CS310-1", bloomLevel: "Remember", marks: 1,
    stem: "Which visual channel do people read most accurately when they compare quantities? Answer in one or two words.",
    answers: ["position", "position on a scale", "aligned position"] },
  { ...sample, id: id(7), kind: "shortanswer", cloId: "CS310-1", bloomLevel: "Remember", marks: 1,
    stem: "Name the kind of colour map that suits a quantity ordered from low to high.",
    answers: ["sequential", "sequential colour map", "sequential color map"] },
  { ...sample, id: id(8), kind: "shortanswer", cloId: "CS310-1", bloomLevel: "Remember", marks: 1,
    stem: "Name the arrangement of small charts that share one scale so that a reader can compare them.",
    answers: ["small multiples", "small multiple", "trellis"] },
  { ...sample, id: id(9), kind: "essay", cloId: "CS310-3", bloomLevel: "Analyse", marks: 3, responseLines: 12,
    stem: "Break down the chart your group was given in the critique workshop: where it misleads, the mark involved, and the criterion it breaks.",
    graderInfo: "Marked against CLO3. Credit the misleading element named on the chart, the wrong conclusion it invites, and the criterion it breaks: perception, accessibility or ethics. A truncated axis misleads when it exaggerates a difference; it is not dishonest in itself." },
  { ...sample, id: id(10), kind: "essay", cloId: "CS310-3", bloomLevel: "Analyse", marks: 3, responseLines: 10,
    stem: "Classify each misleading chart from this week's critique workshop by the error it makes, and give one sentence of evidence for each.",
    graderInfo: "Marked against CLO3: each chart classified by its error (a truncated axis, a dual axis, a rainbow colour map or another named error), with one sentence of evidence from the chart. A chart can carry more than one error; credit either when the evidence is given." },
];
