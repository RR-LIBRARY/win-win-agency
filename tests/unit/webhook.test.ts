import { describe, expect, it } from "vitest";
import { hmacSha256Hex } from "@/lib/payments/signatures";
import { processRazorpayWebhook, type WebhookOrderRef, type WebhookStore } from "@/lib/payments/webhook.server";

const SECRET = "whsec_test_123";

/** Minimal in-memory store that records every call so tests can assert on side effects. */
function memoryStore(orders: WebhookOrderRef[] = [], options: { failFulfil?: string } = {}) {
  const eventIds = new Set<string>();
  const calls: { name: string; args: unknown[] }[] = [];
  let rowSeq = 0;
  const store: WebhookStore = {
    async recordEvent(event) {
      calls.push({ name: "recordEvent", args: [event] });
      if (event.eventId) {
        if (eventIds.has(event.eventId)) return { recorded: false, rowId: null };
        eventIds.add(event.eventId);
      }
      rowSeq += 1;
      return { recorded: true, rowId: `evt-row-${rowSeq}` };
    },
    async finishEvent(rowId, patch) {
      calls.push({ name: "finishEvent", args: [rowId, patch] });
    },
    async findOrder({ razorpayOrderId, internalOrderId }) {
      calls.push({ name: "findOrder", args: [razorpayOrderId, internalOrderId] });
      return (
        orders.find((o) => (o as { razorpayOrderId?: string }).razorpayOrderId === razorpayOrderId) ??
        orders.find((o) => o.id === internalOrderId) ??
        null
      );
    },
    async findOrderByPaymentId(paymentId) {
      calls.push({ name: "findOrderByPaymentId", args: [paymentId] });
      return orders.find((o) => (o as { paymentId?: string }).paymentId === paymentId) ?? null;
    },
    async fulfil(orderId, facts) {
      calls.push({ name: "fulfil", args: [orderId, facts] });
      if (options.failFulfil) throw new Error(options.failFulfil);
    },
    async recordFailure(orderId, reason) {
      calls.push({ name: "recordFailure", args: [orderId, reason] });
    },
    async refund(orderId, refundId) {
      calls.push({ name: "refund", args: [orderId, refundId] });
    },
  };
  return { store, calls, named: (name: string) => calls.filter((c) => c.name === name) };
}

function capturedEvent(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    entity: "event",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_TEST001",
          order_id: "order_TEST001",
          amount: 149900,
          currency: "INR",
          method: "upi",
          status: "captured",
          notes: { order_id: "22222222-2222-4222-8222-222222222222" },
          ...overrides,
        },
      },
    },
  });
}

async function signed(body: string, secret = SECRET) {
  return hmacSha256Hex(secret, body);
}

const ORDER: WebhookOrderRef & { razorpayOrderId: string; paymentId: string } = {
  id: "22222222-2222-4222-8222-222222222222",
  amount: 1499,
  status: "pending_payment",
  razorpayOrderId: "order_TEST001",
  paymentId: "pay_TEST001",
};

