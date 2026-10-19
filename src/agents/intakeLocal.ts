// The local Intake interpreter: deterministic heuristics over a ParsedDoc.
// This is the offline path (and the fallback when the LLM is unreachable), and
// it is a real interpreter, not a canned fixture: any results sheet with
// CLO-shaped columns files correctly without a network. The live LLM path
// handles messier files and writes better notes; the shape of the answer is
// identical, so the app works the same either way.

import type {
  CLO,
  IntakeInterpretation,
  ParsedDoc,
  Subject,
  SurveyRecord,
} from "../types.ts";

const TERM_RE = /20\d{2}\s*[-/ ]\s*S(?:em(?:ester)?)?\s*([12])/i;

function guessTerm(text: string): string | undefined {
  const m = text.match(TERM_RE);
  if (!m) return undefined;
  const year = m[0].match(/20\d{2}/)?.[0];
  return year ? `${year}-S${m[1]}` : undefined;
}

function guessSubject(text: string, subjects: Subject[]): Subject | undefined {
  const upper = text.toUpperCase();
  // Prefer the longest code that appears (CS220 beats CS2).
  let best: Subject | undefined;
  for (const s of subjects) {
    if (upper.includes(s.id.toUpperCase())) {
      if (!best || s.id.length > best.id.length) best = s;
    }
  }
  if (best) return best;
  for (const s of subjects) {
    if (upper.includes(s.title.toUpperCase())) return s;
  }
  return undefined;
}

