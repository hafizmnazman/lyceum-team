// Lyceum v3 design tokens (spec Section 3). The single source of truth for
// colour, type, spacing and motion. No ad-hoc hex anywhere else; every screen
// and component reads these (or the matching CSS variables in global.css).
//
// Direction: a quiet, credible academic workspace. Warm paper-white surfaces,
// one restrained indigo accent, Inter for the UI, Newsreader serif for page
// titles and the wordmark only. Light-first, no dark mode in scope.

export const tokens = {
  // surfaces
  bg: "#F7F7F5", // app background (warm near-white)
  surface: "#FFFFFF", // cards, panels, inputs
  surface2: "#F1F1EE", // quiet wells (code, previews, agent panel)

  // ink
  ink: "#191C1F", // headings, primary text
  ink2: "#55595E", // secondary text
  ink3: "#62676D", // placeholders, timestamps

  // the one accent
  accent: "#3B5BDB", // actions, links, focus, selection
  accentInk: "#FFFFFF",
  accentSoft: "#EDF0FC", // selected rows, active nav, quiet highlights

  // semantic
  ok: "#1F7A4D",
  okSoft: "#E7F3EC",
  warn: "#925108",
  warnSoft: "#FCF0E0",
  danger: "#C0392B",
  dangerSoft: "#FAE9E7",

  // lines and depth
  border: "#E4E4E0",
  controlBorder: "#858990",
  shadow1: "0 1px 2px rgba(25,28,31,.06)",
  shadow2: "0 4px 16px rgba(25,28,31,.10)",
  radiusS: "6px",
  radiusM: "10px",
  radiusL: "14px",

  // type
  fontUI: "'Inter', system-ui, sans-serif",
  fontDisplay: "'Newsreader', Georgia, serif",

  // layout
  sidebarW: 240,
  topbarH: 56,
  contentMax: 1120,
} as const;

/** Band colours for the Relevance Index (semantic, from the tokens above). */
export const bandColor = {
  aligned: tokens.ok,
  drifting: tokens.warn,
  misaligned: tokens.danger,
  unrated: tokens.ink3,
} as const;

export const bandSoft = {
  aligned: tokens.okSoft,
  drifting: tokens.warnSoft,
  misaligned: tokens.dangerSoft,
  unrated: tokens.surface2,
} as const;
