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
};

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
      if (entry.key === "edutech_demo_url" && entry.value && !/^https?:\/\//i.test(entry.value)) {
        throw new Error("The demo link must start with http:// or https://");
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