function toNumber(v: string): number | null {
  const n = Number(String(v).replace(/[%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Normalise a score into 0..1: percentages and marks-out-of-100 divide down. */
function normaliseScore(n: number): number {
  if (n > 1.5) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

export function interpretLocally(
  doc: ParsedDoc,
  subjects: Subject[],
  clos: CLO[],
): IntakeInterpretation {
  const notes: string[] = [];
  // The term and subject can hide anywhere: the file name, a sheet name, a
  // comment line above the header, or the page text.
  const allText = [
    doc.fileName,
    ...doc.tables.map((t) => t.name),
    ...doc.tables.flatMap((t) => t.rows.slice(0, 2).map((r) => r.join(" "))),
    ...doc.pages.map((p) => p.text),
  ].join("\n");
  const subject = guessSubject(allText, subjects);
  const term = guessTerm(allText);

  // ---- results / survey tables ----
  for (const table of doc.tables) {
    if (table.rows.length < 2) continue;
    // Real exports often carry a comment or title line above the header row:
    // scan the first few rows for the one that contains CLO-shaped columns.
    let headerIdx = 0;
    for (let i = 0; i < Math.min(3, table.rows.length - 1); i += 1) {
      if (table.rows[i].some((c) => /clo\s*[- ]?\d+/i.test(c))) {
        headerIdx = i;
        break;
      }
    }
    const headerRow = table.rows[headerIdx];
    const dataRows = table.rows.slice(headerIdx + 1);
    const headers = headerRow.map((h) => h.trim().toLowerCase());
    const cloCols: Array<{ col: number; cloId: string }> = [];
    for (let c = 0; c < headers.length; c += 1) {
      const m = headers[c].match(/clo\s*[- ]?(\d+)/i);
      if (m) {
        const cloId = `CLO${m[1]}`;
        if (clos.some((x) => x.id === cloId)) cloCols.push({ col: c, cloId });
        else {
          // A subject-scoped CLO like "CS900-CLO1".
          const scoped = clos.find((x) => headers[c].toUpperCase().includes(x.id.toUpperCase()));
          if (scoped) cloCols.push({ col: c, cloId: scoped.id });
        }
      }
    }
    if (cloCols.length === 0) continue;

    const looksLikeSurvey =
      headers.some((h) => h.includes("student") || h.includes("id")) &&
      dataRows.length > 10 &&
      dataRows
        .slice(0, 5)
        .every((r) => cloCols.every((cc) => {
          const n = toNumber(r[cc.col] ?? "");
          return n !== null && n >= 1 && n <= 10 && Number.isInteger(n);
        }));

    if (looksLikeSurvey) {
      // Per-student 1..10 self-ratings: a CLO mastery survey export.
      const idCol = headers.findIndex((h) => h.includes("student") || h === "id");
      const records: SurveyRecord[] = [];
      for (const row of dataRows) {
        const sid = idCol >= 0 ? row[idCol] : `S-${records.length + 1}`;
        const cloRatings: Record<string, number> = {};
        for (const cc of cloCols) {
          const n = toNumber(row[cc.col] ?? "");
          if (n !== null) cloRatings[cc.cloId] = n;
        }
        if (Object.keys(cloRatings).length > 0 && subject) {
          records.push({
            studentId: String(sid),
            subjectId: subject.id,
            term: term ?? "unknown-term",
            cloRatings,
          });
        }
      }
      if (records.length > 0) {
        notes.push(`Read ${records.length} per-student rows as 1..10 self-ratings.`);
        return {
          docType: "clo-survey",
          subjectGuess: subject?.id,
          termGuess: term,
          surveyRecords: records,
          confidence: subject ? 0.85 : 0.5,
          notes,
        };
      }
    }

    // Aggregated results: one row per CLO, or one summary row with CLO columns.
    const meanCol = headers.findIndex(
      (h) => h.includes("mean") || h.includes("avg") || h.includes("average") || h.includes("score"),
    );
    const sdCol = headers.findIndex((h) => h.includes("sd") || h.includes("std"));
    const nCol = headers.findIndex((h) => h === "n" || h.includes("count") || h.includes("students"));

    const rows: NonNullable<IntakeInterpretation["mappedRows"]> = [];
    const rowPerClo =
      headers.some((h) => /clo/i.test(h)) &&
      meanCol >= 0 &&
      dataRows.some((r) => /clo\s*[- ]?\d+/i.test(r.join(" ")));

    if (rowPerClo) {
      // Shape A: a "CLO" column plus mean/sd/n columns.
      const cloCol = headers.findIndex((h) => /clo/i.test(h));
      for (const row of dataRows) {
        const m = String(row[cloCol] ?? "").match(/clo\s*[- ]?(\d+)/i);
        if (!m) continue;
        const cloId = `CLO${m[1]}`;
        if (!clos.some((x) => x.id === cloId)) continue;
        const mean = toNumber(row[meanCol] ?? "");
        if (mean === null) continue;
        rows.push({
          cloId,
          meanScore: normaliseScore(mean),
          sd: sdCol >= 0 ? (toNumber(row[sdCol] ?? "") ?? 0.1) : 0.1,
          n: nCol >= 0 ? (toNumber(row[nCol] ?? "") ?? 0) : 0,
        });
      }
      if (rows.length > 0) notes.push(`Read one row per CLO; column "${headerRow[meanCol]}" as the mean.`);
    } else {
      // Shape B: CLO columns; average the data rows per column.
      for (const cc of cloCols) {
        const values = dataRows
          .map((r) => toNumber(r[cc.col] ?? ""))
          .filter((n): n is number => n !== null)
          .map(normaliseScore);
        if (values.length === 0) continue;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
        rows.push({ cloId: cc.cloId, meanScore: mean, sd, n: values.length });
      }
      if (rows.length > 0)
        notes.push(`Averaged ${dataRows.length} data rows per CLO column into means.`);
    }

    if (rows.length > 0) {
      if (!term) notes.push("No term found in the file; defaulting to the current term.");
      if (!subject) notes.push("No subject code found; pick the subject before filing.");
      return {
        docType: "results",
        subjectGuess: subject?.id,
        termGuess: term,
        mappedRows: rows,
        confidence: subject && term ? 0.9 : subject ? 0.7 : 0.4,
        notes,
      };
    }
  }

  // ---- documents (syllabus / slides) ----
  if (doc.pages.length > 0) {
    const first = doc.pages[0].text;
    const isSyllabus = /syllabus|course\s+outline|learning\s+outcome/i.test(allText);
    const isSlides = doc.kind === "pptx" || doc.pages.length > 2;
    if (isSyllabus || isSlides) {
      notes.push(`Read ${doc.pages.length} page${doc.pages.length === 1 ? "" : "s"} of text.`);
      if (!subject) notes.push("No subject code found; pick the subject before filing.");
      return {
        docType: isSyllabus ? "syllabus" : "slides",
        subjectGuess: subject?.id,
        termGuess: term,
        contentSummary: first.slice(0, 400),
        confidence: subject ? (isSyllabus ? 0.85 : 0.75) : 0.45,
        notes,
      };
    }
  }

  return {
    docType: "unknown",
    subjectGuess: subject?.id,
    termGuess: term,
    confidence: 0.2,
    notes: ["Could not find CLO-shaped tables or recognisable document structure."],
  };
}
