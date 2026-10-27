// The teaching pack on screen (depth plan Section 5.3): each slide drawn as SVG at a 960 by 540 viewBox from the same layout
// rules the PowerPoint renderer uses (lib/deckLayout.ts), for a session card's thumbnail and the filmstrip behind "Preview the
// pack". It is a preview and not pixel-identical, so the filmstrip says once that PowerPoint draws the file. Colours are the
// token variables; the mark is the institution's own PNG, never redrawn.

import { useEffect, useState } from "react";
import { previewSlides, type PreviewSlide } from "../../lib/deckLayout.ts";
import type { DeckSpec } from "../../lib/slides.ts";

const PX = 96;
const TONE: Record<PreviewSlide["texts"][number]["tone"], string> = {
  title: "var(--forest)", body: "var(--ink)", muted: "var(--ink-2)", "on-forest": "var(--on-forest)", "on-forest-title": "var(--white)",
};
const px = (inches: number) => Math.round(inches * PX * 10) / 10;

/** A region to outline on a slide: one of its parts, or the whole slide when it was added or removed. */
export type SlideHighlight = keyof PreviewSlide["regions"] | "whole";

export function SlideSvg({ slide, number, markSrc, highlight = [] }: { slide: PreviewSlide; number: number; markSrc?: string; highlight?: SlideHighlight[] }) {
  const forest = slide.master === "TITLE" || slide.master === "CLOSING";
  const background = forest ? "var(--forest)" : slide.master === "SECTION" ? "var(--tint-1)" : "var(--white)";
  const f = slide.figure;
  // A comparison's outlines: lime on the forest masters, emerald on the light ones (the audit's rule for each surface).
  const outlines = highlight.map((h) => (h === "whole" ? { x: 0.06, y: 0.06, w: 9.88, h: 5.5 } : slide.regions[h])).filter((b): b is NonNullable<typeof b> => Boolean(b));
  return (
    <svg viewBox="0 0 960 540" className="slide-svg" role="img" aria-label={"Slide " + number + ": " + slide.title + (outlines.length ? ", with the changed parts outlined" : "")}>
      <rect width="960" height="540" fill={background} />
      {slide.plate ? <rect x={px(slide.plate.x)} y={px(slide.plate.y)} width={px(slide.plate.w)} height={px(slide.plate.h)} fill="var(--white)" /> : null}
      {slide.mark && markSrc ? <image href={markSrc} x={px(slide.mark.x)} y={px(slide.mark.y)} width={px(slide.mark.w)} height={px(slide.mark.h)} preserveAspectRatio="xMidYMid meet" /> : null}
      {f ? (f.table
        ? <g>{f.table.map((row, r) => <g key={r}>
            <rect x={px(f.box.x)} y={px(f.box.y) + r * 30} width={px(f.box.w)} height={30} fill={r === 0 ? "var(--tint-2)" : "var(--white)"} stroke="var(--border)" />
            {row.map((cell, c) => <text key={c} x={px(f.box.x) + 8 + c * (px(f.box.w) / row.length)} y={px(f.box.y) + r * 30 + 20} fontSize={16} fill="var(--ink)" fontWeight={r === 0 ? 700 : 400} className="slide-svg-text">{cell.length > 46 / row.length * 2 ? cell.slice(0, Math.floor(46 / row.length * 2) - 3) + "..." : cell}</text>)}
          </g>)}</g>
        : <g><rect x={px(f.box.x)} y={px(f.box.y)} width={px(f.box.w)} height={px(f.box.h)} fill="var(--tint-1)" stroke="var(--border)" strokeDasharray="8 6" />
            <text x={px(f.box.x + f.box.w / 2)} y={px(f.box.y + f.box.h / 2)} textAnchor="middle" fontSize={20} fill="var(--ink-2)" className="slide-svg-text">{f.label.length > 70 ? f.label.slice(0, 67) + "..." : f.label}</text></g>) : null}
      {slide.texts.map((t, i) => {
        const size = (t.pt * 96) / 72;
        return <text key={i} x={px(t.box.x)} y={px(t.box.y)} fontSize={size} fill={TONE[t.tone]} fontWeight={t.bold ? 700 : 400} className="slide-svg-text">
          {t.lines.map((line, j) => <tspan key={j} x={px(t.box.x)} dy={j === 0 ? size : size * 1.25}>{line}</tspan>)}
        </text>;
      })}
      {outlines.map((b, i) => <rect key={"o" + i} className="slide-outline" x={px(b.x) - 6} y={px(b.y) - 6} width={px(b.w) + 12} height={px(b.h) + 12} rx={8}
        fill="none" stroke={forest ? "var(--lime)" : "var(--emerald)"} strokeWidth={6} strokeDasharray="16 8" />)}
    </svg>
  );
}

/** One slide of a pack, small: the session card's thumbnail. */
export function DeckThumb({ spec, markSrc, index = 0 }: { spec: DeckSpec; markSrc?: string; index?: number }) {
  const slides = previewSlides(spec);
  const slide = slides[Math.min(index, slides.length - 1)];
  return slide ? <div className="deck-thumb" data-demo-id="deck-thumb"><SlideSvg slide={slide} number={Math.min(index, slides.length - 1) + 1} markSrc={markSrc} /></div> : null;
}

/** Every slide of a pack in order, with its number: the filmstrip behind "Preview the pack". */
export function DeckFilmstrip({ spec, markSrc }: { spec: DeckSpec; markSrc?: string }) {
  const slides = previewSlides(spec);
  return <div className="deck-filmstrip" data-demo-id="deck-filmstrip">
    <p className="muted">A preview: PowerPoint draws the file, so line breaks and sizes may differ slightly. {slides.length} slides.</p>
    <ol>{slides.map((slide, i) => <li key={i}><SlideSvg slide={slide} number={i + 1} markSrc={markSrc} /><span className="deck-filmstrip-num tabular">{i + 1}</span></li>)}</ol>
  </div>;
}

/** The institution's wide mark as base64, loaded once, for the pack's masters; null until it arrives or when it cannot. */
let cached: { path: string; data: Promise<string | null> } | null = null;
export function useMarkData(path: string | null): string | null {
  const [data, setData] = useState<string | null>(null);
  useEffect(() => {
    if (!path || typeof fetch === "undefined") { setData(null); return; }
    if (!cached || cached.path !== path) cached = { path, data: fetch(path).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((buf) => {
      let binary = ""; const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    }).catch(() => null) };
    let live = true;
    void cached.data.then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, [path]);
  return data;
}
