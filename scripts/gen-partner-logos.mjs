// The integration marks for the poster (docs/brand-use.md, the owner's decision of 23 October 2026: every logo,
// planned ones too, each with its status). They live in public/brand/partners/logos/, beside the UTP mark, because
// they keep their owners' colours, the one folder the contrast check leaves alone.
//   Simple Icons paths, written here in each brand's own colour from the installed package (16.35.0).
//   Official files, downloaded once from their owners' own pages on 23 October 2026 and committed byte for byte;
//   this script never fetches, it checks each file against the fingerprint taken on download.
//   manifest.json: every file with its product, where it came from and the terms on record.
// Usage: node scripts/gen-partner-logos.mjs [--check]
//   --check exits 1 when a Simple Icons file differs from the package, an official file differs from its
//   fingerprint, the manifest is stale, or the folder holds a file the manifest does not list.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ROOT } from "./lib/theme-node.mjs";

const check = process.argv.includes("--check");
const OUT = join(ROOT, "public/brand/partners/logos");
const MANIFEST = join(OUT, "manifest.json");
const req = createRequire(join(ROOT, "package.json"));
const si = req("simple-icons");
const SI_VERSION = JSON.parse(readFileSync(join(ROOT, "node_modules/simple-icons/package.json"), "utf8")).version; // the package exports no package.json
const RETRIEVED = "2026-10-23";

const MS_CDN = "https://res-1.cdn.office.net/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/";
const MS_TERMS = "Microsoft Fabric Assets License (November 2019, https://aka.ms/fluentui-assets-license): product icons may illustrate that an application integrates with Microsoft products; in a lineup that is not clickable, each icon is labelled with the full product name in body copy beside or below it; full colour, unmodified, never more prominent than the application's own name, never as a logo or in a corner, no endorsement implied";

