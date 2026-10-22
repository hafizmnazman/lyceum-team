// The loop's components (plan Section 6.6): the receipts ring, the denominator
// meter, the waffle, the skill card, the source pane, the Report sub-rail, the
// decision card and the handoff card. All colour comes from the token variables;
// every state a colour shows is also said in words.

import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { LOOP_STEPS, REPORT_TABS, REPORT_TAB_LABEL, RING_STEPS, ringTermLines, stepDef, type CourseStep, type LoopState, type ReportTab } from "../../app/loop.ts";
import { OUTCOME_LABEL } from "../../lib/decisions.ts";
import { locateExcerpt, normaliseWhitespace, STAGE_LABEL, type SkillRow } from "../../lib/evidence.ts";
import type { BriefDecision, EvidenceSource } from "../../types.ts";
import { Button, Tag } from "./index.tsx";
import { ShareBar } from "./ShareBar.tsx";

const pct = (x: number | null) => (x === null ? "Unknown" : Math.round(x * 1000) / 10 + "%");

// ---------- the receipts ring (Section 8) ----------

/** Course plus the six steps as one ring. A segment fills only when its record exists this term; the next
 *  step is drawn lit and named. The ring is an image with a full text equivalent beside or inside it. */
export function Ring({ loop, size = 132, compact = false, leaf }: { loop: LoopState; size?: number; compact?: boolean; leaf?: ReactNode }) {
  const w = Math.max(6, Math.round(size * 0.11));
  const r = size / 2 - w / 2 - 2, c = size / 2;
  const n = RING_STEPS.length, gap = 5;
  const arc = (i: number) => {
    const a0 = -90 + (360 / n) * i + gap / 2, a1 = -90 + (360 / n) * (i + 1) - gap / 2;
    const p = (a: number) => [c + r * Math.cos((a * Math.PI) / 180), c + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return "M" + x0.toFixed(2) + " " + y0.toFixed(2) + " A" + r + " " + r + " 0 0 1 " + x1.toFixed(2) + " " + y1.toFixed(2);
  };
  const done = loop.steps.filter((s) => RING_STEPS.includes(s.id) && s.done).length;
  const label = "The loop for this course, " + (loop.window.term || "term not set") + ": " + done + " of " + n + " done" + (loop.next ? "; next, " + stepDef(loop.next).label : "; closed") + ".";
  return (
    <svg className="ring" viewBox={"0 0 " + size + " " + size} width={size} height={size} role="img" aria-label={label}>
      <title>{label}</title>
      {RING_STEPS.map((id, i) => {
        const st = loop.steps.find((s) => s.id === id)!;
        const isNext = loop.next === id;
        return <g key={id}>
          <path d={arc(i)} fill="none" stroke={st.done ? "var(--emerald)" : isNext ? "var(--moods)" : "var(--tint-2)"} strokeWidth={w} strokeLinecap="butt" />
          {isNext ? <path d={arc(i)} fill="none" stroke="var(--emerald-text)" strokeWidth={2} strokeDasharray="3 3" /> : null}
        </g>;
      })}
      {compact ? null : (() => {
        const lines = ringTermLines(loop.window.term || "Term not set", Math.floor((size - 2 * (w + 6)) / 7.4));
        return <>
          <text x={c} y={lines.length > 1 ? c - 9 : c - 4} textAnchor="middle" className="ring-count">{done} of {n}</text>
          {lines.map((line, i) => <text key={i} x={c} y={(lines.length > 1 ? c + 8 : c + 14) + i * 14} textAnchor="middle" className="ring-term">{line}</text>)}
        </>;
      })()}
      {leaf}
    </svg>
  );
}

/** The ring with its words: each step, done or next, with its count, the ring's text equivalent. */
export function RingPanel({ loop, onStep, size = 132 }: { loop: LoopState; onStep?: (step: CourseStep) => void; size?: number }) {
  return (
    <div className="ring-panel">
      <Ring loop={loop} size={size} />
      <div className="ring-legend">
        <ol className="ring-steps">
          {RING_STEPS.map((id) => {
            const st = loop.steps.find((s) => s.id === id)!, def = stepDef(id), isNext = loop.next === id;
            return <li key={id} className={st.done ? "is-done" : isNext ? "is-next" : ""}>
              <span className="ring-mark" aria-hidden>{st.done ? <Check size={12} strokeWidth={3} /> : def.number ?? "S"}</span>
              {onStep ? <button type="button" className="ring-step-link" onClick={() => onStep(id)}>{def.label}</button> : <span>{def.label}</span>}
              <span className="ring-step-status">{st.done ? "Done" : isNext ? "Next" : ""}</span>
              <span className="muted ring-step-count">{st.note ?? st.count}</span>
            </li>;
          })}
        </ol>
      </div>
    </div>
  );
}

// ---------- the denominator and the budget (Meter) ----------

export function Meter({ value, max, label, note, over }: { value: number; max: number; label: ReactNode; note?: ReactNode; over?: boolean }) {
  const share = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className={"meter" + (over ? " is-over" : "")} data-demo-id="meter">
      <div className="meter-label">{label}</div>
      <div className="meter-track" role="img" aria-label={value + " of " + max}>
        <div className="meter-fill" style={{ width: Math.round(share * 1000) / 10 + "%" }} />
      </div>
      {note ? <div className="meter-note muted">{note}</div> : null}
    </div>
  );
}

