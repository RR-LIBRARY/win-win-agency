import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicClient } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";

export const SETTING_DEFAULTS = {
  edutech_demo_url: "https://jsrcoaching.vercel.app/",
  edutech_demo_label: "JSR Coaching — live demo",
  contact_email: "hello@winwindigital.example",
  contact_whatsapp: "910000000000",
  business_hours: "Mon–Sat, 10am–7pm IST",
  store_announcement: "",
  business_legal_name: "Win Win Digital Agency",
  business_address: "",
  business_landmark: "",
  business_map_url: "",
  business_map_embed_url: "",
  business_gstin: "",
  payment_upi_id: "",
  payment_bank_details: "",
  refund_policy: "7-day refund if the product doesn't work as described. Licence keys are revoked on refund.",
  grievance_officer_name: "",
  grievance_officer_email: "",
  grievance_officer_phone: "",
  assistant_extra_knowledge: "",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SiteSettings = Record<SettingKey, string>;

export const SETTING_LABELS: Record<SettingKey, string> = {
  edutech_demo_url: "EdTech live demo link",
  edutech_demo_label: "EdTech demo button text",
  contact_email: "Contact email",
  contact_whatsapp: "WhatsApp number (country code + number, digits only)",
  business_hours: "Business hours",
  store_announcement: "Store announcement bar (leave empty to hide)",
  business_legal_name: "Legal business name (printed on invoices)",
  business_address: "Business address (printed on invoices, contact page and told by the AI assistant)",
  business_landmark: "Landmark / how to reach (e.g. 'Opposite City Mall, 2nd floor')",
  business_map_url: "Google Maps link for directions (Share → Copy link)",
  business_map_embed_url: "Google Maps embed link (Share → Embed a map → copy the src=\"…\" URL only)",
  business_gstin: "Business GSTIN (leave empty if not registered)",
  payment_upi_id: "UPI ID for bank-transfer orders (e.g. name@upi)",
  payment_bank_details: "Bank account details for bank-transfer orders",
  refund_policy: "Refund policy summary (shown at checkout and on receipts)",
  grievance_officer_name: "Grievance officer — name (required by the Consumer Protection E-Commerce Rules)",
  grievance_officer_email: "Grievance officer — email",
  grievance_officer_phone: "Grievance officer — phone",
  assistant_extra_knowledge: "Extra facts for the AI assistant (fees, batch timings, FAQs — one per line)",
};

/** Setting keys whose values must be https links when filled. */
export const URL_SETTING_KEYS: SettingKey[] = ["edutech_demo_url", "business_map_url", "business_map_embed_url"];

/** Resolved contact points for the legal pages: grievance officer falls back to the main contact. */
export function grievanceContact(settings: SiteSettings) {
  const email = settings.grievance_officer_email.trim() || settings.contact_email;
  const phone = settings.grievance_officer_phone.trim();
  const name = settings.grievance_officer_name.trim() || "Grievance Officer";
  return { name, email, phone };
}

const settingKeys = Object.keys(SETTING_DEFAULTS) as SettingKey[];

export function withDefaults(rows: { key: string; value: string }[]): SiteSettings {
  const result: SiteSettings = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    if ((settingKeys as string[]).includes(row.key)) {
      result[row.key as SettingKey] = row.value;
    }
  }
  return result;
}

export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error) {
      console.error("[settings] read failed", error.message);
      return { ...SETTING_DEFAULTS };
    }
    return withDefaults(data ?? []);
  },
);

export const siteSettingsQuery = queryOptions({
  queryKey: ["site-settings"],
  queryFn: () => getSiteSettings(),
  staleTime: 5 * 60 * 1000,
});

const updateSchema = z.object({
  entries: z
    .array(
      z.object({
        key: z.enum(settingKeys as [SettingKey, ...SettingKey[]]),
        value: z.string().max(2000),
      }),
    )
    .min(1),
});

export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    for (const entry of data.entries) {
      const value = entry.value.trim();
      if (URL_SETTING_KEYS.includes(entry.key) && value && !/^https?:\/\/[^\s<>"']+$/i.test(value)) {
        throw new Error(`${SETTING_LABELS[entry.key]} must be a plain link starting with https://`);
      }
      if (entry.key === "business_map_embed_url" && value && !/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(value) && !/^https:\/\/maps\.google\.[a-z.]+\/maps/i.test(value)) {
        throw new Error("The embed link must be the Google Maps embed URL (starts with https://www.google.com/maps/embed)");
      }
    }
    const rows = data.entries.map((entry) => ({
      key: entry.key,
      value: entry.value.trim(),
      label: SETTING_LABELS[entry.key],
    }));
    const { error } = await context.supabase
      .from("site_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true, savedAt: new Date().toISOString() };
  });
