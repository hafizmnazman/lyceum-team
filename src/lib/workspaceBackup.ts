import type { AppState } from "../app/store.ts";
import { draftStructureError } from "./curriculum.ts";
import { COVERAGE_STAGES, EVIDENCE_KINDS, REQUIREMENT_LEVELS, locateExcerpt, skillKey, textFingerprint } from "./evidence.ts";
import { institutionError } from "./institution.ts";
import { DEMO_INSTITUTION } from "../data/institution.ts";
import { DEMO_PLOS } from "../data/sample-course/cs310.ts";

export const WORKSPACE_DATA_KEYS = ["programme", "assignments", "subjects", "clos", "survey", "institution", "proposals",
  "notifications", "predictions", "resultUploads", "dataSources", "subjectVersions", "testDrafts", "teachingPlans",
  "courseDefinitions", "rubrics", "curriculumDrafts", "evidenceSources", "skillMentions", "skillMappings", "evidenceBriefs", "evidenceSnapshots", "briefDecisions", "events", "surveys", "surveyResponses", "obeReports", "cqiNotes", "skillLexicon", "relevanceRatings", "idSeq"] as const;
/** Records added after schema version 1 (2: evidence, 3: briefs and lexicon, 4: evidence snapshots, 5: the decision record and
 *  the event log, 6: Track C's institution profile and course records). A backup without one restores with its default; Track C
 *  adds its records to schema 6 package by package, so a schema 6 file from an earlier package restores the same way. */
const LATER_DEFAULTS: Partial<Record<typeof WORKSPACE_DATA_KEYS[number], unknown>> = { evidenceSources: [], skillMentions: [], skillMappings: [], evidenceBriefs: [], evidenceSnapshots: [], briefDecisions: [], events: [], skillLexicon: {}, institution: DEMO_INSTITUTION, rubrics: [], surveys: [], surveyResponses: [], obeReports: [], cqiNotes: [] };
export const BACKUP_SCHEMA_VERSION = 6;
export type WorkspaceData = Pick<AppState, typeof WORKSPACE_DATA_KEYS[number]>;
export interface WorkspaceBackup { application: "Lyceum"; schemaVersion: 1 | 2 | 3 | 4 | 5 | 6; exportedAt: string; data: WorkspaceData }
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
type Check = (value: unknown) => boolean;
const record = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const str: Check = x => typeof x === "string" && x.length <= 200000;
const id: Check = x => typeof x === "string" && x.length > 0 && x.length <= 200 && !["__proto__", "constructor", "prototype"].includes(x);
const num: Check = x => typeof x === "number" && Number.isFinite(x);
const nonnegative: Check = x => num(x) && (x as number) >= 0;
const integer: Check = x => nonnegative(x) && Number.isSafeInteger(x);
const boolean: Check = x => typeof x === "boolean";
const opt = (c: Check): Check => x => x === undefined || c(x);
const array = (c: Check, limit = 100000): Check => x => Array.isArray(x) && x.length <= limit && x.every(c);
const strings = array(id, 1000);
const one = (...values: unknown[]): Check => x => values.includes(x);
const shape = (fields: Record<string, Check>): Check => x => record(x) && Object.entries(fields).every(([k,c]) => c(x[k]));
const dict = (c: Check): Check => x => record(x) && Object.values(x).every(c);
const mark: Check = x => num(x) && (x as number) >= 0 && (x as number) <= 100;
const share: Check = x => x === null || (num(x) && (x as number) >= 0 && (x as number) <= 1);
const bloom = one("Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create");
const clo = shape({ id, subjectId: id, text: str, bloomLevel: bloom, label: opt(str), demandSignal: opt(num) });
const event = shape({ at: str, byPersonId: id, action: id, note: opt(str) });
const item = shape({ id, text: str, targetCLO: id, bloomLevel: bloom, difficulty: num, marks: nonnegative, source: one("agent", "human"), modelAnswer: opt(str) });
// A check's item (depth plan Section 10): drafted for a lecturer's review; a review names a person and a date.
const draftItem = shape({ id, kind: one("multichoice", "shortanswer", "essay"), cloId: id, bloomLevel: bloom, stem: str, marks: nonnegative,
  options: opt(array(shape({ text: str, correct: boolean, feedback: opt(str) }), 10)), answers: opt(array(str, 20)), graderInfo: opt(str), responseLines: opt(integer),
  source: one("template", "sample"), reviewedBy: x => x === null || id(x), reviewedAt: x => x === null || str(x) });
