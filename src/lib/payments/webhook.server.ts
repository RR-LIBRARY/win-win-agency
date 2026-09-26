/**
 * Razorpay webhook processing, separated from the HTTP route so it can be
 * unit-tested with an in-memory store. Every request must carry a valid
 * `x-razorpay-signature`; events are de-duplicated on `x-razorpay-event-id`
 * and fulfilment itself is idempotent.
 */
import { verifyWebhookSignature } from "./signatures";

export type WebhookOutcome = {
  status: number;
  body: { ok: boolean; result: string; detail?: string };
};

export type WebhookOrderRef = { id: string; amount: number; status: string };

export interface WebhookStore {
  /** Returns false when the event id was already recorded. */
  recordEvent(event: {
    eventId: string | null;
    eventType: string;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    amountPaise: number | null;
    payload: unknown;
  }): Promise<{ recorded: boolean; rowId: string | null }>;
  finishEvent(rowId: string | null, patch: { orderId?: string | null; status: string; error?: string }): Promise<void>;
  findOrder(input: { razorpayOrderId: string | null; internalOrderId: string | null }): Promise<WebhookOrderRef | null>;
  findOrderByPaymentId(paymentId: string): Promise<WebhookOrderRef | null>;
  fulfil(orderId: string, facts: { paymentId: string; razorpayOrderId: string | null; method: string; amountPaid: number }): Promise<void>;
  recordFailure(orderId: string, reason: string): Promise<void>;
  refund(orderId: string, refundId: string | null): Promise<void>;
}

type PaymentEntity = {
  id: string;
  order_id?: string | null;
  amount?: number;
  currency?: string;
  method?: string;
  status?: string;
  error_description?: string | null;
  error_reason?: string | null;
  notes?: Record<string, string> | Array<unknown> | null;
};

/** Every order in this store is priced in rupees; anything else is a spoof or a misconfiguration. */
export const STORE_CURRENCY = "INR";

type RefundEntity = { id: string; payment_id: string; amount?: number; status?: string };

type WebhookEvent = {
  event: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    order?: { entity?: { id: string; amount?: number; notes?: Record<string, string> } };
    refund?: { entity?: RefundEntity };
  };
};

