import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOptionalUserClient } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { resolveCoupon } from "./coupons.server";
import { applyDiscount, resolvePrice, toPaise } from "./payments/pricing";
import { timingSafeEqualHex } from "./payments/signatures";
import type { DeliverableRow, OrderRow } from "./db-types";

// ---------- shared view model ----------

export type OrderDeliverableView = {
  duplicate_url: string;
  guide_url: string;
  access_url: string;
  has_download: boolean;
  notes: string;
};

export type OrderView = {
  id: string;
  reference: string;
  status: OrderRow["status"];
  amount: number;
  discount: number;
  coupon_code: string;
  currency: string;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  invoice_number: string | null;
  payment_method: string;
  payment_provider: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  failure_reason: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_company: string;
  buyer_gstin: string;
  tier_name: string;
  template_title: string;
  template_slug: string | null;
  product_type: string;
  delivery_type: string;
  version: string;
  linked_to_account: boolean;
  deliverable: OrderDeliverableView | null;
  license_key: string | null;
  license_max_activations: number | null;
};

export const paymentConfigQuery = queryOptions({
  queryKey: ["payment-config"],
  queryFn: () => getPaymentConfig(),
  staleTime: 5 * 60 * 1000,
});

export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getRazorpayConfig } = await import("./payments/razorpay.server");
  const config = getRazorpayConfig();
  return {
    online: Boolean(config),
    keyId: config?.keyId ?? null,
    webhookConfigured: Boolean(config?.webhookSecret),
    testMode: Boolean(config?.keyId.startsWith("rzp_test_")),
  };
});

// ---------- helpers (server only; run inside handlers) ----------

