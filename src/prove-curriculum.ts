import assert from "node:assert/strict";
import { test } from "node:test";
import { CANONICAL_PROPOSAL, PEOPLE_IDS } from "./data/seed.ts";
import { adoptCurriculumRevision, approveProposal, checkCurriculumRevision, confirmPendingIntake, createCourseWorkspace,
  acknowledgeAssessmentCourseChange, approveTestDraft, createTestDraft, generateTestItems, resetAssessmentOutcomeWeights, submitTestDraft, updateTestItem,
  definitionForCourse, discardCurriculumRevision, assignHat, canRunTest, startDraft, exportWorkspaceBackup, getRecoveryBackup, getState, login, logout,
  previewWorkspaceBackup, resetDemoState, restoreWorkspaceBackup, runAcceptanceImmediate, saveCurriculumRevision,
  saveTeachingSession, stagePendingIntake, startCurriculumRevision } from "./app/store.ts";
import { curriculumChanges, curriculumMarkdown, validateCourseDefinition } from "./lib/curriculum.ts";
import { parseWorkspaceBackup, workspaceFingerprint } from "./lib/workspaceBackup.ts";
import type { CourseDefinition } from "./types.ts";

function setup() {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const created = createCourseWorkspace({ code:"BUS205",title:"Financial Planning",programmeTitle:"Business Studies",year:2,semester:1 });
  assert.equal(created.ok,true);
  const draft = getState().curriculumDrafts.find(d => d.subjectId === "BUS205")!;
  const definition: CourseDefinition = { ...structuredClone(draft.definition),
    brief: { ...draft.definition.brief, teachingWeeks:12, contactHours:8, selfStudyHours:12, programmeOutcomes:["PLO1"] },
    outcomes:[{ id:"BUS205-outcome-1",subjectId:"BUS205",label:"CLO1",text:"Prepare and justify a cash-flow plan for a small business.",
      bloomLevel:"Apply",assessmentEvidence:"Worked cash-flow case and explanation rubric.",ploIds:["PLO1"] }],
    topics:[{ id:"BUS205-topic-1",title:"Cash-flow foundations",week:1,contactHours:3,selfStudyHours:4,
      cloIds:["BUS205-outcome-1"],prerequisiteTopicIds:[],protected:true,resources:"Lecturer-selected case material." }] };
  return { draft,definition };
}
function saveReady() {
  const { draft,definition } = setup();
  assert.equal(saveCurriculumRevision(draft.id,draft.revision,{ definition,reason:"Align the case activity with the stated outcome.",effectiveTerm:"2026-S2" }).ok,true);
  const saved = getState().curriculumDrafts.find(d => d.id === draft.id)!;
  assert.equal(checkCurriculumRevision(saved.id,saved.revision).ok,true);
  return { draft:saved,definition };
}

