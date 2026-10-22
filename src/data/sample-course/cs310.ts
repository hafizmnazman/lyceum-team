// CS310 Data Visualisation: the sample course record at the demo institution (depth plan Section 4.3), in the
// shape of a course file (EAC's list, MQA's frame). A labelled fixture: written by the build session for this
// prototype (the owner's answer to Section 18 item 1, 22 October 2026), synthetic, and never a lecturer's own
// work. Modelled on the published outlines the research note lists, with no sentence copied from any of them.
//
// Two states: CS310_BEFORE is the outline as the term begins (version CS310-v1), allocating 53 of its 56 contact
// hours, with no dashboard topic; cs310After() applies the change the tour's Update step makes (CLO5 reworded by the
// tour's typed words, the dashboard topic in the next free slot), so the proofs and the sample workspace use the
// same after state the tour reaches.

import type { AssessmentComponent, BloomLevel, CourseDefinition, CourseOutcome, CourseTopic, ProgrammeOutcome, Rubric, StudentLearningTime } from "../../types.ts";

export const CS310 = "CS310";

/** Eight demo programme outcomes for the Bachelor of Computer Science, shaped on the MQF 2nd edition's clusters. Synthetic. */
export const DEMO_PLOS: ProgrammeOutcome[] = [
  { id: "PLO1", cluster: "Knowledge and understanding", text: "Explain the principles of computing and data that underpin software and analytics systems" },
  { id: "PLO2", cluster: "Cognitive skills", text: "Analyse problems and evaluate solutions with evidence and sound reasoning" },
  { id: "PLO3", cluster: "Functional work skills: practical", text: "Design, build and test computing solutions against stated requirements" },
  { id: "PLO4", cluster: "Functional work skills: digital", text: "Use current digital tools and data pipelines to produce reproducible work" },
  { id: "PLO5", cluster: "Functional work skills: interpersonal and communication", text: "Communicate technical findings to technical and non-technical audiences" },
  { id: "PLO6", cluster: "Functional work skills: numeracy", text: "Apply quantitative and statistical methods to data" },
  { id: "PLO7", cluster: "Ethics and professionalism", text: "Act ethically with data, including privacy, fairness and accessibility" },
  { id: "PLO8", cluster: "Personal and entrepreneurial skills", text: "Work in teams and manage their own learning and projects" },
];

/** CLO5 keeps its id and label: the tour, the smokes, the sample results file and the Map step target it. */
export const CLO5 = "CLO5";
/** The words the tour's Update step types after CLO5's wording (src/demo/script.ts, unchanged). */
export const CLO5_TOUR_APPEND = " with dashboards that answer a stakeholder's question";

const outcome = (id: string, label: string, bloomLevel: BloomLevel, mqfCluster: string, text: string, ploLinks: CourseOutcome["ploLinks"] & object): CourseOutcome =>
  ({ id, subjectId: CS310, label, bloomLevel, mqfCluster, text, ploLinks, ploIds: ploLinks.map((l) => l.ploId), assessmentEvidence: "" });

const OUTCOMES: CourseOutcome[] = [
  outcome("CS310-1", "CLO1", "Understand", "Knowledge and understanding",
    "Explain how data and task abstraction, marks and channels, and human perception decide whether a chart answers its question",
    [{ ploId: "PLO1", level: "H" }, { ploId: "PLO2", level: "M" }]),
  outcome("CS310-2", "CLO2", "Apply", "Functional work skills: digital",
    "Construct charts for categorical, temporal and geospatial data with a reproducible tool chain, with the colour and accessibility choices recorded",
    [{ ploId: "PLO4", level: "H" }, { ploId: "PLO6", level: "M" }]),
  outcome("CS310-3", "CLO3", "Analyse", "Cognitive skills",
    "Analyse a published visualisation against perception, Gestalt, accessibility and ethics criteria to locate where it misleads",
    [{ ploId: "PLO2", level: "H" }, { ploId: "PLO7", level: "M" }]),
  outcome("CS310-4", "CLO4", "Evaluate", "Cognitive skills",
    "Evaluate competing designs for a stakeholder question against evidence from a usability check",
    [{ ploId: "PLO2", level: "H" }, { ploId: "PLO5", level: "M" }]),
  outcome(CLO5, "CLO5", "Apply", "Functional work skills: interpersonal and communication",
    "Use charts to tell a data story to a stakeholder audience",
    [{ ploId: "PLO5", level: "H" }, { ploId: "PLO4", level: "M" }]),
];

