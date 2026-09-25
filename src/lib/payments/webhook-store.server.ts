import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";
import { fulfilOrder, markOrderRefunded, recordPaymentFailure } from "./fulfillment.server";
import type { WebhookStore } from "./webhook.server";

/** Production store backed by the service-role client. */
export function createSupabaseWebhookStore(admin: SupabaseClient<Database>): WebhookStore {
  return {
    async recordEvent(event) {
      const { data, error } = await admin
        .from("payment_events")
        .insert({
          provider: "razorpay",
          event_id: event.eventId,
          event_type: event.eventType,
          razorpay_order_id: event.razorpayOrderId,
          razorpay_payment_id: event.razorpayPaymentId,
          amount: event.amountPaise,
          payload: event.payload as Json,
          status: "received",
        })
        .select("id")
        .maybeSingle();
      if (error) {
        if (error.code === "23505") return { recorded: false, rowId: null };
        throw new Error(error.message);
      }
      return { recorded: true, rowId: data?.id ?? null };
    },
    async finishEvent(rowId, patch) {
      if (!rowId) return;
      await admin
        .from("payment_events")
        .update({
          status: patch.status,
          error: patch.error ?? "",
          ...(patch.orderId !== undefined ? { order_id: patch.orderId } : {}),
        })
        .eq("id", rowId);
    },
    async findOrder({ razorpayOrderId, internalOrderId }) {
      if (razorpayOrderId) {
        const { data } = await admin
          .from("orders")
          .select("id, amount, status")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();
        if (data) return data;
      }
      if (internalOrderId && /^[0-9a-f-]{36}$/i.test(internalOrderId)) {
        const { data } = await admin.from("orders").select("id, amount, status").eq("id", internalOrderId).maybeSingle();
        if (data) return data;
      }
      return null;
    },
    async findOrderByPaymentId(paymentId) {
      const { data } = await admin
        .from("orders")
        .select("id, amount, status")
        .eq("razorpay_payment_id", paymentId)
        .maybeSingle();
      return data ?? null;
    },
    async fulfil(orderId, facts) {
      await fulfilOrder(admin, orderId, {
        provider: "razorpay",
        paymentId: facts.paymentId,
        razorpayOrderId: facts.razorpayOrderId,
        method: facts.method,
        amountPaid: facts.amountPaid,
      });
    },
    async recordFailure(orderId, reason) {
      await recordPaymentFailure(admin, orderId, reason);
    },
    async refund(orderId, refundId) {
      await markOrderRefunded(admin, orderId, refundId);
    },
  };
}
