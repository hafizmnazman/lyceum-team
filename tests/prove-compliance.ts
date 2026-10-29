// The country's rules in the helpers' prompts, the AI use citation, and student identity kept from the model
// (shared/lib/compliance.ts, api/record.ts). Run: node --test tests/prove-compliance.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { aiCitation, aiUseStatement, promptContext, RULESETS, COUNTRIES, withoutStudentIdentity } from "../shared/lib/compliance.ts";
import { newContext, withContext } from "../api/record.ts";

test("each helper's prompt carries the country's framework and the grounding rules", () => {
  const my = promptContext("MY", "quill");
  assert.match(my, /Malaysia/); assert.match(my, /COPPA/); assert.match(my, /Personal Data Protection Act 2010/);
  assert.match(my, /personal data/); assert.match(my, /never invent/);
  assert.match(promptContext("MY", "scout"), /Prefer vacancies located in Malaysia/, "Scout looks in the lecturer's country");
  assert.doesNotMatch(my, /Prefer vacancies/, "only Scout searches");
  for (const general of [promptContext(null, "folio"), promptContext("OTHER", "folio")]) {
    assert.doesNotMatch(general, /Malaysia|COPPA|teaches in/, "no country, no country's rules");
    assert.match(general, /personal data/);
  }
  for (const c of COUNTRIES) if (c !== "OTHER") assert.ok(RULESETS[c].sources.length, c + " cites its sources");
});

test("the context is added to the system message, once, and a settings test is left alone", () => {
  const ctx = newContext("prism", "/api/agent/items", null, "CS310", "MY");
  const out = withContext([{ role: "system", content: "Draft items." }, { role: "user", content: "x" }], ctx);
  assert.equal(out.length, 2);
  assert.match(out[0].content as string, /^Draft items\.\n\nContext from Lyceum:/);
  assert.equal(withContext([{ role: "user", content: "x" }], ctx)[0].role, "system", "a prompt with no system message gets one");
  const test = [{ role: "user" as const, content: "ping" }];
  assert.deepEqual(withContext(test, newContext("settings", "/t", null, null, "MY")), test);
});

test("the AI use citation follows UTM 2.3.3, and an export lists each once", () => {
  const c = aiCitation({ provider: "openrouter", model: "nvidia/nemotron-3-ultra", baseUrl: "https://openrouter.ai/api/v1" }, new Date("2026-10-29T10:00:00Z"));
  assert.equal(c, "nvidia (2026). nemotron-3-ultra (nvidia/nemotron-3-ultra). Retrieved 29 October 2026 from https://openrouter.ai/api/v1, through Lyceum.");
  assert.deepEqual(aiUseStatement([undefined]), [], "no AI draft, no statement");
  assert.equal(aiUseStatement([c, c, undefined]).filter((l) => l.startsWith("- ")).length, 1);
});

test("a results sheet reaches the model with its marks but without who earned them", () => {
  const doc = { fileName: "marks.xlsx", pages: [{ index: 0, text: "Contact aina@utp.edu.my" }],
    tables: [{ name: "Sheet1", rows: [["Name", "Matric No", "Email", "CLO1", "CLO2"], ["Aina", "22001", "a@x.my", "78", "64"], ["Ben", "22002", "b@x.my", "55", "90"]] }] };
  const { doc: safe, removed } = withoutStudentIdentity(doc);
  assert.deepEqual(removed, ["Name", "Matric No", "Email"]);
  assert.deepEqual(safe.tables[0].rows, [["Student", "CLO1", "CLO2"], ["Student 1", "78", "64"], ["Student 2", "55", "90"]]);
  assert.equal(safe.pages[0].text, "Contact [email removed]");
  assert.equal(JSON.stringify(safe).includes("Aina"), false);
  const plain = { pages: [], tables: [{ name: "S", rows: [["CLO", "Mean"], ["CLO1", "0.7"]] }] };
  assert.deepEqual(withoutStudentIdentity(plain), { doc: plain, removed: [] }, "a sheet of aggregates is untouched");
});
