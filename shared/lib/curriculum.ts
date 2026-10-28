import type { BloomLevel, CLO, CourseBrief, CourseDefinition, CourseTopic, CurriculumDraft, StudentLearningTime, Subject, TeachingPlan, TestDraft } from "../types.ts";

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

export function validateCourseDefinition(def: CourseDefinition, subjectId: string, baseline?: CourseDefinition, asOfYear = new Date().getUTCFullYear()): CurriculumIssue[] {
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
  courseRecordIssues(def, add, asOfYear);
  return issues;
}

/** The course-file checks of the depth plan (Sections 4.2 and 4.3). Each runs only when its part of the record exists, so an
 *  older or thinner course is checked as before. */
function courseRecordIssues(def: CourseDefinition, add: (severity: CurriculumIssue["severity"], code: string, message: string) => void, asOfYear: number) {
  const outcomeIds = new Set(def.outcomes.map(o => o.id));
  // The matrix: a level in every linked cell.
  for (const o of def.outcomes) {
    if (!o.ploLinks) continue;
    const linked = new Set(o.ploLinks.map(l => l.ploId));
    const unlevelled = o.ploIds.filter(id => !linked.has(id));
    if (unlevelled.length) add("error", "plo-level", o.label + ": give " + unlevelled.join(", ") + " a level (H, M or L) in the matrix.");
    if (o.ploLinks.some(l => !o.ploIds.includes(l.ploId))) add("error", "plo-level", o.label + ": a matrix level names a programme outcome the mapping no longer lists.");
  }
  // Lecture and lab hours, per topic.
  for (const t of def.topics) {
    const hasLecture = t.lectureHours !== undefined, hasLab = t.labHours !== undefined;
    if (hasLecture !== hasLab) add("error", "topic-split", t.title + ": record both lecture and lab hours, or neither.");
    else if (hasLecture && hasLab) {
      if (![t.lectureHours, t.labHours].every(h => Number.isFinite(h) && h! >= 0)) add("error", "topic-split", t.title + ": lecture and lab hours must be finite and non-negative.");
      else if (Math.abs(t.lectureHours! + t.labHours! - t.contactHours) > 1e-8) add("error", "topic-split", t.title + ": " + t.lectureHours + " lecture and " + t.labHours + " lab hours do not add to its " + t.contactHours + " contact hours.");
    }
  }
  // Student learning time: lecture, lab and self-study follow the topics; the total fits the credits.
  if (def.slt) {
    const time = learningTime(def)!;
    if (!time.unsplit) {
      if (Math.abs(def.slt.lecture - time.lecture) > 1e-8) add("error", "slt-lecture", "Student learning time lists " + def.slt.lecture + " lecture hours; the topics hold " + time.lecture + ".");
      if (Math.abs(def.slt.lab - time.lab) > 1e-8) add("error", "slt-lab", "Student learning time lists " + def.slt.lab + " lab hours; the topics hold " + time.lab + ".");
    } else add("warning", "slt-split", time.unsplit + " contact hours are not split into lecture and lab, so the learning time counts them as contact only.");
    if (Math.abs(def.slt.selfStudy - time.selfStudy) > 1e-8) add("error", "slt-self-study", "Student learning time lists " + def.slt.selfStudy + " self-study hours; the topics hold " + time.selfStudy + ".");
    if (time.capacity !== null && time.total > time.capacity + 1e-8) add("error", "slt-total", "Student learning time adds to " + time.total + " hours; " + def.brief.credits + " credits allow " + time.capacity + ".");
    else if (time.unallocated) add("warning", "slt-unallocated", time.unallocated + " of the " + time.capacity + " learning hours are unallocated.");
  }
  // The assessment plan: weights add to 100, each allocation adds to its weight, and every outcome is assessed.
  if (def.assessment?.length) {
    const total = def.assessment.reduce((n, a) => n + a.weight, 0);
    if (Math.abs(total - 100) > 1e-8) add("error", "assessment-weights", "Assessment weights add to " + total + "%, not 100%.");
    for (const a of def.assessment) {
      const marks = a.allocation.reduce((n, x) => n + x.marks, 0);
      if (Math.abs(marks - a.weight) > 1e-8) add("error", "assessment-allocation", a.title + ": its marks by outcome add to " + marks + ", not its weight of " + a.weight + ".");
      const missing = a.allocation.filter(x => !outcomeIds.has(x.cloId)).map(x => x.cloId);
      if (missing.length) add("error", "assessment-outcome", a.title + ": it assesses outcomes the course no longer has: " + missing.join(", ") + ".");
    }
    const assessed = new Set(def.assessment.flatMap(a => a.allocation.map(x => x.cloId)));
    const unassessed = def.outcomes.filter(o => !assessed.has(o.id)).map(o => o.label);
    if (unassessed.length) add("error", "assessment-coverage", "No assessment component assesses " + unassessed.join(", ") + ".");
  }
  // References: at least two under five years old, or the gap is said.
  if (def.references) {
    const recent = def.references.filter(r => r.year !== null && asOfYear - r.year < 5).length;
    if (recent < 2) add("warning", "references-recent", (recent ? "Only " + recent + " reference is" : "No reference is") + " under five years old; the record asks for at least two." + (def.referencesGap ? " " + def.referencesGap : ""));
  }
}

