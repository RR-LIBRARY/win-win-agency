import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = "signin" | "signup" | "forgot" | "reset";
type AuthSearch = { mode?: AuthMode | undefined; redirect?: string | undefined };

const modes: AuthMode[] = ["signin", "signup", "forgot", "reset"];

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: modes.includes(search["mode"] as AuthMode) ? (search["mode"] as AuthMode) : undefined,
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Win Win Digital Agency" },
      { name: "description", content: "Sign in to track your template orders and project bookings with Win Win Digital Agency." },
      { property: "og:title", content: "Sign in — Win Win Digital Agency" },
      { property: "og:description", content: "Track template orders and project bookings in one place." },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>(search.mode ?? "signin");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const redirectTo = safeRedirect(search.redirect);

  // Password recovery links land here with a recovery session.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.loading && auth.user && mode !== "reset") {
      void navigate({ to: redirectTo, replace: true });
    }
  }, [auth.loading, auth.user, mode, navigate, redirectTo]);

  /** Turn raw auth-server messages into something a buyer can act on. */
  function friendlyAuthError(message: string): { title: string; description: string; sticky: boolean } {
    const m = message.toLowerCase();
    if (m.includes("email logins are disabled") || m.includes("email signups are disabled") || m.includes("signups not allowed")) {
      return {
        title: "Email sign-in is switched off right now",
        description:
          "The account system has email login disabled, so no password can work yet. Site admin: enable the Email provider (Authentication → Sign In / Providers → Email) in the connected account project. Until then, use WhatsApp or the contact page — orders still work as guest checkout.",
        sticky: true,
      };
    }
    if (m.includes("invalid login credentials")) {
      return { title: "Wrong email or password", description: "Check both and try again, or use “Forgot password?”.", sticky: false };
    }
    if (m.includes("email not confirmed")) {
      return { title: "Confirm your email first", description: "Open the confirmation link we emailed you, then sign in.", sticky: true };
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return { title: "Too many attempts", description: "Please wait a minute before trying again.", sticky: false };
    }
    if (m.includes("password should be") || m.includes("weak password")) {
      return { title: "Choose a stronger password", description: message, sticky: false };
    }
    if (m.includes("already registered") || m.includes("already been registered")) {
      return { title: "This email already has an account", description: "Sign in instead, or reset the password.", sticky: false };
    }
    if (m.includes("failed to fetch") || m.includes("network")) {
      return { title: "No connection", description: "Check your internet (aeroplane mode off?) and try again.", sticky: false };
    }
    return { title: "That didn't work", description: message || "Please try again.", sticky: false };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, phone },
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created");
          await navigate({ to: redirectTo, replace: true });
        } else {
          setNotice("Check your email and click the confirmation link, then sign in.");
          setMode("signin");
        }
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await navigate({ to: redirectTo, replace: true });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated");
        await navigate({ to: "/account", replace: true });
      }
    } catch (error) {
      const friendly = friendlyAuthError(error instanceof Error ? error.message : "");
      toast.error(friendly.title, { description: friendly.description, duration: friendly.sticky ? 12000 : 5000 });
      if (friendly.sticky) setNotice(friendly.description);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "forgot"
        ? "Reset your password"
        : mode === "reset"
          ? "Choose a new password"
          : "Welcome back";

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
      <div className="hidden md:block">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Your account</p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-semibold text-foreground">
          Orders, downloads and bookings in one place.
        </h1>
        <ul className="mt-6 space-y-3 text-muted-foreground">
          <li>• Template duplicate links unlock here after payment</li>
          <li>• Track every project booking and its status</li>
          <li>• Faster checkout next time — details are saved</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
        {mode === "signin" || mode === "signup" ? (
          <div className="mb-6 grid grid-cols-2 rounded-full bg-secondary p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={mode === "signin" ? "rounded-full bg-card py-2 font-medium text-foreground shadow-sm" : "py-2 text-muted-foreground"}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={mode === "signup" ? "rounded-full bg-card py-2 font-medium text-foreground shadow-sm" : "py-2 text-muted-foreground"}
            >
              Create account
            </button>
          </div>
        ) : null}

        <h2 className="font-display text-2xl font-semibold text-foreground">{title}</h2>

        {notice ? (
          <p className="mt-4 rounded-lg border border-border bg-secondary/60 p-3 text-sm text-foreground">{notice}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp number (optional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" />
              </div>
            </>
          ) : null}

          {mode !== "reset" ? (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
          ) : null}

          {mode !== "forgot" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{mode === "reset" ? "New password" : "Password"}</Label>
                {mode === "signin" ? (
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Save password" : "Sign in"}
          </button>
        </form>

        {mode === "forgot" ? (
          <button type="button" onClick={() => setMode("signin")} className="mt-4 text-sm text-primary hover:underline">
            Back to sign in
          </button>
        ) : null}

        <p className="mt-6 text-xs text-muted-foreground">
          By continuing you agree to be contacted about your orders and bookings.{" "}
          <Link to="/contact" className="text-primary hover:underline">
            Contact us
          </Link>{" "}
          with any question.
        </p>
      </div>
    </div>
  );
}
