import type { Database } from "@/integrations/supabase/types";

export type TemplateRow = Database["public"]["Tables"]["templates"]["Row"];
export type TemplateInsert = Database["public"]["Tables"]["templates"]["Insert"];
export type DeliverableRow = Database["public"]["Tables"]["template_deliverables"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type SettingRow = Database["public"]["Tables"]["site_settings"]["Row"];

export type TemplateFaq = { q: string; a: string };

export const ORDER_STATUSES = ["pending_payment", "paid", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const BOOKING_STATUSES = ["new", "contacted", "in_progress", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const TEMPLATE_CATEGORIES = [
  { id: "productivity", label: "Productivity" },
  { id: "business", label: "Business & CRM" },
  { id: "creators", label: "Creators" },
  { id: "finance", label: "Finance" },
  { id: "education", label: "Education" },
  { id: "other", label: "Other" },
] as const;

export function categoryLabel(id: string) {
  return TEMPLATE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function parseFaq(value: unknown): TemplateFaq[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { q: string; a: string } => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return typeof record["q"] === "string" && typeof record["a"] === "string";
    })
    .map((item) => ({ q: item.q, a: item.a }));
}
