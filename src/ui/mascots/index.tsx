// The cast and the Mascot primitive (plan Sections 6.6 and 7). One host and
// seven helpers in one shape family; each step's header card shows only the
// helper acting there. A mascot is decoration: it is hidden from assistive
// technology and its name sits in the adjacent label. It never appears for a
// failed request ("stuck"): the error card speaks instead.

import { useEffect, useReducer } from "react";
import { moodsFor, DONE_WINDOW_MS, type CourseMoods, type HelperMood, type HelperRole, type HostMood } from "../../app/moods.ts";
import { nowIso, useStore } from "../../app/store.ts";
import { Atlas } from "./atlas.tsx";
import { Folio } from "./folio.tsx";
import { HOST_NAME, Host } from "./host.tsx";
import { Lens } from "./lens.tsx";
import type { Detail, HelperPose, HostPose, Surface } from "./parts.tsx";
import { Prism } from "./prism.tsx";
import { Quill } from "./quill.tsx";
import { Scout } from "./scout.tsx";
import { Steward } from "./steward.tsx";

export { HOST_NAME, Host } from "./host.tsx";
export { Mark, MarkTile } from "./mark.tsx";
export type { HelperPose, HostPose, Surface } from "./parts.tsx";

/** The cast as the deck and the How it works screen introduce it (Section 7.1). */
export const CAST: Array<{ who: "host" | HelperRole; name: string; job: string; prop: string }> = [
  { who: "host", name: HOST_NAME, job: "Lyceum itself: host, guide and the mark", prop: "the receipts ring it stands on" },
  { who: "folio", name: "Folio", job: "Course reader", prop: "a bookmark tab" },
  { who: "scout", name: "Scout", job: "Industry researcher", prop: "a small telescope" },
  { who: "atlas", name: "Atlas", job: "Curriculum mapper", prop: "a thread between two pins" },
  { who: "lens", name: "Lens", job: "Evidence analyst", prop: "a bracket, the interval" },
  { who: "quill", name: "Quill", job: "Course designer", prop: "a ruler rail" },
  { who: "prism", name: "Prism", job: "Teaching-material creator", prop: "the three rays" },
  { who: "steward", name: "Steward", job: "Review assistant", prop: "a clipboard" },
];
export const HOST_POSES: HostPose[] = ["greeting", "resting", "celebrating", "reflecting"];
export const HELPER_POSES: HelperPose[] = ["resting", "working", "waiting", "done"];

const HELPERS = { folio: Folio, scout: Scout, atlas: Atlas, lens: Lens, quill: Quill, prism: Prism, steward: Steward } as const;
/** Every character by role, for the generators (gen-mascots, the deck, the film). */
export const CHARACTERS = { host: Host, ...HELPERS } as const;

type MascotProps =
  | { who: "host"; mood: HostMood; size?: number; surface?: Surface; detail?: Detail; float?: boolean; className?: string }
  | { who: HelperRole; mood: HelperMood; size?: number; surface?: Surface; detail?: Detail; interval?: number; className?: string; float?: never };

/** A character in a mood. Rest is static; the prop moves only while a request really runs, and a
 *  just-saved record gets one spring. prefers-reduced-motion stops both (global.css). */
export function Mascot(props: MascotProps) {
  if (props.who !== "host" && props.mood === "stuck") return null;
  const size = props.size ?? 64;
  const classes = ["mascot", "mascot-" + props.mood, props.who === "host" && props.float ? "mascot-float" : "", props.className ?? ""].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-hidden="true">
      {props.who === "host"
        ? <Host pose={props.mood} size={size} surface={props.surface} detail={props.detail} />
        : props.who === "lens"
          ? <Lens pose={props.mood as HelperPose} size={size} surface={props.surface} detail={props.detail} interval={props.interval} />
          : (() => { const C = HELPERS[props.who]; return <C pose={props.mood as HelperPose} size={size} surface={props.surface} detail={props.detail} />; })()}
    </span>
  );
}

/** The moods for one course, from the store's records and the requests in flight. A done mood
 *  ends by itself: the hook re-renders once its window has passed, so nothing stays excited. */
export function useCourseMoods(subjectId: string | null): CourseMoods | null {
  const state = useStore();
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const moods = subjectId ? moodsFor(state, state.requests, subjectId, Date.parse(nowIso())) : null;
  const excited = moods ? Object.values(moods.helpers).includes("done") || moods.host === "celebrating" : false;
  useEffect(() => {
    if (!excited) return;
    const t = setTimeout(tick, DONE_WINDOW_MS + 50);
    return () => clearTimeout(t);
  }, [excited, state]);
  return moods;
}