function notesOrderId(notes: PaymentEntity["notes"] | undefined): string | null {
  if (!notes || Array.isArray(notes)) return null;
  const value = notes["order_id"];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function processRazorpayWebhook(input: {
  rawBody: string;
  signature: string | null;
  eventId: string | null;
  webhookSecret: string | null;
  store: WebhookStore;
}): Promise<WebhookOutcome> {
  if (!input.webhookSecret) {
    return { status: 503, body: { ok: false, result: "not_configured", detail: "RAZORPAY_WEBHOOK_SECRET is not set" } };
  }
  if (!input.signature) {
    return { status: 400, body: { ok: false, result: "missing_signature" } };
  }
  const valid = await verifyWebhookSignature({
    rawBody: input.rawBody,
    signature: input.signature,
    webhookSecret: input.webhookSecret,
  });
  if (!valid) {
    return { status: 401, body: { ok: false, result: "invalid_signature" } };
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(input.rawBody) as WebhookEvent;
  } catch {
    return { status: 400, body: { ok: false, result: "invalid_json" } };
  }
  if (!event || typeof event.event !== "string") {
    return { status: 400, body: { ok: false, result: "invalid_event" } };
  }

  const payment = event.payload?.payment?.entity ?? null;
  const refund = event.payload?.refund?.entity ?? null;
  const orderEntity = event.payload?.order?.entity ?? null;

  const { recorded, rowId } = await input.store.recordEvent({
    eventId: input.eventId,
    eventType: event.event,
    razorpayOrderId: payment?.order_id ?? orderEntity?.id ?? null,
    razorpayPaymentId: payment?.id ?? refund?.payment_id ?? null,
    amountPaise: payment?.amount ?? refund?.amount ?? orderEntity?.amount ?? null,
    payload: event,
  });
  if (!recorded) {
    return { status: 200, body: { ok: true, result: "duplicate" } };
  }

  try {
    switch (event.event) {
      case "payment.captured":
      case "order.paid": {
        if (!payment?.id) {
          await input.store.finishEvent(rowId, { status: "ignored", error: "no payment entity" });
          return { status: 200, body: { ok: true, result: "ignored" } };
        }
        // Only a captured rupee payment may unlock an order. An "authorized"
        // payment is not money in the bank yet, and a foreign-currency amount
        // would otherwise pass the numeric amount check with far less value.
        if (payment.status && payment.status !== "captured") {
          await input.store.finishEvent(rowId, { status: "ignored", error: `payment status ${payment.status}` });
          return { status: 200, body: { ok: true, result: "ignored" } };
        }
        if (payment.currency && payment.currency.toUpperCase() !== STORE_CURRENCY) {
          await input.store.finishEvent(rowId, { status: "error", error: `currency ${payment.currency} is not ${STORE_CURRENCY}` });
          return { status: 200, body: { ok: false, result: "error", detail: "currency mismatch" } };
        }
        if (typeof payment.amount !== "number" || !Number.isFinite(payment.amount) || payment.amount <= 0) {
          await input.store.finishEvent(rowId, { status: "error", error: "payment amount missing" });
          return { status: 200, body: { ok: false, result: "error", detail: "amount missing" } };
        }
        const order = await input.store.findOrder({
          razorpayOrderId: payment.order_id ?? orderEntity?.id ?? null,
          internalOrderId: notesOrderId(payment.notes) ?? notesOrderId(orderEntity?.notes ?? null),
        });
        if (!order) {
          await input.store.finishEvent(rowId, { status: "error", error: "order not found" });
          return { status: 200, body: { ok: true, result: "order_not_found" } };
        }
        const amountPaid = Math.round(payment.amount) / 100;
        await input.store.fulfil(order.id, {
          paymentId: payment.id,
          razorpayOrderId: payment.order_id ?? orderEntity?.id ?? null,
          method: payment.method ?? "",
          amountPaid,
        });
        await input.store.finishEvent(rowId, { orderId: order.id, status: "processed" });
        return { status: 200, body: { ok: true, result: "fulfilled" } };
      }
      case "payment.failed": {
        const order = payment
          ? await input.store.findOrder({
              razorpayOrderId: payment.order_id ?? null,
              internalOrderId: notesOrderId(payment.notes),
            })
          : null;
        if (order) {
          const reason = payment?.error_description || payment?.error_reason || "Payment failed";
          await input.store.recordFailure(order.id, reason);
        }
        await input.store.finishEvent(rowId, { orderId: order?.id ?? null, status: order ? "processed" : "ignored" });
        return { status: 200, body: { ok: true, result: "failure_recorded" } };
      }
      case "refund.processed": {
        if (!refund?.payment_id) {
          await input.store.finishEvent(rowId, { status: "ignored", error: "no refund entity" });
          return { status: 200, body: { ok: true, result: "ignored" } };
        }
        const order = await input.store.findOrderByPaymentId(refund.payment_id);
        if (!order) {
          await input.store.finishEvent(rowId, { status: "error", error: "order not found for refund" });
          return { status: 200, body: { ok: true, result: "order_not_found" } };
        }
        await input.store.refund(order.id, refund.id);
        await input.store.finishEvent(rowId, { orderId: order.id, status: "processed" });
        return { status: 200, body: { ok: true, result: "refunded" } };
      }
      default: {
        await input.store.finishEvent(rowId, { status: "ignored" });
        return { status: 200, body: { ok: true, result: "ignored" } };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "processing failed";
    console.error(`[razorpay-webhook] ${event.event} failed: ${message}`);
    await input.store.finishEvent(rowId, { status: "error", error: message });
    // 200 so Razorpay does not hammer retries for a business-rule failure
    // (e.g. amount mismatch) — the event row keeps the error for the admin.
    return { status: 200, body: { ok: false, result: "error", detail: message } };
  }
}
