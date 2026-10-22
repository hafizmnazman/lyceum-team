// Lyceum v3, Layer 0 data model (implementation spec Sections 1 and 4).
//
// This is the contract. Every page and every agent reads and writes only these
// shapes. The v2 contract is carried unchanged (so the audited spine, the seed
// and the proofs port cleanly); the v3 additions (real intake, test creation,
// agent presence, demand truth, verification) are appended in marked sections.
//
// The audited spine (src/lib/spine/*) computes over a small set of computation
// types (Student, Cohort, ItemResult, CLOMastery, CohortResult) that are NOT
// part of the Layer 0 contract; they live in a marked appendix at the bottom so
// the spine imports resolve against one place and the maths stays byte-identical.

// ---------- ids ----------
export type PersonId = string;
export type ProgrammeId = string;
export type SubjectId = string;
export type CLOId = string;
export type ProposalId = string;

export type BloomLevel =
  | "Remember"
  | "Understand"
  | "Apply"
  | "Analyse"
  | "Evaluate"
  | "Create";

// ---------- people, hats, scope ----------
// Org tier is fixed to the person. Subject-level hats are per (person x subject).
export type OrgRole = "management" | "department" | "academic";
export type Hat = "coordinator" | "lecturer";

export interface Person {
  id: PersonId;
  name: string; // e.g. "Dr Sobri"
  orgRole: OrgRole; // management, department owner, or an academic who holds hats
  departmentOf?: ProgrammeId; // set when orgRole === "department": the programme they own
  // v3: verification (supply-side truth). Verified = institutional email domain
  // + presence on the official course page. Unverified people can work, but
  // their edits carry an "unverified" tag and the approval gate shows it.
  email?: string;
  verified?: boolean;
}

export interface RoleAssignment {
  // the model that resolves the lecturer/coordinator overlap
  personId: PersonId;
  subjectId: SubjectId;
  hat: Hat; // a person can appear here twice for one subject (both hats)
}

// ---------- curriculum ----------
export interface Programme {
  id: ProgrammeId;
  title: string; // "Bachelor of Computer Science"
  departmentOwnerId: PersonId;
  subjectIds: SubjectId[];
  // Track C (depth plan Section 4.2): the programme learning outcomes, each with its MQF cluster.
  plos?: ProgrammeOutcome[];
}
export interface ProgrammeOutcome { id: string; text: string; cluster: string }

export interface Subject {
  id: SubjectId; // "CS220"
  title: string; // "Applied Machine Learning"
  programmeId: ProgrammeId;
  year: number; // 1..4
  semester: number;
  cloIds: CLOId[];
  prerequisiteSubjectIds: SubjectId[];
  sharedWithProgrammeIds: ProgrammeId[]; // cross-programme ripple
  status: "active" | "proposed"; // proposed = a new subject not yet approved
  currentVersionId: string;
  workspaceOnly?: boolean;
  // v3: supply-side truth. Content ingested from a published document (the
  // official syllabus pdf, the public course page) is verified with its source;
  // self-entered content is labelled unverified until it matches one.
  syllabusSourceUrl?: string;
  syllabusVerifiedAt?: string;
}

export interface CLO {
  label?: string;
  id: CLOId;
  subjectId: SubjectId;
  text: string;
  bloomLevel: BloomLevel;
  demandSignal?: number; // 0..1, written by the Signal agent
}

export interface Item {
  // same shape as v1
  id: string;
  text: string;
  targetCLO: CLOId;
  bloomLevel: BloomLevel;
  difficulty: number; // b, from the Bloom ladder
}

// ---------- the data spine (real ground) ----------
export interface SurveyRecord {
  // CLO mastery survey + SSRT, per student per subject per term
  studentId: string;
  subjectId: SubjectId;
  term: string; // "2025-S1"
  cloRatings: Record<CLOId, number>; // 1..10 self-rating
}

export interface ResultUpload {
  // what a lecturer drops in
  id: string;
  subjectId: SubjectId;
  uploadedBy: PersonId;
  term: string;
  rows: Array<{ cloId: CLOId; meanScore: number; sd: number; n: number;
    // D4a (depth plan Section 8.2): the valid marks out of 100, sorted and never with an identifier, the listed students
    // without a mark, and the pass mark the profile held at filing. A row from an older backup or an aggregated file has none.
    marks?: number[]; missing?: number; passMarkAtFiling?: number }>;
  filedAt: string; // ISO
  // v3: which file this came from, for provenance in the Data room.
  sourceFileName?: string;
  // A2b: the course version these results are for, the version taught that term, confirmed when filed (plan Section 4, Learn).
  courseVersionId?: string;
  // A8: filed from one of the app's sample files, so its marks are synthetic and say so.
  sample?: boolean;
}

