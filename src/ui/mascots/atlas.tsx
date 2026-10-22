// Atlas, the curriculum mapper: a map-pin body with a thread between two pins
// (lime). The thread hangs slack at rest and pulls taut while proposed
// quotations wait for the lecturer to confirm them.

import { color } from "../../theme/tokens.ts";
import { Arm, Eyes, Feet, Frame, Glint, Ground, Highlight, INK, Mouth, TwoTone, eyesFor, useSvgId, type CharacterProps, type HelperPose } from "./parts.tsx";

const PIN = "M100 182 C80 156 48 130 48 96 C48 64 72 40 100 40 C128 40 152 64 152 96 C152 130 120 156 100 182 Z";
const THREAD: Record<HelperPose, { d: string; b: [number, number] }> = {
  resting: { d: "M26 152 Q100 196 174 140", b: [174, 140] },
  working: { d: "M26 152 Q96 150 166 104", b: [166, 104] },
  waiting: { d: "M26 152 L174 136", b: [174, 136] },
  done: { d: "M26 152 Q100 172 174 140", b: [174, 140] },
};

function SmallPin({ x, y }: { x: number; y: number }) {
  return <g><path d={"M" + x + " " + y + " V" + (y + 16)} stroke={INK} strokeWidth={3.5} strokeLinecap="round" /><circle cx={x} cy={y} r={9} fill={color.emerald} stroke={INK} strokeWidth={3.5} /></g>;
}

export function Atlas({ pose = "resting", size = 96, surface = "light" }: CharacterProps & { pose?: HelperPose }) {
  const id = useSvgId("atlas");
  const thread = THREAD[pose];
  return (
    <Frame size={size} who="atlas" pose={pose}>
      <Ground surface={surface} rx={50} />
      {/* the thread between two pins, behind the body */}
      <g data-part="prop">
        <path d={thread.d} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <path d={thread.d} fill="none" stroke={color.lime} strokeWidth={4} strokeLinecap="round" />
        <SmallPin x={26} y={152} />
        <SmallPin x={thread.b[0]} y={thread.b[1]} />
      </g>
      <Feet x1={86} x2={114} y={188} />
      <g data-part="arms">
        <Arm d="M54 118 Q40 126 34 142" fill={color.white} />
        <Arm d={pose === "working" ? "M146 116 Q160 108 162 98" : "M146 118 Q160 126 166 140"} fill={color.white} />
      </g>
      <TwoTone id={id} d={PIN} light={color.white} dark={color.tint2} />
      <circle cx={100} cy={94} r={36} fill="none" stroke={color.ray2} strokeWidth={4} />
      <Highlight cx={74} cy={64} rx={12} ry={6} rotate={-32} />
      <Eyes x1={86} x2={114} y={92} look={eyesFor(pose)} />
      <Mouth x={100} y={112} pose={pose} />
      {pose === "done" ? <Glint x={160} y={52} /> : null}
    </Frame>
  );
}
