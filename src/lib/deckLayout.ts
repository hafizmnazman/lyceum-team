// One set of layout rules for the teaching pack (depth plan Sections 5.2 and 5.3): the PowerPoint renderer places every
// object by these boxes, and the on-screen preview draws the same boxes as SVG, so the preview lists the same slides in
// the same places. Units are inches on the 16:9 slide (10 by 5.625); the preview multiplies by 96 for its 960 by 540
// viewBox. The preview is not pixel-identical: PowerPoint draws the file.

import type { DeckSlide, DeckSpec, DeckMaster } from "./slides.ts";

export const SLIDE_W = 10, SLIDE_H = 5.625;
export interface Box { x: number; y: number; w: number; h: number }
export const BODY_PT = 18; // body text is 18 pt or larger (Microsoft's guidance in the research note)

/** Where each master puts its parts. */
export const LAYOUT = {
  markPlate: { x: 7.55, y: 0.32, w: 2.1, h: 0.96 } as Box, // a white plate on forest masters
  markOnPlate: { x: 7.7, y: 0.42, w: 1.8, h: 0.76 } as Box,
  markCorner: { x: 8.05, y: 0.32, w: 1.6, h: 0.68 } as Box, // top right on white masters
  footer: { x: 0.5, y: 5.08, w: 8.3, h: 0.42 } as Box,
  slideNumber: { x: 9.05, y: 5.12, w: 0.6, h: 0.3 } as Box,
  title: { x: 0.5, y: 0.3, w: 7.35, h: 0.8 } as Box,
  titleWide: { x: 0.5, y: 0.3, w: 9.0, h: 0.8 } as Box,
  coverTitle: { x: 0.6, y: 1.45, w: 8.8, h: 1.45 } as Box,
  coverBody: { x: 0.6, y: 3.0, w: 8.8, h: 1.65 } as Box,
  sectionTitle: { x: 0.8, y: 1.7, w: 8.4, h: 1.2 } as Box,
  sectionBody: { x: 0.8, y: 3.0, w: 8.4, h: 1.6 } as Box,
  body: { x: 0.5, y: 1.25, w: 9.0, h: 3.65 } as Box,
  bodyAboveFigure: { x: 0.5, y: 1.2, w: 9.0, h: 1.35 } as Box,
  figure: { x: 0.5, y: 2.65, w: 9.0, h: 2.3 } as Box,
  left: { x: 0.5, y: 1.25, w: 4.35, h: 3.65 } as Box,
  right: { x: 5.15, y: 1.25, w: 4.35, h: 3.65 } as Box,
};

export function masterOf(slide: DeckSlide): DeckMaster {
  return slide.master ?? (slide.kind === "title" ? "TITLE" : "CONTENT");
}
export const isForest = (m: DeckMaster) => m === "TITLE" || m === "CLOSING";

/** Words wrapped to lines that fit a box at a size, cut with dots past its height: the preview's estimate of the
 *  wrapping PowerPoint does (Calibri runs about half its point size wide per character). */
export function wrap(text: string, box: Box, pt: number, lineGap = 1.25): string[] {
  const perLine = Math.max(8, Math.floor((box.w * 72) / (pt * 0.5)));
  const maxLines = Math.max(1, Math.floor((box.h * 72) / (pt * lineGap)));
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if ((line + " " + word).trim().length > perLine) { lines.push(line); line = word; } else line = (line + " " + word).trim();
    }
    lines.push(line);
  }
  return lines.length > maxLines ? [...lines.slice(0, maxLines - 1), lines[maxLines - 1].slice(0, Math.max(0, perLine - 3)) + "..."] : lines;
}

export interface PreviewText { box: Box; pt: number; lines: string[]; bold?: boolean; tone: "title" | "body" | "muted" | "on-forest" | "on-forest-title" }
/** Where a slide's parts sit, so a comparison can outline the part that changed (lib/diff.ts deckDiff names the parts). */
export type SlideRegions = Partial<Record<"title" | "body" | "right" | "figure", Box>>;
export interface PreviewSlide { master: DeckMaster; title: string; texts: PreviewText[]; figure: { box: Box; label: string; table?: string[][] } | null; mark: Box | null; plate: Box | null; regions: SlideRegions }