test("lecturers can create an unfamiliar course without institutional approval", () => {
  const { draft } = setup();
  assert.equal(getState().screen,"studio"); assert.equal(getState().studioTab,"curriculum");
  assert.equal(getState().subjects.find(s => s.id === "BUS205")?.workspaceOnly,true);
  assert.ok(getState().assignments.some(a => a.subjectId === "BUS205" && a.personId === PEOPLE_IDS.sobri));
  assert.equal(draft.definition.outcomes.length,0);
  assert.equal(createCourseWorkspace({ code:"bus205",title:"Duplicate",programmeTitle:"",year:1,semester:1 }).ok,false);
});
test("course creation validates identity and rejects unsupported actors", () => {
  setup(); const before=workspaceFingerprint(getState());
  assert.equal(createCourseWorkspace({ code:"../bad",title:"X",programmeTitle:"",year:1,semester:1 }).ok,false);
  assert.equal(workspaceFingerprint(getState()),before);
  login(PEOPLE_IDS.lim);
  assert.equal(createCourseWorkspace({ code:"NEW101",title:"X",programmeTitle:"",year:1,semester:1 }).ok,false);
});
test("revision save preserves current outcomes until a deliberate lecturer decision", () => {
  const { draft,definition }=setup(), before=getState().subjects.find(s => s.id === "BUS205")!.currentVersionId;
  assert.equal(saveCurriculumRevision(draft.id,draft.revision,{ definition,reason:"Reason",effectiveTerm:"Term" }).ok,true);
  assert.equal(getState().clos.filter(c => c.subjectId === "BUS205").length,0);
  assert.equal(getState().subjects.find(s => s.id === "BUS205")!.currentVersionId,before);
});
test("stale saves and unassigned edits cannot overwrite a revision", () => {
  const { draft,definition }=setup();
  assert.equal(saveCurriculumRevision(draft.id,1,{ definition,reason:"First",effectiveTerm:"Term" }).ok,true);
  const before=workspaceFingerprint(getState());
  assert.equal(saveCurriculumRevision(draft.id,1,{ definition,reason:"Stale",effectiveTerm:"Term" }).ok,false);
  assert.equal(workspaceFingerprint(getState()),before);
  login(PEOPLE_IDS.tan);
  assert.equal(checkCurriculumRevision(draft.id,2).ok,false);
  assert.equal(discardCurriculumRevision(draft.id,2,"No permission").ok,false);
});
test("outcome identities cannot collide with another course", () => {
  const { draft,definition }=setup();
  definition.outcomes[0].id="CLO4";
  assert.equal(saveCurriculumRevision(draft.id,1,{ definition,reason:"X",effectiveTerm:"Term" }).ok,false);
});
test("incomplete drafts can be saved but empty outcomes prevent adoption", () => {
  const { draft }=setup();
  assert.equal(saveCurriculumRevision(draft.id,1,{ definition:draft.definition,reason:"Incomplete",effectiveTerm:"Term" }).ok,true);
  assert.equal(checkCurriculumRevision(draft.id,2).ok,false);
  assert.equal(adoptCurriculumRevision(draft.id,2,true).ok,false);
});
test("contact and self-study budgets are checked independently", () => {
  const { definition }=setup();
  definition.topics[0].contactHours=9; definition.topics[0].selfStudyHours=13;
  const codes=validateCourseDefinition(definition,"BUS205").map(i => i.code);
  assert.ok(codes.includes("contact-budget")); assert.ok(codes.includes("study-budget"));
});
test("unknown constraints remain warnings and never become a feasibility score", () => {
  const { definition }=setup(); definition.brief.contactHours=null;
  const issue=validateCourseDefinition(definition,"BUS205").find(i => i.code === "contact-unknown");
  assert.equal(issue?.severity,"warning");
});
test("broken outcome, PLO and prerequisite links are visible", () => {
  const { definition }=setup();
  definition.outcomes[0].ploIds=["missing"]; definition.topics[0].cloIds=["missing"];
  definition.topics[0].prerequisiteTopicIds=["missing"];
  const codes=validateCourseDefinition(definition,"BUS205").map(i => i.code);
  assert.ok(codes.includes("plo-link")); assert.ok(codes.includes("topic-outcome")); assert.ok(codes.includes("topic-prerequisite"));
});
test("topic cycles and reversed prerequisite order block a checked revision", () => {
  const { definition }=setup();
  definition.topics.push({ ...structuredClone(definition.topics[0]),id:"t2",title:"Analysis",week:2,protected:false,prerequisiteTopicIds:["BUS205-topic-1"] });
  definition.topics[0].prerequisiteTopicIds=["t2"];
  const codes=validateCourseDefinition(definition,"BUS205").map(i => i.code);
  assert.ok(codes.includes("topic-cycle")); assert.ok(codes.includes("topic-sequence"));
});
test("protected baseline topics cannot disappear silently", () => {
  const { definition }=setup(); const candidate=structuredClone(definition); candidate.topics=[];
  assert.ok(validateCourseDefinition(candidate,"BUS205",definition).some(i => i.code === "protected-topic"));
});
test("edits invalidate previous checks and require an explicit local decision", () => {
  const { draft,definition }=saveReady();
  assert.equal(adoptCurriculumRevision(draft.id,draft.revision,false).ok,false);
  definition.title="Financial Planning Workshop";
  assert.equal(saveCurriculumRevision(draft.id,draft.revision,{ definition,reason:"Edited",effectiveTerm:"Term" }).ok,true);
  assert.equal(getState().curriculumDrafts.find(d => d.id === draft.id)?.checkedRevision,null);
  assert.equal(adoptCurriculumRevision(draft.id,draft.revision+1,true).ok,false);
});
test("adoption applies the candidate once and preserves baseline and decision history", () => {
  const { draft,definition }=saveReady();
  assert.equal(adoptCurriculumRevision(draft.id,draft.revision,true).ok,true);
  assert.equal(getState().clos.find(c => c.subjectId === "BUS205")?.text,definition.outcomes[0].text);
  const versionId=getState().subjects.find(s => s.id === "BUS205")!.currentVersionId;
  assert.notEqual(versionId,draft.baselineVersionId);
  assert.ok(getState().subjectVersions.some(v => v.id === draft.baselineVersionId));
  assert.equal(getState().subjectVersions.find(v => v.id === versionId)?.effectiveTerm,"2026-S2");
  assert.equal(getState().curriculumDrafts.find(d => d.id === draft.id)?.history.at(-1)?.byPersonId,PEOPLE_IDS.sobri);
  const after=workspaceFingerprint(getState());
  assert.equal(adoptCurriculumRevision(draft.id,draft.revision,true).ok,false);
  assert.equal(workspaceFingerprint(getState()),after);
});
test("changed outcomes retain teaching work and flag it for review", () => {
  const { draft }=saveReady(); adoptCurriculumRevision(draft.id,draft.revision,true);
  assert.equal(saveTeachingSession("BUS205",{ week:1,topic:"Cash-flow foundations",minutes:60,cloIds:["BUS205-outcome-1"],
    activity:"Prepare a plan.",learningCheck:"Explain assumptions.",resources:"",status:"ready" }).ok,true);
  startCurriculumRevision("BUS205"); const next=getState().curriculumDrafts.find(d => d.subjectId === "BUS205" && d.status === "drafting")!;
  const definition=structuredClone(next.definition); definition.outcomes[0].text="Prepare a plan and evaluate its sensitivity.";
  saveCurriculumRevision(next.id,next.revision,{ definition,reason:"Add sensitivity analysis.",effectiveTerm:"2027-S1" });
  checkCurriculumRevision(next.id,2); assert.equal(adoptCurriculumRevision(next.id,2,true).ok,true);
  const session=getState().teachingPlans.find(p => p.subjectId === "BUS205")!.sessions[0];
  assert.equal(session.needsReview,true); assert.equal(session.activity,"Prepare a plan.");
  assert.equal(saveTeachingSession("BUS205",session).ok,true);
  assert.equal(getState().teachingPlans.find(p => p.subjectId === "BUS205")!.sessions[0].needsReview,false);
});
test("discarding records a reason and leaves the current version unchanged", () => {
  const { draft }=saveReady(), before=getState().subjects.find(s => s.id === "BUS205")!.currentVersionId;
  assert.equal(discardCurriculumRevision(draft.id,draft.revision,"Retain the present course for this term.").ok,true);
  assert.equal(getState().subjects.find(s => s.id === "BUS205")!.currentVersionId,before);
  assert.equal(getState().curriculumDrafts.find(d => d.id === draft.id)?.status,"discarded");
});
test("outline export includes real constraints, achievement evidence and authority boundary", () => {
  const { definition }=setup(), subject=getState().subjects.find(s => s.id === "BUS205")!;
  const output=curriculumMarkdown(subject,definition,subject.currentVersionId);
  assert.match(output,/Contact-hour budget: 8/); assert.match(output,/Worked cash-flow case/); assert.match(output,/does not attest institutional approval/);
  const changed=structuredClone(definition); changed.outcomes[0].text="Changed"; changed.topics=[];
  const changes=curriculumChanges(definition,changed); assert.ok(changes.some(c => c.area === "Outcome" && c.kind === "edit"));
  assert.ok(changes.some(c => c.area === "Topic" && c.kind === "remove"));
});
test("workspace backup round-trips courses, revisions and survey records", () => {
  saveReady(); const raw=exportWorkspaceBackup(), parsed=parseWorkspaceBackup(raw,getState().people.map(p => p.id));
  assert.ok(parsed.ok);
  assert.equal(parsed.backup.data.curriculumDrafts[0].definition.brief.contactHours,8);
  assert.equal(parsed.backup.data.survey.length,getState().survey.length);
  assert.equal(previewWorkspaceBackup(raw).ok,true);
});
test("invalid backup schemas, corrupt records and cross-course links are rejected", () => {
  saveReady(); const raw=exportWorkspaceBackup();
  for (const mutate of [(x: any) => x.schemaVersion=999,
    (x: any) => x.data.teachingPlans=[null], (x: any) => x.data.subjects[0].cloIds=["foreign"],
    (x: any) => x.data.curriculumDrafts[0].definition.outcomes[0].subjectId="CS220",
    (x: any) => x.data.subjects.push(x.data.subjects[0]),
    (x: any) => x.data.curriculumDrafts[0].baselineVersionId="missing",
    (x: any) => { const course=x.data.curriculumDrafts[0].definition; x.data.courseDefinitions.BUS205=course; x.data.subjects.find((s: any)=>s.id==="BUS205").cloIds=[course.outcomes[0].id]; x.data.clos.push({...course.outcomes[0],text:"Different active wording"}); } ]) {
    const candidate=JSON.parse(raw); mutate(candidate);
    assert.equal(parseWorkspaceBackup(JSON.stringify(candidate),getState().people.map(p => p.id)).ok,false);
  }
  assert.equal(parseWorkspaceBackup("{bad",[]).ok,false);
});
test("backup restore rejects stale previews and keeps a restorable recovery copy", () => {
  saveReady(); const raw=exportWorkspaceBackup(), first=previewWorkspaceBackup(raw); assert.ok(first.ok);
  createCourseWorkspace({ code:"NEW101",title:"New preparation",programmeTitle:"",year:1,semester:1 });
  assert.equal(restoreWorkspaceBackup(raw,first.fingerprint,true).ok,false);
  const preview=previewWorkspaceBackup(raw); assert.ok(preview.ok);
  assert.equal(restoreWorkspaceBackup(raw,preview.fingerprint,false).ok,false);
  assert.equal(restoreWorkspaceBackup(raw,preview.fingerprint,true).ok,true);
  assert.equal(getState().subjects.some(s => s.id === "NEW101"),false);
  const recovery=getRecoveryBackup()!; assert.ok(recovery);
  const reverse=previewWorkspaceBackup(recovery); assert.ok(reverse.ok);
  assert.equal(restoreWorkspaceBackup(recovery,reverse.fingerprint,true).ok,true);
  assert.equal(getState().subjects.some(s => s.id === "NEW101"),true);
});
test("restore failure does not replace current data when browser storage is full", () => {
  saveReady(); const raw=exportWorkspaceBackup(), preview=previewWorkspaceBackup(raw); assert.ok(preview.ok);
  const before=workspaceFingerprint(getState()), windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,"window"),
    storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  try {
    Object.defineProperty(globalThis,"window",{ configurable:true,value:{} });
    Object.defineProperty(globalThis,"localStorage",{ configurable:true,value:{ setItem(key: string) { if (key === "lyceum-v3-state@1") throw new Error("quota"); } } });
    assert.equal(restoreWorkspaceBackup(raw,preview.fingerprint,true).ok,false);
    assert.equal(workspaceFingerprint(getState()),before);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis,"window",windowDescriptor); else Reflect.deleteProperty(globalThis,"window");
    if (storageDescriptor) Object.defineProperty(globalThis,"localStorage",storageDescriptor); else Reflect.deleteProperty(globalThis,"localStorage");
  }
});
test("restored low counters cannot overwrite an existing teaching session", () => {
  const { draft }=saveReady(); adoptCurriculumRevision(draft.id,draft.revision,true);
  const input={ week:1,topic:"First",minutes:60,cloIds:["BUS205-outcome-1"],activity:"",learningCheck:"",resources:"",status:"draft" as const };
  saveTeachingSession("BUS205",input);
  const backup=JSON.parse(exportWorkspaceBackup()); backup.data.idSeq=1;
  const raw=JSON.stringify(backup), preview=previewWorkspaceBackup(raw); assert.ok(preview.ok);
  restoreWorkspaceBackup(raw,preview.fingerprint,true); saveTeachingSession("BUS205",{ ...input,topic:"Second" });
  const sessions=getState().teachingPlans.find(p => p.subjectId === "BUS205")!.sessions;
  assert.equal(sessions.length,2); assert.equal(new Set(sessions.map(s => s.id)).size,2);
});
test("legacy approval applies actual CLO changes and preserves the prior version", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri); const before=definitionForCourse("CS220")!;
  runAcceptanceImmediate(CANONICAL_PROPOSAL.id); const proposal=getState().proposals.find(p => p.id === CANONICAL_PROPOSAL.id)!;
  const expected=proposal.draft.cloChanges!.find(c => c.op === "edit")!.text;
  login(PEOPLE_IDS.lim); approveProposal(proposal.id);
  assert.equal(getState().clos.find(c => c.id === "CLO4")?.text,expected);
  assert.notEqual(definitionForCourse("CS220")!.outcomes[0].text,before.outcomes[0].text);
  assert.ok(getState().subjectVersions.find(v => v.id === "CS220-v1")?.definition);
});
test("a new local course cannot produce a seeded learning forecast", () => {
  setup(); login(PEOPLE_IDS.rahman); assignHat(PEOPLE_IDS.sobri,"BUS205","coordinator"); login(PEOPLE_IDS.sobri);
  const proposalId = startDraft("BUS205")!; assert.ok(canRunTest(proposalId));
  runAcceptanceImmediate(proposalId);
  assert.equal(getState().proposals.find(p => p.id === proposalId)?.acceptanceResult,undefined);
  assert.match(getState().toast ?? "",/no calibrated data/);
  assert.equal(getState().predictions.filter(p => p.subjectId === "BUS205").length,0);
});
test("confirming a syllabus does not attest its institutional authenticity", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  stagePendingIntake({ fileName:"my-syllabus.pdf",kind:"pdf",pages:[{ index:1,text:"Course outline" }],tables:[] },
    { docType:"syllabus",subjectGuess:"CS310",confidence:1,notes:[] });
  assert.ok(confirmPendingIntake());
  assert.equal(getState().dataSources[0].verified,false);
  assert.equal(getState().subjects.find(s => s.id === "CS310")?.syllabusVerifiedAt,undefined);
  logout();
});