describe("processRazorpayWebhook — request validation", () => {
  it("returns 503 when the webhook secret is not configured (never fulfils)", async () => {
    const { store, calls } = memoryStore([ORDER]);
    const body = capturedEvent();
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "e1", webhookSecret: null, store });
    expect(out.status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it("rejects a missing signature with 400", async () => {
    const { store, calls } = memoryStore([ORDER]);
    const out = await processRazorpayWebhook({ rawBody: capturedEvent(), signature: null, eventId: "e1", webhookSecret: SECRET, store });
    expect(out).toMatchObject({ status: 400, body: { result: "missing_signature" } });
    expect(calls).toHaveLength(0);
  });

  it("rejects a forged signature with 401 and records nothing", async () => {
    const { store, calls } = memoryStore([ORDER]);
    const body = capturedEvent();
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body, "attacker"), eventId: "e1", webhookSecret: SECRET, store });
    expect(out).toMatchObject({ status: 401, body: { result: "invalid_signature" } });
    expect(calls).toHaveLength(0);
  });

  it("rejects a tampered body (amount changed after signing)", async () => {
    const { store, calls } = memoryStore([ORDER]);
    const body = capturedEvent();
    const signature = await signed(body);
    const tampered = body.replace("149900", "100");
    const out = await processRazorpayWebhook({ rawBody: tampered, signature, eventId: "e1", webhookSecret: SECRET, store });
    expect(out.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("rejects invalid JSON and non-event payloads after a valid signature", async () => {
    const { store } = memoryStore([ORDER]);
    for (const [raw, result] of [
      ["{not json", "invalid_json"],
      [JSON.stringify({ hello: "world" }), "invalid_event"],
    ] as const) {
      const out = await processRazorpayWebhook({ rawBody: raw, signature: await signed(raw), eventId: "e1", webhookSecret: SECRET, store });
      expect(out).toMatchObject({ status: 400, body: { result } });
    }
  });
});

describe("processRazorpayWebhook — payment.captured", () => {
  it("fulfils the matching order with the captured amount in rupees", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = capturedEvent();
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_1", webhookSecret: SECRET, store });
    expect(out).toMatchObject({ status: 200, body: { ok: true, result: "fulfilled" } });
    expect(named("fulfil")).toHaveLength(1);
    expect(named("fulfil")[0]!.args).toEqual([
      ORDER.id,
      { paymentId: "pay_TEST001", razorpayOrderId: "order_TEST001", method: "upi", amountPaid: 1499 },
    ]);
    expect(named("finishEvent")[0]!.args[1]).toMatchObject({ orderId: ORDER.id, status: "processed" });
  });

  it("is idempotent: the same event id delivered twice fulfils once", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = capturedEvent();
    const signature = await signed(body);
    const first = await processRazorpayWebhook({ rawBody: body, signature, eventId: "evt_dup", webhookSecret: SECRET, store });
    const second = await processRazorpayWebhook({ rawBody: body, signature, eventId: "evt_dup", webhookSecret: SECRET, store });
    expect(first.body.result).toBe("fulfilled");
    expect(second).toMatchObject({ status: 200, body: { result: "duplicate" } });
    expect(named("fulfil")).toHaveLength(1);
  });

  it("falls back to the internal order id from notes when the Razorpay order id is unknown", async () => {
    const { store, named } = memoryStore([{ ...ORDER, razorpayOrderId: "order_DIFFERENT" }]);
    const body = capturedEvent();
    await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_2", webhookSecret: SECRET, store });
    expect(named("fulfil")).toHaveLength(1);
    expect(named("findOrder")[0]!.args).toEqual(["order_TEST001", ORDER.id]);
  });

  it("acknowledges an unknown order with 200 so Razorpay stops retrying, and logs the error", async () => {
    const { store, named } = memoryStore([]);
    const body = capturedEvent();
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_3", webhookSecret: SECRET, store });
    expect(out).toMatchObject({ status: 200, body: { result: "order_not_found" } });
    expect(named("fulfil")).toHaveLength(0);
    expect(named("finishEvent")[0]!.args[1]).toMatchObject({ status: "error", error: "order not found" });
  });

  it("returns 200 + ok:false when fulfilment fails a business rule (e.g. amount mismatch) and keeps the error", async () => {
    const { store, named } = memoryStore([ORDER], { failFulfil: "Amount mismatch: expected ₹1499, received ₹1" });
    const body = capturedEvent({ amount: 100 });
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_4", webhookSecret: SECRET, store });
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ ok: false, result: "error", detail: expect.stringContaining("Amount mismatch") });
    expect(named("finishEvent")[0]!.args[1]).toMatchObject({ status: "error" });
  });

  it("treats order.paid like payment.captured", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = JSON.stringify({
      event: "order.paid",
      payload: {
        order: { entity: { id: "order_TEST001", amount: 149900 } },
        payment: { entity: { id: "pay_TEST001", order_id: "order_TEST001", amount: 149900, method: "card" } },
      },
    });
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_5", webhookSecret: SECRET, store });
    expect(out.body.result).toBe("fulfilled");
    expect(named("fulfil")[0]!.args[1]).toMatchObject({ method: "card", amountPaid: 1499 });
  });

  it("ignores an event without a payment entity", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_6", webhookSecret: SECRET, store });
    expect(out.body.result).toBe("ignored");
    expect(named("fulfil")).toHaveLength(0);
  });
});

