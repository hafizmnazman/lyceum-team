// The bundled faces, from public/fonts (copied there by scripts/sync.mjs from the
// app's own files), loaded before the first frame: nothing is fetched at render time.
import { continueRender, delayRender, staticFile } from "remotion";
import { fontFiles } from "../../../src/theme/tokens.ts";

const waiting = delayRender("Loading the bundled faces");
Promise.all(fontFiles.map((f) => {
  const face = new FontFace(f.family, "url(" + staticFile("fonts/" + f.file) + ") format(\"woff2\")", { weight: f.weight, style: "normal" });
  document.fonts.add(face);
  return face.load();
}))
  .then(() => continueRender(waiting))
  .catch((err) => { console.error(err); continueRender(waiting); });
