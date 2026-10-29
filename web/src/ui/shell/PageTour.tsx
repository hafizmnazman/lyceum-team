// The first-visit tour of each page (agreed 29 October 2026): on a signed-in account's first visit to Home, Courses or a
// course step, the page around one element at a time is dimmed and blurred while a card beside it says what it is for;
// Back, Next, Skip, the arrow keys and Esc move it. A page's tour shows once per person in this browser and replays from
// its guide ("Show me around"). The parts every course step shares are shown on the first step visited only. Demo
// personas never get it unasked, so the scripted tour, the judge's walk and the smokes run as before.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { stepDef, type CourseStep } from "../../app/loop.ts";
import { effectiveStep } from "../../app/routes.ts";
import { currentPerson, useStore } from "../../app/store.ts";
import { Button } from "../primitives/index.tsx";

interface Stop { target: string; title: string; body: string; shared?: boolean }

const WORK: Record<CourseStep, string> = {
  course: "Check the outcomes and topics read from your outline, and set the term this loop runs for. Every record you make this term carries it.",
  watch: "Run a research run: Scout searches job boards and the web for postings that match your course, and keeps each one with its link and date.",
  report: "Work through the five tabs in order: quote what employers ask for, review it, count it, map each skill to an outcome, then prepare the brief.",
  decide: "Read the brief and record a decision, adopt, retain, defer or return, with a reason. A second person confirms it.",
  update: "Change the outline the way the decision asked. Quill can suggest changes; you check the revision against the hours and adopt it as a new version.",
  teach: "Plan the term's sessions. Prism drafts quiz items and suggests changes to your slides, and you review every one before it reaches students.",
  learn: "File this term's results. Lens shows, for each outcome, how many students reached the pass mark, and claims nothing more.",
  history: "Every version of this course and every decision on it, in the order they happened.",
};

function stopsFor(page: string, step: CourseStep | null): Stop[] {
  if (page === "inbox") return [
    { target: '[data-demo-id="journey-card"]', title: "Your next step", body: "This card always shows the one thing to do next on your current course, and when that step counts as done. Continue takes you straight there." },
    { target: '[data-tour="home-waiting"]', title: "Waiting on you", body: "Briefs that need your decision and messages from colleagues land here, with what happened lately on your course." },
    { target: '[data-demo-id^="subject-"]', title: "Your courses", body: "Each course and how far its loop has got this term. Inside a course, its seven steps open here, so any step is one click away." },
    { target: '[data-demo-id="home-courses"]', title: "All your courses", body: "Every course you teach or coordinate, with its progress and the step that is next." },
  ];
  if (page === "courses") return [
    { target: '[data-demo-id="course-search"]', title: "Find a course", body: "Search by code or title, or filter by year and how far its preparation has got." },
    { target: '[data-demo-id="course-create-open"]', title: "Add a course", body: "Create a workspace for another course you teach. You can import its outline the same way as at sign-up." },
    { target: '[data-demo-id^="course-open-"]', title: "Open a course", body: "Each card shows the course's loop this term and its next preparation step." },
  ];
  if (!step) return [];
  const def = stepDef(step);
  return [
    { target: '[data-demo-id="loop-rail"]', shared: true, title: "The course loop", body: "Every course runs these steps each term. A filled step is done this term, the dashed one is next. Click any step to go to it." },
    { target: '[data-tour="step-head"]', title: def.number ? "Step " + def.number + ": " + def.label : def.label, body: def.question + (def.helper && !def.helper.startsWith("People") ? " " + def.helper + " helps here; you decide what is kept." : "") },
    { target: '[data-tour="step-work"]', title: "What you do here", body: WORK[step] },
    { target: '[data-demo-id="step-rail"]', shared: true, title: "Where you stand", body: "Whether this step is done, the rule that completes it, and the button to the next step." },
    { target: '[data-tour="step-guide"]', shared: true, title: "Help any time", body: "Opens the full guide to the step you are on, and shows you around again." },
  ];
}

const SEEN = (personId: string) => "lyceum-tours-seen:" + personId;
function seen(personId: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN(personId)) ?? "[]") as string[]); } catch { return new Set(); }
}
function markSeen(personId: string, keys: string[]) {
  try { localStorage.setItem(SEEN(personId), JSON.stringify([...new Set([...seen(personId), ...keys])])); } catch { /* the tour shows again next time */ }
}

/** Forget which pages this person has toured, so each one shows its tour again on the next visit (the Guide's button). */
export function resetPageTours(personId: string) {
  try { localStorage.removeItem(SEEN(personId)); } catch { /* nothing was kept */ }
}

/** Replay the tour of the page in view: the guides' "Show me around" calls this. */
export function showPageTour() {
  window.dispatchEvent(new Event("lyceum:page-tour"));
}

const PAD = 8, CARD_W = 340;

