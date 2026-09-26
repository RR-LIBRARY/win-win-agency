import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOptionalUserClient, createPublicClient } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { enforceRateLimit } from "./rate-limit.server";
import { timingSafeEqualHex } from "./payments/signatures";
import { asExt, isMissingTableError, type ProductReviewRow, type ReviewStatus } from "./db-ext";
import { canReviewOrder, displayAuthor, summariseRatings, validateReview, REVIEW_LIMITS, type RatingSummary } from "./review-rules";

// ---------- public view models ----------

export type PublicReview = {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified_purchase: boolean;
  admin_reply: string;
  replied_at: string | null;
  created_at: string;
  /** Present on the cross-product home feed. */
  product?: { title: string; slug: string } | null;
};

export type ProductReviews = {
  /** false until the reviews table exists — UI hides the section. */
  available: boolean;
  summary: RatingSummary;
  reviews: PublicReview[];
};

function toPublic(row: ProductReviewRow, product?: { title: string; slug: string } | null): PublicReview {
  return {
    id: row.id,
    author: displayAuthor(row.author_name),
    rating: row.rating,
    title: row.title,
    body: row.body,
    verified_purchase: row.verified_purchase,
    admin_reply: row.admin_reply,
    replied_at: row.replied_at,
    created_at: row.created_at,
    product: product ?? null,
  };
}

// ---------- public: product page ----------

export const listProductReviews = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ templateId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<ProductReviews> => {
    const supabase = asExt(createPublicClient());
    const { data: rows, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("template_id", data.templateId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      if (isMissingTableError(error)) return { available: false, summary: summariseRatings([]), reviews: [] };
      throw new Error(error.message);
    }
    const list = rows ?? [];
    return { available: true, summary: summariseRatings(list.map((r) => r.rating)), reviews: list.map((r) => toPublic(r)) };
  });

export const productReviewsQuery = (templateId: string) =>
  queryOptions({
    queryKey: ["reviews", "product", templateId],
    queryFn: () => listProductReviews({ data: { templateId } }),
    staleTime: 5 * 60 * 1000,
  });

// ---------- public: home "what clients say" ----------

export const listFeaturedReviews = createServerFn({ method: "GET" }).handler(async (): Promise<PublicReview[]> => {
  const supabase = asExt(createPublicClient());
  const { data: rows, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("status", "approved")
    .gte("rating", 4)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }
  const list = rows ?? [];
  if (list.length === 0) return [];
  const ids = Array.from(new Set(list.map((r) => r.template_id)));
  const { data: templates } = await supabase.from("templates").select("id, title, slug").in("id", ids);
  const byId = new Map((templates ?? []).map((t) => [t.id, { title: t.title, slug: t.slug }]));
  return list.map((r) => toPublic(r, byId.get(r.template_id) ?? null));
});

export const featuredReviewsQuery = queryOptions({
  queryKey: ["reviews", "featured"],
  queryFn: () => listFeaturedReviews(),
  staleTime: 10 * 60 * 1000,
});

// ---------- buyer: order page ----------

const orderAccessSchema = z.object({
  orderId: z.string().uuid(),
  accessToken: z.string().max(80).optional(),
});

/** Order owner check shared by the guest (access key) and signed-in paths. */
async function loadOwnedOrder(orderId: string, accessToken?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { userId } = await createOptionalUserClient();
  const admin = asExt(supabaseAdmin);
  const { data: order, error } = await admin
    .from("orders")
    .select("id, template_id, template_title, user_id, status, access_token, buyer_name, paid_at")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Order not found");
  const tokenOk = Boolean(accessToken) && timingSafeEqualHex(order.access_token, accessToken ?? "");
  const userOk = Boolean(userId) && order.user_id === userId;
  if (!tokenOk && !userOk) throw new Error("You don't have access to this order");
  return { order, admin, userId };
}

export type OrderReviewState = {
  available: boolean;
  canReview: boolean;
  review: (Pick<ProductReviewRow, "id" | "rating" | "title" | "body" | "author_name" | "status" | "admin_reply" | "created_at"> & {
    product_slug: string | null;
  }) | null;
  suggestedName: string;
  productTitle: string;
};

