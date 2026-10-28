// The kiosk at #/kiosk (depth plan Section 9.1, D6b): the booth's screen between judge teams, public like the judge's page.
// Tualang rests on the forest; the existing Loop90 render plays muted in a loop with a visible pause, and waits for Play
// under reduced motion; a touch anywhere starts the guided walk. Nothing here renders the film: scripts/kiosk-film.mjs copies
// the render beside the app with its date, and without it the page says the film is not on this laptop. While kiosk mode
// is on, KioskIdle brings an idle visitor back here.

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Pause, Play } from "lucide-react";
import { navigate, useStore } from "../../app/store.ts";
import { discardUnsavedEditors } from "../../app/unsaved.ts";
import { idlePhase, isKioskFilm, KIOSK_FILM_INFO, kioskOn, setKiosk, type KioskFilm } from "../../demo/kiosk.ts";
import { endWalk, startWalk } from "../../demo/WalkOverlay.tsx";
import { reducedMotion } from "../motion.ts";
import { Mark, Mascot } from "../mascots/index.tsx";
import { Button } from "../primitives/index.tsx";

const renderDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

export function KioskScreen() {
  const [film, setFilm] = useState<KioskFilm | "missing" | null>(null);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => { setKiosk(true); }, []);
  useEffect(() => {
    let live = true;
    fetch(KIOSK_FILM_INFO, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((info: unknown) => { if (live) setFilm(isKioskFilm(info) ? info : "missing"); })
      .catch(() => { if (live) setFilm("missing"); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    if (playing) void v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [playing, film]);
  const ready = film && film !== "missing" ? film : null;
  // The two controls keep their own clicks; a touch anywhere else walks the loop.
  const own = (fn: () => void) => (e: MouseEvent) => { e.stopPropagation(); fn(); };
  return <div className="kiosk on-forest" onClick={() => startWalk("loop")} data-demo-id="kiosk">
    <header className="kiosk-bar"><span className="wordmark"><Mark size={32} tone="white" leaf />Lyceum</span><span className="eyebrow">At the booth</span></header>
    <div className="kiosk-stage">
      <figure className="kiosk-film">
        {ready ? <video ref={video} src={"/media/" + ready.file} muted loop playsInline preload="auto" aria-label="The 90-second loop, a capture of the real app"
          data-demo-id="kiosk-film" onError={() => setFilm("missing")} />
          : <div className="kiosk-film-missing" data-demo-id="kiosk-film-missing">{film === null ? "Opening the film." : "The film is not on this laptop. The team copies the render beside the app with node scripts/kiosk-film.mjs."}</div>}
        <figcaption>
          {ready ? <Button variant="ghost" onClick={own(() => setPlaying(!playing))} data-demo-id="kiosk-pause">{playing ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Play</>}</Button> : null}
          <span>The 90-second loop: a capture of the real app in its demo mode{ready ? ", rendered " + renderDate(ready.renderedAt) : ""}. Silent here.</span>
        </figcaption>
      </figure>
      <div className="kiosk-host"><Mascot who="host" mood="resting" size={180} surface="forest" /></div>
    </div>
    <button type="button" className="kiosk-touch" data-demo-id="kiosk-touch">Touch to walk the loop</button>
    <p className="kiosk-note">Ten stops over the real app on the sample workspace: real postings, and a sample course labelled synthetic. Thirty seconds without a touch bring you back here.</p>
    <footer className="kiosk-foot"><Button variant="ghost" onClick={own(() => { setKiosk(false); navigate("judge"); })} data-demo-id="kiosk-leave">Leave kiosk mode</Button></footer>
  </div>;
}

/** The idle return: while kiosk mode is on and the kiosk is not on screen, thirty seconds without a touch, a key, a wheel or
 *  a scroll end any walk and come back to the kiosk, and the last ten seconds say so. A playing tour holds it. */
export function KioskIdle() {
  const state = useStore();
  const away = state.screen !== "kiosk" && kioskOn();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!away) { setLeft(null); return; }
    let last = Date.now();
    const touch = () => { last = Date.now(); };
    const kinds = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
    for (const k of kinds) window.addEventListener(k, touch, { capture: true, passive: true });
    const timer = window.setInterval(() => {
      if (document.querySelector('[data-demo-part="progress"]')) last = Date.now(); // the tour plays by itself; that is not a visitor gone
      const phase = idlePhase(Date.now() - last);
      if (phase.kind === "return") { endWalk(); discardUnsavedEditors(); setLeft(null); navigate("kiosk"); return; }
      setLeft(phase.kind === "warning" ? phase.secondsLeft : null);
    }, 250);
    return () => { for (const k of kinds) window.removeEventListener(k, touch, { capture: true }); window.clearInterval(timer); };
  }, [away]);
  if (!away || left === null) return null;
  return <div className="kiosk-idle" role="status" data-demo-id="kiosk-idle">Back to the start in {left} s. Touch anywhere to stay.</div>;
}