async function loadOrderForCaller(orderId: string, accessToken?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { userId } = await createOptionalUserClient();
  const { data: order, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Order not found");
  const tokenOk = Boolean(accessToken) && timingSafeEqualHex(order.access_token, accessToken ?? "");
  const userOk = Boolean(userId) && order.user_id === userId;
  if (!tokenOk && !userOk) throw new Error("You don't have access to this order");
  return { order, supabaseAdmin, userId };
}

async function buildOrderView(
  admin: Awaited<ReturnType<typeof loadOrderForCaller>>["supabaseAdmin"],
  order: OrderRow,
): Promise<OrderView> {
  const [{ data: template }, { data: deliverable }, { data: license }] = await Promise.all([
    admin
      .from("templates")
      .select("slug, product_type, delivery_type, version")
      .eq("id", order.template_id)
      .maybeSingle(),
    admin.from("template_deliverables").select("*").eq("template_id", order.template_id).maybeSingle(),
    admin
      .from("license_keys")
      .select("key, max_activations, status")
      .eq("order_id", order.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const unlocked = order.status === "delivered";
  const d: DeliverableRow | null = deliverable ?? null;
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    amount: order.amount,
    discount: order.discount,
    coupon_code: order.coupon_code,
    currency: order.currency,
    created_at: order.created_at,
    paid_at: order.paid_at,
    delivered_at: order.delivered_at,
    invoice_number: order.invoice_number,
    payment_method: order.payment_method,
    payment_provider: order.payment_provider,
    razorpay_payment_id: order.razorpay_payment_id,
    razorpay_order_id: order.razorpay_order_id,
    failure_reason: order.failure_reason,
    buyer_name: order.buyer_name,
    buyer_email: order.buyer_email,
    buyer_phone: order.buyer_phone,
    buyer_company: order.buyer_company,
    buyer_gstin: order.buyer_gstin,
    tier_name: order.tier_name,
    template_title: order.template_title,
    template_slug: template?.slug ?? null,
    product_type: template?.product_type ?? "software",
    delivery_type: template?.delivery_type ?? "download",
    version: template?.version ?? "",
    linked_to_account: Boolean(order.user_id),
    deliverable:
      unlocked && d
        ? {
            duplicate_url: d.duplicate_url,
            guide_url: d.guide_url,
            access_url: d.access_url,
            has_download: Boolean(d.download_url || d.download_path),
            notes: d.notes,
          }
        : null,
    license_key: order.status === "paid" || order.status === "delivered" ? (license?.key ?? null) : null,
    license_max_activations: license?.max_activations ?? null,
  };
}

const orderAccessSchema = z.object({
  orderId: z.string().uuid(),
  accessToken: z.string().max(80).optional(),
});

// ---------- buyer-facing ----------

/** Creates (or re-creates, for a retry) the Razorpay order for one of our orders. */
export const createRazorpayCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderAccessSchema.parse(input))
  .handler(async ({ data }) => {
    const { getRazorpayConfig, createRazorpayOrder } = await import("./payments/razorpay.server");
    const config = getRazorpayConfig();
    if (!config) throw new Error("Online payments are not enabled yet. Please use the bank transfer option.");

    const { order, supabaseAdmin } = await loadOrderForCaller(data.orderId, data.accessToken);
    if (order.status !== "pending_payment") {
      throw new Error(order.status === "cancelled" ? "This order was cancelled." : "This order is already paid.");
    }

    // Never trust the stored amount blindly: re-derive it from the live product + coupon.
    const { data: template, error } = await supabaseAdmin
      .from("templates")
      .select("id, slug, title, price, compare_at_price, tiers, is_published, delivery_type")
      .eq("id", order.template_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!template || !template.is_published) throw new Error("This product is no longer available");
    if (template.delivery_type === "external") throw new Error("This product is sold on another platform");

    const resolved = resolvePrice(template, order.tier_id || null);
    let discount = 0;
    let couponCode = order.coupon_code;
    if (order.coupon_code) {
      try {
        discount = (await resolveCoupon(order.coupon_code, resolved.price)).discount;
      } catch {
        discount = 0;
        couponCode = "";
      }
    }
    const expected = applyDiscount(resolved.price, discount);
    if (expected !== order.amount || discount !== order.discount || couponCode !== order.coupon_code) {
      const { error: fixError } = await supabaseAdmin
        .from("orders")
        .update({ amount: expected, discount, coupon_code: couponCode, tier_name: resolved.tierName })
        .eq("id", order.id);
      if (fixError) throw new Error(fixError.message);
    }

    if (expected === 0) {
      const { fulfilOrder } = await import("./payments/fulfillment.server");
      const result = await fulfilOrder(supabaseAdmin, order.id, {
        provider: "manual",
        reference: "FREE-COUPON",
        method: "coupon",
        amountPaid: 0,
      });
      return { kind: "free" as const, order: await buildOrderView(supabaseAdmin, result.order) };
    }

    const rzp = await createRazorpayOrder(config, {
      amountPaise: toPaise(expected),
      receipt: order.reference,
      notes: {
        order_id: order.id,
        reference: order.reference,
        product: template.slug,
        tier: order.tier_id || "default",
      },
    });

    const { error: saveError } = await supabaseAdmin
      .from("orders")
      .update({ razorpay_order_id: rzp.id, payment_provider: "razorpay", failure_reason: "" })
      .eq("id", order.id);
    if (saveError) throw new Error(saveError.message);

    return {
      kind: "razorpay" as const,
      keyId: config.keyId,
      razorpayOrderId: rzp.id,
      amountPaise: rzp.amount,
      amount: expected,
      currency: "INR",
      description: `${template.title}${order.tier_name ? ` — ${order.tier_name}` : ""}`,
      reference: order.reference,
      prefill: { name: order.buyer_name, email: order.buyer_email, contact: order.buyer_phone },
    };
  });

const verifySchema = orderAccessSchema.extend({
  razorpayOrderId: z.string().min(1).max(80),
  razorpayPaymentId: z.string().min(1).max(80),
  razorpaySignature: z.string().min(1).max(256),
});

/** Checkout success callback: verifies the signature server-side, then fulfils. */
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }): Promise<{ state: "fulfilled" | "processing"; order: OrderView }> => {
    const { getRazorpayConfig, fetchRazorpayPayment } = await import("./payments/razorpay.server");
    const { verifyPaymentSignature } = await import("./payments/signatures");
    const { fulfilOrder, recordPaymentFailure } = await import("./payments/fulfillment.server");
    const config = getRazorpayConfig();
    if (!config) throw new Error("Online payments are not enabled.");

    const { order, supabaseAdmin } = await loadOrderForCaller(data.orderId, data.accessToken);
    if (order.status === "paid" || order.status === "delivered") {
      return { state: "fulfilled", order: await buildOrderView(supabaseAdmin, order) };
    }
    if (!order.razorpay_order_id || order.razorpay_order_id !== data.razorpayOrderId) {
      throw new Error("This payment does not belong to this order.");
    }

    const valid = await verifyPaymentSignature({
      razorpayOrderId: order.razorpay_order_id,
      razorpayPaymentId: data.razorpayPaymentId,
      signature: data.razorpaySignature,
      keySecret: config.keySecret,
    });
    if (!valid) {
      await recordPaymentFailure(supabaseAdmin, order.id, "Signature verification failed");
      throw new Error(
        "We couldn't verify this payment. If money was deducted, it will be matched automatically within a few minutes — you don't need to pay again.",
      );
    }

    // Belt and braces: confirm status + amount with Razorpay when reachable.
    let method = "";
    let amountPaid: number | null = null;
    let captured = true;
    try {
      const payment = await fetchRazorpayPayment(config, data.razorpayPaymentId);
      method = payment.method ?? "";
      amountPaid = Math.round(payment.amount) / 100;
      if (payment.order_id && payment.order_id !== order.razorpay_order_id) {
        throw new Error("This payment does not belong to this order.");
      }
      if (payment.status === "authorized") captured = false;
      else if (payment.status !== "captured") {
        await recordPaymentFailure(supabaseAdmin, order.id, payment.error_description ?? `Payment ${payment.status}`);
        throw new Error(payment.error_description ?? "The payment was not completed. You can try again.");
      }
    } catch (error) {
      const { RazorpayApiError } = await import("./payments/razorpay.server");
      if (!(error instanceof RazorpayApiError)) throw error;
      // Razorpay API unreachable — the HMAC already proves authenticity; continue.
      amountPaid = null;
    }

    if (!captured) {
      await supabaseAdmin
        .from("orders")
        .update({ razorpay_payment_id: data.razorpayPaymentId, payment_method: method })
        .eq("id", order.id)
        .eq("status", "pending_payment");
      return { state: "processing", order: await buildOrderView(supabaseAdmin, order) };
    }

    const result = await fulfilOrder(supabaseAdmin, order.id, {
      provider: "razorpay",
      paymentId: data.razorpayPaymentId,
      razorpayOrderId: order.razorpay_order_id,
      method,
      amountPaid,
    });
    return { state: "fulfilled", order: await buildOrderView(supabaseAdmin, result.order) };
  });

