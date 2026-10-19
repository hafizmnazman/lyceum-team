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
import { CANONICAL_PROPOSAL, ROLE_ASSIGNMENTS } from "../data/seed.ts";

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
    title: "One course, one afternoon.",
    body: "A full tour of CS310: a course revision under constraint checks, a research run that fetches an employer's public job board live through the local API (a dated saved sample of the same board stands in only if the network fails), exact quotations with a rejected paraphrase, a teaching session with its editable slide pack, a template assessment, and a meeting brief with slides sent to the programme owner, then the step-by-step record of the afternoon by role. Counts, quotations, decks and the brief are computed live. Live board collection needs the local API and a network connection.",
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
    const hasSavedWork = state.teachingPlans.length > 0 || state.testDrafts.length > 0
      || state.evidenceSources.length > 0 || state.skillMentions.length > 0 || state.skillMappings.length > 0 || state.evidenceBriefs.length > 0 || state.curriculumDrafts.length > 0
      || JSON.stringify(state.proposals) !== JSON.stringify([CANONICAL_PROPOSAL])
      || JSON.stringify(state.assignments) !== JSON.stringify(ROLE_ASSIGNMENTS)
      || state.dataSources.some((source) => source.sourceFileName);
    if (hasSavedWork && !window.confirm("Playing the demo resets this browser's workspace, including saved plans, drafts and uploads. Export any plan you want to keep first. Continue?")) return;
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
    // Keep the everyday teaching workspace free of a floating demo control.
    if (state.currentPersonId && state.screen !== "guide") return null;
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
          background: "var(--surface)",
          boxShadow: "var(--shadow-2)",
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
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 130, background: "transparent" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, (elapsed / total) * 100))}%`,
            height: "100%",
            background: "var(--accent)",
            transition: "width 250ms linear",
          }}
        />
      </div>

      {/* stop + mute controls */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 130, display: "flex", gap: 8 }}>
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
            background: "var(--surface)",
            boxShadow: "var(--shadow-1)",
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
            background: "var(--surface)",
            boxShadow: "var(--shadow-1)",
            cursor: "pointer",
            fontSize: 12.5,
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
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
          }}
        >
          <div key={card} className="fade-up" style={{ maxWidth: 660 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "var(--accent)", marginBottom: 12 }}>
              {INTRO_CARDS[card].eyebrow.toUpperCase()}
            </div>
            <div className="page-title" style={{ fontSize: 40, marginBottom: 16 }}>
              {INTRO_CARDS[card].title}
            </div>
            <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--ink-2)", margin: 0 }}>
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
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 560 }}>
            <div className="page-title" style={{ fontSize: 44 }}>
              Lyceum
            </div>
            <p style={{ fontSize: 15.5, color: "var(--ink-2)", marginTop: 12 }}>
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
            background: "rgba(255,255,255,0.95)",
            border: "2px solid var(--ink)",
            boxShadow: "0 1px 6px rgba(25,28,31,0.35)",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* caption bar */}
      {phase === "walkthrough" && caption ? (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 124,
            maxWidth: 780,
            width: "calc(100vw - 120px)",
            background: "rgba(25,28,31,0.92)",
            color: "#fff",
            borderRadius: "var(--radius-m)",
            padding: "10px 18px",
            fontSize: 14.5,
            lineHeight: 1.5,
            textAlign: "center",
            boxShadow: "var(--shadow-2)",
            pointerEvents: "none",
          }}
        >
          {caption}
        </div>
      ) : null}
    </>
  );
}
