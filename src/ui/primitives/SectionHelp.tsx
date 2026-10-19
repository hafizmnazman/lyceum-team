import type { Screen } from "../../app/roles.ts";
import { SECTION_GUIDES } from "../../app/sectionGuides.ts";
import { navigate } from "../../app/store.ts";
import { Button } from "./index.tsx";

export function SectionHelp({ screen }: { screen: Screen }) {
  const guide = SECTION_GUIDES.find((g) => g.screen === screen);
  if (!guide) return null;
  return (
    <details key={screen} className="section-help">
      <summary>How to use {guide.title}</summary>
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