/**
 * Fallback when the browser lost the callback (closed tab, flaky network):
 * asks Razorpay whether any payment on this order was captured.
 */
export const reconcileOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderAccessSchema.parse(input))
  .handler(async ({ data }): Promise<{ state: "fulfilled" | "pending"; order: OrderView }> => {
    const { order, supabaseAdmin } = await loadOrderForCaller(data.orderId, data.accessToken);
    if (order.status !== "pending_payment" || !order.razorpay_order_id) {
      return {
        state: order.status === "paid" || order.status === "delivered" ? "fulfilled" : "pending",
        order: await buildOrderView(supabaseAdmin, order),
      };
    }
    const { getRazorpayConfig, fetchRazorpayOrderPayments } = await import("./payments/razorpay.server");
    const config = getRazorpayConfig();
    if (!config) return { state: "pending", order: await buildOrderView(supabaseAdmin, order) };

    const payments = await fetchRazorpayOrderPayments(config, order.razorpay_order_id);
    const captured = payments.find((p) => p.status === "captured");
    if (!captured) return { state: "pending", order: await buildOrderView(supabaseAdmin, order) };

    const { fulfilOrder } = await import("./payments/fulfillment.server");
    const result = await fulfilOrder(supabaseAdmin, order.id, {
      provider: "razorpay",
      paymentId: captured.id,
      razorpayOrderId: order.razorpay_order_id,
      method: captured.method,
      amountPaid: Math.round(captured.amount) / 100,
    });
    return { state: "fulfilled", order: await buildOrderView(supabaseAdmin, result.order) };
  });

