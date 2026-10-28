import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_IDS } from "./data/seed.ts";
import {
  addEvidenceSource, addProposals, addSkillMention, confirmProposals, adoptCurriculumRevision, checkCurriculumRevision, createCourseWorkspace, currentGaps, currentSignal, evidenceReportForCourse,
  exportWorkspaceBackup, getState, login, previewWorkspaceBackup, removeEvidenceSource, removeSkillMention, resetDemoState,
  restoreWorkspaceBackup, saveCurriculumRevision, setEvidenceSourceReviewed, setSkillMapping,
} from "./app/store.ts";
import { evidenceMarkdown, evidenceReport, locateExcerpt, textFingerprint, wilsonInterval } from "./lib/evidence.ts";
import { signalFromEvidence } from "./agents/signal.ts";
import { runCurriculum } from "./agents/curriculum.ts";
import { applySuggestion, readSuggestions, revisionRequest } from "./lib/revision.ts";
import { proposeMappings, proposeQuotes, suggestRevision } from "../server/llm.ts";
import { mappingRequest, quoteRequest, readMappings } from "./lib/proposals.ts";
import { settingsFromEnv } from "./lib/agentSettings.ts";
import { validateCourseDefinition } from "./lib/curriculum.ts";
import type { CLO, CourseDefinition, CoverageStage, EvidenceSource, SkillMapping, SkillMention } from "./types.ts";
import { parseWorkspaceBackup, workspaceFingerprint } from "./lib/workspaceBackup.ts";

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

test("Signal from a course's own evidence: demand, coverage and gap per outcome, flagged on demand's lower bound", () => {
  const course = (asking: number, of: number, stage: CoverageStage, target: CoverageStage) => {
    const sources: EvidenceSource[] = Array.from({ length: of }, (_, i) => ({ id: "S" + i, subjectId: "X1", kind: "job-posting", title: "P" + i,
      organisation: "Org" + i, url: "", sourceDate: "", text: "Python required.", textHash: "h" + i, duplicateOf: null, provenance: "lecturer-supplied",
      reviewed: true, addedBy: "p", addedAt: "2026-10-28T00:00:00Z" }));
    const mentions: SkillMention[] = sources.slice(0, asking).map((src, i) => ({ id: "M" + i, sourceId: src.id, subjectId: "X1", skill: "Python",
      excerpt: "Python required.", requirement: "required", addedBy: "p", addedAt: "2026-10-28T00:00:00Z" }));
    const mappings: SkillMapping[] = [{ subjectId: "X1", skill: "Python", cloIds: ["X1-CLO1"], stage, target, evidence: "", updatedBy: "p", updatedAt: "" }];
    const outcomes = [{ id: "X1-CLO1", subjectId: "X1", text: "Apply Python" }, { id: "X1-CLO2", subjectId: "X1", text: "Unmapped" }] as CLO[];
    return signalFromEvidence("X1", evidenceReport("X1", sources, mentions, mappings, outcomes), outcomes.map((c) => c.id));
  };
  const behind = course(9, 10, "introduced", "assessed");
  assert.equal(behind.outcomes.length, 1, "an outcome with no mapped skill has no signal");
  assert.deepEqual([behind.outcomes[0].demand, behind.outcomes[0].coverage, behind.outcomes[0].gap], [0.9, 0, 0.9]);
  assert.deepEqual(behind.drift, { subjectId: "X1", gap: 0.9, flag: "update" }, "9 of 10 asking, below target: due an update");
  assert.equal(course(2, 2, "introduced", "assessed").drift?.flag, "fine", "2 of 2 is too few: demand's lower bound is under 0.5");
  assert.equal(course(9, 10, "assessed", "assessed").drift?.flag, "fine", "at target: covered");
  assert.equal(course(9, 10, "unknown", "assessed").drift, null, "no reviewed stage: not judged");
});

test("a lecturer's own course with reviewed evidence reaches Programme, routing and Trends; the demo keeps its fixture", () => {
  prepareCourse();
  for (let i = 0; i < 8; i++) {
    const id = posting("Analyst " + i, "Firm " + i, POSTING + " Ref " + i + ".");
    assert.equal(quote(id, "Cash-flow forecasting", "prepare cash-flow forecasts for small business clients").ok, true);
    assert.equal(setEvidenceSourceReviewed(id, true).ok, true);
  }
  assert.equal(setSkillMapping("BUS205", { skill: "Cash-flow forecasting", cloIds: ["BUS205-outcome-1"], stage: "introduced", target: "assessed", evidence: "Week 1 lecture." }).ok, true);
  const signal = currentSignal();
  assert.equal(signal.subjectDrift.find((d) => d.subjectId === "BUS205")?.flag, "update", "8 of 8 asking, below target");
  assert.equal(signal.subjectDrift.find((d) => d.subjectId === "CS220")?.flag, "update", "the demo programme keeps its fixture");
  const s = getState();
  assert.equal(runCurriculum(s.programme.id, signal, s.subjects).find((a) => a.subjectId === "BUS205")?.annotation, "needs-update", "listed on Programme");
  const gap = currentGaps()["BUS205-outcome-1"];
  assert.equal(gap.live?.postings, 8);
  assert.equal(gap.gap, 1, "demand 1, coverage 0");
  assert.ok(currentGaps().CLO4, "the fixture's outcomes are still there for the demo");
});

