// What the Learn step can say for Amsterdam (plan Section 9.8): attainment per
// outcome from a filed results file, as filed. The share at a stated pass mark,
// its interval and the survey beside it are in attainment.ts (depth plan
// Section 8); pooling, frozen predictions and comment themes stay planned.

import type { CLO, ResultUpload } from "../types.ts";

/** The Track A sentence, shown on the Learn screen and in the deck. */
export const LEARN_CLAIM = "No learning gain is claimed; the benchmark has not been run.";

export interface AttainmentRow { cloId: string; clo: CLO | undefined; meanScore: number; sd: number; n: number }

/** Attainment per outcome in one results file: the mean as filed (0 to 1), its spread, and n of N, where N is the
 *  students the file lists (depth plan Section 8.1). A file that keeps no missing count (an older backup, an aggregated
 *  sheet) does not state its class size, so N falls back to the most students it records for any one outcome. */
export function attainment(upload: ResultUpload, clos: CLO[]): { N: number; rows: AttainmentRow[] } {
  const N = Math.max(0, ...upload.rows.map((r) => r.n + (r.missing ?? 0)));
  return { N, rows: upload.rows.map((r) => ({ cloId: r.cloId, clo: clos.find((c) => c.id === r.cloId), meanScore: r.meanScore, sd: r.sd, n: r.n })) };
}
