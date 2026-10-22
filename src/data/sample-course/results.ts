// The sample results for CS310 (depth plan Section 8.4): synthetic marks out of 100 for 38 students a term, labelled
// sample, written by the build session for this prototype. RESULTS_NOW is the file the tour files (results.xlsx), as a
// lecturer would export it, three students without a mark on CLO3; RESULTS_PRIOR is last term's (results-prior.xlsx), on
// version CS310-v1, which the seed files as a labelled example that is never counted. The counts at or above 55 are set,
// and each student's marks follow one seeded ability, so the file reads like a class rather than noise. Across the two
// terms CLO5's wording changes, so its two shares are not comparable (Section 6.1).

export const SAMPLE_CLASS = 38;
export const RESULTS_HEADER = ["Student ID", "CLO1 mark (%)", "CLO2 mark (%)", "CLO3 mark (%)", "CLO4 mark (%)", "CLO5 mark (%)", "Remarks"];

export interface SampleResultsFile { fileName: string; sheetName: string; term: string; rows: Array<Array<string | number>> }

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One term's file: per outcome, the students ranked by ability plus a little noise; the top `atOrAbove` of those with a
 *  mark score 55 to 92, the rest 26 to 54, so each count at or above 55 is exactly as set. */
function build(seed: number, idBase: number, atOrAbove: number[], missing: Record<number, Array<[student: number, cell: string, remark: string]>>): Array<Array<string | number>> {
  const rand = mulberry32(seed);
  const ability = Array.from({ length: SAMPLE_CLASS }, () => rand() + rand() + rand());
  const marks: Array<Array<number | string>> = Array.from({ length: SAMPLE_CLASS }, () => []);
  const remarks = Array.from({ length: SAMPLE_CLASS }, () => "");
  atOrAbove.forEach((target, k) => {
    const gaps = new Map((missing[k] ?? []).map(([s, cell, remark]) => [s, { cell, remark }]));
    const order = ability.map((a, s) => ({ s, score: a + (rand() - 0.5) * 0.6 })).filter((x) => !gaps.has(x.s)).sort((x, y) => y.score - x.score);
    const below = order.length - target;
    order.forEach(({ s }, r) => {
      const mark = r < target
        ? Math.min(92, Math.max(55, Math.round(92 - (target > 1 ? r / (target - 1) : 0) * 37 + (rand() * 4 - 2))))
        : Math.min(54, Math.max(26, Math.round(54 - (below > 1 ? (r - target) / (below - 1) : 0) * 28 + (rand() * 3 - 1.5))));
      marks[s][k] = mark;
    });
    for (const [s, { cell, remark }] of gaps) { marks[s][k] = cell; if (remark) remarks[s] = remark; }
  });
  return marks.map((m, s) => ["A" + (idBase + s * 7 + (s % 3)), ...m, remarks[s]]);
}

/** This term's file: CLO1 31, CLO2 29 (the plan's example line), CLO3 22 of the 35 with a mark, CLO4 17 (below the KPI)
 *  and CLO5 24 of 38 at 55 or above. */
export const RESULTS_NOW: SampleResultsFile = {
  fileName: "results.xlsx", sheetName: "CS310 results 2025 S1", term: "2026/2027 semester 1",
  rows: build(310_2026, 26001, [31, 29, 22, 17, 24], { 2: [[6, "", "medical leave"], [19, "ABS", "absent from the critique"], [30, "", ""]] }),
};

/** Last term's file, on version CS310-v1: CLO1 28, CLO2 27, CLO3 24, CLO4 15 and CLO5 21 of 38 at 55 or above. */
export const RESULTS_PRIOR: SampleResultsFile = {
  fileName: "results-prior.xlsx", sheetName: "CS310 results 2025/2026 semester 2", term: "2025/2026 semester 2",
  rows: build(310_2025, 25001, [28, 27, 24, 15, 21], {}),
};
