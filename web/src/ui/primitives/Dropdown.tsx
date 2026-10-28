// The custom dropdown: a button that opens a list of options, styled like the rest of the app instead of the browser's
// own menu. It keeps what a native select gives: a label that points at it (Field passes its id), the arrow keys, Home
// and End, Enter or Space to choose, Escape to close, a letter to jump to the option it starts, and a listbox a screen
// reader announces with the option in focus. Clicking outside closes it. Use it where the look matters; the native
// Select stays where the tour and the smokes drive a select by its value.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export function Dropdown<T extends string>({ options, value, onChange, placeholder = "Choose one", id, invalid, ...aria }: {
  options: Array<{ value: T; label: string }>; value: T | ""; onChange: (value: T) => void; placeholder?: string; id?: string; invalid?: boolean;
  "aria-describedby"?: string; "aria-invalid"?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0); // the option in focus while the list is open
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const chosen = options.findIndex((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  useEffect(() => { if (open) document.getElementById(listId + "-" + active)?.scrollIntoView({ block: "nearest" }); }, [open, active, listId]);

  const show = () => { setActive(chosen >= 0 ? chosen : 0); setOpen(true); };
  const pick = (i: number) => { onChange(options[i].value); setOpen(false); trigger.current?.focus(); };
  function onKey(e: KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    if (e.key === "Escape" || e.key === "Tab") { if (e.key === "Escape") e.preventDefault(); setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(last, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(last); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(active); }
    else if (e.key.length === 1) {
      const at = options.findIndex((o, i) => i > active && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      const first = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (at >= 0 || first >= 0) setActive(at >= 0 ? at : first);
    }
  }

  return (
    <div ref={root} className={"dropdown" + (open ? " is-open" : "")}>
      <button ref={trigger} type="button" id={id} className={"control dropdown-trigger" + (chosen < 0 ? " is-empty" : "")}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? listId + "-" + active : undefined}
        aria-describedby={aria["aria-describedby"]} aria-invalid={invalid || aria["aria-invalid"] || undefined}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        <span>{chosen >= 0 ? options[chosen].label : placeholder}</span>
        <ChevronDown size={18} aria-hidden className="dropdown-chevron" />
      </button>
      {open ? <ul id={listId} role="listbox" className="dropdown-list" tabIndex={-1}>
        {options.map((o, i) => <li key={o.value} id={listId + "-" + i} role="option" aria-selected={i === chosen}
          className={"dropdown-option" + (i === active ? " is-active" : "") + (i === chosen ? " is-chosen" : "")}
          onPointerEnter={() => setActive(i)} onPointerDown={(e) => e.preventDefault()} onClick={() => pick(i)}>
          <span>{o.label}</span>{i === chosen ? <Check size={16} aria-hidden /> : null}
        </li>)}
      </ul> : null}
    </div>
  );
}
