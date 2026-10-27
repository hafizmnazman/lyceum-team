import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import {
  addEvidenceSource, addSkillMention, adoptCurriculumRevision, checkCurriculumRevision, createCourseWorkspace, evidenceReportForCourse,
  exportWorkspaceBackup, getState, login, previewWorkspaceBackup, removeEvidenceSource, removeSkillMention, resetDemoState,
  restoreWorkspaceBackup, saveCurriculumRevision, setEvidenceSourceReviewed, setSkillMapping,
} from "./app/store.ts";
import { evidenceMarkdown, locateExcerpt, textFingerprint, wilsonInterval } from "./lib/evidence.ts";
import { parseWorkspaceBackup, workspaceFingerprint } from "./lib/workspaceBackup.ts";
import type { CourseDefinition } from "./types.ts";

const POSTING = "Junior financial analyst. You will prepare cash-flow forecasts for small business clients, present scenario analysis to partners, and maintain Excel models. Experience with Power BI is preferred.";

function prepareCourse() {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  assert.equal(createCourseWorkspace({ code: "BUS205", title: "Financial Planning", programmeTitle: "Business Studies", year: 2, semester: 1 }).ok, true);
  const draft = getState().curriculumDrafts.find((d) => d.subjectId === "BUS205")!;
  const definition: CourseDefinition = { ...structuredClone(draft.definition),
    brief: { ...draft.definition.brief, contactHours: 8, programmeOutcomes: ["PLO1"] },
    outcomes: [
      { id: "BUS205-outcome-1", subjectId: "BUS205", label: "CLO1", text: "Prepare and justify a cash-flow plan for a small business.", bloomLevel: "Apply", assessmentEvidence: "Worked case.", ploIds: ["PLO1"] },
      { id: "BUS205-outcome-2", subjectId: "BUS205", label: "CLO2", text: "Evaluate how a plan responds to changed assumptions.", bloomLevel: "Evaluate", assessmentEvidence: "Scenario report.", ploIds: ["PLO1"] },
    ],
    topics: [{ id: "BUS205-topic-1", title: "Cash-flow foundations", week: 1, contactHours: 3, selfStudyHours: 4, cloIds: ["BUS205-outcome-1", "BUS205-outcome-2"], prerequisiteTopicIds: [], protected: false, resources: "" }] };
  assert.equal(saveCurriculumRevision(draft.id, draft.revision, { definition, reason: "Set up the course.", effectiveTerm: "2026-S2" }).ok, true);
  const saved = getState().curriculumDrafts.find((d) => d.id === draft.id)!;
  assert.equal(checkCurriculumRevision(saved.id, saved.revision).ok, true);
  assert.equal(adoptCurriculumRevision(saved.id, saved.revision, true).ok, true);
}
function posting(title = "Junior financial analyst", organisation = "Example Holdings", text = POSTING) {
  const result = addEvidenceSource("BUS205", { kind: "job-posting", title, organisation, url: "", sourceDate: "2026-09-15", text });
  assert.equal(result.ok, true, result.ok ? "" : result.error);
  return result.sourceId!;
}
const quote = (sourceId: string, skill: string, excerpt: string, requirement: "required" | "preferred" | "unclear" = "required") =>
  addSkillMention(sourceId, { skill, excerpt, requirement });
const row = (skill: string) => evidenceReportForCourse("BUS205").rows.find((r) => r.skill === skill);

