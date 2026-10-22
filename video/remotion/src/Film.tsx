// One cut of the film: the field, each scene in its place with a soft circle
// wipe into it, then the chip, the speakers and the captions over everything,
// and the voices once they are recorded.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import "./fonts";
import { Captions, Chip, Speakers } from "./components/Overlay";
import { Field } from "./components/Field";
import { Desk, Latency, Loop, Receipt } from "./scenes/Drawn";
import { AppScene, Close, Doors, Proof } from "./scenes/Real";
import { C, F } from "./theme";
import { timeline, type CutId, type Scene } from "./timeline";

const VIEWS: Record<string, React.FC<{ scene: Scene }>> = {
  desk: Desk, latency: Latency, receipt: Receipt, loop: Loop, app: AppScene, proof: Proof, doors: Doors, ring: Close,
};
const WIPE = 15;

const SceneView: React.FC<{ scene: Scene; first: boolean }> = ({ scene, first }) => {
  const frame = useCurrentFrame();
  const View = VIEWS[scene.visual];
  if (!View) throw new Error("Scene " + scene.id + " has no visual called " + scene.visual);
  const r = first ? 150 : Math.min(150, (frame / WIPE) * 150);
  return <AbsoluteFill style={{ clipPath: "circle(" + r + "% at 50% 46%)" }}><View scene={scene} /></AbsoluteFill>;
};

export const Film: React.FC<{ cut: CutId }> = ({ cut }) => {
  const c = timeline.cuts[cut];
  return (
    <AbsoluteFill style={{ fontFamily: F.body, color: C.white, background: C.forest }}>
      <Field />
      {c.scenes.map((s, i) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} name={s.id}>
          <SceneView scene={s} first={i === 0} />
        </Sequence>
      ))}
      <Chip cut={c} />
      <Speakers cut={c} />
      <Captions cut={c} />
      {c.speakers.filter((s) => s.audio).map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.to - s.from + 15} layout="none"><Audio src={staticFile(s.audio!)} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
