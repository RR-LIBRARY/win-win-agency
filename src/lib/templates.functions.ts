import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicClient } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { DELIVERY_TYPE_IDS, PRODUCT_TYPE_IDS, type DeliverableRow, type TemplateRow } from "./db-types";

// `*` keeps the store working while new optional columns roll out; the row type is the public contract.
const PUBLIC_COLUMNS = "*";

export type PublicTemplate = TemplateRow;

export const listTemplates = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicTemplate[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("templates")
      .select(PUBLIC_COLUMNS)
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PublicTemplate[];
  },
);

export const templatesQuery = queryOptions({
  queryKey: ["templates", "published"],
  queryFn: () => listTemplates(),
  staleTime: 60 * 1000,
});

export const getTemplateBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }): Promise<{ template: PublicTemplate; related: PublicTemplate[] } | null> => {
    const supabase = createPublicClient();
    const { data: template, error } = await supabase
      .from("templates")
      .select(PUBLIC_COLUMNS)
      .eq("is_published", true)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!template) return null;

    const { data: related } = await supabase
      .from("templates")
      .select(PUBLIC_COLUMNS)
      .eq("is_published", true)
      .neq("id", template.id)
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(3);

    return { template: template as PublicTemplate, related: (related ?? []) as PublicTemplate[] };
  });

export const templateQuery = (slug: string) =>
  queryOptions({
    queryKey: ["templates", "slug", slug],
    queryFn: () => getTemplateBySlug({ data: { slug } }),
    staleTime: 60 * 1000,
  });

// ---------- admin ----------

export const adminListTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TemplateRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("templates")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(
    async ({ data, context }): Promise<{ template: TemplateRow; deliverable: DeliverableRow | null } | null> => {
      await assertAdmin(context.supabase, context.userId);
      const { data: template, error } = await context.supabase
        .from("templates")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!template) return null;
      const { data: deliverable } = await context.supabase
        .from("template_deliverables")
        .select("*")
        .eq("template_id", data.id)
        .maybeSingle();
      return { template, deliverable: deliverable ?? null };
    },
  );

const faqSchema = z.array(z.object({ q: z.string().min(1), a: z.string().min(1) }));

const tierSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Tier id: lowercase letters, numbers, hyphens"),
  name: z.string().min(1).max(60),
  price: z.number().int().min(0).max(10_000_000),
  compare_at_price: z.number().int().min(0).max(10_000_000).nullable(),
  description: z.string().max(300),
  includes: z.array(z.string().min(1).max(200)).max(20),
});

const changelogSchema = z.object({
  version: z.string().min(1).max(40),
  date: z.string().max(40),
  notes: z.array(z.string().min(1).max(300)).max(20),
});

const optionalUrl = z
  .string()
  .max(1000)
  .nullable()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), "Must be a full https:// link");

const templateInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  title: z.string().min(2).max(120),
  tagline: z.string().max(200),
  description: z.string().max(8000),
  category: z.string().min(1).max(40),
  product_type: z.enum(PRODUCT_TYPE_IDS),
  delivery_type: z.enum(DELIVERY_TYPE_IDS),
  external_url: optionalUrl,
  external_platform: z.string().max(40),
  price: z.number().int().min(0).max(10_000_000),
  compare_at_price: z.number().int().min(0).max(10_000_000).nullable(),
  tiers: z.array(tierSchema).max(6),
  cover_image_url: optionalUrl,
  gallery_urls: z.array(z.string().url()).max(12),
  includes: z.array(z.string().min(1).max(200)).max(30),
  highlights: z.array(z.string().min(1).max(200)).max(10),
  preview_url: optionalUrl,
  demo_url: optionalUrl,
  video_url: optionalUrl,
  docs_url: optionalUrl,
  version: z.string().max(40),
  platforms: z.array(z.string().min(1).max(40)).max(12),
  tech_stack: z.array(z.string().min(1).max(40)).max(20),
  requirements: z.array(z.string().min(1).max(200)).max(20),
  changelog: z.array(changelogSchema).max(50),
  license_terms: z.string().max(5000),
  file_size: z.string().max(40),
  faq: faqSchema.max(20),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.number().int().min(0).max(9999),
  deliverable: z.object({
    duplicate_url: z.string().max(1000),
    guide_url: z.string().max(1000),
    download_url: z.string().max(1000),
    download_path: z.string().max(400),
    access_url: z.string().max(1000),
    issue_license: z.boolean(),
    license_max_activations: z.number().int().min(0).max(1000),
    notes: z.string().max(5000),
  }),
});

export type TemplateInput = z.input<typeof templateInputSchema>;

export const adminSaveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => templateInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const { deliverable, id, ...fields } = data;
    if (fields.delivery_type === "external") {
      if (!fields.external_url || !/^https:\/\//i.test(fields.external_url)) {
        throw new Error("Paste the https:// link of the external product page");
      }
    } else {
      fields.external_url = null;
      fields.external_platform = "";
    }
    const tierIds = new Set<string>();
    for (const tier of fields.tiers) {
      if (tierIds.has(tier.id)) throw new Error(`Duplicate pricing tier id "${tier.id}"`);
      tierIds.add(tier.id);
    }

    let templateId = id;
    if (templateId) {
      const { error } = await context.supabase.from("templates").update(fields).eq("id", templateId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("templates")
        .insert(fields)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      templateId = inserted.id;
    }

    const { error: delivError } = await context.supabase
      .from("template_deliverables")
      .upsert({ template_id: templateId, ...deliverable }, { onConflict: "template_id" });
    if (delivError) throw new Error(delivError.message);

    return { id: templateId };
  });

/**
 * Admin-only: signed upload target inside the private `product-files` bucket.
 * The browser uploads directly with the returned token; nothing is public.
 */
export const adminCreateProductUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        templateId: z.string().uuid(),
        filename: z.string().min(1).max(160),
        size: z.number().int().min(1).max(50 * 1024 * 1024),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "file";
    const path = `${data.templateId}/${Date.now()}-${safeName}`;
    const { data: signed, error } = await supabaseAdmin.storage.from("product-files").createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Could not prepare the upload");
    return { path, token: signed.token };
  });

export const adminDeleteProductFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string().min(1).max(400) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("product-files").remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { count } = await context.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("template_id", data.id);
    if ((count ?? 0) > 0) {
      const { error } = await context.supabase
        .from("templates")
        .update({ is_published: false })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { deleted: false, unpublished: true };
    }
    const { error } = await context.supabase.from("templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { deleted: true, unpublished: false };
  });
