// The self-driving demo script: the storyline the cursor performs over the real
// app. Every step targets a data-demo-id that exists in the shipped screens
// (a target ending in * matches by prefix); `wait` steps poll real store state,
// never a duration.
//
// The storyline is the loop, in order, on one course in one afternoon (plan
// Sections 4 and 15): the course as it stands; Watch fetches an employer's
// public board on request; Report confirms exact quotations and rejects a
// paraphrase, reviews the denominator, counts, freezes the window, maps a skill
// and prepares the brief with its slides; Decide, where the programme owner
// records a decision with a reason; Update, the change the decision approved,
// within the hours; Teach, a session and its editable pack; Learn, the sample
// results filed against the version taught, with n of N; then the record of
// the afternoon by role, and the ring closed for the term. Nothing runs by
// itself and nothing changes the course without a person.

export interface DemoStep {
  caption: string;
  target?: string; // data-demo-id, or a prefix followed by *
  action: "move" | "click" | "type" | "select" | "wait" | "switchUser" | "hold" | "sampleIfFailed";
  value?: string; // text for type, option value for select, personId for switchUser, predicate for wait
  settleMs: number; // pause after the action
  scroll?: string; // "top" | "bottom" | a data-demo-id to centre
  clear?: boolean; // for type: empty the field first, so a value read from a file is replaced rather than extended
}

