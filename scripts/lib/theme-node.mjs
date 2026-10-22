// The theme for Node-side renderers (the brief PDF, the mascot PNGs, the
// architecture diagram, the deck): the same tokens as the app, read from
// src/theme/tokens.ts, and the same bundled fonts, inlined as data URIs so a
// headless page needs no network and no file:// access.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const T = await import(pathToFileURL(join(ROOT, "src/theme/tokens.ts")).href);
export const color = T.color;

/** @font-face rules for the three bundled faces, with the woff2 files inlined. */
export function fontFaceCss() {
  return T.fontFiles.map((f) => {
    const data = readFileSync(join(ROOT, "public/fonts", f.file)).toString("base64");
    return "@font-face { font-family: \"" + f.family + "\"; font-style: normal; font-display: block; font-weight: " + f.weight + "; src: url(data:font/woff2;base64," + data + ") format(\"woff2\"); }";
  }).join("\n");
}

/** The :root custom properties, for pages that reuse the app's class names. */
export function rootVarsCss() {
  return ":root { " + Object.entries(T.color).map(([k, v]) => T.cssName(k) + ": " + v + ";").join(" ")
    + " --font-display: " + T.font.display + "; --font-body: " + T.font.body + "; --font-mono: " + T.font.mono + "; }";
}

/** Wait until the bundled faces have loaded in a Puppeteer page, so a capture never shows a fallback font. */
export async function fontsReady(page) {
  await page.evaluate(async () => { await document.fonts.ready; });
}
