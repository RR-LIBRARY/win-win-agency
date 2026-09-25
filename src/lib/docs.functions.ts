import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOptionalUserClient, createPublicClient } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { timingSafeEqualHex } from "./payments/signatures";
import { asExt, isMissingTableError, type ProductDocRow } from "./db-ext";
import { detectDocProvider, normaliseDocUrl } from "./doc-links";

export type ProductDoc = Pick<ProductDocRow, "id" | "title" | "kind" | "url" | "provider" | "content_md" | "visibility" | "sort_order">;

const DOC_COLUMNS = "id, title, kind, url, provider, content_md, visibility, sort_order";

/** Public docs of a published product (product page "Documentation" section). */
export const listProductDocs = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ templateId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<{ available: boolean; docs: ProductDoc[]; buyerOnlyCount: number }> => {
    const supabase = asExt(createPublicClient());
    const { data: rows, error } = await supabase
      .from("product_docs")
      .select(DOC_COLUMNS)
      .eq("template_id", data.templateId)
      .eq("visibility", "public")
      .order("sort_order", { ascending: true })
      .limit(30);
    if (error) {
      if (isMissingTableError(error)) return { available: false, docs: [], buyerOnlyCount: 0 };
      throw new Error(error.message);
    }
    // Buyer-only docs are invisible to anon RLS; count them with the service role so the
    // product page can honestly say "2 more guides unlock after purchase".
    let buyerOnlyCount = 0;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await asExt(supabaseAdmin)
        .from("product_docs")
        .select("id", { count: "exact", head: true })
        .eq("template_id", data.templateId)
        .eq("visibility", "buyers");
      buyerOnlyCount = count ?? 0;
    } catch {
      buyerOnlyCount = 0;
    }
    return { available: true, docs: rows ?? [], buyerOnlyCount };
  });

export const productDocsQuery = (templateId: string) =>
  queryOptions({
    queryKey: ["docs", "product", templateId],
    queryFn: () => listProductDocs({ data: { templateId } }),
    staleTime: 10 * 60 * 1000,
  });

// ---------- buyer: every doc (public + buyers-only) for a paid order ----------

export const listOrderDocs = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid(), accessToken: z.string().max(80).optional() }).parse(input))
  .handler(async ({ data }): Promise<ProductDoc[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = await createOptionalUserClient();
    const admin = asExt(supabaseAdmin);
    const { data: order, error } = await admin
      .from("orders")
      .select("id, template_id, user_id, status, access_token")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    const tokenOk = Boolean(data.accessToken) && timingSafeEqualHex(order.access_token, data.accessToken ?? "");
    const userOk = Boolean(userId) && order.user_id === userId;
    if (!tokenOk && !userOk) throw new Error("You don't have access to this order");
    if (order.status !== "paid" && order.status !== "delivered") return [];
    const { data: rows, error: docsError } = await admin
      .from("product_docs")
      .select(DOC_COLUMNS)
      .eq("template_id", order.template_id)
      .order("sort_order", { ascending: true })
      .limit(50);
    if (docsError) {
      if (isMissingTableError(docsError)) return [];
      throw new Error(docsError.message);
    }
    return rows ?? [];
  });

export const orderDocsQuery = (orderId: string, accessToken?: string) =>
  queryOptions({
    queryKey: ["docs", "order", orderId, accessToken ?? ""],
    queryFn: () => listOrderDocs({ data: { orderId, ...(accessToken ? { accessToken } : {}) } }),
    staleTime: 5 * 60 * 1000,
  });

// ---------- admin ----------

export const adminListDocs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ templateId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ available: boolean; docs: ProductDocRow[] }> => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await asExt(context.supabase)
      .from("product_docs")
      .select("*")
      .eq("template_id", data.templateId)
      .order("sort_order", { ascending: true });
    if (error) {
      if (isMissingTableError(error)) return { available: false, docs: [] };
      throw new Error(error.message);
    }
    return { available: true, docs: rows ?? [] };
  });

const docInputSchema = z.object({
  id: z.string().uuid().optional(),
  templateId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  kind: z.enum(["link", "markdown"]),
  url: z.string().trim().max(1000),
  content_md: z.string().max(40_000),
  visibility: z.enum(["public", "buyers"]),
  sort_order: z.number().int().min(0).max(999),
});

export type DocInput = z.input<typeof docInputSchema>;

export const adminSaveDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => docInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const { id, templateId, ...rest } = data;
    let url = "";
    let provider = "";
    if (rest.kind === "link") {
      const clean = normaliseDocUrl(rest.url);
      if (!clean) throw new Error("Paste a full https:// link (Google Doc, Notion, Drive, GitHub, PDF…).");
      url = clean;
      provider = detectDocProvider(clean);
    } else if (!rest.content_md.trim()) {
      throw new Error("Write the guide text (Markdown is supported).");
    }
    const row = {
      template_id: templateId,
      title: rest.title,
      kind: rest.kind,
      url,
      provider,
      content_md: rest.kind === "markdown" ? rest.content_md : "",
      visibility: rest.visibility,
      sort_order: rest.sort_order,
    };
    const s = asExt(context.supabase);
    if (id) {
      const { error } = await s.from("product_docs").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: inserted, error } = await s.from("product_docs").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const adminDeleteDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await asExt(context.supabase).from("product_docs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
