// The two cuts (plan Section 16): Loop90, about 90 seconds, for the pitch and the
// landing page; Afternoon, about three minutes, for the organiser and the booth.
// Their lengths come from the timeline: the recordings once they exist, the
// script's words until then.
import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { timeline } from "./timeline";

export const Root: React.FC = () => (
  <>
    {(["Loop90", "Afternoon"] as const).map((cut) => (
      <Composition key={cut} id={cut} component={Film} defaultProps={{ cut }}
        durationInFrames={timeline.cuts[cut].durationInFrames} fps={timeline.fps} width={timeline.width} height={timeline.height} />
    ))}
  </>
);
