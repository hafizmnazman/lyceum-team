// The field (video/style.md): forest at the top to forestDeep at the bottom, a
// soft vignette, and the dot grid drifting slowly like dust in light.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, alpha } from "../theme";

export const Field: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, " + C.forest + " 0%, " + C.forestDeep + " 100%)" }}>
      <AbsoluteFill style={{
        backgroundImage: "radial-gradient(circle at center, " + alpha(C.onForest, 0.12) + " 1.6px, transparent 2.3px)",
        backgroundSize: "36px 36px",
        backgroundPosition: ((frame * 0.12) % 36) + "px " + ((frame * 0.07) % 36) + "px",
      }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, " + alpha(C.forestDeep, 0.6) + " 100%)" }} />
    </AbsoluteFill>
  );
};
