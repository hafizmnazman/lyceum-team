// What the Learn step can say for Amsterdam (plan Section 9.8): attainment per
// outcome from a filed results file, as filed. Descriptive only: no interval,
// no pooling, no perception gap and no prediction score (Track B).

import type { CLO, ResultUpload } from "../types.ts";

/** The Track A sentence, shown on the Learn screen and in the deck. */
export const LEARN_CLAIM = "No learning gain is claimed; the benchmark has not been run.";

export interface AttainmentRow { cloId: string; clo: CLO | undefined; meanScore: number; sd: number; n: number }

/** Attainment per outcome in one results file: the mean as filed (0 to 1), its spread, and n of N, where
 *  N is the most students the file records for any one outcome, since a file does not state the class size. */
export function attainment(upload: ResultUpload, clos: CLO[]): { N: number; rows: AttainmentRow[] } {
  const N = Math.max(0, ...upload.rows.map((r) => r.n));
  return { N, rows: upload.rows.map((r) => ({ cloId: r.cloId, clo: clos.find((c) => c.id === r.cloId), meanScore: r.meanScore, sd: r.sd, n: r.n })) };
}
