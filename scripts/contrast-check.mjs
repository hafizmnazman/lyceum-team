// The contrast check (plan Section 6, package A1). Fails when:
//   1. a ratio in docs/design/colour-scheme-audit-2026-10-22.md (or the plan's
//      Section 6.2 table) no longer holds for the values in src/theme/tokens.ts,
//      or a pair the audit says fails starts passing (its rule would be stale);
//   2. a colour is written by hand outside tokens.ts: a hex value, a bare hex
//      colour handed to pptxgenjs or an Office file, or an rgb() or hsl() value;
//   3. a generated output has drifted from tokens.ts (the :root block, the font
//      preloads, the bundled fonts), or a generated SVG uses a colour that is
//      not a token;
//   4. a hand-written rule in global.css uses lime outside a forest context.
// One exception, approved by the owner on 22 October 2026 (docs/lyceum-depth-plan.md Section 3.2, CLAUDE.md):
// a third-party mark under public/brand/partners/ keeps its owner's colours, so parts 2 and 3 leave that folder
// alone; nothing in it is used for Lyceum's own surfaces, and a hex anywhere else still fails.
// Usage: node scripts/contrast-check.mjs

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { ROOT, T } from "./lib/theme-node.mjs";

const C = T.color;
const problems = [];

// ---------- 1. the audit's ratios ----------
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a, b) {
  const x = luminance(C[a]), y = luminance(C[b]);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
// [foreground token, background token, the ratio as the audit or plan prints it, the rule it must meet]
// Rules: "AAA" 7, "AA" 4.5, "3:1" for large text, non-text UI and focus rings; "fails AA" and "fails 3:1" for the audit's failing pairs.
const PAIRS = [
  // Audit Section 1: what passes as the poster gives it.
  ["forest", "mint", 13.1, "AAA"], ["forest", "white", 15.3, "AAA"],
  ["forest", "lime", 11.5, "AAA"], ["lime", "forest", 11.5, "AAA"],
  ["lime", "forest2", 9.4, "AAA"],
  ["white", "forest", 15.3, "AAA"], ["onForest", "forest", 9.1, "AAA"], ["onForest", "forest2", 7.5, "AAA"],
  ["ink2", "white", 6.5, "AA"], ["ink2", "mint", 5.6, "AA"], ["ink2", "tint1", 5.9, "AA"], ["ink2", "tint2", 5.5, "AA"], ["ink2", "moods", 5.0, "AA"],
  ["ink3", "white", 9.7, "AAA"], ["ink3", "mint", 8.3, "AAA"], ["ink3", "tint1", 8.8, "AAA"], ["ink3", "tint2", 8.1, "AAA"], ["ink3", "moods", 7.4, "AAA"],
  ["white", "emerald", 5.2, "AA"], ["emerald", "white", 5.2, "AA"],
  ["warn", "warnSoft", 5.3, "AA"], ["warn", "white", 5.9, "AA"], ["warn", "mint", 5.1, "AA"], ["white", "warn", 5.9, "AA"],
  ["danger", "dangerSoft", 5.6, "AA"], ["danger", "white", 6.6, "AA"], ["danger", "mint", 5.6, "AA"], ["white", "danger", 6.6, "AA"],
  ["emerald", "white", 5.2, "3:1"], ["emerald", "tint2", 4.3, "3:1"], // emerald bars on white and on the meter track
  ["ray2", "forest", 5.0, "3:1"], ["ray3", "forest", 7.3, "3:1"], ["ray2", "forest2", 4.1, "3:1"], ["ray3", "forest2", 6.0, "3:1"],
  ["focusLight", "white", 5.2, "3:1"], ["focusLight", "mint", 4.4, "3:1"], ["focusLight", "tint2", 4.3, "3:1"], ["focusLight", "moods", 4.0, "3:1"],
  ["focusDark", "forest", 11.5, "3:1"], ["focusDark", "forest2", 9.4, "3:1"],
  // Audit Section 2: what fails, and the rule that fixes it.
  ["lime", "white", 1.33, "fails 3:1"], ["lime", "mint", 1.14, "fails 3:1"],
  ["emerald", "mint", 4.4, "fails AA"], ["emerald", "tint2", 4.3, "fails AA"], ["emerald", "moods", 4.0, "fails AA"],
  ["emeraldText", "white", 6.5, "AA"], ["emeraldText", "mint", 5.6, "AA"], ["emeraldText", "tint2", 5.4, "AA"], ["emeraldText", "moods", 5.0, "AA"],
  ["emerald", "forest", 2.96, "fails 3:1"],
  ["forestBorder", "forest", 1.9, "fails 3:1"], ["onForest", "forest", 9.1, "3:1"],
  ["border", "white", 1.4, "fails 3:1"], ["controlBorder", "white", 6.5, "3:1"], ["controlBorder", "tint2", 5.5, "3:1"],
  ["nextDashed", "white", 2.3, "fails 3:1"], ["nextDashed", "mint", 1.9, "fails 3:1"],
  // Plan Section 6.2 rows not already above.
  ["emerald", "mint", 4.4, "3:1"], // emerald text on mint: large text only
  ["controlBorder", "mint", 5.6, "3:1"],
  ["lime", "emerald", 3.9, "3:1"], ["lime", "emerald", 3.9, "fails AA"], // UI only, never text
];
const RULES = { AAA: (r) => r >= 7, AA: (r) => r >= 4.5, "3:1": (r) => r >= 3, "fails AA": (r) => r < 4.5, "fails 3:1": (r) => r < 3 };
const rows = [];
for (const [fg, bg, stated, rule] of PAIRS) {
  const r = ratio(fg, bg);
  const decimals = String(stated).split(".")[1]?.length ?? 0;
  const tolerance = decimals >= 2 ? 0.006 : 0.06; // the audit rounds to one decimal, or two for the failing pairs
  const matches = Math.abs(r - stated) <= tolerance;
  const meets = RULES[rule](r);
  rows.push({ pair: fg + " on " + bg, stated, computed: r.toFixed(decimals >= 2 ? 3 : 2), rule, ok: matches && meets });
  if (!matches) problems.push("Ratio drift: " + fg + " on " + bg + " computes " + r.toFixed(3) + ", the audit states " + stated + ".");
  if (!meets) problems.push("Rule broken: " + fg + " on " + bg + " is " + r.toFixed(2) + ", which does not meet " + rule + ".");
}

// ---------- 2. no hand-written colour outside tokens.ts ----------
const SCANNED = new Set([".ts", ".tsx", ".css", ".mjs", ".js", ".cjs", ".html", ".svg"]);
const SKIP = [
  /^docs\/history\//, /^docs\/review\//, // kept as written
  /^src\/theme\/tokens\.ts$/, // the source
  /^public\/brand\//, /^docs\/presentation\/.*\.svg$/, /^\.github\/readme\/.*\.svg$/, /\.generated\./, // generated outputs, checked in part 3
  /^scripts\/gen-demo-files\.mjs$/, // writes a stand-in for a lecturer's own Office file, with Office's default theme (docs/decisions.md)
];
const listed = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
if (listed.status !== 0) { console.error(listed.stderr); process.exit(2); }
const files = [...new Set(listed.stdout.split("\0").filter(Boolean))]
  .filter((p) => SCANNED.has(extname(p).toLowerCase()) && !SKIP.some((re) => re.test(p)))
  .filter((p) => { try { return statSync(join(ROOT, p)).isFile(); } catch { return false; } });
const PATTERNS = [
  { name: "hex colour", re: /(?<![&\w#/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g },
  { name: "bare hex colour", re: /\b(?:color|fill|chartColors|lineColor|fontColor|bgColor)\s*:\s*\[?\s*["'][0-9A-Fa-f]{6}["']/g },
  { name: "Office colour", re: /\b(?:srgbClr val|lastClr)="[0-9A-Fa-f]{6}"/g },
  { name: "rgb or hsl value", re: /\b(?:rgba?|hsla?)\(\s*\d/g },
];
const GEN_START = "/* BEGIN GENERATED TOKENS", GEN_END = "/* END GENERATED TOKENS */";
let scannedLines = 0;
for (const file of files) {
  let text = readFileSync(join(ROOT, file), "utf8");
  if (file === "src/theme/global.css") {
    const a = text.indexOf(GEN_START), b = text.indexOf(GEN_END);
    if (a < 0 || b < 0) problems.push("src/theme/global.css has lost its generated block markers.");
    else text = text.slice(0, a) + text.slice(a, b).replace(/[^\n]/g, "") + text.slice(b); // keep line numbers, blank the generated block
  }
  const lines = text.split(/\r?\n/);
  scannedLines += lines.length;
  lines.forEach((line, i) => {
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      const m = re.exec(line);
      if (m) problems.push("Hand-written " + name + " outside tokens.ts: " + file + ":" + (i + 1) + ": " + m[0]);
    }
  });
}

// ---------- 3. generated outputs match tokens.ts ----------
const gen = spawnSync(process.execPath, [join(ROOT, "scripts/gen-theme-css.mjs"), "--check"], { cwd: ROOT, encoding: "utf8" });
if (gen.status !== 0) problems.push((gen.stderr || gen.stdout).trim());
const tokenHex = new Set(Object.values(C).map((h) => h.toUpperCase()));
const PARTNER_MARKS = /^public\/brand\/partners\//; // the owners' colours, by the exception above
const generated = [...new Set(listed.stdout.split("\0").filter(Boolean))].filter((p) => /^(public\/brand\/.*\.svg|docs\/presentation\/.*\.svg|\.github\/readme\/.*\.svg|.*\.generated\.[a-z]+)$/.test(p) && !PARTNER_MARKS.test(p) && existsSync(join(ROOT, p)));
for (const file of generated) {
  const found = readFileSync(join(ROOT, file), "utf8").match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  for (const hex of new Set(found)) if (!tokenHex.has(hex.toUpperCase())) problems.push("Generated " + file + " uses " + hex + ", which is not a token.");
}

// ---------- 4. lime only on forest (audit Section 2, first rule) ----------
const css = readFileSync(join(ROOT, "src/theme/global.css"), "utf8");
const handWritten = css.slice(css.indexOf(GEN_END) + GEN_END.length);
const FOREST_CONTEXT = /on-forest|forest|lime|app-header|header-|landing-bar|wordmark/;
for (const m of handWritten.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = m[1].trim(), body = m[2];
  if (/var\(--lime\)/.test(body) && !FOREST_CONTEXT.test(selector)) problems.push("Lime outside a forest context in global.css: " + selector.replace(/\s+/g, " "));
}

// ---------- report ----------
const width = Math.max(...rows.map((r) => r.pair.length));
console.log("Pair".padEnd(width) + "  stated  computed  rule");
for (const r of rows) console.log((r.ok ? "" : "! ") + r.pair.padEnd(width) + "  " + String(r.stated).padEnd(6) + "  " + r.computed.padEnd(8) + "  " + r.rule);
console.log("\n" + rows.length + " ratios checked against tokens.ts; " + files.length + " files (" + scannedLines + " lines) scanned for hand-written colours; " + generated.length + " generated SVGs checked; theme outputs " + (gen.status === 0 ? "current" : "DRIFTED") + ".");
if (problems.length) {
  console.error("\nCONTRAST CHECK FAILED\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("CONTRAST CHECK OK");