export function PageTour() {
  const state = useStore();
  const person = currentPerson();
  const step = effectiveStep(state);
  const page = step && state.selectedSubjectId ? "step:" + step : state.screen;
  const [stops, setStops] = useState<Array<Stop & { el: HTMLElement }> | null>(null);
  const [at, setAt] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const start = useCallback((replay: boolean) => {
    if (!person) return;
    const done = seen(person.id);
    const all = stopsFor(state.screen, step && state.selectedSubjectId ? step : null)
      .filter((s) => replay || !s.shared || !done.has("step:shared"))
      .flatMap((s) => { const el = document.querySelector<HTMLElement>(s.target); return el && el.getClientRects().length ? [{ ...s, el }] : []; });
    if (all.length) { setAt(0); setStops(all); }
  }, [person, state.screen, step, state.selectedSubjectId]);

  const finish = useCallback(() => {
    if (person && stops) markSeen(person.id, [page, ...(stops.some((s) => s.shared) ? ["step:shared"] : [])]);
    setStops(null);
  }, [person, stops, page]);

  // A signed-in account's first visit to a page: start once the page has drawn, unless another walk is on screen.
  useEffect(() => {
    setStops(null);
    if (!person?.account || seen(person.id).has(page)) return;
    const t = setTimeout(() => { if (!document.querySelector('[data-demo-id="walk-card"]')) start(false); }, 700);
    return () => clearTimeout(t);
  }, [page, person?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const replay = () => start(true);
    window.addEventListener("lyceum:page-tour", replay);
    return () => window.removeEventListener("lyceum:page-tour", replay);
  }, [start]);

  // The highlight follows its element: brought into view, then kept on it through scrolling and resizing.
  const el = stops?.[at]?.el ?? null;
  useLayoutEffect(() => {
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: el.offsetHeight > window.innerHeight * 0.6 ? "start" : "center", behavior: "instant" as ScrollBehavior });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [el]);

  const open = Boolean(stops);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setAt((i) => { if (i + 1 >= (stops?.length ?? 0)) { finish(); return i; } return i + 1; });
      else if (e.key === "ArrowLeft") setAt((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stops, finish]);
  useEffect(() => { if (open) nextRef.current?.focus({ preventScroll: true }); }, [open, at]);

  if (!stops || !rect) return null;
  const stop = stops[at], last = at === stops.length - 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  const hole = { x: Math.max(0, rect.left - PAD), y: Math.max(0, rect.top - PAD), w: Math.min(vw, rect.width + PAD * 2), h: Math.min(vh, rect.height + PAD * 2) };
  // The card goes beside the element where there is room (below, above, then right or left), else docks at the bottom.
  const phone = vw < 640;
  const below = vh - (hole.y + hole.h), above = hole.y;
  const left = Math.min(Math.max(16, hole.x), vw - CARD_W - 16);
  const place: React.CSSProperties = phone ? { left: 16, right: 16, bottom: 16 }
    : below > 230 ? { left, top: hole.y + hole.h + 12, width: CARD_W }
    : above > 230 ? { left, bottom: vh - hole.y + 12, width: CARD_W }
    : vw - (hole.x + hole.w) > CARD_W + 32 ? { left: hole.x + hole.w + 16, top: Math.max(16, Math.min(hole.y, vh - 260)), width: CARD_W }
    : hole.x > CARD_W + 32 ? { left: hole.x - CARD_W - 16, top: Math.max(16, Math.min(hole.y, vh - 260)), width: CARD_W }
    : { right: 16, bottom: 16, width: CARD_W };
  // One layer over the page with the element cut out (an even-odd path), dimmed and blurred around it.
  const cut = `path(evenodd, "M0 0H${vw}V${vh}H0Z M${hole.x + 12} ${hole.y}H${hole.x + hole.w - 12}Q${hole.x + hole.w} ${hole.y} ${hole.x + hole.w} ${hole.y + 12}V${hole.y + hole.h - 12}Q${hole.x + hole.w} ${hole.y + hole.h} ${hole.x + hole.w - 12} ${hole.y + hole.h}H${hole.x + 12}Q${hole.x} ${hole.y + hole.h} ${hole.x} ${hole.y + hole.h - 12}V${hole.y + 12}Q${hole.x} ${hole.y} ${hole.x + 12} ${hole.y}Z")`;
  return <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-labelledby="page-tour-title" data-demo-id="page-tour">
    <div className="absolute inset-0 bg-(--scrim) backdrop-blur-[3px]" style={{ clipPath: cut }} onClick={finish} aria-hidden />
    <div className="pointer-events-none absolute rounded-xl outline-[3px] outline-lime transition-[left,top,width,height] duration-300 ease-out"
      style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} aria-hidden />
    <section className="absolute grid gap-3 rounded-[var(--radius-card)] border-2 border-forest bg-white p-5 shadow-[0_6px_0_var(--forest)] animate-[popIn_260ms_var(--ease-out)_both]" style={place} key={at}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[12px] tracking-[0.08em] text-emerald-text uppercase">{at + 1} of {stops.length}</span>
        <button type="button" onClick={finish} aria-label="Skip the tour" className="-mt-1 -mr-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-3 hover:bg-tint-1 hover:text-ink"><X size={16} /></button>
      </div>
      <h2 id="page-tour-title" className="m-0 text-[19px] leading-tight">{stop.title}</h2>
      <p className="m-0 text-[15px] leading-[1.5] text-ink-2">{stop.body}</p>
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button variant="quiet" onClick={finish}>Skip</Button>
        <div className="flex gap-2">
          {at > 0 ? <Button onClick={() => setAt(at - 1)} aria-label="Back"><ArrowLeft size={15} /></Button> : null}
          <Button ref={nextRef} variant="primary" onClick={() => (last ? finish() : setAt(at + 1))}>{last ? "Got it" : <>Next <ArrowRight size={15} /></>}</Button>
        </div>
      </div>
    </section>
  </div>;
}
