import type { CLO, CourseBrief, CourseDefinition, CurriculumDraft, Subject, TeachingPlan, TestDraft } from "../types.ts";

export const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"] as const;
export interface CurriculumIssue { severity: "error" | "warning"; code: string; message: string }
export interface CurriculumChange { kind: "add" | "edit" | "remove" | "move"; area: "Outcome" | "Topic" | "Course"; label: string; before: string; after: string }

export function emptyCourseBrief(programmeTitle = ""): CourseBrief {
  return { programmeTitle, level: "", language: "", credits: null, teachingWeeks: null,
    contactHours: null, selfStudyHours: null, targetRoles: "", framework: "",
    programmeOutcomes: [], notes: "" };
}
export function courseDefinition(subject: Subject, clos: CLO[], programmeTitle: string): CourseDefinition {
  return { title: subject.title, brief: emptyCourseBrief(programmeTitle),
    outcomes: clos.filter(c => c.subjectId === subject.id).map((c, index) =>
      ({ ...c, label: c.label ?? (/^CLO\d+$/.test(c.id) ? c.id : "CLO" + (index + 1)), assessmentEvidence: "", ploIds: [] })), topics: [] };
}

export function validateCourseDefinition(def: CourseDefinition, subjectId: string, baseline?: CourseDefinition): CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  const add = (severity: CurriculumIssue["severity"], code: string, message: string) => issues.push({ severity, code, message });
  if (!def.title.trim()) add("error", "title", "Give the course a title.");
  if (def.title.length > 200) add("error", "title-length", "Keep the course title within 200 characters.");
  const brief = def.brief;
  for (const [key, label, max] of [
    ["credits", "Credits", 100], ["teachingWeeks", "Teaching weeks", 52],
    ["contactHours", "Contact-hour budget", 2000], ["selfStudyHours", "Self-study budget", 5000],
  ] as const) {
    const value = brief[key];
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value > max || (key === "teachingWeeks" && !Number.isInteger(value))))
      add("error", key, label + " must be positive and within " + max + ", or left unspecified.");
  }
  if (!def.outcomes.length) add("error", "outcomes-empty", "Add at least one course learning outcome before using this version.");
  const outcomeIds = new Set<string>(), labels = new Set<string>();
  for (const outcome of def.outcomes) {
    if (!outcome.id || outcome.subjectId !== subjectId || outcomeIds.has(outcome.id))
      add("error", "outcome-id", "Outcomes need unique identities scoped to this course.");
    outcomeIds.add(outcome.id);
    if (!outcome.label.trim() || labels.has(outcome.label.trim().toLowerCase())) add("error", "outcome-label", "Give every outcome a distinct display label.");
    labels.add(outcome.label.trim().toLowerCase());
    if (!outcome.text.trim()) add("error", "outcome-text", outcome.label + ": write an observable learning outcome.");
    if (!BLOOM_LEVELS.includes(outcome.bloomLevel)) add("error", "bloom", outcome.label + ": choose a valid Bloom level.");
    if (!outcome.assessmentEvidence.trim()) add("warning", "assessment-evidence", outcome.label + ": record how students will demonstrate achievement.");
    const missing = outcome.ploIds.filter(id => !brief.programmeOutcomes.includes(id));
    if (missing.length) add("error", "plo-link", outcome.label + ": programme outcomes no longer listed: " + missing.join(", ") + ".");
  }
  if (new Set(brief.programmeOutcomes).size !== brief.programmeOutcomes.length) add("error", "plo-duplicate", "Programme outcome labels must be unique.");
  const topicIds = new Set<string>();
  for (const topic of def.topics) {
    if (!topic.id || topicIds.has(topic.id)) add("error", "topic-id", "Topics need unique identities.");
    topicIds.add(topic.id);
  }
  let contact = 0, study = 0;
  const supported = new Set<string>();
  for (const topic of def.topics) {
    if (!topic.title.trim()) add("error", "topic-title", "Give every topic a title.");
    if (topic.week !== null && (!Number.isInteger(topic.week) || topic.week < 1 || topic.week > 52 || (brief.teachingWeeks !== null && topic.week > brief.teachingWeeks)))
      add("error", "topic-week", topic.title + ": use a week inside the course schedule, or leave it unspecified.");
    for (const [key, label] of [["contactHours", "contact hours"], ["selfStudyHours", "self-study hours"]] as const) {
      if (!Number.isFinite(topic[key]) || topic[key] < 0 || topic[key] > 5000) add("error", "topic-hours", topic.title + ": " + label + " must be finite and non-negative.");
    }
    if (topic.contactHours === 0 && topic.selfStudyHours === 0) add("warning", "topic-hours-unknown", topic.title + ": no teaching or self-study time is allocated.");
    contact += topic.contactHours; study += topic.selfStudyHours;
    const missingOutcomes = topic.cloIds.filter(id => !outcomeIds.has(id));
    if (missingOutcomes.length) add("error", "topic-outcome", topic.title + ": repair removed outcome links: " + missingOutcomes.join(", ") + ".");
    topic.cloIds.forEach(id => supported.add(id));
    if (!topic.cloIds.length) add("warning", "topic-unmapped", topic.title + ": no learning outcome is linked.");
    const missingPrerequisites = topic.prerequisiteTopicIds.filter(id => !topicIds.has(id) || id === topic.id);
    if (missingPrerequisites.length) add("error", "topic-prerequisite", topic.title + ": repair missing or self-referencing prerequisites.");
    for (const prereqId of topic.prerequisiteTopicIds) {
      const prerequisite = def.topics.find(t => t.id === prereqId);
      if (prerequisite && ((prerequisite.week !== null && topic.week !== null && prerequisite.week > topic.week) ||
        (prerequisite.week === topic.week && def.topics.indexOf(prerequisite) > def.topics.indexOf(topic))))
        add("error", "topic-sequence", topic.title + ": its prerequisite " + prerequisite.title + " is scheduled later.");
    }
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const cycle = (def.topics.find(t => t.id === id)?.prerequisiteTopicIds ?? []).some(p => topicIds.has(p) && visit(p));
    visiting.delete(id); visited.add(id); return cycle;
  };
  if (def.topics.some(t => visit(t.id))) add("error", "topic-cycle", "Topic prerequisites contain a cycle. Remove a conflicting dependency.");
  if (brief.contactHours !== null && contact > brief.contactHours + 1e-8) add("error", "contact-budget", "Topics require " + contact + " contact hours; the budget is " + brief.contactHours + ".");
  if (brief.selfStudyHours !== null && study > brief.selfStudyHours + 1e-8) add("error", "study-budget", "Topics require " + study + " self-study hours; the budget is " + brief.selfStudyHours + ".");
  if (brief.contactHours === null) add("warning", "contact-unknown", "No contact-hour budget is specified; feasibility has not been checked.");
  if (!def.topics.length) add("warning", "topics-unknown", "The topic outline is not recorded. Outcome coverage has not been checked.");
  else for (const outcome of def.outcomes) if (!supported.has(outcome.id)) add("warning", "outcome-orphan", outcome.label + ": no topic currently supports this outcome.");
  for (const topic of baseline?.topics ?? []) if (topic.protected && !def.topics.some(t => t.id === topic.id))
    add("error", "protected-topic", "Protected topic " + topic.title + " cannot be removed from this revision.");
  return issues;
}

