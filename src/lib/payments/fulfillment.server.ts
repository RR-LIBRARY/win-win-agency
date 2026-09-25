/**
 * Order fulfilment — the single place an order becomes "paid" and gets
 * delivered. Called from the checkout verify step, the Razorpay webhook, the
 * reconcile fallback and the admin "mark paid" action, so it must be
 * idempotent and safe under concurrent calls.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DeliverableRow, OrderRow } from "@/lib/db-types";
import { generateLicenseKey } from "./license";

type Admin = SupabaseClient<Database>;

export type PaymentFacts = {
  provider: "razorpay" | "manual";
  paymentId?: string | null;
  razorpayOrderId?: string | null;
  method?: string | null;
  /** Amount actually captured, in rupees. When provided it must equal the order amount. */
  amountPaid?: number | null;
  reference?: string | null;
  note?: string | null;
};

export type FulfilmentResult = {
  order: OrderRow;
  status: OrderRow["status"];
  invoiceNumber: string | null;
  licenseKey: string | null;
  alreadyFulfilled: boolean;
  delivered: boolean;
};

export class AmountMismatchError extends Error {
  expected: number;
  received: number;
  constructor(expected: number, received: number) {
    super(`Amount mismatch: expected ₹${expected}, received ₹${received}`);
    this.name = "AmountMismatchError";
    this.expected = expected;
    this.received = received;
  }
}

export function deliverableHasContent(d: Pick<DeliverableRow, "duplicate_url" | "download_url" | "download_path" | "access_url"> | null) {
  if (!d) return false;
  return Boolean(d.duplicate_url || d.download_url || d.download_path || d.access_url);
}

async function loadDeliverable(admin: Admin, templateId: string): Promise<DeliverableRow | null> {
  const { data, error } = await admin.from("template_deliverables").select("*").eq("template_id", templateId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

async function existingLicense(admin: Admin, orderId: string): Promise<string | null> {
  const { data } = await admin
    .from("license_keys")
    .select("key")
    .eq("order_id", orderId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.key ?? null;
}

async function issueLicense(admin: Admin, order: OrderRow, maxActivations: number): Promise<string> {
  const existing = await existingLicense(admin, order.id);
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateLicenseKey();
    const { error } = await admin.from("license_keys").insert({
      key,
      order_id: order.id,
      template_id: order.template_id,
      user_id: order.user_id,
      buyer_email: order.buyer_email,
      max_activations: maxActivations,
    });
    if (!error) return key;
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Could not generate a unique license key");
}

async function nextInvoiceNumber(admin: Admin): Promise<string | null> {
  const { data, error } = await admin.rpc("next_invoice_number");
  if (error) {
    console.error("[fulfilment] invoice number failed", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}

/**
 * Marks an order paid (and delivered when the product has something to hand
 * over). Returns without side effects when the order was already fulfilled.
 */
export async function fulfilOrder(admin: Admin, orderId: string, facts: PaymentFacts): Promise<FulfilmentResult> {
  const { data: order, error } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Order not found");

  if (order.status === "paid" || order.status === "delivered" || order.status === "refunded") {
    return {
      order,
      status: order.status,
      invoiceNumber: order.invoice_number,
      licenseKey: await existingLicense(admin, order.id),
      alreadyFulfilled: true,
      delivered: order.status === "delivered",
    };
  }
  if (order.status === "cancelled") {
    throw new Error("This order was cancelled. Contact support to reactivate it.");
  }

  if (typeof facts.amountPaid === "number" && facts.amountPaid !== order.amount) {
    throw new AmountMismatchError(order.amount, facts.amountPaid);
  }

  const deliverable = await loadDeliverable(admin, order.template_id);
  const delivered = deliverableHasContent(deliverable);
  const now = new Date().toISOString();

  // Optimistic lock: only the first caller flips the row out of pending.
  const { data: locked, error: lockError } = await admin
    .from("orders")
    .update({
      status: delivered ? "delivered" : "paid",
      payment_provider: facts.provider,
      razorpay_payment_id: facts.paymentId ?? order.razorpay_payment_id,
      razorpay_order_id: facts.razorpayOrderId ?? order.razorpay_order_id,
      payment_method: facts.method ?? order.payment_method,
      payment_reference: facts.reference ?? facts.paymentId ?? order.payment_reference,
      amount_paid: typeof facts.amountPaid === "number" ? facts.amountPaid : order.amount,
      paid_at: now,
      failure_reason: "",
      ...(delivered ? { delivered_at: now } : {}),
      ...(facts.note ? { admin_note: facts.note } : {}),
    })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("*");
  if (lockError) throw new Error(lockError.message);

  if (!locked || locked.length === 0) {
    // Someone else (webhook vs. checkout) got there first — report their result.
    const { data: fresh } = await admin.from("orders").select("*").eq("id", order.id).maybeSingle();
    const current = fresh ?? order;
    return {
      order: current,
      status: current.status,
      invoiceNumber: current.invoice_number,
      licenseKey: await existingLicense(admin, current.id),
      alreadyFulfilled: true,
      delivered: current.status === "delivered",
    };
  }

  let updated = locked[0]!;

  const invoiceNumber = updated.invoice_number ?? (await nextInvoiceNumber(admin));
  let licenseKey: string | null = null;
  if (deliverable?.issue_license) {
    licenseKey = await issueLicense(admin, updated, deliverable.license_max_activations);
  }

  if (invoiceNumber && invoiceNumber !== updated.invoice_number) {
    const { data: withInvoice } = await admin
      .from("orders")
      .update({ invoice_number: invoiceNumber })
      .eq("id", updated.id)
      .select("*")
      .maybeSingle();
    if (withInvoice) updated = withInvoice;
  }

  // Side effects that should happen once per paid order.
  const { data: template } = await admin.from("templates").select("sales_count").eq("id", updated.template_id).maybeSingle();
  if (template) {
    await admin.from("templates").update({ sales_count: template.sales_count + 1 }).eq("id", updated.template_id);
  }
  if (updated.coupon_code) {
    const { data: coupon } = await admin.from("coupons").select("id, used_count").eq("code", updated.coupon_code).maybeSingle();
    if (coupon) await admin.from("coupons").update({ used_count: coupon.used_count + 1 }).eq("id", coupon.id);
  }

  return {
    order: updated,
    status: updated.status,
    invoiceNumber: updated.invoice_number,
    licenseKey,
    alreadyFulfilled: false,
    delivered,
  };
}

/** Records a failed attempt without changing a pending order's state. */
export async function recordPaymentFailure(admin: Admin, orderId: string, reason: string) {
  await admin
    .from("orders")
    .update({ failure_reason: reason.slice(0, 500) })
    .eq("id", orderId)
    .eq("status", "pending_payment");
}

/** Refund handling: flips a paid/delivered order to refunded and revokes its licenses. */
export async function markOrderRefunded(admin: Admin, orderId: string, refundId: string | null) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("orders")
    .update({ status: "refunded", refunded_at: now, refund_id: refundId })
    .eq("id", orderId)
    .in("status", ["paid", "delivered"]);
  if (error) throw new Error(error.message);
  await admin.from("license_keys").update({ status: "revoked" }).eq("order_id", orderId);
}
