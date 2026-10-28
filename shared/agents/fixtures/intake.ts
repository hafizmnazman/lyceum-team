// Intake agent fixture (spec Section 3, Section 10). The lecturer drops this
// term's CS220 results; the agent files them as a ResultUpload onto CS220's
// outcome (CLO4). meanScore is 0..1 mastery. The value (0.57) lands just under
// the prediction the approved change records (0.58), so the closed loop reads as
// "prediction held" when this is scored next term.

import type { ResultUpload } from "../../types.ts";

export const INTAKE_FIXTURE_ROWS: ResultUpload["rows"] = [
  { cloId: "CLO4", meanScore: 0.57, sd: 0.21, n: 196 },
];