/** The boxes and lines of each slide, as the renderer places them. */
export function previewSlides(spec: DeckSpec): PreviewSlide[] {
  const brand = spec.brand;
  return spec.slides.map((slide, index) => {
    const master = masterOf(slide), forest = isForest(master);
    const texts: PreviewText[] = [];
    const regions: SlideRegions = {};
    const bullets =(items: string[] | undefined) => (items ?? []).map((b) => (b.startsWith("  ") ? "    " + b.trim() : "• " + b)).join("\n");
    const body = [...(slide.paragraphs ?? []), bullets(slide.bullets)].filter(Boolean).join("\n");
    if (master === "TITLE") {
      texts.push({ box: LAYOUT.coverTitle, pt: 34, lines: wrap(slide.title, LAYOUT.coverTitle, 34, 1.15), bold: true, tone: "on-forest-title" });
      texts.push({ box: LAYOUT.coverBody, pt: 18, lines: wrap([slide.subtitle, ...(slide.paragraphs ?? [])].filter(Boolean).join("\n"), LAYOUT.coverBody, 18), tone: "on-forest" });
      Object.assign(regions, { title: LAYOUT.coverTitle, body: LAYOUT.coverBody });
    } else if (master === "SECTION") {
      texts.push({ box: LAYOUT.sectionTitle, pt: 32, lines: wrap(slide.title, LAYOUT.sectionTitle, 32, 1.15), bold: true, tone: "title" });
      texts.push({ box: LAYOUT.sectionBody, pt: BODY_PT, lines: wrap(body, LAYOUT.sectionBody, BODY_PT), tone: "body" });
      Object.assign(regions, { title: LAYOUT.sectionTitle, body: LAYOUT.sectionBody });
    } else if (master === "CLOSING") {
      texts.push({ box: LAYOUT.title, pt: 28, lines: wrap(slide.title, LAYOUT.title, 28, 1.1), bold: true, tone: "on-forest-title" });
      texts.push({ box: LAYOUT.body, pt: BODY_PT, lines: wrap(body, LAYOUT.body, BODY_PT), tone: "on-forest" });
      Object.assign(regions, { title: LAYOUT.title, body: LAYOUT.body });
    } else {
      const titleBox = brand?.mark ? LAYOUT.title : LAYOUT.titleWide;
      texts.push({ box: titleBox, pt: 28, lines: wrap(slide.title, titleBox, 28, 1.1), bold: true, tone: "title" });
      regions.title = titleBox;
      if (master === "TWO_COLUMN") {
        texts.push({ box: LAYOUT.left, pt: BODY_PT, lines: wrap(bullets(slide.bullets), LAYOUT.left, BODY_PT), tone: "body" });
        texts.push({ box: LAYOUT.right, pt: BODY_PT, lines: wrap(bullets(slide.right), LAYOUT.right, BODY_PT), tone: "body" });
        Object.assign(regions, { body: LAYOUT.left, right: LAYOUT.right });
      } else {
        const hasFigure = Boolean(slide.table || slide.placeholder || slide.chart);
        const box = hasFigure ? LAYOUT.bodyAboveFigure : LAYOUT.body;
        texts.push({ box, pt: BODY_PT, lines: wrap(body, box, BODY_PT), tone: "body" });
        regions.body = box;
      }
    }
    if (master !== "TITLE" && brand) texts.push({ box: LAYOUT.footer, pt: 9, lines: wrap(footerText(spec), LAYOUT.footer, 9, 1.15), tone: forest ? "on-forest" : "muted" });
    texts.push({ box: LAYOUT.slideNumber, pt: 9, lines: master === "TITLE" ? [] : [String(index + 1)], tone: forest ? "on-forest" : "muted" });
    const figure = slide.table ? { box: LAYOUT.figure, label: slide.alt ?? "A table", table: [slide.table.header, ...slide.table.rows] }
      : slide.placeholder ? { box: LAYOUT.figure, label: slide.placeholder }
      : slide.chart ? { box: LAYOUT.figure, label: slide.alt ?? slide.chart.caption } : null;
    const mark = brand?.mark ? (forest ? LAYOUT.markOnPlate : LAYOUT.markCorner) : null;
    if (figure) regions.figure = figure.box;
    return { master, title: slide.title, texts, figure, mark, plate: brand?.mark && forest ? LAYOUT.markPlate : null, regions };
  });
}

/** The footer every content slide carries: the course and week, then the brand's line (the demo line on the sample course). */
export function footerText(spec: DeckSpec): string {
  return spec.brand ? spec.brand.lead + " · " + spec.brand.footer : spec.footer;
}