type TopicSeed = [week: number, title: string, kind: CourseTopic["kind"], lecture: number, lab: number, selfStudy: number, cloIds: string[], activities: string, readings: string, misconceptions: string[], extra?: Partial<CourseTopic>];
const SCHEDULE: TopicSeed[] = [
  [1, "Why visualise: questions, data and tasks", "mixed", 2, 2, 3, ["CS310-1"],
    "Lecture: what a chart is for, and the question it has to answer. Lab: install the course tool chain and reproduce a first chart from a supplied notebook.",
    "Munzner 2014, the what, why and how framework.",
    ["A chart is decoration added once the analysis is finished.", "More data on one chart always tells the reader more."]],
  [2, "Data and task abstraction; tidy data", "mixed", 2, 2, 3, ["CS310-1", "CS310-2"],
    "Lecture: data types, attributes and the tasks a viewer performs. Lab 1, assessed: tidy a messy table and describe each attribute.",
    "Munzner 2014, data and task abstraction.",
    ["A spreadsheet's layout is the data's structure.", "Every numeric column is a quantity."], { protected: true }],
  [3, "Marks, channels and perception", "mixed", 2, 2, 3, ["CS310-1", "CS310-2"],
    "Lecture: marks and channels, ranked by how accurately people read them. Lab 2, assessed: encode one dataset with position, length, angle and area, and compare the readings.",
    "Munzner 2014, marks and channels.",
    ["Angle and area are read as accurately as position.", "Hue can show an order."], { protected: true, prerequisiteTopicIds: ["CS310-T02"] }],
  [4, "Colour, Gestalt and accessibility", "mixed", 2, 2, 3, ["CS310-1", "CS310-2", "CS310-3"],
    "Lecture: colour maps, Gestalt grouping and accessible contrast. Lab 3, assessed: rebuild a chart for readers with colour-vision deficiency and check its contrast.",
    "Course notes, colour and accessibility.",
    ["A rainbow colour map is neutral.", "Accessibility is a final check rather than a design choice."]],
  [5, "Charts for comparison and distribution", "mixed", 2, 2, 3, ["CS310-2"],
    "Lecture: bars, dot plots, histograms and box plots. Lab 4, assessed: choose and justify a chart for each of four comparison tasks.",
    "Course notes, comparison and distribution.",
    ["A pie chart compares many parts well.", "A bar chart's axis can start anywhere."], { prerequisiteTopicIds: ["CS310-T03"] }],
  [6, "Time: trends, seasonality and small multiples", "mixed", 2, 2, 3, ["CS310-2", CLO5],
    "Lecture: line charts, seasonality and small multiples. Lab 5, assessed: build small multiples of a monthly series and annotate one change for a reader.",
    "Course notes, time and small multiples.",
    ["Two series on two y-axes are easy to compare.", "Small multiples need different scales to be fair."]],
  [7, "Mid-semester quiz; critique workshop on misleading charts", "quiz", 2, 2, 3, ["CS310-1", "CS310-3"],
    "Quiz 1 in the lecture slot. Lab: a critique workshop in which pairs find where three published charts mislead and say why; practice for the critique essay, not marked.",
    "Course notes, how charts mislead.",
    ["A chart misleads only when its numbers are wrong.", "A truncated axis is always dishonest."]],
  [8, "Interaction: filter, brush and link; the project brief released", "mixed", 2, 2, 3, ["CS310-2", "CS310-4"],
    "Lecture: interaction techniques and when they help a reader. Lab 6, assessed: add filtering and linked highlighting to a chart. The project brief is released.",
    "Munzner 2014, manipulating and faceting views.",
    ["Interaction rescues a chart that does not answer its question.", "Readers find hidden interactions on their own."]],
  [9, "Geospatial data", "mixed", 2, 2, 3, ["CS310-2"],
    "Lecture: choropleths, symbol maps and projections. Lab 7, assessed: map a regional indicator and normalise it by population. The critique essay is due.",
    "Course notes, maps.",
    ["A choropleth of raw counts compares regions fairly.", "A larger region matters more on a map."]],
  [10, "Networks and hierarchies", "mixed", 2, 2, 3, ["CS310-2"],
    "Lecture: node-link diagrams, adjacency matrices and treemaps. Lab 8, assessed: compare a node-link view and a matrix of the same network.",
    "Munzner 2014, networks and trees.",
    ["A node-link diagram suits every network.", "A treemap shows precise values."]],
  [11, "Uncertainty and ethics", "mixed", 2, 2, 3, ["CS310-1", "CS310-3"],
    "Lecture: showing uncertainty; consent, privacy and representation. Lab 9, assessed: add uncertainty to a forecast chart and write a one-paragraph ethics note.",
    "Course notes, uncertainty and ethics.",
    ["Hiding uncertainty makes a chart clearer.", "Aggregated data cannot identify anyone."]],
  [12, "Data storytelling: static reports for stakeholders", "mixed", 2, 2, 3, [CLO5, "CS310-3"],
    "Quiz 2 at the start of the lecture. Lecture: the shape of a data story, from the question to a recommendation. Lab: structure a two-page static report for a named stakeholder.",
    "Course notes, data stories; Few 2013 on at-a-glance dashboards, read for contrast with a static report.",
    ["A data story is a chart with a title.", "A stakeholder reads every chart in a report."], { prerequisiteTopicIds: ["CS310-T06"] }],
  [13, "Project studio", "studio", 2, 2, 3, [CLO5, "CS310-2", "CS310-4"],
    "Lecture slot: a studio critique of each team's draft. Lab: teams revise their report and their pipeline against the rubric.",
    "The project brief and its rubric.",
    ["Feedback this late is too late to use.", "A reproducible pipeline is optional when the charts look right."], { prerequisiteTopicIds: ["CS310-T08"] }],
  [14, "Presentations and review", "review", 1, 0, 1, [CLO5, "CS310-4"],
    "A course review in the lecture slot. Team presentations and the individual defences are scheduled by appointment in the same week, in the project's assessment hours.",
    "",
    ["The defence repeats the team presentation.", "A review week adds nothing new."]],
];

