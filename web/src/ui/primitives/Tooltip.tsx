// The custom tooltip: a forest bubble with an arrow, opened by hover after a short delay or at once by keyboard focus,
// closed by leaving, blurring, Escape or a scroll. It is placed above its anchor, below when there is no room, and kept
// inside the window. The trigger is described by it (aria-describedby), so what it says is read out too. It never
// holds a control: anything that needs a click belongs on the page.

import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";

const OPEN_DELAY_MS = 250, GAP = 10, MARGIN = 8;

/** The bubble itself, against an anchor's box in the viewport. Used directly where the anchor is not one element (the ring's segments). */
export function TooltipBubble({ anchor, id, children }: { anchor: DOMRect; id?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; below: boolean; arrow: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight, cx = anchor.left + anchor.width / 2;
    const left = Math.min(window.innerWidth - MARGIN - w, Math.max(MARGIN, cx - w / 2));
    const below = anchor.top - GAP - h < MARGIN;
    setPlace({ left, top: below ? anchor.bottom + GAP : anchor.top - GAP - h, below, arrow: Math.min(w - 14, Math.max(14, cx - left)) });
  }, [anchor.left, anchor.top, anchor.width, anchor.height]);
  return createPortal(
    <div ref={ref} id={id} role="tooltip" className={"tooltip on-forest" + (place?.below ? " is-below" : "") + (place ? " is-placed" : "")}
      style={(place ? { left: place.left, top: place.top, "--arrow-x": place.arrow + "px" } : { left: 0, top: 0, visibility: "hidden" }) as CSSProperties}>
      {children}
    </div>,
    document.body,
  );
}

/** Open and close with the delay, Escape and scroll handled; for anchors that are not one wrapped element. */
export function useTooltipAnchor<T>() {
  const [tip, setTip] = useState<{ key: T; rect: DOMRect } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const open = (key: T, el: Element, now = false) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTip({ key, rect: el.getBoundingClientRect() }), now ? 0 : OPEN_DELAY_MS);
  };
  const close = () => { window.clearTimeout(timer.current); setTip(null); };
  useEffect(() => {
    if (!tip) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", close, true); };
  }, [tip]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { tip, open, close };
}

type Handlers = { onPointerEnter?: (e: SyntheticEvent) => void; onPointerLeave?: (e: SyntheticEvent) => void; onFocus?: (e: SyntheticEvent) => void; onBlur?: (e: SyntheticEvent) => void; "aria-describedby"?: string };

/** Wrap one element: <Tooltip content="Notifications, 2 unread"><button …/></Tooltip>. */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactElement<Handlers> }) {
  const id = useId();
  const { tip, open, close } = useTooltipAnchor<true>();
  const p = children.props;
  return <>
    {cloneElement(children, {
      onPointerEnter: (e) => { p.onPointerEnter?.(e); open(true, e.currentTarget as Element); },
      onPointerLeave: (e) => { p.onPointerLeave?.(e); close(); },
      onFocus: (e) => { p.onFocus?.(e); if ((e.currentTarget as Element).matches(":focus-visible")) open(true, e.currentTarget as Element, true); },
      onBlur: (e) => { p.onBlur?.(e); close(); },
      "aria-describedby": [p["aria-describedby"], tip ? id : null].filter(Boolean).join(" ") || undefined,
    })}
    {tip ? <TooltipBubble anchor={tip.rect} id={id}>{content}</TooltipBubble> : null}
  </>;
}
