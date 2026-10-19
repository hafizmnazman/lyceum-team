// What actually happened, step by step, told by role. Every event is derived
// from a record the workspace holds (a source, a quotation, a version, a brief),
// so the timeline can only show work that was really done. Times are the records'
// own saved times; a derived summary (a count) carries the time of the latest
// record it rests on and says so.

import type { AppState } from "./store.ts";
import { SOURCE_POLICIES } from "../lib/collect.ts";
import { evidenceReport } from "../lib/evidence.ts";

export type RoleId = "folio" | "scout" | "atlas" | "quill" | "prism" | "lens" | "steward";
export interface Role { id: RoleId; name: string; job: string; reads: string; produces: string; cannot: string }
export const ROLES: Role[] = [
  { id: "folio", name: "Folio", job: "Course reader", reads: "Your syllabus, outline and uploaded documents", produces: "A course record with outcomes, topics and locators", cannot: "Declare a document official" },
  { id: "scout", name: "Scout", job: "Industry researcher", reads: "Permitted employer boards, on your request", produces: "Postings with link, publication date, retrieval time and text", cannot: "Collect without being asked, or change the curriculum" },
  { id: "atlas", name: "Atlas", job: "Curriculum mapper", reads: "The kept postings and the skills you name", produces: "Proposed exact quotations and skill-to-outcome mappings for you to confirm", cannot: "Confirm a quotation or a mapping for you" },
  { id: "quill", name: "Quill", job: "Course designer", reads: "The course brief, constraints and the evidence you confirmed", produces: "Outline revisions checked against hours, links and protected topics", cannot: "Approve its own revision" },
  { id: "prism", name: "Prism", job: "Teaching-material creator", reads: "A saved session and the evidence linked to its outcomes", produces: "An editable teaching pack with speaker notes", cannot: "Publish anything or write a word with a model" },
  { id: "lens", name: "Lens", job: "Evidence analyst", reads: "Reviewed postings and confirmed quotations", produces: "Counts with the denominator, intervals, coverage against targets", cannot: "Score employability or predict learning" },
  { id: "steward", name: "Steward", job: "Review assistant", reads: "The brief, its sources and the decision context", produces: "A brief with receipts, sent to the people who decide", cannot: "Decide; the lecturer and the university do" },
];

export interface RunEvent { at: string; role: RoleId; title: string; detail: string; tab?: AppState["studioTab"] }

const time = (iso: string) => iso;

export function runTimeline(state: AppState, subjectId: string | null): RunEvent[] {
  if (!subjectId) return [];
  const events: RunEvent[] = [];
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  for (const draft of state.curriculumDrafts.filter((d) => d.subjectId === subjectId)) {
    for (const h of draft.history) {
      const titles: Record<string, string> = { created: "Revision started", saved: "Revision saved", checked: "Constraints checked", adopted: "Version adopted", discarded: "Revision discarded" };
      events.push({ at: h.at, role: "quill", title: titles[h.action] ?? h.action, detail: h.note + " (" + name(h.byPersonId) + ")", tab: h.action === "adopted" ? "history" : "curriculum" });
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
    events.push({ at: first.addedAt, role: "scout", title: (first.collection!.provider === "sample" ? "Imported from the dated saved sample, " : "Fetched live on request, ") + batch.length + " postings kept", detail: policy.name + " · retrieved " + time(first.collection!.retrievedAt) + " · " + batch.filter((b) => b.duplicateOf).length + " duplicate copies", tab: "evidence" });
  }
  for (const s of sources.filter((x) => !x.collection)) events.push({ at: s.addedAt, role: "folio", title: "Document recorded: " + s.title, detail: (s.organisation || "organisation not named") + " · pasted by " + name(s.addedBy), tab: "evidence" });
  const mentions = state.skillMentions.filter((m) => m.subjectId === subjectId);
  // Quotations are grouped by the minute they were confirmed in; the group takes
  // the time of its first quotation, never a rounded one.
  const byMinute = new Map<string, { count: number; first: string }>();
  for (const m of mentions) {
    const key = m.addedAt.slice(0, 16);
    const group = byMinute.get(key);
    if (group) { group.count += 1; if (m.addedAt < group.first) group.first = m.addedAt; } else byMinute.set(key, { count: 1, first: m.addedAt });
  }
  for (const [, { count, first }] of byMinute) events.push({ at: first, role: "atlas", title: count + " exact quotations confirmed", detail: "Each verified against its source text; paraphrases rejected", tab: "evidence" });
  const reviewed = sources.filter((s) => s.reviewed && !s.duplicateOf);
  if (reviewed.length) {
    const report = evidenceReport(subjectId, state.evidenceSources, state.skillMentions, state.skillMappings, state.clos.filter((c) => c.subjectId === subjectId));
    const latest = reviewed.map((s) => s.addedAt).sort().at(-1)!;
    const top = report.rows.filter((r) => r.postings > 0).slice(0, 3).map((r) => r.skill + " " + r.postings + " of " + report.eligible).join(", ");
    events.push({ at: latest, role: "lens", title: "Current count over " + report.eligible + " reviewed postings", detail: (top ? "Top: " + top + ". Wilson 95% intervals shown; no score." : "No requirement quoted yet") + " Reflects the records as they are now.", tab: "evidence" });
  }
  for (const m of state.skillMappings.filter((x) => x.subjectId === subjectId)) {
    const labels = m.cloIds.map((id) => state.clos.find((c) => c.id === id)?.label ?? id).join(", ") || "no outcome";
    events.push({ at: m.updatedAt, role: "atlas", title: "Mapped " + m.skill + " to " + labels, detail: "Coverage " + m.stage + ", target " + m.target + (m.evidence ? " · " + m.evidence : ""), tab: "evidence" });
  }
  for (const s of state.teachingPlans.find((p) => p.subjectId === subjectId)?.sessions ?? []) events.push({ at: s.updatedAt, role: "prism", title: "Session saved: week " + s.week + ", " + s.topic, detail: s.minutes + " minutes · " + (s.cloIds.length ? "linked to " + s.cloIds.join(", ") : "no outcome linked") + " · teaching pack available", tab: "plan" });
  for (const t of state.testDrafts.filter((x) => x.subjectId === subjectId)) if (t.items.length) events.push({ at: state.subjectVersions.find((v) => v.id === t.courseVersionId)?.changedAt ?? "", role: "quill", title: t.items.length + " template assessment items drafted", detail: "Blueprint over " + t.blueprint.cloWeights.length + " outcomes · labelled as templates", tab: "assessment" });
  for (const b of state.evidenceBriefs.filter((x) => x.subjectId === subjectId)) {
    events.push({ at: b.createdAt, role: "steward", title: "Meeting brief prepared", detail: b.recommendation + " · by " + name(b.createdBy) + " · receipts attached", tab: "evidence" });
    if (b.sentAt) events.push({ at: b.sentAt, role: "steward", title: "Brief sent to " + b.recipients.map(name).join(", "), detail: "Read " + (state.notifications.filter((n) => n.briefId === b.id && n.read).length) + " of " + b.recipients.length + " so far", tab: "evidence" });
  }
  return events.filter((e) => e.at).sort((a, b) => a.at.localeCompare(b.at));
}
