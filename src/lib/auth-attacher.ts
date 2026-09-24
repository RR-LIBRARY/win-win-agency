import { createMiddleware } from "@tanstack/react-start";

/**
 * Client-side function middleware: attaches the current Supabase session's
 * access token to every server-function call so `requireSupabaseAuth`
 * (and optional-auth helpers) can identify the user.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    if (typeof window !== "undefined") {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token;
      } catch {
        token = undefined;
      }
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
