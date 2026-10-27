// Before and after on screen (depth plan Section 6.2). The D5a core: the word-level redline, current against proposed in two
// columns, the structural slide diff over the pack previews, and the change summary as static text. D5b: the dumbbell of
// hours per topic, the swipe and onion-skin slide compare, the version scrubber with named stops, the summary's counters and
// the slopegraph of results between terms. Everything comes from lib/diff.ts, which reads records only. Colours are tokens;
// strikethrough and underline carry each change as well as colour, and hidden labels name it for a screen reader. The D5a
// views never move; the counters count once and stop under reduced motion; the compare moves only under the reader's hand;
// nothing autoplays.

import { useEffect, useId, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { deckDiff, hoursDelta, topicDeltas, wordDiff, type PartChange, type ResultDelta, type SlidePart, type TopicDelta, type TopicHours } from "../../lib/diff.ts";
import { previewSlides, type PreviewSlide } from "../../lib/deckLayout.ts";
import type { DeckSpec } from "../../lib/slides.ts";
import type { CourseDefinition } from "../../types.ts";
import { SlideSvg, type SlideHighlight } from "./DeckPreview.tsx";
import { Button, Tag } from "./index.tsx";
import { reducedMotion } from "../motion.ts";
import { Segmented } from "./Segmented.tsx";

/** One text before and after, in one run of prose: what went struck through in the danger token, what came underlined in
 *  the emerald text token, each with a hidden "deleted" or "inserted". With `hide`, the clean new text alone. */
export function Redline({ before, after, hide = false }: { before: string; after: string; hide?: boolean }) {
  if (hide) return <span className="redline">{after}</span>;
  return <span className="redline">{wordDiff(before, after).map((r, i) => r.kind === "kept" ? <span key={i}>{r.text}</span>
    : r.kind === "deleted" ? <del key={i}><span className="sr-only">deleted: </span>{r.text}</del>
    : <ins key={i}><span className="sr-only">inserted: </span>{r.text}</ins>)}</span>;
}

/** What the marks mean, in words and icons, and the "Hide changes" switch for the clean text. */
export function RedlineControls({ hide, onToggle }: { hide: boolean; onToggle: () => void }) {
  return <div className="redline-controls">
    <p className="redline-legend"><span><Minus size={14} aria-hidden /> <span className="redline-del">struck through</span>: removed</span>
      <span><Plus size={14} aria-hidden /> <span className="redline-ins">underlined</span>: added</span></p>
    <Button aria-pressed={hide} onClick={onToggle} data-demo-id="redline-hide">Hide changes</Button>
  </div>;
}

/** Each outcome that changed between two versions: its wording as a redline, a new Bloom level in words, an added outcome
 *  all inserted and a removed one all struck. Says so when no outcome changed. */
export function OutcomeChanges({ before, after }: { before: CourseDefinition; after: CourseDefinition }) {
  const [hide, setHide] = useState(false);
  const rows = [
    ...after.outcomes.map((o) => ({ o, was: before.outcomes.find((b) => b.id === o.id) })).filter(({ o, was }) => !was || was.text !== o.text || was.bloomLevel !== o.bloomLevel)
      .map(({ o, was }) => ({ id: o.id, label: o.label, level: was && was.bloomLevel !== o.bloomLevel ? was.bloomLevel + " to " + o.bloomLevel : o.bloomLevel, before: was?.text ?? "", after: o.text, kind: was ? "changed" : "added" })),
    ...before.outcomes.filter((b) => !after.outcomes.some((o) => o.id === b.id)).map((b) => ({ id: b.id, label: b.label, level: b.bloomLevel, before: b.text, after: "", kind: "removed" })),
  ];
  if (!rows.length) return <p className="muted">No outcome changed.</p>;
  return <div className="outcome-changes" data-demo-id="outcome-redline">
    <RedlineControls hide={hide} onToggle={() => setHide(!hide)} />
    <ul className="redline-list">{rows.map((r) => <li key={r.id}>
      <strong>{r.label}</strong> <span className="muted">{r.level}{r.kind === "added" ? ", added" : r.kind === "removed" ? ", removed" : ""}</span>
      <p>{r.kind === "removed" && hide ? <span className="muted">Removed in the new version.</span> : <Redline before={r.before} after={r.after} hide={hide} />}</p>
    </li>)}</ul>
  </div>;
}

const hoursText = (h: TopicHours | null) => !h ? "Not in this version"
  : h.lecture !== null && h.lab !== null ? h.contact + " h: " + h.lecture + " lecture, " + h.lab + " lab" : h.contact + " h";
const STATUS: Record<TopicDelta["status"], string> = { added: "Added", removed: "Removed", changed: "Changed", moved: "Moved", unchanged: "Unchanged" };

/** Topics and hours, current against proposed (the committee convention): a table with the delta in words, the changed rows
 *  first with every changed cell outlined, the unchanged ones folded behind a button, the totals, and the assessment plan said
 *  to be unchanged when it is. */
export function TwoColumn({ before, after, beforeLabel, afterLabel }: { before: CourseDefinition; after: CourseDefinition; beforeLabel: string; afterLabel: string }) {
  const [all, setAll] = useState(false);
  const deltas = topicDeltas(before, after);
  const changed = deltas.filter((d) => d.status !== "unchanged"), shown = all ? deltas : changed;
  const total = (defn: CourseDefinition) => defn.topics.reduce((n, t) => n + t.contactHours, 0);
  const hoursChanged = (d: TopicDelta) => d.changed.some((c) => c === "contact" || c === "lecture" || c === "lab");
  const assessmentChanged = JSON.stringify(before.assessment ?? []) !== JSON.stringify(after.assessment ?? []);
  return <div className="two-column" data-demo-id="hours-two-column">
    {!shown.length ? <p>No topic or hour changed: {total(before)} contact hours in both.</p> : <table className="record-table diff-table">
      <caption>Topics and contact hours, {beforeLabel} against {afterLabel}{all ? "" : ": the topics that changed"}</caption>
      <thead><tr><th scope="col">Week</th><th scope="col">Topic</th><th scope="col">{beforeLabel}</th><th scope="col">{afterLabel}</th><th scope="col">Change</th></tr></thead>
      <tbody>{shown.map((d) => <tr key={d.id} className={"diff-row-" + d.status}>
        <td data-label="Week" className={d.changed.includes("week") && d.status !== "added" && d.status !== "removed" ? "diff-cell" : undefined}>
          {d.week ? (d.week.after ?? "Not set") + (d.week.before !== d.week.after ? " (was " + (d.week.before ?? "not set") + ")" : "") : d.status === "added" ? "New" : "Gone"}</td>
        <th scope="row" data-label="Topic" className={d.changed.includes("title") && d.status === "changed" ? "diff-cell" : undefined}>{d.title || "Untitled topic"} {d.status !== "unchanged" ? <Tag tone={d.status === "removed" ? "warn" : "accent"}>{STATUS[d.status]}</Tag> : null}</th>
        <td data-label={beforeLabel} className={d.status === "removed" || (hoursChanged(d) && d.status === "changed") ? "diff-cell" : undefined}>{hoursText(d.before)}</td>
        <td data-label={afterLabel} className={d.status === "added" || (hoursChanged(d) && d.status === "changed") ? "diff-cell" : undefined}>{hoursText(d.after)}</td>
        <td data-label="Change">{hoursDelta(d.delta)}{d.status === "moved" ? ", moved" : ""}</td>
      </tr>)}</tbody>
      <tfoot><tr><th scope="row" colSpan={2}>Contact hours outlined</th><td data-label={beforeLabel}>{total(before)} h</td><td data-label={afterLabel}>{total(after)} h</td><td data-label="Change">{hoursDelta(total(after) - total(before))}</td></tr></tfoot>
    </table>}
    {deltas.length > changed.length ? <Button variant="quiet" aria-expanded={all} onClick={() => setAll(!all)}>{all ? "Show only the topics that changed" : "Show all " + deltas.length + " topics (" + (deltas.length - changed.length) + " unchanged)"}</Button> : null}
    <p className="muted">{assessmentChanged ? "The assessment plan changed as well; the course record shows both versions." : "The assessment plan is unchanged."}</p>
  </div>;
}

const PART_LABEL: Record<SlidePart, string> = { title: "Title", body: "Text", right: "Second column", figure: "Figure", notes: "Speaker notes" };

function PartLines({ change }: { change: PartChange }) {
  const paired = change.removed.length === change.added.length;
  return <div className="slide-diff-part"><span className="eyebrow">{PART_LABEL[change.part]}</span>
    <ul>{paired ? change.removed.map((r, i) => <li key={i}><Redline before={r} after={change.added[i]} /></li>)
      : [...change.removed.map((r, i) => <li key={"r" + i}><del><span className="sr-only">deleted: </span>{r}</del></li>),
        ...change.added.map((a, i) => <li key={"a" + i}><ins><span className="sr-only">inserted: </span>{a}</ins></li>)]}</ul>
  </div>;
}

/** What changed between two packs built from records (pattern 6): each changed slide under both versions with the changed
 *  parts outlined, and the list of changes beside it, which is the description; nothing depends on the pixels. */
export function SlideDiffList({ before, after, beforeLabel, afterLabel, markSrc }: { before: DeckSpec; after: DeckSpec; beforeLabel: string; afterLabel: string; markSrc?: string }) {
  const changes = deckDiff(before, after);
  if (!changes.length) return <p className="muted">The pack is the same under {beforeLabel} and {afterLabel}.</p>;
  const was = previewSlides(before), now = previewSlides(after);
  return <ol className="slide-diff" data-demo-id="slide-diff">{changes.map((c, i) => {
    // Speaker notes have no place on the slide, so a notes change is in the list only.
    const marks: SlideHighlight[] = c.kind === "changed" ? c.parts.flatMap((p): SlideHighlight[] => (p.part === "notes" ? [] : [p.part])) : ["whole"];
    return <li key={i} className="slide-diff-item">
      <p className="slide-diff-head"><Tag tone="accent">{c.kind === "added" ? "Slide added" : c.kind === "removed" ? "Slide removed" : "Slide " + (c.afterIndex! + 1) + " changed"}</Tag> <strong>{c.title}</strong></p>
      <div className="slide-diff-thumbs">
        {c.beforeIndex !== null ? <figure><figcaption>{beforeLabel}</figcaption><SlideSvg slide={was[c.beforeIndex]} number={c.beforeIndex + 1} markSrc={markSrc} highlight={marks} /></figure> : null}
        {c.afterIndex !== null ? <figure><figcaption>{afterLabel}</figcaption><SlideSvg slide={now[c.afterIndex]} number={c.afterIndex + 1} markSrc={markSrc} highlight={marks} /></figure> : null}
      </div>
      {c.parts.map((p) => <PartLines key={p.part} change={p} />)}
      {c.beforeIndex !== null && c.afterIndex !== null ? <details className="slide-compare-open" data-demo-id={"slide-compare-open-" + i}><summary>Swipe or fade between the two</summary>
        <SlideCompare before={was[c.beforeIndex]} after={now[c.afterIndex]} number={c.afterIndex + 1} beforeLabel={beforeLabel} afterLabel={afterLabel} markSrc={markSrc} /></details> : null}
    </li>;
  })}</ol>;
}

/** The change in one line of words, from the diffs ("1 outcome reworded, 1 topic added, 3 h added, 1 slide changed"). */
export function ChangeSummary({ text }: { text: string }) {
  return <p className="change-summary" data-demo-id="change-summary">{text === "no change" ? "Nothing changed between the two versions." : <><strong>What changed:</strong> {text}.</>}</p>;
}

// ---------- D5b (depth plan Section 6.2, Tier 3) ----------

const pctText = (x: number | null) => (x === null ? "none" : Math.round(x * 100) + "%");
// The slopegraph's table, to the tenth, so its change in points adds up from the two shares beside it.
const pctOne = (x: number | null) => (x === null ? "none" : Math.round(x * 1000) / 10 + "%");

/** The change summary counting up once (pattern 9): each number from zero to its value in under a second, the final sentence
 *  at once under reduced motion, and the final sentence given to a screen reader once, in a live region. */
export function CountUpSummary({ text }: { text: string }) {
  const [k, setK] = useState(() => (reducedMotion() ? 1 : 0));
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    if (text === "no change" || reducedMotion()) { setK(1); setSpoken(text); return; }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setK(t);
      if (t < 1) frame = requestAnimationFrame(step); else setSpoken(text);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [text]);
  if (text === "no change") return <ChangeSummary text={text} />;
  const eased = 1 - Math.pow(1 - k, 3);
  return <p className="change-summary" data-demo-id="change-summary"><strong>What changed:</strong>{" "}
    <span aria-hidden="true">{text.split(/(\d+)/).map((part, i) => (i % 2 ? <span key={i} className="tabular">{Math.round(Number(part) * eased)}</span> : part))}.</span>
    <span className="sr-only" aria-live="polite">{spoken ? spoken + "." : ""}</span></p>;
}

