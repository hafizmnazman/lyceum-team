// The demo overlay: one Play control, three intro cards, then the cursor
// walkthrough over the real app, with a caption bar and a thin progress bar.
// Playing pins the clock and resets the workspace so every recording is
// identical; Escape stops it and unpins.

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { resetDemoState, resetSignalReveal, setClockPinned, useStore } from "../app/store.ts";
import { estimateTotalMs, INTRO_HOLDS } from "./script.ts";
import { runDemo } from "./runner.ts";
import { demoAudio } from "./audio.ts";
import { scaleMs } from "./timing.ts";
import { hasSavedWork } from "./savedWork.ts";

type Phase = "idle" | "intro" | "walkthrough" | "done";

const INTRO_CARDS: Array<{ eyebrow: string; title: string; body: string }> = [
  {
    eyebrow: "The problem",
    title: "Course decisions drift from evidence.",
    body: "A lecturer who wants to refresh a course has to gather what employers ask for, work out what the course already covers, and explain the change to colleagues. Today that evidence lives in browser tabs, inboxes and memory.",
  },
  {
    eyebrow: "Lyceum",
    title: "Research the lecturer runs.",
    body: "Lyceum fetches postings from permitted employer boards when you ask, keeps every requirement as an exact quotation from its source, counts with the denominator in view, and turns the result into a brief for the meeting. Nothing runs by itself and nothing changes the course without you.",
  },
  {
    eyebrow: "Watch it work",
    title: "One course, one afternoon, the whole loop.",
    body: "The loop on CS310, in order. Watch fetches an employer's public job board live through the local API (a dated saved sample of the same board stands in only if the network fails). Report confirms exact quotations, rejects a paraphrase, reviews the denominator, counts, maps a skill and prepares a brief with slides. Dr Rahman decides, with a reason. Update makes the change within the hours, Teach downloads an editable slide pack, and Learn files the sample results with n of N. Then the record of the afternoon by role. Counts, quotations, decks and the brief are computed live; live collection needs the local API and a network connection.",
  },
];

export function DemoOverlay() {
  const state = useStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [card, setCard] = useState(0);
  const [caption, setCaption] = useState("");
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [muted, setMuted] = useState(false);
  const abortRef = useRef(false);
  const playRef = useRef<() => Promise<void>>(async () => {});

  // Escape aborts a running demo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") abortRef.current = true;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The landing page's "Watch the tour" button asks the overlay to play.
  useEffect(() => {
    function onPlay() { void playRef.current(); }
    window.addEventListener("lyceum:play-demo", onPlay);
    return () => window.removeEventListener("lyceum:play-demo", onPlay);
  }, []);

  // Progress clock while playing.
  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const t = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(t);
  }, [phase]);

  async function play() {
    if (phase !== "idle") return;
    if (hasSavedWork(state) && !window.confirm("Playing the demo resets this browser's workspace, including saved plans, drafts and uploads. Export any plan you want to keep first. Continue?")) return;
    abortRef.current = false;
    setClockPinned(true);
    resetDemoState();
    resetSignalReveal();
    demoAudio.start(muted); // inside the click gesture, so autoplay allows it
    setStartedAt(performance.now());
    setPhase("intro");
    for (let i = 0; i < INTRO_CARDS.length; i += 1) {
      if (abortRef.current) return stop();
      setCard(i);
      await new Promise((r) => setTimeout(r, scaleMs(INTRO_HOLDS[i] ?? 6000)));
    }
    if (abortRef.current) return stop();
    setPhase("walkthrough");
    await runDemo({
      setCaption,
      setCursor: (x, y) => setCursor({ x, y }),
      shouldAbort: () => abortRef.current,
    });
    if (abortRef.current) return stop();
    setPhase("done");
    setCaption("");
    setTimeout(() => stop(), 6000);
  }

  playRef.current = play;

  function stop() {
    abortRef.current = true;
    setClockPinned(false);
    demoAudio.stop();
    setPhase("idle");
    setCursor({ x: -100, y: -100 });
    setCaption("");
  }

  const total = estimateTotalMs();
  const elapsed = Math.min(now - startedAt, total);

  if (phase === "idle") {
    // Keep the signed-in workspace free of a floating control that could cover content or a
    // focused element (WCAG 2.4.11); signed in, the Guide page offers the tour inline. The kiosk offers the walk alone.
    if (state.currentPersonId || state.screen === "kiosk") return null;
    return (
      <button
        data-demo-id="play-demo"
        onClick={() => void play()}
        title="Play the self-driving demo"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 38,
          padding: "0 16px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "var(--white)",
          boxShadow: "var(--depth-menu)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--ink)",
        }}
      >
        <Play size={14} /> Play demo
      </button>
    );
  }

  return (
    <>
      {/* progress bar */}
      <div data-demo-part="progress" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 130, background: "transparent" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, (elapsed / total) * 100))}%`,
            height: "100%",
            background: "var(--emerald)",
            transition: "width 250ms linear",
          }}
        />
      </div>

      {/* stop + mute controls */}
      <div data-demo-part="controls" style={{ position: "fixed", bottom: 20, right: 20, zIndex: 130, display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            const next = !muted;
            setMuted(next);
            demoAudio.setMuted(next);
          }}
          title={muted ? "Unmute" : "Mute"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--white)",
            boxShadow: "none",
            cursor: "pointer",
            color: "var(--ink-2)",
          }}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <button
          onClick={stop}
          title="Stop the demo (Esc)"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 34,
            padding: "0 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--white)",
            boxShadow: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--ink-2)",
          }}
        >
          <Pause size={13} /> Stop
        </button>
      </div>

      {/* intro cards */}
      {phase === "intro" ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "var(--mint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
          }}
        >
          <div key={card} className="fade-up" style={{ maxWidth: 660 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", color: "var(--emerald-text)", marginBottom: 12 }}>
              {INTRO_CARDS[card].eyebrow.toUpperCase()}
            </div>
            <div className="page-title" style={{ fontSize: 36, marginBottom: 16 }}>
              {INTRO_CARDS[card].title}
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-2)", margin: 0 }}>
              {INTRO_CARDS[card].body}
            </p>
          </div>
        </div>
      ) : null}

      {/* end card */}
      {phase === "done" ? (
        <div
          className="fade-in"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "var(--mint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 560 }}>
            <div className="page-title" style={{ fontSize: 48 }}>
              Lyceum
            </div>
            <p style={{ fontSize: 16, color: "var(--ink-2)", marginTop: 12 }}>
              Know which courses have drifted. Fix them on evidence. Let the
              results keep score.
            </p>
          </div>
        </div>
      ) : null}

      {/* the cursor */}
      {phase === "walkthrough" ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 125,
            transform: `translate(${cursor.x - 7}px, ${cursor.y - 7}px)`,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--glass)",
            border: "2px solid var(--ink)",
            boxShadow: "var(--depth-menu)",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* caption bar */}
      {phase === "walkthrough" && caption ? (
        <div
          data-demo-part="caption"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 124,
            maxWidth: 780,
            width: "calc(100vw - 120px)",
            background: "var(--scrim-strong)",
            color: "var(--white)",
            borderRadius: "var(--radius-card)",
            padding: "10px 18px",
            fontSize: 14,
            lineHeight: 1.5,
            textAlign: "center",
            boxShadow: "var(--depth-menu)",
            pointerEvents: "none",
          }}
        >
          {caption}
        </div>
      ) : null}
    </>
  );
}