/** Order page: the buyer opens /orders/$reference?key=… (guest) or is signed in as the owner. */
export const getOrderView = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ reference: z.string().min(4).max(40), accessToken: z.string().max(80).optional() }).parse(input),
  )
  .handler(async ({ data }): Promise<OrderView | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = await createOptionalUserClient();
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("reference", data.reference).maybeSingle();
    if (!order) return null;
    const tokenOk = Boolean(data.accessToken) && timingSafeEqualHex(order.access_token, data.accessToken ?? "");
    const userOk = Boolean(userId) && order.user_id === userId;
    if (!tokenOk && !userOk) return null;
    return buildOrderView(supabaseAdmin, order);
  });

export const orderViewQuery = (reference: string, accessToken?: string) =>
  queryOptions({
    queryKey: ["order-view", reference, accessToken ?? ""],
    queryFn: () => getOrderView({ data: { reference, ...(accessToken ? { accessToken } : {}) } }),
    staleTime: 10 * 1000,
  });

/** Short-lived download link for a delivered order (private storage or external URL). */
export const getOrderDownload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderAccessSchema.parse(input))
  .handler(async ({ data }): Promise<{ url: string; expiresAt: string | null; filename: string | null }> => {
    const { order, supabaseAdmin } = await loadOrderForCaller(data.orderId, data.accessToken);
    if (order.status !== "delivered") throw new Error("This order isn't unlocked yet.");
    const { data: deliverable } = await supabaseAdmin
      .from("template_deliverables")
      .select("download_url, download_path")
      .eq("template_id", order.template_id)
      .maybeSingle();
    if (deliverable?.download_path) {
      const { data: signed, error } = await supabaseAdmin.storage
        .from("product-files")
        .createSignedUrl(deliverable.download_path, 60 * 60, { download: true });
      if (error || !signed) throw new Error(error?.message ?? "Could not create a download link");
      return {
        url: signed.signedUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        filename: deliverable.download_path.split("/").pop() ?? null,
      };
    }
    if (deliverable?.download_url) return { url: deliverable.download_url, expiresAt: null, filename: null };
    throw new Error("No download is attached to this product yet. We'll email it to you.");
  });

// ---------- admin ----------

export const adminMarkOrderPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid(), paymentReference: z.string().max(200), note: z.string().max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fulfilOrder } = await import("./payments/fulfillment.server");
    const result = await fulfilOrder(supabaseAdmin, data.orderId, {
      provider: "manual",
      reference: data.paymentReference.trim() || "MANUAL",
      method: "bank_transfer",
      note: data.note.trim() || null,
    });
    return { status: result.status, invoiceNumber: result.invoiceNumber, licenseKey: result.licenseKey };
  });

export const adminReconcileOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRazorpayConfig, fetchRazorpayOrderPayments } = await import("./payments/razorpay.server");
    const config = getRazorpayConfig();
    if (!config) throw new Error("Razorpay keys are not configured");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (!order.razorpay_order_id) return { status: order.status, found: false, payments: [] as string[] };
    const payments = await fetchRazorpayOrderPayments(config, order.razorpay_order_id);
    const captured = payments.find((p) => p.status === "captured");
    if (!captured) {
      return { status: order.status, found: false, payments: payments.map((p) => `${p.id}:${p.status}`) };
    }
    const { fulfilOrder } = await import("./payments/fulfillment.server");
    const result = await fulfilOrder(supabaseAdmin, order.id, {
      provider: "razorpay",
      paymentId: captured.id,
      razorpayOrderId: order.razorpay_order_id,
      method: captured.method,
      amountPaid: Math.round(captured.amount) / 100,
    });
    return { status: result.status, found: true, payments: payments.map((p) => `${p.id}:${p.status}`) };
  });

