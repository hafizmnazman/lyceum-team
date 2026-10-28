// The booth's kiosk mode (depth plan Section 9.1, D6b): on in one browser tab once the kiosk opens, until the team leaves it.
// While it is on, thirty seconds without a touch, a key or a scroll anywhere in the app return to the kiosk, after a warning
// in the last ten. The film is the existing Loop90 render, copied beside the app with its render date by
// scripts/kiosk-film.mjs; nothing here renders it.

const KEY = "lyceum.kiosk";
export const KIOSK_IDLE_MS = 30_000;
export const KIOSK_WARN_MS = 10_000;
/** What scripts/kiosk-film.mjs writes beside the film: its file name, when the render was made and its fingerprint. */
export const KIOSK_FILM_INFO = "/media/loop90.json";

export interface KioskFilm { file: string; renderedAt: string; sha256: string; bytes: number }

export const isKioskFilm = (x: unknown): x is KioskFilm => {
  if (!x || typeof x !== "object") return false;
  const f = x as KioskFilm;
  return typeof f.file === "string" && /^[\w.-]+\.mp4$/.test(f.file) && typeof f.renderedAt === "string"
    && !Number.isNaN(Date.parse(f.renderedAt)) && typeof f.sha256 === "string" && typeof f.bytes === "number";
};

/** Kiosk mode lives in this tab's session storage, so a reload keeps it and a new tab starts without it. */
export function kioskOn(): boolean {
  try { return sessionStorage.getItem(KEY) === "on"; } catch { return false; }
}
export function setKiosk(on: boolean): void {
  try { if (on) sessionStorage.setItem(KEY, "on"); else sessionStorage.removeItem(KEY); } catch { /* no storage: kiosk mode stays off */ }
}

export type IdlePhase = { kind: "active" } | { kind: "warning"; secondsLeft: number } | { kind: "return" };

/** Where a visitor stands after a given time without input: still active, warned with the whole seconds left, or due back. */
export function idlePhase(idleMs: number): IdlePhase {
  if (idleMs >= KIOSK_IDLE_MS) return { kind: "return" };
  if (idleMs >= KIOSK_IDLE_MS - KIOSK_WARN_MS) return { kind: "warning", secondsLeft: Math.ceil((KIOSK_IDLE_MS - idleMs) / 1000) };
  return { kind: "active" };
}
