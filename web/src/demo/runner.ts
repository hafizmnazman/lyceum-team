// The self-driving demo runner (spec Section 9), ported from v2 with two v3
// adaptations: the app scrolls inside the shell's main container rather than
// the window, and switching person goes through the real account menu. The
// cursor eases between target rects, pauses to read, then dispatches the REAL
// UI event so the genuine app responds. `wait` polls real store state.

import { getState } from "../app/store.ts";
import { SCRIPT, type DemoStep } from "./script.ts";
import type { WalkStop } from "./walk.ts";
import { PRE_ACT_MS, SWITCH_PAD_MS, TWEEN_MS, TYPE_CHAR_MS, isSampleTour, scaleMs } from "./timing.ts";

export interface DemoCtx {
  setCaption: (c: string) => void;
  setCursor: (x: number, y: number) => void;
  shouldAbort: () => boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let cur = { x: 0, y: 0 };

/** The scrolling element: the shell's main column when present (signed in),
 *  else the document itself (login, public index). */
function scroller(): HTMLElement | null {
  return document.querySelector('[data-demo-id="main-scroll"]') as HTMLElement | null;
}
function scrollTopOf(): number {
  const s = scroller();
  return s ? s.scrollTop : window.scrollY;
}

async function moveTo(x: number, y: number, ctx: DemoCtx, dur = scaleMs(TWEEN_MS)): Promise<void> {
  const start = { ...cur };
  const t0 = performance.now();
  return new Promise<void>((resolve) => {
    function frame(now: number) {
      const p = Math.min(1, (now - t0) / dur);
      const e = easeInOut(p);
      cur = { x: start.x + (x - start.x) * e, y: start.y + (y - start.y) * e };
      ctx.setCursor(cur.x, cur.y);
      if (p < 1 && !ctx.shouldAbort()) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function sel(demoId: string): string {
  return demoId.endsWith("*") ? `[data-demo-id^="${demoId.slice(0, -1)}"]` : `[data-demo-id="${demoId}"]`;
}

async function waitForSelector(selector: string, timeout = 12000): Promise<HTMLElement | null> {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) return el;
    await sleep(90);
  }
  return null;
}

/** Wait for a smooth scroll to actually finish, so a rect measured afterwards
 *  is correct. Polls the container's scroll position until it stops moving. */
async function waitScrollSettle(timeout = 1600): Promise<void> {
  let last = scrollTopOf();
  let stable = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    await sleep(60);
    const y = scrollTopOf();
    if (Math.abs(y - last) < 1) {
      stable += 1;
      if (stable >= 2) return;
    } else {
      stable = 0;
    }
    last = y;
  }
}

/** Scroll a target to the middle of the viewport if it is off-screen or
 *  hugging an edge, then wait for the scroll to settle. */
async function ensureVisible(el: HTMLElement): Promise<void> {
  const r = el.getBoundingClientRect();
  const margin = 90;
  if (r.top < margin || r.bottom > window.innerHeight - margin) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    await waitScrollSettle();
  }
}

async function moveToEl(el: HTMLElement, ctx: DemoCtx): Promise<void> {
  await ensureVisible(el);
  const r = el.getBoundingClientRect();
  await moveTo(r.left + r.width / 2, r.top + r.height / 2, ctx);
}

/** A quick re-glide onto the target's CURRENT position right before acting, in
 *  case a late re-render moved it after the main move. */
async function nudgeOnto(el: HTMLElement, ctx: DemoCtx): Promise<void> {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  if (Math.hypot(cx - cur.x, cy - cur.y) > 4) await moveTo(cx, cy, ctx, scaleMs(240));
}

async function applyScroll(scroll: string): Promise<void> {
  const s = scroller();
  if (scroll === "top") {
    if (s) s.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (scroll === "bottom") {
    if (s) s.scrollTo({ top: s.scrollHeight, behavior: "smooth" });
    else window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  } else {
    const el = document.querySelector(sel(scroll)) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  await waitScrollSettle();
}

/** Click the real interactive element; fall through to the first clickable
 *  descendant when the data-demo-id sits on a wrapper. */
function clickReal(el: HTMLElement) {
  const interactive = "summary, button, a, [role=button], input, textarea, select";
  const target = el.matches(interactive)
    ? el
    : ((el.querySelector(interactive) as HTMLElement | null) ?? el);
  target.click();
}

/** Set a controlled input/textarea value the way React notices. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Choose a select option the way React notices. */
function selectOption(el: HTMLElement, value: string) {
  const host = (el.matches("select") ? el : el.querySelector("select")) as HTMLSelectElement | null;
  if (!host) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(host, value);
  host.dispatchEvent(new Event("change", { bubbles: true }));
}

async function typeInto(el: HTMLElement, text: string, ctx: DemoCtx, clear = false) {
  const host = el.matches("input, textarea")
    ? el
    : ((el.querySelector("input, textarea") as HTMLElement | null) ?? el);
  const field = host as HTMLInputElement | HTMLTextAreaElement;
  field.focus();
  if (clear) setNativeValue(field, "");
  let value = clear ? "" : field.value;
  const charMs = scaleMs(TYPE_CHAR_MS);
  for (const ch of text) {
    if (ctx.shouldAbort()) return;
    value += ch;
    setNativeValue(field, value);
    await sleep(charMs);
  }
}

function predicate(key: string): boolean {
  const s = getState();
  if (key === "intake-staged") return s.pendingIntake !== null;
  if (key === "intake-filed") return Boolean(s.flashUpload);
  if (key === "intake-clear") return s.pendingIntake === null;
  if (key === "run-done") return s.sim?.phase === "done";
  if (key === "signal-done") return s.signalSim?.phase === "done";
  if (key === "drill-done") return s.drillStep >= 5;
  if (key === "revision-adopted") return s.curriculumDrafts.some((d) => d.subjectId === "CS310" && d.status === "adopted");
  if (key === "session-saved") return (s.teachingPlans.find((p) => p.subjectId === "CS310")?.sessions.filter((x) => !x.sample).length ?? 0) > 0;
  if (key === "items-generated") return s.testDrafts.some((t) => t.subjectId === "CS310" && t.items.length > 0);
  if (key === "collect-done") return s.collectRun?.status === "done" || s.collectRun?.status === "failed";
  if (key === "sources-imported") return s.evidenceSources.some((x) => x.subjectId === "CS310");
  if (key === "scan-proposals") return s.scanProposals.length > 0;
  if (key === "snapshot-frozen") return s.evidenceSnapshots.some((x) => x.subjectId === "CS310");
  if (key === "brief-ready") return s.evidenceBriefs.length > 0;
  if (key === "brief-read") return s.notifications.some((n) => n.kind === "evidence-brief" && n.read);
  if (key === "decision-recorded") return s.briefDecisions.some((d) => d.subjectId === "CS310" && d.byPersonId === "P-RAHMAN");
  return true;
}

async function waitFor(key: string, ctx: DemoCtx, timeout = 90000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    if (ctx.shouldAbort()) return;
    if (predicate(key)) return;
    await sleep(120);
  }
}

/** Switch person through the real UI: the login rows when signed out, the
 *  account menu when signed in. */
async function switchPerson(personId: string, ctx: DemoCtx) {
  if (!getState().currentPersonId) {
    const el = await waitForSelector(sel(`login-${personId}`));
    if (!el) return;
    await moveToEl(el, ctx);
    await sleep(scaleMs(PRE_ACT_MS));
    await nudgeOnto(el, ctx);
    el.click();
    return;
  }
  const menu = await waitForSelector(sel("account-menu"));
  if (!menu) return;
  await moveToEl(menu, ctx);
  await sleep(scaleMs(SWITCH_PAD_MS));
  clickReal(menu);
  const row = await waitForSelector(sel(`switch-${personId}`), 4000);
  if (!row) return;
  await moveToEl(row, ctx);
  await sleep(scaleMs(SWITCH_PAD_MS));
  row.click();
}

async function execStep(step: DemoStep, ctx: DemoCtx) {
  if (step.scroll) await applyScroll(step.scroll);
  if (step.action === "hold") return;
  if (step.action === "wait") {
    await waitFor(step.value ?? "", ctx);
    return;
  }
  if (step.action === "switchUser") {
    await switchPerson(step.value ?? "", ctx);
    return;
  }
  if (step.action === "sampleIfFailed") {
    // Only when the live board could not be reached: choose the dated saved sample and fetch again.
    if (getState().collectRun?.status !== "failed") return;
    const provider = await waitForSelector(sel("collect-provider"));
    if (!provider) return;
    await moveToEl(provider, ctx);
    await sleep(scaleMs(PRE_ACT_MS));
    selectOption(provider, "sample");
    const fetchButton = await waitForSelector(sel("collect-run"));
    if (!fetchButton) return;
    await moveToEl(fetchButton, ctx);
    await sleep(scaleMs(PRE_ACT_MS));
    clickReal(fetchButton);
    await waitFor("collect-done", ctx);
    return;
  }
  const el = step.target ? await waitForSelector(sel(step.target)) : null;
  if (!el) return; // best-effort: skip a missing target rather than hang
  await moveToEl(el, ctx);
  await sleep(scaleMs(PRE_ACT_MS));
  if (step.action === "click") {
    await nudgeOnto(el, ctx);
    clickReal(el);
  } else if (step.action === "type") {
    await nudgeOnto(el, ctx);
    await typeInto(el, step.value ?? "", ctx, step.clear);
  } else if (step.action === "select") {
    await nudgeOnto(el, ctx);
    selectOption(el, step.value ?? "");
  }
}

/** The tour's steps; with ?demoSample the provider is the dated saved sample and the live board's fields are skipped. */
export function tourSteps(): DemoStep[] {
  if (!isSampleTour()) return SCRIPT;
  return SCRIPT.filter((s) => s.target !== "collect-board" && s.target !== "collect-query")
    .map((s) => (s.target === "collect-provider" && s.action === "select" ? { ...s, value: "sample" } : s));
}

// ---------- the guided walk (depth plan Section 9.1 item 2) ----------

/** What the walk's overlay does for the runner: show a stop with its element (null when the target is missing), and wait for
 *  the person's choice, which is the only thing that moves the walk on. */
export interface WalkCtx {
  show: (index: number, el: HTMLElement | null) => void;
  choice: () => Promise<"next" | "back" | "end">;
  shouldAbort: () => boolean;
}

/** Bring a stop's element into view inside the shell's scrolling column, above the walk's dock: centred in the room left when
 *  it fits, its top near the top when it is taller. The window itself never scrolls, so the header stays in place. */
function revealForWalk(el: HTMLElement) {
  const s = scroller();
  if (!s) { el.scrollIntoView({ block: "center" }); return; }
  const dock = (document.querySelector(".walk-dock") as HTMLElement | null)?.getBoundingClientRect().height ?? (window.innerWidth < 760 ? 260 : 140);
  const r = el.getBoundingClientRect(), box = s.getBoundingClientRect();
  const room = box.height - dock - 24;
  const offset = r.height > room ? 16 : (room - r.height) / 2;
  s.scrollTo({ top: Math.max(0, s.scrollTop + (r.top - box.top) - offset) });
  if (window.scrollY) window.scrollTo(0, 0);
}

/** Open a stop's route, wait for its target, open its disclosure when the stop asks, and bring it into view. */
export async function findStop(stop: WalkStop): Promise<HTMLElement | null> {
  if (window.location.hash !== stop.route) window.location.hash = stop.route;
  const el = await waitForSelector(sel(stop.target), 8000);
  if (!el) return null;
  if (stop.open) {
    const details = (el.matches("details") ? el : el.closest("details")) as HTMLDetailsElement | null;
    if (details && !details.open) details.open = true;
  }
  revealForWalk(el);
  await waitScrollSettle();
  return el;
}

/** The guided mode: one stop at a time, moved by Next, Back or Escape, never by a timer. */
export async function runWalk(stops: WalkStop[], ctx: WalkCtx): Promise<void> {
  let i = 0;
  while (i < stops.length) {
    if (ctx.shouldAbort()) return;
    ctx.show(i, await findStop(stops[i]));
    const choice = await ctx.choice();
    if (choice === "end" || ctx.shouldAbort()) return;
    i = choice === "next" ? i + 1 : Math.max(0, i - 1);
  }
}

export async function runDemo(ctx: DemoCtx): Promise<void> {
  cur = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  ctx.setCursor(cur.x, cur.y);
  let prevScreen = getState().screen;
  for (const step of tourSteps()) {
    if (ctx.shouldAbort()) return;
    ctx.setCaption(step.caption);
    const screen = getState().screen;
    if (screen !== prevScreen) {
      prevScreen = screen;
      if (scrollTopOf() > 2) await applyScroll("top");
    }
    await execStep(step, ctx);
    if (ctx.shouldAbort()) return;
    await sleep(scaleMs(step.settleMs));
  }
}
