// Attainment against a stated threshold (depth plan Section 8): the direct line per outcome from the marks the intake
// kept, the Course Outcome Survey's share beside it as a second and different construct, the programme outcomes listed
// with their linked course outcomes and no index, and the OBE course report as a snapshot of all of it. Pure functions of
// records and the institution profile. Booth responses never enter (Section 7.2), and the one method is the share of
// students at or above the pass mark: a per-tool method needs per-tool scores the results file does not carry.

import type { CLO, CourseOutcome, InstitutionProfile, LoopEvent, ObeDirectRow, ObeIndirectRow, ObePloRow, ObeReport, PersonId, ProgrammeOutcome, ResultUpload, SubjectVersion, SurveyDefinition, SurveyResponse } from "../types.ts";
import type { OutcomeResult } from "./diff.ts";
import { surveyReleased, surveySummary } from "./surveys.ts";

/** The label on an interval: it measures one thing only. */
export const NON_RESPONSE_LABEL = "sampling noise from non-response only; nothing else";
/** What a row without filed marks says instead of a share (Section 8.2). */
export const NOT_FILED = "distribution not filed; file the results again to compute the share";
export const PLO_LINE = "Listed, not combined: no index, no weighted average and no comparison with a PLO target. H, M and L are strengths of a link, not numbers, and a programme figure needs every course's data and a programme-level method, which is planned.";

export const pctText = (x: number | null) => (x === null ? "none" : Math.round(x * 100) + "%");

/** Direct and indirect side by side, and why they are never combined (Section 8.1). */
export function constructsLine(passMark: number, target: number): string {
  return "Two different constructs over different students: achievement at or above " + passMark + " in the marks, and confidence at " + target +
    " or higher in the survey. They sit side by side in percentage points, never averaged and never read as a learning gain.";
}

/** The method as printed beside every figure it shapes. */
export function methodLine(passMark: number, studentShare: number): string {
  return "The share of students with a mark at or above " + passMark + ", against a KPI of " + pctText(studentShare) + " of students: the practice one Malaysian faculty publishes, set in the institution profile, not a national rule.";
}

/** The students a results file lists for one outcome: those with a mark and those without. */
export function listedOf(row: ResultUpload["rows"][number]): number {
  return row.n + (row.missing ?? 0);
}

/** The students the file lists (Section 8.1). An older or aggregated file states no class size, so it falls back to the
 *  most students it records for any one outcome. */
export function listedStudents(upload: ResultUpload): number {
  return Math.max(0, ...upload.rows.map(listedOf));
}

/** Wilson's 95% interval for a share over the n of N listed students who have a mark, its half-width times the finite
 *  population correction, sqrt((N - n) / (N - 1)), as the statistics note specifies. Null at a census (n is N), where the
 *  share is the cohort's and has no sampling noise, and when nothing is known. */
