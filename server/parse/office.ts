// pptx / docx extraction (server side). Both formats are zipped XML; JSZip plus
// a small text-run walk covers them without a heavyweight dependency.
//  - pptx: ppt/slides/slideN.xml, text runs in <a:t> elements, one page per slide
//  - docx: word/document.xml, text runs in <w:t>, paragraphs on <w:p>

import JSZip from "jszip";
import type { ParsedDoc } from "../../src/types.ts";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function textRuns(xml: string, tag: "a:t" | "w:t"): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(decodeEntities(m[1]));
  return out;
}

export async function parsePptx(buf: Buffer, fileName: string): Promise<ParsedDoc> {
  const zip = await JSZip.loadAsync(buf);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });
  const pages: ParsedDoc["pages"] = [];
  for (let i = 0; i < slideNames.length; i += 1) {
    const xml = await zip.files[slideNames[i]].async("string");
    pages.push({ index: i, text: textRuns(xml, "a:t").join("\n").trim() });
  }
  return { fileName, kind: "pptx", pages, tables: [] };
}

export async function parseDocx(buf: Buffer, fileName: string): Promise<ParsedDoc> {
  const zip = await JSZip.loadAsync(buf);
  const doc = zip.files["word/document.xml"];
  if (!doc) return { fileName, kind: "docx", pages: [], tables: [] };
  const xml = await doc.async("string");
  // Paragraph boundaries keep the text readable for the interpreter.
  const paragraphs = xml
    .split(/<\/w:p>/)
    .map((p) => textRuns(p, "w:t").join(""))
    .filter((t) => t.trim().length > 0);
  return {
    fileName,
    kind: "docx",
    pages: [{ index: 0, text: paragraphs.join("\n").trim() }],
    tables: [],
  };
}
