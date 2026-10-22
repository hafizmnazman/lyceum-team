// The drawn scenes for beats 1, 2, 3 and 4 (video/storyboard.md): the desk, the
// latency, the receipt and the loop. Every number comes from the timeline's
// figures, which scripts/sync.mjs reads from docs/claims.md.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { count, draw, fade, float, glide, pop, wordsShown } from "../anim";
import { HELPER_NAMES, HelperBadge, HostFigure, Lecturer, isHelper } from "../components/Cast";
import { C, F, alpha } from "../theme";
import { cueOf, loudness, timeline, type Scene } from "../timeline";

const FIG = timeline.figures;
/** How open a speaker's mouth is now, from the scene's lines. */
const mouthOf = (scene: Scene, who: "host" | "lecturer", frame: number) => {
  const line = scene.lines.find((l) => l.speaker === who && frame >= l.from && frame < l.to);
  return line ? loudness(line.envelope, frame - line.from) : 0;
};

// ---------- beat 1: the desk ----------
export const Desk: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame(), cue = cueOf(scene);
  const message = pop(frame, cue("message"));
  const doubt = frame - cue("doubt");
  const shuffle = (i: number) => (doubt > 0 && doubt < 40 ? Math.sin((doubt + i * 7) / 3) * 10 * (1 - doubt / 40) : 0);
  const tabs = ["Posting", "Posting", "Posting", "Posting", "Syllabus", "Survey"];
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
        <g transform={"translate(0 " + float(frame, 1, 3) + ")"}>
          <g transform="rotate(-6 520 600)">
            <rect x={370} y={430} width={290} height={370} rx={14} fill={C.white} />
            <text x={398} y={488} fontFamily={F.body} fontSize={28} fontWeight={700} fill={C.ink}>Course outline</text>
            {[520, 556, 592, 640, 676, 712, 760].map((y, i) => <rect key={y} x={398} y={y} width={[220, 190, 210, 180, 216, 140, 200][i]} height={14} rx={7} fill={C.border} />)}
          </g>
        </g>
        <rect x={720} y={300} width={780} height={470} rx={28} fill={C.white} />
        {tabs.map((t, i) => (
          <g key={i} transform={"translate(" + (744 + i * 122 + shuffle(i)) + " 322)"}>
            <rect width={112} height={46} rx={12} fill={i === 0 ? C.white : C.tint1} stroke={C.border} strokeWidth={2} />
            <text x={14} y={30} fontFamily={F.mono} fontSize={19} fill={C.ink3}>{t}</text>
          </g>
        ))}
        <rect x={756} y={404} width={340} height={22} rx={11} fill={C.ink3} />
        {[452, 486, 520, 554, 604, 638, 672, 706].map((y, i) => <rect key={y} x={756} y={y} width={[680, 620, 660, 520, 650, 600, 430, 560][i]} height={14} rx={7} fill={C.border} />)}
        <path d="M680 770 L1540 770 L1600 812 L620 812 Z" fill={C.tint2} />
        <rect x={180} y={812} width={1560} height={28} rx={14} fill={C.forest2} stroke={C.forestBorder} strokeWidth={4} />
      </svg>
      <div style={{ position: "absolute", left: 1500, top: 500, transform: "translateY(" + float(frame, 3, 4) + "px)" }}>
        <Lecturer size={300} open={mouthOf(scene, "lecturer", frame)} />
      </div>
      <div style={{ position: "absolute", left: 1010, top: 96, width: 660, padding: "26px 34px", borderRadius: 28, background: C.forest2, border: "2px solid " + C.forestBorder,
        transform: "scale(" + message + ") translateY(" + float(frame, 2, 3) + "px)", transformOrigin: "left bottom" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.mono, fontSize: 21, letterSpacing: "0.08em", color: C.onForest }}>
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: C.lime }} />PROGRAMME COORDINATOR
        </div>
        <div style={{ marginTop: 12, fontFamily: F.body, fontSize: 38, fontWeight: 600, lineHeight: 1.25, color: C.white }}>Before the review: what should we change, and why?</div>
      </div>
      <div style={{ position: "absolute", left: 96, top: 120, fontFamily: F.mono, fontSize: 22, color: C.onForest }}>Dr Aisyah is a fictional lecturer.</div>
    </AbsoluteFill>
  );
};

