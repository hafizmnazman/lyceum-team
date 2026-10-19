// The self-driving demo script: the storyline the cursor performs over the real
// app. Every step targets a data-demo-id that exists in the shipped screens
// (a target ending in * matches by prefix); `wait` steps poll real store state,
// never a duration.
//
// The storyline is a full tour of one course in one afternoon: a coordinator
// revises the outline under constraint checks, runs his own research against a
// dated sample of real postings, confirms exact quotations and watches a
// paraphrase get rejected, reviews the denominator, maps a skill to an outcome,
// plans a session and downloads its editable slide pack, drafts a template
// assessment, prepares a meeting brief with slides and sends it to the
// programme owner, who reads it with the receipts attached. Nothing runs by
// itself and nothing changes the course without the lecturer.

export interface DemoStep {
  caption: string;
  target?: string; // data-demo-id, or a prefix followed by *
  action: "move" | "click" | "type" | "select" | "wait" | "switchUser" | "hold" | "sampleIfFailed";
  value?: string; // text for type, option value for select, personId for switchUser, predicate for wait
  settleMs: number; // pause after the action
  scroll?: string; // "top" | "bottom" | a data-demo-id to centre
}

export const SCRIPT: DemoStep[] = [
  // ---- Act 1: the coordinator's question ----
  { caption: "Dr Sobri coordinates CS310. He wants to check it against what employers ask for.", action: "switchUser", value: "P-SOBRI", settleMs: 2400 },
  { caption: "His courses, with the preparation each one needs.", target: "nav-courses", action: "click", settleMs: 1600 },
  { caption: "CS310: current outcome, teaching context, sources and the next class to prepare.", target: "course-open-CS310", action: "click", settleMs: 3200 },

  // ---- Act 2: the course outline under constraints ----
  { caption: "Outcomes and topics. A revision starts from the current version; the baseline is preserved.", target: "tab-curriculum", action: "click", settleMs: 1800 },
  { caption: "He starts a revision.", target: "curriculum-start", action: "click", settleMs: 1800 },
  { caption: "He sharpens the outcome wording himself.", target: "curriculum-outcome-text", action: "type", value: " with dashboards that answer a stakeholder's question", settleMs: 1200 },
  { caption: "A new topic, with its hours declared. Adding a topic never expands the timetable.", target: "curriculum-add-topic", action: "click", settleMs: 1000 },
  { caption: "", target: "curriculum-topic-title", action: "type", value: "Dashboards and data storytelling", settleMs: 600 },
  { caption: "Three contact hours.", target: "curriculum-topic-hours", action: "type", value: "3", settleMs: 800 },
  { caption: "Linked to the outcome it supports.", target: "topic-outcome-CLO5", action: "click", settleMs: 1200 },
  { caption: "Why, and for which term. The reason travels with the version.", target: "curriculum-reason", action: "type", value: "Employers ask for dashboards; the course names visualisation but has no dashboard exercise.", settleMs: 600 },
  { caption: "", target: "curriculum-term", action: "type", value: "2026/2027 semester 1", settleMs: 800 },
  { caption: "Save, then check: broken links, cycles, exceeded hours and removed protected topics would block it.", target: "curriculum-save", action: "click", settleMs: 1400 },
  { caption: "Checked. Unknown budgets stay visible as warnings, never hidden in a score.", target: "curriculum-check", action: "click", settleMs: 2600 },
  { caption: "His explicit decision: use it as the local course version. University approval stays in its process.", target: "curriculum-ack", action: "click", settleMs: 1200 },
  { caption: "", target: "curriculum-adopt", action: "click", settleMs: 800 },
  { caption: "A new version, with the previous one kept and the decision recorded.", action: "wait", value: "revision-adopted", settleMs: 2400 },
  { caption: "History: every version and every decision, exportable.", target: "tab-history", action: "click", settleMs: 3400 },

  // ---- Act 3: the research run ----
  { caption: "Evidence: research the lecturer runs, not a feed that runs itself.", target: "tab-evidence", action: "click", settleMs: 2200 },
  { caption: "A source with a stated policy. He picks an employer's public job board and fetches it live, through the local API.", target: "collect-provider", action: "select", value: "greenhouse", settleMs: 1800 },
  { caption: "The employer's board token, the same one in its careers page link.", target: "collect-board", action: "type", value: "stripe", settleMs: 800 },
  { caption: "The roles his graduates apply to.", target: "collect-query", action: "type", value: "data analyst", settleMs: 1000 },
  { caption: "Fetch. Watch the log: the request to the board, the bytes received, the retrieval time.", target: "collect-run", action: "click", settleMs: 600 },
  { caption: "Postings published recently, each with its link. Nothing invented, nothing pasted.", action: "wait", value: "collect-done", settleMs: 4200, scroll: "collect-log" },
  { caption: "If the board cannot be reached, the dated saved sample of the same board stands in, and the log says so.", action: "sampleIfFailed", settleMs: 1200 },
  { caption: "He keeps the ones worth reading.", target: "collect-select-all", action: "click", settleMs: 1400 },
  { caption: "Imported as sources. They count only after he reviews them.", target: "collect-import", action: "click", settleMs: 800 },
  { caption: "Each posting is now a receipt he can open.", action: "wait", value: "sources-imported", settleMs: 2600 },

  // ---- Act 4: exact quotations ----
  { caption: "The skills he cares about, in his own words.", target: "lexicon-terms", action: "type", value: "SQL, Python, dashboards|dashboard, stakeholders|stakeholder, statistics|statistical", settleMs: 1000 },
  { caption: "Saved with the course.", target: "lexicon-save", action: "click", settleMs: 1400 },
  { caption: "Scan: the sentence that names each term, proposed for his confirmation.", target: "scan-run", action: "click", settleMs: 800 },
  { caption: "Exact sentences from the postings.", action: "wait", value: "scan-proposals", settleMs: 4000 },
  { caption: "He confirms them. Each quotation is verified against its source.", target: "scan-confirm-all", action: "click", settleMs: 2200 },
  { caption: "What if he paraphrases instead? He types a quotation that is not in the posting.", target: "mention-skill", action: "type", value: "Python", settleMs: 600 },
  { caption: "", target: "mention-excerpt", action: "type", value: "experience with Python", settleMs: 600 },
  { caption: "Rejected: the words are not in the saved source text. Only exact quotations are kept.", target: "mention-add", action: "click", settleMs: 4200 },
  { caption: "He vouches for the extraction before the postings count.", target: "review-all-ack", action: "click", settleMs: 1200 },
  { caption: "Now the denominator is honest: reviewed postings only.", target: "review-all", action: "click", settleMs: 1000 },
  { caption: "Numerator, denominator and a confidence interval. No employability score.", action: "hold", settleMs: 5200, scroll: "observed-requirements" },

  // ---- Act 5: the course decision ----
  { caption: "What does CS310 do about the most-requested skill today? He maps it to its outcome.", target: "mapping-open", action: "click", settleMs: 1600 },
  { caption: "CLO5 covers visualisation.", target: "mapping-outcome-CLO5", action: "click", settleMs: 1200 },
  { caption: "Documented coverage today: introduced.", target: "mapping-stage", action: "select", value: "introduced", settleMs: 1200 },
  { caption: "The target for this course: practised.", target: "mapping-target", action: "select", value: "practised", settleMs: 1200 },
  { caption: "With the course evidence cited.", target: "mapping-evidence", action: "type", value: "Week 6 lab touches this; no dedicated exercise yet.", settleMs: 800 },
  { caption: "Saved as his reviewed judgement, not a measured outcome.", target: "mapping-save", action: "click", settleMs: 2600 },

  // ---- Act 6: the teaching session and its slide pack ----
  { caption: "Teaching plan: the class that turns the evidence into learning.", target: "tab-plan", action: "click", settleMs: 1800 },
  { caption: "A new session.", target: "plan-add", action: "click", settleMs: 1200 },
  { caption: "", target: "session-topic", action: "type", value: "Dashboard lab: from a messy dataset to a decision", settleMs: 600 },
  { caption: "Linked to the outcome, so the evidence follows it.", target: "session-clo-CLO5", action: "click", settleMs: 1000 },
  { caption: "What students will do.", target: "session-activity", action: "type", value: "In pairs, build a dashboard from the sample dataset and defend one design choice.", settleMs: 600 },
  { caption: "How he will know it worked.", target: "session-check", action: "type", value: "Exit question: which chart here would mislead a stakeholder, and why?", settleMs: 600 },
  { caption: "Ready to teach requires an outcome, an activity and a check.", target: "session-status", action: "select", value: "ready", settleMs: 1000 },
  { caption: "", target: "session-save", action: "click", settleMs: 800 },
  { caption: "Saved. One click more: an editable slide pack for the class.", action: "wait", value: "session-saved", settleMs: 2000 },
  { caption: "Outcomes, the employer evidence behind them with exact quotations, the activity and the check. Editable in PowerPoint; no AI text.", target: "session-slides-*", action: "click", settleMs: 5200 },

  // ---- Act 7: the assessment ----
  { caption: "Assessment: a blueprint and template items, honestly labelled.", target: "tab-assessment", action: "click", settleMs: 1800 },
  { caption: "", target: "assessment-start", action: "click", settleMs: 1600 },
  { caption: "Template items against the outcome weights. Exact marks and rubrics are the next package.", target: "assessment-generate", action: "click", settleMs: 800 },
  { caption: "", action: "wait", value: "items-generated", settleMs: 3600 },

  // ---- Act 8: the meeting ----
  { caption: "Time to bring it to the programme meeting.", target: "tab-evidence", action: "click", settleMs: 1200 },
  { caption: "His recommendation.", target: "brief-recommendation", action: "select", value: "refresh", settleMs: 1200, scroll: "meeting-brief" },
  { caption: "In his words.", target: "brief-notes", action: "type", value: "Add a dashboard exercise in week 6 within existing hours; keep the statistics foundation.", settleMs: 800 },
  { caption: "A brief with the table, the options and every receipt.", target: "brief-prepare", action: "click", settleMs: 800 },
  { caption: "Ready to download, as a document or as slides.", action: "wait", value: "brief-ready", settleMs: 2600 },
  { caption: "The same brief as editable slides for the meeting, generated from the receipts.", target: "brief-slides", action: "click", settleMs: 4200 },
  { caption: "He sends it to Dr Rahman, who owns the programme.", target: "brief-recipient-P-RAHMAN", action: "click", settleMs: 1200 },
  { caption: "Sent. The decision stays with people.", target: "brief-send", action: "click", settleMs: 2400 },
  { caption: "What actually happened this afternoon, step by step, by role. Every line is a saved record he can open.", target: "nav-office", action: "click", settleMs: 5600, scroll: "run-timeline" },

  // ---- Act 9: the guide and the reader ----
  { caption: "Every section has a guide, and the workspace backs up to a validated file that restores with a preview.", target: "nav-guide", action: "click", settleMs: 4600, scroll: "backup-export" },
  { caption: "Dr Rahman signs in.", action: "switchUser", value: "P-RAHMAN", settleMs: 1400 },
  { caption: "The brief is waiting on his Home page.", target: "nav-inbox", action: "click", settleMs: 2400 },
  { caption: "He reads it with the receipts attached.", target: "inbox-open-top", action: "click", settleMs: 1000 },
  { caption: "Evidence he can inspect. A change the lecturer controls. Materials the lecturer can use.", action: "wait", value: "brief-read", settleMs: 6400 },
  { caption: "Lyceum. Research the lecturer runs, decisions the lecturer explains.", action: "hold", settleMs: 3600 },
];

