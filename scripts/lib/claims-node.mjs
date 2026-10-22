// The claims register for the Node-side renderers (the deck, the brief, the
// poster): docs/claims.md read as rows, and a rendered page's numbers checked
// against it. A figure sits in an element marked data-claim="<id>", and every
// number in that element must appear in the id's row (its Figure or Shown as
// column). Any other number (a date, an id, a clause, a course code) sits in an
// element marked data-ref. A digit anywhere else is a stray, and a stray fails.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./theme-node.mjs";

/** The register's rows by id, as the text of their Figure and Shown as columns. */
export function claimsRegister() {
  const rows = new Map();
  for (const line of readFileSync(join(ROOT, "docs/claims.md"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\|\s*`([a-z0-9-]+)`\s*\|([^|]*)\|([^|]*)\|/);
    if (m && !rows.has(m[1])) rows.set(m[1], (m[2] + " " + m[3]).trim()); // the first row is the registered one; later tables only point to it
  }
  return rows;
}

/** The numbers in a text, whole: 10,095 and 32.2% are one number each. */
export const digitsIn = (s) => s.match(/\d+(?:[.,]\d+)*%?/g) ?? [];

/** Does this text show this number? Whole numbers are compared, so a 9 never passes on the strength of a 2026-10-09. */
export const hasNumber = (text, token) => digitsIn(text).includes(token);

/** Runs in the page (pass it to page.evaluate with a container selector): for each container, its strays, claims, refs and text. */
export function readFigures(selector) {
  return [...document.querySelectorAll(selector)].map((box, i) => {
    const out = { index: i, stray: [], claims: [], refs: [], text: "" };
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (el.closest("style, script, title")) continue;
      out.text += " " + n.textContent;
      if (/\d/.test(n.textContent) && !el.closest("[data-claim], [data-ref], .page-number, .slide-number")) out.stray.push(n.textContent.trim());
    }
    for (const el of box.querySelectorAll("[data-claim]")) out.claims.push({ id: el.dataset.claim, text: el.textContent.replace(/\s+/g, " ").trim() });
    for (const el of box.querySelectorAll("[data-ref]")) out.refs.push(el.textContent.replace(/\s+/g, " ").trim());
    for (const el of box.querySelectorAll("[alt], [aria-label]")) out.text += " " + (el.getAttribute("alt") ?? "") + " " + (el.getAttribute("aria-label") ?? "");
    return out;
  });
}

/** The problems in what readFigures returned: strays, unknown ids, numbers not in their row, en or em dashes. */
export function figureProblems(containers, register, label) {
  const problems = [];
  const dash = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
  for (const c of containers) {
    const where = label + " " + (c.index + 1);
    for (const t of c.stray) problems.push(where + ": a digit outside a data-claim or data-ref element: " + t);
    for (const claim of c.claims) {
      const row = register.get(claim.id);
      if (!row) { problems.push(where + ": data-claim " + claim.id + " is not a row of docs/claims.md."); continue; }
      for (const d of digitsIn(claim.text)) if (!hasNumber(row, d)) problems.push(where + ": " + d + " in " + claim.id + " is not in its claims row.");
    }
    if (dash.test(c.text)) problems.push(where + ": an en or em dash.");
  }
  return problems;
}
