// The term recap (depth plan Section 9.1 item 4): one printable page per course and term, from records only. Each part names
// the records it reads, so prove-judge can check every number against them: what employers asked for (the top skills over
// the reviewed postings, with their intervals), what was decided (the decision behind the version in use), what changed
// (the summary of that version against the one it replaced), what was taught (the lecturer's own sessions and their packs)
// and what came back (the results filed for the term, as filed, or "not filed"; the OBE course report saved for the term,
// with the settings it was printed with; and the Course Outcome Survey under its rules, booth responses never among them).

import { SEED_RESULT_UPLOADS } from "../data/seed.ts";
import { DEMO_LINE } from "../data/sample-course/index.ts";
import { authorisingDecision, previousVersionOf } from "../lib/decisions.ts";
import { changeSummary, deckDiff } from "../lib/diff.ts";
import { evidenceReport } from "../lib/evidence.ts";
import { attainment } from "../lib/learn.ts";
import { brandFor, packUnderVersion } from "../lib/slides.ts";
import { changedOutcomeWeek, sessionInWeek } from "../lib/teachingPlan.ts";
import { surveyReleased, surveySummary } from "../lib/surveys.ts";
import type { BriefDecision, CourseDefinition, SubjectVersion } from "../types.ts";
import { termWindow } from "./loop.ts";
import type { AppState } from "./store.ts";

export interface RecapSkill { skill: string; postings: number; of: number; low: number | null; high: number | null }
export interface Recap {
  subjectId: string; title: string; term: string; sample: boolean; demoLine: string | null;
  evidence: { reviewed: number; sources: number; skills: RecapSkill[] };
  decision: (BriefDecision & { by: string }) | null;
  change: { from: string; to: string; summary: string; before: CourseDefinition; after: CourseDefinition } | null;
  taught: Array<{ id: string; week: number; topic: string; slides: number; versionId: string | null }>;
  samples: number;
  results: { file: string; term: string; N: number; versionId: string | null; sample: boolean; rows: Array<{ label: string; mean: number; n: number }> } | null;
  obe: { id: string; savedAt: string; by: string; passMark: number; studentShare: number; versionId: string | null;
    rows: Array<{ label: string; n: number; N: number; mean: number | null; atOrAbove: number | null; share: number | null; kpiMet: boolean | null }> } | null;
  survey: { title: string; respondents: number; rate: string | null; open: boolean; released: boolean; required: number; booth: number;
    items: Array<{ label: string; n: number; atTarget: number; share: number | null }>; target: number } | null;
  builtAt: string;
}

const SEEDED = new Set(SEED_RESULT_UPLOADS.map((u) => u.id));