const TOPICS: CourseTopic[] = SCHEDULE.map(([week, title, kind, lecture, lab, selfStudy, cloIds, activities, readings, misconceptions, extra]) => ({
  id: "CS310-T" + String(week).padStart(2, "0"), title, week, kind, lectureHours: lecture, labHours: lab, contactHours: lecture + lab, selfStudyHours: selfStudy,
  cloIds, prerequisiteTopicIds: [], protected: false, resources: "", activities, readings, misconceptions, ...extra,
}));

export const CS310_ASSESSMENT: AssessmentComponent[] = [
  { id: "CS310-A1", title: "Quizzes", kind: "quiz", weight: 10, week: "Weeks 7 and 12", individual: true,
    description: "Two short quizzes, 5% each, in the lecture slot of week 7 and week 12: multiple choice and short answers on the concepts of the weeks before.",
    allocation: [{ cloId: "CS310-1", bloomLevel: "Understand", marks: 6 }, { cloId: "CS310-3", bloomLevel: "Analyse", marks: 4 }] },
  { id: "CS310-A2", title: "Labs", kind: "lab", weight: 15, week: "Weeks 2 to 11", individual: true,
    description: "Nine assessed lab exercises between weeks 2 and 11, each submitted as a notebook by the end of its week.",
    allocation: [{ cloId: "CS310-2", bloomLevel: "Apply", marks: 15 }] },
  { id: "CS310-A3", title: "Team project report", kind: "project", weight: 15, week: "Brief in week 8; report in week 13", individual: false, rubricId: "CS310-R1",
    description: "Teams of three carry a public dataset from cleaning to a written data story for a named stakeholder, with a packaged, reproducible workbook. Marked against the project rubric.",
    allocation: [{ cloId: CLO5, bloomLevel: "Apply", marks: 10 }, { cloId: "CS310-2", bloomLevel: "Apply", marks: 5 }] },
  { id: "CS310-A4", title: "Individual project defence", kind: "defence", weight: 10, week: "Week 14", individual: true, rubricId: "CS310-R2",
    description: "Each student defends the team's design choices in a 10 to 15 minute conversation, with evidence from the team's usability check, so each student's evidence for CLO4 is their own. Marked against the defence rubric.",
    allocation: [{ cloId: "CS310-4", bloomLevel: "Evaluate", marks: 10 }] },
  { id: "CS310-A5", title: "Critique essay", kind: "essay", weight: 10, week: "Week 9", individual: true,
    description: "A 1,500-word critique of a published visualisation that locates where and why it misleads, against perception, Gestalt, accessibility and ethics criteria.",
    allocation: [{ cloId: "CS310-3", bloomLevel: "Analyse", marks: 10 }] },
  { id: "CS310-A6", title: "Final examination", kind: "exam", weight: 40, week: "Examination period", individual: true,
    description: "A three-hour written examination in three sections. Section A, short answers on abstraction, marks, channels and perception (CLO1, 12 marks). Section B, construct and annotate charts from a supplied table (CLO2, 12 marks). Section C, evaluate two competing designs for a stated question (CLO4, 16 marks). The marking scheme awards marks for the reasoning stated, not for the chart alone: in Section C, 6 marks for the criteria named, 6 for weighing the designs against them and 4 for a recommendation that follows from the weighing.",
    allocation: [{ cloId: "CS310-1", bloomLevel: "Understand", marks: 12 }, { cloId: "CS310-2", bloomLevel: "Apply", marks: 12 }, { cloId: "CS310-4", bloomLevel: "Evaluate", marks: 16 }] },
];