/** Contact hours per topic, before and after (pattern 3): the open dot the earlier version, the filled dot the later, a bar
 *  between them, the changed topics first by the size of change, unchanged ones as one grey dot; value labels on the dots,
 *  and the two-column table below carries the same numbers. */
export function Dumbbell({ before, after, beforeLabel, afterLabel }: { before: CourseDefinition; after: CourseDefinition; beforeLabel: string; afterLabel: string }) {
  const rows = topicDeltas(before, after)
    .map((d) => ({ d, was: d.before?.contact ?? null, now: d.after?.contact ?? null, week: d.week?.after ?? d.week?.before ?? 99 }))
    .sort((x, y) => Math.abs(y.d.delta) - Math.abs(x.d.delta) || x.week - y.week);
  if (!rows.some((r) => r.d.delta !== 0)) return null;
  const max = Math.max(1, ...rows.flatMap((r) => [r.was ?? 0, r.now ?? 0]));
  const W = 320, left = 14, right = 40, x = (h: number) => left + (h / max) * (W - left - right);
  return <figure className="dumbbell" data-demo-id="hours-dumbbell">
    <figcaption>Contact hours per topic: {beforeLabel} as an open dot, {afterLabel} as a filled dot, the largest change first. The table below holds the same numbers.</figcaption>
    <ol className="dumbbell-rows">{rows.map(({ d, was, now }) => {
      const label = (d.title || "Untitled topic") + ": " + (was === null ? "not in " + beforeLabel : was + " h") + " to " + (now === null ? "not in " + afterLabel : now + " h") + ", " + hoursDelta(d.delta);
      const changed = d.delta !== 0;
      return <li key={d.id} className={changed ? "is-changed" : undefined}>
        <span className="dumbbell-label">{d.title || "Untitled topic"}</span>
        <svg viewBox={"0 0 " + W + " 26"} className="dumbbell-svg" role="img" aria-label={label}>
          <line x1={left} x2={W - right} y1={13} y2={13} stroke="var(--border)" strokeWidth={1} />
          {changed ? <line x1={x(was ?? 0)} x2={x(now ?? 0)} y1={13} y2={13} stroke="var(--emerald)" strokeWidth={4} /> : null}
          {was !== null ? <circle cx={x(was)} cy={13} r={6} fill="var(--white)" stroke={changed ? "var(--emerald)" : "var(--ink-2)"} strokeWidth={2.5} /> : null}
          {now !== null ? <circle cx={x(now)} cy={13} r={6} fill={changed ? "var(--emerald)" : "var(--ink-2)"} /> : null}
          {changed ? <text x={x(Math.max(was ?? 0, now ?? 0)) + 10} y={17} fontSize={12} fill="var(--ink)" className="tabular">{(was ?? 0) + " to " + (now ?? 0) + " h"}</text>
            : <text x={x(now ?? was ?? 0) + 10} y={17} fontSize={12} fill="var(--ink-2)" className="tabular">{(now ?? was) + " h"}</text>}
        </svg>
      </li>;
    })}</ol>
  </figure>;
}

