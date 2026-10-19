// Lyceum v2 seed (spec Section 10). The whole demo world as Layer 0 objects:
// people and their hats, the programme, its subjects and the prerequisite graph,
// the CLOs, the real-shaped survey (mapped from v1's audited 200-student cohort),
// the data sources for the data room, and the canonical CS220-before-MA201
// proposal that drives the worked example.
//
// The CLO -> subject mapping is carried from v1 unchanged (CLO4 = machine
// learning on CS220, CLO3 = linear algebra on MA201, CLO7 = deep learning on
// CS340 which depends on CS220), and the survey is the same 200 rows, so the
// acceptance test reproduces the proven numbers exactly (0.60 -> 0.58, CLO4
// 0.45, drill-down P = 0.43).

import type {
  CLO,
  ChangeProposal,
  DataSource,
  Person,
  Prediction,
  Programme,
  ResultUpload,
  RoleAssignment,
  Subject,
  SubjectVersion,
  SurveyRecord,
} from "../types.ts";
import type { RawCohort } from "../lib/spine/cohort.ts";
import { SYNTHETIC_COHORT } from "./synthetic-cohort.ts";

// ---------- identifiers ----------
export const PROGRAMME_ID = "BSC-CS";
export const TERM = "2025-S1"; // the current survey term
export const PRIOR_TERM = "2024-S2"; // last term's filed results

export const PEOPLE_IDS = {
  sobri: "P-SOBRI", // academic: coordinator + lecturer on CS220
  lim: "P-LIM", // management
  rahman: "P-RAHMAN", // department owner, Bachelor of Computer Science
  tan: "P-TAN", // academic: lecturer on CS310
  devan: "P-DEVAN", // academic: coordinator + lecturer on CS230
} as const;

// ---------- people ----------
// v3: verification is the supply-side trust signal (institutional email domain
// + presence on the official course page). Ms Tan is deliberately unverified so
// the "unverified edits are labelled" state has something real to show.
export const PEOPLE: Person[] = [
  { id: PEOPLE_IDS.sobri, name: "Dr Sobri", orgRole: "academic", email: "sobri@utp.edu.my", verified: true },
  { id: PEOPLE_IDS.lim, name: "Prof Lim", orgRole: "management", email: "lim@utp.edu.my", verified: true },
  { id: PEOPLE_IDS.rahman, name: "Dr Rahman", orgRole: "department", departmentOf: PROGRAMME_ID, email: "rahman@utp.edu.my", verified: true },
  { id: PEOPLE_IDS.tan, name: "Ms Tan", orgRole: "academic", email: "tan.mailbox@gmail.com", verified: false },
  { id: PEOPLE_IDS.devan, name: "Mr Devan", orgRole: "academic", email: "devan@utp.edu.my", verified: true },
];

// ---------- subject hats (per person x subject) ----------
// Dr Sobri wears both hats on CS220 (so he can skip review of his own draft) and
// also coordinates CS310, where Ms Tan is the lecturer (so a lecturer-drafted
// change on CS310 must pass Sobri's coordinator review before management ever
// sees it). Mr Devan holds both hats on CS230.
export const ROLE_ASSIGNMENTS: RoleAssignment[] = [
  { personId: PEOPLE_IDS.sobri, subjectId: "CS220", hat: "coordinator" },
  { personId: PEOPLE_IDS.sobri, subjectId: "CS220", hat: "lecturer" },
  { personId: PEOPLE_IDS.sobri, subjectId: "CS310", hat: "coordinator" },
  { personId: PEOPLE_IDS.tan, subjectId: "CS310", hat: "lecturer" },
  { personId: PEOPLE_IDS.tan, subjectId: "CS340", hat: "lecturer" },
  { personId: PEOPLE_IDS.devan, subjectId: "CS230", hat: "coordinator" },
  { personId: PEOPLE_IDS.devan, subjectId: "CS230", hat: "lecturer" },
];

// ---------- CLOs (one assessed outcome per assessed subject; mapping from v1) ----------
export const CLOS: CLO[] = [
  { id: "CLO1", subjectId: "CS101", text: "Programming foundations", bloomLevel: "Apply" },
  { id: "CLO2", subjectId: "ST201", text: "Statistical inference", bloomLevel: "Apply" },
  { id: "CLO3", subjectId: "MA201", text: "Linear algebra", bloomLevel: "Apply" },
  { id: "CLO4", subjectId: "CS220", text: "Machine learning", bloomLevel: "Analyse" },
  { id: "CLO5", subjectId: "CS310", text: "Data visualisation", bloomLevel: "Apply" },
  { id: "CLO6", subjectId: "CS230", text: "Data ethics and governance", bloomLevel: "Understand" },
  { id: "CLO7", subjectId: "CS340", text: "Deep learning", bloomLevel: "Analyse" },
];