export const CS310_RUBRICS: Rubric[] = [
  { id: "CS310-R1", subjectId: CS310, componentId: "CS310-A3", title: "Project rubric: the team report", sample: true, criteria: [
    { name: "Design and accessibility", marks: 3, cloIds: ["CS310-2"], levels: [
      "Every chart fits its data and task; colour, contrast and labels pass the accessibility checklist without exception.",
      "Charts fit their data and task, with one or two minor accessibility lapses.",
      "Some charts misfit their data or task, and accessibility lapses affect reading.",
      "Chart choices are unexplained or misleading, and accessibility is not considered."] },
    { name: "Reproducibility of the pipeline", marks: 2, cloIds: ["CS310-2"], levels: [
      "The packaged workbook rebuilds every chart from the raw data with one documented command.",
      "The workbook rebuilds the charts with a few documented manual steps.",
      "Some charts cannot be rebuilt from the workbook as supplied.",
      "The charts cannot be traced back to the data."] },
    { name: "Clarity and integrity of the communication, sources cited", marks: 5, cloIds: [CLO5], levels: [
      "The story answers the stated question in order; every figure is sourced and no chart distorts its data.",
      "The story is clear and sourced, with one weak transition or one unsourced figure.",
      "The story wanders or leaves figures unsourced, and one chart distorts its data.",
      "There is no clear story, sources are missing and several charts distort their data."] },
    { name: "Insight for the audience", marks: 5, cloIds: [CLO5], levels: [
      "Findings are specific to the named stakeholder and end in a recommendation the stakeholder can act on.",
      "Findings suit the stakeholder; the recommendation is general.",
      "Findings are stated but not tied to the stakeholder's decision.",
      "Charts are shown without findings."] },
  ] },
  { id: "CS310-R2", subjectId: CS310, componentId: "CS310-A4", title: "Defence rubric: the individual defence", sample: true, criteria: [
    { name: "Evaluation of the competing designs", marks: 6, cloIds: ["CS310-4"], levels: [
      "Compares at least two designs against the stakeholder's question and defends the choice with evidence.",
      "Compares two designs and defends the choice, with evidence for most claims.",
      "Describes the designs but defends the choice by preference.",
      "Cannot say why the team's design was chosen."] },
    { name: "Use of the usability check's evidence", marks: 4, cloIds: ["CS310-4"], levels: [
      "Uses the usability check's findings, the inconvenient ones included, to justify a change.",
      "Uses the findings to justify the design, leaving out one inconvenient result.",
      "Mentions the usability check without drawing on its findings.",
      "Uses no usability evidence."] },
  ] },
];

/** Student learning time for 3 credits (120 hours). Lecture and lab follow the schedule; before the revision 3 contact hours are unallocated. */
const SLT_BEFORE: StudentLearningTime = { lecture: 27, lab: 26, selfStudy: 40, assessmentWork: { quizzes: 3, labs: 6, essay: 4, project: 8 }, exam: 3 };