/** Two versions of one slide in one frame (pattern 5): a swipe, the earlier on the left of the divider and the later on the
 *  right, or an onion skin, the later faded over the earlier. A slider moves it by keyboard (arrow keys, Home, End); a click
 *  on the slide puts the divider there; Show before and Show after need no dragging (WCAG 2.5.7). Nothing animates. */
export function SlideCompare({ before, after, number, beforeLabel, afterLabel, markSrc }: { before: PreviewSlide; after: PreviewSlide; number: number; beforeLabel: string; afterLabel: string; markSrc?: string }) {
  const [mode, setMode] = useState<"swipe" | "fade">("swipe");
  const [value, setValue] = useState(50); // how much of the earlier version shows, from 0 to 100
  const stage = useRef<HTMLDivElement>(null);
  const valueText = value === 100 ? "Showing " + beforeLabel : value === 0 ? "Showing " + afterLabel
    : mode === "swipe" ? beforeLabel + " on the left " + value + "%, " + afterLabel + " on the right" : afterLabel + " faded in to " + (100 - value) + "%";
  const place = (clientX: number) => { const r = stage.current?.getBoundingClientRect(); if (r && r.width) setValue(Math.max(0, Math.min(100, Math.round(((clientX - r.left) / r.width) * 100)))); };
  // The slider sits under what it moves: in a swipe its thumb is the divider (the earlier version to its left), in an onion
  // skin it is how far the later version has faded in, so moving right shows more of the later one.
  const swipe = mode === "swipe";
  return <div className="slide-compare" data-demo-id="slide-compare">
    <div className="button-row">
      <Segmented label="How to compare the two" value={mode} onChange={setMode} options={[{ value: "swipe", label: "Swipe" }, { value: "fade", label: "Onion skin" }]} />
      <Button variant="quiet" onClick={() => setValue(100)}>Show before</Button>
      <Button variant="quiet" onClick={() => setValue(0)}>Show after</Button>
    </div>
    <div className="slide-compare-stage" ref={stage} onClick={(e) => (swipe ? place(e.clientX) : undefined)}
      onPointerMove={(e) => { if (swipe && e.buttons === 1) place(e.clientX); }}>
      <div className="slide-compare-layer"><SlideSvg slide={before} number={number} markSrc={markSrc} /></div>
      <div className="slide-compare-layer" aria-hidden="true" style={swipe ? { clipPath: "inset(0 0 0 " + value + "%)" } : { opacity: (100 - value) / 100 }}>
        <SlideSvg slide={after} number={number} markSrc={markSrc} /></div>
      {swipe ? <>
        <span className="slide-compare-divider" style={{ left: value + "%" }} aria-hidden="true" />
        <span className="slide-compare-tag is-before" aria-hidden="true">{beforeLabel}</span>
        <span className="slide-compare-tag is-after" aria-hidden="true">{afterLabel}</span>
      </> : null}
    </div>
    {swipe ? null : <div className="slide-compare-label" aria-hidden="true"><span>{beforeLabel}</span><span>{afterLabel}</span></div>}
    <input type="range" min={0} max={100} step={5} value={swipe ? value : 100 - value} onChange={(e) => setValue(swipe ? Number(e.target.value) : 100 - Number(e.target.value))}
      aria-label={swipe ? "Where the divider sits on slide " + number + ": " + beforeLabel + " to its left, " + afterLabel + " to its right" : "How far " + afterLabel + " has faded in over " + beforeLabel + " on slide " + number}
      aria-valuetext={valueText} className="slide-compare-range" />
    <p className="muted" aria-live="polite">{valueText}.</p>
  </div>;
}

