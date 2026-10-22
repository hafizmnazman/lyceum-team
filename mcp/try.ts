// A stdio session with the local door, the way a desktop host runs it: start
// node mcp/server.ts as a child process, speak MCP over its stdin and stdout
// with the SDK's client, list the tools and ask for CS310's evidence report.
// It prints what came back, so a run can be pasted into docs/doors.md.
//
// Run: node mcp/try.ts [path/to/workspace.json]   (default: mcp/sample-workspace.json)

import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SAMPLE_PATH } from "./sample.ts";

const workspace = process.argv[2] ?? SAMPLE_PATH;
const server = fileURLToPath(new URL("server.ts", import.meta.url));
const transport = new StdioClientTransport({ command: process.execPath, args: [server], env: { ...process.env, LYCEUM_WORKSPACE: workspace } as Record<string, string>, stderr: "pipe" });
const client = new Client({ name: "lyceum-try", version: "1.0.0" });
await client.connect(transport);
const info = client.getServerVersion();
console.log("Connected over stdio to " + info?.name + " " + info?.version + ", reading " + workspace + ".");
const { tools } = await client.listTools();
console.log("Tools: " + tools.map((t) => t.name + (t.annotations?.readOnlyHint ? " (read-only)" : " (writes a new file)")).join(", ") + ".");
const result = await client.callTool({ name: "lyceum_evidence_report", arguments: { course: "CS310" } }) as { content: Array<{ text: string }>; isError?: boolean };
const text = result.content.map((c) => c.text).join("\n");
console.log("\nlyceum_evidence_report { course: CS310 }" + (result.isError ? " (error)" : "") + ", the first lines:\n");
console.log(text.split("\n").slice(0, 24).join("\n"));
await client.close();
