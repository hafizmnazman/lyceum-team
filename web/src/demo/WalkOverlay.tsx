// The guided walk on screen (depth plan Section 9.1 item 2): a spotlight on the stop's element, the app's caption with its
// honesty label, and Tualang's corner card, which speaks only at a walk's first stop and its last and otherwise holds the
// stop number and the controls. Next, Back and Escape move it; nothing moves by itself, and the page stays usable under the
// spotlight. The walk starts from the sample workspace, the tour's end state, restored the way a backup is, with the current
// workspace kept as the recovery copy.

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { getState, restoreSampleWorkspace, setClockPinned } from "../app/store.ts";
import { Mascot } from "../ui/mascots/index.tsx";
import { Button, Tag } from "../ui/primitives/index.tsx";
import { runWalk } from "./runner.ts";
import { kioskOn } from "./kiosk.ts";
import { hasSavedWork } from "./savedWork.ts";
import { BEFORE_AFTER, SAMPLE_WORKSPACE_URL, WALK, WALK_PERSON, type WalkStop } from "./walk.ts";

export const WALKS = { loop: WALK, change: BEFORE_AFTER } as const;
export type WalkName = keyof typeof WALKS;

/** Start a walk from anywhere: the judge's page, the Guide page and the kiosk call this. */
export function startWalk(which: WalkName) {
  window.dispatchEvent(new CustomEvent<WalkName>("lyceum:walk", { detail: which }));
}

/** End a running walk as Esc would: the kiosk's idle return calls this. */
export function endWalk() {
  window.dispatchEvent(new Event("lyceum:walk-end"));
}

type Phase = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string }
  | { kind: "walking"; stops: WalkStop[]; index: number; el: HTMLElement | null };

export function WalkOverlay() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const running = useRef(false);
  const aborted = useRef(false);
  const resolver = useRef<((c: "next" | "back" | "end") => void) | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const choose = (c: "next" | "back" | "end") => {
    if (c === "end") aborted.current = true;
    const resolve = resolver.current;
    resolver.current = null;
    resolve?.(c);
  };

  useEffect(() => {
    async function onWalk(e: Event) {
      if (running.current) return;
      const which = (e as CustomEvent<WalkName>).detail ?? "loop";
      // At the booth's kiosk the workspace is the sample from the visitor before, so the walk does not ask; the recovery copy is still kept.
      if (!kioskOn() && hasSavedWork(getState()) && !window.confirm("The walk opens the sample workspace, the tour's end state. Your current workspace is kept as a recovery copy under Guide & progress, Backups. Continue?")) return;
      running.current = true;
      setPhase({ kind: "loading" });
      try {
        const res = await fetch(SAMPLE_WORKSPACE_URL);
        if (!res.ok) throw new Error("the sample workspace answered " + res.status);
        const restored = restoreSampleWorkspace(await res.text(), WALK_PERSON);
        if (!restored.ok) throw new Error(restored.error);
      } catch (err) {
        running.current = false;
        setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
        return;
      }
      aborted.current = false;
      setClockPinned(true); // the sample's own moment, as the tour pins it
      const stops = WALKS[which];
      await runWalk(stops, {
        show: (index, el) => setPhase({ kind: "walking", stops, index, el }),
        choice: () => new Promise((resolve) => { resolver.current = resolve; }),
        shouldAbort: () => aborted.current,
      });
      setClockPinned(false);
      running.current = false;
      setRect(null);
      setPhase({ kind: "idle" });
    }
    const onEnd = () => choose("end");
    window.addEventListener("lyceum:walk", onWalk);
    window.addEventListener("lyceum:walk-end", onEnd);
    return () => { window.removeEventListener("lyceum:walk", onWalk); window.removeEventListener("lyceum:walk-end", onEnd); };
  }, []);

  // The spotlight follows its element through scrolling, resizing and late renders.
  const el = phase.kind === "walking" ? phase.el : null;
  useEffect(() => {
    if (!el) { setRect(null); return; }
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [el]);

  // Next, Back and Escape from the keyboard; typing in a field is left alone.
  const walking = phase.kind === "walking";
  useEffect(() => {
    if (!walking) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "Escape") choose("end");
      else if (e.key === "ArrowRight") choose("next");
      else if (e.key === "ArrowLeft") choose("back");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walking]);

  const index = phase.kind === "walking" ? phase.index : -1;
  useEffect(() => { if (index >= 0) nextRef.current?.focus({ preventScroll: true }); }, [index]);

  if (phase.kind === "idle") return null;
  if (phase.kind === "loading") return <div className="walk-card walk-card-alone" role="status">Opening the sample workspace for the walk.</div>;
  if (phase.kind === "error") return <div className="walk-card walk-card-alone" role="alert">
    <p>The walk could not start: {phase.message}. The tour and the workspace still work.</p>
    <Button onClick={() => setPhase({ kind: "idle" })}>Close</Button>
  </div>;

  const stop = phase.stops[phase.index], last = phase.index === phase.stops.length - 1, first = phase.index === 0;
  return <>
    {rect ? <div className="walk-spotlight" aria-hidden="true" style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }} /> : null}
    <div className="walk-dock">
    <div className="walk-caption" role="status" aria-live="polite" data-demo-id="walk-caption">
      {stop.label ? <Tag tone="warn">{stop.label}</Tag> : null}
      <span>{stop.caption}</span>
      {!phase.el ? <span className="muted"> This part is not on the screen.</span> : null}
    </div>
    <section className="walk-card" aria-label="The guided walk" data-demo-id="walk-card">
      <div className="walk-card-host">
        <Mascot who="host" mood={first ? "greeting" : last && stop.host ? "celebrating" : "resting"} size={56} />
        {stop.host ? <p className="walk-host-line" data-demo-id="walk-host-line">{stop.host}</p> : null}
      </div>
      <p className="walk-count" data-demo-id="walk-count">Stop {phase.index + 1} of {phase.stops.length}</p>
      <div className="button-row">
        <Button onClick={() => choose("back")} disabled={first} data-demo-id="walk-back"><ArrowLeft size={15} /> Back</Button>
        <Button ref={nextRef} variant="primary" onClick={() => choose("next")} data-demo-id="walk-next">{last ? "Finish" : <>Next <ArrowRight size={15} /></>}</Button>
      </div>
      <Button variant="quiet" className="walk-leave" onClick={() => choose("end")} aria-label="Leave the walk" data-demo-id="walk-leave"><X size={15} /></Button>
      <p className="muted walk-keys">Arrow keys move; Esc leaves.</p>
    </section>
    </div>
  </>;
}