// ---------- the waffle (Section 6.5): one cell per reviewed posting ----------

export const WAFFLE_MAX = 200;
/** The honest proportion chart for small denominators: the grid is the denominator, rows of ten, and the filled
 *  cells are the postings that quote the skill. Above WAFFLE_MAX cells the share bar stands in. */
export function Waffle({ total, filled, label }: { total: number; filled: number; label: string }) {
  if (total <= 0) return <p className="muted">No reviewed posting yet, so there is no denominator.</p>;
  if (total > WAFFLE_MAX) return null;
  return (
    <div className="waffle" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={i < filled ? "waffle-cell is-filled" : "waffle-cell"} />)}
    </div>
  );
}

// ---------- a skill, counted ----------

export function SkillCard({ row, eligible, onMap }: { row: SkillRow; eligible: number; onMap?: () => void }) {
  const interval = row.interval ? pct(row.interval.low) + " to " + pct(row.interval.high) : "unknown";
  return (
    <article className="skill-card" data-demo-id={"skill-card-" + row.key}>
      <div className="skill-card-head">
        <h4>{row.skill}</h4>
        <span className="muted">{row.required} required · {row.preferred} preferred{row.unclear ? " · " + row.unclear + " unclear" : ""}</span>
      </div>
      <p className="skill-card-count"><strong className="tabular">{row.postings} of {eligible}</strong> reviewed postings quote it: {pct(row.share)}, 95% interval {interval}.</p>
      <ShareBar share={row.share} low={row.interval?.low ?? null} high={row.interval?.high ?? null} width={220} />
      <Waffle total={eligible} filled={row.postings} label={row.postings + " of " + eligible + " reviewed postings quote " + row.skill} />
      <p className="muted skill-card-foot">{row.organisations.length} {row.organisations.length === 1 ? "employer" : "employers"} · coverage {STAGE_LABEL[row.stage].toLowerCase()}, target {STAGE_LABEL[row.target].toLowerCase()}</p>
      {onMap ? <Button onClick={onMap} aria-label={"Map " + row.skill}>Map this skill <ArrowRight size={15} /></Button> : null}
    </article>
  );
}

// ---------- the source beside its proposed quotation ----------

/** The posting text with the proposed sentence highlighted and the skill's term inside it in bold, so the
 *  lecturer judges the quotation against its source, not on its own. */
