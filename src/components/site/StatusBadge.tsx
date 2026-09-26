import {
  BOOKING_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  type BookingStatus,
  type OrderStatus,
} from "@/lib/db-types";

const orderTone: Record<OrderStatus, string> = {
  pending_payment: "bg-chart-4/15 text-foreground",
  paid: "bg-accent text-accent-foreground",
  delivered: "bg-chart-2/15 text-foreground",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-destructive/10 text-destructive",
};

const bookingTone: Record<BookingStatus, string> = {
  new: "bg-accent text-accent-foreground",
  contacted: "bg-chart-4/15 text-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-chart-2/15 text-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const key = (status in orderTone ? status : "pending_payment") as OrderStatus;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${orderTone[key]}`}>
      {ORDER_STATUS_LABEL[key]}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: string }) {
  const key = (status in bookingTone ? status : "new") as BookingStatus;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${bookingTone[key]}`}>
      {BOOKING_STATUS_LABEL[key]}
    </span>
  );
}

/**
 * Dates are always shown in Indian time so the server (UTC on the host) and
 * the visitor's browser print the identical string — otherwise an order placed
 * just before midnight IST renders a different day on each side and React
 * flags a hydration mismatch.
 */
export const DISPLAY_TIME_ZONE = "Asia/Kolkata";

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  });
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  });
}
