// Backtest proof (spec Section 5 closed loop, Section 12). Predict a past
// cohort's recorded outcome from its before-ratings alone, using the unchanged
// spine, then compare to the held-out actual. Reproduces v1's audited numbers:
// MAE 0.009, 7 of 7 within 0.05.
//
// Run with:  node src/prove-backtest.ts

import { runBacktest } from "./lib/backtest.ts";
import { HISTORICAL_BACKTEST } from "./data/historical-backtest.ts";
import { ITEMS } from "./data/items.ts";
import { CLO_NAMES } from "./data/seed.ts";

const f3 = (x: number) => x.toFixed(3);
let passed = 0;
let failed = 0;
function check(ok: boolean, msg: string): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (ok) passed += 1;
  else failed += 1;
}

console.log("LYCEUM v2 BACKTEST PROOF  (closed loop, historical)");
console.log("===================================================");

const r = runBacktest(HISTORICAL_BACKTEST, ITEMS);

console.log("\nPredicted vs recorded mastery per outcome");
console.log("CLO   outcome                       predicted   actual  residual");
for (const p of r.points) {
  console.log(
    `${p.cloId}  ${(CLO_NAMES[p.cloId] ?? "").padEnd(28)}  ${f3(p.predicted)}   ${f3(p.actual)}  ${(p.residual >= 0 ? "+" : "") + f3(p.residual)}`,
  );
}
console.log(`\noverall predicted ${f3(r.overallPredicted)}  vs actual ${f3(r.overallActual)}`);
console.log(`MAE ${f3(r.mae)}   max abs residual ${f3(r.maxAbsResidual)}   within ${r.tolerance}: ${r.withinTolerance}/${r.points.length}`);

console.log("");
check(r.mae < 0.05, `MAE ${f3(r.mae)} < 0.05`);
check(Number(f3(r.mae)) === 0.009, "MAE rounds to 0.009");
check(r.withinTolerance === 7 && r.points.length === 7, "7 of 7 outcomes within 0.05");
check(r.overallActual < 0.58, "historical cohort is genuinely below-average (real absolute level recovered)");

console.log("");
console.log(`${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
