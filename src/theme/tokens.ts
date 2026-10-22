// Lyceum design tokens: the single source of truth for colour, type, space,
// shape and motion (docs/lyceum-upgrade-plan.md Section 6, the poster
// docs/design/colour-scheme-2026-10-22.png and its WCAG 2.2 audit
// docs/design/colour-scheme-audit-2026-10-22.md).
//
// Nothing else holds a hand-written colour. scripts/gen-theme-css.mjs writes the
// CSS custom properties and the bundled @font-face rules from this file into
// src/theme/global.css, and scripts/contrast-check.mjs fails on any hex value
// written elsewhere, on a generated file that has drifted from this one, and on
// any ratio in the audit that no longer holds.
//
// Where each colour may appear (the audit's rules): lime only on forest
// surfaces, never as text, a bar, a line or a chip on a light surface; green
// text on light surfaces is emeraldText; emerald is the fill for bars, meters
// and the primary button; on forest, data uses ray2, ray3 and lime, never
// emerald; warn and danger always travel with an icon and a word.

export const color = {
  forest: "#0F2A20", // primary dark: hero, header, tool cards, headlines and main text
  lime: "#B8F23A", // accent, emphasis only, and only on forest surfaces
  emerald: "#1C7C54", // data: chart bars, meters, the primary button fill (white text, 5.2)
  emeraldText: "#176B4A", // green text and links on light surfaces (6.5 on white, 5.5 on mint)
  mint: "#E9EFE7", // page background
  white: "#FFFFFF", // light cards
  tint1: "#EEF6EF", // agent tiles, the receipt slip
  tint2: "#DDEFE1", // chips, meter tracks, mascot circles
  moods: "#CDE8D3", // the moods card
  border: "#D3E0D6", // card borders, decorative only (1.4 on white)
  dots: "#C8D8CC", // the background dot grid
  gridline: "#DCE7DF", // chart gridlines
  nextDashed: "#8FB59E", // the "coming next" dashed border, decorative only; a planned item also says "Planned"
  forest2: "#173A2C", // inner boxes on dark cards
  forestBorder: "#2E5A46", // decorative borders on dark cards (1.9 on forest)
  onForest: "#B9CDBF", // body text on forest
  ink: "#0F2A20", // headlines and main text
  ink2: "#4E6258", // body and captions
  ink3: "#2F4A3D", // small muted text on tinted cards
  shadowMascot: "#CFE3D4", // mascot shadow on white and mint tiles
  shadowMascotMoods: "#B5D9BE", // mascot shadow on the moods card
  ray1: "#1C7C54", // illustration only: Prism's rays; ray1 is emerald and fails on forest
  ray2: "#4FA36F",
  ray3: "#8BC34A",
  forestDeep: "#0B1F17", // the film's field gradient and the sign-in backdrop; never under text smaller than 24 px
  controlBorder: "#4E6258", // input and control outlines (6.5 on white)
  focusLight: "#1C7C54", // the focus ring on light surfaces
  focusDark: "#B8F23A", // the focus ring on forest surfaces
  warn: "#8A5A00", // semantic only: warnings, stale reviews, unknown budgets
  warnSoft: "#FCF0E0",
  danger: "#A33A2A", // semantic only: a blocked check, a rejected quotation, a failed fetch
  dangerSoft: "#FBE9E6",
} as const;

export type ColorToken = keyof typeof color;

/** The CSS custom property for a colour token: emeraldText becomes --emerald-text, tint1 becomes --tint-1. */
export function cssName(token: ColorToken): string {
  return "--" + token.replace(/([a-z])([0-9A-Z])/g, "$1-$2").toLowerCase();
}

/** A CSS reference to a colour token, for inline styles and SVG attributes. */
export function cssVar(token: ColorToken): string {
  return "var(" + cssName(token) + ")";
}

/** A token at reduced opacity, for shadows and scrims, so no new colour is ever introduced. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ", " + alpha + ")";
}

/** A token without its hash, as pptxgenjs and the Office formats expect. */
export function bareHex(token: ColorToken): string {
  return color[token].slice(1);
}

// ---------- type (Section 6.3) ----------

export const font = {
  display: "'Bricolage Grotesque Variable', 'Bricolage Grotesque', system-ui, sans-serif",
  body: "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, Consolas, monospace",
} as const;

/** The bundled faces: Fontsource variable files, Latin subset only, copied to public/fonts by gen-theme-css. */
export const fontFiles = [
  { family: "Bricolage Grotesque Variable", pkg: "@fontsource-variable/bricolage-grotesque", file: "bricolage-grotesque-latin-wght-normal.woff2", weight: "200 800", preload: true },
  { family: "Plus Jakarta Sans Variable", pkg: "@fontsource-variable/plus-jakarta-sans", file: "plus-jakarta-sans-latin-wght-normal.woff2", weight: "200 800", preload: true },
  { family: "JetBrains Mono Variable", pkg: "@fontsource-variable/jetbrains-mono", file: "jetbrains-mono-latin-wght-normal.woff2", weight: "100 800", preload: false },
] as const;

/** The Latin range Fontsource ships for these faces. */
export const LATIN_RANGE = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

export const typeScale = {
  display: [28, 36, 48, 64], // Bricolage Grotesque 600 and 800: titles, hero lines, big numbers, the wordmark
  body: [13, 14, 16, 18, 22], // Plus Jakarta Sans 400 to 700: everything else
  mono: [12, 13], // JetBrains Mono: eyebrows, ids, timestamps, counts; never smaller than 12
} as const;
export const lineHeight = { body: 1.55, heading: 1.25, display: 1.08 } as const;
export const eyebrowTracking = "0.12em";

// ---------- space, shape, depth, motion (Section 6.4) ----------

export const space = [4, 8, 12, 16, 24, 32, 48, 64] as const;
export const radius = { chip: 8, input: 8, button: 12, card: 16, hero: 24 } as const;
export const motion = {
  feedback: 120, // ms
  state: 200,
  enter: 320,
  exit: 220,
  easeOut: "cubic-bezier(0.2, 0, 0, 1)",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  springDamping: 12, // mascots only
} as const;
export const depth = {
  menu: "0 12px 32px " + withAlpha(color.forest, 0.18) + ", 0 2px 6px " + withAlpha(color.forest, 0.08), // open menus and popovers only
  mascot: "0 6px 0 " + color.shadowMascot, // under a mascot on white and mint
  scrim: withAlpha(color.forest, 0.42), // behind a modal or the demo cards
  scrimStrong: withAlpha(color.forestDeep, 0.92),
  glass: withAlpha(color.white, 0.96),
} as const;
export const dotGrid = { step: 28, dot: 2 } as const;

// ---------- layout ----------

export const layout = {
  sidebarW: 264,
  headerH: 60,
  contentMax: 1120,
  contentWide: 1320,
  touchTarget: 44,
  minTarget: 24,
} as const;
