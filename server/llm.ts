// The LLM layer: the per-agent prompts, a JSON helper for Intake, and a helper for the free-text agents, all on the one
// OpenAI-compatible model set in .env (LYCEUM_AGENT_*, the same one agent web search and the outline reader use). No model
// set means every route reports fallback and the client uses its fixture or deterministic path; the app never depends on
// the network to function.

import { jsonFromReply } from "../src/lib/outline.ts";
import { missingSettings, type AgentSettings } from "../src/lib/agentSettings.ts";
import { loadAgentSettings, openAiChat, type Chat, type ToolSpec } from "./agentSearch.ts";

/** The model settings, read again on every call, and the LYCEUM_AGENT_* keys still missing before it can be called. */
export async function agentModel(): Promise<{ s: AgentSettings; missing: string[] }> {
  const s = await loadAgentSettings();
  return { s, missing: missingSettings(s).filter((k) => k.startsWith("LYCEUM_AGENT")) };
}

// ---------- Intake: JSON through a tool call ----------

const INTAKE_TOOL: ToolSpec = { type: "function", function: {
  name: "file_interpretation",
  description: "Your interpretation of the uploaded document, to be confirmed by the user before filing.",
  parameters: {
    type: "object",
    properties: {
      docType: { type: "string", enum: ["results", "clo-survey", "syllabus", "slides", "unknown"] },
      subjectGuess: { type: "string", description: "Subject code, e.g. CS220, from the provided curriculum only" },
      termGuess: { type: "string", description: "Term like 2025-S1 if present" },
      mappedRows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            cloId: { type: "string" },
            meanScore: { type: "number", description: "0..1; divide percentages by 100" },
            sd: { type: "number" },
            n: { type: "number" },
          },
          required: ["cloId", "meanScore", "sd", "n"],
        },
      },
      contentSummary: { type: "string", description: "For syllabus/slides: a 2-3 sentence factual summary" },
      confidence: { type: "number", description: "0..1" },
      notes: {
        type: "array",
        items: { type: "string" },
        description: "How each mapping decision was made, e.g. which column was read as the mean",
      },
    },
    required: ["docType", "confidence", "notes"],
  },
} };

export async function runIntakeLLM(s: AgentSettings, payload: {
  doc: unknown;
  subjects: Array<{ id: string; title: string }>;
  clos: Array<{ id: string; subjectId: string; text: string }>;
}, chat: Chat = openAiChat(s)): Promise<Record<string, unknown> | null> {
  const res = await chat([
    { role: "system", content:
      "You are the Intake agent of Lyceum, a university curriculum platform. A lecturer dropped a file; " +
      "you classify it and map its content onto the known curriculum. Be conservative: if the subject or " +
      "term is not evident, leave the guess out and say so in notes. meanScore is always 0..1. " +
      "Only use subject codes and CLO ids that appear in the provided curriculum." },
    { role: "user", content:
          `The curriculum:\nSubjects: ${JSON.stringify(payload.subjects)}\nCLOs: ${JSON.stringify(payload.clos)}\n\n` +
          `The parsed document (pages of text and tables of cells):\n${JSON.stringify(payload.doc).slice(0, 24000)}\n\n` +
          "Interpret it with the file_interpretation tool." },
  ], [INTAKE_TOOL]);
  // A model that answers in text instead of calling the tool is read as JSON; anything else is no interpretation.
  const call = res.tool_calls?.find((t) => t.function.name === INTAKE_TOOL.function.name);
  try {
    const out = call ? JSON.parse(call.function.arguments) : jsonFromReply(res.content ?? "");
    return out && typeof out === "object" ? (out as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------- Free-text agents ----------

const SYSTEMS: Record<string, string> = {
  authoring:
    "You are the Authoring agent of Lyceum, drafting curriculum updates for a university subject. " +
    "Write concretely and briefly for an academic audience: topics, learning-outcome wording, and test or " +
    "lab notes. Never invent facts about the institution; work only from the provided subject and target. " +
    "Plain text, short lines, no markdown headings.",
  evaluator:
    "You are the Evaluator agent of Lyceum. You compile a plain-language verdict on a tested curriculum " +
    "change for the management approval gate: three sentences, then a one-line recommendation starting " +
    "with 'Recommendation:'. Cite the two numbers that matter (current vs projected mastery). Honest and dry.",
  analogy:
    "You are the Analogy agent of Lyceum. Explain in two sentences how a proxy cohort was assembled for a " +
    "new subject from existing courses with similar learning outcomes, naming the borrowed courses and " +
    "their overlap. Plain, factual.",
  signal:
    "You are the Signal agent of Lyceum. Given multi-source market snapshots, summarise which skills are " +
    "rising, which sources agree, and which subject outcomes they land on. Three short paragraphs at most. " +
    "Note explicitly when sources disagree.",
};

// ponytail: the reply arrives whole and goes out as one chunk; token streaming needs stream: true in openAiChat.
export async function streamAgentLLM(
  s: AgentSettings,
  agent: string,
  payload: unknown,
  onChunk: (text: string) => Promise<void> | void,
  chat: Chat = openAiChat(s),
): Promise<void> {
  const system = SYSTEMS[agent];
  if (!system) throw new Error(`unknown agent ${agent}`);
  const res = await chat([{ role: "system", content: system }, { role: "user", content: JSON.stringify(payload).slice(0, 24000) }], []);
  if (res.content) await onChunk(res.content);
}