export const CLO_NAMES: Record<string, string> = Object.fromEntries(
  CLOS.map((c) => [c.id, c.text]),
);

// Historical cohorts available per CLO, feeding the spine's grounding confidence
// (carried from v1). CLO4 and CLO6 are thin (one batch), so they read
// low-confidence with wider bands.
export const BATCH_SUPPORT: Record<string, number> = {
  CLO1: 3,
  CLO2: 3,
  CLO3: 3,
  CLO4: 1,
  CLO5: 3,
  CLO6: 1,
  CLO7: 2,
};

// ---------- subjects + prerequisite graph (the PROPOSED sequence under test) ----------
// year/semester encode the global sequence: ordinal = (year-1)*2 + semester.
// CS220 (y1 s2, ordinal 2) sits one slot AHEAD of its prerequisite MA201
// (y2 s1, ordinal 3): the canonical conflict. CS340 (deep learning) depends on
// CS220, so a broken CS220 cascades to it.
function subj(
  id: string,
  title: string,
  year: number,
  semester: number,
  cloIds: string[],
  prerequisiteSubjectIds: string[] = [],
): Subject {
  return {
    id,
    title,
    programmeId: PROGRAMME_ID,
    year,
    semester,
    cloIds,
    prerequisiteSubjectIds,
    sharedWithProgrammeIds: [],
    status: "active",
    currentVersionId: `${id}-v1`,
  };
}

export const SUBJECTS: Subject[] = [
  subj("CS101", "Programming Foundations", 1, 1, ["CLO1"]),
  subj("MA101", "Calculus", 1, 1, []),
  subj("ST201", "Statistical Inference", 1, 2, ["CLO2"]),
  subj("CS220", "Applied Machine Learning", 1, 2, ["CLO4"], ["MA201"]),
  subj("MA201", "Linear Algebra", 2, 1, ["CLO3"]),
  subj("CS230", "Data Ethics and Governance", 2, 1, ["CLO6"]),
  subj("CS310", "Data Visualisation", 2, 2, ["CLO5"]),
  subj("CS340", "Deep Learning", 2, 2, ["CLO7"], ["CS220"]),
];

export const SUBJECTS_BY_ID: Record<string, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s]),
);

// ---------- programme ----------
export const PROGRAMME: Programme = {
  id: PROGRAMME_ID,
  title: "Bachelor of Computer Science",
  departmentOwnerId: PEOPLE_IDS.rahman,
  subjectIds: SUBJECTS.map((s) => s.id),
};

// ---------- the survey (real ground), mapped from v1's 200-student cohort ----------
// Each student rated all seven assessed CLOs. We split each student's ratings
// into one SurveyRecord per assessed subject (the shape a real per-subject survey
// arrives in). Merging a student's records back reconstructs the exact v1 ratings
// row, so the spine's grand mean and every downstream number are identical.
const RAW_COHORT: RawCohort = SYNTHETIC_COHORT;
export const COHORT_ID = RAW_COHORT.id;

// CLOs grouped by their subject, for splitting the survey.
const CLOS_BY_SUBJECT = new Map<string, string[]>();
for (const clo of CLOS) {
  CLOS_BY_SUBJECT.set(clo.subjectId, [...(CLOS_BY_SUBJECT.get(clo.subjectId) ?? []), clo.id]);
}

export const SURVEY: SurveyRecord[] = RAW_COHORT.students.flatMap((student) =>
  SUBJECTS.filter((s) => (CLOS_BY_SUBJECT.get(s.id)?.length ?? 0) > 0).map((s) => {
    const cloRatings: Record<string, number> = {};
    for (const cloId of CLOS_BY_SUBJECT.get(s.id) ?? []) {
      cloRatings[cloId] = student.ratings[cloId];
    }
    return {
      studentId: student.id,
      subjectId: s.id,
      term: TERM,
      cloRatings,
    };
  }),
);

/** Reconstruct the full per-student cohort (all CLOs merged) from survey records.
 *  Preserves first-seen student order so the seeded outcome draws are stable.
 *  This is what runAcceptanceTest feeds the spine. */
