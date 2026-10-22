// Report, step 2 of the loop (plan Sections 4 and 5.3): what exactly employers
// ask, how often, and what the course does about it. Five sub-steps, each in the
// URL (#/course/:id/report/<tab>): Quote, Review, Count, Map and Brief. A count
// is not a decision; Decide answers it.

import { useState } from "react";
import { can } from "../../app/roles.ts";
import { loopState, type ReportTab } from "../../app/loop.ts";
import { currentPerson, openStep, selectReportTab, useStore } from "../../app/store.ts";
import { Disclosure, EmptyState } from "../primitives/index.tsx";
import { Handoff, SubRail } from "../primitives/loop.tsx";
import { DenominatorReview, MeetingBriefPanel, QuoteProposals } from "./EvidenceResearch.tsx";
import { ConfirmedQuotations, CountTable, CoverageLadder, DuplicateList, EvidenceExport, QuoteByHand, ReviewList, SkillCards, courseReport } from "./EvidenceWorkspace.tsx";
import { StepFrame, courseContext, type StepHelper } from "./StepFrame.tsx";

const HELPERS: Record<ReportTab, StepHelper> = {
  quote: { who: "atlas", line: "Proposes the sentence that names each skill; you confirm every quotation against its source." },
  review: { who: "lens", line: "Counts a posting only after you vouch that its extraction is complete." },
  count: { who: "lens", line: "Shows each count over the reviewed postings with its interval. It never scores." },
  map: { who: "atlas", line: "Holds the thread between a skill and an outcome: what the course does today, and what it should reach." },
  brief: { who: "steward", line: "Prepares the brief with every receipt and sends it to the people who decide." },
};

export function ReportScreen() {
  const state = useStore();
  const person = currentPerson();
  const [focusSkill, setFocusSkill] = useState<string | null>(null);
  if (!person) return null;
  const { subject, subjects } = courseContext(state, person);
  if (!subject) return <EmptyState title="No course to report on yet" body="Open an assigned course and keep some postings in Watch first." />;
  const mayEdit = can(person, "draft-change", { subjectId: subject.id, assignments: state.assignments });
  const tab = state.reportTab;
  const loop = loopState(state, subject.id);
  const report = courseReport(state, subject.id);
  const outcomes = new Set(state.clos.filter((c) => c.subjectId === subject.id).map((c) => c.id));
  const props = { state, person, subject, mayEdit };
  const done: Partial<Record<ReportTab, boolean>> = {
    quote: state.skillMentions.some((m) => m.subjectId === subject.id),
    review: report.eligible > 0 && report.unreviewed === 0,
    count: report.eligible > 0 && report.rows.some((r) => r.postings > 0),
    map: state.skillMappings.some((m) => m.subjectId === subject.id && m.cloIds.some((id) => outcomes.has(id))),
    brief: Boolean(loop.latestBrief),
  };
  return <StepFrame state={state} step="report" subject={subject} subjects={subjects} helper={HELPERS[tab]}>
    <SubRail active={tab} onSelect={selectReportTab} done={done} />
    <div role="tabpanel" id={"subrail-panel-" + tab} aria-labelledby={"subrail-tab-" + tab} data-demo-id={"report-" + tab}>
      {tab === "quote" ? <section className="workspace-panel">
        <QuoteProposals {...props} />
        <QuoteByHand {...props} />
        <div className="curriculum-object"><h4>Confirmed quotations</h4><ConfirmedQuotations {...props} /></div>
      </section> : null}
      {tab === "review" ? <section className="workspace-panel">
        <DenominatorReview {...props} />
        <ReviewList {...props} />
        <Disclosure summary="Duplicate copies set aside"><DuplicateList {...props} /></Disclosure>
      </section> : null}
      {tab === "count" ? <section className="workspace-panel" aria-labelledby="observed-requirements" data-demo-id="observed-requirements">
        <div className="section-heading"><div><h3 id="observed-requirements">What employers ask for, counted</h3><p className="muted">Over the {report.eligible} reviewed postings, each with its 95% Wilson interval.</p></div>
          <EvidenceExport state={state} subject={subject} /></div>
        <SkillCards state={state} subject={subject} onMap={mayEdit ? (skill) => { setFocusSkill(skill); selectReportTab("map"); } : undefined} />
        <Disclosure summary="The full table, the coverage index and the trend"><CountTable state={state} subject={subject} /></Disclosure>
      </section> : null}
      {tab === "map" ? <section className="workspace-panel" aria-labelledby="coverage-ladder">
        <h3 id="coverage-ladder">What the course does about each skill</h3>
        <p className="muted">Your judgement of the course today and the target it should reach, with its evidence cited. Not a measured outcome.</p>
        <CoverageLadder {...props} focusSkill={focusSkill} />
      </section> : null}
      {tab === "brief" ? <MeetingBriefPanel {...props} /> : null}
    </div>
    {loop.latestBrief ? <Handoff step="report" record="Brief prepared." onNext={() => openStep(subject.id, "decide")} /> : null}
  </StepFrame>;
}
