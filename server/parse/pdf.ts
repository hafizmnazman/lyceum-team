// pdf extraction (server side): unpdf (pdf.js under the hood, serverless
// friendly) into per-page text.

import { extractText, getDocumentProxy } from "unpdf";
import type { ParsedDoc } from "../../src/types.ts";

export async function parsePdf(buf: Buffer, fileName: string): Promise<ParsedDoc> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  const pageTexts: string[] = Array.isArray(text) ? text : [String(text)];
  return {
    fileName,
    kind: "pdf",
    pages: pageTexts.map((t, i) => ({ index: i, text: t.trim() })),
    tables: [],
  };
}
