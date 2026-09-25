import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOptionalUserClient, makeReference } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { resolveCoupon } from "./coupons.server";
import { applyDiscount, resolvePrice } from "./payments/pricing";
import { ORDER_STATUSES, type DeliverableRow, type OrderRow } from "./db-types";

const placeOrderSchema = z.object({
  templateSlug: z.string().min(1).max(120),
  tierId: z.string().max(60).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30),
  company: z.string().trim().max(160).optional(),
  gstin: z
    .string()
    .trim()
    .max(15)
    .optional()
    .refine((v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(v), "Enter a valid 15-character GSTIN"),
  note: z.string().trim().max(2000),
  couponCode: z.string().trim().max(40).optional(),
  paymentMode: z.enum(["online", "manual"]).default("online"),
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export type PlacedOrder = {
  id: string;
  reference: string;
  accessToken: string;
  amount: number;
  discount: number;
  title: string;
  tierName: string;
  createdAt: string;
  linkedToAccount: boolean;
  paymentMode: "online" | "manual";
};

/**
 * Creates a pending order. The amount is always computed here from the live
 * product + tier + coupon; the client only sends identifiers. Orders are
 * written with the privileged client because direct inserts are revoked.
 */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => placeOrderSchema.parse(input))
  .handler(async ({ data }): Promise<PlacedOrder> => {
    const { supabase, userId } = await createOptionalUserClient();

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, title, price, compare_at_price, tiers, is_published, delivery_type")
      .eq("slug", data.templateSlug)
      .eq("is_published", true)
      .maybeSingle();
    if (templateError) throw new Error(templateError.message);
    if (!template) throw new Error("This product is no longer available");
    if (template.delivery_type === "external") {
      throw new Error("This product is sold on another platform — use the buy button on the product page.");
    }

    const resolved = resolvePrice(template, data.tierId || null);
    const coupon = data.couponCode ? await resolveCoupon(data.couponCode, resolved.price) : null;
    const amount = applyDiscount(resolved.price, coupon?.discount ?? 0);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reference = makeReference("WWT");
    const { data: inserted, error } = await supabaseAdmin
      .from("orders")
      .insert({
        reference,
        user_id: userId,
        template_id: template.id,
        template_title: template.title,
        tier_id: resolved.tierId,
        tier_name: resolved.tierName,
        amount,
        coupon_code: coupon?.code ?? "",
        discount: coupon?.discount ?? 0,
        buyer_name: data.name,
        buyer_email: data.email.toLowerCase(),
        buyer_phone: data.phone,
        buyer_company: data.company ?? "",
        buyer_gstin: (data.gstin ?? "").toUpperCase(),
        note: data.note,
        status: "pending_payment",
        payment_provider: data.paymentMode === "online" ? "razorpay" : "manual",
      })
      .select("id, access_token, created_at")
      .single();
    if (error) throw new Error(error.message);

    return {
      id: inserted.id,
      reference,
      accessToken: inserted.access_token,
      amount,
      discount: coupon?.discount ?? 0,
      title: template.title,
      tierName: resolved.tierName,
      createdAt: inserted.created_at,
      linkedToAccount: Boolean(userId),
      paymentMode: data.paymentMode,
    };
  });

export type MyOrder = Omit<OrderRow, "access_token"> & {
  template_slug: string | null;
  product_type: string;
  delivery_type: string;
  deliverable:
    | (Pick<DeliverableRow, "duplicate_url" | "guide_url" | "access_url" | "notes"> & { has_download: boolean })
    | null;
  license_key: string | null;
  license_max_activations: number | null;
};

export const myOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrder[]> => {
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!orders || orders.length === 0) return [];

    const templateIds = Array.from(new Set(orders.map((o) => o.template_id)));
    const orderIds = orders.map((o) => o.id);
    const [{ data: templates }, { data: deliverables }, { data: licenses }] = await Promise.all([
      context.supabase.from("templates").select("id, slug, product_type, delivery_type").in("id", templateIds),
      context.supabase
        .from("template_deliverables")
        .select("template_id, duplicate_url, guide_url, access_url, download_url, download_path, notes")
        .in("template_id", templateIds),
      context.supabase
        .from("license_keys")
        .select("order_id, key, max_activations")
        .in("order_id", orderIds)
        .eq("status", "active"),
    ]);

    const templateById = new Map((templates ?? []).map((t) => [t.id, t]));
    const deliverableById = new Map((deliverables ?? []).map((d) => [d.template_id, d]));
    const licenseByOrder = new Map((licenses ?? []).map((l) => [l.order_id, l]));

    return orders.map((order) => {
      const { access_token: _token, ...safe } = order;
      const template = templateById.get(order.template_id);
      const deliverable = order.status === "delivered" ? (deliverableById.get(order.template_id) ?? null) : null;
      const license = order.status === "paid" || order.status === "delivered" ? licenseByOrder.get(order.id) : undefined;
      return {
        ...safe,
        template_slug: template?.slug ?? null,
        product_type: template?.product_type ?? "software",
        delivery_type: template?.delivery_type ?? "download",
        deliverable: deliverable
          ? {
              duplicate_url: deliverable.duplicate_url,
              guide_url: deliverable.guide_url,
              access_url: deliverable.access_url,
              notes: deliverable.notes,
              has_download: Boolean(deliverable.download_url || deliverable.download_path),
            }
          : null,
        license_key: license?.key ?? null,
        license_max_activations: license?.max_activations ?? null,
      };
    });
  });