export function cohortFromSurvey(survey: SurveyRecord[], cohortId = COHORT_ID): RawCohort {
  const byStudent = new Map<string, Record<string, number>>();
  const order: string[] = [];
  for (const rec of survey) {
    if (!byStudent.has(rec.studentId)) {
      byStudent.set(rec.studentId, {});
      order.push(rec.studentId);
    }
    Object.assign(byStudent.get(rec.studentId)!, rec.cloRatings);
  }
  return {
    id: cohortId,
    intake: RAW_COHORT.intake,
    programmeId: PROGRAMME_ID,
    students: order.map((id) => ({ id, cohortId, ratings: byStudent.get(id)! })),
  };
}

// ---------- data sources (the data room freshness view) ----------
export const DATA_SOURCES: DataSource[] = [
  { kind: "clo-survey", subjectId: "CS220", term: TERM, recordCount: 200, ingestedAt: "2026-06-18T09:12:00Z" },
  { kind: "ssrt", subjectId: "CS220", term: TERM, recordCount: 200, ingestedAt: "2026-06-18T09:12:00Z" },
  { kind: "results", subjectId: "CS220", term: PRIOR_TERM, recordCount: 198, ingestedAt: "2026-01-22T14:40:00Z" },
  { kind: "clo-survey", subjectId: "MA201", term: TERM, recordCount: 200, ingestedAt: "2026-06-18T09:12:00Z" },
  { kind: "clo-survey", subjectId: "CS340", term: TERM, recordCount: 200, ingestedAt: "2026-06-18T09:12:00Z" },
  { kind: "results", subjectId: "CS310", term: PRIOR_TERM, recordCount: 191, ingestedAt: "2026-01-22T14:40:00Z" },
];

// ---------- a prior filed result (closed-loop context) ----------
export const SEED_RESULT_UPLOADS: ResultUpload[] = [
  {
    id: "RU-CS220-2024S2",
    subjectId: "CS220",
    uploadedBy: PEOPLE_IDS.sobri,
    term: PRIOR_TERM,
    rows: [{ cloId: "CLO4", meanScore: 0.59, sd: 0.21, n: 198 }],
    filedAt: "2026-01-22T14:40:00Z",
  },
];

// ---------- the canonical proposal (CS220 before MA201) ----------
// kind "update": Dr Sobri (coordinator + lecturer) revises CS220. The sequencing
// conflict (CS220 ahead of MA201) is encoded in the subject graph above; the
// acceptance test detects it and measures the readiness drop. The draft carries
// the topics and CLO edit the Course Studio renders.
export const CANONICAL_PROPOSAL: ChangeProposal = {
  id: "CP-CS220-001",
  subjectId: "CS220",
  kind: "update",
  authorId: PEOPLE_IDS.sobri,
  draft: {
    topics: [
      "Gradient descent and the logistic loss",
      "Regularisation (L1 / L2)",
      "Model evaluation: ROC, precision/recall",
      "Feature scaling and the role of linear algebra",
    ],
    cloChanges: [
      {
        cloId: "CLO4",
        op: "edit",
        text: "Build, train and evaluate a machine-learning model, and explain the linear-algebra foundations it relies on.",
        bloomLevel: "Analyse",
      },
    ],
    testDraft:
      "Q. Derive the gradient of the logistic loss with respect to the weight vector, and state the matrix form of one gradient-descent step.",
    labDraft:
      "Lab: implement logistic regression from scratch on a small dataset; compare against scikit-learn and discuss why feature scaling matters.",
  },
  status: "drafting",
  history: [
    { at: "2026-06-20T08:30:00Z", byPersonId: PEOPLE_IDS.sobri, action: "drafted", note: "Initial revision of CS220." },
  ],
};

// ---------- a seed subject version (for the version history view) ----------
export const SEED_SUBJECT_VERSIONS: SubjectVersion[] = [
  {
    id: "CS220-v1",
    subjectId: "CS220",
    snapshot: { title: "Applied Machine Learning", cloIds: ["CLO4"], prerequisiteSubjectIds: ["MA201"] },
    cloSnapshot: CLOS.filter((c) => c.subjectId === "CS220"),
    changedBy: PEOPLE_IDS.rahman,
    changedAt: "2025-08-01T00:00:00Z",
    reason: "Subject created with the current curriculum.",
  },
];

// ---------- closed-loop predictions (none open at seed; written on approval) ----------
export const SEED_PREDICTIONS: Prediction[] = [];
