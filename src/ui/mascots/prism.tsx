// Prism, the teaching-material creator: a triangular prism that splits light
// into the three rays (the ray tokens; Prism carries no lime). The rays fan out
// while a pack really renders.

import { color } from "../../theme/tokens.ts";
import { Arm, Eyes, Feet, Frame, Glint, Ground, Highlight, INK, Mouth, TwoTone, detailFor, eyesFor, useSvgId, type CharacterProps, type HelperPose } from "./parts.tsx";

const BODY = "M92 48 Q100 34 108 48 L158 146 Q166 162 148 162 L52 162 Q34 162 42 146 Z";
const RAYS: Record<HelperPose, Array<[number, number]>> = {
  resting: [[170, 114], [174, 128], [170, 142]],
  working: [[192, 92], [196, 128], [192, 164]],
  waiting: [[190, 120], [192, 128], [190, 136]],
  done: [[184, 102], [188, 128], [184, 154]],
};
const RAY_COLOURS = [color.ray1, color.ray2, color.ray3];

export function Prism({ pose = "resting", size = 96, surface = "light", detail }: CharacterProps & { pose?: HelperPose }) {
  const id = useSvgId("prism");
  const level = detail ?? detailFor(size);
  return (
    <Frame size={size} who="prism" pose={pose}>
      <Ground surface={surface} rx={56} />
      {/* the light coming in, and the three rays going out */}
      {level !== "base" ? <g><path d="M10 108 L62 122" stroke={INK} strokeWidth={10} strokeLinecap="round" /><path d="M10 108 L62 122" stroke={color.white} strokeWidth={5} strokeLinecap="round" /></g> : null}
      <g data-part="prop">
        {RAYS[pose].map(([x, y], i) => <g key={i}><path d={"M140 128 L" + x + " " + y} stroke={INK} strokeWidth={13} strokeLinecap="round" /><path d={"M140 128 L" + x + " " + y} stroke={RAY_COLOURS[i]} strokeWidth={8} strokeLinecap="round" /></g>)}
      </g>
      <Feet x1={76} x2={124} y={182} />
      <g data-part="arms"><Arm d="M58 132 Q44 138 40 152" fill={color.tint1} /></g>
      <TwoTone id={id} d={BODY} light={color.tint1} dark={color.tint2} />
      {level !== "base" ? <path d="M100 46 L114 160" stroke={color.forestBorder} strokeWidth={3} strokeLinecap="round" /> : null}
      <Highlight cx={84} cy={90} rx={10} ry={5} rotate={-60} />
      <Eyes x1={84} x2={112} y={120} look={eyesFor(pose)} />
      <Mouth x={98} y={140} pose={pose} />
      {pose === "done" ? <Glint x={150} y={52} /> : null}
    </Frame>
  );
}