test("a quoted requirement must exist in the saved source text", () => {
  prepareCourse();
  const id = posting();
  const versionBefore = getState().subjects.find((s) => s.id === "BUS205")!.currentVersionId;
  assert.equal(quote(id, "Cash-flow forecasting", "prepare cash-flow forecasts for small business clients").ok, true);
  assert.equal(quote(id, "Scenario analysis", "present   scenario analysis\nto partners").ok, true);
  const altered = quote(id, "Cash-flow forecasting", "prepare cash flow forecasts for small business clients");
  assert.equal(altered.ok, false);
  assert.match(altered.ok ? "" : altered.error, /not found in the saved source text/);
  assert.equal(quote(id, "Cash-flow forecasting", "prepare cash-flow forecasts for small business clients").ok, false);
  assert.equal(getState().skillMentions.length, 2);
  assert.equal(locateExcerpt(POSTING, "maintain Excel models").ok, true);
  assert.equal(locateExcerpt(POSTING, "maintain spreadsheet models").ok, false);
  assert.equal(getState().clos.filter((c) => c.subjectId === "BUS205").length, 2);
  assert.equal(getState().subjects.find((s) => s.id === "BUS205")!.currentVersionId, versionBefore);
});

test("identical postings are clustered and count once", () => {
  prepareCourse();
  const first = posting(), copy = posting("Same posting on another site", "Example Holdings", POSTING.replace(/ /g, "  ").toUpperCase());
  assert.equal(getState().evidenceSources.find((s) => s.id === copy)!.duplicateOf, first);
  assert.equal(quote(first, "Excel", "maintain Excel models").ok, true);
  assert.equal(quote(copy, "Excel", "MAINTAIN  EXCEL  MODELS").ok, true);
  assert.equal(setEvidenceSourceReviewed(copy, true).ok, false);
  assert.equal(setEvidenceSourceReviewed(first, true).ok, true);
  const report = evidenceReportForCourse("BUS205");
  assert.equal(report.eligible, 1); assert.equal(report.duplicates, 1);
  assert.equal(row("Excel")?.postings, 1); assert.equal(row("Excel")?.share, 1);
  assert.equal(textFingerprint("a  b"), textFingerprint("A b"));
});

test("a skill repeated inside one posting counts once", () => {
  prepareCourse();
  const id = posting();
  assert.equal(quote(id, "Cash flow", "prepare cash-flow forecasts").ok, true);
  assert.equal(quote(id, "cash flow", "cash-flow forecasts for small business clients", "preferred").ok, true);
  assert.equal(quote(id, "CASH FLOW", "Junior financial analyst", "unclear").ok, true);
  setEvidenceSourceReviewed(id, true);
  const report = evidenceReportForCourse("BUS205");
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].postings, 1); assert.equal(report.rows[0].required, 1); assert.equal(report.rows[0].preferred, 0);
});

test("unreviewed postings and contextual documents stay out of the denominator", () => {
  prepareCourse();
  const reviewed = posting("Analyst A", "Alpha Ltd");
  const pending = posting("Analyst B", "Beta Ltd", "Analyst role. Build Python pipelines and dashboards. Unique posting text B.");
  const standard = addEvidenceSource("BUS205", { kind: "professional-standard", title: "Professional body competency framework", organisation: "Institute", url: "https://example.org/framework", sourceDate: "", text: "Members must use Python to analyse financial data and communicate findings." });
  assert.equal(standard.ok, true);
  quote(reviewed, "Python", "Junior financial analyst");
  quote(pending, "Python", "Build Python pipelines");
  quote(standard.ok ? standard.sourceId! : "", "Python", "use Python to analyse financial data");
  setEvidenceSourceReviewed(reviewed, true);
  const report = evidenceReportForCourse("BUS205");
  assert.equal(report.eligible, 1); assert.equal(report.unreviewed, 1); assert.equal(report.contextual, 1); assert.equal(report.organisations, 1);
  assert.equal(row("Python")?.postings, 1); assert.equal(row("Python")?.contextualSources, 1);
  setEvidenceSourceReviewed(pending, true);
  assert.equal(evidenceReportForCourse("BUS205").eligible, 2); assert.equal(row("Python")?.postings, 2);
});

