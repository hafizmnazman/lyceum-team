// The scenes built on real artefacts (video/storyboard.md): the app, recorded by
// video/capture/capture.mjs and cut by caption into excerpts, inside a drawn
// frame (beat 5); what is real (beat 6); the doors, the real architecture
// diagram (beat 7); and the close, the ring closing (beat 8).
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { count, draw, fade, float, glide, pop } from "../anim";
import { HELPER_NAMES, HelperBadge, HostFigure, isHelper } from "../components/Cast";
import { C, F, alpha } from "../theme";
import { loudness, timeline, type Scene } from "../timeline";
import { Mark } from "../../../../src/ui/mascots/mark.tsx";

const FIG = timeline.figures;
const cueAt = (scene: Scene, name: string) => scene.cues[name]; // optional cues: an app scene may have none
const mouthOf = (scene: Scene, frame: number) => {
  const line = scene.lines.find((l) => l.speaker === "host" && frame >= l.from && frame < l.to);
  return line ? loudness(line.envelope, frame - line.from) : 0;
};

// ---------- beat 5: the app, inside a drawn frame ----------
const FRAME = { left: 400, top: 140, width: 1280, height: 720 };
export const AppScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const refused = cueAt(scene, "refused"), record = cueAt(scene, "record");
  const flash = refused === undefined ? 0 : Math.max(0, 1 - Math.abs(frame - refused - 6) / 14);
  const tick = record === undefined ? 0 : pop(frame, record);
  const helpers = scene.helpers.filter(isHelper);
  return (
    <AbsoluteFill>
      {helpers.map((who, i) => (
        <div key={who} style={{ position: "absolute", left: 96, top: 170 + i * 200, width: 260, display: "grid", justifyItems: "center", gap: 8,
          transform: "scale(" + pop(frame, 8 + i * 14) + ") translateY(" + float(frame, i, 3) + "px)" }}>
          <HelperBadge who={who} size={150} pose="working" />
          <span style={{ fontFamily: F.display, fontSize: 30, fontWeight: 600, color: C.white }}>{HELPER_NAMES[who]}</span>
        </div>
      ))}
      {/* a flat offset shadow, never a blurred one: Chrome rasterises a large blur a little differently on every render */}
      <div style={{ position: "absolute", ...FRAME, borderRadius: 28, overflow: "hidden", background: C.mint,
        boxShadow: "0 0 0 6px " + (flash > 0 ? alpha(C.danger, flash) : C.forestBorder) + ", 0 24px 0 6px " + alpha(C.forestDeep, 0.55),
        transform: "scale(" + (0.96 + 0.04 * glide(frame, 0, 18)) + ")" }}>
        {timeline.capture ? scene.clips.map((clip, i) => (
          <Sequence key={i} from={clip.from} durationInFrames={clip.durationInFrames} layout="none">
            <OffthreadVideo src={staticFile(timeline.capture!.src)} trimBefore={Math.round(clip.start * timeline.fps)} playbackRate={clip.rate} muted
              style={{ width: FRAME.width, height: FRAME.height, objectFit: "cover" }} />
          </Sequence>
        )) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontFamily: F.mono, fontSize: 28, color: C.ink2, textAlign: "center", padding: 80 }}>
            The tour is not captured yet. Run node video/capture/capture.mjs, then sync again.
          </div>
        )}
      </div>
      {record !== undefined ? (
        <div style={{ position: "absolute", left: FRAME.left + FRAME.width - 70, top: FRAME.top - 34, width: 104, height: 104, borderRadius: "50%", background: C.lime,
          display: "grid", placeItems: "center", transform: "scale(" + tick + ")" }}>
          <svg viewBox="0 0 24 24" width={56} height={56} fill="none" stroke={C.forest} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17 19 7" /></svg>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- beat 6: what is real ----------
export const Proof: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const trl = cueAt(scene, "trl") ?? 0, checks = cueAt(scene, "checks") ?? 0, amber = cueAt(scene, "amber") ?? 0;
  const card: React.CSSProperties = { position: "absolute", top: 180, width: 540, height: 600, borderRadius: 32, padding: "46px 48px" };
  return (
    <AbsoluteFill>
      <div style={{ ...card, left: 96, background: C.forest2, transform: "scale(" + pop(frame, trl - 6) + ")" }}>
        <div style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: "0.1em", color: C.onForest }}>READINESS, SELF-ASSESSED</div>
        <div style={{ margin: "26px 0 30px", fontFamily: F.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: C.lime }}>{FIG.trl.text}</div>
        <div style={{ fontSize: 30, lineHeight: 1.4, color: C.white }}>“Prototype implementations of the software demonstrated on full-scale realistic problems.”</div>
        <div style={{ marginTop: 18, fontSize: 24, color: C.onForest }}>NASA ESTO, software</div>
      </div>
      <div style={{ ...card, left: 690, background: C.forest2, transform: "scale(" + pop(frame, checks - 6) + ")" }}>
        <div style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: "0.1em", color: C.onForest }}>CHECKS</div>
        <div style={{ margin: "26px 0 30px", fontFamily: F.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: C.white }}>{Math.round(FIG.checks.value * count(frame, checks, 30))}</div>
        <div style={{ fontSize: 30, lineHeight: 1.4, color: C.white }}>automated checks pass, plus four browser runs.</div>
      </div>
      <div style={{ ...card, left: 1284, width: 540, background: C.warnSoft, color: C.ink, transform: "scale(" + pop(frame, amber - 6) + ")" }}>
        <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, background: C.white, fontFamily: F.mono, fontSize: 22, letterSpacing: "0.08em", color: C.warn }}>PLANNED</div>
        <div style={{ margin: "22px 0 18px", fontFamily: F.display, fontWeight: 600, fontSize: 52, color: C.warn }}>Not built yet</div>
        {["Remote assistant doors", "The LMS door", "Learn's statistics", "The benchmark run"].map((x) => (
          <div key={x} style={{ display: "flex", alignItems: "center", gap: 16, margin: "14px 0", fontSize: 32 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: C.warn }} />{x}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------- beat 7: the doors ----------
export const Doors: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const doors = cueAt(scene, "doors") ?? 0, local = cueAt(scene, "local") ?? 0;
  const zoom = 1 + 0.22 * draw(frame, doors, 60);
  const W = 1240, H = Math.round((W * 1080) / 1920), scale = W / 1920; // the diagram is 1920 by 1080; the local door's tile is at 546, 236, 246 by 166
  // below the chapter chip and clear of the host's badge and the captions
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 340, top: 150, width: W, height: H, borderRadius: 24, overflow: "hidden", boxShadow: "0 0 0 6px " + C.forestBorder }}>
        <div style={{ width: W, height: H, transform: "scale(" + zoom + ")", transformOrigin: "30% 30%" }}>
          <Img src={staticFile("doors/architecture.png")} style={{ width: W, height: H }} />
          <div style={{ position: "absolute", left: 546 * scale - 6, top: 236 * scale - 6, width: 246 * scale + 12, height: 166 * scale + 12, borderRadius: 14,
            boxShadow: "0 0 0 6px " + alpha(C.lime, fade(frame, local, 10)) }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- beat 8: the close ----------
export const Close: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const ringAt = cueAt(scene, "ring") ?? 0;
  const cx = 960, cy = 420, R = 290, L = 2 * Math.PI * R;
  const last = scene.lines.at(-1)?.to ?? 0;
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.forestBorder} strokeWidth={22} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.lime} strokeWidth={22} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw(frame, ringAt - 30, 40))} transform={"rotate(-90 " + cx + " " + cy + ")"} />
      </svg>
      <div style={{ position: "absolute", left: cx - 170, top: cy - 190, transform: "translateY(" + float(frame, 0, 4) + "px)" }}>
        <HostFigure size={340} pose={frame >= ringAt ? "celebrating" : "greeting"} mouth={mouthOf(scene, frame)} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 750, textAlign: "center", fontFamily: F.display, fontWeight: 800, fontSize: 76, color: C.lime, opacity: fade(frame, last + 4, 12) }}>Every semester adds a ring.</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 880, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: fade(frame, last + 14, 12) }}>
        <Mark size={64} tone="white" />
        <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 58, color: C.white }}>Lyceum</span>
      </div>
    </AbsoluteFill>
  );
};
