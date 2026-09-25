import { createFileRoute } from "@tanstack/react-router";

/**
 * Razorpay → us. Configure this URL in Razorpay Dashboard → Settings →
 * Webhooks with the events payment.captured, order.paid, payment.failed and
 * refund.processed, using the same secret saved as RAZORPAY_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/public/webhooks/razorpay")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({ ok: true, service: "razorpay-webhook", accepts: ["POST"] }, { status: 200 }),
      POST: async ({ request }) => {
        const rawBody = await request.text();
        if (rawBody.length > 512_000) {
          return Response.json({ ok: false, result: "payload_too_large" }, { status: 413 });
        }
        const [{ processRazorpayWebhook }, { getWebhookSecret }, { createSupabaseWebhookStore }, { supabaseAdmin }] =
          await Promise.all([
            import("@/lib/payments/webhook.server"),
            import("@/lib/payments/razorpay.server"),
            import("@/lib/payments/webhook-store.server"),
            import("@/integrations/supabase/client.server"),
          ]);
        const outcome = await processRazorpayWebhook({
          rawBody,
          signature: request.headers.get("x-razorpay-signature"),
          eventId: request.headers.get("x-razorpay-event-id"),
          webhookSecret: getWebhookSecret(),
          store: createSupabaseWebhookStore(supabaseAdmin),
        });
        return Response.json(outcome.body, { status: outcome.status });
      },
    },
  },
});
