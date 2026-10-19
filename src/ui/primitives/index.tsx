// Lyceum v3 UI primitives (spec Section 3). Every screen builds from these so
// the app stays on-system without a per-screen design pass. No ad-hoc hex: all
// colour comes through the CSS variables set in theme/global.css.

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cloneElement, forwardRef, isValidElement, useId } from "react";

// ---------- layout ----------

/** The content column: left-aligned, capped width, generous padding. */
export function Page(props: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className="page-content"
      style={{
        maxWidth: props.wide ? 1320 : 1120,
        padding: "28px 32px 64px",
        margin: 0,
      }}
    >
      {props.children}
    </div>
  );
}

/** Page header: serif title, quiet context line, optional right-side actions.
 *  One per screen; the serif appears here and nowhere else. */
export function PageHead(props: {
  title: string;
  context?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className="page-heading"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div>
        <h1 className="page-title">{props.title}</h1>
        {props.context ? (
          <div style={{ color: "var(--ink-2)", marginTop: 4, maxWidth: 640 }}>
            {props.context}
          </div>
        ) : null}
      </div>
      {props.actions ? (
        <div className="page-heading-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>{props.actions}</div>
      ) : null}
    </div>
  );
}

/** A quiet single section label. Use sparingly (one or two per screen). */
export function SectionLabel(props: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "var(--ink-3)",
        letterSpacing: "0.02em",
        margin: "24px 0 8px",
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}

/** A card is earned: it wraps one actionable object, never used as wallpaper. */
export function Card(props: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  focal?: boolean;
  "data-demo-id"?: string;
}) {
  return (
    <div
      data-demo-id={props["data-demo-id"]}
      onClick={props.onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-m)",
        boxShadow: props.focal ? "var(--shadow-2)" : "var(--shadow-1)",
        padding: props.focal ? 24 : 16,
        cursor: props.onClick ? "pointer" : undefined,
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}

/** A borderless list row with a hairline separator. Lists are rows, not boxes. */
export function Row(props: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  style?: CSSProperties;
  "data-demo-id"?: string;
}) {
  return (
    <div
      data-demo-id={props["data-demo-id"]}
      onClick={props.onClick}
      role={props.onClick ? "button" : undefined}
      tabIndex={props.onClick ? 0 : undefined}
      onKeyDown={
        props.onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); props.onClick?.(); }
            }
          : undefined
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 12px",
        borderBottom: "1px solid var(--border)",
        borderRadius: props.selected ? "var(--radius-s)" : 0,
        background: props.selected ? "var(--accent-soft)" : "transparent",
        cursor: props.onClick ? "pointer" : undefined,
        transition: "background 150ms ease-out",
        ...props.style,
      }}
      onMouseEnter={(e) => {
        if (props.onClick && !props.selected)
          (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        if (props.onClick && !props.selected)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {props.children}
    </div>
  );
}

// ---------- buttons ----------

type ButtonVariant = "primary" | "quiet" | "outline" | "danger";

const buttonBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 40,
  height: "auto",
  padding: "7px 14px",
  borderRadius: "var(--radius-s)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  border: "1px solid transparent",
  transition: "background 150ms ease-out, border-color 150ms ease-out, opacity 150ms",
  whiteSpace: "normal",
};

const buttonStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "var(--accent-ink)",
  },
  quiet: {
    background: "transparent",
    color: "var(--ink-2)",
  },
  outline: {
    background: "var(--surface)",
    color: "var(--ink)",
    borderColor: "var(--border)",
  },
  danger: {
    background: "var(--surface)",
    color: "var(--danger)",
    borderColor: "var(--border)",
  },
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(function Button({ variant = "outline", style, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      style={{
        ...buttonBase,
        ...buttonStyles[variant],
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
      {...rest}
    />
  );
});

// ---------- tags ----------

export function Tag(props: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "ok" | "warn" | "danger";
  style?: CSSProperties;
}) {
  const tone = props.tone ?? "neutral";
  const map = {
    neutral: { bg: "var(--surface-2)", fg: "var(--ink-2)" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    ok: { bg: "var(--ok-soft)", fg: "var(--ok)" },
    warn: { bg: "var(--warn-soft)", fg: "var(--warn)" },
    danger: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  } as const;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: map[tone].bg,
        color: map[tone].fg,
        whiteSpace: "nowrap",
        ...props.style,
      }}
    >
      {props.children}
    </span>
  );
}