// ---------- the course record's arithmetic (depth plan Section 4.3) ----------

export interface LearningTime { lecture: number; lab: number; unsplit: number; selfStudy: number; assessment: number; exam: number; total: number; capacity: number | null; unallocated: number }
/** Student learning time as the record states it: lecture, lab and self-study from the topics (contact hours not yet split
 *  counted apart), assessment work and the examination from the record, against credits times 40 (MQF: one credit, 40 hours). */
export function learningTime(def: CourseDefinition): LearningTime | null {
  if (!def.slt) return null;
  const split = def.topics.filter(t => t.lectureHours !== undefined && t.labHours !== undefined);
  const lecture = split.reduce((n, t) => n + t.lectureHours!, 0), lab = split.reduce((n, t) => n + t.labHours!, 0);
  const unsplit = def.topics.filter(t => !split.includes(t)).reduce((n, t) => n + t.contactHours, 0);
  const selfStudy = def.topics.reduce((n, t) => n + t.selfStudyHours, 0);
  const w = def.slt.assessmentWork, assessment = w.quizzes + w.labs + w.essay + w.project;
  const total = lecture + lab + unsplit + selfStudy + assessment + def.slt.exam;
  const capacity = def.brief.credits === null ? null : def.brief.credits * 40;
  return { lecture, lab, unsplit, selfStudy, assessment, exam: def.slt.exam, total, capacity, unallocated: capacity === null ? 0 : Math.max(0, capacity - total) };
}

/** The stored learning time brought in line with the topics, and each outcome's matrix links kept to its PLO list. The store
 *  applies this on save, so a revision's record never disagrees with its own outline. */
export function withDerivedFields(def: CourseDefinition): CourseDefinition {
  const next = structuredClone(def);
  next.outcomes = next.outcomes.map(o => o.ploLinks ? { ...o, ploLinks: o.ploLinks.filter(l => o.ploIds.includes(l.ploId)) } : o);
  next.topics = next.topics.map(t => t.misconceptions ? { ...t, misconceptions: t.misconceptions.map(m => m.trim()).filter(Boolean) } : t);
  if (next.slt) {
    const time = learningTime(next)!;
    next.slt = { ...next.slt, lecture: time.lecture, lab: time.lab, selfStudy: time.selfStudy };
  }
  return next;
}

/** The first week with fewer hours than the course's usual week, and the hours it has free, so a topic added in a revision
 *  goes where the schedule has room. Null when the course records no lecture and lab split by week. */
export function nextFreeSlot(def: CourseDefinition): { week: number; lecture: number; lab: number } | null {
  const weeks = new Map<number, { lecture: number; lab: number }>();
  for (const t of def.topics) {
    if (t.week === null || t.lectureHours === undefined || t.labHours === undefined) continue;
    const w = weeks.get(t.week) ?? { lecture: 0, lab: 0 };
    weeks.set(t.week, { lecture: w.lecture + t.lectureHours, lab: w.lab + t.labHours });
  }
  if (!weeks.size || def.brief.teachingWeeks === null) return null;
  const counts = new Map<string, { lecture: number; lab: number; n: number }>();
  for (const w of weeks.values()) {
    const key = w.lecture + "+" + w.lab;
    counts.set(key, { ...w, n: (counts.get(key)?.n ?? 0) + 1 });
  }
  const usual = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  for (let week = 1; week <= def.brief.teachingWeeks; week++) {
    const w = weeks.get(week) ?? { lecture: 0, lab: 0 };
    if (w.lecture < usual.lecture || w.lab < usual.lab) return { week, lecture: Math.max(0, usual.lecture - w.lecture), lab: Math.max(0, usual.lab - w.lab) };
  }
  return null;
}

