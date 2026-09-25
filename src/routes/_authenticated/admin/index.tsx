import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { PanelCard, PanelError, PanelLoading, StatTile } from "@/components/panel/PanelShell";
import { BookingStatusBadge, OrderStatusBadge, formatDate } from "@/components/site/StatusBadge";
import { formatPrice } from "@/data/services";
import { getAdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });

  if (overview.isLoading) return <PanelLoading rows={4} />;
  if (overview.error || !overview.data) return <PanelError error={overview.error} />;
  const data = overview.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Store revenue" value={formatPrice(data.orders.revenue)} hint={`${data.orders.delivered} delivered · ${data.orders.paid} paid`} />
        <StatTile label="Orders awaiting payment" value={String(data.orders.pending)} hint={`${data.orders.total} orders total`} />
        <StatTile label="Open bookings" value={String(data.bookings.open)} hint={`Pipeline ${formatPrice(data.bookings.pipeline)}`} />
        <StatTile label="Customers" value={String(data.customers)} hint={`${data.templates.published}/${data.templates.total} products live`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/admin/templates/$id" params={{ id: "new" }} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New template
        </Link>
        <Link to="/admin/settings" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
          Change EdTech demo link
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard
          title="Latest orders"
          actions={
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              All orders <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{order.template_title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.buyer_name} · {order.reference} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-foreground">{formatPrice(order.amount)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title="Latest bookings"
          actions={
            <Link to="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              All bookings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentBookings.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {booking.service_name} · {booking.package_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {booking.name} · {booking.reference} · {formatDate(booking.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-foreground">{formatPrice(booking.total)}</span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
