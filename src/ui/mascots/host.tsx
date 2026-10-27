// The host: Lyceum's own mascot, a young tree standing on its growth rings, the
// receipts ring (plan Section 7.1). The one character with a lime body part: a
// single leaf at the crown. Its moods follow the loop, never activity: greeting
// before any step is done, resting mid-loop, celebrating as a loop closes (a new
// ring glows once), reflecting beside the term recap. Its silhouette is the
// product mark (mark.tsx).

import { color } from "../../theme/tokens.ts";
import { Arm, Eyes, Frame, Glint, Ground, Highlight, INK, Mouth, STROKE, TwoTone, detailFor, eyesFor, useSvgId, type CharacterProps, type HostPose } from "./parts.tsx";

/** The host's working name; the plan leaves it to the team, and it is kept in one place (docs/decisions.md). */
export const HOST_NAME = "Tualang";

// Shapes shared with the product mark.
export const HOST_CROWN = "M100 32 C128 32 152 48 156 76 C172 84 170 112 154 120 C152 138 130 150 100 150 C70 150 48 138 46 120 C30 112 28 84 44 76 C48 48 72 32 100 32 Z";
export const HOST_TRUNK = "M88 177 C89 162 91 150 92 140 L108 140 C109 150 111 162 112 177 Q100 181 88 177 Z";
export const HOST_LEAF = "M104 36 C99 22 108 10 125 8 C127 22 119 34 104 36 Z";
export const HOST_DISC = { cx: 100, cy: 176, rx: 56, ry: 14 };

// Branch arms come out of the trunk below the crown; a raised arm reaches out beside the crown, never behind it.
const ARMS: Record<HostPose, [string, string]> = {
  resting: ["M92 158 Q78 164 70 172", "M108 158 Q122 164 130 172"],
  greeting: ["M92 158 Q78 164 70 172", "M108 156 Q150 162 166 136"],
  celebrating: ["M92 156 Q50 162 34 136", "M108 156 Q150 162 166 136"],
  reflecting: ["M94 160 Q88 166 92 172", "M106 160 Q112 166 108 172"],
};
const LEAF_TURN: Record<HostPose, string | undefined> = {
  resting: undefined,
  greeting: "translate(0 -3) rotate(-14 104 36)",
  celebrating: "translate(0 -4) rotate(-18 104 36)",
  reflecting: "rotate(16 104 36)",
};

const tip = (d: string) => { const n = d.split(" ").slice(-2).map(Number); return { x: n[0], y: n[1] }; };

export function Host({ pose = "resting", size = 96, surface = "light", detail, mouth }: CharacterProps & { pose?: HostPose; mouth?: number }) {
  const level = detail ?? detailFor(size);
  const crownId = useSvgId("host-crown"), trunkId = useSvgId("host-trunk");
  const arms = ARMS[pose];
  return (
    <Frame size={size} who="host" pose={pose}>
      <Ground surface={surface} rx={62} />
      {/* the growth rings it stands on: the receipts ring */}
      <g data-part="rings">
        <ellipse {...HOST_DISC} fill={color.tint2} stroke={INK} strokeWidth={STROKE} />
        <ellipse cx={100} cy={176} rx={40} ry={10} fill="none" stroke={color.forestBorder} strokeWidth={3} />
        {level === "poster" ? <ellipse cx={100} cy={176} rx={33} ry={8} fill="none" stroke={color.forestBorder} strokeWidth={2} /> : null}
        <ellipse cx={100} cy={176} rx={26} ry={6.5} fill="none" stroke={color.forestBorder} strokeWidth={2.5} />
        {pose === "celebrating" ? <>
          <ellipse cx={100} cy={176} rx={48} ry={12} fill="none" stroke={color.ray3} strokeWidth={10} opacity={0.35} />
          <ellipse cx={100} cy={176} rx={48} ry={12} fill="none" stroke={color.ray3} strokeWidth={4} />
        </> : null}
      </g>
      {/* trunk and branch arms */}
      <TwoTone id={trunkId} d={HOST_TRUNK} light={color.forestBorder} dark={color.forest2} shift={[-7, -4]} />
      {level !== "base" ? <g fill="none" stroke={color.forest2} strokeWidth={2.5} strokeLinecap="round"><path d="M96 150 q-2 8 0 16" /><path d="M104 146 q2 6 0 12" /></g> : null}
      <g data-part="arms">
        {arms.map((d, i) => { const t = tip(d); return <g key={d} data-arm={i ? "right" : "left"}><Arm d={d} fill={color.forestBorder} /><circle cx={t.x} cy={t.y} r={7} fill={color.ray3} stroke={INK} strokeWidth={3.5} /></g>; })}
      </g>
      {/* the crown, which carries the face */}
      <TwoTone id={crownId} d={HOST_CROWN} light={color.ray3} dark={color.ray2} shift={[-16, -14]} />
      <Highlight cx={72} cy={62} rx={18} ry={9} rotate={-28} />
      {level === "poster" ? <g fill="none" stroke={color.ray2} strokeWidth={3} strokeLinecap="round"><path d="M58 106 q6 -6 12 0" /><path d="M128 66 q6 -6 12 0" /><path d="M136 110 q6 -6 12 0" /></g> : null}
      <Eyes x1={80} x2={120} y={98} look={eyesFor(pose)} />
      <Mouth x={100} y={120} pose={pose} open={mouth} />
      {/* the single lime leaf: the brand at any size */}
      <g data-part="leaf" transform={LEAF_TURN[pose]}>
        <path d={HOST_LEAF} fill={color.lime} stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
        {level !== "base" ? <path d="M106 33 Q114 22 123 11" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" /> : null}
      </g>
      {pose === "celebrating" ? <Glint x={164} y={44} /> : null}
    </Frame>
  );
}
