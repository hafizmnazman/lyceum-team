// Agent web search settings, read from .env by the local API; the Settings screen shows them without the keys.
// Any OpenAI-compatible chat endpoint that supports tool calling can drive the agent; a provider name only fills in its
// base URL. Search follows Odysseus (docs/web-search-feature.md): a primary provider and a fallback chain tried in order
// when it fails or finds nothing, SearXNG then DuckDuckGo by default, each keyed provider with its own key, skipped
// when its key is missing, and a default time window for searches the agent does not date itself.

export type ModelProviderId = "openai" | "openrouter" | "gemini" | "groq" | "ollama" | "custom";
export type SearchProviderId = "searxng" | "duckduckgo" | "tavily" | "brave" | "serper" | "google";
export type TimeFilter = "day" | "week" | "month" | "year";

export const MODEL_PROVIDERS: Record<ModelProviderId, { label: string; baseUrl: string; needsKey: boolean }> = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", needsKey: true },
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", needsKey: true },
  gemini: { label: "Google Gemini (OpenAI-compatible)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", needsKey: true },
  groq: { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", needsKey: true },
  ollama: { label: "Ollama (on this computer)", baseUrl: "http://localhost:11434/v1", needsKey: false },
  custom: { label: "Other OpenAI-compatible endpoint", baseUrl: "", needsKey: false },
};

/** Each provider and the .env lines it needs; a provider with one of them empty is skipped in the chain. */
export const SEARCH_PROVIDERS: Record<SearchProviderId, { label: string; needs: Array<keyof SearchKeys>; note: string }> = {
  searxng: { label: "SearXNG (self-hosted, no key)", needs: ["searxngUrl"], note: "npm run search:up starts one with Docker." },
  duckduckgo: { label: "DuckDuckGo (no key, best effort)", needs: [], note: "Reads DuckDuckGo's plain HTML results page; it has no official API, so it can be rate-limited or change." },
  tavily: { label: "Tavily", needs: ["tavily"], note: "Built for AI agents; free tier at app.tavily.com." },
  brave: { label: "Brave Search API", needs: ["brave"], note: "A subscription token from api-dashboard.search.brave.com." },
  serper: { label: "Serper (Google results)", needs: ["serper"], note: "A key from serper.dev." },
  google: { label: "Google Programmable Search", needs: ["google", "googleCx"], note: "An API key and a search engine id (cx)." },
};

export interface ModelProfile { provider: ModelProviderId; baseUrl: string; model: string; apiKey: string }
export interface SearchKeys { searxngUrl: string; tavily: string; brave: string; serper: string; google: string; googleCx: string }
export interface SearchSettings { provider: SearchProviderId; fallback: SearchProviderId[]; timeFilter: TimeFilter | null; keys: SearchKeys }
export interface AgentSettings { model: ModelProfile; search: SearchSettings; maxSteps: number; maxPostings: number }
/** What the browser sees: keys only as a hint of their last four characters; addresses and ids as they are. */
export interface PublicAgentSettings {
  model: Omit<ModelProfile, "apiKey"> & { keyHint: string };
  search: { provider: SearchProviderId; fallback: SearchProviderId[]; timeFilter: TimeFilter | null; chain: Array<{ id: SearchProviderId; usable: boolean; missing: string[] }>;
    searxngUrl: string; googleCx: string; keyHints: Partial<Record<"tavily" | "brave" | "serper" | "google", string>> };
  maxSteps: number; maxPostings: number;
}

/** The .env variables; .env.example lists the same. */
export const ENV = {
  modelProvider: "LYCEUM_AGENT_PROVIDER", baseUrl: "LYCEUM_AGENT_BASE_URL", model: "LYCEUM_AGENT_MODEL", modelKey: "LYCEUM_AGENT_API_KEY",
  searchProvider: "LYCEUM_SEARCH_PROVIDER", searchFallback: "LYCEUM_SEARCH_FALLBACK", searchTime: "LYCEUM_SEARCH_TIME",
  maxSteps: "LYCEUM_AGENT_MAX_STEPS", maxPostings: "LYCEUM_AGENT_MAX_POSTINGS",
} as const;
export const SEARCH_ENV: Record<keyof SearchKeys, string> = {
  searxngUrl: "SEARXNG_URL", tavily: "TAVILY_API_KEY", brave: "BRAVE_API_KEY", serper: "SERPER_API_KEY", google: "GOOGLE_PSE_KEY", googleCx: "GOOGLE_PSE_CX",
};
export const LIMITS = { maxSteps: [2, 40, 12], maxPostings: [1, 50, 20] } as const;
const TIME_FILTERS: TimeFilter[] = ["day", "week", "month", "year"];
export const isTimeFilter = (v: unknown): v is TimeFilter => TIME_FILTERS.includes(v as TimeFilter);
const isSearch = (v: string): v is SearchProviderId => v in SEARCH_PROVIDERS;

