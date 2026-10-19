// The LLM layer: one Anthropic client, the per-agent prompts, a forced-JSON
// helper for Intake, and a streaming helper for the free-text agents. No key
// means every route reports fallback and the client uses its deterministic
// path; the app never depends on the network to function.

import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.LYCEUM_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 1500;

let client: Anthropic | null = null;
export function hasKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// ---------- Intake: forced JSON via a tool schema ----------

const INTAKE_TOOL = {
  name: "file_interpretation",
  description: "Your interpretation of the uploaded document, to be confirmed by the user before filing.",
  input_schema: {
    type: "object" as const,
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
};

export async function runIntakeLLM(payload: {
  doc: unknown;
  subjects: Array<{ id: string; title: string }>;
  clos: Array<{ id: string; subjectId: string; text: string }>;
}): Promise<Record<string, unknown> | null> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system:
      "You are the Intake agent of Lyceum, a university curriculum platform. A lecturer dropped a file; " +
      "you classify it and map its content onto the known curriculum. Be conservative: if the subject or " +
      "term is not evident, leave the guess out and say so in notes. meanScore is always 0..1. " +
      "Only use subject codes and CLO ids that appear in the provided curriculum.",
    messages: [
      {
        role: "user",
        content:
          `The curriculum:\nSubjects: ${JSON.stringify(payload.subjects)}\nCLOs: ${JSON.stringify(payload.clos)}\n\n` +
          `The parsed document (pages of text and tables of cells):\n${JSON.stringify(payload.doc).slice(0, 24000)}\n\n` +
          "Interpret it with the file_interpretation tool.",
      },
    ],
    tools: [INTAKE_TOOL],
    tool_choice: { type: "tool", name: "file_interpretation" },
  });
  const tool = res.content.find((b) => b.type === "tool_use");
  return tool && tool.type === "tool_use" ? (tool.input as Record<string, unknown>) : null;
}

// ---------- Free-text agents: streaming ----------

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

export async function streamAgentLLM(
  agent: string,
  payload: unknown,
  onChunk: (text: string) => Promise<void> | void,
): Promise<void> {
  const system = SYSTEMS[agent];
  if (!system) throw new Error(`unknown agent ${agent}`);
  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: JSON.stringify(payload).slice(0, 24000) }],
  });
  stream.on("text", (text) => {
    void onChunk(text);
  });
  await stream.finalMessage();
}
