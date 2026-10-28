// The app shell (plan Section 5.2): a forest header band with the wordmark,
// search, notifications and the account menu; a white sidebar with Home,
// Courses, your courses, Explore and the labelled sandbox, folded away until
// opened (the course's loop runs as a path across the top of each step, StepFrame);
// and the main column on mint. The header is the one forest element a working
// screen carries (the restraint rule, Section 6.4).

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, ChevronDown, LogOut, Menu, RotateCcw, Search, ShieldCheck } from "lucide-react";
import type { Screen } from "../../app/roles.ts";
import { hatsOn, navFor, subjectsForPerson } from "../../app/roles.ts";
import { stepDef } from "../../app/loop.ts";
import { effectiveStep } from "../../app/routes.ts";
import {
  currentPerson,
  dismissToast,
  logout,
  navigate,
  openStep,
  resetWorkspace,
  switchUser,
  unreadFor,
  useStore,
} from "../../app/store.ts";
import { NAV_META, screenLabel } from "./nav.ts";
import { CommandPalette } from "./CommandPalette.tsx";
import { AgentPanel } from "./AgentPanel.tsx";
import { Mark } from "../mascots/mark.tsx";
import { Kbd } from "../primitives/index.tsx";
import { Tooltip } from "../primitives/Tooltip.tsx";
import { PrototypeNotice } from "../primitives/PrototypeNotice.tsx";
import { SectionHelp } from "../primitives/SectionHelp.tsx";

/** The first screens in the sidebar: where work starts. */
const MAIN: Screen[] = ["inbox", "courses", "programme", "new-subject", "assignments"];
/** Screens that explain the product rather than do the work. */
const EXPLORE: Screen[] = ["office", "evaluation", "guide", "settings"];
/** The earlier illustrative screens: synthetic data, kept behind sign-in and labelled. */
const SANDBOX: Screen[] = ["proposal", "acceptance", "approval", "trends", "backtest", "dataroom", "index"];
/** Where the prototype-data notice shows: every sandbox screen, the old approval chain included. */
const NOTICE_SCREENS: Screen[] = SANDBOX;

/** Move focus to the page heading, so a keyboard or screen-reader user lands on the new content. */
export function focusMainHeading() {
  const main = document.getElementById("main-content");
  const heading = main?.querySelector<HTMLElement>("h1");
  (heading ?? main)?.focus({ preventScroll: true });
}

