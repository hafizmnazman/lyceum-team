// Watch on a schedule (api/watch.ts): the signed-in account's schedule and runs for one course. Each call carries the
// Supabase session's token, which the API checks, so a demo person (no account) is told to sign in.
import type { WatchAnswer } from "../../../shared/agents/client.ts";
import { supabase } from "../lib/supabase.ts";

/** One call to the watch API; any failure comes back as an error to show, never thrown. */
export async function watchApi(subjectId: string, method: "GET" | "PUT" | "DELETE" | "POST", path = "", body?: unknown, timeoutMs = 30000): Promise<WatchAnswer & { ok: boolean }> {
  try {
    const { data: { session } } = await supabase().auth.getSession();
    const headers: Record<string, string> = body ? { "content-type": "application/json" } : {};
    if (session) headers.authorization = "Bearer " + session.access_token;
    const res = await fetch("/api/watch/" + encodeURIComponent(subjectId) + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs) });
    const answer = ((await res.json().catch(() => null)) ?? {}) as WatchAnswer;
    return { ...answer, ok: res.ok, error: res.ok ? undefined : answer.error ?? "Watching answered HTTP " + res.status + "." };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") return { ok: false, error: "The run is taking long; it continues on the server. Refresh in a while." };
    if (err instanceof Error && err.message.startsWith("Set VITE_SUPABASE")) return { ok: false, error: err.message };
    return { ok: false, error: "The local API is not reachable. Start it with npm run dev." };
  }
}
