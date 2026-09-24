import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, LayoutDashboard, LogOut, Package, ShieldCheck, UserRound } from "lucide-react";
import { PanelShell, type PanelNavItem } from "@/components/panel/PanelShell";
import { getMyAccess } from "@/lib/admin.functions";
import { signOut } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Win Win Digital Agency" },
      { name: "description", content: "Your template orders, downloads and project bookings." },
      { property: "og:title", content: "My account — Win Win Digital Agency" },
      { property: "og:description", content: "Orders, downloads and bookings in one place." },
    ],
  }),
  component: AccountLayout,
});

const nav: PanelNavItem[] = [
  { to: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/account/orders", label: "My orders", icon: Package },
  { to: "/account/bookings", label: "My bookings", icon: CalendarCheck },
  { to: "/account/profile", label: "Profile", icon: UserRound },
];

function AccountLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const access = useQuery({ queryKey: ["my-access", user.id], queryFn: () => getMyAccess() });
  const meta = (user.user_metadata ?? {}) as { full_name?: string };
  const name = meta.full_name || user.email?.split("@")[0] || "there";

  return (
    <PanelShell
      eyebrow="My account"
      title={`Hi ${name}`}
      nav={nav}
      actions={
        <>
          {access.data?.isAdmin ? (
            <Link to="/admin" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <ShieldCheck className="h-4 w-4" /> Admin panel
            </Link>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              await navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </>
      }
    >
      <Outlet />
    </PanelShell>
  );
}