/** The recap of one course's current term, or null when the course does not exist. */
export function recapFor(state: AppState, subjectId: string, at: string): Recap | null {
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!subject) return null;
  const clos = state.clos.filter((c) => c.subjectId === subjectId);
  const window = termWindow(state, subjectId);
  const inTerm = (iso: string) => iso >= window.since;
  const definition = state.courseDefinitions[subjectId];
  const report = evidenceReport(subjectId, state.evidenceSources, state.skillMentions, state.skillMappings, clos);
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;

  const current = state.subjectVersions.find((v) => v.id === subject.currentVersionId);
  const previous: SubjectVersion | null = current ? previousVersionOf(current, state.subjectVersions, state.events, state.curriculumDrafts) : null;
  const authorising = current ? authorisingDecision(current.id, state.events, state.briefDecisions, state.curriculumDrafts) : null;
  const latest = state.briefDecisions.filter((d) => d.subjectId === subjectId && inTerm(d.at)).sort((a, b) => a.at.localeCompare(b.at)).at(-1) ?? null;
  const decision = authorising ?? latest;

  const sessions = state.teachingPlans.find((p) => p.subjectId === subjectId)?.sessions ?? [];
  const evidence = { sources: state.evidenceSources, mentions: state.skillMentions, mappings: state.skillMappings };
  const pack = (session: (typeof sessions)[number], version: SubjectVersion) =>
    packUnderVersion(subject, session, version, evidence, state.people, at, brandFor(state.institution, version.definition ?? null, subject, session.week, null));
  let change: Recap["change"] = null;
  if (current?.definition && previous?.definition && inTerm(current.changedAt)) {
    const packSession = sessionInWeek(sessions, changedOutcomeWeek(current.definition, previous.definition));
    const slides = packSession ? deckDiff(pack(packSession, previous), pack(packSession, current)) : [];
    change = { from: previous.id, to: current.id, summary: changeSummary(previous.definition, current.definition, slides), before: previous.definition, after: current.definition };
  }

  const own = sessions.filter((s) => !s.sample && inTerm(s.updatedAt)).sort((a, b) => a.week - b.week);
  const upload = state.resultUploads.filter((u) => u.subjectId === subjectId && !SEEDED.has(u.id) && (!window.term || u.term === window.term) && inTerm(u.filedAt))
    .sort((a, b) => a.filedAt.localeCompare(b.filedAt)).at(-1);
  const filed = upload ? attainment(upload, clos) : null;

  return {
    subjectId, title: subject.title, term: window.term, sample: Boolean(definition?.sample), demoLine: definition?.sample ? DEMO_LINE : null,
    evidence: { reviewed: report.eligible, sources: state.evidenceSources.filter((s) => s.subjectId === subjectId && !s.duplicateOf).length,
      skills: report.rows.filter((r) => r.postings > 0).slice(0, 5).map((r) => ({ skill: r.skill, postings: r.postings, of: report.eligible, low: r.interval?.low ?? null, high: r.interval?.high ?? null })) },
    decision: decision ? { ...decision, by: name(decision.byPersonId) } : null,
    change,
    taught: own.map((s) => ({ id: s.id, week: s.week, topic: s.topic, slides: current ? pack(s, current).slides.length : 0, versionId: s.courseVersionId ?? null })),
    samples: sessions.filter((s) => s.sample).length,
    results: upload && filed ? { file: upload.sourceFileName ?? "Results", term: upload.term, N: filed.N, versionId: upload.courseVersionId ?? null, sample: Boolean(upload.sample),
      rows: filed.rows.map((r) => ({ label: r.clo?.label ?? r.cloId, mean: r.meanScore, n: r.n })) } : null,
    obe: (() => {
      // The latest OBE report saved for the term, as printed: its figures and the threshold it was printed with.
      const saved = window.term ? state.obeReports.filter((r) => r.subjectId === subjectId && r.term === window.term).sort((a, b) => a.printedAt.localeCompare(b.printedAt)).at(-1) : undefined;
      return saved ? { id: saved.id, savedAt: saved.printedAt, by: name(saved.printedBy), passMark: saved.passMark, studentShare: saved.studentShare, versionId: saved.versionId,
        rows: saved.direct.map((r) => ({ label: r.label, n: r.n, N: r.N, mean: r.mean, atOrAbove: r.atOrAbove, share: r.share, kpiMet: r.kpiMet })) } : null;
    })(),
    survey: (() => {
      const form = state.surveys.find((x) => x.subjectId === subjectId && x.kind === "course-outcome" && !x.sample && x.term === window.term);
      if (!form || !window.term) return null;
      const mine = state.surveyResponses.filter((r) => r.formId === form.id);
      // By rule, booth responses demonstrate the collector and never count as the course's evidence.
      const s = surveySummary(form, mine.filter((r) => r.source !== "booth"), state.institution, surveyReleased(form, state.events));
      return { title: form.title, respondents: s.respondents, rate: s.rate, open: s.open, released: s.released, required: s.floor.required, booth: mine.filter((r) => r.source === "booth").length, target: form.scale.target,
        items: s.items.map((it) => ({ label: clos.find((c) => c.id === it.cloId)?.label ?? it.id, n: it.n, atTarget: it.atTarget, share: it.share })) };
    })(),
    builtAt: at,
  };
}