export const SCRIPT: DemoStep[] = [
  // ---- Course: what the course promises today ----
  { caption: "Dr Sobri coordinates CS310. One afternoon, the whole loop.", action: "switchUser", value: "P-SOBRI", settleMs: 2400 },
  { caption: "His courses, each with its loop for the term.", target: "nav-courses", action: "click", settleMs: 1600 },
  { caption: "Course: what CS310 promises today. One outcome, visualisation; no employer evidence yet.", target: "course-open-CS310", action: "click", settleMs: 3200 },
  { caption: "First, the term this loop runs for. Every record in it will carry the term.", target: "course-term", action: "type", value: "2026/2027 semester 1", settleMs: 900 },
  { caption: "", target: "course-term-save", action: "click", settleMs: 1200 },

  // ---- 1. Watch: what employers are asking for ----
  { caption: "Watch: research the lecturer runs, not a feed that runs itself.", target: "course-watch", action: "click", settleMs: 2000 },
  { caption: "A source with a stated policy. He picks an employer's public job board and fetches it live, through the local API.", target: "collect-provider", action: "select", value: "greenhouse", settleMs: 1800 },
  { caption: "The employer's board token, the same one in its careers page link.", target: "collect-board", action: "type", value: "stripe", settleMs: 800 },
  { caption: "The roles his graduates apply to.", target: "collect-query", action: "type", value: "data analyst", settleMs: 1000 },
  { caption: "Fetch. Watch the log: the request to the board, the bytes received, the retrieval time.", target: "collect-run", action: "click", settleMs: 600 },
  { caption: "Postings published recently, each with its link. Nothing invented, nothing pasted.", action: "wait", value: "collect-done", settleMs: 4000, scroll: "collect-log" },
  { caption: "If the board cannot be reached, the dated saved sample of the same board stands in, and the log says so.", action: "sampleIfFailed", settleMs: 1200 },
  { caption: "He keeps the ones worth reading.", target: "collect-select-all", action: "click", settleMs: 1400 },
  { caption: "Kept as sources. Postings are not evidence until someone reads them.", target: "collect-import", action: "click", settleMs: 800 },
  { caption: "", action: "wait", value: "sources-imported", settleMs: 2200 },

  // ---- 2. Report: what exactly they ask, how often, and what the course does about it ----
  { caption: "Report: what exactly do employers ask, how often, and what does the course do about it?", target: "rail-report", action: "click", settleMs: 1800 },
  { caption: "Quote first: the sentence that names each skill.", target: "subrail-quote", action: "click", settleMs: 1000 },
  { caption: "The skills he cares about, in his own words.", target: "lexicon-terms", action: "type", value: "SQL, Python, dashboards|dashboard, stakeholders|stakeholder, statistics|statistical", settleMs: 1000 },
  { caption: "Saved with the course.", target: "lexicon-save", action: "click", settleMs: 1200 },
  { caption: "Scan: the sentence that names each term, proposed beside its source.", target: "scan-run", action: "click", settleMs: 800 },
  { caption: "Exact sentences, the matched words marked in the posting.", action: "wait", value: "scan-proposals", settleMs: 3600 },
  { caption: "He confirms them. Each quotation is verified against its source.", target: "scan-confirm-all", action: "click", settleMs: 2000 },
  { caption: "What if he paraphrases instead? He types a quotation that is not in the posting.", target: "mention-skill", action: "type", value: "Python", settleMs: 600 },
  { caption: "", target: "mention-excerpt", action: "type", value: "experience with Python", settleMs: 600 },
  { caption: "Rejected: the words are not in the saved source text. Only exact quotations are kept.", target: "mention-add", action: "click", settleMs: 3800 },
  { caption: "Review: postings count only once someone has read them.", target: "subrail-review", action: "click", settleMs: 1400 },
  { caption: "He vouches for the extraction before the postings count.", target: "review-all-ack", action: "click", settleMs: 1200 },
  { caption: "Now the denominator is honest: reviewed postings only.", target: "review-all", action: "click", settleMs: 1000 },
  { caption: "Count: numerator, denominator and a confidence interval. No employability score.", target: "subrail-count", action: "click", settleMs: 1200 },
  { caption: "", action: "hold", settleMs: 3600, scroll: "observed-requirements" },
  { caption: "He freezes this review's evidence, so next term's postings are compared with it.", target: "rail-watch", action: "click", settleMs: 1400 },
  { caption: "", target: "snapshot-label", action: "type", value: "2026 Semester 1 review", settleMs: 600 },
  { caption: "Frozen: reviewed postings only. A skill is called rising or falling only when the two intervals separate.", target: "snapshot-take", action: "click", settleMs: 800 },
  { caption: "", action: "wait", value: "snapshot-frozen", settleMs: 2000 },
  { caption: "Map: what does CS310 do about the most-requested skill today?", target: "rail-report", action: "click", settleMs: 1200 },
  { caption: "", target: "subrail-map", action: "click", settleMs: 1000 },
  { caption: "He maps it to its outcome.", target: "mapping-open", action: "click", settleMs: 1400 },
  { caption: "CLO5 covers visualisation.", target: "mapping-outcome-CLO5", action: "click", settleMs: 1000 },
  { caption: "Documented coverage today: introduced.", target: "mapping-stage", action: "select", value: "introduced", settleMs: 1000 },
  { caption: "The target for this course: practised.", target: "mapping-target", action: "select", value: "practised", settleMs: 1000 },
  { caption: "With the course evidence cited.", target: "mapping-evidence", action: "type", value: "Week 6 lab touches this; no dedicated exercise yet.", settleMs: 800 },
  { caption: "Saved as his reviewed judgement, not a measured outcome.", target: "mapping-save", action: "click", settleMs: 2400 },
  { caption: "Brief: the evidence, the options and his recommendation, with every receipt.", target: "subrail-brief", action: "click", settleMs: 1200 },
  { caption: "His recommendation.", target: "brief-recommendation", action: "select", value: "refresh", settleMs: 1200, scroll: "meeting-brief" },
  { caption: "In his words.", target: "brief-notes", action: "type", value: "Add a dashboard exercise in week 6 within existing hours; keep the statistics foundation.", settleMs: 800 },
  { caption: "A brief with the table, the options and every receipt.", target: "brief-prepare", action: "click", settleMs: 800 },
  { caption: "", action: "wait", value: "brief-ready", settleMs: 1800 },
  { caption: "The same brief as editable slides for the meeting, generated from the receipts.", target: "brief-slides", action: "click", settleMs: 3600 },
  { caption: "He sends it to Dr Rahman, who owns the programme.", target: "brief-recipient-P-RAHMAN", action: "click", settleMs: 1200 },
  { caption: "Sent. A count is not a decision: the decision stays with people.", target: "brief-send", action: "click", settleMs: 2400 },

  // ---- 3. Decide: what will we do, and who said so ----
  { caption: "Decide: Dr Rahman signs in.", action: "switchUser", value: "P-RAHMAN", settleMs: 1400 },
  { caption: "The brief is waiting on his Home page.", target: "nav-inbox", action: "click", settleMs: 2000 },
  { caption: "He reads it with the receipts attached.", target: "inbox-open-top", action: "click", settleMs: 1000 },
  { caption: "", action: "wait", value: "brief-read", settleMs: 3200, scroll: "inbox-brief" },
  { caption: "The reason comes first. It travels with the record.", target: "decide-note", action: "type", value: "Adopt the dashboard exercise within the existing hours; review after one term.", settleMs: 900 },
  { caption: "Adopt. Recorded as data: by whom, when, why, bound to this brief and the course version.", target: "decide-adopt", action: "click", settleMs: 800 },
  { caption: "", action: "wait", value: "decision-recorded", settleMs: 3200 },

  // ---- 4. Update: what the approved change looks like, within the hours ----
  { caption: "Back to Dr Sobri. The decision is on his Home page.", action: "switchUser", value: "P-SOBRI", settleMs: 1400 },
  { caption: "It opens the course's Decide step: adopt, by Dr Rahman, with the reason.", target: "inbox-open-top", action: "click", settleMs: 3000 },
  { caption: "Update: the change the decision approved. A revision starts from the current version; the baseline is preserved.", target: "rail-update", action: "click", settleMs: 1800 },
  { caption: "He starts a revision.", target: "curriculum-start", action: "click", settleMs: 1600 },
  { caption: "He sharpens the outcome wording himself.", target: "curriculum-outcome-text", action: "type", value: " with dashboards that answer a stakeholder's question", settleMs: 1000 },
  { caption: "A new topic, with its hours declared. Adding a topic never expands the timetable.", target: "curriculum-add-topic", action: "click", settleMs: 1000 },
  { caption: "", target: "curriculum-topic-title", action: "type", value: "Dashboards and data storytelling", settleMs: 600 },
  { caption: "Three contact hours.", target: "curriculum-topic-hours", action: "type", value: "3", settleMs: 800 },
  { caption: "Linked to the outcome it supports.", target: "topic-outcome-CLO5", action: "click", settleMs: 1000 },
  { caption: "Why, and for which term. The reason travels with the version.", target: "curriculum-reason", action: "type", value: "Adopted by the programme owner on the brief: add a dashboard exercise within the existing hours.", settleMs: 600 },
  { caption: "", target: "curriculum-term", action: "type", value: "2026/2027 semester 1", settleMs: 800 },
  { caption: "Save, then check: broken links, cycles, exceeded hours and removed protected topics would block it.", target: "curriculum-save", action: "click", settleMs: 1200 },
  { caption: "Checked. Unknown budgets stay visible as warnings, never hidden in a score.", target: "curriculum-check", action: "click", settleMs: 2200 },
  { caption: "As coordinator he makes it the course version. University approval stays in its process.", target: "curriculum-ack", action: "click", settleMs: 1000 },
  { caption: "", target: "curriculum-adopt", action: "click", settleMs: 800 },
  { caption: "A new version, with the previous one kept. A decision is not a course; now it is one.", action: "wait", value: "revision-adopted", settleMs: 2400 },

  // ---- 5. Teach: what the class will do, and with what ----
  { caption: "Teach: the class that turns the evidence into learning.", target: "rail-teach", action: "click", settleMs: 1600 },
  { caption: "A new session.", target: "plan-add", action: "click", settleMs: 1000 },
  { caption: "", target: "session-topic", action: "type", value: "Dashboard lab: from a messy dataset to a decision", settleMs: 600 },
  { caption: "Linked to the outcome, so the evidence follows it.", target: "session-clo-CLO5", action: "click", settleMs: 1000 },
  { caption: "What students will do.", target: "session-activity", action: "type", value: "In pairs, build a dashboard from the sample dataset and defend one design choice.", settleMs: 600 },
  { caption: "How he will know it worked.", target: "session-check", action: "type", value: "Exit question: which chart here would mislead a stakeholder, and why?", settleMs: 600 },
  { caption: "Ready to teach requires an outcome, an activity and a check.", target: "session-status", action: "select", value: "ready", settleMs: 900 },
  { caption: "", target: "session-save", action: "click", settleMs: 800 },
  { caption: "Saved. One click more: an editable slide pack for the class.", action: "wait", value: "session-saved", settleMs: 1600 },
  { caption: "Outcomes, the employer evidence behind them with exact quotations, the activity and the check. Editable in PowerPoint; no AI text.", target: "session-slides-*", action: "click", settleMs: 4400 },

  // ---- 6. Learn: did it work, as far as we can honestly tell ----
  { caption: "Learn: a class is not proof. He files the term's results.", target: "rail-learn", action: "click", settleMs: 1800 },
  { caption: "The sample results file, read in the browser. Nothing files until he has seen what was read.", target: "sample-results", action: "click", settleMs: 600 },
  { caption: "", action: "wait", value: "intake-staged", settleMs: 2600 },
  { caption: "The file names an older term; he files it under this loop's term.", target: "upload-term", action: "type", value: "2026/2027 semester 1", clear: true, settleMs: 900 },
  { caption: "Matched to the course version taught this term, then filed.", target: "upload-confirm", action: "click", settleMs: 800 },
  { caption: "", action: "wait", value: "intake-filed", settleMs: 1200 },
  { caption: "Attainment per outcome as filed, with n of N. No learning gain is claimed; the benchmark has not been run.", action: "hold", settleMs: 4600, scroll: "learn-attainment" },

  // ---- The record, and the ring ----
  { caption: "How it works: the host at the centre, the seven helpers at their stations, and people at Decide.", target: "nav-office", action: "click", settleMs: 2400 },
  { caption: "What actually happened this afternoon, step by step, by role. Every line is a saved record he can open.", target: "see-record", action: "click", settleMs: 4800, scroll: "run-timeline" },
  { caption: "Back on Home: every segment of the ring backed by a record. Next semester the loop runs again.", target: "nav-inbox", action: "click", settleMs: 4800 },
  { caption: "Lyceum. Real job postings into a course decision with receipts, every semester.", action: "hold", settleMs: 3600 },
];

// ---- runtime estimate (for the progress bar and the tour's stated length) ----
import { PRE_ACT_MS, TWEEN_MS, TYPE_CHAR_MS, SWITCH_PAD_MS } from "./timing.ts";

const WAIT_MS: Record<string, number> = {
  "revision-adopted": 400,
  "collect-done": 1200,
  "sources-imported": 400,
  "scan-proposals": 400,
  "snapshot-frozen": 400,
  "session-saved": 400,
  "brief-ready": 400,
  "brief-read": 400,
  "decision-recorded": 400,
  "intake-staged": 1200,
  "intake-filed": 400,
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

/** The tour's length in whole minutes, rounded, for the words that offer it ("about 7 minutes"). */
export function tourMinutes(): number {
  return Math.round(estimateTotalMs() / 60000);
}