export interface DataSource {
  // for the data room freshness view
  kind: "clo-survey" | "ssrt" | "results" | "syllabus" | "material";
  subjectId: SubjectId;
  term: string;
  recordCount: number;
  ingestedAt: string;
  // v3: verified = ingested from a published document rather than self-entered.
  verified?: boolean;
  sourceFileName?: string;
  sample?: boolean; // A8: filed from one of the app's sample files
}

// ---------- change proposals (the flow) ----------
export type ProposalStatus =
  | "drafting" // author working in Course Studio
  | "coordinator-review" // lecturer-drafted, awaiting coordinator
  | "testing" // acceptance test running
  | "management-approval" // tested, awaiting management
  | "approved"
  | "rejected";

export interface ProposalEvent {
  at: string;
  byPersonId: PersonId;
  action:
    | "drafted"
    | "agent-drafted"
    | "agent-reviewed"
    | "submitted-for-review"
    | "review-approved"
    | "review-changes-requested"
    | "tested"
    | "approved"
    | "rejected";
  note?: string;
}

export interface ChangeProposal {
  id: ProposalId;
  subjectId: SubjectId;
  kind: "update" | "new-subject";
  authorId: PersonId;
  draft: {
    topics?: string[];
    cloChanges?: Array<{
      cloId?: CLOId;
      text: string;
      bloomLevel: BloomLevel;
      op: "add" | "edit" | "remove";
    }>;
    testDraft?: string;
    labDraft?: string;
    // v3: a structured test built in the assessment studio rides with the
    // proposal through the same review chain.
    testDraftId?: string;
  };
  status: ProposalStatus;
  baselineVersionId?: string;
  testedDraftFingerprint?: string;
  acceptanceResult?: VerdictReport; // filled by the Cohort agent
  history: ProposalEvent[];
}

// ---------- verdict (reuse the audited shape) ----------
export interface VerdictReport {
  summary: string;
  projectedMastery: number; // e.g. 0.58
  currentMastery: number; // e.g. 0.60
  cloMastery: Array<{
    cloId: CLOId;
    meanP: number;
    spread: number;
    confidence: number;
  }>;
  failedItems: Array<{ studentId: string; itemId: string; p: number }>;
  drillRoot: {
    studentId: string;
    cloId: CLOId;
    theta: number;
    itemId: string;
    b: number;
    p: number;
    cause: string;
  };
  prerequisiteConflicts: Array<{
    subjectId: SubjectId;
    missingPrereqId: SubjectId;
    edge: [SubjectId, SubjectId];
  }>;
  groundedOnLearners: number; // for the provenance line
  isProxyCohort: boolean; // true when the Analogy agent stood in
}

// ---------- closed loop ----------
export interface Prediction {
  proposalId: ProposalId;
  subjectId: SubjectId;
  predictedMastery: number;
  madeAt: string;
  actualMastery?: number; // filled when the next term's results arrive
  residual?: number; // |predicted - actual|
}

// ---------- connective tissue ----------
export type NotificationKind =
  | "ping-update"
  | "ping-new-subject"
  | "review-request"
  | "test-done"
  | "approved"
  | "rejected"
  | "evidence-brief"
  | "brief-decision"; // a decision was recorded on a brief you prepared

export interface Notification {
  id: string;
  toPersonId: PersonId;
  kind: NotificationKind;
  subjectId?: SubjectId;
  proposalId?: ProposalId;
  agentFindings?: string; // the context that prompted the ping
  briefId?: string; // an evidence brief a lecturer sent
  read: boolean;
  createdAt: string;
}

