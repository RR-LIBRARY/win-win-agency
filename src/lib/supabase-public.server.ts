import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import { resolveSupabasePublicEnv } from "@/integrations/supabase/public-config";


function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function env() {
  const { url, key } = resolveSupabasePublicEnv();
  if (!url || !key) throw new Error("Supabase server environment is not configured");
  return { url, key };
}


/** Anonymous client — only sees rows allowed by `TO anon` policies. */
export function createPublicClient(): SupabaseClient<Database> {
  const { url, key } = env();
  return createClient<Database>(url, key, {
    global: { fetch: supabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Build a client for an explicit bearer token. Returns the anonymous client
 * when the token is missing or invalid. Used by server routes that read the
 * Authorization header themselves (e.g. the assistant API).
 */
export async function createClientForToken(token: string | null | undefined): Promise<{
  supabase: SupabaseClient<Database>;
  userId: string | null;
}> {
  const { url, key } = env();
  if (token && token.split(".").length === 3) {
    const supabase = createClient<Database>(url, key, {
      global: { fetch: supabaseFetch(key), headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (!error && data?.claims?.sub) {
      return { supabase, userId: data.claims.sub };
    }
  }
  return { supabase: createPublicClient(), userId: null };
}

/**
 * Client for public server functions that *may* be called by a signed-in user.
 * If a valid bearer token is on the request, RLS runs as that user and
 * `userId` is set; otherwise it behaves like the anonymous client.
 */
export async function createOptionalUserClient(): Promise<{
  supabase: SupabaseClient<Database>;
  userId: string | null;
}> {
  const request = getRequest();
  const header = request?.headers?.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return createClientForToken(token);
}

export function makeReference(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
}