export const getOrderReviewState = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => orderAccessSchema.parse(input))
  .handler(async ({ data }): Promise<OrderReviewState> => {
    const { order, admin } = await loadOwnedOrder(data.orderId, data.accessToken);
    const base = { suggestedName: order.buyer_name, productTitle: order.template_title };
    const { data: review, error } = await admin
      .from("product_reviews")
      .select("id, rating, title, body, author_name, status, admin_reply, created_at")
      .eq("order_id", order.id)
      .maybeSingle();
    if (error) {
      if (isMissingTableError(error)) return { ...base, available: false, canReview: false, review: null };
      throw new Error(error.message);
    }
    let slug: string | null = null;
    if (review) {
      const { data: t } = await admin.from("templates").select("slug").eq("id", order.template_id).maybeSingle();
      slug = t?.slug ?? null;
    }
    return {
      ...base,
      available: true,
      canReview: !review && canReviewOrder(order),
      review: review ? { ...review, product_slug: slug } : null,
    };
  });

export const orderReviewQuery = (orderId: string, accessToken?: string) =>
  queryOptions({
    queryKey: ["reviews", "order", orderId, accessToken ?? ""],
    queryFn: () => getOrderReviewState({ data: { orderId, ...(accessToken ? { accessToken } : {}) } }),
    staleTime: 30 * 1000,
  });

const submitSchema = orderAccessSchema.extend({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(REVIEW_LIMITS.maxTitle + 200),
  body: z.string().max(REVIEW_LIMITS.maxBody + 500),
  author_name: z.string().max(REVIEW_LIMITS.maxName + 100),
  accepted_terms: z.boolean(),
});

/**
 * One review per order, only for paid/delivered orders, always lands as
 * `pending` for moderation. The rating is stored exactly as given (BIS 19000:
 * moderation may hide a review but never edits the score).
 */
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    enforceRateLimit("review");
    const { order, admin, userId } = await loadOwnedOrder(data.orderId, data.accessToken);
    if (!canReviewOrder(order)) throw new Error("Reviews open once the order is paid.");
    const checked = validateReview(data);
    if (!checked.ok) throw new Error(checked.error);
    const { data: existing } = await admin.from("product_reviews").select("id").eq("order_id", order.id).maybeSingle();
    if (existing) throw new Error("You've already reviewed this order — thank you!");
    const { data: inserted, error } = await admin
      .from("product_reviews")
      .insert({
        template_id: order.template_id,
        order_id: order.id,
        user_id: order.user_id ?? userId ?? null,
        author_name: checked.value.author_name,
        rating: checked.value.rating,
        title: checked.value.title,
        body: checked.value.body,
        status: "pending",
        verified_purchase: true,
        accepted_terms: true,
      })
      .select("id, status")
      .single();
    if (error) {
      if (isMissingTableError(error)) throw new Error("Reviews aren't switched on yet — please try again later.");
      throw new Error(error.message);
    }
    return { id: inserted.id, status: inserted.status as ReviewStatus };
  });

// ---------- admin ----------

export type AdminReview = ProductReviewRow & { product_title: string; product_slug: string; order_reference: string; buyer_email: string };

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ status: z.enum(["all", "pending", "approved", "hidden"]).default("all") }).parse(input ?? {}))
  .handler(async ({ data, context }): Promise<{ available: boolean; reviews: AdminReview[] }> => {
    await assertAdmin(context.supabase, context.userId);
    const s = asExt(context.supabase);
    let query = s.from("product_reviews").select("*").order("created_at", { ascending: false }).limit(300);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) {
      if (isMissingTableError(error)) return { available: false, reviews: [] };
      throw new Error(error.message);
    }
    const list = rows ?? [];
    if (list.length === 0) return { available: true, reviews: [] };
    const templateIds = Array.from(new Set(list.map((r) => r.template_id)));
    const orderIds = list.map((r) => r.order_id);
    const [{ data: templates }, { data: orders }] = await Promise.all([
      s.from("templates").select("id, title, slug").in("id", templateIds),
      s.from("orders").select("id, reference, buyer_email").in("id", orderIds),
    ]);
    const tById = new Map((templates ?? []).map((t) => [t.id, t]));
    const oById = new Map((orders ?? []).map((o) => [o.id, o]));
    return {
      available: true,
      reviews: list.map((r) => ({
        ...r,
        product_title: tById.get(r.template_id)?.title ?? "—",
        product_slug: tById.get(r.template_id)?.slug ?? "",
        order_reference: oById.get(r.order_id)?.reference ?? "—",
        buyer_email: oById.get(r.order_id)?.buyer_email ?? "",
      })),
    };
  });

export const adminModerateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "hidden"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await asExt(context.supabase).from("product_reviews").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminReplyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), reply: z.string().trim().max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await asExt(context.supabase)
      .from("product_reviews")
      .update({ admin_reply: data.reply, replied_at: data.reply ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await asExt(context.supabase).from("product_reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
