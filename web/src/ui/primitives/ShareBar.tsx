// Thin single-series bars for shares with a Wilson interval whisker drawn
// beneath the bar. One hue for magnitude, text in ink, the exact numbers
// printed beside the bar (the tooltip repeats them). The SVG scales down with
// its column, so a 320px screen never overflows.

const pct = (x: number) => Math.round(x * 1000) / 10 + "%";
const intervalText = (low?: number | null, high?: number | null) => (typeof low === "number" && typeof high === "number" ? pct(low) + " to " + pct(high) : "");

export function ShareBar({ share, low, high, width = 160 }: { share: number | null; low?: number | null; high?: number | null; width?: number }) {
  if (share === null) return <span className="muted">Unknown</span>;
  const hasInterval = typeof low === "number" && typeof high === "number";
  const bar = 8, y = 1, wy = 15, h = hasInterval ? 19 : 10;
  const x = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * (width - 2)) + 1;
  const interval = intervalText(low, high);
  const label = pct(share) + (interval ? " (" + interval + ")" : "");
  return <svg className="share-bar" viewBox={"0 0 " + width + " " + h} width={width} height={h} role="img" aria-label={label} style={{ "--bar-width": width + "px" } as React.CSSProperties}><title>{label}</title>
    <rect x={1} y={y} width={width - 2} height={bar} rx={2} fill="var(--tint-1)" />
    {share > 0 ? <rect x={1} y={y} width={Math.max(2, x(share) - 1)} height={bar} rx={2} fill="var(--emerald)" /> : null}
    {hasInterval ? <>
      <line x1={x(low!)} x2={x(high!)} y1={wy} y2={wy} stroke="var(--ink)" strokeWidth={1.5} />
      <line x1={x(low!)} x2={x(low!)} y1={wy - 3} y2={wy + 3} stroke="var(--ink)" strokeWidth={1.5} />
      <line x1={x(high!)} x2={x(high!)} y1={wy - 3} y2={wy + 3} stroke="var(--ink)" strokeWidth={1.5} />
    </> : null}
  </svg>;
}

export interface BarRow { label: string; share: number | null; low?: number | null; high?: number | null; note?: string }
/** A compact horizontal bar chart: labels left in ink, one accent hue, the value and interval printed right, no legend (one series). */
export function BarList({ rows, caption, width = 240 }: { rows: BarRow[]; caption: string; width?: number }) {
  return <figure className="bar-list" aria-label={caption}>
    <ul className="bar-list-rows">{rows.map((r) => { const interval = intervalText(r.low, r.high); return <li className="bar-list-row" key={r.label}>
      <span className="bar-list-label">{r.label}</span>
      <ShareBar share={r.share} low={r.low} high={r.high} width={width} />
      <span className="bar-list-value num">{r.share === null ? "Unknown" : pct(r.share)}{interval ? <span className="muted"> ({interval})</span> : null}{r.note ? <span className="muted"> {r.note}</span> : null}</span>
    </li>; })}</ul>
    <figcaption className="muted">{caption}</figcaption>
  </figure>;
}