// ---- runtime estimate (for the progress bar) ----
import { PRE_ACT_MS, TWEEN_MS, TYPE_CHAR_MS, SWITCH_PAD_MS } from "./timing.ts";

const WAIT_MS: Record<string, number> = {
  "revision-adopted": 400,
  "collect-done": 1200,
  "sources-imported": 400,
  "scan-proposals": 400,
  "session-saved": 400,
  "items-generated": 400,
  "brief-ready": 400,
  "brief-read": 400,
};

function stepCost(step: DemoStep): number {
  switch (step.action) {
    case "move":
      return TWEEN_MS + step.settleMs;
    case "switchUser":
      return TWEEN_MS * 2 + PRE_ACT_MS + SWITCH_PAD_MS + step.settleMs;
    case "click":
    case "select":
      return TWEEN_MS + PRE_ACT_MS + step.settleMs;
    case "sampleIfFailed":
      return step.settleMs;
    case "type":
      return TWEEN_MS + PRE_ACT_MS + (step.value?.length ?? 0) * TYPE_CHAR_MS + step.settleMs;
    case "wait":
      return (step.value ? (WAIT_MS[step.value] ?? 0) : 0) + step.settleMs;
    default:
      return step.settleMs;
  }
}

export const INTRO_HOLDS = [6400, 8400, 8400];
const SCROLL_ALLOWANCE_MS = 12000;

/** Deterministic full-speed runtime estimate in ms (intro + walkthrough). */
export function estimateTotalMs(): number {
  return (
    INTRO_HOLDS.reduce((a, b) => a + b, 0) +
    SCRIPT.reduce((a, s) => a + stepCost(s), 0) +
    SCROLL_ALLOWANCE_MS
  );
}
