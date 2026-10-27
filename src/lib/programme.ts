// The programme at another zoom (depth plan Section 9.1, D6b): the CLO to PLO heat table across a programme's courses, read
// from each course's recorded outline. A course without a recorded outline says so, and nothing is inferred from its CLOs;
// a link mapped without a strength is shown as linked, never given one.

import type { CourseDefinition, PloLevel, ProgrammeOutcome, Subject } from "../types.ts";

export const NO_OUTLINE = "no outline recorded";
export const NO_LINKS = "no CLO to PLO links recorded";
export const LEVEL_WORD: Record<PloLevel, string> = { H: "high", M: "medium", L: "low" };
const STRENGTH: Record<PloLevel, number> = { H: 3, M: 2, L: 1 };

/** One course against one PLO: the outcomes linked to it with their strength, and the strongest of them. */
export interface HeatCell { ploId: string; level: PloLevel | null; linked: Array<{ label: string; level: PloLevel | null }> }
/** One course's row: its cells, or the reason it has none. */
export interface HeatRow { subjectId: string; title: string; cells: HeatCell[] | null; note: string | null }

/** The programme's heat table, a row per course in the programme's own order and a cell per PLO. */
export function programmeHeat(plos: ProgrammeOutcome[], subjectIds: string[], subjects: Subject[], definitions: Record<string, CourseDefinition>): HeatRow[] {
  return subjectIds.map((id) => {
    const title = subjects.find((s) => s.id === id)?.title ?? id;
    const def = definitions[id];
    if (!def) return { subjectId: id, title, cells: null, note: NO_OUTLINE };
    const cells = plos.map((p) => {
      const linked = def.outcomes.filter((o) => o.ploIds.includes(p.id) || o.ploLinks?.some((l) => l.ploId === p.id))
        .map((o) => ({ label: o.label, level: o.ploLinks?.find((l) => l.ploId === p.id)?.level ?? null }));
      const level = linked.reduce<PloLevel | null>((best, l) => (l.level && (!best || STRENGTH[l.level] > STRENGTH[best]) ? l.level : best), null);
      return { ploId: p.id, level, linked };
    });
    return { subjectId: id, title, cells, note: cells.some((c) => c.linked.length) ? null : NO_LINKS };
  });
}

/** A cell in words, for the table's text and a screen reader: "3 outcomes, strongest high: CS310-1 medium, ...". */
export function heatCellText(cell: HeatCell): string {
  if (!cell.linked.length) return "no outcome linked";
  const strongest = cell.level ? ", strongest " + LEVEL_WORD[cell.level] : ", no strength recorded";
  return cell.linked.length + (cell.linked.length === 1 ? " outcome" : " outcomes") + strongest + ": "
    + cell.linked.map((l) => l.label + " " + (l.level ? LEVEL_WORD[l.level] : "unrated")).join(", ");
}
