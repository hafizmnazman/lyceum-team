// Lyceum UI primitives (plan Section 6.6). Every screen builds from these so the
// app stays on the system without a per-screen design pass. The look lives in
// theme/global.css as classes, so hover, focus-visible, active, disabled and
// loading states are defined once; no colour value is written here, only the
// CSS custom properties generated from theme/tokens.ts.

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cloneElement, forwardRef, isValidElement, useId } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, XCircle } from "lucide-react";

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

// ---------- layout ----------

/** The content column: left-aligned, capped width, generous padding. */
export function Page(props: { children: ReactNode; wide?: boolean }) {
  return <div className={cx("page-content", props.wide && "page-wide")}>{props.children}</div>;
}

/** Page header: the display title, the question the screen answers, a quiet
 *  context line and optional actions. One per screen. The heading takes focus
 *  on every route change (Shell). */
export function PageHead(props: {
  title: string;
  eyebrow?: ReactNode;
  question?: string;
  context?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="page-heading-text">
        {props.eyebrow ? <span className="eyebrow page-eyebrow">{props.eyebrow}</span> : null}
        <h1 className="page-title" tabIndex={-1}>{props.title}</h1>
        {props.question ? <p className="page-question">{props.question}</p> : null}
        {props.context ? <div className="page-context">{props.context}</div> : null}
      </div>
      {props.actions ? <div className="page-heading-actions">{props.actions}</div> : null}
    </div>
  );
}

/** A section eyebrow: JetBrains Mono, uppercase, tracked. Use sparingly. */
export function SectionLabel(props: { children: ReactNode; style?: CSSProperties }) {
  return <div className="section-label eyebrow" style={props.style}>{props.children}</div>;
}

/** A card is earned: it wraps one actionable object, never used as wallpaper.
 *  Light on white, tint for receipts and agent tiles, forest only on the
 *  landing page, the header and the tools (the restraint rule). */
export function Card(props: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  focal?: boolean;
  variant?: "light" | "tint" | "forest";
  className?: string;
  "data-demo-id"?: string;
}) {
  return (
    <div
      data-demo-id={props["data-demo-id"]}
      onClick={props.onClick}
      className={cx("card", props.variant === "tint" && "card-tint", props.variant === "forest" && "card-forest on-forest", props.focal && "card-focal", props.onClick && "is-clickable", props.className)}
      style={props.style}
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
      aria-pressed={props.onClick && props.selected !== undefined ? props.selected : undefined}
      onKeyDown={
        props.onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); props.onClick?.(); }
            }
          : undefined
      }
      className={cx("row", props.onClick && "is-clickable", props.selected && "is-selected")}
      style={props.style}
    >
      {props.children}
    </div>
  );
}

/** Show or hide secondary content: how-to text, options, full tables (plan Section 5.3). */
export function Disclosure(props: { summary: ReactNode; children: ReactNode; count?: ReactNode; defaultOpen?: boolean; "data-demo-id"?: string }) {
  return (
    <details className="disclosure" open={props.defaultOpen} data-demo-id={props["data-demo-id"]}>
      <summary><ChevronDown className="disclosure-chevron" size={16} aria-hidden /><span>{props.summary}</span>{props.count !== undefined ? <Tag>{props.count}</Tag> : null}</summary>
      <div className="disclosure-body">{props.children}</div>
    </details>
  );
}

// ---------- buttons ----------

/** primary: emerald with white text (5.2). lime: forest text on lime, on forest surfaces only.
 *  ghost: a secondary action on forest. outline: the default secondary on light surfaces. */
type ButtonVariant = "primary" | "outline" | "quiet" | "danger" | "lime" | "ghost";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }
>(function Button({ variant = "outline", loading, disabled, className, children, type, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx("btn", "btn-" + variant, className)}
      {...rest}
    >
      {loading ? <Spinner size={14} decorative /> : null}
      {children}
    </button>
  );
});

// ---------- tags ----------

type TagTone = "neutral" | "accent" | "ok" | "warn" | "danger" | "planned" | "forest";
const TONE_ICON = { ok: CheckCircle2, warn: AlertTriangle, danger: XCircle } as const;

/** A chip. ok, warn and danger always carry an icon beside their word (never colour alone);
 *  planned carries the dashed "coming next" border and must say "Planned" in its words. */
export function Tag(props: {
  children: ReactNode;
  tone?: TagTone;
  style?: CSSProperties;
}) {
  const tone = props.tone ?? "neutral";
  const Icon = tone === "ok" || tone === "warn" || tone === "danger" ? TONE_ICON[tone] : null;
  return (
    <span className={cx("tag", "tag-" + tone)} style={props.style}>
      {Icon ? <Icon size={14} strokeWidth={2} aria-hidden /> : null}
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
    <div className="form-field">
      <label htmlFor={id} className="field-label">{props.label}</label>
      {child ? cloneElement(child, { id, "aria-describedby": describedBy, "aria-invalid": props.error ? true : child.props["aria-invalid"] }) : props.children}
      {props.error ? (
        <div id={descriptionId} className="field-error"><XCircle size={14} aria-hidden />{props.error}</div>
      ) : props.hint ? (
        <div id={descriptionId} className="field-hint">{props.hint}</div>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cx("control", className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx("control", "control-area", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...rest }, ref) {
    return <select ref={ref} className={cx("control", "control-select", className)} {...rest} />;
  },
);

// ---------- feedback ----------

/** A spinner for a real request in flight. Inside a button it is decorative (the button is aria-busy). */
export function Spinner(props: { size?: number; decorative?: boolean; label?: string }) {
  const s = props.size ?? 16;
  return (
    <span
      className="spinner"
      role={props.decorative ? undefined : "status"}
      aria-hidden={props.decorative || undefined}
      aria-label={props.decorative ? undefined : props.label ?? "Loading"}
      style={{ width: s, height: s }}
    />
  );
}

/** Every empty state teaches: an action-led title, what will appear here, and
 *  the one action that creates it (plan Section 5.4). */
export function EmptyState(props: {
  title: string;
  body?: string;
  action?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {props.art ? <div className="empty-state-art">{props.art}</div> : null}
      <div className="empty-state-title">{props.title}</div>
      {props.body ? <div className="empty-state-body">{props.body}</div> : null}
      {props.action ? <div className="empty-state-action">{props.action}</div> : null}
    </div>
  );
}

/** A single stat: a tabular number at body size beside its label (working screens keep numbers at body size). */
export function Stat(props: { label: string; value: ReactNode; tone?: "ok" | "warn" | "danger" }) {
  return (
    <div className={cx("stat", props.tone && "stat-" + props.tone)}>
      <div className="stat-number num">{props.value}</div>
      <div className="stat-caption">{props.label}</div>
    </div>
  );
}

/** Keyboard hint chip (for the command palette affordance). */
export function Kbd(props: { children: ReactNode }) {
  return <span className="kbd">{props.children}</span>;
}

/** The provenance line: the grounding, stated in words, linking to the data
 *  room. Used on every verdict and rating. */
export function Provenance(props: { children: ReactNode; onOpen?: () => void }) {
  return (
    <div className="provenance">
      <span>{props.children}</span>
      {props.onOpen ? (
        <a
          onClick={(e) => {
            e.preventDefault();
            props.onOpen?.();
          }}
          href="#"
        >
          View the ground
        </a>
      ) : null}
    </div>
  );
}
