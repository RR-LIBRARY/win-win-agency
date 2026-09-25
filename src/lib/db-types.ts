import type { Database } from "@/integrations/supabase/types";

export type TemplateRow = Database["public"]["Tables"]["templates"]["Row"];
export type TemplateInsert = Database["public"]["Tables"]["templates"]["Insert"];
export type DeliverableRow = Database["public"]["Tables"]["template_deliverables"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type SettingRow = Database["public"]["Tables"]["site_settings"]["Row"];
export type LicenseRow = Database["public"]["Tables"]["license_keys"]["Row"];
export type PaymentEventRow = Database["public"]["Tables"]["payment_events"]["Row"];

export type TemplateFaq = { q: string; a: string };

export type ProductTier = {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  description: string;
  includes: string[];
};

export type ChangelogEntry = { version: string; date: string; notes: string[] };

export const ORDER_STATUSES = ["pending_payment", "paid", "delivered", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const BOOKING_STATUSES = ["new", "contacted", "in_progress", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PRODUCT_TYPES = [
  { id: "software", label: "Software", short: "App" },
  { id: "source_code", label: "Source code", short: "Source" },
  { id: "saas_tool", label: "SaaS tool", short: "SaaS" },
  { id: "mobile_app", label: "Mobile app", short: "Mobile" },
  { id: "plugin", label: "Plugin / extension", short: "Plugin" },
  { id: "notion_template", label: "Notion template", short: "Notion" },
  { id: "ebook", label: "E-book / book", short: "Book" },
  { id: "course", label: "Course / training", short: "Course" },
  { id: "service_gig", label: "Service / gig", short: "Service" },
  { id: "digital_asset", label: "Digital asset (design, audio, data)", short: "Asset" },
  { id: "other", label: "Other digital product", short: "Digital" },
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number]["id"];
export const PRODUCT_TYPE_IDS = PRODUCT_TYPES.map((p) => p.id) as [ProductType, ...ProductType[]];

export const DELIVERY_TYPES = [
  { id: "license", label: "License key + download", hint: "A license key is issued and files/links unlock after payment." },
  { id: "download", label: "Download", hint: "Files or a download link unlock after payment." },
  { id: "link", label: "Link (Notion duplicate / access URL)", hint: "A private link unlocks after payment." },
  { id: "access", label: "Hosted access", hint: "You provision access manually and mark the order delivered." },
  { id: "external", label: "Sold on another platform (Gumroad, Amazon, Fiverr…)", hint: "The buy button opens your external page. No checkout or delivery happens on this site." },
] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number]["id"];
export const DELIVERY_TYPE_IDS = DELIVERY_TYPES.map((d) => d.id) as [DeliveryType, ...DeliveryType[]];

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

export function productTypeLabel(id: string) {
  return PRODUCT_TYPES.find((p) => p.id === id)?.label ?? "Software";
}

export function productTypeShort(id: string) {
  return PRODUCT_TYPES.find((p) => p.id === id)?.short ?? "App";
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function parseFaq(value: unknown): TemplateFaq[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { q: string; a: string } => {
      if (!isRecord(item)) return false;
      return typeof item["q"] === "string" && typeof item["a"] === "string";
    })
    .map((item) => ({ q: item.q, a: item.a }));
}

/** Pricing tiers stored as JSON on the product. Empty array = single price. */
export function parseTiers(value: unknown): ProductTier[] {
  if (!Array.isArray(value)) return [];
  const tiers: ProductTier[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = typeof item["id"] === "string" ? item["id"].trim() : "";
    const name = typeof item["name"] === "string" ? item["name"].trim() : "";
    const price = typeof item["price"] === "number" && Number.isFinite(item["price"]) ? Math.round(item["price"]) : NaN;
    if (!id || !name || !Number.isFinite(price) || price < 0) continue;
    const compare = item["compare_at_price"];
    tiers.push({
      id,
      name,
      price,
      compare_at_price: typeof compare === "number" && compare > price ? Math.round(compare) : null,
      description: typeof item["description"] === "string" ? item["description"] : "",
      includes: stringArray(item["includes"]),
    });
  }
  return tiers;
}

export function parseChangelog(value: unknown): ChangelogEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: ChangelogEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const version = typeof item["version"] === "string" ? item["version"] : "";
    if (!version) continue;
    entries.push({
      version,
      date: typeof item["date"] === "string" ? item["date"] : "",
      notes: stringArray(item["notes"]),
    });
  }
  return entries;
}