const blueprint = shape({ subjectId: id, totalMarks: num, cloWeights: array(shape({ cloId: id, weight: num }), 1000), bloomMix: dict(num) });
const predicates: Record<typeof WORKSPACE_DATA_KEYS[number], Check> = {
  programme: shape({ id, title: str, departmentOwnerId: id, subjectIds: strings, plos: opt(array(shape({ id, text: str, cluster: str }), 100)) }),
  assignments: array(shape({ personId: id, subjectId: id, hat: one("coordinator", "lecturer") })),
  subjects: array(shape({ id, title: str, programmeId: id, year: integer, semester: integer, cloIds: strings,
    prerequisiteSubjectIds: strings, sharedWithProgrammeIds: strings, status: one("active", "proposed"), currentVersionId: id,
    workspaceOnly: opt(boolean), syllabusSourceUrl: opt(str), syllabusVerifiedAt: opt(str) }), 10000),
  clos: array(clo),
  survey: array(shape({ studentId: id, subjectId: id, term: str, cloRatings: dict(x => num(x) && (x as number) >= 1 && (x as number) <= 10) })),
  institution: x => institutionError(x) === null,
  proposals: array(shape({ id, subjectId: id, kind: one("update", "new-subject"), authorId: id,
    draft: shape({ topics: opt(array(str, 1000)), cloChanges: opt(array(shape({ cloId: opt(id), text: str, bloomLevel: bloom, op: one("add", "edit", "remove") }), 1000)),
      testDraft: opt(str), labDraft: opt(str), testDraftId: opt(id) }),
    status: one("drafting", "coordinator-review", "testing", "management-approval", "approved", "rejected"),
    history: array(event), baselineVersionId: opt(id), testedDraftFingerprint: opt(str),
    acceptanceResult: opt(shape({ summary: str, projectedMastery: num, currentMastery: num,
      cloMastery: array(shape({ cloId: id, meanP: num, spread: num, confidence: num })),
      failedItems: array(shape({ studentId: id, itemId: id, p: num })),
      drillRoot: shape({ studentId: id, cloId: id, theta: num, itemId: id, b: num, p: num, cause: str }),
      prerequisiteConflicts: array(shape({ subjectId: id, missingPrereqId: id, edge: strings })),
      groundedOnLearners: integer, isProxyCohort: boolean })) })),
  notifications: array(shape({ id, toPersonId: id, kind: one("ping-update","ping-new-subject","review-request","test-done","approved","rejected","evidence-brief","brief-decision"),
    subjectId: opt(id), proposalId: opt(id), agentFindings: opt(str), briefId: opt(id), read: boolean, createdAt: str })),
  predictions: array(shape({ proposalId: id, subjectId: id, predictedMastery: num, madeAt: str, actualMastery: opt(num), residual: opt(num) })),
  resultUploads: array(shape({ id, subjectId: id, uploadedBy: id, term: str, filedAt: str, sourceFileName: opt(str), courseVersionId: opt(id), sample: opt(boolean),
    rows: array(shape({ cloId: id, meanScore: num, sd: nonnegative, n: integer, marks: opt(array(mark, 100000)), missing: opt(integer), passMarkAtFiling: opt(mark) })) })),
  dataSources: array(shape({ kind: one("clo-survey","ssrt","results","syllabus","material"), subjectId: id, term: str,
    recordCount: integer, ingestedAt: str, verified: opt(boolean), sourceFileName: opt(str), sample: opt(boolean) })),
  subjectVersions: array(shape({ id, subjectId: id, snapshot: shape({ title: str, cloIds: strings, prerequisiteSubjectIds: strings }),
    cloSnapshot: array(clo), changedBy: id, changedAt: str, reason: str, effectiveTerm: opt(str),
    definition: opt(x => record(x)) })),
  testDrafts: array(shape({ id, subjectId: id, proposalId: opt(id), blueprint, items: array(item),
    status: one("drafting","coordinator-review","approved"), authorId: id, needsReview: opt(boolean), courseVersionId: opt(id) })),
  teachingPlans: array(shape({ subjectId: id, term: str, notes: str, updatedAt: str, updatedBy: id,
    sessions: array(shape({ id, week: integer, topic: str, minutes: integer, cloIds: strings, activity: str, learningCheck: str,
      resources: str, status: one("draft","ready","delivered"), updatedAt: str, updatedBy: id,
      needsReview: opt(boolean), courseVersionId: opt(id),
      slides: opt(array(shape({ title: str, bullets: array(str, 100), notes: str, right: opt(array(str, 100)), section: opt(boolean),
        figure: opt(x => record(x) && ((x.kind === "table" && array(str, 20)(x.header) && array(array(str, 20), 100)(x.rows) && str(x.alt)) || (x.kind === "placeholder" && str(x.label)))) }), 100)),
      labSheet: opt(str), projectBrief: opt(str), topicId: opt(id), sample: opt(boolean), items: opt(array(draftItem, 200)) })) })),
  courseDefinitions: dict(x => record(x)),
  rubrics: array(shape({ id, subjectId: id, componentId: id, title: str, sample: opt(boolean),
    criteria: array(shape({ name: str, marks: nonnegative, cloIds: strings, levels: x => Array.isArray(x) && x.length === 4 && x.every(str) }), 100) }), 1000),
  curriculumDrafts: array(shape({ id, subjectId: id, baselineVersionId: id, revision: integer, definition: x => record(x),
    reason: str, effectiveTerm: str, status: one("drafting","adopted","discarded"), checkedRevision: x => x === null || integer(x),
    history: array(shape({ at: str, byPersonId: id, action: one("created","saved","checked","adopted","discarded"), note: str, revision: integer })) })),
  evidenceSources: array(shape({ id, subjectId: id, kind: one(...EVIDENCE_KINDS), title: str, organisation: str, url: str, sourceDate: str, text: str,
    textHash: str, duplicateOf: x => x === null || id(x), provenance: one("lecturer-supplied", "collected"),
    collection: opt(shape({ provider: one("sample", "greenhouse", "lever"), board: str, postingId: str, retrievedAt: str, label: str })), reviewed: boolean, addedBy: id, addedAt: str }), 10000),
  skillMentions: array(shape({ id, sourceId: id, subjectId: id, skill: str, excerpt: str, requirement: one(...REQUIREMENT_LEVELS), addedBy: id, addedAt: str })),
  skillMappings: array(shape({ subjectId: id, skill: str, cloIds: strings, stage: one(...COVERAGE_STAGES), target: one(...COVERAGE_STAGES), evidence: str, updatedBy: id, updatedAt: str })),
  evidenceBriefs: array(shape({ id, subjectId: id, createdBy: id, createdAt: str, recommendation: one("keep", "refresh", "revise", "undecided"), notes: str, markdown: str,
    recipients: strings, sentAt: x => x === null || str(x) }), 10000),
  evidenceSnapshots: array(shape({ id, subjectId: id, label: str, takenBy: id, takenAt: str,
    eligible: integer, organisations: integer, unreviewed: integer, duplicates: integer, contextual: integer, lookedFor: array(str, 10000),
    skills: array(shape({ key: str, skill: str, postings: integer, required: integer, preferred: integer, stage: one(...COVERAGE_STAGES), target: one(...COVERAGE_STAGES), sourceIds: array(id, 10000) }), 10000),
    postings: array(shape({ id, identity: str, title: str, organisation: str, url: str, sourceDate: str, textHash: str }), 10000) }), 1000),
  briefDecisions: array(shape({ id, briefId: id, subjectId: id, courseVersionId: id, term: str, byPersonId: id, at: str,
    outcome: one("adopt", "retain", "defer", "return"), note: str }), 100000),
  events: array(shape({ id, at: str, byPersonId: id,
    kind: one("brief-prepared", "brief-sent", "brief-read", "decision-recorded", "snapshot-frozen", "version-adopted", "term-set", "grades-released", "survey-opened", "survey-collected", "cqi-noted"),
    refs: shape({ subjectId: id, briefId: opt(id), decisionId: opt(id), snapshotId: opt(id), versionId: opt(id), draftId: opt(id), term: opt(str), previousTerm: opt(str), formId: opt(id), count: opt(integer), noteId: opt(id), source: opt(one("booth", "imported", "pasted")) }) }), 100000),
  // The two student surveys (depth plan Section 7): every answer fits its question, and nothing identifies a student.
  surveys: array(shape({ id, subjectId: id, kind: one("course-outcome", "ssrt"), title: str, term: str, versionId: x => x === null || id(x),
    scale: shape({ min: integer, max: integer, target: integer, labels: array(str, 20) }),
    questions: array(shape({ id, text: str, kind: one("scale", "comment"), cloId: opt(id), dimension: opt(str) }), 60),
    instrumentNote: x => x === null || str(x), classSize: x => x === null || integer(x), formToken: x => x === null || (typeof x === "string" && /^[A-Za-z0-9_-]{22}$/.test(x)),
    readerSecret: x => x === null || (typeof x === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(x)), createdAt: str, createdBy: id, sample: opt(boolean), sampleReleasedAt: opt(str) }), 1000),
  surveyResponses: array(shape({ id, formId: id, term: str, collectedAt: str, clientId: x => x === null || (typeof x === "string" && /^[A-Za-z0-9-]{8,64}$/.test(x)),
    source: one("booth", "pasted", "imported", "sample"), answers: x => record(x) && Object.keys(x).length <= 60 &&
      Object.values(x).every(v => v === "cannot-say" || (typeof v === "number" && Number.isInteger(v)) || (typeof v === "string" && v.length <= 2000)) }), 100000),
  // Attainment against a stated threshold (depth plan Section 8): the OBE report as printed, and the CQI notes.
  obeReports: array(shape({ id, subjectId: id, term: str, versionId: x => x === null || id(x), uploadId: id, sourceFileName: x => x === null || str(x), sample: boolean,
    passMark: mark, studentShare: x => num(x) && (x as number) >= 0 && (x as number) <= 1, method: one("share-above-mark"),
    surveyId: x => x === null || id(x), surveyTitle: x => x === null || str(x), surveyVersionId: x => x === null || id(x), surveyTarget: x => x === null || integer(x),
    respondents: x => x === null || integer(x), classSize: x => x === null || integer(x), rate: x => x === null || str(x), floorRequired: x => x === null || integer(x), surveyOpen: boolean, surveyNote: x => x === null || str(x),
    direct: array(shape({ cloId: id, label: str, text: str, N: integer, n: integer, missing: integer, filed: boolean, mean: x => x === null || mark(x), sd: x => x === null || nonnegative(x),
      atOrAbove: x => x === null || integer(x), share, kpiMet: x => x === null || boolean(x), interval: x => x === null || (record(x) && share(x.low) && share(x.high)) }), 200),
    indirect: array(shape({ cloId: id, n: integer, atTarget: integer, share }), 200),
    plos: array(shape({ ploId: id, text: str, links: array(shape({ cloId: id, label: str, level: one("H", "M", "L"), share }), 200) }), 200),
    cqiNoteId: x => x === null || id(x), printedAt: str, printedBy: id }), 10000),
  cqiNotes: array(shape({ id, subjectId: id, term: str, versionId: x => x === null || id(x), text: x => str(x) && (x as string).trim().length > 0 && (x as string).length <= 2000, at: str, byPersonId: id }), 10000),
  skillLexicon: dict(array(str, 100)),
  relevanceRatings: array(shape({ subjectId: id, score: num, band: one("aligned","drifting","misaligned","unrated"),
    perCLO: array(shape({ cloId: id, score: num, movedBy: array(str) })),
    evidence: array(shape({ sourceId: id, skill: str, demandScore: num, delta12m: num })),
    agreement: x => x === null || num(x), ratedAt: str })),
  idSeq: x => integer(x) && (x as number) >= 1,
};

