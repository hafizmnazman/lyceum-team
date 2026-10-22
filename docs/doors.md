# Lyceum: the doors

One core, many doors (plan Section 11): the same deterministic engines, reached from the tools lecturers already use. Today two doors exist. The **web workspace** is the app itself. The **local door** is a stdio MCP server in `mcp/` that reads one workspace backup exported from the app and answers from it, with the skill folder `skills/lyceum/` telling an assistant how to use it. Remote access and OAuth are planned.

## What the local door does

| Tool | Changes anything? | What it returns |
|:--|:--|:--|
| `lyceum_courses` | No (read-only) | Every course with its outcomes, kept and reviewed sources, and its loop for the term |
| `lyceum_sources` | No (read-only) | The kept sources for a course, each with its link, publication date, retrieval time, review state and fingerprint |
| `lyceum_evidence_report` | No (read-only) | Each skill's share of reviewed postings with its 95% Wilson interval, coverage against targets, and every quotation with its source |
| `lyceum_course_outline` | No (read-only) | The current version's outcomes, topics, hours and reason |
| `lyceum_brief_draft` | No (read-only) | A meeting brief drafted from the evidence; not saved, not sent, not a decision |
| `lyceum_teaching_pack` | Writes one new file | The editable teaching pack (.pptx) for a saved session, written to a new absolute path; it never overwrites a file |

The trust boundary (plan Section 11.3): read-only tools are annotated read-only; the pack tool is annotated as writing a new file and not destructive. No tool confirms a quotation, marks postings reviewed, records a decision, adopts a revision or sends a brief; those stay human actions in the workspace. Every call is logged to the server's stderr as one line with the time, the host that called, the tool, its arguments, the record ids it touched and whether it succeeded. The door reads the export again on every call, so a fresh export is what it answers from next, and removing the door from a host leaves the workspace and its exports as they were. Every reply starts with the time the workspace was exported, so the door and the screen can be compared.

## Before a demo: one dataset for everything

1. In Lyceum, open **Guide & progress** (or **Courses**, then **Backups**) and choose **Download workspace backup**. Do it immediately before the door is shown, so the door reads exactly what is on the screen (plan Section 15).
2. Save it somewhere stable, for example `C:\Lyceum\lyceum-workspace-backup.json`. The door validates it exactly as the app's restore does and refuses a file that fails.
3. Without the app, use `mcp/sample-workspace.json`: the self-driving tour's end state on CS310, built by `node mcp/sample.ts` from the dated saved sample of the Stripe board and the sample results in `public/demo`. Its timestamps are the seed clock's (1 July 2026), because the store's clock is pinned outside the browser; a real export carries real times.

Node 24 or later runs the server directly (it strips the TypeScript types), after `npm install` in the repository.

## Claude Desktop

Open Settings, then Developer, then Edit Config, and add the server to `claude_desktop_config.json` (on Windows `%APPDATA%\Claude\claude_desktop_config.json`, on macOS `~/Library/Application Support/Claude/claude_desktop_config.json`). Use absolute paths; the server does not know the repository's folder.

```json
{
  "mcpServers": {
    "lyceum": {
      "command": "node",
      "args": ["C:\\path\\to\\lyceum\\mcp\\server.ts"],
      "env": { "LYCEUM_WORKSPACE": "C:\\Lyceum\\lyceum-workspace-backup.json" }
    }
  }
}
```

Restart Claude Desktop. The six tools appear under the lyceum server; Claude asks before each call.

## Claude Code

From any folder, with absolute paths:

```text
claude mcp add lyceum --env LYCEUM_WORKSPACE=/path/to/lyceum-workspace-backup.json -- node /path/to/lyceum/mcp/server.ts
```

To use the skill as well, copy `skills/lyceum/` into a skills folder the assistant reads (for Claude Code, `.claude/skills/` in a project or `~/.claude/skills/`). The folder follows the open Agent Skills specification: `SKILL.md` with its front matter and instructions.

## Try it without a host

`node mcp/try.ts [path/to/workspace.json]` starts the server as a child process and speaks MCP to it over stdio with the official SDK's client, as a desktop host does: it lists the tools and asks for CS310's evidence report. The run on 22 October 2026 against the sample workspace, first lines:

```text
Connected over stdio to lyceum 3.0.0, reading mcp\sample-workspace.json.
Tools: lyceum_courses (read-only), lyceum_sources (read-only), lyceum_evidence_report (read-only), lyceum_course_outline (read-only), lyceum_brief_draft (read-only), lyceum_teaching_pack (writes a new file).

lyceum_evidence_report { course: CS310 }, the first lines:

From the Lyceum workspace exported at 2026-10-22T10:00:00Z. Read-only: nothing was changed in the workspace.

# CS310 evidence report

Course: Data Visualisation
Generated: 2026-10-22T10:00:00Z
Scope: 10 postings collected on request from Saved sample: real postings from the stripe Greenhouse board, retrieved 2026-10-09 and truncated for the demo, recorded in this workspace. Nothing is collected without a request.

## Observed requirements

Reviewed job postings in the denominator: 9
Excluded: 0 unreviewed postings, 1 duplicate copies, 0 contextual documents (standards and advisory notes are listed, never counted as postings).

| Skill | Postings | Share | 95% interval | Required | Preferred | Employers | Coverage stage | Target | Status |
|---|---|---|---|---|---|---|---|---|---|
| stakeholders | 6 of 9 | 66.7% | 35.4% to 87.9% | 0 | 0 | 1 | Unknown | Unknown | Not assessed |
| dashboards | 5 of 9 | 55.6% | 26.7% to 81.1% | 0 | 0 | 1 | Introduced | Practised | Below target |
```

## The manual Claude Desktop run

The plan asks for one recorded run in Claude Desktop (Section 17.1, A5). It needs the desktop app and the owner's account, so this session could not make it; it is on the run log's list for the owner. To make it:

1. Export a fresh backup from the app, or use the sample workspace, and configure Claude Desktop as above.
2. Ask: "What do employers ask for in CS310, with receipts?"
3. Check the answer against the screen: the export time, the denominator (9 reviewed postings in the sample), each share with its interval, and the quotations with their employer, title, date and link. Then ask for the teaching pack for week 6 to a new path and open the file.
4. Record the date, the Claude Desktop version, the question and the first lines of the answer here.

Recorded runs: none yet.

## Verification

`node --test src/prove-mcp.ts` calls every tool through the MCP protocol against the sample workspace: the sample is current and validates; six tools, five annotated read-only; each read tool answers with its receipts and the export time; the pack tool writes one new PPTX, the same deck the app builds, and refuses to overwrite or to write to a relative path, a wrong extension or a missing folder; no tool changes the workspace file; unknown courses, tampered exports and missing exports are refused; every call is logged with the host and the records it touched. `node mcp/sample.ts --check` confirms the sample matches the tour's end state.
