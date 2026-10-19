// Curriculum agent (spec Section 3). Deterministic: no LLM. Two jobs.
//
//  - detectPrerequisiteConflicts: the graph check. A conflict exists when a
//    subject is scheduled at or before a prerequisite it depends on, so the
//    cohort meets it without the foundation it assumes. This drives both the
//    annotation below and the readiness penalty the spine measures (Section 5).
//  - runCurriculum: programme + Signal -> a per-subject annotation
//    (fine / needs-update / needs-new-clo / prereq-conflict) with a plain-language
//    detail line.

import type { Subject, SubjectId } from "../types.ts";
import type { SignalResult } from "./signal.ts";
import { SUBJECTS, SUBJECTS_BY_ID } from "../data/seed.ts";

export interface PrerequisiteConflict {
  subjectId: SubjectId;
  missingPrereqId: SubjectId;
  edge: [SubjectId, SubjectId];
  cloId: string; // the outcome that assumes the missing prerequisite
}

/** Global sequence position: 2 semesters per year. */
export function subjectOrdinal(s: Subject): number {
  return (s.year - 1) * 2 + s.semester;
}

/** Conflicts in the proposed sequence: a subject scheduled at or before a
 *  prerequisite it depends on. Carries the offending edge and the subject's
 *  outcome, so the penalty lands on the right CLO. */
export function detectPrerequisiteConflicts(subjects: Subject[] = SUBJECTS): PrerequisiteConflict[] {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const conflicts: PrerequisiteConflict[] = [];
  for (const s of subjects) {
    for (const preId of s.prerequisiteSubjectIds) {
      const pre = byId.get(preId);
      if (!pre) continue;
      if (subjectOrdinal(s) <= subjectOrdinal(pre)) {
        conflicts.push({
          subjectId: s.id,
          missingPrereqId: preId,
          edge: [s.id, preId],
          cloId: s.cloIds[0],
        });
      }
    }
  }
  return conflicts;
}

export type CurriculumAnnotation = "fine" | "needs-update" | "needs-new-clo" | "prereq-conflict";

export interface SubjectAnnotation {
  subjectId: SubjectId;
  annotation: CurriculumAnnotation;
  detail: string;
}

/** Programme + Signal -> per-subject annotation. Prereq conflicts take
 *  precedence (they break the sequence); otherwise the Signal drift flag decides. */
export function runCurriculum(programmeId: string, signal: SignalResult): SubjectAnnotation[] {
  const subjects = SUBJECTS.filter((s) => s.programmeId === programmeId);
  const conflicts = detectPrerequisiteConflicts(subjects);
  const conflictBySubject = new Map(conflicts.map((c) => [c.subjectId, c]));
  const driftBySubject = new Map(signal.subjectDrift.map((d) => [d.subjectId, d]));

  return subjects.map((s) => {
    const conflict = conflictBySubject.get(s.id);
    if (conflict) {
      const pre = SUBJECTS_BY_ID[conflict.missingPrereqId];
      return {
        subjectId: s.id,
        annotation: "prereq-conflict",
        detail: `${s.title} is scheduled before ${pre?.title ?? conflict.missingPrereqId}, which it depends on. The cohort meets it without the foundation it assumes.`,
      };
    }
    const drift = driftBySubject.get(s.id);
    if (drift?.flag === "new-subject") {
      return {
        subjectId: s.id,
        annotation: "needs-new-clo",
        detail: `Demand here has drifted far from coverage (gap ${drift.gap.toFixed(2)}); a new outcome or subject may be needed.`,
      };
    }
    if (drift?.flag === "update") {
      return {
        subjectId: s.id,
        annotation: "needs-update",
        detail: `Employer demand outpaces coverage (gap ${drift.gap.toFixed(2)}); the outcomes are due an update.`,
      };
    }
    return { subjectId: s.id, annotation: "fine", detail: "Demand and coverage are aligned; no action needed." };
  });
}