export function SourcePane({ source, excerpt, term }: { source: EvidenceSource; excerpt: string; term?: string }) {
  const located = locateExcerpt(source.text, excerpt);
  const text = located.ok && located.match === "whitespace" ? normaliseWhitespace(source.text) : source.text;
  const window = 280;
  let body: ReactNode = text;
  if (located.ok) {
    const from = Math.max(0, located.start - window), to = Math.min(text.length, located.end + window);
    const quote = text.slice(located.start, located.end);
    const parts = term ? quote.split(new RegExp("(" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i")) : [quote];
    body = <>{from > 0 ? "... " : ""}{text.slice(from, located.start)}<mark className="source-mark">{parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>))}</mark>{text.slice(located.end, to)}{to < text.length ? " ..." : ""}</>;
  }
  return (
    <figure className="source-pane">
      <figcaption>
        <strong>{source.title}</strong>
        <span className="muted">{source.organisation || "Organisation not named"} · {source.sourceDate ? "published " + source.sourceDate : "publication date not supplied"}{source.url ? <> · <a href={source.url} target="_blank" rel="noreferrer">open the posting</a></> : null}</span>
      </figcaption>
      <div className="source-pane-text">{body}</div>
      {located.ok ? null : <p className="form-error">This sentence is not in the saved source text, so it cannot be confirmed.</p>}
    </figure>
  );
}

// ---------- the Report sub-rail ----------

export function SubRail({ active, onSelect, done }: { active: ReportTab; onSelect: (tab: ReportTab) => void; done?: Partial<Record<ReportTab, boolean>> }) {
  return (
    <div className="sub-rail" role="tablist" aria-label="Report sub-steps">
      {REPORT_TABS.map((tab, index) => (
        <button key={tab} type="button" role="tab" id={"subrail-tab-" + tab} aria-controls={"subrail-panel-" + tab} aria-selected={active === tab} tabIndex={active === tab ? 0 : -1}
          className="sub-rail-tab" data-demo-id={"subrail-" + tab}
          onClick={() => onSelect(tab)}
          onKeyDown={(e) => {
            const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
            if (!keys.includes(e.key)) return;
            e.preventDefault();
            const next = e.key === "Home" ? 0 : e.key === "End" ? REPORT_TABS.length - 1 : (index + (e.key === "ArrowRight" ? 1 : -1) + REPORT_TABS.length) % REPORT_TABS.length;
            onSelect(REPORT_TABS[next]);
            document.getElementById("subrail-tab-" + REPORT_TABS[next])?.focus();
          }}>
          <span className="sub-rail-num tabular">{index + 1}</span>{REPORT_TAB_LABEL[tab]}{done?.[tab] ? <Check size={14} strokeWidth={2.5} aria-label="done" /> : null}
        </button>
      ))}
    </div>
  );
}

// ---------- a decision, as recorded ----------

export function DecisionCard({ decision, name, self, amended, evidenceChanged, superseded }: { decision: BriefDecision; name: string; self: boolean; amended?: boolean; evidenceChanged?: boolean; superseded?: boolean }) {
  return (
    <article className={"decision-card" + (amended ? " is-amended" : "")} data-demo-id={"decision-" + decision.id}>
      <div className="decision-card-head">
        <strong>{OUTCOME_LABEL[decision.outcome]}</strong>
        <span className="button-row">
          {self ? <Tag tone="warn">Self-recorded by the author</Tag> : null}
          {amended ? <Tag>Amended by a later record</Tag> : null}
          {evidenceChanged ? <Tag tone="warn">Evidence changed since</Tag> : null}
          {superseded ? <Tag>On a superseded brief</Tag> : null}
        </span>
      </div>
      <p className="decision-card-note preserve-lines">{decision.note}</p>
      <p className="muted decision-card-meta"><span className="mono">{decision.at.slice(0, 16).replace("T", " ")}</span> · {name} · term {decision.term || "not set"} · course version <span className="mono">{decision.courseVersionId}</span></p>
    </article>
  );
}

// ---------- the handoff to the next step (Section 4.1) ----------

export function Handoff({ step, record, onNext }: { step: CourseStep; record: string; onNext?: () => void }) {
  const def = stepDef(step);
  const nextIndex = LOOP_STEPS.findIndex((s) => s.id === step) + 1;
  const next = LOOP_STEPS[nextIndex];
  return (
    <aside className="handoff" data-demo-id={"handoff-" + step}>
      <span className="handoff-mark" aria-hidden><Check size={24} strokeWidth={3} /></span>
      <p><strong>{record}</strong> {def.handoff}</p>
      {onNext && next && next.id !== "history" ? <Button variant="primary" onClick={onNext}>Go to {next.label} <ArrowRight size={15} /></Button> : null}
    </aside>
  );
}