export function finiteWilson(successes: number, n: number, N: number, z = 1.959964): { low: number; high: number } | null {
  if (!Number.isInteger(n) || !Number.isInteger(N) || n <= 0 || N <= n || successes < 0 || successes > n) return null;
  const p = successes / n, z2 = z * z, d = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / d;
  const half = ((z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / d) * Math.sqrt((N - n) / (N - 1));
  const clamp = (x: number) => (x < 1e-12 ? 0 : x > 1 - 1e-12 ? 1 : x);
  return { low: clamp(centre - half), high: clamp(centre + half) };
}

/** One outcome's direct line: n of N, the mean and spread of the marks, the count and share at or above the pass mark over
 *  n with N beside it, the KPI against the student share, and an interval only when n is below N. A row whose marks were
 *  not filed shows its n and nothing computed from marks it does not hold. */
export function directRow(row: ResultUpload["rows"][number], clo: CLO | undefined, passMark: number, studentShare: number, fileN: number): ObeDirectRow {
  const label = clo?.label ?? row.cloId, text = clo?.text ?? "";
  if (!row.marks) return { cloId: row.cloId, label, text, N: fileN, n: row.n, missing: Math.max(0, fileN - row.n), filed: false, mean: null, sd: null, atOrAbove: null, share: null, kpiMet: null, interval: null };
  const marks = row.marks, n = marks.length, N = row.missing !== undefined ? n + row.missing : Math.max(n, fileN);
  const mean = n ? marks.reduce((a, b) => a + b, 0) / n : null;
  const sd = mean === null ? null : Math.sqrt(marks.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const atOrAbove = marks.filter((m) => m >= passMark).length;
  const share = n ? atOrAbove / n : null;
  return { cloId: row.cloId, label, text, N, n, missing: N - n, filed: true, mean, sd, atOrAbove, share,
    kpiMet: share === null ? null : share >= studentShare, interval: n < N ? finiteWilson(atOrAbove, n, N) : null };
}

/** The direct lines for every outcome in a results file, at a given pass mark and student share. */
export function directRows(upload: ResultUpload, clos: CLO[], passMark: number, studentShare: number): ObeDirectRow[] {
  const N = listedStudents(upload);
  return upload.rows.map((r) => directRow(r, clos.find((c) => c.id === r.cloId), passMark, studentShare, N));
}

/** Each outcome's share at the pass mark in a results file, in the words of the version its term was taught on, so a
 *  comparison between terms can tell a reworded outcome from a changed result (depth plan Section 6.2, pattern 4). */
export function termResults(upload: ResultUpload, clos: CLO[], passMark: number, studentShare: number, versions: SubjectVersion[]): OutcomeResult[] {
  const v = versions.find((x) => x.id === upload.courseVersionId);
  const wording: Array<{ id: string; text: string }> = v?.definition?.outcomes ?? v?.cloSnapshot ?? [];
  return directRows(upload, clos, passMark, studentShare)
    .map((d) => ({ cloId: d.cloId, label: d.label, text: wording.find((o) => o.id === d.cloId)?.text ?? d.text, share: d.share }));
}

/** The direct line as one sentence, the plan's own shape: "CLO2: 29 of 38 students at 55 or above, 76%; KPI 50% met". */
export function directSentence(r: ObeDirectRow, passMark: number, studentShare: number): string {
  if (!r.filed || r.share === null) return r.label + ": " + r.n + " of " + r.N + " with a result; " + NOT_FILED + ".";
  const of = r.n < r.N ? r.atOrAbove + " of " + r.n + " students with a mark (" + r.missing + " of " + r.N + " without one)" : r.atOrAbove + " of " + r.N + " students";
  return r.label + ": " + of + " at " + passMark + " or above, " + pctText(r.share) + "; KPI " + pctText(studentShare) + " " + (r.kpiMet ? "met" : "not met");
}

/** The Course Outcome Survey's share at the target or higher per outcome, over those who chose a point, from every source
 *  but the booth, and only once its results are open (grades released, the floor met). */
export function indirectFor(def: SurveyDefinition | null, responses: SurveyResponse[], institution: InstitutionProfile, events: LoopEvent[]) {
  if (!def) return { rows: [] as ObeIndirectRow[], summary: null };
  // By rule, booth responses demonstrate the collector and never count as the course's evidence.
  const counted = responses.filter((r) => r.formId === def.id && r.source !== "booth");
  const summary = surveySummary(def, counted, institution, surveyReleased(def, events));
  const rows: ObeIndirectRow[] = summary.open ? summary.items.filter((it) => it.cloId).map((it) => ({ cloId: it.cloId!, n: it.n, atTarget: it.atTarget, share: it.share })) : [];
  return { rows, summary };
}

/** Per programme outcome, the course outcomes linked to it with the link's strength and their direct share, listed. */
export function ploListing(outcomes: CourseOutcome[], plos: ProgrammeOutcome[], direct: ObeDirectRow[]): ObePloRow[] {
  return plos.map((p) => ({ ploId: p.id, text: p.text,
    links: outcomes.flatMap((o) => (o.ploLinks ?? []).filter((l) => l.ploId === p.id).map((l) => ({ cloId: o.id, label: o.label, level: l.level, share: direct.find((d) => d.cloId === o.id)?.share ?? null }))) }))
    .filter((p) => p.links.length > 0);
}

export interface ObeInputs {
  id: string; subjectId: string; term: string; upload: ResultUpload; clos: CLO[]; outcomes: CourseOutcome[]; plos: ProgrammeOutcome[];
  institution: InstitutionProfile; survey: SurveyDefinition | null; responses: SurveyResponse[]; events: LoopEvent[];
  cqiNoteId: string | null; at: string; by: PersonId;
}

/** The OBE course report (Section 8.3) as a snapshot: the figures, and the version, threshold, method and survey they were
 *  printed with, so a later setting change cannot relabel it. */
export function obeReport(x: ObeInputs): ObeReport {
  const { passMark, studentShare, method } = x.institution.kpi;
  const direct = directRows(x.upload, x.clos, passMark, studentShare);
  const { rows: indirect, summary } = indirectFor(x.survey, x.responses, x.institution, x.events);
  const surveyNote = !x.survey ? "No Course Outcome Survey for this term."
    : summary!.open ? null
    : !summary!.released ? "The survey's results wait for the term's grades to be recorded as released."
    : "The survey is below its floor of " + summary!.floor.required + ", so no result shows.";
  return {
    id: x.id, subjectId: x.subjectId, term: x.term, versionId: x.upload.courseVersionId ?? null, uploadId: x.upload.id, sourceFileName: x.upload.sourceFileName ?? null, sample: Boolean(x.upload.sample),
    passMark, studentShare, method,
    surveyId: x.survey?.id ?? null, surveyTitle: x.survey?.title ?? null, surveyVersionId: x.survey?.versionId ?? null, surveyTarget: x.survey?.scale.target ?? null,
    respondents: summary?.respondents ?? null, classSize: x.survey?.classSize ?? null, rate: summary?.rate ?? null, floorRequired: summary?.floor.required ?? null, surveyOpen: Boolean(summary?.open), surveyNote,
    direct, indirect, plos: ploListing(x.outcomes, x.plos, direct),
    cqiNoteId: x.cqiNoteId, printedAt: x.at, printedBy: x.by,
  };
}
