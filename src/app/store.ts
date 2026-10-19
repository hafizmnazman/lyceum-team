// The central store: one in-memory state plus the actions that move it. Built as
// a module-level external store (useSyncExternalStore) so React screens, the
// self-driving demo runner, and the proof scripts all read the same state and
// dispatch the same real actions.
//
// v3 changes over v2 (spec "This is an app, not a demo"):
//  - the mutable world persists to localStorage (versioned key, debounced), and
//    "Reset workspace" restores the seed;
//  - timestamps are real in the browser and pinned in Node / demo mode, so the
//    app feels live while the proofs and the recorded demo stay deterministic;
//  - new slices: agentRuns (live agent presence), pendingIntake (the parse ->
//    interpret -> confirm upload flow), testDrafts (the assessment studio), and
//    relevanceRatings (the advisory's core output);
//  - home is the Inbox; navigation syncs to the URL hash (wired in App.tsx).
//
// The v2 proposal state machine is carried unchanged:
//   drafting --(coordinator runs)--> testing
//   drafting --(lecturer submits)--> coordinator-review
//   coordinator-review --(approve)--> testing   --(changes)--> drafting
//   testing --(run done)--> management-approval
//   management-approval --(approve)--> approved (writes a Prediction)
//                       --(reject)--> drafting

import { useSyncExternalStore } from "react";
import type {
  AgentName,
  AgentRun,
  AssessmentBlueprint,
  BloomLevel,
  CLO,
  ChangeProposal,
  DataSource,
  Hat,
  IntakeInterpretation,
  Notification,
  NotificationKind,
  ParsedDoc,
  Person,
  PersonId,
  Prediction,
  ProposalId,
  RelevanceRating,
  ResultUpload,
  RoleAssignment,
  Subject,
  SubjectId,
  SubjectVersion,
  SurveyRecord,
  TestDraft,
  TestItem,
  TeachingPlan,
  CourseDefinition,
  CurriculumDraft,
  BriefRecommendation,
  CollectedPosting,
  CollectionProvider,
  EvidenceBrief,
  EvidenceSource,
  SkillMapping,
  SkillMention,
  VerdictReport,
} from "../types.ts";
import type { Screen } from "./roles.ts";
import { confirmLeaveEditor } from "./unsaved.ts";
import { can, landingScreen, navAllows, hatsOn } from "./roles.ts";
import type { SimState } from "./sim.ts";
import { initSim, SIM_TICK_MS, stepSim } from "./sim.ts";
import type { SignalSimState } from "./signalSim.ts";
import { initSignalSim, SIGNAL_TICK_MS, stepSignal } from "./signalSim.ts";
import { DRILL_STEP_MS, DRILL_STEPS, scaleMs } from "../demo/timing.ts";
import {
  runAcceptanceWithDistribution,
  type AcceptanceDistribution,
} from "../agents/acceptance.ts";
import { streamAgent } from "../agents/client.ts";
import { runIntake, type ParsedSheet } from "../agents/intake.ts";
import { runAuthoring } from "../agents/authoring.ts";
import { runAnalogy } from "../agents/analogy.ts";
import { runSignal } from "../agents/signal.ts";
import { computeRelevanceRatings } from "../data/market.ts";
import { backupSummary, parseWorkspaceBackup, serializeWorkspaceBackup, workspaceFingerprint } from "../lib/workspaceBackup.ts";
import { courseDefinition, curriculumChanges, curriculumImpact, draftStructureError, validateCourseDefinition } from "../lib/curriculum.ts";
import { sessionIssues, type SaveResult, type SessionInput } from "../lib/teachingPlan.ts";
import {
  evidenceReport, evidenceSourceError, mappingError, meetingBriefMarkdown, mentionError, normaliseWhitespace, proposeMentions, RECOMMENDATION_LABEL, skillKey, textFingerprint,
  type EvidenceSourceInput, type MappingInput, type MentionInput, type MentionProposal,
} from "../lib/evidence.ts";
import { BOARD_TOKEN, SOURCE_POLICIES } from "../lib/collect.ts";
import { fetchCollection, type CollectionOutcome, type CollectionRequest } from "../agents/client.ts";
import { ITEMS, itemsForCLOs } from "../data/items.ts";
import {
  CANONICAL_PROPOSAL,
  CLOS,
  DATA_SOURCES,
  PEOPLE,
  PROGRAMME,
  ROLE_ASSIGNMENTS,
  SEED_PREDICTIONS,
  SEED_RESULT_UPLOADS,
  SEED_SUBJECT_VERSIONS,
  SUBJECTS,
  SURVEY,
  TERM,
} from "../data/seed.ts";

// ---------- the seven agents (office + presence) ----------
export type AgentId = AgentName;
export type AgentState = "idle" | "working" | "done" | "needs-input";

export const AGENT_LABELS: Record<AgentId, string> = {
  intake: "Intake",
  signal: "Signal",
  curriculum: "Curriculum",
  authoring: "Authoring",
  cohort: "Cohort",
  analogy: "Analogy",
  evaluator: "Evaluator",
};

// ---------- time ----------
// The seed clock: every seeded timestamp, and every timestamp in demo/proof
// mode, so those paths are identical every run. In the browser (outside the
// demo) actions stamp real time, which is what makes the app feel live.
const SEED_NOW = "2026-07-01T10:00:00Z";
let clockPinned = typeof window === "undefined";

/** Pin (or unpin) the clock. The demo pins it on Play so a recording is
 *  deterministic; proofs run in Node where it is pinned by default. */
export function setClockPinned(pinned: boolean) {
  clockPinned = typeof window === "undefined" ? true : pinned;
}
export function nowIso(): string {
  return clockPinned ? SEED_NOW : new Date().toISOString();
}

export interface AppState {
  // reference data
  people: Person[];
  assignments: RoleAssignment[];
  programme: typeof PROGRAMME;
  subjects: Subject[];
  clos: CLO[];
  survey: SurveyRecord[];

  // session
  currentPersonId: PersonId | null;
  screen: Screen;
  selectedSubjectId: SubjectId | null;
  selectedProposalId: ProposalId | null;
  studioTab: "overview" | "curriculum" | "evidence" | "plan" | "content" | "assessment" | "history";

  // mutable world
  proposals: ChangeProposal[];
  notifications: Notification[];
  predictions: Prediction[];
  resultUploads: ResultUpload[];
  dataSources: DataSource[];
  subjectVersions: SubjectVersion[];
  testDrafts: TestDraft[];
  teachingPlans: TeachingPlan[];
  courseDefinitions: Record<string, CourseDefinition>;
  curriculumDrafts: CurriculumDraft[];
  evidenceSources: EvidenceSource[];
  skillMentions: SkillMention[];
  skillMappings: SkillMapping[];
  evidenceBriefs: EvidenceBrief[];
  skillLexicon: Record<string, string[]>; // per course: the terms the lecturer scans for
  relevanceRatings: RelevanceRating[];

  // v3: agent presence + the intake pipeline
  agentRuns: AgentRun[];
  pendingIntake: { doc: ParsedDoc; interp: IntakeInterpretation } | null;

  // transient UI
  sim: SimState | null;
  signalSim: SignalSimState | null; // the staged Signal reveal on Trends
  drillOpen: boolean;
  drillStep: number; // -1 closed; 0..5 the six-hop drill-down revealing one by one
  agentStates: Record<AgentId, AgentState>;
  agentBubble: { agent: AgentId; text: string } | null;
  agentPanelOpen: boolean; // the right-side agent panel (spec 5.7)
  critique: string[] | null; // last Authoring review critique
  flashUpload: ResultUpload | null; // last filed upload, for the Upload receipt
  toast: string | null;
  persistenceStatus: "pending" | "saved" | "unavailable";
  collectRun: CollectRun | null; // the current research run, never persisted
  scanProposals: MentionProposal[]; // proposed quotations awaiting the lecturer
  selectedBriefId: string | null;

  idSeq: number;
}

function idleAgents(): Record<AgentId, AgentState> {
  return {
    intake: "idle",
    signal: "idle",
    curriculum: "idle",
    authoring: "idle",
    cohort: "idle",
    analogy: "idle",
    evaluator: "idle",
  };
}

function seedState(): AppState {
  return {
    people: PEOPLE,
    assignments: [...ROLE_ASSIGNMENTS],
    programme: PROGRAMME,
    subjects: [...SUBJECTS],
    clos: [...CLOS],
    survey: SURVEY,

    currentPersonId: null,
    screen: "login",
    selectedSubjectId: null,
    selectedProposalId: CANONICAL_PROPOSAL.id,
    studioTab: "overview",

    proposals: [structuredClone(CANONICAL_PROPOSAL)],
    notifications: [],
    predictions: [...SEED_PREDICTIONS],
    resultUploads: [...SEED_RESULT_UPLOADS],
    dataSources: [...DATA_SOURCES],
    subjectVersions: [...SEED_SUBJECT_VERSIONS],
    testDrafts: [],
    teachingPlans: [],
    courseDefinitions: {},
    curriculumDrafts: [],
    evidenceSources: [],
    skillMentions: [],
    skillMappings: [],
    evidenceBriefs: [],
    skillLexicon: {},
    relevanceRatings: computeRelevanceRatings(SUBJECTS, CLOS, SEED_NOW),

    agentRuns: [],
    pendingIntake: null,

    sim: null,
    signalSim: null,
    drillOpen: false,
    drillStep: -1,
    agentStates: idleAgents(),
    agentBubble: null,
    agentPanelOpen: false,
    critique: null,
    flashUpload: null,
    toast: null,
    persistenceStatus: "saved",
    collectRun: null,
    scanProposals: [],
    selectedBriefId: null,

    idSeq: 1,
  };
}

// ---------- persistence (spec: "State persists") ----------
const STORAGE_KEY = "lyceum-v3-state@1";

// The slice of state worth keeping across refreshes: the mutable world and the
// session. Transient UI (sims, drills, toasts, agent runs) always starts clean.
const PERSISTED_KEYS = [
  "programme",
  "assignments",
  "subjects",
  "clos",
  "survey",
  "currentPersonId",
  "screen",
  "selectedSubjectId",
  "selectedProposalId",
  "proposals",
  "notifications",
  "predictions",
  "resultUploads",
  "dataSources",
  "subjectVersions",
  "testDrafts",
  "teachingPlans",
  "courseDefinitions",
  "curriculumDrafts",
  "evidenceSources",
  "skillMentions",
  "skillMappings",
  "evidenceBriefs",
  "skillLexicon",
  "relevanceRatings",
  "idSeq",
] as const;

function loadPersisted(): Partial<AppState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    // A running sim or a mid-demo screen must not resurrect into a fresh page.
    if (parsed.screen === "login" || parsed.screen === undefined) parsed.currentPersonId = null;
    return parsed;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushPersistence, 250);
}

/** Flush also runs on page exit so a quick refresh cannot discard the last edit. */
export function flushPersistence() {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  let status: AppState["persistenceStatus"] = "saved";
  try {
    const out: Record<string, unknown> = {};
    for (const k of PERSISTED_KEYS) out[k] = state[k];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    status = "unavailable";
  }
  if (state.persistenceStatus !== status) {
    state = { ...state, persistenceStatus: status };
    for (const listener of listeners) listener();
  }
}
if (typeof window !== "undefined") window.addEventListener("pagehide", flushPersistence);

let state: AppState = (() => {
  const seed = seedState();
  const persisted = loadPersisted();
  return persisted ? { ...seed, ...persisted } : seed;
})();

