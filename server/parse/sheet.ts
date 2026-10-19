// xlsx / csv extraction (server side): SheetJS into the agent-agnostic
// ParsedDoc shape. Every sheet becomes a table of string cells.

import * as XLSX from "xlsx";
import type { ParsedDoc } from "../../src/types.ts";

export function parseSheet(buf: Buffer, fileName: string, kind: "xlsx" | "csv"): ParsedDoc {
  const wb = XLSX.read(buf, { type: "buffer", raw: false });
  const tables = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as unknown as string[][];
    return { name, rows: rows.map((r) => r.map((c) => String(c ?? ""))) };
  });
  return { fileName, kind, pages: [], tables };
}