// ---------- admin ----------

export type AdminOrder = Omit<OrderRow, "access_token"> & { template_slug: string | null; license_key: string | null };

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOrder[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    if (!orders || orders.length === 0) return [];
    const templateIds = Array.from(new Set(orders.map((o) => o.template_id)));
    const [{ data: templates }, { data: licenses }] = await Promise.all([
      context.supabase.from("templates").select("id, slug").in("id", templateIds),
      context.supabase
        .from("license_keys")
        .select("order_id, key")
        .in(
          "order_id",
          orders.map((o) => o.id),
        )
        .eq("status", "active"),
    ]);
    const slugById = new Map((templates ?? []).map((t) => [t.id, t.slug]));
    const licenseByOrder = new Map((licenses ?? []).map((l) => [l.order_id, l.key]));
    return orders.map((o) => {
      const { access_token: _token, ...safe } = o;
      return { ...safe, template_slug: slugById.get(o.template_id) ?? null, license_key: licenseByOrder.get(o.id) ?? null };
    });
  });

const updateOrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  payment_reference: z.string().max(200),
  admin_note: z.string().max(2000),
});

/**
 * Admin status changes. Moving a pending order to paid/delivered goes through
 * the shared fulfilment path so invoices, licenses and counters stay consistent.
 */
export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: existing, error: readError } = await context.supabase
      .from("orders")
      .select("id, status, template_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error("Order not found");

    const note = data.admin_note.trim();
    const paymentReference = data.payment_reference.trim();

    if (existing.status === "pending_payment" && (data.status === "paid" || data.status === "delivered")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { fulfilOrder } = await import("./payments/fulfillment.server");
      const result = await fulfilOrder(supabaseAdmin, existing.id, {
        provider: "manual",
        reference: paymentReference || "MANUAL",
        method: "bank_transfer",
        note: note || null,
      });
      if (data.status === "delivered" && result.status === "paid") {
        await context.supabase
          .from("orders")
          .update({ status: "delivered", delivered_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      return { ok: true };
    }

    if (data.status === "refunded") {
      throw new Error("Use the Refund action so the payment gateway is refunded too.");
    }
    if (data.status === "pending_payment" && existing.status !== "pending_payment") {
      throw new Error("A paid order can't be moved back to awaiting payment.");
    }

    const justDelivered = data.status === "delivered" && existing.status !== "delivered";
    const patch = {
      status: data.status,
      ...(paymentReference ? { payment_reference: paymentReference } : {}),
      admin_note: note,
      ...(justDelivered ? { delivered_at: new Date().toISOString() } : {}),
    };
    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