// ---------- external-store plumbing ----------
const listeners = new Set<() => void>();
function emit() {
  if (typeof window !== "undefined" && state.persistenceStatus !== "unavailable")
    state = { ...state, persistenceStatus: "pending" };
  for (const l of listeners) l();
  schedulePersist();
}
function set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  emit();
}
export function getState(): AppState {
  return state;
}
// A read-only hook for the headless demo smoke (scripts/demo-smoke.mjs): the
// browser test asserts the demo's end state through this, nothing more.
if (typeof window !== "undefined") {
  (window as unknown as { __lyceum?: { getState: typeof getState } }).__lyceum = { getState };
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

function nextId(prefix: string): string {
  const used = new Set([...state.proposals, ...state.notifications, ...state.resultUploads, ...state.subjectVersions,
    ...state.testDrafts, ...state.curriculumDrafts, ...state.agentRuns, ...state.evidenceSources, ...state.skillMentions, ...state.evidenceBriefs, ...state.teachingPlans.flatMap(p => p.sessions)].map(x => x.id));
  let id: string;
  do { id = `${prefix}-${state.idSeq}`; state = { ...state, idSeq: state.idSeq + 1 }; } while (used.has(id));
  return id;
}

// ---------- selectors ----------
export function currentPerson(): Person | null {
  return state.people.find((p) => p.id === state.currentPersonId) ?? null;
}
export function personById(id: PersonId): Person | undefined {
  return state.people.find((p) => p.id === id);
}
export function subjectById(id: SubjectId): Subject | undefined {
  return state.subjects.find((s) => s.id === id);
}
export function proposalById(id: ProposalId | null): ChangeProposal | undefined {
  return id ? state.proposals.find((p) => p.id === id) : undefined;
}
export function unreadFor(personId: PersonId): Notification[] {
  return state.notifications.filter((n) => n.toPersonId === personId && !n.read);
}
export function inboxFor(personId: PersonId): Notification[] {
  return [...state.notifications]
    .filter((n) => n.toPersonId === personId)
    .sort((a, b) => (a.createdAt === b.createdAt ? 0 : a.createdAt < b.createdAt ? 1 : -1));
}
/** First person who holds the given hat on a subject. */
export function personWithHat(subjectId: SubjectId, hat: Hat): Person | undefined {
  const a = state.assignments.find((x) => x.subjectId === subjectId && x.hat === hat);
  return a ? personById(a.personId) : undefined;
}
export function ratingFor(subjectId: SubjectId): RelevanceRating | undefined {
  return state.relevanceRatings.find((r) => r.subjectId === subjectId);
}
export function testDraftById(id: string | undefined): TestDraft | undefined {
  return id ? state.testDrafts.find((t) => t.id === id) : undefined;
}

// ---------- lecturer preparation (browser-local, separate from proposals) ----------
function mayPlan(subjectId: SubjectId): boolean {
  const person = currentPerson();
  return !!person && !!subjectById(subjectId) && can(person, "draft-change", { subjectId, assignments: state.assignments });
}

function updateTeachingPlan(subjectId: SubjectId, update: (plan: TeachingPlan) => TeachingPlan) {
  const previous = state.teachingPlans.find((p) => p.subjectId === subjectId);
  const plan = update(previous ?? { subjectId, term: "", notes: "", sessions: [], updatedAt: nowIso(), updatedBy: state.currentPersonId! });
  const stamped = { ...plan, updatedAt: nowIso(), updatedBy: state.currentPersonId! };
  set((s) => ({ teachingPlans: [...s.teachingPlans.filter((p) => p.subjectId !== subjectId), stamped] }));
}

export function saveTeachingPlanDetails(subjectId: SubjectId, details: { term: string; notes: string }): SaveResult {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can edit this teaching plan." };
  updateTeachingPlan(subjectId, (plan) => ({ ...plan, term: details.term.trim(), notes: details.notes.trim() }));
  return { ok: true };
}

export function saveTeachingSession(subjectId: SubjectId, input: SessionInput): SaveResult {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can edit this teaching plan." };
  const previous = state.teachingPlans.find((p) => p.subjectId === subjectId);
  if (input.id && !previous?.sessions.some((s) => s.id === input.id))
    return { ok: false, error: "This session no longer exists. Add a new session instead." };
  const issues = sessionIssues(input, state.clos.filter((c) => c.subjectId === subjectId));
  if (issues.length) return { ok: false, error: issues.join(" ") };
  const session = {
    ...input, id: input.id ?? nextId("TS"), topic: input.topic.trim(),
    cloIds: [...new Set(input.cloIds)], activity: input.activity.trim(),
    learningCheck: input.learningCheck.trim(), resources: input.resources.trim(),
    updatedAt: nowIso(), updatedBy: state.currentPersonId!,
    courseVersionId: subjectById(subjectId)?.currentVersionId, needsReview: false,
  };
  updateTeachingPlan(subjectId, (plan) => ({ ...plan, sessions: [...plan.sessions.filter((s) => s.id !== session.id), session] }));
  return { ok: true };
}

export function deleteTeachingSession(subjectId: SubjectId, sessionId: string): SaveResult {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can edit this teaching plan." };
  const plan = state.teachingPlans.find((p) => p.subjectId === subjectId);
  if (!plan?.sessions.some((s) => s.id === sessionId)) return { ok: false, error: "This session no longer exists." };
  updateTeachingPlan(subjectId, (p) => ({ ...p, sessions: p.sessions.filter((s) => s.id !== sessionId) }));
  return { ok: true };
}

function setAgent(agent: AgentId, st: AgentState) {
  set((s) => ({ agentStates: { ...s.agentStates, [agent]: st } }));
}
function resetAgents() {
  set({ agentStates: idleAgents(), agentBubble: null });
}

// ---------- agent presence (spec 5.7) ----------
export function beginAgentRun(agent: AgentId, label: string, onPage: string): string {
  const id = nextId("AR");
  const run: AgentRun = {
    id,
    agent,
    status: "thinking",
    startedAt: nowIso(),
    label,
    streamText: "",
    onPage,
  };
  setAgent(agent, "working");
  set((s) => ({ agentRuns: [...s.agentRuns.slice(-19), run] }));
  return id;
}
export function appendAgentStream(runId: string, chunk: string) {
  set((s) => ({
    agentRuns: s.agentRuns.map((r) =>
      r.id === runId ? { ...r, status: "streaming", streamText: (r.streamText ?? "") + chunk } : r,
    ),
  }));
}
export function finishAgentRun(
  runId: string,
  status: "done" | "failed" | "fallback",
  opts?: { label?: string; resultRef?: string },
) {
  const run = state.agentRuns.find((r) => r.id === runId);
  if (run) setAgent(run.agent, "done");
  set((s) => ({
    agentRuns: s.agentRuns.map((r) =>
      r.id === runId
        ? { ...r, status, label: opts?.label ?? r.label, resultRef: opts?.resultRef }
        : r,
    ),
  }));
}
export function latestRunFor(agent: AgentId): AgentRun | undefined {
  return [...state.agentRuns].reverse().find((r) => r.agent === agent);
}

/** Fire a live agent stream in the background. The deterministic path never
 *  depends on it: the fixture result is applied first and stands either way;
 *  the live stream augments it (visible model output in the strip and panel,
 *  and optionally a richer text result via onText). Skipped in Node and while
 *  the clock is pinned, so proofs and the recorded demo stay identical. */
function augmentLive(
  agent: "authoring" | "evaluator",
  label: string,
  onPage: string,
  payload: unknown,
  onText?: (text: string) => void,
) {
  if (typeof window === "undefined" || clockPinned) return;
  const runId = beginAgentRun(agent, label, onPage);
  void streamAgent(agent, payload, (chunk) => appendAgentStream(runId, chunk)).then((text) => {
    if (text) {
      finishAgentRun(runId, "done", { label });
      onText?.(text);
    } else {
      finishAgentRun(runId, "fallback", { label: `${label} (offline draft used)` });
    }
  });
}
export function toggleAgentPanel(open?: boolean) {
  set((s) => ({ agentPanelOpen: open ?? !s.agentPanelOpen }));
}

// ---------- session actions ----------
export function login(personId: PersonId) {
  const person = personById(personId);
  if (!person) return;
  resetAgents();
  set({ currentPersonId: personId, screen: landingScreen(person, state.assignments) });
}
export function logout() {
  if (!confirmLeaveEditor()) return;
  set({ currentPersonId: null, screen: "login" });
}
/** Person switch (the account menu): change who we are, clamp the screen. */
export function switchUser(personId: PersonId) {
  if (personId !== state.currentPersonId && !confirmLeaveEditor()) return;
  const person = personById(personId);
  if (!person) return;
  set((s) => ({
    currentPersonId: personId,
    screen: navAllows(person, s.assignments, s.screen)
      ? s.screen
      : landingScreen(person, s.assignments),
  }));
}
export function navigate(screen: Screen) {
  if (screen !== state.screen && !confirmLeaveEditor()) {
    if (typeof window !== "undefined") window.history.replaceState(null, "", "#/" + state.screen);
    return;
  }
  set({ screen });
}
export function selectSubject(subjectId: SubjectId | null) {
  if (subjectId !== state.selectedSubjectId && !confirmLeaveEditor()) return;
  set({ selectedSubjectId: subjectId, studioTab: "overview" });
}
export function selectStudioTab(studioTab: AppState["studioTab"]) { set({ studioTab }); }
export function selectProposal(proposalId: ProposalId | null) {
  set({ selectedProposalId: proposalId });
}
export function dismissToast() {
  set({ toast: null });
}
export function showToast(message: string) {
  set({ toast: message });
}

// ---------- notifications ----------
function notify(args: {
  toPersonId: PersonId;
  kind: NotificationKind;
  subjectId?: SubjectId;
  proposalId?: ProposalId;
  agentFindings?: string;
  briefId?: string;
}) {
  const n: Notification = {
    id: nextId("N"),
    toPersonId: args.toPersonId,
    kind: args.kind,
    subjectId: args.subjectId,
    proposalId: args.proposalId,
    agentFindings: args.agentFindings,
    briefId: args.briefId,
    read: false,
    createdAt: nowIso(),
  };
  set((s) => ({ notifications: [...s.notifications, n] }));
}

export function openNotification(id: string) {
  const n = state.notifications.find((x) => x.id === id);
  if (!n) return;
  if (n.kind === "evidence-brief") {
    // A brief is read where it arrived; management and department staff have no studio to land in.
    set((s) => ({ notifications: s.notifications.map((x) => (x.id === id ? { ...x, read: true } : x)), selectedBriefId: n.briefId ?? null, screen: "inbox" }));
    return;
  }
  set((s) => ({
    notifications: s.notifications.map((x) => (x.id === id ? { ...x, read: true } : x)),
  }));
  if (n.proposalId) selectProposal(n.proposalId);
  if (n.subjectId) selectSubject(n.subjectId);
  selectStudioTab("content");
  // Land the reader in context.
  const person = currentPerson();
  if (!person) return;
  if (n.kind === "review-request") navigate("studio");
  else if (n.kind === "ping-update") navigate("studio");
  else if (n.kind === "ping-new-subject") navigate("new-subject");
  else if (n.kind === "test-done" || n.kind === "approved" || n.kind === "rejected") {
    navigate(person.orgRole === "management" ? "approval" : "studio");
  }
}

// ---------- proposal helpers ----------
function patchProposal(id: ProposalId, fn: (p: ChangeProposal) => ChangeProposal) {
  set((s) => ({ proposals: s.proposals.map((p) => (p.id === id ? fn(p) : p)) }));
}
function authorIsCoordinator(p: ChangeProposal): boolean {
  return hatsOn(p.authorId, p.subjectId, state.assignments).includes("coordinator");
}

// ---------- Trends -> routing (spec Section 7) ----------
export function routeDrift(subjectId: SubjectId) {
  const signal = runSignal(state.programme.id);
  setAgent("signal", "done");
  setAgent("curriculum", "done");
  const drift = signal.subjectDrift.find((d) => d.subjectId === subjectId);
  const rating = ratingFor(subjectId);
  const sources = rating
    ? new Set(rating.evidence.map((e) => e.sourceId)).size
    : 0;
  const findings =
    `Demand on this subject's outcomes is outpacing coverage (gap ${(drift?.gap ?? 0).toFixed(2)}` +
    (sources > 0 ? `, corroborated across ${sources} market sources` : "") +
    `). Sampled from the skills signal over the programme.`;
  if (drift?.flag === "new-subject") {
    notify({
      toPersonId: state.programme.departmentOwnerId,
      kind: "ping-new-subject",
      subjectId,
      agentFindings: findings,
    });
    set({ toast: "Routed to the department owner to scope a new subject." });
  } else {
    const coord = personWithHat(subjectId, "coordinator");
    const proposal = state.proposals.find((p) => p.subjectId === subjectId);
    if (coord) {
      notify({
        toPersonId: coord.id,
        kind: "ping-update",
        subjectId,
        proposalId: proposal?.id,
        agentFindings: findings,
      });
      set({ toast: `Routed to ${coord.name}, the subject coordinator.` });
    }
  }
}

// ---------- Trends -> the staged Signal reveal ----------
let signalTimer: ReturnType<typeof setInterval> | null = null;

/** Play the Signal agent's staged reveal on the Trends screen: reading ->
 *  extracting -> mapping -> done, landing on CS220 / CLO4 gap 0.62.
 *  Deterministic, fixed ticks. Idempotent while running. */
export function runSignalReveal() {
  if (state.signalSim && state.signalSim.phase !== "done") return;
  setAgent("signal", "working");
  set({ signalSim: initSignalSim() });
  if (signalTimer) clearInterval(signalTimer);
  signalTimer = setInterval(tickSignal, scaleMs(SIGNAL_TICK_MS));
}

function tickSignal() {
  const ss = state.signalSim;
  if (!ss) {
    if (signalTimer) clearInterval(signalTimer);
    signalTimer = null;
    return;
  }
  const next = stepSignal(ss);
  set({ signalSim: next });
  if (next.phase === "done") {
    if (signalTimer) clearInterval(signalTimer);
    signalTimer = null;
    setAgent("signal", "done");
    setAgent("curriculum", "done");
  }
}

/** Clear the reveal so a fresh demo run replays it from the top. */
export function resetSignalReveal() {
  if (signalTimer) clearInterval(signalTimer);
  signalTimer = null;
  set({ signalSim: null });
}

// ---------- the real intake pipeline (parse -> interpret -> confirm) ----------
/** Stage an interpreted upload for the user to confirm. The preview-and-confirm
 *  step is the trust boundary: nothing files until a human has seen what the
 *  agent read and what it made of it. */
export function stagePendingIntake(doc: ParsedDoc, interp: IntakeInterpretation) {
  set({ pendingIntake: { doc, interp } });
}
export function clearPendingIntake() {
  set({ pendingIntake: null });
}

/** File the confirmed interpretation into the spine. Returns what was filed. */
export function confirmPendingIntake(): string | null {
  const pending = state.pendingIntake;
  const person = currentPerson();
  if (!pending || !person) return null;
  const { doc, interp } = pending;
  const subjectId = interp.subjectGuess;
  const term = interp.termGuess ?? TERM;
  const at = nowIso();
  const involved = interp.docType === "clo-survey" ? [...new Set((interp.surveyRecords ?? []).map(r => r.subjectId))] : subjectId ? [subjectId] : [];
  if (involved.some(id => !subjectById(id) || !can(person, "upload-results", { subjectId: id, assignments: state.assignments }))) {
    set({ toast: "You can only file records for your assigned courses. Correct the course selection." }); return null;
  }

  if (interp.docType === "results" && subjectId && interp.mappedRows?.length) {
    const upload: ResultUpload = {
      id: nextId(`RU-${subjectId}`),
      subjectId,
      uploadedBy: person.id,
      term,
      rows: interp.mappedRows,
      filedAt: at,
      sourceFileName: doc.fileName,
    };
    const ds: DataSource = {
      kind: "results",
      subjectId,
      term,
      recordCount: upload.rows.reduce((m, r) => Math.max(m, r.n), 0),
      ingestedAt: at,
      verified: false,
      sourceFileName: doc.fileName,
    };
    set((s) => ({
      resultUploads: [...s.resultUploads, upload],
      dataSources: [ds, ...s.dataSources],
      flashUpload: upload,
      pendingIntake: null,
      toast: `Filed ${doc.fileName} to ${subjectId}, ${term}. This ground now feeds the cohort.`,
    }));
    fillPredictionsForSubject(subjectId);
    return upload.id;
  }

  if (interp.docType === "clo-survey" && interp.surveyRecords?.length) {
    const records = interp.surveyRecords;
    const bySubject = new Map<string, number>();
    for (const r of records) {
      bySubject.set(r.subjectId, (bySubject.get(r.subjectId) ?? 0) + 1);
    }
    const sources: DataSource[] = [...bySubject.entries()].map(([sid, count]) => ({
      kind: "clo-survey",
      subjectId: sid,
      term,
      recordCount: count,
      ingestedAt: at,
      verified: false,
      sourceFileName: doc.fileName,
    }));
    set((s) => ({
      survey: [...s.survey, ...records],
      dataSources: [...sources, ...s.dataSources],
      pendingIntake: null,
      toast: `Filed ${records.length} survey records from ${doc.fileName}.`,
    }));
    return `${records.length} records`;
  }

  if ((interp.docType === "syllabus" || interp.docType === "slides") && subjectId) {
    const ds: DataSource = {
      kind: interp.docType === "syllabus" ? "syllabus" : "material",
      subjectId,
      term,
      recordCount: doc.pages.length,
      ingestedAt: at,
      verified: false,
      sourceFileName: doc.fileName,
    };
    set((s) => ({
      dataSources: [ds, ...s.dataSources],
      subjects:
        interp.docType === "syllabus"
          ? s.subjects.map((su) =>
              su.id === subjectId ? { ...su, syllabusVerifiedAt: undefined, syllabusSourceUrl: doc.fileName } : su,
            )
          : s.subjects,
      pendingIntake: null,
      toast: `Filed ${doc.fileName} as ${interp.docType === "syllabus" ? "a reviewed syllabus upload" : "course material"} for ${subjectId}.`,
    }));
    return ds.sourceFileName ?? null;
  }

  set({ toast: "Nothing was filed: the interpretation had no usable content.", pendingIntake: null });
  return null;
}

// ---------- Upload (the v2 one-click fixture path, kept for demo + proofs) ----------
const DEMO_SHEET: ParsedSheet = {
  fileName: "CS220-results-2025-S1.xlsx",
  headers: ["student", "CLO4 score"],
  rows: [
    { student: "anon-1", "CLO4 score": 0.55 },
    { student: "anon-2", "CLO4 score": 0.6 },
  ],
};

export function uploadResults(subjectId: SubjectId) {
  const person = currentPerson();
  if (!person) return;
  setAgent("intake", "working");
  const upload = runIntake(DEMO_SHEET, subjectId, {
    uploadedBy: person.id,
    term: TERM,
    filedAt: SEED_NOW,
    uploadId: `RU-${subjectId}-${TERM}`,
  });
  set((s) => {
    const others = s.resultUploads.filter((u) => u.id !== upload.id);
    const ds: DataSource = {
      kind: "results",
      subjectId,
      term: TERM,
      recordCount: upload.rows.reduce((m, r) => Math.max(m, r.n), 0),
      ingestedAt: SEED_NOW,
      verified: true,
    };
    const dataSources = [
      ds,
      ...s.dataSources.filter(
        (d) => !(d.kind === "results" && d.subjectId === subjectId && d.term === TERM),
      ),
    ];
    return { resultUploads: [...others, upload], dataSources, flashUpload: upload };
  });
  setAgent("intake", "done");
  fillPredictionsForSubject(subjectId);
}

function masteryFromUpload(u: ResultUpload): number {
  if (u.rows.length === 0) return 0;
  return u.rows.reduce((sum, r) => sum + r.meanScore, 0) / u.rows.length;
}

/** The latest results upload for a subject filed AT OR AFTER a moment. A
 *  prediction is a claim about the change taking effect, so it is only scored by
 *  results that arrived after it was made, never by what was already on file. */
function latestUploadSince(subjectId: SubjectId, since: string): ResultUpload | undefined {
  return [...state.resultUploads]
    .filter((u) => u.subjectId === subjectId && u.filedAt >= since)
    .sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1))[0];
}