/** Save incomplete drafts, but reject structurally invalid records before storing them. */
export function draftStructureError(def: CourseDefinition, subjectId: string): string | null {
  if (!def || typeof def.title !== "string" || !def.brief || !Array.isArray(def.outcomes) || !Array.isArray(def.topics)) return "Invalid course definition.";
  if (def.outcomes.length > 100 || def.topics.length > 300) return "Use at most 100 outcomes and 300 topics in a course.";
  const b = def.brief;
  for (const k of ["programmeTitle", "level", "language", "targetRoles", "framework", "notes"] as const)
    if (typeof b[k] !== "string" || b[k].length > 50000) return "Invalid course brief.";
  for (const k of ["credits", "teachingWeeks", "contactHours", "selfStudyHours"] as const)
    if (b[k] !== null && !Number.isFinite(b[k])) return "Course constraints must be finite numbers or unspecified.";
  const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 300 && value.every(v => typeof v === "string" && v.length <= 5000);
  if (!strings(b.programmeOutcomes)) return "Invalid programme outcomes.";
  const ids = new Set<string>();
  for (const c of def.outcomes) {
    if (!c || typeof c.id !== "string" || !c.id || ids.has(c.id) || c.subjectId !== subjectId || typeof c.label !== "string" ||
      typeof c.text !== "string" || c.text.length > 50000 || !BLOOM_LEVELS.includes(c.bloomLevel) ||
      typeof c.assessmentEvidence !== "string" || !strings(c.ploIds)) return "Invalid or cross-course outcome.";
    ids.add(c.id);
  }
  ids.clear();
  for (const t of def.topics) {
    if (!t || typeof t.id !== "string" || !t.id || ids.has(t.id) || typeof t.title !== "string" || typeof t.resources !== "string" ||
      !Number.isFinite(t.contactHours) || !Number.isFinite(t.selfStudyHours) || (t.week !== null && !Number.isFinite(t.week)) ||
      typeof t.protected !== "boolean" || !strings(t.cloIds) || !strings(t.prerequisiteTopicIds)) return "Invalid topic.";
    ids.add(t.id);
  }
  return null;
}

