import type { Screen } from "../../app/roles.ts";
import { SECTION_GUIDES } from "../../app/sectionGuides.ts";
import { navigate } from "../../app/store.ts";
import { Button } from "./index.tsx";

/** A section's guide behind a pill; `label` names the step in view when one guide covers several steps. */
export function SectionHelp({ screen, label }: { screen: Screen; label?: string }) {
  const guide = SECTION_GUIDES.find((g) => g.screen === screen);
  if (!guide) return null;
  return (
    <details key={screen} className="section-help">
      <summary>How to use {label ?? guide.title}</summary>
      <div className="section-help-body">
        <p>{guide.purpose}</p>
        <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p><strong>What you get:</strong> {guide.output}</p>
        <p className="limitation"><strong>Current limit:</strong> {guide.limitation}</p>
        <Button variant="quiet" onClick={() => navigate("guide")}>All sections & development progress</Button>
      </div>
    </details>
  );
}