test("course edits block stale assessment approval until an explicit scoped review", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const testId=createTestDraft("CS220")!; generateTestItems(testId); submitTestDraft(testId);
  assert.equal(getState().testDrafts.find(t=>t.id===testId)?.status,"approved");
  startCurriculumRevision("CS220");
  const draft=getState().curriculumDrafts.find(d=>d.subjectId==="CS220" && d.status==="drafting")!;
  const definition=structuredClone(draft.definition);
  definition.outcomes[0].text += " Explain the assumptions.";
  saveCurriculumRevision(draft.id,draft.revision,{ definition,reason:"Make the demonstration explicit.",effectiveTerm:"2026-S2" });
  const saved=getState().curriculumDrafts.find(d=>d.id===draft.id)!;
  checkCurriculumRevision(saved.id,saved.revision); adoptCurriculumRevision(saved.id,saved.revision,true);
  const items=JSON.stringify(getState().testDrafts.find(t=>t.id===testId)!.items);
  submitTestDraft(testId); approveTestDraft(testId);
  assert.equal(getState().testDrafts.find(t=>t.id===testId)?.status,"drafting");
  assert.equal(acknowledgeAssessmentCourseChange(testId,false).ok,false);
  login(PEOPLE_IDS.tan); assert.equal(acknowledgeAssessmentCourseChange(testId,true).ok,false);
  login(PEOPLE_IDS.sobri); assert.equal(acknowledgeAssessmentCourseChange(testId,true).ok,true);
  assert.equal(JSON.stringify(getState().testDrafts.find(t=>t.id===testId)!.items),items);
  submitTestDraft(testId); assert.equal(getState().testDrafts.find(t=>t.id===testId)?.status,"approved");
});

