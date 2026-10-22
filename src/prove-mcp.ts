// Proofs for the local door (plan Section 11): every tool called through the
// real MCP protocol (the SDK's client over an in-memory transport) against the
// sample workspace, which is the tour's end state built from public/demo. The
// door answers from the export with receipts and says when it was exported,
// seven tools are read-only and annotated so (the course record and attainment among them), the pack tool writes one new file
// and never overwrites, nothing touches the workspace file, broken exports and
// unknown courses are refused, and every call is logged. Run with `node --test`.

import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import JSZip from "jszip";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createLyceumServer, READ_ONLY, WRITES_A_NEW_FILE } from "../mcp/server.ts";
import { loadWorkspace } from "../mcp/workspace.ts";
import { SAMPLE_PATH, buildSampleBackup } from "../mcp/sample.ts";
import { loopState } from "./app/loop.ts";
import { PEOPLE } from "./data/seed.ts";
import type { AppState } from "./app/store.ts";
import type { WorkspaceBackup } from "./lib/workspaceBackup.ts";

const READ_TOOLS = ["lyceum_courses", "lyceum_sources", "lyceum_evidence_report", "lyceum_course_outline", "lyceum_course_record", "lyceum_attainment", "lyceum_brief_draft"];

/** A client connected to the door over an in-memory transport, reading the workspace at `path`. */
async function door(path: string, log: string[] = []) {
  const server = createLyceumServer({ load: () => loadWorkspace(path), now: () => "2026-10-22T00:00:00.000Z", log: (line) => log.push(line) });
  const client = new Client({ name: "lyceum-proof", version: "1.0.0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args }) as { content: Array<{ type: string; text: string }>; isError?: boolean };
    return { text: result.content.map((c) => c.text).join("\n"), isError: Boolean(result.isError) };
  };
  return { client, call, close: () => client.close() };
}

function sampleCopy(): { dir: string; path: string; backup: WorkspaceBackup } {
  const dir = mkdtempSync(join(tmpdir(), "lyceum-door-"));
  const path = join(dir, "workspace.json");
  copyFileSync(SAMPLE_PATH, path);
  const loaded = loadWorkspace(path);
  assert.ok(loaded.ok, "the sample validates as a workspace backup");
  return { dir, path, backup: loaded.backup };
}

test("the sample workspace is the tour's end state, built from public/demo, current, and it validates", async () => {
  assert.equal(readFileSync(SAMPLE_PATH, "utf8").replace(/\r\n/g, "\n"), await buildSampleBackup(), "mcp/sample-workspace.json matches a fresh build; run node mcp/sample.ts if not");
  const { backup } = sampleCopy();
  const d = backup.data;
  assert.equal(backup.schemaVersion, 6);
  assert.ok(d.evidenceSources.filter((s) => s.subjectId === "CS310" && s.provenance === "collected").length >= 3, "postings from the saved sample of the Stripe board");
  assert.ok(d.briefDecisions.some((x) => x.byPersonId === "P-RAHMAN" && x.outcome === "adopt" && x.note.trim()), "the programme owner's decision with its reason");
  assert.ok(d.resultUploads.some((u) => u.subjectId === "CS310" && u.sourceFileName === "results.xlsx" && u.courseVersionId && u.sample === true), "the sample results, matched to a version and labelled a sample");
  assert.equal(loopState({ ...d, people: PEOPLE } as unknown as AppState, "CS310").closed, true, "the loop is closed for the term, as at the end of the tour");
});

test("the door offers eight tools: seven annotated read-only, the teaching pack as writing a new file", async () => {
  const { path } = sampleCopy();
  const { client, close } = await door(path);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [...READ_TOOLS, "lyceum_teaching_pack"].sort());
  for (const name of READ_TOOLS) assert.deepEqual(tools.find((t) => t.name === name)!.annotations, { ...READ_ONLY }, name + " is annotated read-only");
  const pack = tools.find((t) => t.name === "lyceum_teaching_pack")!;
  assert.equal(pack.annotations?.readOnlyHint, false); assert.equal(pack.annotations?.destructiveHint, false);
  assert.equal(pack.annotations?.openWorldHint, WRITES_A_NEW_FILE.openWorldHint);
  for (const t of tools) assert.ok(t.description && !new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]").test(t.description), t.name + " has a description and no dashes");
  await close();
});