test("Quill: the revision request carries the gaps with a receipt; suggestions are checked, then applied one at a time", async () => {
  prepareCourse();
  for (let i = 0; i < 3; i++) {
    const id = posting("Analyst " + i, "Firm " + i, POSTING + " Ref " + i + ".");
    quote(id, "Cash-flow forecasting", "prepare cash-flow forecasts for small business clients");
    if (i === 0) quote(id, "Power BI", "Experience with Power BI is preferred", "preferred");
    setEvidenceSourceReviewed(id, true);
  }
  setSkillMapping("BUS205", { skill: "Cash-flow forecasting", cloIds: ["BUS205-outcome-1"], stage: "introduced", target: "assessed", evidence: "Week 1 lecture." });
  const s = getState(), def = s.courseDefinitions.BUS205 ?? s.curriculumDrafts.find((d) => d.subjectId === "BUS205")!.definition;
  const request = revisionRequest("BUS205", def, evidenceReportForCourse("BUS205"), s.skillMentions);
  assert.deepEqual(request.gaps.map((g) => [g.skill, g.postings, g.eligible, g.outcomes.join()]), [["Cash-flow forecasting", 3, 3, "CLO1"], ["Power BI", 1, 3, ""]],
    "below target and unmapped skills, most asked first, outcomes by label");
  assert.equal(request.gaps[0].quote, "prepare cash-flow forecasts for small business clients", "an exact quotation as the receipt");
  const reply = { suggestions: [
    { kind: "edit-outcome", outcome: "CLO1", text: "Build and assess a 13-week cash-flow forecast for a small business.", bloom: "create", skill: "Cash-flow forecasting", reason: "3 of 3 postings ask for it." },
    { kind: "add-topic", title: "Dashboards in Power BI", hours: 2, outcomes: ["CLO2", "CLO9"], skill: "Power BI", reason: "1 of 3 postings." },
    { kind: "edit-outcome", outcome: "CLO7", text: "An outcome the course does not have.", bloom: "Apply", skill: "x", reason: "dropped" },
    { kind: "add-outcome", text: "Use SQL.", bloom: "Apply", skill: "SQL", reason: "A skill it was never shown." },
    { kind: "delete-everything", reason: "dropped" },
  ] };
  const suggestions = await suggestRevision(settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "m" }), request, async (m) => {
    assert.match(m[0].content ?? "", /You are Quill/); assert.match(m[1].content ?? "", /Power BI/);
    return { content: "Here you go: " + JSON.stringify(reply) };
  });
  assert.deepEqual(suggestions.map((x) => x.kind), ["edit-outcome", "add-topic", "add-outcome"], "unknown outcome and unknown kind dropped");
  assert.equal(suggestions[0].kind === "edit-outcome" && suggestions[0].bloom, "Create", "Bloom level normalised");
  assert.deepEqual(suggestions[1].kind === "add-topic" && suggestions[1].outcomes, ["CLO2"], "an outcome label the course lacks is dropped from a topic");
  assert.equal(suggestions[2].skill, "", "a skill the model was not shown loses its link");
  assert.deepEqual(readSuggestions({ nope: 1 }, request), []);
  let next = def;
  suggestions.forEach((x, i) => { next = applySuggestion(next, x, "BUS205", "n" + i); });
  assert.equal(next.outcomes.find((c) => c.label === "CLO1")?.text, "Build and assess a 13-week cash-flow forecast for a small business.");
  assert.equal(next.outcomes.find((c) => c.label === "CLO3")?.text, "Use SQL.", "an added outcome takes the next free label");
  assert.deepEqual(next.topics.at(-1)?.cloIds, ["BUS205-outcome-2"]);
  assert.equal(validateCourseDefinition(next, "BUS205").filter((i) => i.severity === "error").every((i) => /hour|contact/i.test(i.message)), true,
    "the applied revision is checked by the course's own rules; only the hours budget can object");
  assert.equal(def.outcomes.find((c) => c.label === "CLO1")?.text, "Prepare and justify a cash-flow plan for a small business.", "the source definition is untouched");
});