test("the illustrative 18 of 50 example yields 36 percent with a Wilson interval", () => {
  prepareCourse();
  for (let i = 1; i <= 50; i += 1) {
    const id = posting("Posting " + i, "Employer " + (i % 7), "Role " + i + ". " + (i <= 18 ? "Must use Python for data analysis. " : "") + "Communicates with clients weekly. Unique text " + i + ".");
    if (i <= 18) assert.equal(quote(id, "Python", "Must use Python for data analysis").ok, true);
    assert.equal(setEvidenceSourceReviewed(id, true).ok, true);
  }
  const report = evidenceReportForCourse("BUS205");
  assert.equal(report.eligible, 50); assert.equal(report.organisations, 7);
  const python = row("Python")!;
  assert.equal(python.postings, 18); assert.equal(python.share, 0.36);
  assert.ok(Math.abs(python.interval!.low - 0.2414) < 0.002); assert.ok(Math.abs(python.interval!.high - 0.4986) < 0.002);
  const half = wilsonInterval(5, 10)!, none = wilsonInterval(0, 10)!, all = wilsonInterval(10, 10)!;
  assert.ok(Math.abs(half.low - 0.2366) < 0.001 && Math.abs(half.high - 0.7634) < 0.001);
  assert.equal(none.low, 0); assert.ok(Math.abs(none.high - 0.2775) < 0.001);
  assert.equal(all.high, 1); assert.ok(Math.abs(all.low - 0.7225) < 0.001);
  assert.equal(wilsonInterval(0, 0), null); assert.equal(wilsonInterval(3, 2), null);
});

test("empty evidence is unknown, never zero", () => {
  prepareCourse();
  const report = evidenceReportForCourse("BUS205");
  assert.equal(report.eligible, 0); assert.deepEqual(report.rows, []); assert.equal(report.targetCoverage, null);
  assert.match(report.coverageNote, /cannot be summarised/);
  assert.equal(setSkillMapping("BUS205", { skill: "Python", cloIds: [], stage: "unknown", target: "assessed", evidence: "" }).ok, true);
  assert.equal(row("Python")?.share, null); assert.equal(row("Python")?.interval, null); assert.equal(row("Python")?.shortfall, null);
  assert.match(report.trendNote, /Trend unavailable/);
});

test("required and preferred wording are counted separately", () => {
  prepareCourse();
  const a = posting("A", "Alpha"), b = posting("B", "Beta", "Analyst. Excel modelling is preferred but not essential. Unique B.");
  quote(a, "Excel", "maintain Excel models", "required"); quote(b, "Excel", "Excel modelling is preferred", "preferred");
  setEvidenceSourceReviewed(a, true); setEvidenceSourceReviewed(b, true);
  const excel = row("Excel")!;
  assert.equal(excel.postings, 2); assert.equal(excel.required, 1); assert.equal(excel.preferred, 1); assert.deepEqual(excel.organisations, ["Alpha", "Beta"]);
});

test("coverage mappings are course-scoped, cite evidence and replace earlier judgements", () => {
  prepareCourse();
  const id = posting(); quote(id, "Excel", "maintain Excel models"); setEvidenceSourceReviewed(id, true);
  assert.equal(setSkillMapping("BUS205", { skill: "Excel", cloIds: ["CLO4"], stage: "practised", target: "assessed", evidence: "Week 3 lab." }).ok, false);
  assert.equal(setSkillMapping("BUS205", { skill: "Excel", cloIds: ["BUS205-outcome-1"], stage: "practised", target: "assessed", evidence: "" }).ok, false);
  assert.equal(setSkillMapping("BUS205", { skill: "Excel", cloIds: ["BUS205-outcome-1"], stage: "practised", target: "assessed", evidence: "Week 3 lab." }).ok, true);
  assert.equal(row("Excel")?.shortfall, true);
  assert.equal(setSkillMapping("BUS205", { skill: "excel", cloIds: ["BUS205-outcome-1", "BUS205-outcome-2"], stage: "assessed", target: "assessed", evidence: "Final case rubric criterion 2." }).ok, true);
  assert.equal(getState().skillMappings.filter((m) => m.subjectId === "BUS205").length, 1);
  assert.equal(row("Excel")?.shortfall, false); assert.deepEqual(row("Excel")?.mapping?.cloIds, ["BUS205-outcome-1", "BUS205-outcome-2"]);
});