export function workspaceData(state: AppState): WorkspaceData {
  return Object.fromEntries(WORKSPACE_DATA_KEYS.map(k => [k, state[k]])) as unknown as WorkspaceData;
}
export function workspaceFingerprint(state: AppState): string {
  return JSON.stringify(workspaceData(state));
}
export function serializeWorkspaceBackup(state: AppState, exportedAt: string): string {
  return JSON.stringify({ application: "Lyceum", schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt, data: workspaceData(state) }, null, 2);
}
function uniqueIds(rows: Array<{ id: string }>) { return new Set(rows.map(r => r.id)).size === rows.length; }

export function parseWorkspaceBackup(raw: string, knownPersonIds: string[]): { ok: true; backup: WorkspaceBackup } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) return fail("This backup exceeds the 20 MB limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return fail("This is not valid JSON. Choose a Lyceum workspace backup."); }
  if (!record(parsed) || parsed.application !== "Lyceum" || typeof parsed.schemaVersion !== "number" || !Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion < 1 || parsed.schemaVersion > BACKUP_SCHEMA_VERSION || typeof parsed.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(parsed.exportedAt)) || !record(parsed.data)) return fail("Unsupported backup format or schema version.");
  const data = parsed.data;
  if (Object.keys(data).some(k => !WORKSPACE_DATA_KEYS.includes(k as typeof WORKSPACE_DATA_KEYS[number]))) return fail("The backup contains unsupported workspace fields.");
  for (const [key, value] of Object.entries(LATER_DEFAULTS)) if (data[key] === undefined) data[key] = structuredClone(value);
  // The programme's outcomes came with schema 6: an older programme takes the demo programme's eight, as the seed does.
  if (record(data.programme) && data.programme.plos === undefined) data.programme.plos = structuredClone(DEMO_PLOS);
  for (const key of WORKSPACE_DATA_KEYS) if (!predicates[key](data[key])) return fail("Invalid workspace data in " + key + ".");
  const backup = parsed as unknown as WorkspaceBackup;
  const d = backup.data;
  if (![d.subjects,d.clos,d.proposals,d.notifications,d.resultUploads,d.subjectVersions,d.testDrafts,d.curriculumDrafts,d.evidenceSources,d.skillMentions,d.evidenceBriefs,d.evidenceSnapshots,d.briefDecisions,d.events,d.rubrics,d.surveys,d.surveyResponses,d.obeReports,d.cqiNotes].every(uniqueIds))
    return fail("The backup contains duplicate record identities.");
  const subjects = new Set(d.subjects.map(s => s.id)), people = new Set(knownPersonIds);
  if (!people.has(d.programme.departmentOwnerId)) return fail("The programme owner is unknown to this local workspace.");
  if (d.assignments.some(a => !people.has(a.personId) || !subjects.has(a.subjectId))) return fail("An assignment refers to an unknown person or course.");
  if (d.clos.some(c => !subjects.has(c.subjectId))) return fail("An outcome refers to an unknown course.");
  if (d.subjects.some(s => s.cloIds.some(id => !d.clos.some(c => c.id === id && c.subjectId === s.id))))
    return fail("A course contains missing or cross-course outcome links.");
  for (const [subjectId, definition] of Object.entries(d.courseDefinitions)) {
    if (!subjects.has(subjectId) || draftStructureError(definition, subjectId)) return fail("Invalid course definition for " + subjectId + ".");
    const subject = d.subjects.find(s => s.id === subjectId)!;
    if (definition.outcomes.some(o => !subject.cloIds.includes(o.id)) || subject.cloIds.some(id => !definition.outcomes.some(o => o.id === id)))
      return fail("Course definition and active outcomes disagree for " + subjectId + ".");

    if (definition.outcomes.some(o => !d.clos.some(c => c.id === o.id && c.subjectId === subjectId &&
      c.text === o.text && c.bloomLevel === o.bloomLevel)))
      return fail("Course definition and active outcome wording disagree for " + subjectId + ".");
    if (!d.subjectVersions.some(v => v.id === subject.currentVersionId && v.subjectId === subjectId))
      return fail("The active course definition has no preserved version for " + subjectId + ".");

    if (definition.title.trim() !== subject.title) return fail("Course title and definition disagree for " + subjectId + ".");
    if ((definition.assessment ?? []).some(a => a.rubricId !== undefined && !d.rubrics.some(r => r.id === a.rubricId && r.subjectId === subjectId)))
      return fail("An assessment in " + subjectId + " names a rubric that is not in the backup.");
  }
  if (d.rubrics.some(r => !subjects.has(r.subjectId))) return fail("A rubric refers to an unknown course.");
  for (const version of d.subjectVersions) {
    if (!subjects.has(version.subjectId) || !people.has(version.changedBy) || version.cloSnapshot.some(c => c.subjectId !== version.subjectId) ||
      (version.definition && draftStructureError(version.definition, version.subjectId))) return fail("Invalid course version.");
  }
  for (const draft of d.curriculumDrafts) {
    if (!subjects.has(draft.subjectId) || draft.revision < 1 || draft.checkedRevision !== null && draft.checkedRevision !== draft.revision ||
      draftStructureError(draft.definition, draft.subjectId) || draft.history.some(e => !people.has(e.byPersonId))) return fail("Invalid curriculum revision.");

    if (!d.subjectVersions.some(v => v.id === draft.baselineVersionId && v.subjectId === draft.subjectId))
      return fail("A curriculum revision has a missing or wrong-course baseline.");
    if (draft.definition.outcomes.some(o => d.clos.some(c => c.id === o.id && c.subjectId !== draft.subjectId)))
      return fail("A candidate outcome identity belongs to another course.");

  }
  if (d.curriculumDrafts.filter(x => x.status === "drafting").some((x,i,a) => a.findIndex(y => y.subjectId === x.subjectId) !== i))
    return fail("A course has more than one open curriculum revision.");
  for (const plan of d.teachingPlans) {
    if (!subjects.has(plan.subjectId) || !people.has(plan.updatedBy) || !uniqueIds(plan.sessions) ||
      plan.sessions.some(s => s.week < 1 || s.week > 52 || s.minutes < 5 || s.minutes > 600 || !people.has(s.updatedBy)))
      return fail("Invalid teaching plan or session.");
    if (plan.sessions.some(s => s.items && (!uniqueIds(s.items) || s.items.some(i => i.reviewedBy !== null && !people.has(i.reviewedBy)))))
      return fail("A session's items repeat an id or name an unknown reviewer.");
    // Removed outcome links are retained only when a saved course change flagged the session for review.
    if (plan.sessions.some(s => !s.needsReview && s.cloIds.some(id => !d.clos.some(c => c.id === id && c.subjectId === plan.subjectId))))
      return fail("A teaching session contains an unacknowledged broken outcome link.");
  }
  if (new Set(d.teachingPlans.map(p => p.subjectId)).size !== d.teachingPlans.length) return fail("Duplicate teaching plans.");
  if (d.testDrafts.some(t => t.blueprint.subjectId !== t.subjectId || !t.needsReview &&
    [...t.blueprint.cloWeights.map(w => w.cloId),...t.items.map(i => i.targetCLO)].some(id => !d.clos.some(c => c.id === id && c.subjectId === t.subjectId))))
    return fail("An assessment contains a missing or cross-course outcome link without a course-change review flag.");
  if ([...d.proposals,...d.testDrafts].some(x => !subjects.has(x.subjectId) || !people.has(x.authorId))) return fail("Invalid proposal or assessment owner.");
  if ([...d.survey,...d.predictions,...d.resultUploads,...d.dataSources,...d.relevanceRatings].some(x => !subjects.has(x.subjectId))) return fail("A record refers to an unknown course.");
  if (d.resultUploads.some(x => !people.has(x.uploadedBy))) return fail("Invalid result uploader.");
  if (d.resultUploads.some(x => x.courseVersionId !== undefined && !d.subjectVersions.some(v => v.id === x.courseVersionId && v.subjectId === x.subjectId)
    && d.subjects.find(s => s.id === x.subjectId)?.currentVersionId !== x.courseVersionId)) return fail("A results file names a version of another course.");
  if (d.notifications.some(x => !people.has(x.toPersonId))) return fail("Invalid notification recipient.");
  const sourceById = new Map(d.evidenceSources.map(s => [s.id, s]));
  for (const source of d.evidenceSources) {
    if (!subjects.has(source.subjectId) || !people.has(source.addedBy)) return fail("An evidence source refers to an unknown course or person.");
    if (source.textHash !== textFingerprint(source.text)) return fail("An evidence source text does not match its recorded fingerprint.");
    if (source.duplicateOf !== null) {
      const original = sourceById.get(source.duplicateOf);
      if (!original || original.duplicateOf !== null || original.subjectId !== source.subjectId || original.textHash !== source.textHash)
        return fail("A duplicate evidence record does not point at a matching original.");
    }
  }
  for (const mention of d.skillMentions) {
    const source = sourceById.get(mention.sourceId);
    if (!source || source.subjectId !== mention.subjectId || !people.has(mention.addedBy)) return fail("A quoted requirement refers to an unknown source.");
    if (!locateExcerpt(source.text, mention.excerpt).ok) return fail("A quoted requirement is not present in its source text.");
  }
  const briefIds = new Set(d.evidenceBriefs.map(b => b.id));
  for (const brief of d.evidenceBriefs) {
    if (!subjects.has(brief.subjectId) || !people.has(brief.createdBy) || brief.recipients.some(id => !people.has(id))) return fail("An evidence brief refers to an unknown course or person.");
  }
  if (d.notifications.some(n => n.briefId !== undefined && !briefIds.has(n.briefId))) return fail("A notification refers to a missing evidence brief.");
  if (Object.keys(d.skillLexicon).some(subjectId => !subjects.has(subjectId))) return fail("A skill lexicon refers to an unknown course.");
  const snapshotLabels = new Set<string>();
  for (const snap of d.evidenceSnapshots) {
    if (!subjects.has(snap.subjectId) || !people.has(snap.takenBy)) return fail("An evidence snapshot refers to an unknown course or person.");
    const labelKey = snap.subjectId + "\n" + snap.label.trim().toLowerCase();
    if (!snap.label.trim() || snapshotLabels.has(labelKey)) return fail("Evidence snapshots need distinct names within a course.");
    snapshotLabels.add(labelKey);
    // A frozen window must be internally consistent: its postings are its denominator, and every count stays within it.
    const postingIds = new Set(snap.postings.map(p => p.id));
    if (postingIds.size !== snap.postings.length || snap.postings.length !== snap.eligible) return fail("An evidence snapshot's postings do not match its denominator.");
    if (new Set(snap.skills.map(k => k.key)).size !== snap.skills.length) return fail("An evidence snapshot lists a skill twice.");
    if (snap.skills.some(k => k.postings > snap.eligible || k.required + k.preferred > k.postings || k.sourceIds.length !== k.postings || k.sourceIds.some(x => !postingIds.has(x))))
      return fail("An evidence snapshot's counts do not match its postings.");
  }
  // The decision record: each decision belongs to a known brief of the same course, by a known person, with a reason.
  const briefById = new Map(d.evidenceBriefs.map(b => [b.id, b]));
  for (const decision of d.briefDecisions) {
    const brief = briefById.get(decision.briefId);
    if (!brief || brief.subjectId !== decision.subjectId || !people.has(decision.byPersonId) || !decision.note.trim() || decision.note.length > 2000)
      return fail("A decision refers to an unknown brief or person, or has no reason.");
  }
  // Events are append-only, so an event may outlive what it names (a removed snapshot); briefs and decisions are never removed.
  const decisionIds = new Set(d.briefDecisions.map(x => x.id));
  for (const e of d.events) {
    if (!subjects.has(e.refs.subjectId) || !people.has(e.byPersonId) || (e.refs.briefId !== undefined && !briefIds.has(e.refs.briefId)) ||
      (e.refs.decisionId !== undefined && !decisionIds.has(e.refs.decisionId)))
      return fail("An event refers to an unknown course, person, brief or decision.");
  }
  for (const form of d.surveys)
    if (!subjects.has(form.subjectId) || !people.has(form.createdBy) || form.scale.min >= form.scale.max || form.scale.target < form.scale.min || form.scale.target > form.scale.max
      || new Set(form.questions.map(q => q.id)).size !== form.questions.length) return fail("A survey refers to an unknown course or person, or its scale or question ids are invalid.");
  for (const response of d.surveyResponses) {
    const form = d.surveys.find(x => x.id === response.formId);
    if (!form || response.term !== form.term) return fail("A survey response refers to an unknown survey.");
    for (const [qid, v] of Object.entries(response.answers)) {
      const q = form.questions.find(x => x.id === qid);
      if (!q || (q.kind === "scale" && v !== "cannot-say" && !(typeof v === "number" && v >= form.scale.min && v <= form.scale.max)) || (q.kind === "comment" && typeof v !== "string"))
        return fail("A survey response has an answer that fits no question.");
    }
  }
  // A report reads a results file of its course that the backup holds; a note belongs to a known course and person.
  for (const report of d.obeReports)
    if (!subjects.has(report.subjectId) || !people.has(report.printedBy) || !d.resultUploads.some(u => u.id === report.uploadId && u.subjectId === report.subjectId)
      || (report.cqiNoteId !== null && !d.cqiNotes.some(n => n.id === report.cqiNoteId && n.subjectId === report.subjectId))) return fail("An OBE report refers to an unknown course, person, results file or CQI note.");
  if (d.cqiNotes.some(n => !subjects.has(n.subjectId) || !people.has(n.byPersonId))) return fail("A CQI note refers to an unknown course or person.");
  // The marks a results row kept are its n, sorted; nothing else is kept with them.
  if (d.resultUploads.some(u => u.rows.some(r => r.marks !== undefined && (r.marks.length !== r.n || r.marks.some((m, i) => i > 0 && m < r.marks![i - 1])))))
    return fail("A results row's marks do not match its count.");
  const mappingKeys = new Set<string>();
  for (const mapping of d.skillMappings) {
    const mappingKey = mapping.subjectId + "\n" + skillKey(mapping.skill);
    if (!subjects.has(mapping.subjectId) || !people.has(mapping.updatedBy) || mappingKeys.has(mappingKey)) return fail("Invalid or duplicate coverage mapping.");
    mappingKeys.add(mappingKey);
  }
  return { ok: true, backup };
}
export function backupSummary(data: WorkspaceData) {
  return { courses: data.subjects.length, outcomes: data.clos.length, sessions: data.teachingPlans.reduce((n,p) => n + p.sessions.length, 0),
    versions: data.subjectVersions.length, revisions: data.curriculumDrafts.length, surveys: data.survey.length };
}