/** Lecturer-authored preparation, separate from the formal curriculum proposal. */
export interface TeachingSession {
  courseVersionId?: string;
  needsReview?: boolean;
  id: string;
  week: number;
  topic: string;
  minutes: number;
  cloIds: string[];
  activity: string;
  learningCheck: string;
  resources: string;
  status: "draft" | "ready" | "delivered";
  updatedAt: string;
  updatedBy: PersonId;
  // Track C (depth plan Section 5.1), optional so older records load:
  slides?: SlideDraft[]; // the session's own slides; without them the pack is built from the records
  labSheet?: string; // markdown
  projectBrief?: string; // markdown
  topicId?: string; // the course topic this session teaches
  sample?: boolean; // a labelled fixture written for the prototype; never counted as this term's teaching
  items?: DraftItem[]; // D7 (depth plan Section 10): the check for understanding as items, drafted for the lecturer's review
}

// ---------- assessment items (depth plan Section 10) ----------
export type ItemKind = "multichoice" | "shortanswer" | "essay";
export interface ItemOption { text: string; correct: boolean; feedback?: string }
/** An item drafted for a lecturer's review. The app never marks one approved; a person's review is a record, cleared when
 *  the item changes. A verb in a stem does not make an item test that level. */
export interface DraftItem {
  id: string; kind: ItemKind; cloId: string; bloomLevel: BloomLevel; stem: string; marks: number;
  options?: ItemOption[]; // multichoice: three or four, one keyed
  answers?: string[]; // shortanswer: the accepted answers
  graderInfo?: string; // essay: what the marker looks for
  responseLines?: number; // essay: the answer box's height
  source: "template" | "sample"; // drafted by Lyceum's templates, or a sample written for this prototype
  reviewedBy: PersonId | null; reviewedAt: string | null;
}
/** One slide a lecturer wrote: a title, bullets and speaker notes, with an optional second column or figure. */
export interface SlideDraft {
  title: string;
  bullets: string[];
  notes: string;
  right?: string[]; // a second column: the slide uses the two-column master
  section?: boolean; // a section divider
  figure?: { kind: "table"; header: string[]; rows: string[][]; alt: string } | { kind: "placeholder"; label: string };
}

export interface TeachingPlan {
  subjectId: SubjectId;
  term: string;
  notes: string;
  sessions: TeachingSession[];
  updatedAt: string;
  updatedBy: PersonId;
}

export interface SubjectVersion {
  definition?: CourseDefinition;
  effectiveTerm?: string;
  id: string;
  subjectId: SubjectId;
  snapshot: Pick<Subject, "title" | "cloIds" | "prerequisiteSubjectIds">;
  cloSnapshot: CLO[];
  changedBy: PersonId;
  changedAt: string;
  reason: string;
}

// ============================================================================
// v3 additions, Section A: real intake (files in, interpreted, confirmed)
// ============================================================================

export type UploadedFileKind = "xlsx" | "csv" | "pdf" | "pptx" | "docx";

/** What /api/parse returns for any dropped file, agent-agnostic. */
export interface ParsedDoc {
  fileName: string;
  kind: UploadedFileKind;
  pages: Array<{ index: number; text: string }>; // slides = pages
  tables: Array<{ name: string; rows: string[][] }>; // sheets and detected tables
  // A8: one of the sample files the app ships in public/demo; every record filed from it says it is synthetic.
  sample?: boolean;
}

/** What the Intake agent makes of a ParsedDoc. The user always confirms this
 *  before anything files; the preview-and-confirm step is the trust boundary. */
export interface IntakeInterpretation {
  docType: "results" | "clo-survey" | "syllabus" | "slides" | "unknown";
  subjectGuess?: SubjectId;
  termGuess?: string;
  mappedRows?: ResultUpload["rows"]; // when docType === "results"
  surveyRecords?: SurveyRecord[]; // when docType === "clo-survey"
  contentSummary?: string; // syllabus/slides: filed as subject material
  courseVersionId?: string; // results: the course version taught, confirmed by the person filing
  confidence: number; // 0..1, shown to the user
  notes: string[]; // "column 'Avg' read as meanScore", etc.
}

// ============================================================================
// v3 additions, Section B: test creation (the assessment studio)
// ============================================================================

/** The coordinator's contract for a test. */
export interface AssessmentBlueprint {
  subjectId: SubjectId;
  totalMarks: number;
  cloWeights: Array<{ cloId: CLOId; weight: number }>; // must sum to 1
  bloomMix: Partial<Record<BloomLevel, number>>; // proportions, sum <= 1
}

export type TestItem = Item & {
  marks: number;
  modelAnswer?: string;
  source: "agent" | "human";
};