test("Lens: a model quotation counts only if it is word for word in its posting; it joins the list to be confirmed", async () => {
  prepareCourse();
  const a = posting("Analyst A", "Firm A", POSTING), b = posting("Analyst B", "Firm B", "Graduate analyst. Strong SQL is essential. Python is a plus.");
  quote(a, "Excel", "maintain Excel models");
  const st = getState();
  const request = quoteRequest(st.evidenceSources.filter((x) => x.subjectId === "BUS205"), st.skillMentions, ["SQL|structured query language"]);
  assert.deepEqual(request.postings.map((p) => [p.id, p.quoted]), [[b, []], [a, ["Excel"]]], "least quoted first, with what is already quoted");
  assert.deepEqual(request.skills, ["SQL"]);
  const proposals = await proposeQuotes(settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "m" }), request, async (m) => {
    assert.match(m[0].content ?? "", /You are Lens/);
    return { content: JSON.stringify({ quotes: [
      { posting: b, skill: "SQL", excerpt: "Strong SQL is essential.", requirement: "Required" },
      { posting: b, skill: "Python", excerpt: "Python is a plus.", requirement: "preferred" },
      { posting: b, skill: "SQL", excerpt: "Strong SQL is essential.", requirement: "required" },
      { posting: b, skill: "Tableau", excerpt: "Tableau experience is essential.", requirement: "required" },
      { posting: "nope", skill: "Go", excerpt: "Strong SQL is essential.", requirement: "required" },
      { posting: a, skill: "excel", excerpt: "maintain Excel models", requirement: "required" },
    ] }) };
  });
  assert.deepEqual(proposals.map((p) => [p.skill, p.requirement]), [["SQL", "required"], ["Python", "preferred"]],
    "a paraphrase, a posting that was not sent, a repeat and a skill already quoted are dropped; levels normalised");
  const many = { skills: [], postings: ["p1", "p2", "p3", "p4"].map((id) => ({ id, title: id, text: "SQL is required.", quoted: [] })) };
  let calls = 0;
  const batched = await proposeQuotes(settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "m" }), many, async (m) => {
    calls++;
    const ids = (JSON.parse(m[1].content!) as typeof many).postings.map((p) => p.id);
    if (ids.includes("p4")) throw new Error("slow batch");
    return { content: JSON.stringify({ quotes: ids.map((id) => ({ posting: id, skill: "SQL", excerpt: "SQL is required.", requirement: "required" })) }) };
  });
  assert.deepEqual([calls, batched.map((p) => p.sourceId)], [2, ["p1", "p2", "p3"]], "postings go three to a call; a failed batch is skipped");
  assert.equal(addProposals("BUS205", proposals), 2);
  assert.equal(addProposals("BUS205", proposals), 0, "already waiting");
  assert.deepEqual(confirmProposals("BUS205", getState().scanProposals), { added: 2, skipped: 0 }, "confirmed through the same path as the scan");
  assert.deepEqual(getState().skillMentions.filter((m) => m.sourceId === b).map((m) => m.excerpt), ["Strong SQL is essential.", "Python is a plus."], "recorded as quotations");
});

test("Atlas: mappings are proposed by outcome label for unmapped skills only; applying leaves the stage to the lecturer", async () => {
  prepareCourse();
  const a = posting();
  quote(a, "Cash-flow forecasting", "prepare cash-flow forecasts for small business clients");
  quote(a, "Power BI", "Experience with Power BI is preferred", "preferred");
  setEvidenceSourceReviewed(a, true);
  setSkillMapping("BUS205", { skill: "Power BI", cloIds: [], stage: "unknown", target: "unknown", evidence: "" });
  const st = getState(), outcomes = st.clos.filter((c) => c.subjectId === "BUS205");
  const request = mappingRequest("BUS205", evidenceReportForCourse("BUS205"), st.skillMentions, outcomes);
  assert.deepEqual(request.skills.map((x) => x.skill), ["Cash-flow forecasting"], "a mapped skill is not sent");
  assert.deepEqual(request.outcomes.map((o) => o.label), ["CLO1", "CLO2"]);
  const out = await proposeMappings(settingsFromEnv({ LYCEUM_AGENT_PROVIDER: "ollama", LYCEUM_AGENT_MODEL: "m" }), request, async () => ({ content: JSON.stringify({ mappings: [
    { skill: "cash-flow forecasting", outcomes: ["CLO1", "CLO9", "CLO1"], reason: "CLO1 asks for a cash-flow plan." },
    { skill: "Kubernetes", outcomes: ["CLO2"], reason: "never sent" },
  ] }) }));
  assert.deepEqual(out, [{ skill: "Cash-flow forecasting", outcomes: ["CLO1"], reason: "CLO1 asks for a cash-flow plan." }], "unknown skill and outcome dropped, names matched");
  assert.deepEqual(readMappings({ mappings: [{ skill: "Cash-flow forecasting", outcomes: [], reason: "Fits no outcome." }] }, request)[0].outcomes, [], "fits nothing: said so");
  assert.equal(setSkillMapping("BUS205", { skill: out[0].skill, cloIds: ["BUS205-outcome-1"], stage: "unknown", target: "unknown", evidence: "" }).ok, true);
  const row = evidenceReportForCourse("BUS205").rows.find((r) => r.skill === "Cash-flow forecasting")!;
  assert.deepEqual([row.mapping?.cloIds, row.stage, row.shortfall], [["BUS205-outcome-1"], "unknown", null], "mapped, not yet judged");
});
