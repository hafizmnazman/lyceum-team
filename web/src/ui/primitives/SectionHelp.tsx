import type { Screen } from "../../app/roles.ts";
import { SECTION_GUIDES } from "../../app/sectionGuides.ts";
import { navigate } from "../../app/store.ts";
import { Button } from "./index.tsx";
import { showPageTour } from "../shell/PageTour.tsx";

/** A section's guide behind a pill; `label` names the step in view when one guide covers several steps. */
export function SectionHelp({ screen, label }: { screen: Screen; label?: string }) {
  const guide = SECTION_GUIDES.find((g) => g.screen === screen);
  if (!guide) return null;
  return (
    <details key={screen} className="section-help">
      <summary>How to use {label ?? guide.title}</summary>
      <SectionGuide screen={screen} />
    </details>
  );
}

/** The guide itself, for a page that opens it from its own header (the course steps' "?"). */
export function SectionGuide({ screen }: { screen: Screen }) {
  const guide = SECTION_GUIDES.find((g) => g.screen === screen);
  if (!guide) return null;
  return (
    <div className="section-help-body">
      <p>{guide.purpose}</p>
      <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <p><strong>What you get:</strong> {guide.output}</p>
      <p className="limitation"><strong>Current limit:</strong> {guide.limitation}</p>
      <div className="button-row">
        <Button onClick={showPageTour}>Show me around this page</Button>
        <Button variant="quiet" onClick={() => navigate("guide")}>All sections & development progress</Button>
      </div>
    </div>
  );
}

export const hasGuide = (screen: Screen) => SECTION_GUIDES.some((g) => g.screen === screen);