/** A free slot's hours given to a topic of the given contact hours: the slot's lecture hours first, the rest in the lab. */
export function splitForSlot(slot: { lecture: number }, contact: number): Required<Pick<CourseTopic, "lectureHours" | "labHours">> {
  const lecture = Math.max(0, Math.min(slot.lecture, contact));
  return { lectureHours: lecture, labHours: Math.max(0, contact - lecture) };
}

/** The table of specifications: marks by outcome and Bloom level, the sum of the components' allocations. */
export function tableOfSpecifications(def: CourseDefinition): Array<{ cloId: string; bloomLevel: BloomLevel; marks: number; components: string[] }> {
  const rows = new Map<string, { cloId: string; bloomLevel: BloomLevel; marks: number; components: string[] }>();
  for (const a of def.assessment ?? []) for (const x of a.allocation) {
    const key = x.cloId + "\n" + x.bloomLevel;
    const row = rows.get(key) ?? { cloId: x.cloId, bloomLevel: x.bloomLevel, marks: 0, components: [] };
    rows.set(key, { ...row, marks: row.marks + x.marks, components: [...row.components, a.title] });
  }
  const order = new Map(def.outcomes.map((o, i) => [o.id, i]));
  return [...rows.values()].sort((a, b) => (order.get(a.cloId) ?? 99) - (order.get(b.cloId) ?? 99) || BLOOM_LEVELS.indexOf(a.bloomLevel) - BLOOM_LEVELS.indexOf(b.bloomLevel));
}

/** Which components assess an outcome, with their marks. */
export function assessmentOf(def: CourseDefinition, cloId: string): Array<{ title: string; marks: number }> {
  return (def.assessment ?? []).flatMap(a => a.allocation.filter(x => x.cloId === cloId).map(x => ({ title: a.title, marks: x.marks })));
}

/** Items as a phrase: "a, b and c". */
export function listText(items: string[]): string {
  return items.length > 1 ? items.slice(0, -1).join(", ") + " and " + items[items.length - 1] : items[0] ?? "";
}
/** A phrase with its first letter in capitals. */
export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A topic's hours in words: "2 lecture h + 2 lab h", or the contact hours when no split is recorded. */
export function topicHours(t: CourseTopic): string {
  return t.lectureHours !== undefined && t.labHours !== undefined ? t.lectureHours + " lecture h + " + t.labHours + " lab h" : t.contactHours + " contact h";
}