export const adminRefundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid(), note: z.string().max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { markOrderRefunded } = await import("./payments/fulfillment.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.status !== "paid" && order.status !== "delivered") throw new Error("Only paid orders can be refunded");

    let refundId: string | null = null;
    if (order.payment_provider === "razorpay" && order.razorpay_payment_id) {
      const { getRazorpayConfig } = await import("./payments/razorpay.server");
      const config = getRazorpayConfig();
      if (!config) throw new Error("Razorpay keys are not configured");
      const auth = btoa(`${config.keyId}:${config.keySecret}`);
      const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(order.razorpay_payment_id)}/refund`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ speed: "normal", notes: { reference: order.reference, note: data.note.slice(0, 200) } }),
      });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: { description?: string } } | null;
      if (!response.ok) throw new Error(body?.error?.description ?? `Razorpay refund failed (${response.status})`);
      refundId = body?.id ?? null;
    }
    await markOrderRefunded(supabaseAdmin, order.id, refundId);
    if (data.note.trim()) {
      await supabaseAdmin.from("orders").update({ admin_note: data.note.trim() }).eq("id", order.id);
    }
    return { ok: true, refundId };
  });

export type AdminPaymentEvent = {
  id: string;
  event_type: string;
  status: string;
  error: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  order_id: string | null;
  order_reference: string | null;
  amount: number | null;
  created_at: string;
};

export const adminListPaymentEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPaymentEvent[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("payment_events")
      .select("id, event_type, status, error, razorpay_order_id, razorpay_payment_id, order_id, amount, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const orderIds = Array.from(new Set(rows.map((r) => r.order_id).filter((v): v is string => Boolean(v))));
    const { data: orders } = orderIds.length
      ? await context.supabase.from("orders").select("id, reference").in("id", orderIds)
      : { data: [] as { id: string; reference: string }[] };
    const refById = new Map((orders ?? []).map((o) => [o.id, o.reference]));
    return rows.map((r) => ({ ...r, order_reference: r.order_id ? (refById.get(r.order_id) ?? null) : null }));
  });

export type AdminLicense = {
  id: string;
  key: string;
  status: string;
  activations: number;
  max_activations: number;
  buyer_email: string;
  created_at: string;
  last_activated_at: string | null;
  order_reference: string | null;
  product_title: string | null;
};

export const adminListLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminLicense[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("license_keys")
      .select("id, key, status, activations, max_activations, buyer_email, created_at, last_activated_at, order_id, template_id")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const orderIds = Array.from(new Set(rows.map((r) => r.order_id)));
    const templateIds = Array.from(new Set(rows.map((r) => r.template_id)));
    const [{ data: orders }, { data: templates }] = await Promise.all([
      orderIds.length ? context.supabase.from("orders").select("id, reference").in("id", orderIds) : Promise.resolve({ data: [] }),
      templateIds.length ? context.supabase.from("templates").select("id, title").in("id", templateIds) : Promise.resolve({ data: [] }),
    ]);
    const refById = new Map((orders ?? []).map((o) => [o.id, o.reference]));
    const titleById = new Map((templates ?? []).map((t) => [t.id, t.title]));
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      status: r.status,
      activations: r.activations,
      max_activations: r.max_activations,
      buyer_email: r.buyer_email,
      created_at: r.created_at,
      last_activated_at: r.last_activated_at,
      order_reference: refById.get(r.order_id) ?? null,
      product_title: titleById.get(r.template_id) ?? null,
    }));
  });

export const adminUpdateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["active", "revoked"]).optional(),
        resetActivations: z.boolean().optional(),
        maxActivations: z.number().int().min(0).max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: { status?: "active" | "revoked"; activations?: number; max_activations?: number } = {};
    if (data.status) patch.status = data.status;
    if (data.resetActivations) patch.activations = 0;
    if (typeof data.maxActivations === "number") patch.max_activations = data.maxActivations;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("license_keys").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