/** Closed loop: score any open prediction on a subject against results filed
 *  after the prediction was made. Returns how many were scored. */
function fillPredictionsForSubject(subjectId: SubjectId): number {
  let scored = 0;
  set((s) => ({
    predictions: s.predictions.map((p) => {
      if (p.subjectId !== subjectId || p.actualMastery !== undefined) return p;
      const upload = latestUploadSince(subjectId, p.madeAt);
      if (!upload) return p;
      const actual = masteryFromUpload(upload);
      scored += 1;
      return { ...p, actualMastery: actual, residual: Math.abs(p.predictedMastery - actual) };
    }),
  }));
  return scored;
}

/** Score every open prediction against results filed since it was made. Honest
 *  toast: only claims what it actually did. */
export function scoreOpenPredictions() {
  let scored = 0;
  for (const subjectId of new Set(
    state.predictions.filter((p) => p.actualMastery === undefined).map((p) => p.subjectId),
  )) {
    scored += fillPredictionsForSubject(subjectId);
  }
  set({
    toast:
      scored > 0
        ? `Scored ${scored} prediction${scored === 1 ? "" : "s"} against the filed results.`
        : "No new results have been filed since these predictions were made.",
  });
}

// ---------- Course Studio: authoring ----------
export function draftWithAgent(proposalId: ProposalId, mode: "agent" | "hybrid") {
  const p = proposalById(proposalId);
  const subject = p && subjectById(p.subjectId);
  if (!p || !subject) return;
  setAgent("authoring", "working");
  const clos = state.clos.filter((c) => c.subjectId === subject.id);
  const result = runAuthoring(subject, clos, "Align with demand", "draft", p.draft, "fixture");
  patchProposal(proposalId, (pp) => ({
    ...pp,
    draft: { ...result.draft, testDraftId: pp.draft.testDraftId },
    history: [
      ...pp.history,
      { at: nowIso(), byPersonId: pp.authorId, action: "agent-drafted", note: `Agent drafted (${mode} mode).` },
    ],
  }));
  setAgent("authoring", mode === "hybrid" ? "needs-input" : "done");
  if (mode === "hybrid") {
    set({ agentBubble: { agent: "authoring", text: "Drafted a revision. Your turn to refine a line." } });
  }
  augmentLive("authoring", `Drafting an update for ${subject.id} against rising demand`, "studio", {
    job: "draft",
    subject: { id: subject.id, title: subject.title },
    clos: clos.map((c) => ({ id: c.id, text: c.text, bloomLevel: c.bloomLevel })),
    target: "Align the subject with rising market demand for machine learning",
    mode,
  });
}

/** Replace a proposal's draft wholesale (the live Authoring path streams, then
 *  commits through here so history stays honest about who wrote what). */
export function applyAgentDraft(proposalId: ProposalId, draft: ChangeProposal["draft"], note: string) {
  patchProposal(proposalId, (pp) => ({
    ...pp,
    draft: { ...draft, testDraftId: pp.draft.testDraftId },
    history: [...pp.history, { at: nowIso(), byPersonId: pp.authorId, action: "agent-drafted", note }],
  }));
}

export function requestAgentReview(proposalId: ProposalId) {
  const p = proposalById(proposalId);
  const subject = p && subjectById(p.subjectId);
  if (!p || !subject) return;
  setAgent("authoring", "working");
  const clos = state.clos.filter((c) => c.subjectId === subject.id);
  const result = runAuthoring(subject, clos, "Review draft", "review", p.draft, "fixture");
  set({ critique: result.critique ?? [] });
  setAgent("authoring", "needs-input");
  set({ agentBubble: { agent: "authoring", text: "I flagged a few things in the draft." } });
  // Live path: a real model critique replaces the fixture lines when it lands.
  augmentLive(
    "authoring",
    `Reviewing the ${subject.id} draft`,
    "studio",
    {
      job: "review",
      subject: { id: subject.id, title: subject.title },
      clos: clos.map((c) => ({ id: c.id, text: c.text, bloomLevel: c.bloomLevel })),
      draft: p.draft,
    },
    (text) => {
      const lines = text
        .split("\n")
        .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
        .filter((l) => l.length > 8)
        .slice(0, 6);
      if (lines.length > 0) set({ critique: lines });
    },
  );
}

export function setCritique(critique: string[] | null) {
  set({ critique });
}

/** Edit a single CLO-change line. */
export function editCloChangeText(proposalId: ProposalId, index: number, text: string) {
  patchProposal(proposalId, (p) => {
    const cloChanges = [...(p.draft.cloChanges ?? [])];
    if (cloChanges[index]) cloChanges[index] = { ...cloChanges[index], text };
    return { ...p, draft: { ...p.draft, cloChanges } };
  });
}

/** Edit the free-text parts of a draft (topics, test/lab notes). */
export function editDraftField(
  proposalId: ProposalId,
  field: "topics" | "testDraft" | "labDraft",
  value: string,
) {
  patchProposal(proposalId, (p) => ({
    ...p,
    draft: {
      ...p.draft,
      [field]: field === "topics" ? value.split("\n").filter((t) => t.trim().length > 0) : value,
    },
  }));
}

/** Start a fresh draft on a subject that has no open proposal. Authored by the
 *  current person, so a lecturer's draft is correctly lecturer-authored (and so
 *  must pass coordinator review before testing). Selects it. */