// ---------- beat 2: the latency, two graphics, never one chart ----------
export const Latency: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame(), cue = cueOf(scene);
  const { approval, churn } = FIG;
  const cal = cue("calendar"), waf = cue("waffle"), cav = cue("caveat");
  const panel: React.CSSProperties = { position: "absolute", top: 170, width: 820, height: 600, borderRadius: 32, background: C.forest2, padding: "44px 48px" };
  return (
    <AbsoluteFill>
      <div style={{ ...panel, left: 96, opacity: fade(frame, cal - 10, 10) }}>
        <div style={{ fontFamily: F.body, fontSize: 32, color: C.onForest }}>Approving a new degree programme, at the US universities we checked</div>
        <div style={{ marginTop: 18, fontFamily: F.display, fontWeight: 800, fontSize: 132, lineHeight: 1, color: C.white, transform: "scale(" + pop(frame, cal) + ")", transformOrigin: "left center" }}>
          {approval.lo} to {approval.hi} <span style={{ fontSize: 56, fontWeight: 600 }}>months</span>
        </div>
        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(9, 72px)", gap: 14 }}>
          {Array.from({ length: approval.hi }, (_, i) => {
            const on = i < approval.lo && frame >= cal + i * 2;
            return <div key={i} style={{ height: 72, borderRadius: 14, border: "4px solid " + C.ray3, background: on ? C.ray3 : "transparent", opacity: fade(frame, cal + i * 2, 6) }} />;
          })}
        </div>
      </div>
      <div style={{ ...panel, left: 1004, opacity: fade(frame, waf - 10, 10) }}>
        <div style={{ fontFamily: F.body, fontSize: 32, color: C.onForest }}>Workers' skills transformed or outdated, 2025 to 2030</div>
        <div style={{ marginTop: 18, fontFamily: F.display, fontWeight: 800, fontSize: 132, lineHeight: 1, color: C.lime }}>{Math.round(churn.value * count(frame, waf, 28))}%</div>
        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(20, 29px)", gap: 7 }}>
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i} style={{ height: 29, borderRadius: 7, border: "2px solid " + (i < churn.value ? C.lime : C.forestBorder), background: i < churn.value && frame >= waf + Math.floor(i / 2) ? C.lime : "transparent" }} />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 96, top: 800, fontFamily: F.body, fontSize: 34, color: C.onForest, opacity: fade(frame, cav, 12) }}>Different measures of different populations, so never one chart.</div>
    </AbsoluteFill>
  );
};

// ---------- beat 3: the receipt ----------
export const Receipt: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame(), cue = cueOf(scene);
  const r = FIG.receiptSource, slipAt = cue("slip"), countAt = cue("count");
  const enter = glide(frame, slipAt - 6, 22);
  const words = r.sentence.split(" ");
  const shown = wordsShown(frame, slipAt + 10, words.length);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 640, top: 108, padding: "10px 22px", borderRadius: 999, background: C.lime, color: C.forest,
        fontFamily: F.mono, fontSize: 24, fontWeight: 600, letterSpacing: "0.08em", opacity: fade(frame, slipAt, 8) }}>REAL POSTING · SAVED SAMPLE</div>
      <div style={{ position: "absolute", left: 640, top: 172, width: 1184, padding: "52px 60px 44px", borderRadius: 32, background: C.tint1, color: C.ink,
        transform: "translateX(" + (1 - enter) * 300 + "px)", opacity: enter }}>
        <div style={{ fontFamily: F.mono, fontSize: 26, color: C.ink2 }}>{r.employer} · {r.title} · published {r.published}</div>
        <div style={{ margin: "28px 0 34px", paddingLeft: 30, borderLeft: "8px solid " + C.emerald, fontFamily: F.body, fontSize: 54, fontWeight: 600, lineHeight: 1.26 }}>
          “{words.map((w, i) => <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>{w}{i < words.length - 1 ? " " : ""}</span>)}”
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 26, paddingTop: 28, borderTop: "2px solid " + C.border, opacity: fade(frame, countAt - 4, 8) }}>
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 128, lineHeight: 1, color: C.emeraldText }}>{FIG.receipt.num} of {Math.max(FIG.receipt.num, Math.round(FIG.receipt.den * count(frame, countAt, 26)))}</span>
          <span style={{ fontSize: 38, color: C.ink2 }}>reviewed postings</span>
        </div>
        <div style={{ marginTop: 20, fontFamily: F.mono, fontSize: 22, color: C.ink2 }}>{r.link} · retrieved {r.retrieved} · {r.hash}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- beat 4: the loop ----------
