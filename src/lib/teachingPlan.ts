import type { CLO, CourseDefinition, Subject, TeachingPlan, TeachingSession } from "../types.ts";

export type SessionInput = Omit<TeachingSession, "id" | "updatedAt" | "updatedBy"> & { id?: string };
export type SaveResult = { ok: true } | { ok: false; error: string };

/** Readiness means preparation fields are filled. It makes no claim about learning quality. */
export function sessionIssues(session: SessionInput, clos: CLO[]): string[] {
  const issues: string[] = [];
  if (!session.topic.trim()) issues.push("Give this session a topic.");
  if (!Number.isInteger(session.week) || session.week < 1 || session.week > 52)
    issues.push("Use a week number from 1 to 52.");
  if (!Number.isInteger(session.minutes) || session.minutes < 5 || session.minutes > 600)
    issues.push("Use a duration from 5 to 600 whole minutes.");
  if (!["draft", "ready", "delivered"].includes(session.status)) issues.push("Choose a valid preparation status.");
  if (session.cloIds.some((id) => !clos.some((clo) => clo.id === id)))
    issues.push("An outcome is no longer in this course. Update the outcome links.");
  if (session.status !== "draft") {
    if (!session.cloIds.length) issues.push("Link at least one CLO before marking the session ready or delivered.");
    if (!session.activity.trim()) issues.push("Add a learning activity before marking the session ready or delivered.");
    if (!session.learningCheck.trim()) issues.push("Add a check for understanding before marking the session ready or delivered.");
  }
  return issues;
}

export function orderedSessions(plan?: TeachingPlan): TeachingSession[] {
  return [...(plan?.sessions ?? [])].sort((a, b) => a.week - b.week || a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/** The lecturer's plan: the counts, the next class and the unlinked outcomes come from their own sessions. The term's sample
 *  sessions (depth plan Section 5.1) are written for the prototype, so they are kept apart in `samples` and never counted. */
export function planSummary(plan: TeachingPlan | undefined, clos: CLO[]) {
  const all = orderedSessions(plan);
  const sessions = all.filter((s) => !s.sample);
  const linked = new Set(sessions.flatMap((s) => s.cloIds));
  return {
    sessions,
    samples: all.filter((s) => s.sample),
    minutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
    ready: sessions.filter((s) => s.status === "ready" && !s.needsReview).length,
    needsReview: sessions.filter(s => s.needsReview).length,
    delivered: sessions.filter((s) => s.status === "delivered").length,
    unmapped: clos.filter((clo) => !linked.has(clo.id)),
    next: sessions.find((s) => s.needsReview || s.status !== "delivered"),
  };
}

/** A portable lecturer handout, exported without calling any model. */
export function teachingPlanMarkdown(subject: Subject, plan: TeachingPlan, clos: CLO[]): string {
  const summary = planSummary(plan, clos);
  const lines = [
    "# " + subject.id + ": " + subject.title,
    "", "Teaching plan · " + (plan.term || "Term not specified"), "",
    "Lecturer-authored preparation. Outcome links describe planned coverage, not demonstrated mastery.",
    "This plan does not change the approved curriculum. Source CLOs may be prototype fixtures.", "",
    "## Course learning outcomes", "",
    ...clos.map((clo) => "- " + (clo.label ?? clo.id) + " (" + clo.bloomLevel + "): " + clo.text),
    "", "## Teaching notes", "", plan.notes || "No course notes yet.", "",
    "## Sessions", "",
  ];
  for (const session of summary.sessions) {
    lines.push(
      "### Week " + session.week + " · " + session.topic, "",
      "Duration: " + session.minutes + " minutes · Status: " + session.status,
      ...(session.needsReview ? ["Course changed: review this session and its outcome links before reuse."] : []),
      "Outcomes: " + (session.cloIds.map(id => clos.find(c => c.id === id)?.label ?? id).join(", ") || "Not linked"), "",
      "**Activity**", "", session.activity || "To prepare", "",
      "**Check for understanding**", "", session.learningCheck || "To prepare", "",
      "**Resources and slide brief**", "", session.resources || "To prepare", "",
    );
  }
  lines.push("## Preparation check", "",
    summary.sessions.length + " sessions · " + summary.minutes + " planned minutes · " + summary.ready + " ready · " + summary.delivered + " delivered.",
    ...(summary.samples.length ? [summary.samples.length + " sample sessions written for this prototype are not part of this plan; the course file carries them, labelled sample."] : []),
    "CLOs with no planned session: " + (summary.unmapped.map((c) => c.label ?? c.id).join(", ") || "None"), "",
    "Last saved: " + plan.updatedAt, "");
  return lines.join("\n");
}

/** The week a new session starts on: the first week that teaches an outcome the course's latest version changed (the session to
 *  plan after a change), otherwise the week after the lecturer's own last session. Sample sessions are not the lecturer's. */
export function suggestedWeek(sessions: TeachingSession[], current: CourseDefinition | null, previous: CourseDefinition | null): number {
  const changed = current && previous ? changedOutcomeWeek(current, previous) : null;
  if (changed !== null) return changed;
  const own = sessions.filter((s) => !s.sample);
  return Math.min(52, (own.length ? Math.max(...own.map((s) => s.week)) : 0) + 1);
}

/** The first week whose topic teaches an outcome that is new or reworded in `current`, or null when none is. */
export function changedOutcomeWeek(current: CourseDefinition, previous: CourseDefinition): number | null {
  const changed = new Set(current.outcomes.filter((o) => {
    const before = previous.outcomes.find((p) => p.id === o.id);
    return !before || before.text !== o.text || before.bloomLevel !== o.bloomLevel;
  }).map((o) => o.id));
  const weeks = current.topics.filter((t) => t.week !== null && t.cloIds.some((id) => changed.has(id))).map((t) => t.week!);
  return weeks.length ? Math.min(...weeks) : null;
}

/** The session whose pack shows a change: the lecturer's own in that week first, otherwise the term's sample one. */
export function sessionInWeek(sessions: TeachingSession[], week: number | null): TeachingSession | null {
  if (week === null) return null;
  return sessions.find((s) => s.week === week && !s.sample) ?? sessions.find((s) => s.week === week) ?? null;
}
