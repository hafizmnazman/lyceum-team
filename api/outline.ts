// Reading a course outline at onboarding: the document's text goes to the model set in .env (the same one agent web search
// uses), which answers in JSON; shared/lib/outline.ts checks the answer against the document. The lecturer accepts each
// row before anything is saved.

import { jsonFromReply, OUTLINE_PROMPT, readProposal, type OutlineProposal } from "../shared/lib/outline.ts";
import { openAiChat, type Chat } from "./agentSearch.ts";
import type { AgentSettings } from "../shared/lib/agentSettings.ts";

export const MAX_OUTLINE_CHARS = 60_000;
export { OUTLINE_PROMPT };

export async function readOutline(text: string, fileName: string, s: AgentSettings, chat: Chat = openAiChat(s)): Promise<OutlineProposal> {
  const document = text.slice(0, MAX_OUTLINE_CHARS);
  const reply = await chat([{ role: "system", content: OUTLINE_PROMPT }, { role: "user", content: "Course outline (" + fileName + "):\n\n" + document }], []);
  return readProposal(jsonFromReply(reply.content ?? ""), document, fileName);
}