test("the target coverage index reports its unknown weight", () => {
  prepareCourse();
  const a = posting("A", "Alpha"), b = posting("B", "Beta", "Analyst. Maintain Excel models for clients. Unique B.");
  quote(a, "Excel", "maintain Excel models"); quote(a, "Python", "Junior financial analyst"); quote(b, "Excel", "Maintain Excel models");
  setEvidenceSourceReviewed(a, true); setEvidenceSourceReviewed(b, true);
  assert.equal(evidenceReportForCourse("BUS205").targetCoverage, null);
  setSkillMapping("BUS205", { skill: "Excel", cloIds: ["BUS205-outcome-1"], stage: "assessed", target: "practised", evidence: "Case rubric." });
  let coverage = evidenceReportForCourse("BUS205").targetCoverage!;
  assert.equal(coverage.value, 1); assert.ok(Math.abs(coverage.unknownWeightShare - 1 / 3) < 1e-9); assert.equal(coverage.knownSkills, 1);
  setSkillMapping("BUS205", { skill: "Python", cloIds: [], stage: "introduced", target: "assessed", evidence: "Week 2 demonstration." });
  coverage = evidenceReportForCourse("BUS205").targetCoverage!;
  assert.ok(Math.abs(coverage.value - 2 / 3) < 1e-9); assert.equal(coverage.unknownWeightShare, 0); assert.equal(coverage.knownSkills, 2);
});

test("only assigned academics can record evidence for a course", () => {
  prepareCourse();
  const id = posting(); quote(id, "Excel", "maintain Excel models");
  const before = workspaceFingerprint(getState());
  for (const person of [PEOPLE_IDS.lim, PEOPLE_IDS.tan]) {
    login(person);
    assert.equal(addEvidenceSource("BUS205", { kind: "job-posting", title: "X", organisation: "Y", url: "", sourceDate: "", text: "Twenty characters of text here." }).ok, false);
    assert.equal(quote(id, "Power BI", "Experience with Power BI").ok, false);
    assert.equal(setEvidenceSourceReviewed(id, true).ok, false);
    assert.equal(setSkillMapping("BUS205", { skill: "Excel", cloIds: [], stage: "unknown", target: "unknown", evidence: "" }).ok, false);
    assert.equal(removeEvidenceSource(id).ok, false);
  }
  assert.equal(workspaceFingerprint(getState()), before);
  login(PEOPLE_IDS.sobri);
  assert.equal(addEvidenceSource("BUS205", { kind: "job-posting", title: "No employer", organisation: "", url: "", sourceDate: "", text: "Twenty characters of text here." }).ok, false);
  assert.equal(addEvidenceSource("BUS205", { kind: "job-posting", title: "Bad link", organisation: "Y", url: "ftp://x", sourceDate: "", text: "Twenty characters of text here." }).ok, false);
});

test("removing an original posting promotes its duplicate and drops its quotations", () => {
  prepareCourse();
  const first = posting(), copy = posting("Copy", "Example Holdings", POSTING + "  ");
  quote(first, "Excel", "maintain Excel models"); setEvidenceSourceReviewed(first, true);
  assert.equal(removeEvidenceSource(first).ok, true);
  const promoted = getState().evidenceSources.find((s) => s.id === copy)!;
  assert.equal(promoted.duplicateOf, null); assert.equal(promoted.reviewed, true);
  assert.equal(getState().skillMentions.length, 0);
  assert.equal(evidenceReportForCourse("BUS205").eligible, 1);
  const mention = quote(copy, "Excel", "maintain Excel models");
  assert.equal(mention.ok, true);
  assert.equal(removeSkillMention(mention.ok ? mention.mentionId! : "").ok, true);
  assert.equal(getState().skillMentions.length, 0);
});

