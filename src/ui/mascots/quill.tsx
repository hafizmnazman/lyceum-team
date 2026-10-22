// Quill, the course designer: a feather pen on a ruler rail, the hours and the
// rules a revision must fit. The nib (lime) lifts while a check runs and rests
// when a version is adopted; on a failed check the character steps aside and
// the error card speaks (no mascot is drawn for "stuck").

import { color } from "../../theme/tokens.ts";
import { Arm, Eyes, Feet, Frame, Glint, Ground, Highlight, INK, Mouth, TwoTone, detailFor, eyesFor, useSvgId, type CharacterProps, type HelperPose } from "./parts.tsx";

const VANE = "M100 34 C134 50 150 96 132 146 C126 160 114 168 100 170 C86 168 74 160 68 146 C50 96 66 50 100 34 Z";
const TILT: Record<HelperPose, string | undefined> = { resting: undefined, working: "rotate(-12 100 176)", waiting: "rotate(8 100 176)", done: undefined };

export function Quill({ pose = "resting", size = 96, surface = "light", detail }: CharacterProps & { pose?: HelperPose }) {
  const id = useSvgId("quill");
  return (
    <Frame size={size} who="quill" pose={pose}>
      <Ground surface={surface} rx={60} />
      {/* the ruler rail */}
      <g data-part="rail">
        <rect x={30} y={186} width={140} height={9} rx={3} fill={color.tint2} stroke={INK} strokeWidth={3} />
        {Array.from({ length: 13 }, (_, i) => <path key={i} d={"M" + (40 + i * 10) + " 186 V" + (i % 2 ? 189 : 191)} stroke={INK} strokeWidth={2} />)}
      </g>
      <Feet x1={76} x2={124} y={182} />
      <g transform={TILT[pose]}>
        <g data-part="arms">
          <Arm d="M70 112 Q58 118 54 132" fill={color.onForest} />
          <Arm d="M130 112 Q142 118 146 132" fill={color.onForest} />
        </g>
        <TwoTone id={id} d={VANE} light={color.onForest} dark={color.nextDashed} />
        <Highlight cx={82} cy={66} rx={12} ry={6} rotate={-40} />
        {(detail ?? detailFor(size)) !== "base" ? <g stroke={color.forestBorder} strokeWidth={3} strokeLinecap="round"><path d="M100 146 L84 136" /><path d="M100 156 L116 146" /><path d="M100 136 L118 126" /></g> : null}
        <path d="M100 136 V170" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <Eyes x1={86} x2={114} y={96} look={eyesFor(pose)} />
        <Mouth x={100} y={116} pose={pose} />
        {/* the nib */}
        <g data-part="prop">
          <path d="M92 166 L100 190 L108 166 Z" fill={color.lime} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M100 172 V182" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        </g>
      </g>
      {pose === "done" ? <Glint x={158} y={48} /> : null}
    </Frame>
  );
}