test("each read tool answers from the export with its receipts and says when the workspace was exported", async () => {
  const { path, backup } = sampleCopy();
  const { call, close } = await door(path);
  const d = backup.data;
  const stamp = "From the Lyceum workspace exported at " + backup.exportedAt + ".";

  const courses = await call("lyceum_courses");
  assert.ok(!courses.isError && courses.text.startsWith(stamp), "stamped with the export time");
  assert.ok(courses.text.includes(loopState({ ...d, people: PEOPLE } as unknown as AppState, "CS310").summary), "the course's loop summary, as the ring shows it");

  const sources = await call("lyceum_sources", { course: "cs310" });
  const kept = d.evidenceSources.filter((s) => s.subjectId === "CS310");
  assert.equal(sources.text.split("\n").filter((l) => l.startsWith("- ")).length, kept.length, "one line per kept source; the code is matched without case");
  for (const s of kept) assert.ok(sources.text.includes(s.textHash) && (!s.url || sources.text.includes(s.url)), s.title + " with its link and fingerprint");
  const reviewed = await call("lyceum_sources", { course: "CS310", reviewedOnly: true });
  assert.equal(reviewed.text.split("\n").filter((l) => l.startsWith("- ")).length, kept.filter((s) => s.reviewed && !s.duplicateOf).length, "reviewed only: the denominator");

  const report = await call("lyceum_evidence_report", { course: "CS310" });
  const quotes = d.skillMentions.filter((m) => m.subjectId === "CS310");
  assert.ok(quotes.length > 0);
  for (const m of quotes.slice(0, 5)) {
    assert.ok(report.text.includes(m.excerpt), "the quotation, word for word: " + m.excerpt);
    assert.ok(d.evidenceSources.find((s) => s.id === m.sourceId)!.text.includes(m.excerpt), "and it is in its source");
  }
  assert.match(report.text, /\d+ of \d+/, "a share with its denominator");
  assert.ok(report.text.includes("postings collected on request from") && !report.text.includes("Nothing was collected from the web"), "the scope names where the postings came from");

  const outline = await call("lyceum_course_outline", { course: "CS310" });
  assert.ok(outline.text.includes("with dashboards that answer a stakeholder's question"), "the adopted version's outcome");
  assert.ok(outline.text.includes("Dashboards and data storytelling"), "and its new topic");

  const brief = await call("lyceum_brief_draft", { course: "CS310", recommendation: "refresh", notes: "Add a dashboard lab." });
  assert.ok(brief.text.includes("DRAFT.") && brief.text.includes("decides nothing"), "a draft says it is a draft");
  assert.ok(brief.text.includes("## Decision requested") && brief.text.includes("Small refresh within existing hours"), "with the recommendation");
  assert.ok(brief.text.includes("Prepared by the local door, as a draft for a lecturer to review"), "and never claims a person prepared it");
  assert.equal(readFileSync(path, "utf8"), readFileSync(SAMPLE_PATH, "utf8"), "drafting saves nothing: the export is unchanged");
  await close();
});

test("the course record and attainment answer from the export: the course file's information and manifest, and the OBE report as the records stand", async () => {
  const { path, backup } = sampleCopy();
  const { call, close } = await door(path);
  const record = await call("lyceum_course_record", { course: "cs310" });
  assert.ok(!record.isError && record.text.startsWith("From the Lyceum workspace exported at " + backup.exportedAt + "."), "stamped with the export time");
  assert.ok(record.text.includes("# Course file manifest: CS310") && record.text.includes("the quiz items | sample |") && record.text.includes("The OBE course report with its CQI note | not included |"),
    "the manifest as the app's zip carries it: the sample quiz's items, no report saved in the sample");
  assert.ok(record.text.includes("-sample-teaching-pack.pptx") && record.text.includes("A demo course at UTP"), "the packs named as the zip names them, and the honesty line");
  const now = await call("lyceum_attainment", { course: "CS310" });
  assert.ok(!now.isError && now.text.includes("The report as the records stand; nobody has saved it.") && now.text.includes("Not saved"), "an unsaved report says so");
  assert.ok(now.text.includes("| CLO2 | 38 of 38 | 65.6 | 29, 76% | met | not open |"), "CLO2 as the app shows it: 29 of 38 at 55 or above, 76%, KPI met, the survey not open");
  assert.ok(now.text.includes("(3 without a mark)") && now.text.includes("sampling noise from non-response only; nothing else"), "CLO3's interval, with its label");
  assert.ok(now.text.includes("No learning gain is claimed") && now.text.includes("never averaged"), "the sentence that stays, and the two constructs kept apart");
  const prior = await call("lyceum_attainment", { course: "CS310", term: "2025/2026 semester 2" });
  assert.ok(!prior.isError && prior.text.includes("A seeded example is never counted"), "last term's seeded file is never counted");
  assert.equal(readFileSync(path, "utf8"), readFileSync(SAMPLE_PATH, "utf8"), "and nothing is written to the export");
  await close();
});