export const sltTotal = (slt: StudentLearningTime) => slt.lecture + slt.lab + slt.selfStudy + slt.assessmentWork.quizzes + slt.assessmentWork.labs + slt.assessmentWork.essay + slt.assessmentWork.project + slt.exam;

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
    if ((t.kind !== undefined && !TOPIC_KINDS.includes(t.kind)) || !optNumber(t.lectureHours) || !optNumber(t.labHours) ||
      !optText(t.activities) || !optText(t.readings) || (t.misconceptions !== undefined && !strings(t.misconceptions))) return "Invalid topic.";
    ids.add(t.id);
  }
  for (const c of def.outcomes) {
    if (!optText(c.mqfCluster) || (c.ploLinks !== undefined && !(Array.isArray(c.ploLinks) && c.ploLinks.length <= 300 &&
      c.ploLinks.every(l => l && typeof l.ploId === "string" && (l.level === "H" || l.level === "M" || l.level === "L"))))) return "Invalid or cross-course outcome.";
  }
  if (!optText(def.synopsis) || !optText(def.referencesGap) || !optText(def.source) || (def.sample !== undefined && typeof def.sample !== "boolean") ||
    (def.methods !== undefined && !strings(def.methods))) return "Invalid course record.";
  if (def.references !== undefined && !(Array.isArray(def.references) && def.references.length <= 300 &&
    def.references.every(r => r && typeof r.citation === "string" && r.citation.length <= 5000 && (r.year === null || Number.isInteger(r.year)) && optText(r.note)))) return "Invalid references.";
  if (def.assessment !== undefined && !(Array.isArray(def.assessment) && def.assessment.length <= 100 && def.assessment.every(a => a &&
    typeof a.id === "string" && !!a.id && typeof a.title === "string" && ASSESSMENT_KINDS.includes(a.kind) && Number.isFinite(a.weight) && typeof a.week === "string" &&
    typeof a.description === "string" && a.description.length <= 50000 && typeof a.individual === "boolean" && optText(a.rubricId) &&
    Array.isArray(a.allocation) && a.allocation.length <= 300 && a.allocation.every(x => x && typeof x.cloId === "string" && BLOOM_LEVELS.includes(x.bloomLevel) && Number.isFinite(x.marks) && x.marks >= 0))))
    return "Invalid assessment plan.";
  if (new Set((def.assessment ?? []).map(a => a.id)).size !== (def.assessment ?? []).length) return "Invalid assessment plan.";
  const slt = def.slt;
  if (slt !== undefined && !(slt && [slt.lecture, slt.lab, slt.selfStudy, slt.exam].every(n => Number.isFinite(n) && n >= 0) && slt.assessmentWork &&
    [slt.assessmentWork.quizzes, slt.assessmentWork.labs, slt.assessmentWork.essay, slt.assessmentWork.project].every(n => Number.isFinite(n) && n >= 0))) return "Invalid student learning time.";
  return null;
}
const TOPIC_KINDS: string[] = ["lecture", "lab", "mixed", "quiz", "studio", "review"];
const ASSESSMENT_KINDS: string[] = ["quiz", "lab", "project", "defence", "essay", "exam"];
const optNumber = (x: unknown) => x === undefined || (typeof x === "number" && Number.isFinite(x));
const optText = (x: unknown) => x === undefined || (typeof x === "string" && x.length <= 50000);

export function curriculumChanges(before: CourseDefinition, after: CourseDefinition): CurriculumChange[] {
  const changes: CurriculumChange[] = [];
  if (before.title !== after.title) changes.push({ kind: "edit", area: "Course", label: "Title", before: before.title, after: after.title });
  if (JSON.stringify(before.brief) !== JSON.stringify(after.brief)) changes.push({ kind: "edit", area: "Course", label: "Teaching constraints and context", before: "Previous course brief", after: "Revised course brief" });
  if ((before.synopsis ?? "") !== (after.synopsis ?? "")) changes.push({ kind: "edit", area: "Course", label: "Synopsis", before: before.synopsis ?? "", after: after.synopsis ?? "" });
  if (JSON.stringify(before.assessment ?? []) !== JSON.stringify(after.assessment ?? [])) changes.push({ kind: "edit", area: "Course", label: "Assessment plan",
    before: (before.assessment ?? []).map(a => a.title + " " + a.weight + "%").join("; "), after: (after.assessment ?? []).map(a => a.title + " " + a.weight + "%").join("; ") });
  if (JSON.stringify(before.references ?? []) !== JSON.stringify(after.references ?? [])) changes.push({ kind: "edit", area: "Course", label: "References",
    before: (before.references ?? []).map(r => r.citation).join("\n"), after: (after.references ?? []).map(r => r.citation).join("\n") });
  const timeBefore = learningTime(before), timeAfter = learningTime(after);
  if (timeBefore && timeAfter && timeBefore.total !== timeAfter.total) changes.push({ kind: "edit", area: "Course", label: "Student learning time",
    before: timeBefore.total + " of " + (timeBefore.capacity ?? "unstated") + " hours", after: timeAfter.total + " of " + (timeAfter.capacity ?? "unstated") + " hours" });
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
  compare(before.topics, after.topics, "Topic", t => t.title, t => t.title + " · " + topicHours(t) + " · " + t.selfStudyHours + " self-study h" + (t.kind ? " · " + t.kind : "") +
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
