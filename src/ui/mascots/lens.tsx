// Lens, the evidence analyst: a magnifier holding a bracket, the interval. The
// bracket is drawn at the real interval width when one is given, so it narrows
// only when the evidence does; its ends are the lime accent.

import { color } from "../../theme/tokens.ts";
import { Eyes, Feet, Frame, Glint, Ground, INK, Mouth, STROKE, TwoTone, eyesFor, useSvgId, type CharacterProps, type HelperPose } from "./parts.tsx";

const GLASS = "M54 92 a42 42 0 1 0 84 0 a42 42 0 1 0 -84 0 Z";
const BRACKET_Y: Record<HelperPose, number> = { resting: 168, working: 160, waiting: 166, done: 168 };

/** interval: the interval's width as a share of the axis (0 to 1); the bracket spans 24 to 120 units. */
export function Lens({ pose = "resting", size = 96, surface = "light", interval = 0.45 }: CharacterProps & { pose?: HelperPose; interval?: number }) {
  const id = useSvgId("lens");
  const w = 24 + 96 * Math.min(1, Math.max(0, interval));
  const cx = pose === "waiting" ? 112 : 96, y = BRACKET_Y[pose];
  const x1 = cx - w / 2, x2 = cx + w / 2;
  return (
    <Frame size={size} who="lens" pose={pose}>
      <Ground surface={surface} rx={52} />
      <Feet x1={78} x2={114} y={186} />
      {/* the handle */}
      <path d="M136 132 L170 166" stroke={INK} strokeWidth={24} strokeLinecap="round" />
      <path d="M136 132 L170 166" stroke={color.forestBorder} strokeWidth={15} strokeLinecap="round" />
      {/* the rim in two tones, then the glass */}
      <circle cx={96} cy={92} r={56} fill={color.forest2} stroke={INK} strokeWidth={STROKE} />
      <circle cx={91} cy={87} r={50} fill={color.forestBorder} />
      <TwoTone id={id} d={GLASS} light={color.white} dark={color.tint2} shift={[-9, -8]} />
      <path d="M68 76 Q78 62 94 60" fill="none" stroke={color.tint2} strokeWidth={5} strokeLinecap="round" />
      <Eyes x1={82} x2={110} y={92} look={eyesFor(pose)} />
      <Mouth x={96} y={112} pose={pose} />
      {/* the bracket: the interval, held below */}
      <g data-part="prop">
        <path d={"M" + x1 + " " + y + " H" + x2} stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <rect x={x1 - 4} y={y - 10} width={8} height={20} rx={3} fill={color.lime} stroke={INK} strokeWidth={3.5} />
        <rect x={x2 - 4} y={y - 10} width={8} height={20} rx={3} fill={color.lime} stroke={INK} strokeWidth={3.5} />
      </g>
      {pose === "done" ? <Glint x={160} y={40} /> : null}
    </Frame>
  );
}
