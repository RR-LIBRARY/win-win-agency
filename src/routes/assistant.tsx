import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Briefcase, UserRound } from "lucide-react";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { ASSISTANT_MODES, type AssistantModeId } from "@/lib/assistant/modes";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Ask the Win Win Digital assistant about product prices, service fees, address & directions, delivery and refunds — or get step-by-step doubt solving in Hindi or English.",
      },
      { property: "og:title", content: "AI Assistant — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Instant answers on rates, directions, orders and study doubts — Hindi ya English.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

const MODE_ICONS = { business: Briefcase, personal: UserRound, doubt: GraduationCap } as const;

function AssistantPage() {
  const [mode, setMode] = useState<AssistantModeId>("business");
  const auth = useAuth();
  const active = ASSISTANT_MODES.find((m) => m.id === mode) ?? ASSISTANT_MODES[0];
  const needsSignIn = active.requiresAuth && !auth.user;

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-5 py-10 md:py-14" style={{ minHeight: "calc(100dvh - 4rem)" }}>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">AI Assistant</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Poochho — jawab turant.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Live prices, service fees, address &amp; directions, delivery and refund rules — or step-by-step doubt solving.
          Hindi, Hinglish ya English.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {ASSISTANT_MODES.map((m) => {
          const Icon = MODE_ICONS[m.id];
          const selected = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <p className="mt-2 text-sm font-semibold text-foreground">{m.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.tagline}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        {needsSignIn ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <UserRound className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sign in to use the personal agent</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              It reads your orders, payment status, licence keys and bookings — securely, from your own account.
            </p>
            <Link
              to="/auth"
              className="mt-2 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <AssistantChat key={mode} mode={mode} page="/assistant" />
        )}
      </div>
    </div>
  );
}