export interface TestDraft {
  needsReview?: boolean;
  courseVersionId?: string;
  id: string;
  subjectId: SubjectId;
  proposalId?: ProposalId; // when part of a change proposal
  blueprint: AssessmentBlueprint;
  items: TestItem[];
  status: "drafting" | "coordinator-review" | "approved";
  authorId: PersonId;
}

// ============================================================================
// v3 additions, Section C: agent presence (one live invocation, drives all UI)
// ============================================================================

export type AgentName =
  | "intake"
  | "signal"
  | "curriculum"
  | "authoring"
  | "cohort"
  | "analogy"
  | "evaluator";

export interface AgentRun {
  id: string;
  agent: AgentName;
  status: "queued" | "thinking" | "streaming" | "done" | "failed" | "fallback";
  startedAt: string;
  label: string; // one quiet line for the agent strip
  streamText?: string; // grows while streaming
  resultRef?: string; // id of whatever it produced
  onPage: string; // the screen it belongs to
}

// ============================================================================
// v3 additions, Section D: demand truth (multi-source) + the Relevance Index
// ============================================================================

export interface MarketSource {
  id: string; // "jobstreet" | "linkedin" | "glassdoor" | "mohe-col"
  name: string;
  kind: "job-platform" | "gov-labour" | "industry-report";
  snapshotDate: string; // shown in the UI: "prepared snapshot, <date>"
  recordCount: number;
  isSynthetic: boolean; // true: names, dates and counts illustrate a source; no retrieved records
}

/** One source's view of one skill. */
export interface DemandEvidence {
  sourceId: string;
  skill: string;
  demandScore: number; // 0..1 normalised within the source
  delta12m: number; // change vs 12 months ago
}

export type RelevanceBand = "aligned" | "drifting" | "misaligned" | "unrated";

/** The advisory's core output, per subject. Rendered on the public Relevance
 *  Index, on Trends, on Courses, and in the Studio header. */
export interface RelevanceRating {
  subjectId: SubjectId;
  score: number; // 0..1
  band: RelevanceBand;
  perCLO: Array<{ cloId: CLOId; score: number; movedBy: string[] }>;
  evidence: DemandEvidence[]; // the receipts, grouped by source in the UI
  agreement: number | null; // direction agreement only; null means insufficient evidence
  ratedAt: string;
}

// ============================================================================
// Layer 1, spine computation types (NOT part of the Layer 0 contract).
//
// These are the shapes the audited spine (src/lib/spine/*) computes over. The
// spine files import them from here so the maths copies across byte-identical.
// ============================================================================

export interface Student {
  id: string;
  cohortId: string;
  ratings: Record<CLOId, number>; // raw 1..10 self-rating, kept for provenance
  ability: Record<CLOId, number>; // theta per CLO, on the logistic scale
}

export interface Cohort {
  id: string;
  intake: string; // e.g. "2023-S1". Labels the batch. Never blend batches.
  programmeId: string;
  students: Student[];
}

export interface ItemResult {
  studentId: string;
  itemId: string;
  p: number; // P(correct) from the link
  outcome: 0 | 1; // seeded Bernoulli draw, gives concrete pass/fail
}

export interface CLOMastery {
  cloId: CLOId;
  meanP: number; // cohort mean P on this CLO
  spread: number; // SD across the cohort
  confidence: number; // 0..1, from how much grounding data backs this CLO
}

export interface CohortResult {
  cohortId: string;
  itemResults: ItemResult[]; // full provenance: every student x every item
  cloMastery: CLOMastery[];
}