test("retired assessment links require blueprint and question repair", () => {
  const { draft }=saveReady(); adoptCurriculumRevision(draft.id,draft.revision,true);
  const testId=createTestDraft("BUS205")!; generateTestItems(testId);
  startCurriculumRevision("BUS205");
  const next=getState().curriculumDrafts.find(d=>d.subjectId==="BUS205" && d.status==="drafting")!;
  const definition=structuredClone(next.definition);
  definition.outcomes[0].id="BUS205-outcome-replacement";
  definition.topics[0].cloIds=[definition.outcomes[0].id];
  saveCurriculumRevision(next.id,next.revision,{ definition,reason:"Replace the retired outcome.",effectiveTerm:"2026-S2" });
  const saved=getState().curriculumDrafts.find(d=>d.id===next.id)!;
  checkCurriculumRevision(saved.id,saved.revision); adoptCurriculumRevision(saved.id,saved.revision,true);
  assert.equal(acknowledgeAssessmentCourseChange(testId,true).ok,false);
  const count=getState().testDrafts.find(t=>t.id===testId)!.items.length;
  resetAssessmentOutcomeWeights(testId);
  assert.equal(getState().testDrafts.find(t=>t.id===testId)!.items.length,count);
  assert.equal(acknowledgeAssessmentCourseChange(testId,true).ok,false);
  generateTestItems(testId);
  assert.equal(acknowledgeAssessmentCourseChange(testId,true).ok,true);
  assert.ok(getState().testDrafts.find(t=>t.id===testId)!.items.every(i=>i.targetCLO==="BUS205-outcome-replacement"));
});

