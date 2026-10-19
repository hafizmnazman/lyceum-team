// Background music for the demo (demo spec Section 6). Three tiers, all started on
// the user's Play click (so autoplay policy allows it), tried in order:
//   1. public/demo-music.mp3 if the user has dropped their own royalty-free track.
//   2. public/demo-music.wav, an original ambient bed we ship (generated in code
//      by scripts/gen-music.mjs, so it carries no copyright and cannot be flagged).
//   3. A soft live Web Audio pad, if neither file loads (a warm chord through a
//      low-pass filter). Belt and braces so there is always sound.
// The demo never fails over audio: every call is guarded, so a blocked context or
// a missing file just falls through with no console error.

const SOURCES = ["/demo-music.mp3", "/demo-music.wav"];
const FILE_VOLUME = 0.25;
const GEN_VOLUME = 0.05;

let el: HTMLAudioElement | null = null;
let srcIdx = 0;
let ctx: AudioContext | null = null;
let gen: { stop: () => void } | null = null;
let fileActive = false;
let userMuted = false;

function ensureEl(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!el) {
    try {
      el = new Audio();
      el.loop = true;
      el.volume = FILE_VOLUME;
      el.preload = "auto";
    } catch {
      el = null;
    }
  }
  return el;
}

function ensureCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** A soft, generated ambient pad. Warm low chord, low-pass, gentle swell. */
function startGenerative() {
  if (gen || userMuted) return;
  const c = ensureCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(GEN_VOLUME, now + 3);
    master.connect(c.destination);

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.6;
    filter.connect(master);

    // A warm, slightly detuned chord (A2, E3, A3).
    const voices = [
      { f: 110.0, g: 0.6, d: 0 },
      { f: 164.81, g: 0.4, d: 3 },
      { f: 220.0, g: 0.32, d: -4 },
    ];
    const oscs = voices.map((v) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = v.f;
      o.detune.value = v.d;
      const g = c.createGain();
      g.gain.value = v.g;
      o.connect(g);
      g.connect(filter);
      o.start();
      return o;
    });

    // A very slow tremolo so the pad breathes.
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    gen = {
      stop: () => {
        try {
          const t = c.currentTime;
          master.gain.cancelScheduledValues(t);
          master.gain.setValueAtTime(master.gain.value, t);
          master.gain.linearRampToValueAtTime(0.0001, t + 0.4);
          setTimeout(() => {
            oscs.forEach((o) => {
              try {
                o.stop();
              } catch {
                // already stopped
              }
            });
            try {
              lfo.stop();
            } catch {
              // already stopped
            }
          }, 500);
        } catch {
          // ignore
        }
      },
    };
  } catch {
    gen = null;
  }
}

function stopGenerative() {
  if (gen) {
    gen.stop();
    gen = null;
  }
}

function playSource(a: HTMLAudioElement) {
  try {
    a.src = SOURCES[srcIdx];
    a.currentTime = 0;
  } catch {
    // ignore
  }
  const p = a.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

export const demoAudio = {
  start(muted: boolean): void {
    userMuted = muted;
    fileActive = false;
    srcIdx = 0;
    ensureCtx(); // unlock the audio context inside the user gesture
    const a = ensureEl();
    if (!a) {
      if (!muted) startGenerative();
      return;
    }
    a.muted = muted;
    a.onplaying = () => {
      fileActive = true;
      stopGenerative(); // a file is playing; drop the generated bed
    };
    a.onerror = () => {
      srcIdx += 1;
      if (srcIdx < SOURCES.length) {
        playSource(a); // try the next source (mp3 -> wav)
      } else if (!userMuted) {
        startGenerative(); // neither file loaded; fall back to the live pad
      }
    };
    playSource(a);
  },
  stop(): void {
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // ignore
      }
    }
    stopGenerative();
    fileActive = false;
  },
  setMuted(muted: boolean): void {
    userMuted = muted;
    if (el) el.muted = muted;
    if (muted) {
      stopGenerative();
    } else if (!fileActive) {
      startGenerative();
    }
  },
};
