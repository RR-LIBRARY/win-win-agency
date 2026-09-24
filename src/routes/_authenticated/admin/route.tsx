import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ExternalLink, LayoutDashboard, NotebookPen, Package, Settings, Users } from "lucide-react";
import { PanelError, PanelLoading, PanelShell, type PanelNavItem } from "@/components/panel/PanelShell";
import { getMyAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Win Win Digital Agency" },
      { name: "description", content: "Manage templates, orders, bookings and site settings." },
      { property: "og:title", content: "Admin — Win Win Digital Agency" },
      { property: "og:description", content: "Agency control panel." },
    ],
  }),
  component: AdminLayout,
});

const nav: PanelNavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/templates", label: "Templates", icon: NotebookPen },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/settings", label: "Site settings", icon: Settings },
  { to: "/admin/team", label: "Team", icon: Users },
];

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const access = useQuery({ queryKey: ["my-access", user.id], queryFn: () => getMyAccess() });

  return (
    <PanelShell
      eyebrow="Admin panel"
      title="Win Win Digital"
      nav={nav}
      actions={
        <>
          <Link to="/templates" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            <ExternalLink className="h-4 w-4" /> View store
          </Link>
          <Link to="/account" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            My account
          </Link>
        </>
      }
    >
      {access.isLoading ? (
        <PanelLoading rows={4} />
      ) : access.error ? (
        <PanelError error={access.error} />
      ) : access.data?.isAdmin ? (
        <Outlet />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-foreground">Admin access needed</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is for the Win Win Digital team. If you should have access, ask an existing admin to add you from the Team page.
          </p>
          <Link to="/account" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Back to my account
          </Link>
        </div>
      )}
    </PanelShell>
  );
}