/** Simple Icons slugs, the file each becomes, and the brand's terms as the package records them. */
const SIMPLE = [
  ["claude", "The local door's assistant"], ["modelcontextprotocol", "The protocol the local door speaks"],
  ["greenhouse", "A job board Lyceum reads"], ["googleforms", "A survey export Lyceum reads"], ["moodle", "Feedback exports read, Moodle XML written; the LMS door is planned"],
  ["canvas", "The LMS door, planned"], ["googlegemini", "A remote assistant door, planned"],
  ["react", "The workspace's interface"], ["typescript", "The language of the core"], ["nodedotjs", "The local API and the door's runtime"],
];
/** Files from their owners' own pages, with the fingerprint taken when they were downloaded. */
const OFFICIAL = [
  { file: "microsoft-powerpoint.svg", product: "Microsoft PowerPoint", role: "The teaching pack is an editable .pptx", source: MS_CDN + "powerpoint_48x1.svg", sha256: "92c320a7a42a98275a002541ebaf472539c420cc4d054ebdf6586c10fba0c8a9", terms: MS_TERMS },
  { file: "microsoft-word.svg", product: "Microsoft Word", role: "The course file and the survey document are .docx", source: MS_CDN + "word_48x1.svg", sha256: "32576a28b649b5c6f7f7a06a24ff3c7b5b60a5947554fa6a39912029ec85a862", terms: MS_TERMS },
  { file: "microsoft-excel.svg", product: "Microsoft Excel", role: "Results are filed as .xlsx; rubrics are written as .xlsx", source: MS_CDN + "excel_48x1.svg", sha256: "3361926725eb7dff31993f1388c9eb6b791f8c3b5a4abcb0d5aa3b3015e0bb2e", terms: MS_TERMS },
  { file: "microsoft-forms.svg", product: "Microsoft Forms", role: "Survey exports read; a document shaped for Quick Import", source: MS_CDN + "forms_48x1.svg", sha256: "83ca91c92ee64f6e66ad9c26c25e6738bc962c2c59f9ea0cccaf8ae1e5800037", terms: MS_TERMS },
  { file: "microsoft-teams.svg", product: "Microsoft Teams", role: "A door, planned", source: MS_CDN + "teams_48x1.svg", sha256: "6eb0521d178af080bce66a4f2af3919a8615caa2965eb1265f9e597a84e0aeb8", terms: MS_TERMS },
  { file: "microsoft-365.svg", product: "Microsoft 365", role: "A door, planned (Microsoft 365 Copilot has no icon on the page, so it is named in text)", source: MS_CDN + "m365_48x1.svg", sha256: "e602157ff7063845d2e6befafc8319121dda9fd22b65844f3bed8024c72fd57c", terms: MS_TERMS },
  { file: "lever.png", product: "Lever", role: "A job board Lyceum reads", source: "https://www.lever.co/images/lever-only-logo.png", sha256: "78671160e93983ee1eac61d22b129456c2a2ef8133e9e93f10aa9f780fbdf983", terms: "No brand kit or usage page found; the wordmark from the header of lever.co, unmodified, used referentially" },
];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
/** An SVG's fingerprint with its line endings as downloaded (LF), so a checkout that writes CRLF is not drift. */
const fingerprint = (file, buf) => sha256(file.endsWith(".svg") ? Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n")) : buf);
const icons = new Map(Object.values(si).filter((x) => x && typeof x === "object" && x.slug).map((x) => [x.slug, x]));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** One Simple Icons mark in its brand's colour, the path exactly as the package carries it. */
function simpleSvg(slug) {
  const icon = icons.get(slug);
  if (!icon) throw new Error("simple-icons " + SI_VERSION + " has no " + slug);
  return { icon, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img"><title>' + esc(icon.title) + '</title><path fill="#' + icon.hex + '" d="' + icon.path + '"/></svg>\n' };
}
function manifest() {
  const marks = SIMPLE.map(([slug, role]) => {
    const { icon, svg } = simpleSvg(slug);
    return { file: slug + ".svg", product: icon.title, role, source: "simple-icons " + SI_VERSION + " (" + icon.source + ")", sha256: sha256(Buffer.from(svg)),
      terms: icon.guidelines ? "The brand's guidelines: " + icon.guidelines : "Simple Icons records no guidelines; the brand's own terms apply" };
  });
  for (const o of OFFICIAL) marks.push({ file: o.file, product: o.product, role: o.role, source: o.source + ", retrieved " + RETRIEVED, sha256: o.sha256, terms: o.terms });
  return JSON.stringify({ note: "Third-party marks for the poster, used referentially with their status and the ownership line (docs/brand-use.md). Generated by scripts/gen-partner-logos.mjs.", marks }, null, 2) + "\n";
}

const drift = [];
for (const o of OFFICIAL) {
  const path = join(OUT, o.file);
  if (!existsSync(path)) drift.push(o.file + " is missing (download it from " + o.source + ")");
  else if (fingerprint(o.file, readFileSync(path)) !== o.sha256) drift.push(o.file + " differs from the file downloaded on " + RETRIEVED);
}
const listed = new Set([...SIMPLE.map(([slug]) => slug + ".svg"), ...OFFICIAL.map((o) => o.file), "manifest.json"]);
if (existsSync(OUT)) for (const f of readdirSync(OUT)) if (!listed.has(f)) drift.push(f + " is in the folder but not in the manifest");

if (check) {
  for (const [slug] of SIMPLE) {
    const path = join(OUT, slug + ".svg");
    if (!existsSync(path) || readFileSync(path, "utf8").replace(/\r\n/g, "\n") !== simpleSvg(slug).svg) drift.push(slug + ".svg differs from simple-icons " + SI_VERSION);
  }
  if (!existsSync(MANIFEST) || readFileSync(MANIFEST, "utf8").replace(/\r\n/g, "\n") !== manifest()) drift.push("manifest.json is stale");
  if (drift.length) { console.error("The integration marks have drifted (run node scripts/gen-partner-logos.mjs):\n  " + drift.join("\n  ")); process.exit(1); }
  console.log("The integration marks match: " + SIMPLE.length + " from Simple Icons, " + OFFICIAL.length + " official files, and the manifest.");
  process.exit(0);
}

if (drift.length) { console.error("Cannot write the manifest:\n  " + drift.join("\n  ")); process.exit(1); }
mkdirSync(OUT, { recursive: true });
for (const [slug] of SIMPLE) writeFileSync(join(OUT, slug + ".svg"), simpleSvg(slug).svg);
writeFileSync(MANIFEST, manifest());
console.log("Wrote public/brand/partners/logos/: " + SIMPLE.length + " Simple Icons marks and the manifest; " + OFFICIAL.length + " official files checked.");