test("assessment editing revokes approval and another persona cannot submit or edit", () => {
  resetDemoState(); login(PEOPLE_IDS.sobri);
  const testId=createTestDraft("CS220")!; generateTestItems(testId); submitTestDraft(testId);
  const t=getState().testDrafts.find(t=>t.id===testId)!;
  login(PEOPLE_IDS.tan); updateTestItem(testId,t.items[0].id,{text:"Unauthorized"}); submitTestDraft(testId);
  assert.equal(getState().testDrafts.find(t=>t.id===testId)?.items[0].text,t.items[0].text);
  login(PEOPLE_IDS.sobri); updateTestItem(testId,t.items[0].id,{text:"Reviewed wording"});
  assert.equal(getState().testDrafts.find(t=>t.id===testId)?.status,"drafting");
});

test("topic changes invalidate linked preparation even when CLO wording is unchanged", () => {
  const { draft }=saveReady(); adoptCurriculumRevision(draft.id,draft.revision,true);
  saveTeachingSession("BUS205",{ week:1,topic:"Worked case",minutes:60,cloIds:["BUS205-outcome-1"],
    activity:"Prepare a plan.",learningCheck:"Explain assumptions.",resources:"",status:"ready" });
  const testId=createTestDraft("BUS205")!; generateTestItems(testId);
  const items=JSON.stringify(getState().testDrafts.find(t=>t.id===testId)!.items);
  startCurriculumRevision("BUS205");
  const next=getState().curriculumDrafts.find(d=>d.subjectId==="BUS205" && d.status==="drafting")!;
  const definition=structuredClone(next.definition); definition.topics[0].contactHours=4;
  saveCurriculumRevision(next.id,next.revision,{ definition,reason:"Extend the practice time.",effectiveTerm:"2027-S1" });
  checkCurriculumRevision(next.id,2); assert.equal(adoptCurriculumRevision(next.id,2,true).ok,true);
  assert.equal(getState().teachingPlans.find(p=>p.subjectId==="BUS205")!.sessions[0].needsReview,true);
  assert.equal(getState().testDrafts.find(t=>t.id===testId)!.needsReview,true);
  assert.equal(JSON.stringify(getState().testDrafts.find(t=>t.id===testId)!.items),items);
});

