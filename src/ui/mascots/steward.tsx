// Steward, the review assistant: a folder with a receipt tab (lime) and a
// clipboard. It holds the folder out while a prepared brief waits to be sent.

import { color } from "../../theme/tokens.ts";
import { Arm, Eyes, Feet, Frame, Glint, Ground, Highlight, INK, Mouth, STROKE, TwoTone, eyesFor, useSvgId, type CharacterProps, type HelperPose } from "./parts.tsx";

const BACK = "M52 62 H84 Q90 62 94 68 L98 74 H148 Q156 74 156 82 V164 Q156 172 148 172 H52 Q44 172 44 164 V70 Q44 62 52 62 Z";
const FRONT = "M44 100 Q44 94 50 94 H150 Q156 94 156 100 V164 Q156 172 148 172 H52 Q44 172 44 164 Z";
const BOARD: Record<HelperPose, string | undefined> = { resting: "translate(0 12)", working: "translate(-2 -18)", waiting: "translate(6 -6)", done: "translate(0 12)" };
const LEAN: Record<HelperPose, string | undefined> = { resting: undefined, working: undefined, waiting: "rotate(6 100 180)", done: undefined };

export function Steward({ pose = "resting", size = 96, surface = "light" }: CharacterProps & { pose?: HelperPose }) {
  const frontId = useSvgId("steward-front");
  return (
    <Frame size={size} who="steward" pose={pose}>
      <Ground surface={surface} rx={56} />
      <Feet x1={80} x2={120} y={184} />
      <g transform={LEAN[pose]}>
        <g data-part="arms"><Arm d="M46 130 Q32 136 30 150" fill={color.tint2} /></g>
        <path d={BACK} fill={color.moods} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
        {/* the receipt tab between the panels */}
        <path data-part="receipt" d="M112 96 V66 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 V96 Z" fill={color.lime} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <TwoTone id={frontId} d={FRONT} light={color.tint2} dark={color.moods} />
        <Highlight cx={66} cy={108} rx={12} ry={5} rotate={-10} />
        <Eyes x1={84} x2={116} y={126} look={eyesFor(pose)} />
        <Mouth x={100} y={146} pose={pose} />
        {/* the clipboard */}
        <g data-part="prop" transform={BOARD[pose]}>
          <rect x={150} y={104} width={36} height={48} rx={5} fill={color.forestBorder} stroke={INK} strokeWidth={4} />
          <rect x={155} y={112} width={26} height={34} rx={2} fill={color.white} />
          <rect x={162} y={99} width={12} height={10} rx={2} fill={color.forest2} stroke={INK} strokeWidth={3} />
          <g stroke={color.forestBorder} strokeWidth={2.5} strokeLinecap="round"><path d="M159 121 H177" /><path d="M159 129 H177" /><path d="M159 137 H171" /></g>
        </g>
        <g data-part="arms"><Arm d={pose === "working" ? "M154 128 Q160 122 160 116" : "M154 132 Q160 134 160 140"} fill={color.tint2} /></g>
      </g>
      {pose === "done" ? <Glint x={36} y={50} /> : null}
    </Frame>
  );
}
