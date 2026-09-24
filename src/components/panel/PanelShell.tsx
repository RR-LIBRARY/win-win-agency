import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type PanelNavItem = {
  to: LinkProps["to"];
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export function PanelShell({
  eyebrow,
  title,
  nav,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  nav: PanelNavItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{eyebrow}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Panel sections">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground font-medium" }}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function PanelCard({ title, description, children, actions }: { title?: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="font-display text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PanelLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
      ))}
    </div>
  );
}

export function PanelEmpty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PanelError({ error }: { error: unknown }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-foreground">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-muted-foreground">{error instanceof Error ? error.message : "Please refresh and try again."}</p>
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