test("the pack tool writes one new PPTX, the same deck the app builds, and refuses to overwrite or to write anywhere vague", async () => {
  const { dir, path, backup } = sampleCopy();
  const { call, close } = await door(path);
  const session = backup.data.teachingPlans.find((p) => p.subjectId === "CS310")!.sessions.find((s) => !s.sample)!; // the tour's own session, beside the sample ones
  const out = join(dir, "pack.pptx");
  const written = await call("lyceum_teaching_pack", { course: "CS310", session: String(session.week), path: out });
  assert.ok(!written.isError, written.text);
  assert.ok(existsSync(out));
  const zip = await JSZip.loadAsync(readFileSync(out));
  const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  assert.ok(written.text.includes(slides.length + " editable slides"), "the reply states the slides written");
  assert.match(await zip.file("ppt/slides/slide4.xml")!.async("string"), /build a dashboard from the sample dataset/, "the session's activity is on its slide");
  const again = await call("lyceum_teaching_pack", { course: "CS310", session: session.id, path: out });
  assert.ok(again.isError && again.text.includes("never overwrites"), "a second call to the same path is refused");
  for (const bad of ["pack.pptx", join(dir, "pack.txt"), join(dir, "missing-folder", "pack.pptx")]) {
    const r = await call("lyceum_teaching_pack", { course: "CS310", session: session.id, path: bad });
    assert.ok(r.isError, "refused: " + bad);
  }
  const unknown = await call("lyceum_teaching_pack", { course: "CS310", session: "99", path: join(dir, "other.pptx") });
  assert.ok(unknown.isError && unknown.text.includes("week " + session.week), "an unknown session lists the real ones");
  await close();
});

test("no tool changes the workspace; unknown courses and broken exports are refused; every call is logged", async () => {
  const { dir, path } = sampleCopy();
  const before = readFileSync(path, "utf8"), modified = statSync(path).mtimeMs;
  const log: string[] = [];
  const { call, close } = await door(path, log);
  for (const name of READ_TOOLS) await call(name, name === "lyceum_courses" ? {} : { course: "CS310" });
  await call("lyceum_teaching_pack", { course: "CS310", session: "6", path: join(dir, "logged.pptx") });
  assert.equal(readFileSync(path, "utf8"), before, "the workspace file is unchanged");
  assert.equal(statSync(path).mtimeMs, modified, "and untouched");
  const unknown = await call("lyceum_evidence_report", { course: "XX999" });
  assert.ok(unknown.isError && unknown.text.includes("CS310"), "an unknown course is refused and the known ones are listed");
  assert.equal(log.length, READ_TOOLS.length + 2, "one log line per call");
  const lines = log.map((l) => JSON.parse(l) as { tool: string; host: string; records: string[]; ok: boolean });
  assert.ok(lines.every((l) => l.host === "lyceum-proof 1.0.0"), "the host that called is named");
  assert.ok(lines.find((l) => l.tool === "lyceum_evidence_report")!.records.length > 0, "with the record ids the call touched");
  assert.equal(lines.at(-1)!.ok, false);
  await close();

  const tampered = JSON.parse(before);
  tampered.data.skillMentions[0].excerpt = "a sentence no posting contains";
  const broken = join(dir, "broken.json");
  writeFileSync(broken, JSON.stringify(tampered));
  const bad = await door(broken);
  const refused = await bad.call("lyceum_courses");
  assert.ok(refused.isError && refused.text.includes("did not validate"), "a tampered export is refused, as the app's restore would refuse it");
  await bad.close();
  const none = await door(join(dir, "nothing-here.json"));
  assert.ok((await none.call("lyceum_courses")).isError, "a missing export is reported");
  await none.close();
});