const clamp = (raw: string | undefined, [lo, hi, fallback]: readonly [number, number, number]) => {
  const n = Number(raw);
  return raw && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
};
export function settingsFromEnv(env: Record<string, string | undefined>): AgentSettings {
  const get = (k: string) => (env[k] ?? "").trim();
  const mp = get(ENV.modelProvider).toLowerCase(), sp = get(ENV.searchProvider).toLowerCase();
  const modelProvider: ModelProviderId = mp in MODEL_PROVIDERS ? (mp as ModelProviderId) : get(ENV.baseUrl) ? "custom" : "openrouter";
  const provider: SearchProviderId = isSearch(sp) ? sp : "searxng";
  const fallbackRaw = env[ENV.searchFallback] === undefined ? "duckduckgo" : get(ENV.searchFallback);
  const fallback = [...new Set(fallbackRaw.split(",").map((x) => x.trim().toLowerCase()).filter(isSearch))].filter((x) => x !== provider);
  const time = get(ENV.searchTime).toLowerCase();
  return {
    model: { provider: modelProvider, baseUrl: get(ENV.baseUrl) || MODEL_PROVIDERS[modelProvider].baseUrl, model: get(ENV.model), apiKey: get(ENV.modelKey) },
    search: { provider, fallback, timeFilter: time === "any" ? null : isTimeFilter(time) ? time : "month",
      keys: { searxngUrl: get(SEARCH_ENV.searxngUrl) || "http://localhost:8080", tavily: get(SEARCH_ENV.tavily), brave: get(SEARCH_ENV.brave),
        serper: get(SEARCH_ENV.serper), google: get(SEARCH_ENV.google), googleCx: get(SEARCH_ENV.googleCx) } },
    maxSteps: clamp(env[ENV.maxSteps], LIMITS.maxSteps), maxPostings: clamp(env[ENV.maxPostings], LIMITS.maxPostings),
  };
}

/** The .env lines a search provider still needs; empty when it can be used. */
export const searchMissing = (s: SearchSettings, id: SearchProviderId) => SEARCH_PROVIDERS[id].needs.filter((k) => !s.keys[k]).map((k) => SEARCH_ENV[k]);
/** The providers tried, in order: the primary, then the fallback chain, each with what it lacks. */
export const searchChain = (s: SearchSettings) => [s.provider, ...s.fallback].map((id) => ({ id, missing: searchMissing(s, id), usable: searchMissing(s, id).length === 0 }));

/** The .env lines still missing before a run can start; empty when ready. */
export function missingSettings(s: AgentSettings): string[] {
  const out: string[] = [];
  if (!s.model.baseUrl) out.push(ENV.baseUrl);
  if (!s.model.model) out.push(ENV.model);
  if (MODEL_PROVIDERS[s.model.provider].needsKey && !s.model.apiKey) out.push(ENV.modelKey);
  const chain = searchChain(s.search);
  if (!chain.some((p) => p.usable)) out.push(...chain[0].missing);
  return out;
}

const hint = (key: string) => (key ? "ends in " + key.slice(-4) : "");
export function publicSettings(s: AgentSettings): PublicAgentSettings {
  const { apiKey, ...model } = s.model, k = s.search.keys;
  return {
    model: { ...model, keyHint: hint(apiKey) },
    search: { provider: s.search.provider, fallback: s.search.fallback, timeFilter: s.search.timeFilter, chain: searchChain(s.search),
      searxngUrl: k.searxngUrl, googleCx: k.googleCx, keyHints: { tavily: hint(k.tavily), brave: hint(k.brave), serper: hint(k.serper), google: hint(k.google) } },
    maxSteps: s.maxSteps, maxPostings: s.maxPostings,
  };
}
