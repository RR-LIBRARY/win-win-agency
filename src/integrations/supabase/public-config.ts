// Publishable (anon) Supabase config for the "Win Win Agency" project.
// These two values are public by design and also appear in ./client.ts.
// They act as a fallback so server code keeps working right after the project
// is moved to another workspace, before SUPABASE_* env vars are linked again.
export const FALLBACK_SUPABASE_URL = "https://cgygrzuacnbuilqyqemk.supabase.co";
export const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneWdyenVhY25idWlscXlxZW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTYxMjAsImV4cCI6MjEwNTgzMjEyMH0.LtDp31-4Q38vfzzV3nFVX9mEpTXpWB5RKCx_Gf9qCLo";

export function resolveSupabasePublicEnv() {
  return {
    url: process.env["SUPABASE_URL"] || FALLBACK_SUPABASE_URL,
    key: process.env["SUPABASE_PUBLISHABLE_KEY"] || FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  };
}