export function curriculumChanges(before: CourseDefinition, after: CourseDefinition): CurriculumChange[] {
  const changes: CurriculumChange[] = [];
  if (before.title !== after.title) changes.push({ kind: "edit", area: "Course", label: "Title", before: before.title, after: after.title });
  if (JSON.stringify(before.brief) !== JSON.stringify(after.brief)) changes.push({ kind: "edit", area: "Course", label: "Teaching constraints and context", before: "Previous course brief", after: "Revised course brief" });
  const compare = <T extends { id: string }>(a: T[], b: T[], area: "Outcome" | "Topic", label: (item: T) => string, text: (item: T) => string) => {
    for (const item of a) {
      const next = b.find(x => x.id === item.id);
      if (!next) changes.push({ kind: "remove", area, label: label(item), before: text(item), after: "" });
      else if (JSON.stringify(item) !== JSON.stringify(next)) changes.push({ kind: "edit", area, label: label(next), before: text(item), after: text(next) });
      else if (area === "Topic" && a.indexOf(item) !== b.indexOf(next)) changes.push({ kind: "move", area, label: label(next), before: "Position " + (a.indexOf(item) + 1), after: "Position " + (b.indexOf(next) + 1) });
    }
    for (const item of b) if (!a.some(x => x.id === item.id)) changes.push({ kind: "add", area, label: label(item), before: "", after: text(item) });
  };
  compare(before.outcomes, after.outcomes, "Outcome", c => c.label, c => c.text + " [" + c.bloomLevel + "]" +
    "\nAchievement: " + (c.assessmentEvidence || "Not specified") + "\nPLOs: " + (c.ploIds.join(", ") || "Not mapped"));
  compare(before.topics, after.topics, "Topic", t => t.title, t => t.title + " · " + t.contactHours + " contact h · " + t.selfStudyHours + " self-study h" +
    "\nWeek: " + (t.week ?? "unspecified") + "\nOutcome links: " + (t.cloIds.join(", ") || "none") +
    "\nPrerequisites: " + (t.prerequisiteTopicIds.join(", ") || "none") + "\nProtected: " + t.protected + "\nResources: " + t.resources);
  return changes;
}