// In loop order; Lens appears twice, counting at Report and reading the results at Learn (docs/decisions.md).
const STATIONS: Array<[string, string, string]> = [
  ["folio", "Course", "reads the outline"], ["scout", "Watch", "fetches, on request"], ["atlas", "Report", "quotes and maps"], ["lens", "Report", "counts, with n"],
  ["steward", "Report", "prepares the brief"], ["people", "Decide", "people decide"], ["quill", "Update", "checks the revision"], ["prism", "Teach", "builds the pack"],
  ["lens", "Learn", "reads the results, n of N"],
];
export const Loop: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame(), cue = cueOf(scene);
  const ringAt = cue("ring"), stationsAt = cue("stations"), peopleAt = cue("people");
  // A ring wider than it is tall, so nine stations clear each other and the captions.
  const cx = 960, cy = 440, RX = 430, RY = 300;
  const L = Math.PI * (3 * (RX + RY) - Math.sqrt((3 * RX + RY) * (RX + 3 * RY))); // Ramanujan's perimeter
  const ring = "M " + cx + " " + (cy - RY) + " A " + RX + " " + RY + " 0 1 1 " + cx + " " + (cy + RY) + " A " + RX + " " + RY + " 0 1 1 " + cx + " " + (cy - RY);
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={ring} fill="none" stroke={C.forestBorder} strokeWidth={18} />
        <path d={ring} fill="none" stroke={C.ray2} strokeWidth={8} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw(frame, ringAt - 20, 40))} />
      </svg>
      <div style={{ position: "absolute", left: cx - 150, top: cy - 168, width: 300, display: "grid", justifyItems: "center", transform: "translateY(" + float(frame, 0, 4) + "px)" }}>
        <HostFigure size={260} pose="greeting" mouth={mouthOf(scene, "host", frame)} />
        <span style={{ fontFamily: F.mono, fontSize: 22, color: C.onForest }}>Tualang, the host</span>
      </div>
      {STATIONS.map(([who, step, does], i) => {
        const a = (-90 + (i * 360) / STATIONS.length) * Math.PI / 180, x = cx + RX * Math.cos(a), y = cy + RY * Math.sin(a);
        const s = pop(frame, stationsAt + i * 7);
        const glow = who === "people" ? fade(frame, peopleAt, 10) : 0;
        return (
          <div key={step + i} style={{ position: "absolute", left: x - 160, top: y - 66, width: 320, display: "grid", justifyItems: "center", gap: 4, transform: "scale(" + s + ")" }}>
            {isHelper(who) ? <HelperBadge who={who} size={112} pose="working" /> : (
              <div style={{ width: 112, height: 112, borderRadius: "50%", background: C.tint2, display: "grid", placeItems: "center", boxShadow: "0 0 0 " + 8 * glow + "px " + alpha(C.lime, 0.9) }}>
                <svg viewBox="0 0 24 24" width={60} height={60} fill="none" stroke={C.forest} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>
              </div>
            )}
            <span style={{ padding: "0 10px", borderRadius: 8, background: C.forest, fontFamily: F.display, fontSize: 32, fontWeight: 600, color: who === "people" && glow > 0.5 ? C.lime : C.white }}>{step}</span>
            <span style={{ padding: "0 10px", borderRadius: 8, background: C.forest, fontSize: 21, color: C.onForest }}>{isHelper(who) ? HELPER_NAMES[who] + " " + does : does}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