export function startDraft(subjectId: SubjectId): ProposalId | null {
  const person = currentPerson();
  if (!person || !subjectById(subjectId) || !can(person, "draft-change", { subjectId, assignments: state.assignments })) return null;
  const existing = state.proposals.find(
    (p) => p.subjectId === subjectId && p.status !== "approved" && p.status !== "rejected",
  );
  if (existing) {
    selectSubject(subjectId);
    selectProposal(existing.id);
    selectStudioTab("content");
    return existing.id;
  }
  const clo = state.clos.find((c) => c.subjectId === subjectId);
  const id = `CP-${subjectId}-${state.idSeq}`;
  const proposal: ChangeProposal = {
    id,
    subjectId,
    kind: "update",
    authorId: person.id,
    draft: {
      topics: [],
      cloChanges: clo
        ? [{ cloId: clo.id, op: "edit", text: clo.text, bloomLevel: clo.bloomLevel }]
        : [],
    },
    status: "drafting",
    history: [{ at: nowIso(), byPersonId: person.id, action: "drafted", note: "Draft started." }],
  };
  set((s) => ({
    proposals: [...s.proposals, proposal],
    idSeq: s.idSeq + 1,
    selectedSubjectId: subjectId,
    selectedProposalId: id,
    studioTab: "content",
  }));
  return id;
}

// ---------- the assessment studio (spec 6.4) ----------
const BLOOM_ORDER: BloomLevel[] = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"];
// Display difficulty per Bloom level for generated items (the ladder shape the
// spine uses; labelled as a draft value until an item is calibrated).
const BLOOM_B: Record<BloomLevel, number> = {
  Remember: 0.1,
  Understand: 0.3,
  Apply: 0.5,
  Analyse: 0.7,
  Evaluate: 0.85,
  Create: 1.0,
};
const BLOOM_VERB: Record<BloomLevel, string> = {
  Remember: "Define",
  Understand: "Explain",
  Apply: "Apply",
  Analyse: "Analyse",
  Evaluate: "Evaluate",
  Create: "Design",
};

/** Create (or return the existing) test draft for a subject/proposal. */
export function createTestDraft(subjectId: SubjectId, proposalId?: ProposalId): string | null {
  const person = currentPerson();
  if (!person || !can(person,"draft-change",{ subjectId,assignments:state.assignments })) return null;
  const existing = state.testDrafts.find(
    (t) => t.subjectId === subjectId && t.status !== "approved" && (!proposalId || t.proposalId === proposalId),
  );
  if (existing) return existing.id;
  const clos = state.clos.filter((c) => c.subjectId === subjectId);
  const weight = clos.length > 0 ? 1 / clos.length : 1;
  const draft: TestDraft = {
    id: nextId(`TD-${subjectId}`),
    subjectId,
    proposalId,
    blueprint: {
      subjectId,
      totalMarks: 40,
      cloWeights: clos.map((c) => ({ cloId: c.id, weight })),
      bloomMix: { Understand: 0.25, Apply: 0.5, Analyse: 0.25 },
    },
    items: [],
    status: "drafting",
    authorId: person.id,
    courseVersionId: subjectById(subjectId)?.currentVersionId,
  };
  set((s) => ({ testDrafts: [...s.testDrafts, draft] }));
  if (proposalId) {
    patchProposal(proposalId, (p) => ({ ...p, draft: { ...p.draft, testDraftId: draft.id } }));
  }
  return draft.id;
}


function mayEditAssessment(t: TestDraft): boolean {
  const person = currentPerson();
  return !!person && can(person, "draft-change", { subjectId: t.subjectId, assignments: state.assignments }) &&
    (t.authorId === person.id || can(person, "review-draft", { subjectId: t.subjectId, assignments: state.assignments }));
}

function assessmentLinkError(t: TestDraft): string | null {
  const ids = new Set(state.clos.filter(c => c.subjectId === t.subjectId).map(c => c.id));
  return t.blueprint.cloWeights.some(w => !ids.has(w.cloId)) || t.items.some(i => !ids.has(i.targetCLO))
    ? "Repair removed outcome links before reviewing this assessment." : null;
}

/** Keep the questions; explicitly replace obsolete blueprint mappings. */
export function resetAssessmentOutcomeWeights(testDraftId: string) {
  const t = state.testDrafts.find(x => x.id === testDraftId);
  if (!t || !mayEditAssessment(t)) return;
  const clos = state.clos.filter(c => c.subjectId === t.subjectId);
  if (!clos.length) { set({ toast: "Record course outcomes before resetting the blueprint." }); return; }
  set(s => ({ testDrafts: s.testDrafts.map(x => x.id === t.id ? { ...x, status: "drafting",
    needsReview: true, blueprint: { ...x.blueprint, cloWeights: clos.map(c => ({ cloId: c.id, weight: 1 / clos.length })) } } : x),
    toast: "Outcome weights reset. Questions were kept; review their mappings and marks." }));
}

export function acknowledgeAssessmentCourseChange(testDraftId: string, acknowledged: boolean) {
  const t = state.testDrafts.find(x => x.id === testDraftId);
  if (!t || !mayEditAssessment(t)) return { ok: false, error: "Only the assessment author or course coordinator can record this review." };
  if (!acknowledged) return { ok: false, error: "Review the blueprint and every question before recording the course-change review." };
  const error = assessmentLinkError(t);
  if (error) return { ok: false, error };
  if (!t.items.length) return { ok: false, error: "Prepare and review the questions first." };
  set(s => ({ testDrafts: s.testDrafts.map(x => x.id === t.id ? { ...x, status: "drafting",
    needsReview: false, courseVersionId: subjectById(t.subjectId)?.currentVersionId } : x),
    toast: "Course-change review recorded. Send the assessment through its normal review step." }));
  return { ok: true };
}

export function updateBlueprint(testDraftId: string, blueprint: AssessmentBlueprint) {
  const t = state.testDrafts.find(x => x.id === testDraftId);
  if (!t || !mayEditAssessment(t)) return;
  set((s) => ({
    testDrafts: s.testDrafts.map((t) => (t.id === testDraftId ? { ...t, blueprint, status: "drafting" } : t)),
  }));
}

/** Deterministic local item generation against the blueprint (the offline path;
 *  the live Authoring agent replaces the wording, not the structure). */
export function generateTestItems(testDraftId: string) {
  const t = state.testDrafts.find((x) => x.id === testDraftId);
  if (!t || !mayEditAssessment(t)) return;
  const clos = state.clos.filter((c) => c.subjectId === t.subjectId);
  const targetCount = Math.max(4, Math.round(t.blueprint.totalMarks / 5));
  const mix = Object.entries(t.blueprint.bloomMix) as Array<[BloomLevel, number]>;
  const bloomPool: BloomLevel[] = [];
  for (const [level, share] of mix) {
    const n = Math.max(1, Math.round(share * targetCount));
    for (let i = 0; i < n; i += 1) bloomPool.push(level);
  }
  while (bloomPool.length < targetCount) bloomPool.push("Apply");
  bloomPool.sort((a, b) => BLOOM_ORDER.indexOf(a) - BLOOM_ORDER.indexOf(b));

  const items: TestItem[] = [];
  let i = 0;
  for (const cw of t.blueprint.cloWeights) {
    const clo = clos.find((c) => c.id === cw.cloId);
    if (!clo) continue;
    const count = Math.max(1, Math.round(cw.weight * targetCount));
    for (let k = 0; k < count && items.length < targetCount; k += 1) {
      const bloom = bloomPool[Math.min(i, bloomPool.length - 1)];
      i += 1;
      items.push({
        id: `${t.id}-Q${items.length + 1}`,
        text: `${BLOOM_VERB[bloom]} ${clo.text.toLowerCase()} ${
          bloom === "Apply" || bloom === "Analyse"
            ? "on a worked scenario, showing each step"
            : "in your own words, with one concrete example"
        }.`,
        targetCLO: clo.id,
        bloomLevel: bloom,
        difficulty: BLOOM_B[bloom],
        marks: Math.max(2, Math.round((cw.weight * t.blueprint.totalMarks) / count)),
        source: "agent",
      });
    }
  }
  set((s) => ({
    testDrafts: s.testDrafts.map((x) => (x.id === testDraftId ? { ...x, items, status: "drafting" } : x)),
    toast: `Drafted ${items.length} items against the blueprint.`,
  }));
}

export function updateTestItem(testDraftId: string, itemId: string, patch: Partial<TestItem>) {
  const draft = state.testDrafts.find(x => x.id === testDraftId);
  if (!draft || !mayEditAssessment(draft)) return;
  set((s) => ({
    testDrafts: s.testDrafts.map((t) =>
      t.id === testDraftId
        ? {
            ...t, status: "drafting",
            items: t.items.map((it) =>
              it.id === itemId ? { ...it, ...patch, source: "human" as const } : it,
            ),
          }
        : t,
    ),
  }));
}

export function removeTestItem(testDraftId: string, itemId: string) {
  const draft = state.testDrafts.find(x => x.id === testDraftId);
  if (!draft || !mayEditAssessment(draft)) return;
  set((s) => ({
    testDrafts: s.testDrafts.map((t) =>
      t.id === testDraftId ? { ...t, status: "drafting", items: t.items.filter((it) => it.id !== itemId) } : t,
    ),
  }));
}

/** A lecturer submits their test for coordinator review; a coordinator's own
 *  draft can be approved directly. Same authority chain as proposals. */
export function submitTestDraft(testDraftId: string) {
  const t = state.testDrafts.find((x) => x.id === testDraftId);
  const person = currentPerson();
  if (!t || !person || t.authorId !== person.id || !mayEditAssessment(t) || t.status !== "drafting") return;
  if (t.needsReview || assessmentLinkError(t)) { set({ toast: "Review the course change and repair outcome links before submitting this assessment." }); return; }
  const isCoord = hatsOn(t.authorId, t.subjectId, state.assignments).includes("coordinator");
  if (isCoord) {
    set((s) => ({
      testDrafts: s.testDrafts.map((x) => (x.id === testDraftId ? { ...x, status: "approved" } : x)),
      toast: "Test approved (coordinator's own draft).",
    }));
    return;
  }
  set((s) => ({
    testDrafts: s.testDrafts.map((x) =>
      x.id === testDraftId ? { ...x, status: "coordinator-review" } : x,
    ),
  }));
  const coord = personWithHat(t.subjectId, "coordinator");
  if (coord) {
    notify({
      toPersonId: coord.id,
      kind: "review-request",
      subjectId: t.subjectId,
      proposalId: t.proposalId,
      agentFindings: "A lecturer has drafted a test and is asking for your review.",
    });
  }
  set({ toast: "Test sent to the coordinator for review." });
}

export function approveTestDraft(testDraftId: string) {
  const t = state.testDrafts.find((x) => x.id === testDraftId);
  const person = currentPerson();
  if (!t || !person || t.status !== "coordinator-review") return;
  if (t.needsReview || assessmentLinkError(t)) { set({ toast: "Review the course change and repair outcome links before approving this assessment." }); return; }
  if (!can(person, "review-draft", { subjectId: t.subjectId, assignments: state.assignments })) {
    set({ toast: "Only the subject coordinator can approve a test." });
    return;
  }
  set((s) => ({
    testDrafts: s.testDrafts.map((x) => (x.id === testDraftId ? { ...x, status: "approved" } : x)),
    toast: "Test approved.",
  }));
}

// ---------- proposal state machine ----------
/** Lecturer-only author submits to the coordinator for review. */
export function submitForReview(proposalId: ProposalId) {
  const p = proposalById(proposalId);
  if (!p) return;
  const coord = personWithHat(p.subjectId, "coordinator");
  patchProposal(proposalId, (pp) => ({
    ...pp,
    status: "coordinator-review",
    history: [...pp.history, { at: nowIso(), byPersonId: pp.authorId, action: "submitted-for-review" }],
  }));
  if (coord) {
    notify({
      toPersonId: coord.id,
      kind: "review-request",
      subjectId: p.subjectId,
      proposalId,
      agentFindings: "A lecturer has drafted a change and is asking for your review before testing.",
    });
  }
  set({ toast: "Submitted to the coordinator for review." });
}

export function reviewApprove(proposalId: ProposalId) {
  const proposal = proposalById(proposalId), person = currentPerson();
  if (!proposal || !person || proposal.status !== "coordinator-review" || !can(person, "review-draft", { subjectId: proposal.subjectId, assignments: state.assignments })) return;
  patchProposal(proposalId, (p) => ({
    ...p,
    status: "testing",
    history: [
      ...p.history,
      { at: nowIso(), byPersonId: state.currentPersonId ?? p.authorId, action: "review-approved" },
    ],
  }));
  set({ toast: "Review approved. Ready to run the acceptance test." });
}

