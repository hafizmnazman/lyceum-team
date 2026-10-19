// Signal reveal proof (demo spec Section 5a, Section 8). The staged reveal that
// mirrors the acceptance reveal in sim.ts. Checks it is deterministic and
// identical every run, progresses reading -> extracting -> mapping -> done, and
// lands on CS220 / CLO4 with the widest gap, 0.62, matching the Signal fixture.
//
// Run with:  node src/prove-signal.ts

import {
  initSignalSim,
  stepSignal,
  SIGNAL_TICK_MS,
  SIGNAL_TOTAL_TICKS,
  SIGNAL_SOURCES,
  SIGNAL_SKILLS,
  SIGNAL_TOP,
} from "./app/signalSim.ts";

let passed = 0;
let failed = 0;
function check(ok: boolean, msg: string): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (ok) passed += 1;
  else failed += 1;
}

console.log("LYCEUM v2 SIGNAL REVEAL PROOF  (staged, fixture mode)");
console.log("====================================================");

/** Drive the reveal to completion, collecting the phase and caption per tick. */
function runReveal() {
  let st = initSignalSim();
  const phases: string[] = [st.phase];
  const captions: string[] = [st.caption];
  let ticks = 0;
  while (st.phase !== "done" && ticks < 1000) {
    st = stepSignal(st);
    ticks += 1;
    phases.push(st.phase);
    captions.push(st.caption);
  }
  return { st, ticks, phases, captions };
}

const r1 = runReveal();
const r2 = runReveal();

check(initSignalSim().phase === "reading", "starts in the reading phase");
check(r1.st.phase === "done", "ends in the done phase");
check(
  r1.ticks === SIGNAL_TOTAL_TICKS,
  `takes ${SIGNAL_TOTAL_TICKS} ticks (${((SIGNAL_TOTAL_TICKS * SIGNAL_TICK_MS) / 1000).toFixed(1)}s)`,
);

// The distinct phases, in first-seen order, must be exactly the four in sequence.
const distinct = r1.phases.filter((p, i) => i === 0 || p !== r1.phases[i - 1]);
check(
  JSON.stringify(distinct) === JSON.stringify(["reading", "extracting", "mapping", "done"]),
  "phases progress reading -> extracting -> mapping -> done in order",
);

check(r1.st.sources.length === SIGNAL_SOURCES.length, "all demand sources are read by the end");
check(r1.st.skills.length === SIGNAL_SKILLS.length, "all rising skills are extracted");
check(r1.st.skills[0] === "Machine learning", "machine learning ranks at the top of the extracted skills");
check(r1.st.clatched === true, "the CS220 / CLO4 gap latches at the end");
check(
  SIGNAL_TOP.subjectId === "CS220" && SIGNAL_TOP.cloId === "CLO4",
  "the widest gap is CS220 / CLO4 (matches the Signal fixture)",
);
check(SIGNAL_TOP.gap.toFixed(2) === "0.62", `the resolved gap is 0.62 (${SIGNAL_TOP.gap.toFixed(2)})`);
check(r1.st.gapDisplayed.toFixed(2) === "0.62", "the reveal settles on gap 0.62");
check(
  JSON.stringify(r1.phases) === JSON.stringify(r2.phases) &&
    JSON.stringify(r1.captions) === JSON.stringify(r2.captions),
  "two runs are identical (seeded / deterministic)",
);

console.log("");
console.log(`${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
