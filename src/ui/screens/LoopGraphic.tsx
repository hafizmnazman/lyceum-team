// The loop as a picture (plan Sections 5.1, 5.3 and 7.3): the host at the centre
// and the seven helpers at their stations around the ring, in the loop's order,
// with Decide as the station where people decide and no helper stands. The same
// graphic opens the landing page and How it works. The stations are a real list
// for assistive technology; the ring behind them is decoration. Every character
// rests: nothing moves on a screen nobody is working on.

import type { CSSProperties } from "react";
import { Scale } from "lucide-react";
import type { HelperRole } from "../../app/moods.ts";
import { CAST, HOST_NAME, Mascot, type Surface } from "../mascots/index.tsx";

export interface Station { who: HelperRole | "people"; step: string; does: string }

/** The stations in loop order, from Course round to Learn; Lens stands twice, counting at Report and reading the results at Learn. */
export const STATIONS: Station[] = [
  { who: "folio", step: "Course", does: "reads the outline" },
  { who: "scout", step: "Watch", does: "fetches on request" },
  { who: "atlas", step: "Report", does: "quotes and maps" },
  { who: "lens", step: "Report", does: "counts, with n" },
  { who: "steward", step: "Report", does: "prepares the brief" },
  { who: "people", step: "Decide", does: "people decide" },
  { who: "quill", step: "Update", does: "checks the revision" },
  { who: "prism", step: "Teach", does: "builds the pack" },
  { who: "lens", step: "Learn", does: "reads the results, n of N" },
];

export function LoopGraphic({ onSelect, selected, surface = "light", compact = false }: {
  onSelect?: (who: HelperRole) => void; selected?: HelperRole | null; surface?: Surface; compact?: boolean;
}) {
  const size = compact ? 48 : 60;
  return (
    <div className={"loop-graphic" + (compact ? " is-compact" : "")} data-demo-id="loop-graphic">
      <svg className="loop-graphic-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="38" className="loop-graphic-track" />
        <circle cx="50" cy="50" r="38" className="loop-graphic-path" pathLength="100" />
      </svg>
      <div className="loop-graphic-host">
        <Mascot who="host" mood="resting" size={compact ? 96 : 128} surface={surface} />
        <span className="loop-graphic-host-name">{HOST_NAME}, the host</span>
        <span className="loop-graphic-host-line">Seven helpers, one afternoon, nothing automatic.</span>
      </div>
      <ol className="loop-graphic-stations" aria-label="The loop, station by station">
        {STATIONS.map((s, i) => {
          const angle = -90 + i * (360 / STATIONS.length);
          const style = { "--angle": angle + "deg" } as CSSProperties;
          const cast = s.who === "people" ? null : CAST.find((c) => c.who === s.who)!;
          const body = <>
            <span className="loop-station-figure">{s.who === "people" ? <span className="loop-station-people"><Scale size={size * 0.5} strokeWidth={1.75} aria-hidden /></span> : <Mascot who={s.who} mood="resting" size={size} surface={surface} />}</span>
            <span className="loop-station-step">{s.step}</span>
            {compact
              // nine stations leave the compact ring room for the helper's name only; the full line stays for screen readers
              ? <span className="loop-station-who"><span aria-hidden="true">{cast ? cast.name : "People"}</span><span className="sr-only">{cast ? cast.name + ": " + s.does : s.does}</span></span>
              : <span className="loop-station-who">{cast ? cast.name + ": " + s.does : s.does}</span>}
          </>;
          return <li key={s.who + "-" + s.step} className={"loop-station" + (selected === s.who ? " is-selected" : "")} style={style}>
            {onSelect && s.who !== "people" ? <button type="button" className="loop-station-button" aria-pressed={selected === s.who} onClick={() => onSelect(s.who as HelperRole)}>{body}</button> : <div className="loop-station-button">{body}</div>}
          </li>;
        })}
      </ol>
    </div>
  );
}