const NOUN: Record<AssessmentComponent["kind"], string> = { quiz: "the quizzes", lab: "the labs", project: "the team project report", defence: "the individual project defence", essay: "the critique essay", exam: "the final examination" };
/** "Assessed by" for each outcome, written from the allocations so the two can never disagree. */
function evidenceLine(cloId: string): string {
  const parts = CS310_ASSESSMENT.flatMap((a) => a.allocation.filter((x) => x.cloId === cloId).map((x) => NOUN[a.kind] + " (" + x.marks + " marks)"));
  const line = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts.at(-1) : parts[0] ?? "";
  return line ? line.charAt(0).toUpperCase() + line.slice(1) + "." : "";
}

export const CS310_SOURCE = "Written for this prototype and labelled sample. Modelled on published outlines named in the research notes: GWU DATS 6401, Spring 2026, for the week structure and the project; the BTAA Love Data Week 2026 rubric for the criteria; a Malaysian university handbook's data visualisation synopsis for the local anchor. No sentence is copied from any of them.";

export const CS310_BEFORE: CourseDefinition = {
  title: "Data Visualisation",
  brief: {
    programmeTitle: "Bachelor of Computer Science", level: "Year 2 undergraduate", language: "English",
    credits: 3, teachingWeeks: 14, contactHours: 56, selfStudyHours: 40,
    targetRoles: "Data analyst, business intelligence developer, data scientist",
    framework: "MQF 2nd edition (2024), with MQA's Guidelines to Good Practices: Assessment of Student Learning (2023) as the demo's frame and EAC's course-file list as the checklist; no accreditation is claimed",
    programmeOutcomes: DEMO_PLOS.map((p) => p.id),
    notes: "Sample, synthetic: a demo course record written for this prototype. Assumes programming foundations and introductory statistics.",
  },
  outcomes: OUTCOMES.map((o) => ({ ...o, assessmentEvidence: evidenceLine(o.id) })),
  topics: TOPICS,
  synopsis: "This course teaches students to turn data into charts that answer a stated question for a stated audience. Students learn to abstract data and tasks, to choose marks and channels that suit human perception, and to use colour, layout and interaction with accessibility in mind. They build charts for categorical, temporal, geospatial, network and hierarchical data with a reproducible tool chain, critique published visualisations for the ways they mislead, and evaluate competing designs with evidence from a usability check. Uncertainty and the ethics of representation run through every topic. In a team project, students carry a dataset from cleaning to a data story for a stakeholder audience, and each student defends the team's design choices in an individual defence. The course is assessed by labs, quizzes, a critique essay, the project and a final examination.",
  methods: ["lectures", "labs", "a studio critique", "a team project with an individual defence"],
  references: [
    { citation: "Munzner, T. (2014). Visualization Analysis and Design.", year: 2014 },
    { citation: "Few, S. (2013). Information Dashboard Design (2nd ed.).", year: 2013 },
  ],
  referencesGap: "Recent references to be supplied by the lecturer.",
  assessment: CS310_ASSESSMENT,
  slt: SLT_BEFORE,
  source: CS310_SOURCE,
  sample: true,
};

/** The topic the tour's Update step adds: its title and hours as the tour types them, placed in the next free slot. */
export const DASHBOARD_TOPIC_TITLE = "Dashboards and data storytelling";

/** The after state the tour reaches: CLO5 reworded by the tour's typed words, the dashboard topic added with three
 *  contact hours in the slot the schedule leaves free (week 14: one lecture hour and two lab hours), and the
 *  learning time following the topics. The assessment plan is unchanged by this revision. */
export function cs310After(before: CourseDefinition = CS310_BEFORE): CourseDefinition {
  const after = structuredClone(before);
  after.outcomes = after.outcomes.map((o) => (o.id === CLO5 ? { ...o, text: o.text + CLO5_TOUR_APPEND } : o));
  after.topics.push({ id: "CS310-topic-dashboards", title: DASHBOARD_TOPIC_TITLE, week: 14, kind: "mixed", lectureHours: 1, labHours: 2, contactHours: 3,
    selfStudyHours: 0, cloIds: [CLO5], prerequisiteTopicIds: [], protected: false, resources: "" });
  after.slt = { ...after.slt!, lecture: after.slt!.lecture + 1, lab: after.slt!.lab + 2 };
  return after;
}

export const CS310_OUTCOME_IDS = CS310_BEFORE.outcomes.map((o) => o.id);
