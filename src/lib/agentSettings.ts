// Agent web search settings, read from .env by the local API; the Settings screen shows them without the keys.
// Any OpenAI-compatible chat endpoint that supports tool calling can drive the agent; a provider name only fills in its
// base URL. The search provider is separate, so a model and a search engine can be swapped independently.

export type ModelProviderId = "openai" | "openrouter" | "gemini" | "groq" | "ollama" | "custom";
export type SearchProviderId = "tavily" | "brave" | "serper" | "google" | "searxng";

export const MODEL_PROVIDERS: Record<ModelProviderId, { label: string; baseUrl: string; needsKey: boolean }> = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", needsKey: true },
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", needsKey: true },
  gemini: { label: "Google Gemini (OpenAI-compatible)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", needsKey: true },
  groq: { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", needsKey: true },
  ollama: { label: "Ollama (on this computer)", baseUrl: "http://localhost:11434/v1", needsKey: false },
  custom: { label: "Other OpenAI-compatible endpoint", baseUrl: "", needsKey: false },
};
export const SEARCH_PROVIDERS: Record<SearchProviderId, { label: string; needs: Array<"apiKey" | "cx" | "url"> }> = {
  tavily: { label: "Tavily", needs: ["apiKey"] },
  brave: { label: "Brave Search API", needs: ["apiKey"] },
  serper: { label: "Serper (Google results)", needs: ["apiKey"] },
  google: { label: "Google Programmable Search", needs: ["apiKey", "cx"] },
  searxng: { label: "SearXNG (self-hosted, no key)", needs: ["url"] },
};

export interface ModelProfile { provider: ModelProviderId; baseUrl: string; model: string; apiKey: string }
export interface SearchProfile { provider: SearchProviderId; apiKey: string; cx: string; url: string }
export interface AgentSettings { model: ModelProfile; search: SearchProfile; maxSteps: number; maxPostings: number }
/** What the browser sees: each key replaced by a hint of its last four characters. */
export interface PublicAgentSettings {
  model: Omit<ModelProfile, "apiKey"> & { keyHint: string };
  search: Omit<SearchProfile, "apiKey"> & { keyHint: string };
  maxSteps: number; maxPostings: number;
}

/** The .env variables, with what each one does; .env.example lists the same. */
export const ENV = {
  modelProvider: "LYCEUM_AGENT_PROVIDER", baseUrl: "LYCEUM_AGENT_BASE_URL", model: "LYCEUM_AGENT_MODEL", modelKey: "LYCEUM_AGENT_API_KEY",
  searchProvider: "LYCEUM_SEARCH_PROVIDER", searchKey: "LYCEUM_SEARCH_API_KEY", searchCx: "LYCEUM_SEARCH_CX", searchUrl: "LYCEUM_SEARCH_URL",
  maxSteps: "LYCEUM_AGENT_MAX_STEPS", maxPostings: "LYCEUM_AGENT_MAX_POSTINGS",
} as const;
export const LIMITS = { maxSteps: [2, 40, 12], maxPostings: [1, 50, 20] } as const;

const clamp = (raw: string | undefined, [lo, hi, fallback]: readonly [number, number, number]) => {
  const n = Number(raw);
  return raw && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
};
export function settingsFromEnv(env: Record<string, string | undefined>): AgentSettings {
  const get = (k: string) => (env[k] ?? "").trim();
  const mp = get(ENV.modelProvider).toLowerCase(), sp = get(ENV.searchProvider).toLowerCase();
  const modelProvider: ModelProviderId = mp in MODEL_PROVIDERS ? (mp as ModelProviderId) : get(ENV.baseUrl) ? "custom" : "openrouter";
  const searchProvider: SearchProviderId = sp in SEARCH_PROVIDERS ? (sp as SearchProviderId) : "tavily";
  return {
    model: { provider: modelProvider, baseUrl: get(ENV.baseUrl) || MODEL_PROVIDERS[modelProvider].baseUrl, model: get(ENV.model), apiKey: get(ENV.modelKey) },
    search: { provider: searchProvider, apiKey: get(ENV.searchKey), cx: get(ENV.searchCx), url: get(ENV.searchUrl) },
    maxSteps: clamp(env[ENV.maxSteps], LIMITS.maxSteps), maxPostings: clamp(env[ENV.maxPostings], LIMITS.maxPostings),
  };
}

/** The .env lines still missing before a run can start; empty when ready. */
export function missingSettings(s: AgentSettings): string[] {
  const out: string[] = [];
  if (!s.model.baseUrl) out.push(ENV.baseUrl);
  if (!s.model.model) out.push(ENV.model);
  if (MODEL_PROVIDERS[s.model.provider].needsKey && !s.model.apiKey) out.push(ENV.modelKey);
  const need = SEARCH_PROVIDERS[s.search.provider].needs;
  if (need.includes("apiKey") && !s.search.apiKey) out.push(ENV.searchKey);
  if (need.includes("cx") && !s.search.cx) out.push(ENV.searchCx);
  if (need.includes("url") && !s.search.url) out.push(ENV.searchUrl);
  return out;
}

const hint = (key: string) => (key ? "ends in " + key.slice(-4) : "");
export function publicSettings(s: AgentSettings): PublicAgentSettings {
  const { apiKey: mk, ...model } = s.model, { apiKey: sk, ...search } = s.search;
  return { model: { ...model, keyHint: hint(mk) }, search: { ...search, keyHint: hint(sk) }, maxSteps: s.maxSteps, maxPostings: s.maxPostings };
}
