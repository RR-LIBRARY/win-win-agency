import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { PanelCard, PanelError, PanelLoading, StatTile } from "@/components/panel/PanelShell";
import { OrderStatusBadge, BookingStatusBadge, formatDate } from "@/components/site/StatusBadge";
import { formatPrice } from "@/data/services";
import { myOrders } from "@/lib/orders.functions";
import { myBookings } from "@/lib/booking.functions";

export const Route = createFileRoute("/_authenticated/account/")({
  component: AccountOverview,
});

function AccountOverview() {
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: () => myOrders() });
  const bookings = useQuery({ queryKey: ["my-bookings"], queryFn: () => myBookings() });

  if (orders.isLoading || bookings.isLoading) return <PanelLoading rows={4} />;
  if (orders.error) return <PanelError error={orders.error} />;
  if (bookings.error) return <PanelError error={bookings.error} />;

  const orderList = orders.data ?? [];
  const bookingList = bookings.data ?? [];
  const ready = orderList.filter((o) => o.status === "delivered").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Template orders" value={String(orderList.length)} hint={`${ready} ready to duplicate`} />
        <StatTile label="Project bookings" value={String(bookingList.length)} />
        <StatTile
          label="Awaiting payment"
          value={String(orderList.filter((o) => o.status === "pending_payment").length)}
          hint="We send payment details by email / WhatsApp"
        />
      </div>

      <PanelCard
        title="Recent orders"
        actions={
          <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {orderList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No template orders yet.{" "}
            <Link to="/templates" className="text-primary hover:underline">
              Browse the store
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {orderList.slice(0, 3).map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{order.template_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.reference} · {formatDate(order.created_at)} · {formatPrice(order.amount)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard
        title="Recent bookings"
        actions={
          <Link to="/account/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All bookings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {bookingList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No project bookings yet.{" "}
            <Link to="/book" className="text-primary hover:underline">
              Book your work
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {bookingList.slice(0, 3).map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    {booking.service_name} · {booking.package_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.reference} · {formatDate(booking.created_at)} · {formatPrice(booking.total)}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