export function reviewRequestChanges(proposalId: ProposalId, note: string) {
  const p = proposalById(proposalId);
  if (!p) return;
  patchProposal(proposalId, (pp) => ({
    ...pp,
    status: "drafting",
    history: [
      ...pp.history,
      {
        at: nowIso(),
        byPersonId: state.currentPersonId ?? pp.authorId,
        action: "review-changes-requested",
        note,
      },
    ],
  }));
  notify({
    toPersonId: p.authorId,
    kind: "review-request",
    subjectId: p.subjectId,
    proposalId,
    agentFindings: note || "The coordinator asked for changes before this can be tested.",
  });
  set({ toast: "Changes requested; sent back to the author." });
}

/** Whether the test may run now. Two gates, both required:
 *  1. The ACTOR must have run-test capability on the subject: an academic with a
 *     hat there. This blocks management and the department from triggering a run.
 *  2. The PROPOSAL must be ready: already review-approved (status testing), or a
 *     coordinator's own draft (status drafting + author is the coordinator). This
 *     stops a lecturer's draft reaching a test without review. */
export function canRunTest(proposalId: ProposalId): boolean {
  const p = proposalById(proposalId);
  if (!p) return false;
  const person = currentPerson();
  if (!person || !can(person, "run-test", { subjectId: p.subjectId, assignments: state.assignments }))
    return false;
  if (p.status === "testing") return true;
  if (p.status === "drafting") return authorIsCoordinator(p);
  return false;
}

// ---------- the staged acceptance run ----------
let simTimer: ReturnType<typeof setInterval> | null = null;

/** Shared by the staged and immediate runs: enforce the gate, set testing, build
 *  the proxy cohort for a new subject, and compute the real spine result. */
function prepareRun(
  proposalId: ProposalId,
): { report: VerdictReport; distribution: AcceptanceDistribution } | null {
  const p = proposalById(proposalId);
  const subject = p && subjectById(p.subjectId);
  if (!p || !subject) return null;
  if (subject.workspaceOnly) { set({ toast: "Use Outcomes & topics to check this course. The legacy learning scenario has no calibrated data for it." }); return null; }
  if (p.baselineVersionId && p.baselineVersionId !== subject.currentVersionId) { set({ toast: "The proposal baseline is outdated. Start a revision from the current course version." }); return null; }
  if (!canRunTest(proposalId)) {
    set({ toast: "This draft must pass coordinator review before it can be tested." });
    return null;
  }
  patchProposal(proposalId, (pp) => ({
    ...pp,
    status: "testing",
    baselineVersionId: subject.currentVersionId,
    testedDraftFingerprint: JSON.stringify(pp.draft),
    history:
      pp.status === "testing"
        ? pp.history
        : [
            ...pp.history,
            { at: nowIso(), byPersonId: state.currentPersonId ?? pp.authorId, action: "review-approved" },
          ],
  }));

  // New-subject proposals are tested on an Analogy proxy cohort.
  const isNew = p.kind === "new-subject";
  let survey = state.survey;
  let items = ITEMS;
  let isProxyCohort = false;
  if (isNew) {
    const newCLOs = state.clos.filter((c) => c.subjectId === subject.id);
    const analogy = runAnalogy(newCLOs, state.subjects, state.survey);
    setAgent("analogy", "done");
    survey = analogy.proxySurvey;
    items = itemsForCLOs(newCLOs);
    isProxyCohort = true;
  }

  setAgent("cohort", "working");
  return runAcceptanceWithDistribution(p, subject, survey, items, {
    subjects: state.subjects,
    isProxyCohort,
  });
}

export function startAcceptanceRun(proposalId: ProposalId) {
  const prepared = prepareRun(proposalId);
  if (!prepared) return;
  const { report, distribution } = prepared;
  set({ sim: initSim(proposalId, report, distribution), drillOpen: false, drillStep: -1, screen: "acceptance" });
  selectProposal(proposalId);

  if (simTimer) clearInterval(simTimer);
  simTimer = setInterval(() => tickRun(report, distribution), scaleMs(SIM_TICK_MS));
}

/** Run without the staged reveal (a "skip animation" path; also used by proofs). */
export function runAcceptanceImmediate(proposalId: ProposalId) {
  const prepared = prepareRun(proposalId);
  if (!prepared) return;
  set({
    sim: {
      ...initSim(proposalId, prepared.report, prepared.distribution),
      phase: "done",
      learnersRun: prepared.report.groundedOnLearners,
      bins: initSim(proposalId, prepared.report, prepared.distribution).finalBins,
      displayedMastery: prepared.report.projectedMastery,
    },
  });
  finishRun(proposalId, prepared.report);
}

function tickRun(report: VerdictReport, _distribution: AcceptanceDistribution) {
  const sim = state.sim;
  if (!sim) {
    if (simTimer) clearInterval(simTimer);
    simTimer = null;
    return;
  }
  const next = stepSim(sim);
  set({ sim: next });
  if (next.phase === "done") {
    if (simTimer) clearInterval(simTimer);
    simTimer = null;
    finishRun(next.proposalId, report);
  }
}

function finishRun(proposalId: ProposalId, report: VerdictReport) {
  const current = proposalById(proposalId);
  if (!current || current.baselineVersionId !== subjectById(current.subjectId)?.currentVersionId || current.testedDraftFingerprint !== JSON.stringify(current.draft)) {
    set({ toast: "The course or proposal changed during the scenario. Its result cannot be used for a decision." }); return;
  }
  patchProposal(proposalId, (p) => ({
    ...p,
    status: "management-approval",
    acceptanceResult: report,
    history: [
      ...p.history,
      {
        at: nowIso(),
        byPersonId: state.currentPersonId ?? p.authorId,
        action: "tested",
        note: `Projected mastery ${report.projectedMastery.toFixed(2)}.`,
      },
    ],
  }));
  setAgent("cohort", "done");
  setAgent("evaluator", "needs-input");
  // Drop any earlier test-done ping for this proposal so a re-run (reject then
  // test again) does not pile up duplicate pings in management's inbox.
  set((s) => ({
    drillOpen: true,
    agentBubble: { agent: "evaluator", text: `Verdict ready: ${report.projectedMastery.toFixed(2)} projected.` },
    notifications: s.notifications.filter((n) => !(n.kind === "test-done" && n.proposalId === proposalId)),
  }));
  for (const m of state.people.filter((pp) => pp.orgRole === "management")) {
    notify({
      toPersonId: m.id,
      kind: "test-done",
      subjectId: proposalById(proposalId)?.subjectId,
      proposalId,
      agentFindings: report.summary,
    });
  }
  // Live path: the Evaluator writes its own verdict prose for the gate; the
  // measured numbers in the report are untouched either way.
  const tested = proposalById(proposalId);
  augmentLive("evaluator", "Compiling the verdict for management", "approval", {
    subjectId: tested?.subjectId,
    kind: tested?.kind,
    currentMastery: report.currentMastery,
    projectedMastery: report.projectedMastery,
    weakest: report.cloMastery.reduce((a, b) => (b.meanP < a.meanP ? b : a), report.cloMastery[0]),
    prerequisiteConflicts: report.prerequisiteConflicts,
    groundedOnLearners: report.groundedOnLearners,
    isProxyCohort: report.isProxyCohort,
  });
}

/** The coordinator's explicit "send this to management" affordance after a test. */
export function submitToManagement(proposalId: ProposalId) {
  const p = proposalById(proposalId);
  if (!p) return;
  closeDrill();
  set({ toast: "Verdict sent to management for approval." });
}

// ---------- the six-hop drill-down reveal ----------
let drillTimer: ReturnType<typeof setInterval> | null = null;

/** Reveal the drill-down one hop at a time (verdict -> CLO4 -> learner -> theta ->
 *  item -> P), each held long enough to read. Deterministic; the interval scales
 *  under turbo for the smoke. Works for a human too. */
export function startDrillReveal() {
  const report = proposalById(state.selectedProposalId)?.acceptanceResult;
  if (!report) return;
  set({ drillOpen: true, drillStep: 0 });
  if (drillTimer) clearInterval(drillTimer);
  drillTimer = setInterval(() => {
    const cur = state.drillStep;
    if (cur >= DRILL_STEPS - 1) {
      if (drillTimer) clearInterval(drillTimer);
      drillTimer = null;
      return;
    }
    set({ drillStep: cur + 1 });
  }, scaleMs(DRILL_STEP_MS));
}

export function closeDrill() {
  if (drillTimer) clearInterval(drillTimer);
  drillTimer = null;
  set({ drillStep: -1 });
}

// ---------- management approval gate ----------
export function approveProposal(proposalId: ProposalId) {
  const p = proposalById(proposalId), person = currentPerson();
  if (!person || !p || !can(person, "approve", { subjectId: p.subjectId, assignments: state.assignments })) return;
  if (!p.acceptanceResult || p.status !== "management-approval") return;
  const subject = subjectById(p.subjectId);
  if (!subject || p.baselineVersionId !== subject.currentVersionId || p.testedDraftFingerprint !== JSON.stringify(p.draft)) {
    set({ toast: "This proposal or its baseline changed. Review and run it again before recording approval." }); return;
  }
  const baseline = definitionForCourse(subject.id)!;
  const definition = structuredClone(baseline);
  for (const [index,change] of (p.draft.cloChanges ?? []).entries()) {
    const id = change.cloId ?? subject.id + "-" + p.id + "-outcome-" + (index + 1);
    const existing = definition.outcomes.find(c => c.id === id);
    if (change.op === "remove") {
      if (!existing) { set({ toast: "A removed outcome is no longer in this course." }); return; }
      definition.outcomes = definition.outcomes.filter(c => c.id !== id);
    } else if (change.op === "edit") {
      if (!existing) { set({ toast: "An edited outcome is no longer in this course." }); return; }
      definition.outcomes = definition.outcomes.map(c => c.id === id ? { ...c, text: change.text, bloomLevel: change.bloomLevel } : c);
    } else if (existing && p.kind !== "new-subject") {
      set({ toast: "The proposed new outcome already exists. Review the operation." }); return;
    } else if (!existing) definition.outcomes.push({ id, subjectId: subject.id, text: change.text,
      bloomLevel: change.bloomLevel, label: "CLO" + (definition.outcomes.length + 1), assessmentEvidence: "", ploIds: [] });
  }
  if (p.draft.topics?.length) definition.topics = p.draft.topics.map((title,index) => {
    const existing = baseline.topics.find(t => t.title === title);
    return existing ? structuredClone(existing) : { id: subject.id + "-" + p.id + "-topic-" + index, title, week: null,
      contactHours: 0, selfStudyHours: 0, cloIds: [], prerequisiteTopicIds: [], protected: false, resources: "" };
  });
  const structural = draftStructureError(definition,subject.id);
  const errors = structural ? [structural] : validateCourseDefinition(definition,subject.id,baseline).filter(i => i.severity === "error").map(i => i.message);
  if (definition.outcomes.some(c => state.clos.some(other => other.id === c.id && other.subjectId !== subject.id))) errors.push("An outcome identity belongs to another course.");
  if (errors.length) { set({ toast: "Cannot apply this proposal: " + errors.join(" ") }); return; }
  const at = nowIso(), versionId = nextId(subject.id + "-v");
  const impact = curriculumImpact(baseline,definition,state.teachingPlans.find(t => t.subjectId === subject.id),state.testDrafts.filter(t => t.subjectId === subject.id));
  const version: SubjectVersion = { id: versionId, subjectId: subject.id,
    snapshot: { title: definition.title, cloIds: definition.outcomes.map(c => c.id), prerequisiteSubjectIds: [...subject.prerequisiteSubjectIds] },
    cloSnapshot: structuredClone(definition.outcomes), definition: structuredClone(definition),
    changedBy: person.id, changedAt: at, reason: "Local proposal decision applied. Institutional authority is not verified by the prototype." };
  set(s => ({
    proposals: s.proposals.map(pp => pp.id === proposalId ? { ...pp, status: "approved",
      history: [...pp.history, { at, byPersonId: person.id, action: "approved", note: "Applied to local course version " + versionId + "." }] } : pp),
    courseDefinitions: { ...s.courseDefinitions, [subject.id]: definition },
    clos: [...s.clos.filter(c => c.subjectId !== subject.id), ...definition.outcomes],
    subjects: s.subjects.map(c => c.id === subject.id ? { ...c, title: definition.title, cloIds: definition.outcomes.map(o => o.id), currentVersionId: versionId, status: "active" } : c),
    subjectVersions: [...(s.subjectVersions.some(v => v.id === subject.currentVersionId)
      ? s.subjectVersions.map(v => v.id === subject.currentVersionId && !v.definition ? { ...v, definition: structuredClone(baseline) } : v)
      : [...s.subjectVersions, { id: subject.currentVersionId, subjectId: subject.id,
          snapshot: { title: subject.title, cloIds: [...subject.cloIds], prerequisiteSubjectIds: [...subject.prerequisiteSubjectIds] },
          cloSnapshot: structuredClone(baseline.outcomes), definition: baseline, changedBy: person.id, changedAt: at, reason: "Baseline preserved before proposal decision." }]), version],
    predictions: [...s.predictions, { proposalId, subjectId: subject.id, predictedMastery: p.acceptanceResult!.projectedMastery, madeAt: at }],
    teachingPlans: s.teachingPlans.map(t => t.subjectId === subject.id ? { ...t, sessions: t.sessions.map(session =>
      impact.sessions.some(x => x.id === session.id) ? { ...session, needsReview: true, courseVersionId: session.courseVersionId ?? subject.currentVersionId } : session) } : t),
    testDrafts: s.testDrafts.map(t => impact.assessments.some(x => x.id === t.id) ? { ...t, needsReview: true, status: "drafting" } : t),
    toast: "Decision applied to a new local course version. The prediction remains an illustrative scenario."
  }));
  setAgent("evaluator", "done");
  notify({ toPersonId: p.authorId, kind: "approved", subjectId: p.subjectId, proposalId,
    agentFindings: "The prototype reviewer recorded a decision and applied the local course changes." });
}

