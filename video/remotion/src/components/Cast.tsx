// The cast, drawn by the app's own components (src/ui/mascots), so the film's
// characters are the app's characters; and the lecturer figure, the film's
// only extra: faceless but for two dot eyes and a mouth that opens with her voice.
import React from "react";
import { Atlas } from "../../../../src/ui/mascots/atlas.tsx";
import { Folio } from "../../../../src/ui/mascots/folio.tsx";
import { Host } from "../../../../src/ui/mascots/host.tsx";
import { Lens } from "../../../../src/ui/mascots/lens.tsx";
import type { HelperPose, HostPose } from "../../../../src/ui/mascots/parts.tsx";
import { Prism } from "../../../../src/ui/mascots/prism.tsx";
import { Quill } from "../../../../src/ui/mascots/quill.tsx";
import { Scout } from "../../../../src/ui/mascots/scout.tsx";
import { Steward } from "../../../../src/ui/mascots/steward.tsx";
import { C } from "../theme";

const HELPERS = { folio: Folio, scout: Scout, atlas: Atlas, lens: Lens, quill: Quill, prism: Prism, steward: Steward } as const;
export type HelperId = keyof typeof HELPERS;
export const HELPER_NAMES: Record<HelperId, string> = { folio: "Folio", scout: "Scout", atlas: "Atlas", lens: "Lens", quill: "Quill", prism: "Prism", steward: "Steward" };
export const isHelper = (who: string): who is HelperId => who in HELPERS;

/** A helper on a light round badge, so its forest ink reads on the dark field. */
export const HelperBadge: React.FC<{ who: HelperId; size: number; pose?: HelperPose }> = ({ who, size, pose = "resting" }) => {
  const Character = HELPERS[who];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.tint2, display: "grid", placeItems: "center" }}>
      <Character pose={pose} size={size * 0.84} surface="light" />
    </div>
  );
};

export const HostFigure: React.FC<{ size: number; pose?: HostPose; mouth?: number }> = ({ size, pose = "greeting", mouth = 0 }) => (
  <Host pose={pose} size={size} surface="light" mouth={mouth} />
);

/** Dr Aisyah, the fictional lecturer: a quarter turn towards the host, two dot eyes, a mouth for her voice. */
export const Lecturer: React.FC<{ size: number; open?: number }> = ({ size, open = 0 }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
    <path d="M40 198 C40 150 68 126 100 126 C132 126 160 150 160 198 Z" fill={C.ray2} stroke={C.forest} strokeWidth={5} strokeLinejoin="round" />
    <path d="M70 140 Q100 156 130 140" fill="none" stroke={C.forest} strokeWidth={4} strokeLinecap="round" opacity={0.5} />
    <circle cx={100} cy={82} r={46} fill={C.tint1} stroke={C.forest} strokeWidth={5} />
    <circle cx={80} cy={78} r={5.5} fill={C.forest} />
    <circle cx={101} cy={80} r={5.5} fill={C.forest} />
    {open > 0.04
      ? <ellipse cx={89} cy={103} rx={6 + open * 2} ry={1.6 + open * 6} fill={C.forest} />
      : <path d="M83 102 Q89 105.5 95 102" fill="none" stroke={C.forest} strokeWidth={4} strokeLinecap="round" />}
  </svg>
);
