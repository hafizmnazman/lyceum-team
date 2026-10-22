// The product mark: the host's silhouette (plan Section 7.1), so Lyceum has a
// real logo rather than a word. Mark is the one-colour version, in forest or in
// white, for the architecture diagram and the deck; MarkTile is the favicon and
// the app icon, the white silhouette on a forest tile with the lime leaf.

import { color } from "../../theme/tokens.ts";
import { HOST_CROWN, HOST_DISC, HOST_LEAF, HOST_TRUNK } from "./host.tsx";
import { useSvgId } from "./parts.tsx";

/** leaf: show the leaf in lime, for the lockup beside the wordmark on forest (lime only on forest surfaces). */
export function Mark({ size = 32, tone = "forest", title, leaf = false }: { size?: number; tone?: "forest" | "white"; title?: string; leaf?: boolean }) {
  const id = useSvgId("mark");
  const fill = tone === "white" ? color.white : color.forest;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : "true"} focusable="false">
      {title ? <title>{title}</title> : null}
      {/* one colour: the growth rings and a gap around the leaf are cut through a mask */}
      <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={200} height={200}>
        <rect width={200} height={200} fill="white" />
        <ellipse cx={100} cy={176} rx={40} ry={10} fill="none" stroke="black" strokeWidth={4} />
        <ellipse cx={100} cy={176} rx={24} ry={6} fill="none" stroke="black" strokeWidth={4} />
        <path d={HOST_TRUNK} fill="white" />
        <path d={HOST_LEAF} fill="none" stroke="black" strokeWidth={12} strokeLinejoin="round" />
        <path d={HOST_LEAF} fill="white" />
      </mask>
      <g fill={fill} mask={"url(#" + id + ")"}>
        <path d={HOST_CROWN} />
        <ellipse {...HOST_DISC} />
        <path d={HOST_TRUNK} />
        <path d={HOST_LEAF} />
      </g>
      {leaf ? <path d={HOST_LEAF} fill={color.lime} /> : null}
    </svg>
  );
}

export function MarkTile({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : "true"} focusable="false">
      {title ? <title>{title}</title> : null}
      <rect width={200} height={200} rx={44} fill={color.forest} />
      <g transform="translate(22 23) scale(0.78)">
        <path d={HOST_CROWN} fill={color.white} />
        <ellipse {...HOST_DISC} fill={color.white} />
        <g fill="none" stroke={color.forest} strokeWidth={5}>
          <ellipse cx={100} cy={176} rx={40} ry={10} />
          <ellipse cx={100} cy={176} rx={24} ry={6} />
        </g>
        <path d={HOST_TRUNK} fill={color.white} />
        <path d={HOST_LEAF} fill="none" stroke={color.forest} strokeWidth={14} strokeLinejoin="round" />
        <path d={HOST_LEAF} fill={color.lime} />
      </g>
    </svg>
  );
}
