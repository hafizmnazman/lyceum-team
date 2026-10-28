/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Made on first use, not on import: the proofs load the store in Node, where Vite's variables do not exist.
let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env?.VITE_SUPABASE_URL,
    key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env, then restart npm run dev.",
    );
  client = createClient(url, key, {
    auth: {
      flowType: "pkce", // links come back as ?code=…, which leaves Lyceum's #/hash routes alone
      detectSessionInUrl: true, // finishes a Google sign-in on page load
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return client;
}
