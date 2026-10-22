// Renders the cast from the same components the app uses (src/ui/mascots/),
// through Vite's SSR loader, into public/brand/:
//   mascots/<who>-<pose>.svg and mascots/<who>-<pose>-<size>.png at 512 and 1024
//   (the host also at 2048, for the poster);
//   mark.svg and mark-white.svg (the host's silhouette), favicon.svg (the tile),
//   icon-32.png, icon-180.png, icon-192.png, icon-512.png and manifest.webmanifest.
// Usage: node scripts/gen-mascots.mjs [--check]
//   --check re-renders the SVGs and exits 1 if a file is missing or has drifted.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, T } from "./lib/theme-node.mjs";

const check = process.argv.includes("--check");
const req = createRequire(join(ROOT, "package.json"));
const load = async (name) => { const m = await import(pathToFileURL(req.resolve(name)).href); return m.default ?? m; };
const { createServer } = await import(pathToFileURL(req.resolve("vite")).href);
const React = await load("react");
const { renderToStaticMarkup } = await load("react-dom/server");

const server = await createServer({ root: ROOT, configFile: false, logLevel: "error", server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
let M;
try { M = await server.ssrLoadModule("/src/ui/mascots/index.tsx"); } finally { await server.close(); }

const OUT = join(ROOT, "public/brand"), MASCOTS = join(OUT, "mascots");
const standalone = (markup) => markup.replace("<svg ", "<svg xmlns=\"http://www.w3.org/2000/svg\" ");
const render = (Component, props) => standalone(renderToStaticMarkup(React.createElement(Component, props)));

// What to write: every character in every pose, the mark and the icons.
const svgs = new Map(); // path -> markup
const pngs = []; // { path, markup, size }
for (const { who } of M.CAST) {
  const poses = who === "host" ? M.HOST_POSES : M.HELPER_POSES;
  for (const pose of poses) {
    const sizes = who === "host" ? [512, 1024, 2048] : [512, 1024];
    svgs.set(join(MASCOTS, who + "-" + pose + ".svg"), render(M.CHARACTERS[who], { pose, size: 512, detail: "poster" }));
    for (const size of sizes) pngs.push({ path: join(MASCOTS, who + "-" + pose + "-" + size + ".png"), markup: render(M.CHARACTERS[who], { pose, size, detail: size >= 512 ? "poster" : undefined }), size });
  }
}
svgs.set(join(OUT, "mark.svg"), render(M.Mark, { size: 512, tone: "forest", title: "Lyceum" }));
svgs.set(join(OUT, "mark-white.svg"), render(M.Mark, { size: 512, tone: "white", title: "Lyceum" }));
svgs.set(join(OUT, "favicon.svg"), render(M.MarkTile, { size: 64, title: "Lyceum" }));
for (const size of [32, 180, 192, 512]) pngs.push({ path: join(OUT, "icon-" + size + ".png"), markup: render(M.MarkTile, { size }), size });
const manifest = JSON.stringify({
  name: "Lyceum", short_name: "Lyceum", description: "Course decisions, with receipts.", start_url: "/", display: "standalone",
  background_color: T.color.mint, theme_color: T.color.forest,
  icons: [{ src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/brand/favicon.svg", sizes: "any", type: "image/svg+xml" }],
}, null, 2) + "\n";
const manifestPath = join(OUT, "manifest.webmanifest");

if (check) {
  const drift = [];
  for (const [path, markup] of svgs) if (!existsSync(path) || readFileSync(path, "utf8").replace(/\r\n/g, "\n") !== markup) drift.push(path.slice(ROOT.length + 1));
  for (const { path } of pngs) if (!existsSync(path)) drift.push(path.slice(ROOT.length + 1) + " (missing)");
  if (!existsSync(manifestPath) || readFileSync(manifestPath, "utf8").replace(/\r\n/g, "\n") !== manifest) drift.push("public/brand/manifest.webmanifest");
  if (drift.length) { console.error("Mascot outputs are missing or have drifted (run node scripts/gen-mascots.mjs):\n  " + drift.join("\n  ")); process.exit(1); }
  console.log("Mascot outputs match the components: " + svgs.size + " SVGs, " + pngs.length + " PNGs and the manifest.");
  process.exit(0);
}

mkdirSync(MASCOTS, { recursive: true });
for (const [path, markup] of svgs) writeFileSync(path, markup);
writeFileSync(manifestPath, manifest);

// PNGs: each drawing on a transparent page at its exact size.
const puppeteer = await load("puppeteer-core");
const executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!executablePath) throw new Error("No Chrome or Edge found for the PNG renders.");
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  for (const { path, markup, size } of pngs) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent("<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>" + markup + "</body></html>");
    await page.screenshot({ path, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
} finally {
  await browser.close();
}
console.log("Wrote " + svgs.size + " SVGs, " + pngs.length + " PNGs and the manifest into public/brand/.");
