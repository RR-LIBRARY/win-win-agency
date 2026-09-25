import { Link } from "@tanstack/react-router";
import { Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import logoMark from "@/assets/logo-mark-sm.png";

const nav = [
  { to: "/services", label: "Services" },
  { to: "/store", label: "Store" },
  { to: "/portfolio", label: "Work" },
  { to: "/pricing", label: "Pricing" },
  { to: "/assistant", label: "Assistant" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const auth = useAuth();

  const accountLink = auth.user ? (
    <Link
      to={auth.isAdmin ? "/admin" : "/account"}
      onClick={() => setOpen(false)}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      {auth.isAdmin ? <ShieldCheck className="h-4 w-4 text-primary" /> : <UserRound className="h-4 w-4" />}
      {auth.isAdmin ? "Admin" : "Account"}
    </Link>
  ) : (
    <Link
      to="/auth"
      onClick={() => setOpen(false)}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      <UserRound className="h-4 w-4" /> Sign in
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <img src={logoMark} alt="" width={32} height={32} className="h-8 w-8" />

          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            Win Win <span className="text-muted-foreground">Digital</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex">{auth.loading ? null : accountLink}</span>
          <Link
            to="/book"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:inline-flex"
          >
            Book your work
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-5 py-3">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-muted-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 mb-2 flex flex-col gap-2">
              {auth.loading ? null : accountLink}
              <Link
                to="/book"
                onClick={() => setOpen(false)}
                className="inline-flex justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Book your work
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
