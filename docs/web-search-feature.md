# Web Search Feature

How Odysseus lets the agent (and plain chat) search and read the web.
For the full engineering spec see [`specs/search.md`](../specs/search.md).

## TL;DR

- The **globe / "Web search" button** in the chat composer turns web access on for a turn.
- **Agent mode** → the model gets the `web_search` and `web_fetch` tools (plus `get_weather`) and calls them itself.
- **Chat mode** → the server runs one search *before* the model answers and adds the results as context.
- Searches go through **SearXNG** by default, falling back to **DuckDuckGo**. Brave, Google PSE, Tavily and Serper are optional and need API keys.

## 1. Turning it on (UI → server)

| Step | Where | What happens |
|---|---|---|
| Toggle button | `static/index.html:1177` (`#web-toggle-btn`), hidden checkbox `#web-toggle` at `:1255` | User clicks the globe icon |
| Request form | `static/js/chat.js:2648-2655` | Chat mode sends `use_web=true`. Agent mode sends `allow_web_search=true/false` |
| Gate | `web/src/tool_policy.py:45` `web_search_enabled_for_turn()` | Web is on only when the request explicitly enables it. An explicit `allow_web_search=false` always wins |
| Route | `routes/chat_routes.py:2570` | Computes `_search_enabled` |
| Intent auto-enable | `routes/chat_routes.py:~3340-3384` | If the message clearly asks for a lookup ("search…", "latest…", a follow-up on a link), web can turn on even with the toggle off, **unless** the user explicitly set it to false (`web_intent_may_enable_for_turn`, `tool_policy.py:58`) |
| Disable | `routes/chat_routes.py:3385` | Otherwise `WEB_TOOL_NAMES` (`web_search`, `web_fetch`, `get_weather`) are added to `disabled_tools` |

Global feature flags live in `web/src/settings.py:223` (`DEFAULT_FEATURES["web_search"]`, `["web_fetch"]`, both `True`).

## 2. Agent mode: the tools

### Tool schemas (what the model sees): `web/src/tool_schemas.py:334`

**`web_search`**
```json
{ "query": "string", "time_filter": "day | week | month | year (optional)" }
```
Use it for open-ended lookups and latest/current questions. Don't use it for "research X" jobs; those go to `trigger_research`.

**`web_fetch`**
```json
{ "url": "string", "urls": ["up to 12"], "query": "focus terms (optional)", "full": false }
```
Reads known URLs. It fetches up to 12 at once, 4 at a time. `query` returns only the matching passages from long pages. Set `full=true` after a `[partial content]` notice.

### Registration: `src/agent_tools/__init__.py:42`
```python
"web_search": WebSearchTool().execute,
"web_fetch":  WebFetchTool().execute,
```
`web/src/tool_parsing.py:317` maps aliases such as `search`, `google_search` and `fetch_url` to these names, so models with other tool vocabularies still work.

### `WebSearchTool`: `src/agent_tools/web_tools.py:304`
1. Parses the input as JSON or plain text, then reads `query`, `time_filter` and `max_pages` (1–10, default 5).
2. If there's no `time_filter`, it infers one from the query (`web/src/search_intent.py`).
3. Scholarly or official-site metadata queries use `searxng_search_results` (links only). Everything else uses `comprehensive_web_search`, which searches, ranks and fetches the pages.
4. **30 s timeout.** On timeout it falls back to metadata-only results (12 s) so the agent still gets links.
5. If a weather query returns nothing, it falls back to the `get_weather` tool.
6. Output is compacted by `bounded_search_observation` (`web/src/search_passages.py`), with `<!-- SOURCES:[...] -->` appended. The agent loop strips this marker and uses it for citations (`web/src/agent_loop.py:~33903`).

### `WebFetchTool`: `src/agent_tools/web_tools.py:442`
- http/https only. A bare domain like `example.com` is fine.
- A PDF sends the agent to `pdf_extract`, and local HTML sends it to `private_browser`.
- Returns tool errors for timeouts, HTTP failures, bot protection, and pages that need JS or a login.

## 3. Chat mode: pre-search

`web/src/chat_processor.py:411`. When `use_web=True`:
1. The session model writes a short search query (≤50 tokens, 15 s). If that fails, the first line of the user message is used.
2. The query is cleaned (`_clean_search_query`, max 150 chars).
3. `comprehensive_web_search(query, return_sources=True)` runs.
4. The results are added as `untrusted_context_message("web search results", …)` before the model answers.

## 4. Search pipeline (shared)

Canonical code is in `services/search/`. `web/src/search/*` are compatibility shims that point to it.

| File | Owns |
|---|---|
| `core.py` | `comprehensive_web_search()`: provider chain, retries/fallback, query repair, ranking, page fetch, cache, analytics |
| `providers.py` | SearXNG, Brave, DuckDuckGo, Google PSE, Tavily, Serper, plus `PROVIDER_INFO` |
| `query.py` | Query cleanup and entity extraction |
| `ranking.py` | Relevance and recency ranking |
| `content.py` | `fetch_webpage_content()`: HTML/PDF/JSON extraction, OG images |
| `cache.py`, `analytics.py` | Result cache and stats |
| `service.py` | `SearchService`, an async facade |

Outbound fetch safety is in `web/src/outbound_fetch.py`. It blocks private, localhost and metadata IPs, pins DNS per hop (anti-rebinding), re-checks every redirect, and caps download size (`WEB_FETCH_SOFT_MAX_BYTES` / `WEB_FETCH_HARD_MAX_BYTES`).

## 5. Configuration

Defaults in `web/src/settings.py:66`:

| Setting | Default | Notes |
|---|---|---|
| `search_provider` | `searxng` | Native: `http://localhost:8080`. Docker: the compose `searxng` service |
| `search_fallback_chain` | `["duckduckgo"]` | Tried in order when the primary fails |
| `search_result_count` | `5` | |
| `search_safesearch` | `strict` | `strict` / `moderate` / `off` |
| `search_url` | `""` | Custom backend URL |
| `brave_api_key`, `google_pse_key` + `google_pse_cx`, `tavily_api_key`, `serper_api_key` | `""` | Providers without a key are skipped |
| `research_search_provider` | `""` | Provider override for deep research |

Admin UI: `static/js/settings.js` and `static/js/settings/search.js`.

## 6. HTTP API

`routes/search/search_routes.py`:

| Route | Purpose |
|---|---|
| `GET /api/search/config` | Config. Shows whether keys are present, never their values |
| `POST /api/search` | Full pipeline: returns `{context, sources, error?}` |
| `GET /api/search/providers` | Provider metadata and availability |
| `POST /api/search/query` | One provider, raw results, no fallback: `{results, provider, time, error?}` |

(`GET /api/search` in `chat_routes.py` searches **chat history**, not the web.)

## 7. Security model

- All search results and fetched pages are **untrusted context**, never instructions.
- Provider keys are never returned by config routes, and chat tools can't set them.
- SSRF protection on every fetch (see §4).

## 8. Related

- **Deep research** (`web/src/deep_research.py`, `routes/research/`): a multi-step research job that uses the same providers.
- **`private_browser`**, **`youtube_tool`**, **`pdf_extract`**: other web-access tools in `web_tools.py`.
- Known gaps: see "Current Gaps" in `specs/search.md`.
