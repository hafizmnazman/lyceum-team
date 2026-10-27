// The local door (plan Section 11.4): a stdio MCP server, on the official
// TypeScript SDK, over a workspace backup exported from Lyceum and named by
// LYCEUM_WORKSPACE. Seven tools only read; the eighth writes one teaching pack to
// a path the user names. No tool confirms a quotation, adopts a revision,
// records a decision or sends a brief: those stay human actions in the
// workspace (Section 11.3). Every call is logged to stderr with the host, the
// tool and the record ids it touched. Remote access and OAuth are planned.
//
// Run: LYCEUM_WORKSPACE=/path/to/lyceum-workspace-backup.json node mcp/server.ts

import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { attainmentText, briefDraftText, courseOutlineText, courseRecordText, evidenceReportText, listCourses, listSources, loadWorkspace, writeTeachingPack, type Loaded, type ToolText } from "./workspace.ts";

export const SERVER_NAME = "lyceum";
export const SERVER_VERSION = "3.0.0";
export const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
export const WRITES_A_NEW_FILE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

const INSTRUCTIONS = "Lyceum is a lecturer's course workspace. This local door reads one exported workspace and never changes it. "
  + "Quote counts with their denominator and interval, name the source of every quotation with its link and date, and never call a share a score. "
  + "Quote attainment with its pass mark, its n of N and the KPI, and never average the survey's share with the marks' share. "
  + "Confirming quotations, adopting a revision, recording a decision and sending a brief are done by people in the workspace, not here. "
  + "No learning gain is claimed; the benchmark has not been run.";

export interface DoorOptions { load?: () => Loaded; now?: () => string; log?: (line: string) => void }

