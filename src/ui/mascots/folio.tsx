// Folio, the course reader: a book with a soft spine and a bookmark tab (lime).
// Pages open while it reads a file; a page curls while a document waits for the
// lecturer to confirm it.

import { color } from "../../theme/tokens.ts";
import { Arm, Eyes, Feet, Frame, Glint, Ground, Highlight, INK, Mouth, STROKE, TwoTone, eyesFor, useSvgId, type CharacterProps, type HelperPose } from "./parts.tsx";

const COVER = "M60 56 H140 Q154 56 154 70 V158 Q154 172 140 172 H60 Q46 172 46 158 V70 Q46 56 60 56 Z";

export function Folio({ pose = "resting", size = 96, surface = "light" }: CharacterProps & { pose?: HelperPose }) {
  const id = useSvgId("folio");
  return (
    <Frame size={size} who="folio" pose={pose}>
      <Ground surface={surface} rx={54} />
      <Feet x1={82} x2={122} y={184} />
      <g data-part="arms">
        <Arm d="M48 118 Q34 124 32 138" fill={color.tint2} />
        <Arm d="M152 118 Q166 124 168 138" fill={color.tint2} />
      </g>
      {/* the pages behind the cover give the book its thickness */}
      <path d="M66 62 H148 Q160 62 160 74 V164 Q160 176 148 176 H66 Z" fill={color.white} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      {pose === "working" ? <path data-part="prop" d="M154 70 Q182 76 188 104 Q182 132 154 138 Z" fill={color.white} stroke={INK} strokeWidth={4} strokeLinejoin="round" /> : null}
      <TwoTone id={id} d={COVER} light={color.tint2} dark={color.moods} />
      {/* the soft spine */}
      <path d="M66 56 V172" stroke={INK} strokeWidth={4} />
      <path d="M60 56 H66 V172 H60 Q46 172 46 158 V70 Q46 56 60 56 Z" fill={color.emerald} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      <Highlight cx={86} cy={72} rx={14} ry={6} rotate={-12} />
      <Eyes x1={94} x2={126} y={104} look={eyesFor(pose)} />
      <Mouth x={110} y={126} pose={pose} />
      {/* the bookmark tab */}
      <path data-part={pose === "working" ? undefined : "prop"} d="M118 44 H132 V76 L125 70 L118 76 Z" fill={color.lime} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      {pose === "waiting" ? <path d="M136 56 H140 Q154 56 154 70 V76 Q146 62 136 56 Z" fill={color.white} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" /> : null}
      {pose === "done" ? <Glint x={172} y={46} /> : null}
    </Frame>
  );
}