describe("processRazorpayWebhook — other events", () => {
  it("records the failure reason for payment.failed without touching fulfilment", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = capturedEvent({ status: "failed", error_description: "Payment declined by bank" }).replace(
      '"event":"payment.captured"',
      '"event":"payment.failed"',
    );
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_f", webhookSecret: SECRET, store });
    expect(out.body.result).toBe("failure_recorded");
    expect(named("recordFailure")[0]!.args).toEqual([ORDER.id, "Payment declined by bank"]);
    expect(named("fulfil")).toHaveLength(0);
  });

  it("refunds the order that owns the payment on refund.processed", async () => {
    const { store, named } = memoryStore([{ ...ORDER, status: "delivered" }]);
    const body = JSON.stringify({
      event: "refund.processed",
      payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_TEST001", amount: 149900, status: "processed" } } },
    });
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_r", webhookSecret: SECRET, store });
    expect(out.body.result).toBe("refunded");
    expect(named("refund")[0]!.args).toEqual([ORDER.id, "rfnd_1"]);
  });

  it("ignores unrelated events (e.g. settlement.processed) but still records them", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = JSON.stringify({ event: "settlement.processed", payload: {} });
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_s", webhookSecret: SECRET, store });
    expect(out.body.result).toBe("ignored");
    expect(named("recordEvent")).toHaveLength(1);
    expect(named("finishEvent")[0]!.args[1]).toMatchObject({ status: "ignored" });
  });

  it("still processes events that arrive without an event-id header (no dedupe possible)", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = capturedEvent();
    const signature = await signed(body);
    await processRazorpayWebhook({ rawBody: body, signature, eventId: null, webhookSecret: SECRET, store });
    await processRazorpayWebhook({ rawBody: body, signature, eventId: null, webhookSecret: SECRET, store });
    // Both reach fulfil; fulfilOrder's own optimistic lock makes the second a no-op (see fulfillment tests).
    expect(named("fulfil")).toHaveLength(2);
  });
});

describe("processRazorpayWebhook — spoof-resistant capture rules", () => {
  it("never fulfils on a foreign-currency capture even when the numeric amount matches", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = capturedEvent({ currency: "USD" }); // 149900 cents ≠ ₹1499
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_usd", webhookSecret: SECRET, store });
    expect(out.body).toMatchObject({ ok: false, result: "error", detail: "currency mismatch" });
    expect(named("fulfil")).toHaveLength(0);
    expect(named("finishEvent")[0]!.args[1]).toMatchObject({ status: "error" });
  });

  it("treats lower-case 'inr' as rupees", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = capturedEvent({ currency: "inr" });
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_inr", webhookSecret: SECRET, store });
    expect(out.body.result).toBe("fulfilled");
    expect(named("fulfil")).toHaveLength(1);
  });

  it("ignores an 'authorized' (not yet captured) payment instead of unlocking the order", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = capturedEvent({ status: "authorized" });
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_auth", webhookSecret: SECRET, store });
    expect(out.body.result).toBe("ignored");
    expect(named("fulfil")).toHaveLength(0);
  });

  it("refuses a capture whose amount is missing rather than trusting the order total", async () => {
    const { store, named } = memoryStore([ORDER]);
    const body = capturedEvent({ amount: undefined });
    const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: "evt_noamt", webhookSecret: SECRET, store });
    expect(out.body).toMatchObject({ ok: false, result: "error" });
    expect(named("fulfil")).toHaveLength(0);
  });

  it("refuses a zero or negative amount", async () => {
    for (const amount of [0, -149900]) {
      const { store, named } = memoryStore([ORDER]);
      const body = capturedEvent({ amount });
      const out = await processRazorpayWebhook({ rawBody: body, signature: await signed(body), eventId: `evt_${amount}`, webhookSecret: SECRET, store });
      expect(out.body.ok).toBe(false);
      expect(named("fulfil")).toHaveLength(0);
    }
  });
});
