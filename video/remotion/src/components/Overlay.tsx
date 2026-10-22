// What sits over every scene: the chapter chip top left, the speakers bottom
// left and right, and the captions in the band between them (video/style.md).
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { pop } from "../anim";
import { C, F, SPEAKER_BAR, alpha } from "../theme";
import { loudness, type Caption, type Cut, type Scene, type Speaker } from "../timeline";
import { HelperBadge, HostFigure, Lecturer, isHelper } from "./Cast";

const sceneAt = (cut: Cut, frame: number): Scene | undefined => cut.scenes.find((s) => frame >= s.from && frame < s.from + s.durationInFrames);

/** The chip: the step in JetBrains Mono, the acting helper beside it, "saved sample" on footage from the sample. */
export const Chip: React.FC<{ cut: Cut }> = ({ cut }) => {
  const frame = useCurrentFrame();
  const scene = sceneAt(cut, frame);
  if (!scene?.chapter) return null;
  const enter = pop(frame, scene.from + 4, 14);
  const helper = scene.helpers.find(isHelper);
  return (
    <div style={{ position: "absolute", left: 96, top: 56, display: "flex", alignItems: "center", gap: 16, padding: "12px 26px 12px 14px", borderRadius: 999,
      background: C.forest2, border: "2px solid " + C.forestBorder, transform: "scale(" + enter + ")", transformOrigin: "left center" }}>
      {helper ? <HelperBadge who={helper} size={48} /> : <span style={{ width: 14, height: 14, borderRadius: "50%", background: C.lime, marginLeft: 10 }} />}
      <span style={{ fontFamily: F.mono, fontSize: 27, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.white }}>{scene.chapter}</span>
      {scene.sample ? <span style={{ fontFamily: F.mono, fontSize: 22, color: C.onForest }}>· saved sample</span> : null}
    </div>
  );
};

/** Spans of one speaker, merged across short pauses so the badge stays while they talk. */
function spans(cut: Cut, who: Speaker) {
  const out: { from: number; to: number }[] = [];
  for (const s of cut.speakers.filter((x) => x.speaker === who)) {
    const last = out.at(-1);
    if (last && s.from - 6 - last.to <= 36) last.to = s.to + 9; else out.push({ from: s.from - 6, to: s.to + 9 });
  }
  return out;
}

/** The host bottom left on a forest2 panel and the lecturer bottom right, each while they talk, mouths opening with the voice.
 *  A scene that draws its own speaker (the host at the loop's centre, the lecturer at her desk) hides that badge. */
export const Speakers: React.FC<{ cut: Cut }> = ({ cut }) => {
  const frame = useCurrentFrame();
  const scene = sceneAt(cut, frame);
  const hidden = (who: Speaker) => (who === "host" && (scene?.visual === "loop" || scene?.visual === "ring")) || (who === "lecturer" && scene?.visual === "desk");
  return <>{(["host", "lecturer"] as const).map((who) => {
    if (hidden(who)) return null;
    const span = spans(cut, who).find((s) => frame >= s.from && frame < s.to + 12);
    if (!span) return null;
    const enter = pop(frame, span.from, 13);
    const leave = interpolate(frame, [span.to, span.to + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
    const line = cut.speakers.find((s) => s.speaker === who && frame >= s.from && frame < s.to);
    const open = line ? loudness(line.envelope, frame - line.from) : 0;
    return (
      <div key={who} style={{ position: "absolute", top: 796, left: who === "host" ? 96 : 1920 - 96 - 232, width: 232, height: 232, borderRadius: 40,
        background: C.forest2, border: "2px solid " + C.forestBorder, display: "grid", placeItems: "center",
        transform: "scale(" + enter * (1 - leave) + ")", transformOrigin: who === "host" ? "left bottom" : "right bottom" }}>
        <div style={{ width: 196, height: 196, borderRadius: "50%", background: C.tint2, display: "grid", placeItems: "center", overflow: "hidden" }}>
          {who === "host" ? <HostFigure size={176} pose="greeting" mouth={open} /> : <Lecturer size={176} open={open} />}
        </div>
      </div>
    );
  })}</>;
};

const FADE = 4;
const Box: React.FC<{ c: Caption; frame: number }> = ({ c, frame }) => {
  const appear = interpolate(frame, [c.from, c.from + FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const leave = interpolate(frame, [c.to - FADE, c.to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const longest = Math.max(...c.lines.map((l) => l.map((r) => r.t).join("").length));
  const size = longest > 43 ? Math.max(40, Math.floor(48 * (43 / longest))) : 48;
  return (
    <div style={{ position: "absolute", left: 400, width: 1120, top: 880, height: 160, display: "flex", alignItems: "center", justifyContent: "center",
      opacity: Math.min(appear, leave), transform: "translateY(" + (1 - appear) * 8 + "px)" }}>
      <div style={{ position: "relative", overflow: "hidden", background: alpha(C.forest2, 0.85), borderRadius: 18, padding: "14px 30px 14px 36px",
        color: C.white, fontFamily: F.body, fontWeight: 700, fontSize: size, lineHeight: 1.24, textAlign: "center" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: SPEAKER_BAR[c.speaker] }} />
        {c.lines.map((line, i) => (
          <div key={i} style={{ whiteSpace: "pre" }}>
            {line.map((r, k) => r.b ? <span key={k} style={{ color: C.lime, fontWeight: 800 }}>{r.t}</span> : <span key={k}>{r.t}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
};

/** The captions, always on, in the band between the speakers. */
export const Captions: React.FC<{ cut: Cut }> = ({ cut }) => {
  const frame = useCurrentFrame();
  return <>{cut.captions.filter((c) => frame >= c.from && frame < c.to).map((c) => <Box key={c.from} c={c} frame={frame} />)}</>;
};