// ---------- lecturer-controlled curriculum workspaces ----------
export interface CourseBrief {
  programmeTitle: string;
  level: string;
  language: string;
  credits: number | null;
  teachingWeeks: number | null;
  contactHours: number | null;
  selfStudyHours: number | null;
  targetRoles: string;
  framework: string;
  programmeOutcomes: string[];
  notes: string;
}
export type PloLevel = "H" | "M" | "L";
export interface CourseOutcome extends CLO {
  label: string;
  assessmentEvidence: string;
  ploIds: string[]; // kept for compatibility; derived from ploLinks when they exist
  // Track C (depth plan Section 4.2), optional so older records load:
  mqfCluster?: string;
  ploLinks?: Array<{ ploId: string; level: PloLevel }>; // the CLO to PLO matrix, a level in every linked cell
}
export type TopicKind = "lecture" | "lab" | "mixed" | "quiz" | "studio" | "review";
export interface CourseTopic {
  id: string;
  title: string;
  week: number | null;
  contactHours: number; // the sum the Meter and the constraint check use; lectureHours + labHours when both are recorded
  selfStudyHours: number;
  cloIds: string[];
  prerequisiteTopicIds: string[];
  protected: boolean;
  resources: string;
  // Track C, optional:
  kind?: TopicKind;
  lectureHours?: number;
  labHours?: number;
  activities?: string;
  readings?: string;
  misconceptions?: string[];
}
export interface Reference { citation: string; year: number | null; note?: string }
/** Student learning time in hours (depth plan Section 4.3): lecture and lab follow the topics; the total is checked against credits times 40. */
export interface StudentLearningTime {
  lecture: number; lab: number; selfStudy: number;
  assessmentWork: { quizzes: number; labs: number; essay: number; project: number };
  exam: number;
}
/** One assessed component, with its marks allocated by outcome and Bloom level, so the table of specifications is a sum. */
export interface AssessmentComponent {
  id: string; title: string; kind: "quiz" | "lab" | "project" | "defence" | "essay" | "exam"; weight: number; week: string;
  description: string; individual: boolean;
  allocation: Array<{ cloId: string; bloomLevel: BloomLevel; marks: number }>;
  rubricId?: string;
}
export interface CourseDefinition {
  title: string;
  brief: CourseBrief;
  outcomes: CourseOutcome[];
  topics: CourseTopic[];
  // Track C (depth plan Section 4.2), optional so older records load:
  synopsis?: string;
  methods?: string[];
  references?: Reference[];
  referencesGap?: string; // what the reference list still lacks, said rather than hidden
  assessment?: AssessmentComponent[];
  slt?: StudentLearningTime;
  source?: string; // where a sample record's content was modelled from
  sample?: boolean; // a labelled fixture written for the prototype
}
/** A rubric: four levels in the VALUE rubrics' grid shape, with our own descriptors (depth plan Section 4.2). */
export interface Rubric {
  id: string; subjectId: SubjectId; componentId: string; title: string;
  criteria: Array<{ name: string; marks: number; cloIds: string[]; levels: [string, string, string, string] }>; // capstone, milestone 2, milestone 1, benchmark
  sample?: boolean;
}
export interface CurriculumDecision {
  at: string;
  byPersonId: PersonId;
  action: "created" | "saved" | "checked" | "adopted" | "discarded";
  note: string;
  revision: number;
}
export interface CurriculumDraft {
  id: string;
  subjectId: SubjectId;
  baselineVersionId: string;
  revision: number;
  definition: CourseDefinition;
  reason: string;
  effectiveTerm: string;
  status: "drafting" | "adopted" | "discarded";
  checkedRevision: number | null;
  history: CurriculumDecision[];
}

// ---------- lecturer-supplied evidence receipts (manual first; no live collection) ----------
export type EvidenceKind = "job-posting" | "professional-standard" | "advisory-note" | "other";
export type MentionRequirement = "required" | "preferred" | "unclear";
export type CoverageStage = "unknown" | "absent" | "introduced" | "practised" | "assessed";
/** One document the lecturer pasted in. The text is the receipt; nothing is fetched. */
export interface EvidenceSource {
  id: string;
  subjectId: SubjectId;
  kind: EvidenceKind;
  title: string;
  organisation: string; // employer or issuing body, as supplied
  url: string; // optional link supplied by the lecturer; never fetched
  sourceDate: string; // publication date as supplied; may be empty, never manufactured
  text: string; // the retained text, quoted from verbatim
  textHash: string; // fingerprint of the normalised text, for duplicate detection
  duplicateOf: string | null; // the original copy when the same text was recorded twice
  provenance: "lecturer-supplied" | "collected";
  collection?: EvidenceCollection; // present when fetched from a permitted board or the saved sample
  reviewed: boolean; // extraction complete: the posting counts in the denominator
  addedBy: PersonId;
  addedAt: string;
}
/** An exact quotation from a source, attributed to a skill or requirement. */
export interface SkillMention {
  id: string;
  sourceId: string;
  subjectId: SubjectId;
  skill: string;
  excerpt: string; // must exist in the source text; only spacing may differ
  requirement: MentionRequirement;
  addedBy: PersonId;
  addedAt: string;
}
/** The lecturer's reviewed judgement of how the course covers a quoted skill. */
export interface SkillMapping {
  subjectId: SubjectId;
  skill: string;
  cloIds: string[]; // course-scoped outcome identities
  stage: CoverageStage; // documented coverage; unknown until reviewed
  target: CoverageStage; // the stage this course should reach; unknown when not set
  evidence: string; // cited course evidence for the stage
  updatedBy: PersonId;
  updatedAt: string;
}