/** One stop on the version scrubber: a named version, who saved it and when, and its change against the stop before it. */
export interface VersionStop { id: string; name: string; who: string; when: string; summary: string | null }

/** The course's versions as named stops on a scrubber (pattern 7): a slider role with keyboard steps, a button for each stop,
 *  the stop's name, who and when announced, its change against the previous stop, and a link to its entry. No autoplay. */
export function VersionScrubber({ stops, onOpen }: { stops: VersionStop[]; onOpen: (id: string) => void }) {
  const [at, setAt] = useState(stops.length - 1);
  const id = useId();
  const stop = stops[Math.min(at, stops.length - 1)];
  if (stops.length < 2 || !stop) return null;
  return <div className="version-scrubber" data-demo-id="version-scrubber">
    <label htmlFor={id} className="field-label">The versions, oldest to newest</label>
    <input id={id} type="range" min={0} max={stops.length - 1} step={1} value={at} onChange={(e) => setAt(Number(e.target.value))}
      aria-valuetext={stop.name + ", saved by " + stop.who + " on " + stop.when} className="version-range" />
    <ol className="version-ticks">{stops.map((s, i) => <li key={s.id}>
      <button type="button" className="version-tick" aria-pressed={i === at} title={s.who + ", " + s.when} onClick={() => setAt(i)}>{s.name}</button></li>)}</ol>
    <div className="version-stop" aria-live="polite">
      <p><strong>{stop.name}</strong> <span className="muted">saved by {stop.who} on {stop.when}</span></p>
      <p>{stop.summary === null ? "The first version on record." : stop.summary === "no change" ? "Nothing changed against the version before it." : "Against the version before it: " + stop.summary + "."}</p>
      <Button variant="quiet" onClick={() => onOpen(stop.id)}>Open {stop.name} below</Button>
    </div>
  </div>;
}

