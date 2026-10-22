// Watch, step 1 of the loop (plan Sections 4 and 5.3): what employers are
// asking for, right now and over time. The one action is "Fetch postings", on
// request only, from a permitted board or the dated saved sample; the kept
// sources sit on a dated timeline; snapshots compare one review's evidence with
// the next. Postings are not evidence until someone reads them: Report does that.

import { currentPerson, openStep, useStore } from "../../app/store.ts";
import { can } from "../../app/roles.ts";
import { Disclosure, EmptyState } from "../primitives/index.tsx";
import { Handoff } from "../primitives/loop.tsx";
import { ResearchRun } from "./EvidenceResearch.tsx";
import { RecordSourceForm, SourceTimeline } from "./EvidenceWorkspace.tsx";
import { EvidenceWatch } from "./EvidenceWatch.tsx";
import { StepFrame, courseContext } from "./StepFrame.tsx";

export function WatchScreen() {
  const state = useStore();
  const person = currentPerson();
  if (!person) return null;
  const { subject, subjects } = courseContext(state, person);
  if (!subject) return <EmptyState title="No course to watch yet" body="Open an assigned course, or create a personal course workspace, then fetch postings for it." />;
  const mayEdit = can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments });
  const sources = state.evidenceSources.filter((s) => s.subjectId === subject.id);
  return <StepFrame state={state} step="watch" subject={subject} subjects={subjects}
    helper={{ who: "scout", line: "Fetches only when you ask, from a source with a stated policy, and keeps the link, the publication date and the retrieval time." }}>
    <div data-demo-id="evidence-panel">
      <ResearchRun state={state} person={person} subject={subject} mayEdit={mayEdit} />
      <section className="workspace-panel" aria-labelledby="kept-sources">
        <div className="section-heading"><div><h2 id="kept-sources">Kept sources</h2><p className="muted">Each kept posting is a receipt: its link, its publication date as published, its retrieval time and a fingerprint of its text. It counts only after you review it in Report.</p></div></div>
        <SourceTimeline state={state} person={person} subject={subject} mayEdit={mayEdit} />
        <Disclosure summary="Paste a document you are permitted to keep" data-demo-id="paste-document">
          <RecordSourceForm state={state} person={person} subject={subject} mayEdit={mayEdit} />
        </Disclosure>
      </section>
      <EvidenceWatch state={state} person={person} subject={subject} mayEdit={mayEdit} />
      {sources.length ? <Handoff step="watch" record={sources.length + (sources.length === 1 ? " source kept." : " sources kept.")} onNext={() => openStep(subject.id, "report", "quote")} /> : null}
    </div>
  </StepFrame>;
}