export function rejectProposal(proposalId: ProposalId, note = "Not approved.") {
  const p = proposalById(proposalId);
  const person = currentPerson();
  if (!person || !can(person, "approve", { subjectId: p?.subjectId, assignments: state.assignments })) return;
  if (!p || p.status !== "management-approval") return;
  patchProposal(proposalId, (pp) => ({
    ...pp,
    status: "drafting",
    history: [
      ...pp.history,
      { at: nowIso(), byPersonId: person.id, action: "rejected", note },
    ],
  }));
  notify({ toPersonId: p.authorId, kind: "rejected", subjectId: p.subjectId, proposalId, agentFindings: note });
  set({ toast: "Rejected and returned to the author." });
  setAgent("evaluator", "done");
}

// ---------- department: create subject + assign hats ----------
export function createSubject(args: {
  id: SubjectId;
  title: string;
  year: number;
  semester: number;
  coordinatorId: PersonId;
  cloText: string;
}): SubjectId {
  const cloId = `${args.id}-CLO1`;
  const subject: Subject = {
    id: args.id,
    title: args.title,
    programmeId: state.programme.id,
    year: args.year,
    semester: args.semester,
    cloIds: [cloId],
    prerequisiteSubjectIds: [],
    sharedWithProgrammeIds: [],
    status: "proposed",
    currentVersionId: `${args.id}-v1`,
  };
  const clo: CLO = { id: cloId, subjectId: args.id, text: args.cloText, bloomLevel: "Apply" };
  const proposal: ChangeProposal = {
    id: `CP-${args.id}-001`,
    subjectId: args.id,
    kind: "new-subject",
    authorId: args.coordinatorId,
    draft: {
      topics: [args.cloText],
      cloChanges: [{ cloId, op: "add", text: args.cloText, bloomLevel: "Apply" }],
    },
    status: "drafting",
    history: [
      { at: nowIso(), byPersonId: state.programme.departmentOwnerId, action: "drafted", note: "New subject scoped." },
    ],
  };
  set((s) => ({
    subjects: [...s.subjects, subject],
    clos: [...s.clos, clo],
    assignments: [...s.assignments, { personId: args.coordinatorId, subjectId: args.id, hat: "coordinator" }],
    proposals: [...s.proposals, proposal],
    toast: `Created ${args.id} and assigned a coordinator.`,
  }));
  return args.id;
}

export function assignHat(personId: PersonId, subjectId: SubjectId, hat: Hat) {
  if (state.assignments.some((a) => a.personId === personId && a.subjectId === subjectId && a.hat === hat))
    return;
  set((s) => ({ assignments: [...s.assignments, { personId, subjectId, hat }], toast: "Hat assigned." }));
}

// ---------- office helpers ----------
export function setAgentState(agent: AgentId, st: AgentState) {
  setAgent(agent, st);
}

// ---------- reset (workspace + demo) ----------
/** Reset the mutable world to seed and stop every timer. Used by the account
 *  menu's "Reset workspace" and by the self-driving demo on each Play. */
export function resetDemoState() {
  if (simTimer) clearInterval(simTimer);
  simTimer = null;
  if (signalTimer) clearInterval(signalTimer);
  signalTimer = null;
  if (drillTimer) clearInterval(drillTimer);
  drillTimer = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // fine: the in-memory reset below still applies
    }
  }
  state = seedState();
  emit();
}
export const resetWorkspace = resetDemoState;


// ---------- lecturer-controlled curriculum revisions ----------
export function definitionForCourse(subjectId: SubjectId): CourseDefinition | null {
  const subject = subjectById(subjectId);
  if (!subject) return null;
  return structuredClone(state.courseDefinitions[subjectId] ?? courseDefinition(subject, state.clos, state.programme.title));
}
export function createCourseWorkspace(input: { code: string; title: string; programmeTitle: string; year: number; semester: number }): SaveResult & { subjectId?: string } {
  const person = currentPerson();
  if (!person || person.orgRole !== "academic") return { ok: false, error: "Use a lecturer workspace to create a personal course." };
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{1,39}$/.test(code)) return { ok: false, error: "Use a course code of 2 to 40 letters, numbers, dots, underscores or hyphens." };
  if (state.subjects.some(s => s.id.toUpperCase() === code)) return { ok: false, error: "That course code is already in this workspace." };
  if (!input.title.trim() || input.title.length > 200) return { ok: false, error: "Give the course a title of up to 200 characters." };
  if (!Number.isInteger(input.year) || input.year < 1 || input.year > 12 || !Number.isInteger(input.semester) || input.semester < 1 || input.semester > 4)
    return { ok: false, error: "Use a year from 1 to 12 and a semester from 1 to 4." };
  const versionId = nextId(code + "-workspace");
  const subject: Subject = { id: code, title: input.title.trim(), programmeId: state.programme.id,
    year: input.year, semester: input.semester, cloIds: [], prerequisiteSubjectIds: [],
    sharedWithProgrammeIds: [], status: "proposed", currentVersionId: versionId, workspaceOnly: true };
  const definition = courseDefinition(subject, [], input.programmeTitle.trim());
  set(s => ({ subjects: [...s.subjects, subject], courseDefinitions: { ...s.courseDefinitions, [code]: definition },
    assignments: [...s.assignments, { personId: person.id, subjectId: code, hat: "lecturer" }],
    programme: { ...s.programme, subjectIds: [...s.programme.subjectIds, code] },
    subjectVersions: [...s.subjectVersions, { id: versionId, subjectId: code,
      snapshot: { title: subject.title, cloIds: [], prerequisiteSubjectIds: [] }, cloSnapshot: [],
      definition: structuredClone(definition), changedBy: person.id, changedAt: nowIso(),
      reason: "Personal course workspace created; not institutional approval." }],
    selectedSubjectId: code, selectedProposalId: null, studioTab: "curriculum", screen: "studio",
    toast: "Course created. Add learning outcomes and a topic outline." }));
  startCurriculumRevision(code);
  return { ok: true, subjectId: code };
}
export function startCurriculumRevision(subjectId: SubjectId): SaveResult & { draftId?: string } {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can revise this course." };
  const existing = state.curriculumDrafts.find(d => d.subjectId === subjectId && d.status === "drafting");
  if (existing) return { ok: true, draftId: existing.id };
  const subject = subjectById(subjectId)!;
  const definition = definitionForCourse(subjectId)!;
  const person = currentPerson()!;
  const draft: CurriculumDraft = { id: nextId("REV-" + subjectId), subjectId, baselineVersionId: subject.currentVersionId,
    revision: 1, definition, reason: "", effectiveTerm: "", status: "drafting", checkedRevision: null,
    history: [{ at: nowIso(), byPersonId: person.id, action: "created", note: "Revision started from " + subject.currentVersionId, revision: 1 }] };
  const baseline: SubjectVersion = { id: subject.currentVersionId, subjectId,
    snapshot: { title: subject.title, cloIds: [...subject.cloIds], prerequisiteSubjectIds: [...subject.prerequisiteSubjectIds] },
    cloSnapshot: structuredClone(state.clos.filter(c => c.subjectId === subjectId)), definition: structuredClone(definition),
    changedBy: person.id, changedAt: nowIso(), reason: "Baseline preserved before revision." };
  set(s => ({ curriculumDrafts: [...s.curriculumDrafts, draft],
    subjectVersions: s.subjectVersions.some(v => v.id === baseline.id)
      ? s.subjectVersions.map(v => v.id === baseline.id && !v.definition ? { ...v, definition: structuredClone(definition) } : v)
      : [...s.subjectVersions, baseline], toast: "Revision started. The current course is unchanged." }));
  return { ok: true, draftId: draft.id };
}
function editableRevision(draftId: string, expectedRevision: number): CurriculumDraft | string {
  const draft = state.curriculumDrafts.find(d => d.id === draftId);
  if (!draft || !mayPlan(draft.subjectId)) return "You cannot edit this course revision.";
  if (draft.status !== "drafting") return "This revision is closed. Start a new revision.";
  if (draft.revision !== expectedRevision) return "The saved revision changed. Reload it before saving your edits.";
  if (subjectById(draft.subjectId)?.currentVersionId !== draft.baselineVersionId) return "The current course version changed. Start a revision from the latest version.";
  return draft;
}
export function saveCurriculumRevision(draftId: string, expectedRevision: number,
  input: { definition: CourseDefinition; reason: string; effectiveTerm: string }): SaveResult {
  const draft = editableRevision(draftId, expectedRevision);
  if (typeof draft === "string") return { ok: false, error: draft };
  const error = draftStructureError(input.definition, draft.subjectId);
  if (error) return { ok: false, error };
  if (input.definition.outcomes.some(c => state.clos.some(existing => existing.id === c.id && existing.subjectId !== draft.subjectId))) return { ok: false, error: "An outcome identity belongs to another course." };
  if (typeof input.reason !== "string" || input.reason.length > 50000 || typeof input.effectiveTerm !== "string" || input.effectiveTerm.length > 100)
    return { ok: false, error: "Invalid revision rationale or teaching term." };
  const revision = draft.revision + 1;
  set(s => ({ curriculumDrafts: s.curriculumDrafts.map(d => d.id === draftId ? {
    ...d, definition: structuredClone(input.definition), reason: input.reason.trim(), effectiveTerm: input.effectiveTerm.trim(),
    revision, checkedRevision: null, history: [...d.history, { at: nowIso(), byPersonId: currentPerson()!.id,
      action: "saved", note: "Candidate edited; previous checks invalidated.", revision }] } : d), toast: "Revision saved. Current course version is unchanged." }));
  return { ok: true };
}
export function checkCurriculumRevision(draftId: string, expectedRevision: number): SaveResult {
  const draft = editableRevision(draftId, expectedRevision);
  if (typeof draft === "string") return { ok: false, error: draft };
  const baseline = state.subjectVersions.find(v => v.id === draft.baselineVersionId)?.definition;
  const errors = validateCourseDefinition(draft.definition, draft.subjectId, baseline).filter(i => i.severity === "error");
  if (errors.length) return { ok: false, error: errors.map(e => e.message).join(" ") };
  set(s => ({ curriculumDrafts: s.curriculumDrafts.map(d => d.id === draftId ? { ...d, checkedRevision: d.revision,
    history: [...d.history, { at: nowIso(), byPersonId: currentPerson()!.id, action: "checked",
      note: "Configured constraints checked. Academic judgement and institutional review remain required.", revision: d.revision }] } : d),
    toast: "Constraints checked. Review warnings and the change summary." }));
  return { ok: true };
}
export function adoptCurriculumRevision(draftId: string, expectedRevision: number, acknowledgement: boolean): SaveResult {
  const draft = editableRevision(draftId, expectedRevision);
  if (typeof draft === "string") return { ok: false, error: draft };
  if (draft.checkedRevision !== draft.revision) return { ok: false, error: "Check this saved revision before using it." };
  if (!draft.reason.trim() || !draft.effectiveTerm.trim()) return { ok: false, error: "Record the decision rationale and teaching term." };
  if (!acknowledgement) return { ok: false, error: "Confirm the local decision boundary and review the affected teaching work." };
  if (draft.definition.outcomes.some(c => state.clos.some(existing => existing.id === c.id && existing.subjectId !== draft.subjectId))) return { ok: false, error: "An outcome identity now belongs to another course." };
  const subject = subjectById(draft.subjectId)!;
  const baseline = definitionForCourse(subject.id)!;
  const errors = validateCourseDefinition(draft.definition, subject.id, baseline).filter(i => i.severity === "error");
  if (errors.length) return { ok: false, error: errors.map(e => e.message).join(" ") };
  if (!curriculumChanges(baseline, draft.definition).length) return { ok: false, error: "There are no course changes to save as a new version." };
  const person = currentPerson()!;
  const at = nowIso(), versionId = nextId(subject.id + "-workspace");
  const def = structuredClone(draft.definition);
  const impact = curriculumImpact(baseline, def, state.teachingPlans.find(p => p.subjectId === subject.id),
    state.testDrafts.filter(t => t.subjectId === subject.id));
  const version: SubjectVersion = { id: versionId, subjectId: subject.id,
    snapshot: { title: def.title.trim(), cloIds: def.outcomes.map(c => c.id), prerequisiteSubjectIds: [...subject.prerequisiteSubjectIds] },
    cloSnapshot: def.outcomes.map(c => ({ ...c })), definition: structuredClone(def), effectiveTerm: draft.effectiveTerm,
    changedBy: person.id, changedAt: at, reason: draft.reason };
  set(s => ({ courseDefinitions: { ...s.courseDefinitions, [subject.id]: def },
    clos: [...s.clos.filter(c => c.subjectId !== subject.id), ...def.outcomes.map(c => ({ ...c }))],
    subjects: s.subjects.map(c => c.id === subject.id ? { ...c, title: def.title.trim(),
      cloIds: def.outcomes.map(o => o.id), currentVersionId: versionId } : c),
    subjectVersions: [...s.subjectVersions, version],
    curriculumDrafts: s.curriculumDrafts.map(d => d.id === draftId ? { ...d, status: "adopted",
      history: [...d.history, { at, byPersonId: person.id, action: "adopted", note: "Used as local course version " + versionId + ". " + draft.reason, revision: d.revision }] } : d),
    teachingPlans: s.teachingPlans.map(p => p.subjectId === subject.id ? { ...p,
      sessions: p.sessions.map(session => impact.sessions.some(x => x.id === session.id)
        ? { ...session, needsReview: true, courseVersionId: session.courseVersionId ?? subject.currentVersionId } : session) } : p),
    testDrafts: s.testDrafts.map(t => impact.assessments.some(x => x.id === t.id)
      ? { ...t, needsReview: true, status: "drafting" } : t),
    proposals: s.proposals.map(p => p.subjectId === subject.id && p.status !== "approved" && p.status !== "rejected"
      ? { ...p, baselineVersionId: p.baselineVersionId ?? subject.currentVersionId, acceptanceResult: undefined, status: "drafting" } : p),
    toast: "New local course version saved. Review affected teaching sessions and assessments." }));
  return { ok: true };
}
export function discardCurriculumRevision(draftId: string, expectedRevision: number, note: string): SaveResult {
  const draft = state.curriculumDrafts.find(d => d.id === draftId);
  if (!draft || !mayPlan(draft.subjectId) || draft.status !== "drafting") return { ok: false, error: "You cannot discard this revision." };
  if (draft.revision !== expectedRevision) return { ok: false, error: "The revision changed; reload it first." };
  if (!note.trim()) return { ok: false, error: "Record why you are discarding this revision." };
  set(s => ({ curriculumDrafts: s.curriculumDrafts.map(d => d.id === draftId ? { ...d, status: "discarded",
    history: [...d.history, { at: nowIso(), byPersonId: currentPerson()!.id, action: "discarded", note: note.trim(), revision: d.revision }] } : d),
    toast: "Revision discarded. The current course version is unchanged." }));
  return { ok: true };
}