export function curriculumImpact(before: CourseDefinition, after: CourseDefinition, plan?: TeachingPlan, tests: TestDraft[] = []) {
  const changedIds = new Set(before.outcomes.filter(c => {
    const next = after.outcomes.find(n => n.id === c.id);
    return !next || JSON.stringify(c) !== JSON.stringify(next);
  }).map(c => c.id));
  const changedTopics = [
    ...before.topics.filter(t => !after.topics.some(n => n.id === t.id && JSON.stringify(n) === JSON.stringify(t))),
    ...after.topics.filter(t => !before.topics.some(n => n.id === t.id && JSON.stringify(n) === JSON.stringify(t)))
  ];
  const affectedIds = new Set([...changedIds,...changedTopics.flatMap(t => t.cloIds)]);
  const titles = new Set(changedTopics.map(t => t.title.trim().toLowerCase()));
  return {
    changedOutcomeIds: [...changedIds],
    sessions: (plan?.sessions ?? []).filter(s => s.cloIds.some(id => affectedIds.has(id)) || titles.has(s.topic.trim().toLowerCase())),
    assessments: tests.filter(t => t.blueprint.cloWeights.some(w => affectedIds.has(w.cloId)) ||
      t.items.some(i => affectedIds.has(i.targetCLO))),
  };
}

export function curriculumMarkdown(subject: Subject, definition: CourseDefinition, versionId: string, draft?: CurriculumDraft): string {
  const b = definition.brief;
  const lines = ["# " + subject.id + ": " + definition.title, "", draft ? "Candidate revision " + draft.revision : "Local course version " + versionId, "",
    "Lecturer-controlled course preparation. This document does not attest institutional approval.", "",
    "Programme: " + (b.programmeTitle || "Not specified"), "Level: " + (b.level || "Not specified"), "Language: " + (b.language || "Not specified"),
    "Credits: " + (b.credits ?? "Not specified"), "Teaching weeks: " + (b.teachingWeeks ?? "Not specified"),
    "Contact-hour budget: " + (b.contactHours ?? "Not specified"), "Self-study budget: " + (b.selfStudyHours ?? "Not specified"),
    "Framework: " + (b.framework || "Not specified"), "Programme outcomes: " + (b.programmeOutcomes.join(", ") || "Not specified"), "",
    "## Course learning outcomes", ""];
  for (const c of definition.outcomes) lines.push("### " + c.label + " (" + c.bloomLevel + ")", "", c.text, "",
    "Achievement evidence: " + (c.assessmentEvidence || "Not specified"), "PLO mappings: " + (c.ploIds.join(", ") || "Not mapped"), "");
  lines.push("## Topic outline", "");
  definition.topics.forEach((t, i) => lines.push("### " + (i + 1) + ". " + t.title, "",
    "Week: " + (t.week ?? "Not specified") + " · Contact: " + t.contactHours + " h · Self-study: " + t.selfStudyHours + " h",
    "Outcomes: " + (t.cloIds.map(id => definition.outcomes.find(c => c.id === id)?.label ?? id).join(", ") || "Not linked"),
    "Prerequisites: " + (t.prerequisiteTopicIds.map(id => definition.topics.find(p => p.id === id)?.title ?? id).join(", ") || "None recorded"),
    "Protected: " + (t.protected ? "Yes" : "No"), "", t.resources || "No references recorded.", ""));
  lines.push("## Lecturer notes", "", b.notes || "No notes.", "");
  if (draft) lines.push("## Revision rationale", "", draft.reason || "Not supplied", "Effective term: " + (draft.effectiveTerm || "Not supplied"), "");
  const issues = validateCourseDefinition(definition, subject.id);
  lines.push("## Checks and limitations", "", ...(issues.length ? issues.map(i => "- " + i.severity + ": " + i.message) : ["No configured constraint issues detected. Academic quality requires review."]), "");
  return lines.join("\n");
}
