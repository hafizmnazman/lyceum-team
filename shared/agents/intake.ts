// Intake agent (spec Section 3). A lecturer's upload -> filed ResultUpload rows.
// LLM-backed in live mode (it reads a messy spreadsheet and maps columns onto
// CLOs); in fixture mode it returns the canned filing for the demo. The demo
// never parses a real binary, so it is offline and reproducible.

import type { ResultUpload, SubjectId } from "../types.ts";
import type { AgentMode } from "./mode.ts";
import { DEFAULT_MODE, liveNotImplemented } from "./mode.ts";
import { INTAKE_FIXTURE_ROWS } from "./fixtures/intake.ts";

/** A parsed spreadsheet: header row plus data rows. The live Intake agent maps
 *  these columns onto CLOs; the fixture ignores the content. */
export interface ParsedSheet {
  fileName: string;
  headers: string[];
  rows: Array<Record<string, string | number>>;
}

export interface IntakeContext {
  uploadedBy: string;
  term: string;
  /** Fixed timestamp so the demo files identically every run. */
  filedAt: string;
  /** Stable id so re-runs do not accumulate distinct uploads. */
  uploadId?: string;
}

export function runIntake(
  file: ParsedSheet,
  subjectId: SubjectId,
  ctx: IntakeContext,
  mode: AgentMode = DEFAULT_MODE,
): ResultUpload {
  if (mode !== "fixture") return liveNotImplemented("Intake agent");
  if (file.rows.length === 0) {
    throw new Error(`Intake: the uploaded sheet "${file.fileName}" has no rows to file.`);
  }
  return {
    id: ctx.uploadId ?? `RU-${subjectId}-${ctx.term}`,
    subjectId,
    uploadedBy: ctx.uploadedBy,
    term: ctx.term,
    rows: INTAKE_FIXTURE_ROWS,
    filedAt: ctx.filedAt,
  };
}