let recoveryBackup: string | null = null;
const RECOVERY_KEY = "lyceum-v3-pre-restore@1";
export function exportWorkspaceBackup(): string {
  return serializeWorkspaceBackup(state, nowIso());
}
export function previewWorkspaceBackup(raw: string) {
  if (!currentPerson()) return { ok: false as const, error: "Open a local workspace before importing a backup." };
  const result = parseWorkspaceBackup(raw, state.people.map(p => p.id));
  return result.ok ? { ok: true as const, summary: backupSummary(result.backup.data),
    exportedAt: result.backup.exportedAt, fingerprint: workspaceFingerprint(state) } : result;
}
export function getRecoveryBackup(): string | null {
  if (recoveryBackup) return recoveryBackup;
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(RECOVERY_KEY); } catch { return null; }
}
export function restoreWorkspaceBackup(raw: string, expectedFingerprint: string, acknowledged: boolean): SaveResult {
  if (!currentPerson()) return { ok: false, error: "Open a local workspace before restoring." };
  if (!acknowledged) return { ok: false, error: "Confirm that you want to replace this browser workspace." };
  if (workspaceFingerprint(state) !== expectedFingerprint) return { ok: false, error: "The workspace changed after preview. Preview the backup again." };
  const parsed = parseWorkspaceBackup(raw, state.people.map(p => p.id));
  if (!parsed.ok) return parsed;
  const recovery = exportWorkspaceBackup();
  const next: AppState = { ...seedState(), ...structuredClone(parsed.backup.data),
    currentPersonId: state.currentPersonId, screen: "guide", persistenceStatus: "saved",
    selectedSubjectId: null, selectedProposalId: null, toast: "Workspace restored. A pre-restore recovery backup is available." };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(RECOVERY_KEY, recovery);
      const persisted = Object.fromEntries(PERSISTED_KEYS.map(k => [k, next[k]]));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      return { ok: false, error: "Storage could not save the recovery and restored workspace. Nothing was replaced. Export your current workspace first." };
    }
  }
  if (saveTimer) clearTimeout(saveTimer);
  if (simTimer) clearInterval(simTimer);
  if (signalTimer) clearInterval(signalTimer);
  if (drillTimer) clearInterval(drillTimer);
  saveTimer = null; simTimer = null; signalTimer = null; drillTimer = null;
  recoveryBackup = recovery;
  state = next;
  emit();
  return { ok: true };
}


// ---------- lecturer-supplied evidence receipts (plan Sections 7 and 8, manual path) ----------
// Nothing here fetches. A source is the text the lecturer pasted; a mention is an
// exact quotation from it; a mapping is the lecturer's reviewed coverage judgement.
export function addEvidenceSource(subjectId: SubjectId, input: EvidenceSourceInput): SaveResult & { sourceId?: string } {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can record evidence for this course." };
  const error = evidenceSourceError(input);
  if (error) return { ok: false, error };
  const text = input.text.trim(), textHash = textFingerprint(text), normalised = normaliseWhitespace(text).toLowerCase();
  const original = state.evidenceSources.find((s) => s.subjectId === subjectId && s.kind === input.kind && s.duplicateOf === null &&
    s.textHash === textHash && normaliseWhitespace(s.text).toLowerCase() === normalised);
  const source: EvidenceSource = { id: nextId("EV-" + subjectId), subjectId, kind: input.kind, title: normaliseWhitespace(input.title),
    organisation: normaliseWhitespace(input.organisation), url: input.url.trim(), sourceDate: input.sourceDate.trim(), text, textHash,
    duplicateOf: original?.id ?? null, provenance: "lecturer-supplied", reviewed: false, addedBy: currentPerson()!.id, addedAt: nowIso() };
  set((s) => ({ evidenceSources: [...s.evidenceSources, source],
    toast: original ? "Recorded as a duplicate copy of " + original.title + ". It counts once." : "Source recorded. Quote its requirements, then mark the extraction reviewed." }));
  return { ok: true, sourceId: source.id };
}
export function setEvidenceSourceReviewed(sourceId: string, reviewed: boolean): SaveResult {
  const source = state.evidenceSources.find((s) => s.id === sourceId);
  if (!source || !mayPlan(source.subjectId)) return { ok: false, error: "You cannot change this evidence source." };
  if (source.duplicateOf) return { ok: false, error: "Review the original copy; duplicates follow it." };
  if (source.kind !== "job-posting") return { ok: false, error: "Only job postings enter the denominator. Contextual documents are listed, not counted." };
  set((s) => ({ evidenceSources: s.evidenceSources.map((x) => (x.id === sourceId ? { ...x, reviewed } : x)),
    toast: reviewed ? "Extraction marked reviewed. This posting now counts in the denominator." : "Extraction marked unreviewed. This posting is excluded until reviewed." }));
  return { ok: true };
}
export function removeEvidenceSource(sourceId: string): SaveResult {
  const source = state.evidenceSources.find((s) => s.id === sourceId);
  if (!source || !mayPlan(source.subjectId)) return { ok: false, error: "You cannot remove this evidence source." };
  const promoted = state.evidenceSources.find((s) => s.duplicateOf === sourceId);
  set((s) => ({
    evidenceSources: s.evidenceSources.filter((x) => x.id !== sourceId).map((x) => x.duplicateOf !== sourceId ? x
      : x.id === promoted?.id ? { ...x, duplicateOf: null, reviewed: source.reviewed } : { ...x, duplicateOf: promoted!.id }),
    skillMentions: s.skillMentions.filter((m) => m.sourceId !== sourceId),
    toast: "Source and its quotations removed." + (promoted ? " " + promoted.title + " is now the original copy." : ""),
  }));
  return { ok: true };
}
export function addSkillMention(sourceId: string, input: MentionInput): SaveResult & { mentionId?: string } {
  const source = state.evidenceSources.find((s) => s.id === sourceId);
  if (!source || !mayPlan(source.subjectId)) return { ok: false, error: "You cannot quote from this evidence source." };
  const error = mentionError(input, source.text);
  if (error) return { ok: false, error };
  const skill = normaliseWhitespace(input.skill), excerpt = input.excerpt.trim(), key = skillKey(skill);
  if (state.skillMentions.some((m) => m.sourceId === sourceId && skillKey(m.skill) === key && normaliseWhitespace(m.excerpt).toLowerCase() === normaliseWhitespace(excerpt).toLowerCase()))
    return { ok: false, error: "That excerpt is already recorded for this skill." };
  const mention: SkillMention = { id: nextId("SM-" + source.subjectId), sourceId, subjectId: source.subjectId, skill, excerpt,
    requirement: input.requirement, addedBy: currentPerson()!.id, addedAt: nowIso() };
  set((s) => ({ skillMentions: [...s.skillMentions, mention], toast: "Requirement quoted from " + source.title + "." }));
  return { ok: true, mentionId: mention.id };
}
export function removeSkillMention(mentionId: string): SaveResult {
  const mention = state.skillMentions.find((m) => m.id === mentionId);
  if (!mention || !mayPlan(mention.subjectId)) return { ok: false, error: "You cannot remove this quotation." };
  set((s) => ({ skillMentions: s.skillMentions.filter((m) => m.id !== mentionId), toast: "Quotation removed." }));
  return { ok: true };
}
export function setSkillMapping(subjectId: SubjectId, input: MappingInput): SaveResult {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can map evidence to this course." };
  const outcomes = state.clos.filter((c) => c.subjectId === subjectId);
  const error = mappingError(input, outcomes.map((c) => c.id));
  if (error) return { ok: false, error };
  const key = skillKey(input.skill);
  const display = state.skillMentions.find((m) => m.subjectId === subjectId && skillKey(m.skill) === key)?.skill ?? normaliseWhitespace(input.skill);
  const mapping: SkillMapping = { subjectId, skill: display, cloIds: [...input.cloIds], stage: input.stage, target: input.target,
    evidence: input.evidence.trim(), updatedBy: currentPerson()!.id, updatedAt: nowIso() };
  set((s) => ({ skillMappings: [...s.skillMappings.filter((m) => !(m.subjectId === subjectId && skillKey(m.skill) === key)), mapping],
    toast: "Coverage mapping saved. It records your reviewed judgement, not a measured outcome." }));
  return { ok: true };
}
export function evidenceReportForCourse(subjectId: SubjectId) {
  return evidenceReport(subjectId, state.evidenceSources, state.skillMentions, state.skillMappings, state.clos.filter((c) => c.subjectId === subjectId));
}