// ---------- forms ----------

export function Field(props: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const child = isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(props.children) ? props.children : null;
  const id = child?.props.id ?? generatedId;
  const descriptionId = id + "-description";
  const describedBy = [child?.props["aria-describedby"], props.error || props.hint ? descriptionId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="form-field" style={{ display: "block", marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 }}>{props.label}</label>
      {child ? cloneElement(child, { id, "aria-describedby": describedBy, "aria-invalid": props.error ? true : child.props["aria-invalid"] }) : props.children}
      {props.error ? (
        <div id={descriptionId} style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{props.error}</div>
      ) : props.hint ? (
        <div id={descriptionId} style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{props.hint}</div>
      ) : null}
    </div>
  );
}

const inputBase: CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 10px",
  borderRadius: "var(--radius-s)",
  border: "1px solid var(--control-border)",
  background: "var(--surface)",
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ style, ...rest }, ref) {
    return <input ref={ref} style={{ ...inputBase, ...style }} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ style, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      style={{ ...inputBase, height: "auto", minHeight: 88, padding: 10, resize: "vertical", ...style }}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ style, ...rest }, ref) {
    return <select ref={ref} style={{ ...inputBase, ...style }} {...rest} />;
  },
);

// ---------- feedback ----------

export function Spinner(props: { size?: number }) {
  const s = props.size ?? 16;
  return (
    <span
      aria-label="Loading"
      style={{
        display: "inline-block",
        width: s,
        height: s,
        border: "2px solid var(--border)",
        borderTopColor: "var(--accent)",
        borderRadius: "50%",
        animation: "spin 700ms linear infinite",
      }}
    />
  );
}

/** Every list's empty state teaches: what will appear here + the action that
 *  creates it (spec 3.2). */
export function EmptyState(props: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: "40px 24px",
        textAlign: "center",
        color: "var(--ink-2)",
        border: "1px dashed var(--border)",
        borderRadius: "var(--radius-m)",
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{props.title}</div>
      {props.body ? <div style={{ fontSize: 13, maxWidth: 420, margin: "0 auto" }}>{props.body}</div> : null}
      {props.action ? <div style={{ marginTop: 14 }}>{props.action}</div> : null}
    </div>
  );
}

/** A single stat, tabular, quiet label under a strong number. */
export function Stat(props: { label: string; value: ReactNode; tone?: "ok" | "warn" | "danger" }) {
  const color =
    props.tone === "ok"
      ? "var(--ok)"
      : props.tone === "warn"
        ? "var(--warn)"
        : props.tone === "danger"
          ? "var(--danger)"
          : "var(--ink)";
  return (
    <div>
      <div className="num" style={{ fontSize: 22, fontWeight: 600, color }}>
        {props.value}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{props.label}</div>
    </div>
  );
}

/** Keyboard hint chip (for the command palette affordance). */
export function Kbd(props: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        fontSize: 11,
        color: "var(--ink-3)",
        border: "1px solid var(--border)",
        borderBottomWidth: 2,
        borderRadius: 4,
        background: "var(--surface)",
      }}
    >
      {props.children}
    </span>
  );
}

/** The provenance line: the grounding, stated in words, linking to the data
 *  room. Used on every verdict and rating (spec Sections 0 and 8). */
export function Provenance(props: { children: ReactNode; onOpen?: () => void }) {
  return (
    <div
      style={{
        fontSize: 12.5,
        color: "var(--ink-2)",
        background: "var(--surface-2)",
        borderRadius: "var(--radius-s)",
        padding: "7px 10px",
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
      }}
    >
      <span>{props.children}</span>
      {props.onOpen ? (
        <a
          onClick={(e) => {
            e.preventDefault();
            props.onOpen?.();
          }}
          href="#"
          style={{ fontWeight: 500 }}
        >
          View the ground
        </a>
      ) : null}
    </div>
  );
}