export function Shell(props: { children: ReactNode }) {
  const state = useStore();
  const person = currentPerson();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const navTrigger = useRef<HTMLButtonElement>(null);

  // Ctrl+K opens the palette from anywhere; Escape closes a menu and returns focus to its trigger.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setMenuOpen((open) => { if (open) menuTrigger.current?.focus(); return false; });
        setNavOpen((open) => { if (open) navTrigger.current?.focus(); return false; });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click-away for the account menu.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // Toast auto-dismiss.
  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dismissToast(), 4000);
    return () => clearTimeout(t);
  }, [state.toast]);

  useEffect(() => {
    setNavOpen(false);
    mainRef.current?.scrollTo(0, 0);
    focusMainHeading();
  }, [state.screen]);
  // Switching course scrolls to the top but leaves focus where it is, so a
  // course selector keeps focus while its value changes.
  useEffect(() => { mainRef.current?.scrollTo(0, 0); }, [state.selectedSubjectId]);

  const step = effectiveStep(state);
  const crumb = step && state.selectedSubjectId ? state.selectedSubjectId + " · " + stepDef(step).label : screenLabel(state.screen);
  useEffect(() => { document.title = crumb + " · Lyceum"; }, [crumb]);

  if (!person) return <>{props.children}</>;

  const nav = navFor(person, state.assignments);
  const mySubjects = subjectsForPerson(person.id, state.assignments);
  const unread = unreadFor(person.id).length;
  const railCourse = nav.includes("studio") ? (state.selectedSubjectId && mySubjects.includes(state.selectedSubjectId) ? state.selectedSubjectId : mySubjects[0] ?? null) : null;

  const roleLine =
    person.orgRole === "management"
      ? "Management"
      : person.orgRole === "department"
        ? "Department"
        : "Academic";

  return (
    <div className={"app-shell" + (navOpen ? " nav-open" : "")}>
      <a className="skip-link" href="#main-content">Skip to main content</a>

      {/* ---------- header: the one forest band ---------- */}
      <header className="app-header on-forest">
        <Tooltip content={navOpen ? "Close the menu" : "Open the menu"}><button ref={navTrigger} type="button" className="header-icon-btn nav-toggle" aria-label="Toggle navigation" aria-expanded={navOpen} aria-controls="primary-sidebar" onClick={() => setNavOpen((open) => !open)}><Menu size={20} /></button></Tooltip>
        <button type="button" className="wordmark" onClick={() => navigate("inbox")} aria-label="Lyceum, go to Home"><Mark size={30} tone="white" leaf />Lyceum</button>
        <span className="header-crumb" aria-hidden>{crumb}</span>
        <div className="header-spacer" />

        <button type="button" className="header-search search-trigger" onClick={() => setPaletteOpen(true)} aria-label="Search or jump to, Ctrl+K">
          <Search size={16} />
          <span>Search or jump to</span>
          <Kbd>Ctrl K</Kbd>
        </button>

        <Tooltip content={unread ? unread + " unread, open Home to read them" : "No unread notifications"}><button type="button" data-demo-id="topbar-bell" className="header-icon-btn" onClick={() => navigate("inbox")} aria-label={`Notifications, ${unread} unread`}>
          <Bell size={18} />
          {unread > 0 ? <span className="header-badge num">{unread}</span> : null}
        </button></Tooltip>

        {/* account menu */}
        <div ref={menuRef} className="account">
          <button
            ref={menuTrigger}
            type="button"
            className="account-trigger"
            aria-label={"Account: " + person.name}
            aria-expanded={menuOpen}
            aria-controls="account-options"
            data-demo-id="account-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Avatar name={person.name} />
            <span className="account-name">{person.name}</span>
            {person.verified ? <ShieldCheck size={14} aria-label="Verified" /> : null}
            <ChevronDown size={14} />
          </button>
          {menuOpen ? (
            <div id="account-options" className="menu-popover on-light fade-up">
              <div className="menu-person">
                <div className="menu-person-name">{person.name}</div>
                <div className="muted">{roleLine}{person.email ? ` · ${person.email}` : ""}</div>
                <div className={person.verified ? "menu-person-flag" : "menu-person-flag is-warn"}>
                  {person.verified
                    ? "Marked verified in the demo data; no institutional verification yet"
                    : "Unverified: edits carry an unverified tag"}
                </div>
              </div>
              <div className="menu-label">Switch person</div>
              {state.people.map((p) => (
                <button key={p.id} type="button" data-demo-id={`switch-${p.id}`} className="menu-item" onClick={() => { switchUser(p.id); setMenuOpen(false); }}>
                  <Avatar name={p.name} />
                  <span className="menu-item-label">{p.name}</span>
                  {p.id === person.id ? <Check size={14} aria-label="Current person" /> : null}
                </button>
              ))}
              <div className="menu-divider">
                <button type="button" className="menu-item" onClick={() => {
                  if (window.confirm("Reset this browser's workspace? This removes saved teaching plans, drafts and uploads. Export any plan you want to keep first.")) resetWorkspace();
                  setMenuOpen(false);
                }}>
                  <RotateCcw size={14} />
                  <span className="menu-item-label">Reset workspace</span>
                </button>
                <button type="button" className="menu-item" onClick={() => { logout(); setMenuOpen(false); }}>
                  <LogOut size={14} />
                  <span className="menu-item-label">Sign out</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div className="app-body">
        {/* ---------- sidebar ---------- */}
        <aside
          id="primary-sidebar"
          className="app-sidebar"
          onClick={(event) => { if ((event.target as HTMLElement).closest("button")) setNavOpen(false); }}
        >
          <nav aria-label="Main navigation" className="sidebar-nav">
            {MAIN.filter((s) => nav.includes(s)).map((s) => (
              <NavItem key={s} screen={s} active={state.screen === s} badge={s === "inbox" ? unread : 0} />
            ))}

            {railCourse && mySubjects.length > 0 ? (
              <>
                <div className="nav-group-label">Your courses</div>
                <div className="course-chips">
                  {mySubjects.map((sid) => {
                    const hats = hatsOn(person.id, sid, state.assignments);
                    const role = hats.includes("coordinator") && hats.includes("lecturer") ? "coordinator and lecturer" : hats.includes("coordinator") ? "coordinator" : "lecturer";
                    const title = state.subjects.find((x) => x.id === sid)?.title;
                    return (
                      <Tooltip key={sid} content={<><span className="tooltip-title">{sid}{title ? " " + title : ""}</span><span>You are {role}.</span></>}>
                      <button
                        type="button"
                        data-demo-id={`subject-${sid}`}
                        className="course-chip tabular"
                        aria-pressed={sid === railCourse}
                        aria-label={sid + ", you are " + role}
                        onClick={() => openStep(sid, "course")}
                      >
                        {sid}
                      </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </>
            ) : null}

            <div className="nav-group-label">Explore</div>
            {EXPLORE.filter((s) => s === "guide" || nav.includes(s)).map((s) => (
              <NavItem key={s} screen={s} active={state.screen === s} badge={0} />
            ))}
            {SANDBOX.some((s) => nav.includes(s)) ? (
              <details className="nav-fold" open={SANDBOX.includes(state.screen) || undefined}>
                <summary className="nav-group-label" data-demo-id="nav-sandbox">Sandbox <span className="nav-group-note">illustrative</span><ChevronDown size={16} className="disclosure-chevron" aria-hidden /></summary>
                {SANDBOX.filter((s) => nav.includes(s)).map((s) => (
                  <NavItem key={s} screen={s} active={state.screen === s} badge={0} />
                ))}
              </details>
            ) : null}
          </nav>

          <div className="sidebar-foot">Local prototype. Work is saved in this browser.</div>
        </aside>

        {/* ---------- main column ---------- */}
        <main ref={mainRef} id="main-content" tabIndex={-1} className="app-main" data-demo-id="main-scroll">
          {NOTICE_SCREENS.includes(state.screen) ? <PrototypeNotice /> : null}
          {state.persistenceStatus === "unavailable" ? <div role="alert" className="storage-warning">Browser storage is unavailable. Changes only last while this page is open. Export your teaching plan before closing.</div> : null}
          {/* The Guide page is the guide itself; its Institution entry is for the catalogue, not a pill above the page. */}
          {state.screen === "guide" ? null : <SectionHelp screen={state.screen} label={state.screen === "studio" && step ? stepDef(step).label : state.screen === "office" ? "this page" : undefined} />}
          {props.children}
        </main>
      </div>

      {/* ---------- overlays ---------- */}
      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} /> : null}
      <AgentPanel />
      {state.toast ? (
        <div className="toast fade-up" role="status" aria-live="polite">
          {state.toast}
        </div>
      ) : null}
    </div>
  );
}

function NavItem(props: { screen: Screen; active: boolean; badge: number }) {
  if (props.screen === "login") return null;
  const meta = NAV_META[props.screen];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      data-demo-id={`nav-${props.screen}`}
      className="nav-item"
      onClick={() => navigate(props.screen)}
      aria-current={props.active ? "page" : undefined}
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden />
      <span className="nav-item-label">{meta.label}</span>
      {props.badge > 0 ? <span className="nav-badge num" aria-label={props.badge + " unread"}>{props.badge}</span> : null}
    </button>
  );
}

function Avatar(props: { name: string }) {
  const initials = props.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return <span aria-hidden className="avatar">{initials}</span>;
}
