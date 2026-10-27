// Settings: what agent web search will use, as the local API reads it from .env. Read-only by design: keys stay in .env on
// this computer and this screen sees only their last four characters. Editing .env takes effect on the next request.

import { useEffect, useState } from "react";
import { ENV, MODEL_PROVIDERS, SEARCH_ENV, SEARCH_PROVIDERS, type PublicAgentSettings } from "../../lib/agentSettings.ts";
import { Button, Page, PageHead, Spinner, Tag } from "../primitives/index.tsx";

type Loaded = { settings: PublicAgentSettings; missing: string[]; path: string };
type TestResult = { ok: boolean; detail?: string; error?: string } | null;

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error((body as { error?: string } | null)?.error ?? (res.status === 404 ? "The local API is not running. Start it with npm run dev." : "HTTP " + res.status));
  return body;
}

export function SettingsScreen() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "model" | "search">("");
  const [tests, setTests] = useState<{ model: TestResult; search: TestResult }>({ model: null, search: null });
  const reload = () => api("/api/agent-settings").then((d) => { setLoaded(d as Loaded); setError(""); }).catch((e: Error) => setError(e.message));
  useEffect(() => { void reload(); }, []);

  async function test(target: "model" | "search") {
    setBusy(target); setTests((t) => ({ ...t, [target]: null }));
    try { await reload(); const r = await api("/api/agent-settings/test/" + target, { method: "POST" }) as TestResult; setTests((t) => ({ ...t, [target]: r })); }
    catch (e) { setTests((t) => ({ ...t, [target]: { ok: false, error: (e as Error).message } })); } finally { setBusy(""); }
  }
  const testLine = (r: TestResult) => (r ? <p role="status" className={(r.ok ? "save-status" : "form-error") + " pop-in"}>{r.ok ? r.detail : r.error}</p> : null);
  const row = (label: string, env: string, value: string) => <div><dt>{label} <code>{env}</code></dt><dd>{value || <span className="muted">Not set</span>}</dd></div>;
  const s = loaded?.settings;

  return (
    <Page>
      <PageHead title="Settings" context="The model and search provider behind agent web search, on Watch's research run. Any provider with an OpenAI-compatible API and tool calling can drive the agent."
        actions={<Button disabled={Boolean(busy)} onClick={() => void reload()}>Reload from .env</Button>} />
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      {s && loaded ? <>
        <p className="muted">
          Set these in <code>{loaded.path}</code> (see <code>.env.example</code>). The local API reads the file again on every request, so a change applies without a restart. Keys never reach this page.{" "}
          {loaded.missing.length ? <Tag tone="warn">Still needed: {loaded.missing.join(", ")}</Tag> : <Tag tone="ok">Ready to run</Tag>}
        </p>

        <section className="workspace-panel" aria-labelledby="settings-model">
          <div className="section-heading"><div><h2 id="settings-model">Model</h2><p className="muted">Decides what to search, which pages to read and which postings to keep. It must support tool calling.</p></div></div>
          <dl className="context-list">
            {row("Provider", ENV.modelProvider, MODEL_PROVIDERS[s.model.provider].label + " (" + s.model.provider + ")")}
            {row("Base URL", ENV.baseUrl, s.model.baseUrl)}
            {row("Model id", ENV.model, s.model.model)}
            {row("API key", ENV.modelKey, s.model.keyHint ? "Set, " + s.model.keyHint : MODEL_PROVIDERS[s.model.provider].needsKey ? "" : "Not needed")}
          </dl>
          <div className="button-row"><Button loading={busy === "model"} disabled={Boolean(busy)} onClick={() => void test("model")}>{busy === "model" ? "Testing the model..." : "Test the model"}</Button></div>
          {testLine(tests.model)}
        </section>

        <section className="workspace-panel" aria-labelledby="settings-search">
          <div className="section-heading"><div><h2 id="settings-search">Web search</h2><p className="muted">Tried in order, as Odysseus does: the first provider, then each fallback when one fails or finds nothing. A provider missing its key is skipped.</p></div></div>
          <ol className="search-chain">
            {s.search.chain.map((p, i) => <li key={p.id} className={p.usable ? "" : "is-off"}>
              <span className="search-chain-name">{SEARCH_PROVIDERS[p.id].label}</span>
              <span className="muted">{i === 0 ? "First" : "Fallback " + i}</span>
              {p.usable ? <Tag tone="ok">Ready</Tag> : <Tag tone="warn">Needs {p.missing.join(", ")}</Tag>}
              <span className="muted search-chain-note">{SEARCH_PROVIDERS[p.id].note}{p.id === "searxng" ? " At " + s.search.searxngUrl + "." : ""}</span>
            </li>)}
          </ol>
          <dl className="context-list">
            {row("Order", ENV.searchProvider + ", " + ENV.searchFallback, [s.search.provider, ...s.search.fallback].join(" then "))}
            {row("Default time window", ENV.searchTime, s.search.timeFilter ? "Past " + s.search.timeFilter + " (the agent can ask for another)" : "Any date")}
            {(["tavily", "brave", "serper", "google"] as const).filter((k) => s.search.keyHints[k]).map((k) => row(SEARCH_PROVIDERS[k].label + " key", SEARCH_ENV[k], "Set, " + s.search.keyHints[k]))}
          </dl>
          <div className="button-row"><Button loading={busy === "search"} disabled={Boolean(busy)} onClick={() => void test("search")}>{busy === "search" ? "Testing the search..." : "Test the search"}</Button></div>
          {testLine(tests.search)}
        </section>

        <section className="workspace-panel" aria-labelledby="settings-limits">
          <div className="section-heading"><div><h2 id="settings-limits">Limits per run</h2><p className="muted">They cap what one agent search can spend. Each model turn and each search is a paid call on most providers.</p></div></div>
          <dl className="context-list">
            {row("Model turns", ENV.maxSteps, String(s.maxSteps))}
            {row("Postings kept", ENV.maxPostings, String(s.maxPostings))}
          </dl>
        </section>
      </> : error ? null : <p className="muted settings-loading"><Spinner size={14} decorative /> Loading settings from the local API...</p>}
    </Page>
  );
}
