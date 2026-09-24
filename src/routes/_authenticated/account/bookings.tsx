import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { BookingStatusBadge, formatDate } from "@/components/site/StatusBadge";
import { findAddOns, formatPrice } from "@/data/services";
import { myBookings } from "@/lib/booking.functions";

export const Route = createFileRoute("/_authenticated/account/bookings")({
  component: MyBookingsPage,
});

const statusHelp: Record<string, string> = {
  new: "We've received it and will contact you within one working day.",
  contacted: "We've been in touch — check email or WhatsApp for the kickoff call.",
  in_progress: "Your project is being built. You'll get a live link to follow along.",
  completed: "Delivered. Thank you for working with us!",
  cancelled: "This booking was cancelled.",
};

function MyBookingsPage() {
  const bookings = useQuery({ queryKey: ["my-bookings"], queryFn: () => myBookings() });

  if (bookings.isLoading) return <PanelLoading rows={3} />;
  if (bookings.error) return <PanelError error={bookings.error} />;
  const list = bookings.data ?? [];

  if (list.length === 0) {
    return (
      <PanelEmpty
        title="No bookings yet"
        text="Project bookings you send while signed in appear here with their status."
        action={
          <Link to="/book" className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Book your work
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {list.map((booking) => {
        const addOns = findAddOns(booking.add_on_ids);
        return (
          <PanelCard key={booking.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold text-foreground">
                  {booking.service_name} · {booking.package_name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {booking.reference} · sent {formatDate(booking.created_at)}
                </p>
              </div>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{statusHelp[booking.status] ?? ""}</p>

            <dl className="mt-4 grid gap-2 rounded-xl border border-border bg-secondary/50 p-4 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Package</dt>
                <dd className="text-foreground">{formatPrice(booking.package_price)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Add-ons</dt>
                <dd className="text-foreground">{formatPrice(booking.add_ons_total)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Setup charge</dt>
                <dd className="text-foreground">{formatPrice(booking.setup_fee)}</dd>
              </div>
              <div className="flex justify-between gap-3 font-medium">
                <dt className="text-foreground">Estimated total</dt>
                <dd className="text-foreground">{formatPrice(booking.total)}</dd>
              </div>
            </dl>
            {addOns.length > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Add-ons: {addOns.map((a) => a.label).join(", ")}</p>
            ) : null}
            {booking.admin_note ? (
              <p className="mt-3 rounded-lg border border-border p-3 text-sm text-foreground">
                <span className="font-medium">From our team:</span> {booking.admin_note}
              </p>
            ) : null}
          </PanelCard>
        );
      })}
    </div>
  );
}
