// The router: Login and the public landing page render bare; everything else
// renders inside the Shell. Navigation syncs to the URL hash (#/screen, or
// #/course/<id>/<step> inside a course's loop) so refresh, back and deep links
// work like a real app.

import { useEffect, useRef } from "react";
import { navAllows, subjectsForPerson } from "./app/roles.ts";
import { stepDef } from "./app/loop.ts";
import { hashFor, parseRoute, type CourseRoute } from "./app/routes.ts";
import { currentPerson, getState, navigate, useStore } from "./app/store.ts";
import { Shell } from "./ui/shell/Shell.tsx";
import { SCREENS } from "./ui/screens/index.ts";
import { DemoOverlay } from "./demo/DemoOverlay.tsx";
import { LandingScreen } from "./ui/screens/Landing.tsx";

/** A course route is honoured only for a course this person may open in the workspace. */
function mayOpen(route: CourseRoute): boolean {
  const s = getState(), person = currentPerson();
  if (!person || !s.subjects.some((x) => x.id === route.subjectId)) return false;
  if (!navAllows(person, s.assignments, stepDef(route.step).screen)) return false;
  return person.orgRole !== "academic" || subjectsForPerson(person.id, s.assignments).includes(route.subjectId);
}

export default function App() {
  const state = useStore();
  const wanted = hashFor(state);

  // Keep the hash in step with the screen and the loop step (deep links,
  // refresh, back button). On first load a valid deep link wins: the hash
  // effect below navigates to it and this effect then records the result,
  // instead of overwriting the link.
  const initialSync = useRef(true);
  useEffect(() => {
    if (initialSync.current) { initialSync.current = false; if (parseRoute(window.location.hash)) return; }
    if (window.location.hash !== wanted) window.history.pushState(null, "", wanted);
  }, [wanted]);

  useEffect(() => {
    function onHashChange() {
      const route = parseRoute(window.location.hash);
      if (!route) return;
      const s = getState();
      const person = currentPerson();
      if (!person) {
        if ("screen" in route && (route.screen === "index" || route.screen === "login")) navigate(route.screen);
        else window.history.replaceState(null, "", hashFor(s)); // a private link, signed out: keep the URL honest
        return;
      }
      if ("course" in route) {
        if (!mayOpen(route.course)) { window.history.replaceState(null, "", hashFor(s)); return; }
        if (window.location.hash !== hashFor(s)) navigate(stepDef(route.course.step).screen, route.course);
        return;
      }
      if (navAllows(person, s.assignments, route.screen) && route.screen !== s.screen) navigate(route.screen);
    }
    // On first load, honour a deep link.
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  const ScreenComponent = SCREENS[state.screen];

  // Signed out, only the two public surfaces render (bare, no shell). Signed
  // in, everything (the index included) renders inside the shell. The demo
  // overlay is a stable last sibling in every branch, so a login/shell swap
  // never unmounts a running demo.
  let content;
  if (!state.currentPersonId) {
    // Signed out, the index route is the public landing page. The Relevance
    // Index sandbox itself stays behind sign-in, labelled as illustrative.
    const Public = state.screen === "index" ? LandingScreen : SCREENS.login;
    content = <Public />;
  } else if (state.screen === "login") {
    const Login = SCREENS.login;
    content = <Login />;
  } else {
    content = (
      <Shell>
        <ScreenComponent />
      </Shell>
    );
  }

  return (
    <div style={{ height: "100%" }}>
      {content}
      <DemoOverlay />
    </div>
  );
}
