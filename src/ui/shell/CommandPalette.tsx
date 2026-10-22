// The command palette (Ctrl+K): jump to any screen, subject, or person action.
// Real app furniture (spec 6.1); also a fast path for power users and the demo.

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft } from "lucide-react";
import type { Screen } from "../../app/roles.ts";
import { navFor, subjectsForPerson } from "../../app/roles.ts";
import {
  currentPerson,
  navigate,
  resetWorkspace,
  selectSubject,
  switchUser,
  useStore,
} from "../../app/store.ts";
import { NAV_META } from "./nav.ts";

interface Command {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

export function CommandPalette(props: { onClose: () => void }) {
  const state = useStore();
  const person = currentPerson();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  const commands = useMemo<Command[]>(() => {
    if (!person) return [];
    const nav = navFor(person, state.assignments);
    const out: Command[] = nav
      .filter((s): s is Exclude<Screen, "login"> => s !== "login")
      .map((s) => ({
        id: `nav-${s}`,
        label: NAV_META[s].label,
        hint: "Go to",
        run: () => navigate(s),
      }));
    const own = subjectsForPerson(person.id, state.assignments);
    for (const subject of state.subjects.filter((s) => nav.includes("studio") && own.includes(s.id))) {
      out.push({
        id: `subj-${subject.id}`,
        label: `${subject.id} ${subject.title}`,
        hint: "Open in Studio",
        run: () => {
          selectSubject(subject.id);
          navigate("studio");
        },
      });
    }
    for (const p of state.people) {
      out.push({
        id: `person-${p.id}`,
        label: `Switch to ${p.name}`,
        hint: "Account",
        run: () => switchUser(p.id),
      });
    }
    out.push({
      id: "reset",
      label: "Reset workspace",
      hint: "Restore the seed data",
      run: () => { if (window.confirm("Reset this browser's workspace and remove saved plans, drafts and uploads? Export any teaching plan you want to keep first.")) resetWorkspace(); },
    });
    return out;
  }, [person, state.assignments, state.subjects, state.people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 12);
    return commands.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 12);
  }, [commands, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  function runAt(i: number) {
    const cmd = filtered[i];
    if (!cmd) return;
    cmd.run();
    props.onClose();
  }

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--scrim)",
        zIndex: 90,
        display: "flex",
        justifyContent: "center",
        paddingTop: "14vh",
      }}
    >
      <div
        ref={dialogRef}
        className="fade-up"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={(event) => {
          if (event.key === "Escape") props.onClose();
          if (event.key !== "Tab") return;
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>("input, button");
          if (!controls?.length) return;
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
        style={{
          width: 560,
          maxWidth: "90vw",
          alignSelf: "flex-start",
          background: "var(--white)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--depth-menu)",
          overflow: "hidden",
        }}
      >
        <input
          aria-label="Search screens, courses or people"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") props.onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, filtered.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            }
            if (e.key === "Enter") runAt(cursor);
          }}
          placeholder="Search screens, subjects, people"
          style={{
            width: "100%",
            height: 48,
            padding: "0 16px",
            border: "none",
            borderBottom: "1px solid var(--border)",
            fontSize: 16,
            background: "var(--white)",
          }}
        />
        <div style={{ maxHeight: 360, overflowY: "auto", padding: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 16, color: "var(--ink-2)", fontSize: 13 }}>
              Nothing matches "{query}".
            </div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.id}
                onMouseEnter={() => setCursor(i)}
                onClick={() => runAt(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 12px",
                  border: "none",
                  borderRadius: "var(--radius-chip)",
                  background: i === cursor ? "var(--tint-2)" : "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--ink)",
                  textAlign: "left",
                }}
              >
                <ArrowRight size={14} color="var(--ink-2)" />
                <span style={{ flex: 1 }}>{c.label}</span>
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{c.hint}</span>
                {i === cursor ? <CornerDownLeft size={13} color="var(--ink-2)" /> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