// ---------- the lecturer's research run ----------
export type CollectionProvider = "sample" | "greenhouse" | "lever";
/** Where a collected source came from. The retrieval time is never the publication date. */
export interface EvidenceCollection { provider: CollectionProvider; board: string; postingId: string; retrievedAt: string; label: string }
/** One posting fetched from a permitted board, before the lecturer decides to keep it. Transient. */
export interface CollectedPosting {
  id: string; provider: CollectionProvider; board: string; title: string; organisation: string; location: string; url: string;
  publishedAt: string; // as published by the board, empty when unknown
  updatedAt: string; text: string; retrievedAt: string;
}
// ---------- watching the evidence over time ----------
/** A reviewed posting as it stood when a snapshot was frozen. `identity` stays stable across re-imports of the same board posting. */
export interface SnapshotPosting { id: string; identity: string; title: string; organisation: string; url: string; sourceDate: string; textHash: string }
/** One skill's counts at the moment of freezing. Intervals are recomputed from these counts, never stored. */
export interface SnapshotSkill {
  key: string; skill: string;
  postings: number; required: number; preferred: number; // reviewed vacancy clusters quoting it
  stage: CoverageStage; target: CoverageStage; // the lecturer's reviewed coverage at the time
  sourceIds: string[]; // the canonical postings behind the count, for receipts
}
/** The reviewed evidence for one course, frozen at a moment so a later window can be compared with it. Never edited after it is taken. */
export interface EvidenceSnapshot {
  id: string; subjectId: SubjectId; label: string; takenBy: PersonId; takenAt: string;
  eligible: number; organisations: number; unreviewed: number; duplicates: number; contextual: number;
  lookedFor: string[]; // skill keys scanned for or quoted at the time; a skill outside this list was not looked for
  skills: SnapshotSkill[];
  postings: SnapshotPosting[];
}

export type BriefRecommendation = "keep" | "refresh" | "revise" | "undecided";
/** A meeting brief prepared from the evidence at one moment; the markdown is a snapshot with receipts. */
export interface EvidenceBrief {
  id: string; subjectId: SubjectId; createdBy: PersonId; createdAt: string; recommendation: BriefRecommendation; notes: string; markdown: string;
  recipients: PersonId[]; sentAt: string | null;
}

// ---------- the decision record and the event log (plan Section 4) ----------
export type DecisionOutcome = "adopt" | "retain" | "defer" | "return";
/** One person's decision on one brief, bound to the brief, the course version and the term. Immutable:
 *  an amendment is a new record, and a person's latest record on a brief is their standing decision. */
export interface BriefDecision {
  id: string; briefId: string; subjectId: SubjectId; courseVersionId: string; term: string;
  byPersonId: PersonId; at: string; outcome: DecisionOutcome; note: string;
}
export type LoopEventKind = "brief-prepared" | "brief-sent" | "brief-read" | "decision-recorded" | "snapshot-frozen" | "version-adopted" | "term-set"
  | "grades-released" | "survey-opened" | "survey-collected" | "cqi-noted"; // Track C (depth plan Sections 7, 8 and 11)
/** An append-only record of what happened and when. The How it works timeline reads these first. */
export interface LoopEvent {
  id: string; at: string; byPersonId: PersonId; kind: LoopEventKind;
  refs: { subjectId: SubjectId; briefId?: string; decisionId?: string; snapshotId?: string; versionId?: string; draftId?: string; term?: string; previousTerm?: string; formId?: string; count?: number; noteId?: string; source?: "booth" | "imported" | "pasted" };
}