/** The server, with its tools, over whatever `load` returns (by default the file LYCEUM_WORKSPACE names). */
export function createLyceumServer(options: DoorOptions = {}): McpServer {
  const load = options.load ?? (() => loadWorkspace(process.env.LYCEUM_WORKSPACE));
  const now = options.now ?? (() => new Date().toISOString());
  const log = options.log ?? ((line: string) => process.stderr.write(line + "\n"));
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS });

  /** Load the export, answer, and log who asked for what. */
  async function answer(tool: string, args: Record<string, unknown>, run: (loaded: Extract<Loaded, { ok: true }>) => ToolText | Promise<ToolText>) {
    const loaded = load();
    const result: ToolText = loaded.ok ? await run(loaded) : { text: loaded.error, isError: true, records: [] };
    const host = server.server.getClientVersion();
    log(JSON.stringify({ at: now(), door: SERVER_NAME, host: host ? host.name + " " + host.version : "unknown", tool, args, records: result.records, ok: !result.isError }));
    return { content: [{ type: "text" as const, text: result.text }], ...(result.isError ? { isError: true } : {}) };
  }
  const courseArg = { course: z.string().min(1).max(40).describe("The course code, for example CS310.") };

  server.registerTool("lyceum_courses", {
    title: "Courses in the workspace",
    description: "List every course in the exported Lyceum workspace with its outcomes, its kept and reviewed sources and its loop for the current term. Read-only.",
    annotations: READ_ONLY,
  }, async () => answer("lyceum_courses", {}, ({ backup }) => listCourses(backup)));

  server.registerTool("lyceum_sources", {
    title: "Sources kept for a course",
    description: "The job postings and documents kept for one course, each with its link, publication date, retrieval time, review state and fingerprint. Read-only.",
    inputSchema: { ...courseArg, reviewedOnly: z.boolean().optional().describe("Only the reviewed postings that count in the denominator.") },
    annotations: READ_ONLY,
  }, async ({ course, reviewedOnly }) => answer("lyceum_sources", { course, reviewedOnly }, ({ backup }) => listSources(backup, course, reviewedOnly ?? false)));

  server.registerTool("lyceum_evidence_report", {
    title: "What employers ask for, with receipts",
    description: "The evidence report for one course: each skill's share of reviewed postings with its 95% Wilson interval, the coverage against targets, and every confirmed quotation with its source. Read-only.",
    inputSchema: courseArg,
    annotations: READ_ONLY,
  }, async ({ course }) => answer("lyceum_evidence_report", { course }, ({ backup }) => evidenceReportText(backup, course)));

  server.registerTool("lyceum_course_outline", {
    title: "The course outline",
    description: "The current version of one course's outline: outcomes, topics, hours and the version's reason. Read-only.",
    inputSchema: courseArg,
    annotations: READ_ONLY,
  }, async ({ course }) => answer("lyceum_course_outline", { course }, ({ backup }) => courseOutlineText(backup, course)));

  server.registerTool("lyceum_course_record", {
    title: "The course record, as a course file",
    description: "One course's record in the shape of a course file: outcomes with the CLO to PLO matrix, the assessment plan and table of specifications, the schedule, learning time and references, then the manifest of the course file the app exports, marking each item present, sample, not yet built or not included. Read-only.",
    inputSchema: courseArg,
    annotations: READ_ONLY,
  }, async ({ course }) => answer("lyceum_course_record", { course }, ({ backup }) => courseRecordText(backup, course)));

  server.registerTool("lyceum_attainment", {
    title: "Attainment against the stated threshold",
    description: "The OBE course report for one course and term: per outcome, the students at or above the institution's pass mark over n, with N beside it, the KPI, and an interval only when some students have no mark; the Course Outcome Survey's share beside it, never averaged and never from booth responses; the programme outcomes listed with no index; and the CQI note. The report saved as printed if there is one. Read-only.",
    inputSchema: { ...courseArg, term: z.string().min(1).max(60).optional().describe("The term, for example 2026/2027 semester 1; the course's current term if left out.") },
    annotations: READ_ONLY,
  }, async ({ course, term }) => answer("lyceum_attainment", { course, term }, ({ backup }) => attainmentText(backup, course, term)));

  server.registerTool("lyceum_brief_draft", {
    title: "A meeting brief draft",
    description: "Draft a meeting brief for one course from its evidence, with a recommendation and notes. It is returned as text; it is not saved, not sent and not a decision. Read-only.",
    inputSchema: { ...courseArg,
      recommendation: z.enum(["keep", "refresh", "revise", "undecided"]).optional().describe("The lecturer's recommendation; undecided by default."),
      notes: z.string().max(20000).optional().describe("The lecturer's words for the brief.") },
    annotations: READ_ONLY,
  }, async ({ course, recommendation, notes }) => answer("lyceum_brief_draft", { course, recommendation }, ({ backup }) => briefDraftText(backup, course, recommendation ?? "undecided", notes ?? "", now())));

  server.registerTool("lyceum_teaching_pack", {
    title: "Write a teaching pack",
    description: "Write the editable teaching pack (.pptx) for one saved session, the same deterministic deck the app downloads, to a new file at an absolute path. Never overwrites a file and never changes the workspace.",
    inputSchema: { ...courseArg,
      session: z.string().min(1).max(80).describe("The session id, or its teaching week, for example 6."),
      path: z.string().min(1).max(1000).describe("An absolute path ending in .pptx where no file exists yet.") },
    annotations: WRITES_A_NEW_FILE,
  }, async ({ course, session, path }) => answer("lyceum_teaching_pack", { course, session, path }, ({ backup }) => writeTeachingPack(backup, course, session, path)));

  return server;
}

// Started directly (node mcp/server.ts): serve over stdio.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const loaded = loadWorkspace(process.env.LYCEUM_WORKSPACE);
  process.stderr.write(loaded.ok ? "Lyceum local door: reading " + loaded.path + ", exported " + loaded.backup.exportedAt + ".\n" : "Lyceum local door: " + loaded.error + "\n");
  await createLyceumServer().connect(new StdioServerTransport());
}