test("backups keep evidence, reject misquotes and accept the earliest schema", () => {
  prepareCourse();
  const id = posting(); quote(id, "Excel", "maintain Excel models"); setEvidenceSourceReviewed(id, true);
  setSkillMapping("BUS205", { skill: "Excel", cloIds: ["BUS205-outcome-1"], stage: "practised", target: "assessed", evidence: "Week 3 lab." });
  const raw = exportWorkspaceBackup(), people = getState().people.map((p) => p.id);
  assert.equal(JSON.parse(raw).schemaVersion, 6);
  const parsed = parseWorkspaceBackup(raw, people);
  assert.ok(parsed.ok);
  assert.equal(parsed.backup.data.evidenceSources.length, 1); assert.equal(parsed.backup.data.skillMappings.length, 1);
  for (const mutate of [
    (x: any) => { x.data.skillMentions[0].excerpt = "maintain spreadsheet models"; },
    (x: any) => { x.data.evidenceSources[0].duplicateOf = "missing"; },
    (x: any) => { x.data.evidenceSources[0].textHash = "fnv1a-00000000-0"; },
    (x: any) => { x.data.skillMappings.push({ ...x.data.skillMappings[0], skill: "EXCEL" }); },
    (x: any) => { x.data.skillMentions[0].sourceId = "missing"; },
  ]) {
    const candidate = JSON.parse(raw); mutate(candidate);
    assert.equal(parseWorkspaceBackup(JSON.stringify(candidate), people).ok, false);
  }
  const legacy = JSON.parse(raw); legacy.schemaVersion = 1;
  for (const key of ["evidenceSources", "skillMentions", "skillMappings", "evidenceBriefs", "evidenceSnapshots", "briefDecisions", "events", "skillLexicon", "institution"]) delete legacy.data[key];
  const older = parseWorkspaceBackup(JSON.stringify(legacy), people);
  assert.ok(older.ok); assert.deepEqual(older.backup.data.evidenceSources, []);
  assert.deepEqual(older.backup.data.briefDecisions, []); assert.deepEqual(older.backup.data.events, []);
  assert.ok(older.backup.data.institution.name.includes("(demo)")); // a backup from before the profile takes the demo institution
  removeEvidenceSource(id);
  assert.equal(getState().evidenceSources.length, 0);
  const preview = previewWorkspaceBackup(raw); assert.ok(preview.ok);
  assert.equal(restoreWorkspaceBackup(raw, preview.fingerprint, true).ok, true);
  assert.equal(getState().evidenceSources.length, 1); assert.equal(getState().skillMentions.length, 1);
  assert.equal(evidenceReportForCourse("BUS205").rows[0].postings, 1);
});

test("the evidence report lists receipts and the sampling limitation", () => {
  prepareCourse();
  const id = posting(); quote(id, "Cash-flow forecasting", "prepare cash-flow forecasts for small business clients"); setEvidenceSourceReviewed(id, true);
  setSkillMapping("BUS205", { skill: "Cash-flow forecasting", cloIds: ["BUS205-outcome-1"], stage: "practised", target: "assessed", evidence: "Week 1 worked case." });
  const state = getState(), subject = state.subjects.find((s) => s.id === "BUS205")!;
  const output = evidenceMarkdown(subject, evidenceReportForCourse("BUS205"), state.evidenceSources, state.skillMentions, state.clos.filter((c) => c.subjectId === "BUS205"), state.people, "2026-10-09T00:00:00Z");
  assert.match(output, /Example Holdings/); assert.match(output, /"prepare cash-flow forecasts for small business clients"/);
  assert.match(output, /1 of 1/); assert.match(output, /Below target/); assert.match(output, /convenience sample/); assert.match(output, /Trend unavailable/);
  assert.match(output, /Outcomes: CLO1/); assert.match(output, /Nothing was collected from the web/);
  assert.doesNotMatch(output, /employability score/);
});
