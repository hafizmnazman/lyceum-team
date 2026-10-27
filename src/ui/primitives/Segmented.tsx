// The sliding selection: one background shared by a row of options that glides to the chosen one, instead of each
// option switching its own fill. useSlider measures the selected option (aria-selected or aria-pressed) inside a
// container and hands its place and size to CSS (.slider in global.css); Segmented is the common case, a row of
// mutually exclusive choices. The first placement does not animate; reduced motion moves it without the glide.

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

export function useSlider<T extends HTMLElement>(selected: unknown) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const on = el.querySelector<HTMLElement>('[aria-selected="true"], [aria-pressed="true"]');
      el.style.setProperty("--slide-x", (on?.offsetLeft ?? 0) + "px");
      el.style.setProperty("--slide-y", (on?.offsetTop ?? 0) + "px");
      el.style.setProperty("--slide-w", (on?.offsetWidth ?? 0) + "px");
      el.style.setProperty("--slide-h", (on?.offsetHeight ?? 0) + "px");
    };
    place();
    // Only glide once the first place is set, so the background never flies in from the corner on load.
    const ready = requestAnimationFrame(() => el.classList.add("is-ready"));
    const resize = new ResizeObserver(place);
    resize.observe(el);
    return () => { cancelAnimationFrame(ready); resize.disconnect(); };
  }, [selected]);
  return ref;
}

/** A row of mutually exclusive options with the sliding selection. As "tabs" it is a tab list (arrow keys move); as
 *  "toggle" it is a group of pressed buttons. */
export function Segmented<T extends string>({ options, value, onChange, label, kind = "toggle", className, idFor }: {
  options: Array<{ value: T; label: ReactNode }>; value: T; onChange: (value: T) => void; label: string;
  kind?: "tabs" | "toggle"; className?: string; idFor?: (value: T) => string;
}) {
  const ref = useSlider<HTMLDivElement>(value);
  const tabs = kind === "tabs";
  const onKey = (e: KeyboardEvent, i: number) => {
    if (!tabs || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const n = options.length, next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    onChange(options[next].value);
    (ref.current?.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <div ref={ref} className={"segmented slider" + (className ? " " + className : "")} role={tabs ? "tablist" : "group"} aria-label={label}>
      {options.map((o, i) => {
        const on = o.value === value;
        return <button key={o.value} type="button" id={idFor?.(o.value)} className={"segmented-option" + (on ? " is-active" : "")}
          {...(tabs ? { role: "tab", "aria-selected": on, tabIndex: on ? 0 : -1 } : { "aria-pressed": on })}
          onClick={() => onChange(o.value)} onKeyDown={(e) => onKey(e, i)}>{o.label}</button>;
      })}
    </div>
  );
}