// ---------- attainment against a stated threshold (depth plan Section 8) ----------
/** The lecturer's continuous quality improvement note for a course and term, a saved record History shows. */
export interface CqiNote { id: string; subjectId: SubjectId; term: string; versionId: string | null; text: string; at: string; byPersonId: PersonId }
/** One outcome's direct line as printed: n of N, the mean, the count and share at or above the pass mark, the KPI. */
export interface ObeDirectRow {
  cloId: CLOId; label: string; text: string; N: number; n: number; missing: number; filed: boolean;
  mean: number | null; sd: number | null; atOrAbove: number | null; share: number | null; kpiMet: boolean | null;
  interval: { low: number; high: number } | null;
}
/** The Course Outcome Survey's line for an outcome: the share at the target or higher over those who chose a point. */
export interface ObeIndirectRow { cloId: CLOId; n: number; atTarget: number; share: number | null }
/** Per programme outcome, the linked course outcomes with their strength and direct share, listed: no index. */
export interface ObePloRow { ploId: string; text: string; links: Array<{ cloId: CLOId; label: string; level: "H" | "M" | "L"; share: number | null }> }
/** The OBE course report as printed (depth plan Section 8.3): a snapshot of the figures and of the settings that shaped them,
 *  so a later change to the profile cannot relabel it. */
export interface ObeReport {
  id: string; subjectId: SubjectId; term: string; versionId: string | null; uploadId: string; sourceFileName: string | null; sample: boolean;
  passMark: number; studentShare: number; method: "share-above-mark";
  surveyId: string | null; surveyTitle: string | null; surveyVersionId: string | null; surveyTarget: number | null;
  respondents: number | null; classSize: number | null; rate: string | null; floorRequired: number | null; surveyOpen: boolean; surveyNote: string | null;
  direct: ObeDirectRow[]; indirect: ObeIndirectRow[]; plos: ObePloRow[];
  cqiNoteId: string | null; printedAt: string; printedBy: PersonId;
}

// ---------- the two student surveys (depth plan Section 7) ----------
export type SurveyKind = "course-outcome" | "ssrt";
/** One question. Its id is also printed at the start of its text ("Q3."), so an import matches on the id, not the wording. */
export interface SurveyQuestion { id: string; text: string; kind: "scale" | "comment"; cloId?: string; dimension?: string }
/** A scale point, "cannot-say" (excluded from means, counted), or a comment's text. A missing key is an unanswered item. */
export type SurveyAnswer = number | "cannot-say" | string;
export interface SurveyDefinition {
  id: string; subjectId: SubjectId; kind: SurveyKind; title: string; term: string; versionId: string | null;
  scale: { min: number; max: number; target: number; labels: string[] };
  questions: SurveyQuestion[];
  instrumentNote: string | null; // the SSRT's label: a demo instrument, unvalidated
  classSize: number | null;      // the class the floor's share and the response rate are over, when it is known
  formToken: string | null;      // set when the form opens for the booth collector: it can post, never read
  readerSecret: string | null;   // held only here; the token is the first 22 characters of its SHA-256
  createdAt: string; createdBy: PersonId; sample?: boolean;
  sampleReleasedAt?: string;     // a sample term's grades, recorded as released with the sample; a real term's release is an event
}
/** One student's answers, keyed by question id. Nothing in it identifies a student: a booth response keeps the random id
 *  its device drew, so one device answers once; an imported one keeps nothing of the export's identity columns. */
export interface SurveyResponse {
  id: string; formId: string; term: string; answers: Record<string, SurveyAnswer>;
  collectedAt: string; clientId: string | null; source: "booth" | "pasted" | "imported" | "sample";
}

// ---------- the institution profile (depth plan Section 3.1) ----------
/** The campus the workspace runs for, and every setting that shapes a figure. Each value is printed beside the
 *  figure it shapes, because attainment and survey conventions differ by institution and no national method exists. */
export interface InstitutionProfile {
  name: string; // "Universiti Teknologi PETRONAS (demo)": a demo profile keeps the word demo in its name
  shortName: string;
  showMark: boolean; // false for a campus that must not show its mark on sample material
  mark: { svg: string; png: string; pngSmall: string; wide?: string; alt: string }; // served from public/brand/partners/; wide fits a slide corner
  kpi: { passMark: number; studentShare: number; method: "share-above-mark" }; // a mark out of 100; a share from 0 to 1
  surveyScale: { min: number; max: number; target: number }; // the agreement scale and the "target or higher" point
  surveyFloor: number; // the fewest responses before any aggregate is shown
  surveyFloorShare: number; // and the smallest share of the class; the stricter of the two applies
  releaseRule: "all-results-after-grades";
  lms: string;
  controller: string; // the privacy line the student page shows
  privacyNoticeUrl: string; // linked as the demo's example, never as the operator's notice
  termPattern: string;
  demo: boolean;
}
