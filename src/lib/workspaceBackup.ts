import type { AppState } from "../app/store.ts";
import { draftStructureError } from "./curriculum.ts";
import { COVERAGE_STAGES, EVIDENCE_KINDS, REQUIREMENT_LEVELS, locateExcerpt, skillKey, textFingerprint } from "./evidence.ts";

export const WORKSPACE_DATA_KEYS = ["programme", "assignments", "subjects", "clos", "survey", "proposals",
  "notifications", "predictions", "resultUploads", "dataSources", "subjectVersions", "testDrafts", "teachingPlans",
  "courseDefinitions", "curriculumDrafts", "evidenceSources", "skillMentions", "skillMappings", "evidenceBriefs", "evidenceSnapshots", "skillLexicon", "relevanceRatings", "idSeq"] as const;
/** Collections added after schema version 1 (2: evidence, 3: briefs and lexicon, 4: evidence snapshots). Older backups restore with these empty. */
const LATER_DEFAULTS: Partial<Record<typeof WORKSPACE_DATA_KEYS[number], unknown>> = { evidenceSources: [], skillMentions: [], skillMappings: [], evidenceBriefs: [], evidenceSnapshots: [], skillLexicon: {} };
export const BACKUP_SCHEMA_VERSION = 4;
export type WorkspaceData = Pick<AppState, typeof WORKSPACE_DATA_KEYS[number]>;
export interface WorkspaceBackup { application: "Lyceum"; schemaVersion: 1 | 2 | 3 | 4; exportedAt: string; data: WorkspaceData }
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
const bloom = one("Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create");
const clo = shape({ id, subjectId: id, text: str, bloomLevel: bloom, label: opt(str), demandSignal: opt(num) });
const event = shape({ at: str, byPersonId: id, action: id, note: opt(str) });
const item = shape({ id, text: str, targetCLO: id, bloomLevel: bloom, difficulty: num, marks: nonnegative, source: one("agent", "human"), modelAnswer: opt(str) });
const blueprint = shape({ subjectId: id, totalMarks: num, cloWeights: array(shape({ cloId: id, weight: num }), 1000), bloomMix: dict(num) });
const predicates: Record<typeof WORKSPACE_DATA_KEYS[number], Check> = {
  programme: shape({ id, title: str, departmentOwnerId: id, subjectIds: strings }),
  assignments: array(shape({ personId: id, subjectId: id, hat: one("coordinator", "lecturer") })),
  subjects: array(shape({ id, title: str, programmeId: id, year: integer, semester: integer, cloIds: strings,
    prerequisiteSubjectIds: strings, sharedWithProgrammeIds: strings, status: one("active", "proposed"), currentVersionId: id,
    workspaceOnly: opt(boolean), syllabusSourceUrl: opt(str), syllabusVerifiedAt: opt(str) }), 10000),
  clos: array(clo),
  survey: array(shape({ studentId: id, subjectId: id, term: str, cloRatings: dict(x => num(x) && (x as number) >= 1 && (x as number) <= 10) })),
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
  notifications: array(shape({ id, toPersonId: id, kind: one("ping-update","ping-new-subject","review-request","test-done","approved","rejected","evidence-brief"),
    subjectId: opt(id), proposalId: opt(id), agentFindings: opt(str), briefId: opt(id), read: boolean, createdAt: str })),
  predictions: array(shape({ proposalId: id, subjectId: id, predictedMastery: num, madeAt: str, actualMastery: opt(num), residual: opt(num) })),
  resultUploads: array(shape({ id, subjectId: id, uploadedBy: id, term: str, filedAt: str, sourceFileName: opt(str),
    rows: array(shape({ cloId: id, meanScore: num, sd: nonnegative, n: integer })) })),
  dataSources: array(shape({ kind: one("clo-survey","ssrt","results","syllabus","material"), subjectId: id, term: str,
    recordCount: integer, ingestedAt: str, verified: opt(boolean), sourceFileName: opt(str) })),
  subjectVersions: array(shape({ id, subjectId: id, snapshot: shape({ title: str, cloIds: strings, prerequisiteSubjectIds: strings }),
    cloSnapshot: array(clo), changedBy: id, changedAt: str, reason: str, effectiveTerm: opt(str),
    definition: opt(x => record(x)) })),
  testDrafts: array(shape({ id, subjectId: id, proposalId: opt(id), blueprint, items: array(item),
    status: one("drafting","coordinator-review","approved"), authorId: id, needsReview: opt(boolean), courseVersionId: opt(id) })),
  teachingPlans: array(shape({ subjectId: id, term: str, notes: str, updatedAt: str, updatedBy: id,
    sessions: array(shape({ id, week: integer, topic: str, minutes: integer, cloIds: strings, activity: str, learningCheck: str,
      resources: str, status: one("draft","ready","delivered"), updatedAt: str, updatedBy: id,
      needsReview: opt(boolean), courseVersionId: opt(id) })) })),
  courseDefinitions: dict(x => record(x)),
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
  if (parsed.schemaVersion < BACKUP_SCHEMA_VERSION) for (const [key, value] of Object.entries(LATER_DEFAULTS)) if (data[key] === undefined) data[key] = structuredClone(value);
  for (const key of WORKSPACE_DATA_KEYS) if (!predicates[key](data[key])) return fail("Invalid workspace data in " + key + ".");
  const backup = parsed as unknown as WorkspaceBackup;
  const d = backup.data;
  if (![d.subjects,d.clos,d.proposals,d.notifications,d.resultUploads,d.subjectVersions,d.testDrafts,d.curriculumDrafts,d.evidenceSources,d.skillMentions,d.evidenceBriefs,d.evidenceSnapshots].every(uniqueIds))
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
  }
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
