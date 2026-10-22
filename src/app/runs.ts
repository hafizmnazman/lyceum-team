// What actually happened, step by step, told by role. The timeline reads the
// append-only event log first (decisions, snapshots, adoptions, briefs prepared,
// sent and read, term changes): those lines carry the time the thing happened.
// Records that have no event (sources, quotations, mappings, sessions, and work
// saved before the log existed) are derived from the records themselves and
// labelled derived; a derived count says it reflects the records as they are
// now, so the record never claims a time it does not have (plan Section 4).

import type { AppState } from "./store.ts";
import type { CourseStep } from "./loop.ts";
import { SOURCE_POLICIES } from "../lib/collect.ts";
import { OUTCOME_LABEL } from "../lib/decisions.ts";
import { evidenceReport, RECOMMENDATION_LABEL } from "../lib/evidence.ts";

export type RoleId = "folio" | "scout" | "atlas" | "quill" | "prism" | "lens" | "steward";
export interface Role { id: RoleId; name: string; job: string; reads: string; produces: string; cannot: string }
export const ROLES: Role[] = [
  { id: "folio", name: "Folio", job: "Course reader", reads: "Your syllabus, outline and uploaded documents", produces: "A course record with outcomes, topics and locators", cannot: "Declare a document official" },
  { id: "scout", name: "Scout", job: "Industry researcher", reads: "Permitted employer boards, on your request", produces: "Postings with link, publication date, retrieval time and text", cannot: "Collect without being asked, or change the curriculum" },
  { id: "atlas", name: "Atlas", job: "Curriculum mapper", reads: "The kept postings and the skills you name", produces: "Proposed exact quotations and skill-to-outcome mappings for you to confirm", cannot: "Confirm a quotation or a mapping for you" },
  { id: "lens", name: "Lens", job: "Evidence analyst", reads: "Reviewed postings and confirmed quotations", produces: "Counts with the denominator, intervals, coverage against targets", cannot: "Score employability or predict learning" },
  { id: "steward", name: "Steward", job: "Review assistant", reads: "The brief, its sources and the decision context", produces: "A brief with receipts, sent to the people who decide", cannot: "Decide; the lecturer and the university do" },
  { id: "quill", name: "Quill", job: "Course designer", reads: "The decision, the constraints and the evidence you confirmed", produces: "Outline revisions checked against hours, links and protected topics", cannot: "Adopt its own revision" },
  { id: "prism", name: "Prism", job: "Teaching-material creator", reads: "A saved session and the evidence linked to its outcomes", produces: "An editable teaching pack with speaker notes", cannot: "Publish anything or write a word with a model" },
];

/** A line on the timeline. `role` is a helper, or "people" for a decision people recorded. */
export interface RunEvent { at: string; role: RoleId | "people"; title: string; detail: string; step?: CourseStep; derived: boolean }

