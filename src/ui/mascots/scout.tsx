// Scout, the industry researcher: a rounded explorer in a cap with a small
// telescope; the lens glint is the lime accent. The telescope rises and sweeps
// while a fetch really runs, points at the control while fetched postings wait
// to be kept, and lowers when done.

import { color } from "../../theme/tokens.ts";
import { Arm, Eyes, Feet, Frame, Glint, Ground, Highlight, INK, Mouth, STROKE, TwoTone, eyesFor, useSvgId, type CharacterProps, type HelperPose } from "./parts.tsx";

const BODY = "M48 120 C48 82 72 60 100 60 C128 60 152 82 152 120 C152 154 130 176 100 176 C70 176 48 154 48 120 Z";
const SCOPE: Record<HelperPose, { at: string; arm: string }> = {
  resting: { at: "translate(138 150) rotate(22)", arm: "M146 132 Q154 142 152 150" },
  working: { at: "translate(122 116) rotate(-38)", arm: "M146 132 Q140 124 128 120" },
  waiting: { at: "translate(146 140) rotate(0)", arm: "M148 130 Q150 138 150 140" },
  done: { at: "translate(140 154) rotate(30)", arm: "M146 134 Q152 146 150 154" },
};

export function Scout({ pose = "resting", size = 96, surface = "light" }: CharacterProps & { pose?: HelperPose }) {
  const id = useSvgId("scout");
  const scope = SCOPE[pose];
  return (
    <Frame size={size} who="scout" pose={pose}>
      <Ground surface={surface} rx={52} />
      <Feet x1={82} x2={118} y={186} />
      <g data-part="arms"><Arm d="M54 132 Q42 142 40 154" fill={color.ray2} /></g>
      <TwoTone id={id} d={BODY} light={color.ray2} dark={color.emerald} />
      <Highlight cx={74} cy={110} rx={10} ry={6} rotate={-30} />
      {/* the explorer's cap */}
      <path d="M58 98 C58 72 76 54 100 54 C124 54 142 72 142 98 Z" fill={color.forest2} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      <path d="M40 100 Q100 84 160 100 Q100 112 40 100 Z" fill={color.forestBorder} stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      <circle cx={100} cy={55} r={5} fill={color.forestBorder} stroke={INK} strokeWidth={3} />
      <Eyes x1={84} x2={116} y={124} look={eyesFor(pose)} />
      <Mouth x={100} y={144} pose={pose} />
      {/* the telescope, held in the right arm */}
      <g data-part="arms"><Arm d={scope.arm} fill={color.ray2} /></g>
      <g data-part="prop" transform={scope.at}>
        <rect x={0} y={-9} width={26} height={18} rx={5} fill={color.forest2} stroke={INK} strokeWidth={4} />
        <rect x={24} y={-7} width={20} height={14} rx={4} fill={color.forestBorder} stroke={INK} strokeWidth={4} />
        <rect x={10} y={-9} width={5} height={18} fill={color.onForest} />
        <circle cx={46} cy={0} r={7} fill={color.onForest} stroke={INK} strokeWidth={3.5} />
        <circle cx={47.5} cy={-2} r={3} fill={color.lime} />
      </g>
      {pose === "done" ? <Glint x={42} y={58} /> : null}
    </Frame>
  );
}