/** Each outcome's result from last term to this (pattern 4): one line an outcome, every end labelled in text, the lines grey
 *  and the chosen one emphasised, and an outcome reworded between the terms drawn broken and labelled not comparable; the
 *  table beneath carries the same numbers and the change in points. */
export function Slopegraph({ rows, beforeLabel, afterLabel, caption }: { rows: ResultDelta[]; beforeLabel: string; afterLabel: string; caption: string }) {
  const comparable = rows.filter((r) => r.comparable && r.points !== null);
  const [chosen, setChosen] = useState<string | null>(() => comparable.sort((a, b) => Math.abs(b.points!) - Math.abs(a.points!))[0]?.cloId ?? null);
  const W = 620, H = 300, top = 34, bottom = 18, x0 = 170, x1 = 380;
  const y = (s: number) => top + (1 - s) * (H - top - bottom);
  const placed = (side: "before" | "after") => {
    const items = rows.filter((r) => r[side] !== null).map((r) => ({ id: r.cloId, y: y(r[side]!) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 16) items[i].y = items[i - 1].y + 16;
    return new Map(items.map((i) => [i.id, i.y]));
  };
  const at0 = placed("before"), at1 = placed("after");
  const drawn = rows.filter((r) => r.before !== null && r.after !== null);
  return <figure className="slopegraph" data-demo-id="results-slopegraph">
    <figcaption>{caption}</figcaption>
    <svg viewBox={"0 0 " + W + " " + H} className="slopegraph-svg" role="img"
      aria-label={caption + ". " + rows.map((r) => r.label + ": " + pctText(r.before) + " to " + pctText(r.after) + (r.comparable ? "" : ", " + r.reason)).join("; ") + "."}>
      <text x={x0} y={16} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">{beforeLabel}</text>
      <text x={x1} y={16} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">{afterLabel}</text>
      <line x1={x0} x2={x0} y1={top - 6} y2={H - bottom} stroke="var(--border)" />
      <line x1={x1} x2={x1} y1={top - 6} y2={H - bottom} stroke="var(--border)" />
      {drawn.map((r) => {
        const on = r.cloId === chosen, ya = y(r.before!), yb = y(r.after!);
        const colour = on ? "var(--emerald)" : "var(--ink-2)";
        // A reworded outcome is drawn broken: two stubs with a gap where the comparison would be.
        const line = r.comparable
          ? <line x1={x0} y1={ya} x2={x1} y2={yb} stroke={colour} strokeWidth={on ? 4 : 2} />
          : <g stroke="var(--ink-2)" strokeWidth={2} strokeDasharray="5 5"><line x1={x0} y1={ya} x2={x0 + (x1 - x0) * 0.35} y2={ya + (yb - ya) * 0.35} /><line x1={x0 + (x1 - x0) * 0.65} y1={ya + (yb - ya) * 0.65} x2={x1} y2={yb} /></g>;
        return <g key={r.cloId}>
          {line}
          <circle cx={x0} cy={ya} r={4.5} fill={colour} /><circle cx={x1} cy={yb} r={4.5} fill={colour} />
          <text x={x0 - 10} y={(at0.get(r.cloId) ?? ya) + 4} textAnchor="end" fontSize={12.5} fill="var(--ink)" fontWeight={on ? 700 : 400} className="tabular">{r.label + " " + pctText(r.before)}</text>
          <text x={x1 + 10} y={(at1.get(r.cloId) ?? yb) + 4} textAnchor="start" fontSize={12.5} fill="var(--ink)" fontWeight={on ? 700 : 400} className="tabular">{pctText(r.after) + " " + r.label + (r.comparable ? "" : ", not comparable")}</text>
        </g>;
      })}
    </svg>
    <table className="record-table slope-table">
      <caption>The same numbers; choose an outcome to emphasise its line</caption>
      <thead><tr><th scope="col">Outcome</th><th scope="col">{beforeLabel}</th><th scope="col">{afterLabel}</th><th scope="col">Change</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.cloId} className={r.cloId === chosen ? "is-chosen" : undefined}>
        <th scope="row" data-label="Outcome">{r.comparable ? <button type="button" className="link-button" aria-pressed={r.cloId === chosen} onClick={() => setChosen(r.cloId)}>{r.label}</button> : r.label}</th>
        <td data-label={beforeLabel} className="tabular">{pctOne(r.before)}</td><td data-label={afterLabel} className="tabular">{pctOne(r.after)}</td>
        <td data-label="Change">{r.comparable && r.points !== null ? (r.points > 0 ? "+" : "") + r.points + " points" : r.reason}</td></tr>)}</tbody>
    </table>
  </figure>;
}