// ---------- the lecturer's research run (plan Section 7, manual and permitted-board paths) ----------
export interface CollectRun {
  subjectId: SubjectId; provider: CollectionProvider; board: string; query: string; inText: boolean;
  status: "running" | "done" | "failed"; postings: CollectedPosting[]; retrievedAt: string | null; cached: boolean; total: number; error: string | null; label: string;
  log: string[]; // what actually happened, with clock times: the request, the bytes received, the match
  endpoint: string | null; bytes: number | null; durationMs: number | null;
}
const clock = () => new Date().toTimeString().slice(0, 8);
type CollectionLoader = (request: CollectionRequest) => Promise<CollectionOutcome>;
/** Fetch postings from a permitted board or the saved sample. Only on request; nothing is imported until the lecturer chooses. */
export async function runCollection(subjectId: SubjectId, input: { provider: CollectionProvider; board: string; query: string; inText: boolean }, loader: CollectionLoader = fetchCollection): Promise<SaveResult> {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can collect evidence for this course." };
  if (!SOURCE_POLICIES[input.provider]?.enabled) return { ok: false, error: "Choose a supported source." };
  const board = input.provider === "sample" ? "sample" : input.board.trim().toLowerCase();
  if (input.provider !== "sample" && !BOARD_TOKEN.test(board)) return { ok: false, error: "Enter the employer's board token: letters, digits, hyphens or underscores, for example the NAME in jobs.lever.co/NAME or boards.greenhouse.io/NAME." };
  const run = { subjectId, provider: input.provider, board, query: input.query.trim(), inText: Boolean(input.inText) };
  const opening = clock() + (input.provider === "sample"
    ? " Loading the saved sample shipped with the app. No network request."
    : " Requesting " + SOURCE_POLICIES[input.provider].name + " \"" + board + "\" through the local API (/api/collect/" + input.provider + "/" + board + "). Only this host is permitted.");
  set({ collectRun: { ...run, status: "running", postings: [], retrievedAt: null, cached: false, total: 0, error: null, label: "", log: [opening], endpoint: null, bytes: null, durationMs: null } });
  const result = await loader(run);
  const current = state.collectRun;
  if (!current || current.status !== "running" || current.subjectId !== subjectId || current.board !== board || current.provider !== input.provider) return { ok: true };
  if (result.ok) {
    const size = typeof result.bytes === "number" ? " (" + (result.bytes >= 1048576 ? (result.bytes / 1048576).toFixed(1) + " MB" : Math.round(result.bytes / 1024) + " kB") + ")" : "";
    const took = typeof result.durationMs === "number" ? " in " + (result.durationMs / 1000).toFixed(1) + " s" : "";
    const received = clock() + " Received " + result.total + " postings" + size + " from " + (result.endpoint ?? "the source") + took + (input.provider === "sample" ? ". Sample retrieved " + result.retrievedAt + "." : result.cached ? ". Served from the local cache; fetched live at " + result.retrievedAt + "." : ". Fetched live at " + result.retrievedAt + ".");
    const matched = clock() + " Kept " + result.postings.length + " of " + result.total + (run.query ? " whose " + (run.inText ? "title or text" : "title") + " matches \"" + run.query + "\"." : " (no keywords).") + " Nothing is imported until you choose.";
    set({ collectRun: { ...run, status: "done", postings: result.postings, retrievedAt: result.retrievedAt, cached: result.cached, total: result.total, error: null, label: result.label,
      log: [opening, received, matched], endpoint: result.endpoint ?? null, bytes: result.bytes ?? null, durationMs: result.durationMs ?? null } });
    return { ok: true };
  }
  set({ collectRun: { ...run, status: "failed", postings: [], retrievedAt: null, cached: false, total: 0, error: result.error, label: "", log: [opening, clock() + " Failed: " + result.error], endpoint: null, bytes: null, durationMs: null } });
  return { ok: false, error: result.error };
}
export function clearCollection() { set({ collectRun: null }); }
/** Keep chosen postings as sources. Each is a receipt with its link, publication date and retrieval time; it counts only after review. */
export function importCollectedPostings(subjectId: SubjectId, postingIds: string[]): SaveResult & { imported?: number; skipped?: number } {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can import evidence for this course." };
  const run = state.collectRun;
  if (!run || run.subjectId !== subjectId || run.status !== "done") return { ok: false, error: "Fetch postings first." };
  const chosen = run.postings.filter((p) => postingIds.includes(p.id));
  if (!chosen.length) return { ok: false, error: "Select at least one posting to import." };
  const person = currentPerson()!;
  const already = new Set(state.evidenceSources.filter((s) => s.subjectId === subjectId).map((s) => s.collection?.postingId ?? ""));
  const added: EvidenceSource[] = [];
  let imported = 0, skipped = 0;
  for (const posting of chosen) {
    const text = posting.text.trim();
    if (already.has(posting.id) || text.length < 20) { skipped += 1; continue; }
    const textHash = textFingerprint(text), normalised = normaliseWhitespace(text).toLowerCase();
    const original = [...state.evidenceSources, ...added].find((s) => s.subjectId === subjectId && s.kind === "job-posting" && s.duplicateOf === null &&
      s.textHash === textHash && normaliseWhitespace(s.text).toLowerCase() === normalised);
    added.push({ id: nextId("EV-" + subjectId), subjectId, kind: "job-posting", title: normaliseWhitespace(posting.title), organisation: normaliseWhitespace(posting.organisation),
      url: posting.url, sourceDate: posting.publishedAt ? posting.publishedAt.slice(0, 10) : "", text, textHash, duplicateOf: original?.id ?? null, provenance: "collected",
      collection: { provider: posting.provider, board: posting.board, postingId: posting.id, retrievedAt: posting.retrievedAt, label: run.label || SOURCE_POLICIES[posting.provider].name },
      reviewed: false, addedBy: person.id, addedAt: nowIso() });
    already.add(posting.id); imported += 1;
  }
  set((s) => ({ evidenceSources: [...s.evidenceSources, ...added],
    toast: imported + " postings imported as sources, " + skipped + " skipped. Quote their requirements, then mark the extraction reviewed." }));
  return { ok: true, imported, skipped };
}
export function setSkillLexicon(subjectId: SubjectId, terms: string[]): SaveResult {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can set the terms for this course." };
  if (!Array.isArray(terms) || terms.length > 100 || terms.some((t) => typeof t !== "string" || !t.trim() || t.length > 60)) return { ok: false, error: "Use up to 100 terms of at most 60 characters each." };
  set((s) => ({ skillLexicon: { ...s.skillLexicon, [subjectId]: terms.map((t) => normaliseWhitespace(t)) }, toast: "Terms saved with the course." }));
  return { ok: true };
}
/** Propose one exact sentence per posting and term. The lecturer confirms; nothing is recorded by the scan itself. */
export function scanForRequirements(subjectId: SubjectId): SaveResult & { count?: number } {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can scan evidence for this course." };
  const terms = state.skillLexicon[subjectId] ?? [];
  if (!terms.length) return { ok: false, error: "Save the skills to look for first." };
  const proposals = proposeMentions(state.evidenceSources.filter((s) => s.subjectId === subjectId), terms, state.skillMentions.filter((m) => m.subjectId === subjectId));
  set({ scanProposals: proposals, toast: proposals.length ? proposals.length + " quotations proposed. Confirm the ones you accept." : "No new sentence names those terms." });
  return { ok: true, count: proposals.length };
}
export function confirmProposals(subjectId: SubjectId, proposals: MentionProposal[]): { added: number; skipped: number } {
  let added = 0, skipped = 0;
  const handled = new Set<string>();
  for (const proposal of proposals) {
    const source = state.evidenceSources.find((s) => s.id === proposal.sourceId);
    if (!source || source.subjectId !== subjectId) { skipped += 1; continue; }
    const result = addSkillMention(proposal.sourceId, { skill: proposal.skill, excerpt: proposal.excerpt, requirement: proposal.requirement });
    if (result.ok) added += 1; else skipped += 1;
    handled.add(proposal.sourceId + "\n" + proposal.term);
  }
  set((s) => ({ scanProposals: s.scanProposals.filter((p) => !handled.has(p.sourceId + "\n" + p.term)), toast: added + " quotations recorded, " + skipped + " skipped." }));
  return { added, skipped };
}
export function dismissProposal(sourceId: string, term: string) {
  set((s) => ({ scanProposals: s.scanProposals.filter((p) => !(p.sourceId === sourceId && p.term === term)) }));
}
export function clearProposals() { set({ scanProposals: [] }); }
/** Bulk review: the lecturer vouches that every listed posting's extraction is complete. Duplicates follow their original. */
export function setSourcesReviewed(subjectId: SubjectId, sourceIds: string[], reviewed: boolean): SaveResult {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can review evidence for this course." };
  const ids = new Set(sourceIds);
  set((s) => ({ evidenceSources: s.evidenceSources.map((x) => ids.has(x.id) && x.subjectId === subjectId && x.kind === "job-posting" && !x.duplicateOf ? { ...x, reviewed } : x),
    toast: reviewed ? "Extraction marked reviewed. These postings now count in the denominator." : "Postings marked unreviewed and excluded until reviewed." }));
  return { ok: true };
}
export function selectBrief(briefId: string | null) { set({ selectedBriefId: briefId }); }
/** A meeting brief is a snapshot of the evidence at one moment, with the lecturer's recommendation and every receipt. */
export function prepareEvidenceBrief(subjectId: SubjectId, input: { recommendation: BriefRecommendation; notes: string }): SaveResult & { briefId?: string } {
  if (!mayPlan(subjectId)) return { ok: false, error: "Only an assigned lecturer or coordinator can prepare a brief for this course." };
  if (!(input.recommendation in RECOMMENDATION_LABEL)) return { ok: false, error: "Choose a recommendation." };
  if (typeof input.notes !== "string" || input.notes.length > 20000) return { ok: false, error: "Keep the notes within 20,000 characters." };
  const subject = subjectById(subjectId)!, person = currentPerson()!, at = nowIso();
  const outcomes = state.clos.filter((c) => c.subjectId === subjectId);
  const markdown = meetingBriefMarkdown(subject, evidenceReportForCourse(subjectId), state.evidenceSources, state.skillMentions, outcomes, state.people, person,
    { recommendation: input.recommendation, notes: input.notes.trim() }, at);
  const brief: EvidenceBrief = { id: nextId("BR-" + subjectId), subjectId, createdBy: person.id, createdAt: at, recommendation: input.recommendation, notes: input.notes.trim(), markdown, recipients: [], sentAt: null };
  set((s) => ({ evidenceBriefs: [...s.evidenceBriefs, brief], selectedBriefId: brief.id, toast: "Brief prepared. Review it, then download or send it." }));
  return { ok: true, briefId: brief.id };
}
export function sendEvidenceBrief(briefId: string, recipientIds: string[]): SaveResult {
  const brief = state.evidenceBriefs.find((b) => b.id === briefId);
  if (!brief || !mayPlan(brief.subjectId)) return { ok: false, error: "You cannot send this brief." };
  if (brief.sentAt) return { ok: false, error: "This brief was already sent. Prepare a new one to send an update." };
  const person = currentPerson()!;
  const recipients = [...new Set(recipientIds)].filter((id) => id !== person.id);
  if (!recipients.length) return { ok: false, error: "Choose at least one colleague." };
  if (recipients.some((id) => !personById(id))) return { ok: false, error: "A recipient is unknown to this workspace." };
  const at = nowIso();
  set((s) => ({ evidenceBriefs: s.evidenceBriefs.map((b) => (b.id === briefId ? { ...b, recipients, sentAt: at } : b)) }));
  for (const toPersonId of recipients) notify({ toPersonId, kind: "evidence-brief", subjectId: brief.subjectId, briefId,
    agentFindings: "Evidence brief for " + brief.subjectId + " from " + person.name + ": " + RECOMMENDATION_LABEL[brief.recommendation] + "." });
  set({ toast: "Brief sent to " + recipients.map((id) => personById(id)?.name ?? id).join(", ") + "." });
  return { ok: true };
}
