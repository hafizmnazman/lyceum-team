// Writes the theme from src/theme/tokens.ts, so the token file stays the only
// place a colour is written (plan Section 6.1):
//   - the :root custom properties and the @font-face rules, between the markers
//     at the top of src/theme/global.css;
//   - the three bundled font files (Fontsource variable, Latin subset) and their
//     licences, copied into public/fonts/;
//   - the preload links for the two faces above the fold, between the markers
//     in index.html.
// Usage: node scripts/gen-theme-css.mjs [--check]
//   --check writes nothing and exits 1 if any output has drifted from tokens.ts.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const T = await import(pathToFileURL(join(ROOT, "src/theme/tokens.ts")).href);
const check = process.argv.includes("--check");

const CSS_FILE = join(ROOT, "src/theme/global.css");
const HTML_FILE = join(ROOT, "index.html");
const FONT_DIR = join(ROOT, "public/fonts");
const CSS_START = "/* BEGIN GENERATED TOKENS: written by scripts/gen-theme-css.mjs from src/theme/tokens.ts. Do not edit by hand. */";
const CSS_END = "/* END GENERATED TOKENS */";
const HTML_START = "<!-- BEGIN GENERATED PRELOADS: scripts/gen-theme-css.mjs -->";
const HTML_END = "<!-- END GENERATED PRELOADS -->";

export function cssBlock() {
  const lines = [CSS_START, ":root {", "  /* colour (plan Section 6.1) */"];
  for (const [key, hex] of Object.entries(T.color)) lines.push("  " + T.cssName(key) + ": " + hex + ";");
  lines.push("  /* type (Section 6.3) */",
    "  --font-display: " + T.font.display + ";",
    "  --font-body: " + T.font.body + ";",
    "  --font-mono: " + T.font.mono + ";",
    "  --leading-body: " + T.lineHeight.body + ";",
    "  --leading-heading: " + T.lineHeight.heading + ";",
    "  --leading-display: " + T.lineHeight.display + ";",
    "  --tracking-eyebrow: " + T.eyebrowTracking + ";",
    "  /* space, shape, depth and motion (Section 6.4) */");
  T.space.forEach((px, i) => lines.push("  --space-" + (i + 1) + ": " + px + "px;"));
  for (const [name, px] of Object.entries(T.radius)) lines.push("  --radius-" + name + ": " + px + "px;");
  lines.push(
    "  --motion-feedback: " + T.motion.feedback + "ms;",
    "  --motion-state: " + T.motion.state + "ms;",
    "  --motion-enter: " + T.motion.enter + "ms;",
    "  --motion-exit: " + T.motion.exit + "ms;",
    "  --ease-out: " + T.motion.easeOut + ";",
    "  --ease-in: " + T.motion.easeIn + ";",
    "  --depth-menu: " + T.depth.menu + ";",
    "  --depth-mascot: " + T.depth.mascot + ";",
    "  --scrim: " + T.depth.scrim + ";",
    "  --scrim-strong: " + T.depth.scrimStrong + ";",
    "  --glass: " + T.depth.glass + ";",
    "  --dot-step: " + T.dotGrid.step + "px;",
    "  --dot-size: " + T.dotGrid.dot + "px;",
    "  /* layout */",
    "  --sidebar-w: " + T.layout.sidebarW + "px;",
    "  --header-h: " + T.layout.headerH + "px;",
    "  --content-max: " + T.layout.contentMax + "px;",
    "  --content-wide: " + T.layout.contentWide + "px;",
    "  --touch: " + T.layout.touchTarget + "px;",
    "}");
  for (const f of T.fontFiles) {
    lines.push("@font-face {",
      "  font-family: \"" + f.family + "\";",
      "  font-style: normal;",
      "  font-display: swap;",
      "  font-weight: " + f.weight + ";",
      "  src: url(\"/fonts/" + f.file + "\") format(\"woff2-variations\"), url(\"/fonts/" + f.file + "\") format(\"woff2\");",
      "  unicode-range: " + T.LATIN_RANGE + ";",
      "}");
  }
  lines.push(CSS_END);
  return lines.join("\n");
}

function htmlBlock() {
  return [HTML_START,
    ...T.fontFiles.filter((f) => f.preload).map((f) => "    <link rel=\"preload\" href=\"/fonts/" + f.file + "\" as=\"font\" type=\"font/woff2\" crossorigin />"),
    "    " + HTML_END].join("\n");
}

function between(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < 0 || b < a) return null;
  return { before: text.slice(0, a), body: text.slice(a, b + end.length), after: text.slice(b + end.length) };
}

let drift = [];
// global.css
const css = readFileSync(CSS_FILE, "utf8").replace(/\r\n/g, "\n");
const cssParts = between(css, CSS_START, CSS_END);
const nextCss = cssParts ? cssParts.before + cssBlock() + cssParts.after : cssBlock() + "\n\n" + css;
if (nextCss !== css) drift.push("src/theme/global.css");
// index.html
const html = readFileSync(HTML_FILE, "utf8").replace(/\r\n/g, "\n");
const htmlParts = between(html, HTML_START, HTML_END);
if (!htmlParts && !html.includes("</head>")) throw new Error("index.html has no </head>");
const nextHtml = htmlParts ? htmlParts.before + htmlBlock() + htmlParts.after : html.replace("</head>", "    " + htmlBlock() + "\n  </head>");
if (nextHtml !== html) drift.push("index.html");
// fonts and licences
const fontCopies = [];
for (const f of T.fontFiles) {
  const pkgDir = join(ROOT, "node_modules", f.pkg);
  const slug = f.file.replace(/-latin-wght-normal\.woff2$/, "");
  fontCopies.push({ from: join(pkgDir, "files", f.file), to: join(FONT_DIR, f.file) }, { from: join(pkgDir, "LICENSE"), to: join(FONT_DIR, slug + "-LICENSE.txt") });
}
// Licences are text, so a checkout's line endings are not drift; the fonts are compared byte for byte.
// The copy is the one named .txt; the package's own file is plain LICENSE.
const sameFile = (a, b) => b.endsWith(".txt")
  ? readFileSync(a, "utf8").replace(/\r\n/g, "\n") === readFileSync(b, "utf8").replace(/\r\n/g, "\n")
  : readFileSync(a).equals(readFileSync(b));
for (const c of fontCopies) {
  if (!existsSync(c.to)) { drift.push(c.to.slice(ROOT.length + 1)); continue; }
  if (existsSync(c.from) && !sameFile(c.from, c.to)) drift.push(c.to.slice(ROOT.length + 1));
}

if (check) {
  if (drift.length) { console.error("Theme drift from src/theme/tokens.ts (run node scripts/gen-theme-css.mjs):\n  " + drift.join("\n  ")); process.exit(1); }
  console.log("Theme outputs match src/theme/tokens.ts: global.css block, index.html preloads, " + T.fontFiles.length + " fonts and their licences.");
} else {
  writeFileSync(CSS_FILE, nextCss);
  writeFileSync(HTML_FILE, nextHtml);
  mkdirSync(FONT_DIR, { recursive: true });
  for (const c of fontCopies) {
    if (!existsSync(c.from)) throw new Error("Missing " + c.from + ". Run npm install first.");
    copyFileSync(c.from, c.to);
  }
  console.log(drift.length ? "Wrote " + drift.join(", ") + "." : "Theme outputs were already current.");
}
