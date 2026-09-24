import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { BookingStatusBadge, formatDate } from "@/components/site/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { findAddOns, formatPrice } from "@/data/services";
import { BOOKING_STATUSES, BOOKING_STATUS_LABEL, type BookingRow, type BookingStatus } from "@/lib/db-types";
import { adminListBookings, adminUpdateBooking } from "@/lib/booking.functions";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  component: AdminBookingsPage,
});

type Filter = "all" | BookingStatus;

function AdminBookingsPage() {
  const bookings = useQuery({ queryKey: ["admin-bookings"], queryFn: () => adminListBookings() });
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (bookings.data ?? []).filter((b) => {
      if (filter !== "all" && b.status !== filter) return false;
      if (!q) return true;
      return [b.reference, b.name, b.email, b.phone, b.company, b.service_name].some((v) => v.toLowerCase().includes(q));
    });
  }, [bookings.data, filter, search]);

  if (bookings.isLoading) return <PanelLoading rows={4} />;
  if (bookings.error) return <PanelError error={bookings.error} />;

  const counts = (bookings.data ?? []).reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", ...BOOKING_STATUSES] as Filter[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={
                filter === status
                  ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              {status === "all" ? `All (${bookings.data?.length ?? 0})` : `${BOOKING_STATUS_LABEL[status]} (${counts[status] ?? 0})`}
            </button>
          ))}
        </div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, name, email" className="md:w-72" />
      </div>

      {list.length === 0 ? (
        <PanelEmpty title="No bookings here" text="Project bookings from the Book page will appear in this list." />
      ) : (
        list.map((booking) => <BookingCard key={booking.id} booking={booking} />)
      )}
    </div>
  );
}

function BookingCard({ booking }: { booking: BookingRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<BookingStatus>(booking.status as BookingStatus);
  const [note, setNote] = useState(booking.admin_note);
  const addOns = findAddOns(booking.add_on_ids);

  const save = useMutation({
    mutationFn: () => adminUpdateBooking({ data: { id: booking.id, status, admin_note: note } }),
    onSuccess: async () => {
      toast.success("Booking updated");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error) => toast.error("Could not update", { description: error.message }),
  });

  const whatsapp = `https://wa.me/${booking.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${booking.name}, this is Win Win Digital about your booking ${booking.reference} (${booking.service_name} · ${booking.package_name}).`)}`;

  return (
    <PanelCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground">
            {booking.service_name} · {booking.package_name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {booking.reference} · {formatDate(booking.created_at)} · est. {formatPrice(booking.total)}
            {booking.deadline ? ` · target ${booking.deadline}` : ""}
            {booking.user_id ? " · has account" : " · guest"}
          </p>
          <p className="mt-2 text-sm text-foreground">
            {booking.name}
            {booking.company ? ` (${booking.company})` : ""} · <a href={`mailto:${booking.email}`} className="text-primary hover:underline">{booking.email}</a> · {booking.phone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            {open ? "Close" : "Update"}
          </button>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line rounded-xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">{booking.details}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Package {formatPrice(booking.package_price)} + add-ons {formatPrice(booking.add_ons_total)} + setup {formatPrice(booking.setup_fee)}
        {addOns.length > 0 ? ` · ${addOns.map((a) => a.label).join(", ")}` : ""}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`mailto:${booking.email}?subject=${encodeURIComponent(`Your booking ${booking.reference} — ${booking.service_name}`)}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
          <Mail className="h-3.5 w-3.5" /> Email
        </a>
        <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </a>
      </div>

      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="mt-4 grid gap-4 rounded-xl border border-border bg-secondary/50 p-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor={`status-${booking.id}`}>Status</Label>
            <select
              id={`status-${booking.id}`}
              value={status}
              onChange={(e) => setStatus(e.target.value as BookingStatus)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`note-${booking.id}`}>Note to the client (visible in their account)</Label>
            <Textarea id={`note-${booking.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kickoff call booked for Monday 11am…" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
            </button>
          </div>
        </form>
      ) : null}
    </PanelCard>
  );
}