export function runTimeline(state: AppState, subjectId: string | null): RunEvent[] {
  if (!subjectId) return [];
  const out: RunEvent[] = [];
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  const events = state.events.filter((e) => e.refs.subjectId === subjectId);
  const briefWithEvent = new Set(events.filter((e) => e.kind === "brief-prepared").map((e) => e.refs.briefId));
  const sentWithEvent = new Set(events.filter((e) => e.kind === "brief-sent").map((e) => e.refs.briefId));
  const adoptedWithEvent = new Set(events.filter((e) => e.kind === "version-adopted").map((e) => e.refs.draftId));

  // ---- the event log: what happened, at the time it happened ----
  for (const e of events) {
    const brief = e.refs.briefId ? state.evidenceBriefs.find((b) => b.id === e.refs.briefId) : undefined;
    if (e.kind === "brief-prepared") out.push({ at: e.at, role: "steward", title: "Meeting brief prepared", detail: (brief ? RECOMMENDATION_LABEL[brief.recommendation] : "a brief") + " · by " + name(e.byPersonId) + " · receipts attached", step: "report", derived: false });
    else if (e.kind === "brief-sent") out.push({ at: e.at, role: "steward", title: "Brief sent to " + (brief?.recipients.map(name).join(", ") ?? "colleagues"), detail: "By " + name(e.byPersonId) + " · the decision stays with people", step: "decide", derived: false });
    else if (e.kind === "brief-read") out.push({ at: e.at, role: "steward", title: "Brief read by " + name(e.byPersonId), detail: "Opened on their Home page with the receipts attached", step: "decide", derived: false });
    else if (e.kind === "decision-recorded") {
      const d = state.briefDecisions.find((x) => x.id === e.refs.decisionId);
      const self = d && brief && d.byPersonId === brief.createdBy;
      out.push({ at: e.at, role: "people", title: (d ? OUTCOME_LABEL[d.outcome] : "Decision") + ", recorded by " + name(e.byPersonId) + (self ? " (self-recorded)" : ""), detail: d ? "“" + d.note + "” · term " + (d.term || "not set") : "", step: "decide", derived: false });
    }
    else if (e.kind === "snapshot-frozen") {
      const s = state.evidenceSnapshots.find((x) => x.id === e.refs.snapshotId);
      out.push({ at: e.at, role: "scout", title: "Evidence snapshot frozen" + (s ? ": " + s.label : ""), detail: s ? s.eligible + " reviewed postings, " + s.skills.length + " skills, frozen for comparison" : "The snapshot was later removed; its event stays", step: "watch", derived: false });
    }
    else if (e.kind === "version-adopted") out.push({ at: e.at, role: "quill", title: "Version adopted: " + (e.refs.versionId ?? "a new version"), detail: "By " + name(e.byPersonId) + " · the previous version is kept", step: "history", derived: false });
    else if (e.kind === "term-set") out.push({ at: e.at, role: "folio", title: "Teaching term set to " + (e.refs.term || "none"), detail: e.refs.previousTerm ? "Was " + e.refs.previousTerm + "; a new loop starts for the new term" : "The first term stated for this course", step: "teach", derived: false });
  }

  // ---- derived from the records: no event exists for these ----
  for (const draft of state.curriculumDrafts.filter((d) => d.subjectId === subjectId)) {
    for (const h of draft.history) {
      if (h.action === "adopted" && adoptedWithEvent.has(draft.id)) continue;
      const titles: Record<string, string> = { created: "Revision started", saved: "Revision saved", checked: "Constraints checked", adopted: "Version adopted", discarded: "Revision discarded" };
      out.push({ at: h.at, role: "quill", title: titles[h.action] ?? h.action, detail: h.note + " (" + name(h.byPersonId) + ")", step: h.action === "adopted" ? "history" : "update", derived: true });
    }
  }
  const sources = state.evidenceSources.filter((s) => s.subjectId === subjectId);
  const batches = new Map<string, typeof sources>();
  for (const s of sources.filter((x) => x.collection)) {
    const key = s.collection!.label + "|" + s.collection!.retrievedAt;
    batches.set(key, [...(batches.get(key) ?? []), s]);
  }
  for (const [, batch] of batches) {
    const first = batch[0];
    const policy = SOURCE_POLICIES[first.collection!.provider];
    out.push({ at: first.addedAt, role: "scout", title: (first.collection!.provider === "sample" ? "Imported from the dated saved sample, " : "Fetched live on request, ") + batch.length + " postings kept", detail: policy.name + " · retrieved " + first.collection!.retrievedAt + " · " + batch.filter((b) => b.duplicateOf).length + " duplicate copies", step: "watch", derived: true });
  }
  for (const s of sources.filter((x) => !x.collection)) out.push({ at: s.addedAt, role: "folio", title: "Document recorded: " + s.title, detail: (s.organisation || "organisation not named") + " · pasted by " + name(s.addedBy), step: "watch", derived: true });
  const mentions = state.skillMentions.filter((m) => m.subjectId === subjectId);
  // Quotations are grouped by the minute they were confirmed in; the group takes
  // the time of its first quotation, never a rounded one.
  const byMinute = new Map<string, { count: number; first: string }>();
  for (const m of mentions) {
    const key = m.addedAt.slice(0, 16);
    const group = byMinute.get(key);
    if (group) { group.count += 1; if (m.addedAt < group.first) group.first = m.addedAt; } else byMinute.set(key, { count: 1, first: m.addedAt });
  }
  for (const [, { count, first }] of byMinute) out.push({ at: first, role: "atlas", title: count + " exact quotations confirmed", detail: "Each verified against its source text; paraphrases rejected", step: "report", derived: true });
  const reviewed = sources.filter((s) => s.reviewed && !s.duplicateOf);
  if (reviewed.length) {
    const report = evidenceReport(subjectId, state.evidenceSources, state.skillMentions, state.skillMappings, state.clos.filter((c) => c.subjectId === subjectId));
    const latest = reviewed.map((s) => s.addedAt).sort().at(-1)!;
    const top = report.rows.filter((r) => r.postings > 0).slice(0, 3).map((r) => r.skill + " " + r.postings + " of " + report.eligible).join(", ");
    out.push({ at: latest, role: "lens", title: "Current count over " + report.eligible + " reviewed postings", detail: (top ? "Top: " + top + ". Wilson 95% intervals shown; no score." : "No requirement quoted yet") + " The count as the records stand now.", step: "report", derived: true });
  }
  for (const m of state.skillMappings.filter((x) => x.subjectId === subjectId)) {
    const labels = m.cloIds.map((id) => state.clos.find((c) => c.id === id)?.label ?? id).join(", ") || "no outcome";
    out.push({ at: m.updatedAt, role: "atlas", title: "Mapped " + m.skill + " to " + labels, detail: "Coverage " + m.stage + ", target " + m.target + (m.evidence ? " · " + m.evidence : ""), step: "report", derived: true });
  }
  for (const s of state.teachingPlans.find((p) => p.subjectId === subjectId)?.sessions ?? []) out.push({ at: s.updatedAt, role: "prism", title: "Session saved: week " + s.week + ", " + s.topic, detail: s.minutes + " minutes · " + (s.cloIds.length ? "linked to " + s.cloIds.join(", ") : "no outcome linked") + " · teaching pack available", step: "teach", derived: true });
  for (const t of state.testDrafts.filter((x) => x.subjectId === subjectId)) if (t.items.length) out.push({ at: state.subjectVersions.find((v) => v.id === t.courseVersionId)?.changedAt ?? "", role: "quill", title: t.items.length + " template assessment items drafted", detail: "Blueprint over " + t.blueprint.cloWeights.length + " outcomes · labelled as templates", step: "teach", derived: true });
  for (const b of state.evidenceBriefs.filter((x) => x.subjectId === subjectId)) {
    if (!briefWithEvent.has(b.id)) out.push({ at: b.createdAt, role: "steward", title: "Meeting brief prepared", detail: b.recommendation + " · by " + name(b.createdBy) + " · receipts attached", step: "report", derived: true });
    if (b.sentAt && !sentWithEvent.has(b.id)) out.push({ at: b.sentAt, role: "steward", title: "Brief sent to " + b.recipients.map(name).join(", "), detail: "Read " + (state.notifications.filter((n) => n.briefId === b.id && n.read).length) + " of " + b.recipients.length + " so far", step: "decide", derived: true });
  }
  return out.filter((e) => e.at).sort((a, b) => a.at.localeCompare(b.at) || Number(a.derived) - Number(b.derived));
}
