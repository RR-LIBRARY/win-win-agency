import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  displayName: string;
};

async function fetchIsAdmin(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

/** Browser-only auth state. Safe to call during SSR: it reports `loading` until hydrated. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    isAdmin: false,
    displayName: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function apply(session: Session | null) {
      const user = session?.user ?? null;
      const isAdmin = user ? await fetchIsAdmin(user.id) : false;
      if (cancelled) return;
      const meta = (user?.user_metadata ?? {}) as { full_name?: string };
      setState({
        loading: false,
        session,
        user,
        isAdmin,
        displayName: meta.full_name || user?.email?.split("@")[0] || "",
      });
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void apply(session);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
}
