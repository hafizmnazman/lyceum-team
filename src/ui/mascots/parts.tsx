// The shape family the eight characters share (plan Section 7.1): rounded
// bodies, big simple eyes with a white catchlight, a line for a mouth, detached
// rounded feet, flat two-tone fills (light top-left, dark bottom-right) and
// forest ink outlines at one stroke weight. Colours come from the theme tokens
// as values, so the same SVG renders in the app, in Puppeteer and in Remotion.

import { useId, type ReactNode } from "react";
import { color } from "../../theme/tokens.ts";

export const INK = color.forest;
export const STROKE = 5;
export type HelperPose = "resting" | "working" | "waiting" | "done";
export type HostPose = "greeting" | "resting" | "celebrating" | "reflecting";
/** The surface a character stands on: its ground shadow is chosen to suit it (none on forest). */
export type Surface = "light" | "moods" | "forest";
/** Extra detail at large sizes; the host is drawn with two extra size classes (Section 7.1). */
export type Detail = "base" | "hero" | "poster";
export const detailFor = (size: number): Detail => (size >= 512 ? "poster" : size >= 160 ? "hero" : "base");

export interface CharacterProps { size?: number; surface?: Surface; detail?: Detail; title?: string }

/** A stable id for clip paths, safe inside url(#...). */
export function useSvgId(prefix: string): string {
  return prefix + "-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

/** The frame: a 200 by 200 drawing, hidden from assistive technology (the name sits in the adjacent label). */
export function Frame(props: { size: number; who: string; pose: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 200 200" width={props.size} height={props.size} aria-hidden="true" focusable="false"
      className="mascot-svg" data-character={props.who} data-pose={props.pose}>
      {props.children}
    </svg>
  );
}

export function Ground({ surface = "light", rx = 56 }: { surface?: Surface; rx?: number }) {
  if (surface === "forest") return null;
  return <ellipse cx={100} cy={191} rx={rx} ry={6} fill={surface === "moods" ? color.shadowMascotMoods : color.shadowMascot} />;
}

/** A body in two tones: the light colour, with the dark side as a rim on the bottom right (the body minus
 *  itself shifted up and left), then the ink outline. The mask works in luminance only. */
export function TwoTone(props: { d: string; light: string; dark: string; id: string; shift?: [number, number] }) {
  const [dx, dy] = props.shift ?? [-13, -11];
  return (
    <g>
      <mask id={props.id} maskUnits="userSpaceOnUse" x={-20} y={-20} width={240} height={240}>
        <rect x={-20} y={-20} width={240} height={240} fill="white" />
        <path d={props.d} transform={"translate(" + dx + " " + dy + ")"} fill="black" />
      </mask>
      <path d={props.d} fill={props.light} />
      <path d={props.d} fill={props.dark} mask={"url(#" + props.id + ")"} />
      <path d={props.d} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
    </g>
  );
}

/** The soft top-left highlight of the flat two-tone look. */
export function Highlight(props: { cx: number; cy: number; rx: number; ry: number; rotate?: number }) {
  return <ellipse cx={props.cx} cy={props.cy} rx={props.rx} ry={props.ry} fill={color.white} opacity={0.32}
    transform={props.rotate ? "rotate(" + props.rotate + " " + props.cx + " " + props.cy + ")" : undefined} />;
}

export type EyeLook = "open" | "focus" | "side" | "happy" | "closed";
export const eyesFor = (pose: HelperPose | HostPose): EyeLook =>
  pose === "working" ? "focus" : pose === "waiting" ? "side" : pose === "done" || pose === "greeting" || pose === "celebrating" ? "happy" : pose === "reflecting" ? "closed" : "open";

/** Big simple eyes with a white catchlight; happy and closed eyes are ink arcs. */
export function Eyes({ x1, x2, y, look }: { x1: number; x2: number; y: number; look: EyeLook }) {
  if (look === "happy" || look === "closed") {
    const arc = (x: number) => look === "happy" ? "M" + (x - 9) + " " + (y + 3) + " Q" + x + " " + (y - 10) + " " + (x + 9) + " " + (y + 3) : "M" + (x - 8) + " " + y + " Q" + x + " " + (y + 7) + " " + (x + 8) + " " + y;
    return <g data-part="eyes" fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round"><path d={arc(x1)} /><path d={arc(x2)} /></g>;
  }
  const ry = look === "focus" ? 7.5 : 10.5;
  const shift = look === "side" ? 3.5 : 0;
  const eye = (x: number) => (
    <g key={x}>
      <ellipse cx={x + shift} cy={y} rx={8.5} ry={ry} fill={INK} />
      <circle cx={x + shift - 3} cy={y - (look === "focus" ? 2.5 : 4)} r={3.2} fill={color.white} />
      {look === "focus" ? null : <circle cx={x + shift + 2.6} cy={y + 4} r={1.4} fill={color.white} opacity={0.85} />}
    </g>
  );
  return <g data-part="eyes">{eye(x1)}{eye(x2)}</g>;
}

/** No mouth beyond a line: a small curve that widens a little when the record is saved. In the film a
 *  speaking character opens it with the loudness of its voice (open, 0 to 1); the app never passes it. */
export function Mouth({ x, y, pose, open = 0 }: { x: number; y: number; pose: HelperPose | HostPose; open?: number }) {
  if (open > 0.04) return <ellipse cx={x} cy={y + 2} rx={6 + open * 2} ry={1.6 + open * 6.5} fill={INK} />;
  const wide = pose === "done" || pose === "greeting" || pose === "celebrating";
  const flat = pose === "working";
  const d = flat ? "M" + (x - 6) + " " + y + " L" + (x + 6) + " " + y
    : wide ? "M" + (x - 9) + " " + (y - 1) + " Q" + x + " " + (y + 7) + " " + (x + 9) + " " + (y - 1)
    : "M" + (x - 6) + " " + y + " Q" + x + " " + (y + 3.5) + " " + (x + 6) + " " + y;
  return <path d={d} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
}

/** Detached rounded feet. */
export function Feet({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return <g><ellipse cx={x1} cy={y} rx={12} ry={6.5} fill={INK} /><ellipse cx={x2} cy={y} rx={12} ry={6.5} fill={INK} /></g>;
}

/** A small arm: an ink stub with the body colour inside, along a short path. */
export function Arm({ d, fill }: { d: string; fill: string }) {
  return <g><path d={d} fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" /><path d={d} fill="none" stroke={fill} strokeWidth={6} strokeLinecap="round" /></g>;
}

/** The glint beside a character whose record was just saved. */
export function Glint({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const p = (a: number, b: number) => (x + a * s) + " " + (y + b * s);
  return <path d={"M" + p(0, -12) + " L" + p(3, -3) + " L" + p(12, 0) + " L" + p(3, 3) + " L" + p(0, 12) + " L" + p(-3, 3) + " L" + p(-12, 0) + " L" + p(-3, -3) + " Z"}
    fill={color.white} stroke={INK} strokeWidth={3} strokeLinejoin="round" />;
}
