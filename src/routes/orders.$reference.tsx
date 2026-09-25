import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, CreditCard, Landmark, Loader2, MessageCircle, Printer, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/PageHeader";
import { DeliveryPanel } from "@/components/store/DeliveryPanel";
import { formatDate, OrderStatusBadge } from "@/components/site/StatusBadge";
import { formatPrice } from "@/data/services";
import { useAuth } from "@/hooks/useAuth";
import { productTypeLabel } from "@/lib/db-types";
import {
  createRazorpayCheckout,
  orderViewQuery,
  paymentConfigQuery,
  reconcileOrderPayment,
  verifyRazorpayPayment,
  type OrderView,
} from "@/lib/payments.functions";
import { openRazorpayCheckout } from "@/lib/payments/razorpay-client";
import { siteSettingsQuery, type SiteSettings } from "@/lib/settings.functions";

type OrderSearch = { key?: string | undefined; pending?: string | undefined };

export const Route = createFileRoute("/orders/$reference")({
  validateSearch: (search: Record<string, unknown>): OrderSearch => ({
    key: typeof search["key"] === "string" && search["key"] ? search["key"] : undefined,
    pending: typeof search["pending"] === "string" && search["pending"] ? search["pending"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ key: search.key ?? "" }),
  loader: async ({ context, params, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(siteSettingsQuery),
      context.queryClient.ensureQueryData(paymentConfigQuery),
      deps.key ? context.queryClient.ensureQueryData(orderViewQuery(params.reference, deps.key)) : Promise.resolve(null),
    ]);
  },
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.reference} — Win Win Digital Store` },
      { name: "description", content: "Your order status, receipt, downloads and licence key." },
      { property: "og:title", content: `Order ${params.reference} — Win Win Digital Store` },
      { property: "og:description", content: "Order status, receipt, downloads and licence key." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">This order didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <OrderMissing />,
  component: OrderPage,
});

function OrderMissing() {
  return (
    <>
      <PageHeader eyebrow="Order" title="We couldn't open this order." subtitle="The link may be incomplete, or this order belongs to a different account." />
      <div className="mx-auto max-w-2xl px-5 py-14">
        <div className="flex flex-wrap gap-3">
          <Link to="/auth" search={{ redirect: "/account/orders" }} className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Sign in to see my orders
          </Link>
          <Link to="/contact" className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
            Contact support
          </Link>
        </div>
      </div>
    </>
  );
}

function OrderPage() {
  const { reference } = Route.useParams();
  const { key, pending } = Route.useSearch();
  const auth = useAuth();
  const orderQuery = useQuery({
    ...orderViewQuery(reference, key),
    // Signed-in owners without a key link need the browser's bearer token.
    enabled: Boolean(key) || (!auth.loading && Boolean(auth.user)),
  });

  if (orderQuery.isPending && (key || auth.loading || auth.user)) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-3">Opening your order…</p>
      </div>
    );
  }
  if (orderQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">This order didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{orderQuery.error.message}</p>
      </div>
    );
  }
  if (!orderQuery.data) return <OrderMissing />;
  return <OrderDetails order={orderQuery.data} accessToken={key} startPending={pending === "1"} />;
}

function OrderDetails({ order, accessToken, startPending }: { order: OrderView; accessToken?: string | undefined; startPending: boolean }) {
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  const { data: payment } = useSuspenseQuery(paymentConfigQuery);
  const queryClient = useQueryClient();
  const reconcile = useServerFn(reconcileOrderPayment);
  const startRazorpay = useServerFn(createRazorpayCheckout);
  const verify = useServerFn(verifyRazorpayPayment);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const attempts = useRef(0);
  const isPending = order.status === "pending_payment";
  const isPaid = order.status === "paid" || order.status === "delivered";
  const orderAccess = { orderId: order.id, ...(accessToken ? { accessToken } : {}) };

  function refresh(next: OrderView) {
    queryClient.setQueryData(orderViewQuery(order.reference, accessToken).queryKey, next);
  }

  async function checkPayment(silent = false) {
    if (!isPending) return;
    setChecking(true);
    try {
      const result = await reconcile({ data: orderAccess });
      refresh(result.order);
      if (result.state === "fulfilled") toast.success("Payment confirmed — your order is unlocked");
      else if (!silent) toast.message("No payment found yet", { description: "If you just paid, give it a minute and check again." });
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : "Could not check the payment");
    } finally {
      setChecking(false);
    }
  }

  // Auto-reconcile when the buyer arrives with a payment in flight (or a pending online order).
  useEffect(() => {
    if (!isPending || order.payment_provider !== "razorpay" || !payment.online) return;
    const shouldPoll = startPending || Boolean(order.razorpay_payment_id) || Boolean(order.razorpay_order_id);
    if (!shouldPoll) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || attempts.current >= 12) return;
      attempts.current += 1;
      await checkPayment(true);
    };
    void tick();
    const id = setInterval(() => void tick(), 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, order.payment_provider, order.razorpay_order_id, payment.online, startPending]);

  async function payNow() {
    setPaying(true);
    try {
      const session = await startRazorpay({ data: orderAccess });
      if (session.kind === "free") {
        refresh(session.order);
        toast.success("Order unlocked");
        return;
      }
      const outcome = await openRazorpayCheckout({
        keyId: session.keyId,
        razorpayOrderId: session.razorpayOrderId,
        amountPaise: session.amountPaise,
        currency: session.currency,
        name: settings.business_legal_name || "Win Win Digital",
        description: session.description,
        prefill: session.prefill,
        notes: { reference: session.reference },
        themeColor: "#3b82f6",
      });
      if (outcome.kind === "dismissed") return;
      if (outcome.kind === "failed") {
        toast.error("Payment failed", { description: outcome.message });
        return;
      }
      const result = await verify({
        data: {
          ...orderAccess,
          razorpayOrderId: outcome.payload.razorpay_order_id,
          razorpayPaymentId: outcome.payload.razorpay_payment_id,
          razorpaySignature: outcome.payload.razorpay_signature,
        },
      });
      refresh(result.order);
      if (result.state === "fulfilled") toast.success("Payment received — your order is unlocked");
      else toast.message("Payment is being confirmed", { description: "This usually takes under a minute." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment could not be started");
    } finally {
      setPaying(false);
    }
  }

  const whatsapp = `https://wa.me/${settings.contact_whatsapp}?text=${encodeURIComponent(
    `Hi ${settings.business_legal_name || "Win Win Digital"}, regarding order ${order.reference} (${order.template_title}, ${formatPrice(order.amount)}).`,
  )}`;

  const headline = isPending
    ? order.payment_provider === "razorpay" && (startPending || order.razorpay_payment_id)
      ? "Confirming your payment…"
      : "Almost yours — complete the payment."
    : order.status === "delivered"
      ? "Paid and unlocked. Thank you!"
      : order.status === "paid"
        ? "Payment received — delivery on the way."
        : order.status === "refunded"
          ? "This order was refunded."
          : "This order was cancelled.";

  const StatusIcon = isPaid ? CheckCircle2 : isPending ? Clock : XCircle;

  return (
    <>
      <div className="print:hidden">
        <PageHeader eyebrow={`Order ${order.reference}`} title={headline}>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <OrderStatusBadge status={order.status} />
            <span>{formatDate(order.created_at)}</span>
            {order.invoice_number ? <span>Invoice {order.invoice_number}</span> : null}
          </div>
        </PageHeader>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14 print:max-w-none print:px-0 print:py-0">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] print:block">
          <div className="space-y-6 print:hidden">
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <StatusIcon className={`mt-0.5 h-6 w-6 shrink-0 ${isPaid ? "text-primary" : isPending ? "text-chart-4" : "text-muted-foreground"}`} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold text-foreground">{order.template_title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {productTypeLabel(order.product_type)}
                    {order.tier_name ? ` · ${order.tier_name}` : ""}
                    {order.version ? ` · v${order.version}` : ""}
                  </p>
                </div>
                <span className="font-display text-xl font-semibold text-foreground">{formatPrice(order.amount)}</span>
              </div>

              {isPaid ? (
                <div className="mt-6">
                  <DeliveryPanel
                    orderId={order.id}
                    accessToken={accessToken}
                    deliverable={order.deliverable}
                    licenseKey={order.license_key}
                    licenseMaxActivations={order.license_max_activations}
                    deliveryType={order.delivery_type}
                    status={order.status}
                  />
                </div>
              ) : null}

              {isPending ? (
                <div className="mt-6 space-y-5">
                  {order.failure_reason ? (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      Last attempt: {order.failure_reason}
                    </p>
                  ) : null}
                  {payment.online ? (
                    <div className="rounded-xl border border-border p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CreditCard className="h-4 w-4 text-primary" /> Pay online — instant unlock
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">UPI, cards, net banking and wallets via Razorpay.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={payNow}
                          disabled={paying}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                          {paying ? "Opening…" : `Pay ${formatPrice(order.amount)} now`}
                        </button>
                        <button
                          type="button"
                          onClick={() => void checkPayment(false)}
                          disabled={checking}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
                        >
                          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} /> I already paid — check
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-border p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Landmark className="h-4 w-4 text-primary" /> Bank transfer / UPI
                    </p>
                    {settings.payment_upi_id || settings.payment_bank_details ? (
                      <dl className="mt-3 grid gap-2 text-sm">
                        {settings.payment_upi_id ? (
                          <div className="flex flex-wrap justify-between gap-2">
                            <dt className="text-muted-foreground">UPI ID</dt>
                            <dd className="font-mono font-medium text-foreground select-all">{settings.payment_upi_id}</dd>
                          </div>
                        ) : null}
                        {settings.payment_bank_details ? (
                          <div>
                            <dt className="text-muted-foreground">Bank details</dt>
                            <dd className="mt-1 whitespace-pre-line text-foreground">{settings.payment_bank_details}</dd>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-muted-foreground">Amount</dt>
                          <dd className="font-medium text-foreground">{formatPrice(order.amount)}</dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-muted-foreground">Add in remarks</dt>
                          <dd className="font-mono font-medium text-foreground select-all">{order.reference}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Message us on WhatsApp with your reference and we'll share UPI / bank details right away ({settings.business_hours}).
                      </p>
                    )}
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      <MessageCircle className="h-4 w-4" /> Send payment screenshot on WhatsApp
                    </a>
                    <p className="mt-2 text-xs text-muted-foreground">We confirm bank transfers manually within business hours and unlock the order here.</p>
                  </div>
                </div>
              ) : null}

              {order.status === "refunded" ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  The refund is on its way back to the original payment method (5–7 working days for cards, sooner for UPI). Any licence key from this order is now inactive.
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 text-sm">
              <h3 className="font-display text-base font-semibold text-foreground">Keep this order handy</h3>
              <p className="mt-2 text-muted-foreground">
                {order.linked_to_account
                  ? "This order is saved under My orders in your account, including downloads and the licence key."
                  : `Bookmark this page — the link is your private key to the order. Create an account with ${order.buyer_email} to see it under My orders too.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {order.linked_to_account ? (
                  <Link to="/account/orders" className="inline-flex rounded-full border border-border px-4 py-2 font-medium text-foreground hover:bg-secondary">
                    Go to my orders
                  </Link>
                ) : (
                  <Link to="/auth" search={{ mode: "signup", redirect: "/account/orders" }} className="inline-flex rounded-full border border-border px-4 py-2 font-medium text-foreground hover:bg-secondary">
                    Create an account
                  </Link>
                )}
                <Link to="/store" className="inline-flex rounded-full border border-border px-4 py-2 font-medium text-foreground hover:bg-secondary">
                  Keep browsing
                </Link>
                <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-medium text-foreground hover:bg-secondary">
                  <MessageCircle className="h-4 w-4" /> Support
                </a>
              </div>
            </section>
          </div>

          <aside>
            <Receipt order={order} settings={settings} />
          </aside>
        </div>
      </div>
    </>
  );
}

function Receipt({ order, settings }: { order: OrderView; settings: SiteSettings }) {
  const paid = order.status === "paid" || order.status === "delivered" || order.status === "refunded";
  const gross = order.amount + order.discount;
  return (
    <div className="rounded-2xl border border-border bg-card p-6 print:rounded-none print:border-0 print:p-8" id="receipt">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-base font-semibold text-foreground">{settings.business_legal_name || "Win Win Digital Agency"}</p>
          {settings.business_address ? <p className="mt-1 text-xs whitespace-pre-line text-muted-foreground">{settings.business_address}</p> : null}
          {settings.business_gstin ? <p className="mt-1 text-xs text-muted-foreground">GSTIN {settings.business_gstin}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">{settings.contact_email}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary print:hidden"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </div>

      <h3 className="mt-5 font-display text-lg font-semibold text-foreground">{paid ? "Tax invoice / receipt" : "Order summary"}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Order</dt>
        <dd className="text-right font-mono text-foreground">{order.reference}</dd>
        {order.invoice_number ? (
          <>
            <dt className="text-muted-foreground">Invoice no.</dt>
            <dd className="text-right font-mono text-foreground">{order.invoice_number}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Date</dt>
        <dd className="text-right text-foreground">{formatDate(order.paid_at ?? order.created_at)}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd className="text-right text-foreground">{order.status === "pending_payment" ? "Awaiting payment" : order.status === "refunded" ? "Refunded" : "Paid"}</dd>
        {order.payment_method || order.razorpay_payment_id ? (
          <>
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="text-right text-foreground">
              {order.payment_method ? order.payment_method.replace(/_/g, " ").toUpperCase() : "Online"}
              {order.razorpay_payment_id ? <span className="block font-mono text-[10px] text-muted-foreground">{order.razorpay_payment_id}</span> : null}
            </dd>
          </>
        ) : null}
      </dl>

      <div className="mt-5 border-t border-border pt-4 text-xs">
        <p className="text-muted-foreground">Billed to</p>
        <p className="mt-1 font-medium text-foreground">{order.buyer_company || order.buyer_name}</p>
        {order.buyer_company ? <p className="text-muted-foreground">{order.buyer_name}</p> : null}
        <p className="text-muted-foreground">{order.buyer_email}</p>
        {order.buyer_phone ? <p className="text-muted-foreground">{order.buyer_phone}</p> : null}
        {order.buyer_gstin ? <p className="text-muted-foreground">GSTIN {order.buyer_gstin}</p> : null}
      </div>

      <table className="mt-5 w-full border-t border-border text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="py-2 text-foreground">
              {order.template_title}
              {order.tier_name ? <span className="block text-muted-foreground">{order.tier_name}</span> : null}
              <span className="block text-muted-foreground">Digital product · lifetime licence</span>
            </td>
            <td className="py-2 text-right text-foreground">{formatPrice(gross)}</td>
          </tr>
          {order.discount > 0 ? (
            <tr>
              <td className="py-1 text-muted-foreground">Coupon {order.coupon_code}</td>
              <td className="py-1 text-right text-foreground">−{formatPrice(order.discount)}</td>
            </tr>
          ) : null}
          <tr className="border-t border-border">
            <td className="py-2 font-display font-semibold text-foreground">Total {settings.business_gstin ? "(incl. GST)" : ""}</td>
            <td className="py-2 text-right font-display text-base font-semibold text-foreground">{formatPrice(order.amount)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        {settings.business_gstin
          ? "Prices are inclusive of GST. This is a computer-generated invoice and does not require a signature."
          : "Supplier is not registered under GST; no GST has been charged. Computer-generated receipt, no signature required."}{" "}
        {settings.refund_policy}
      </p>
    </div>
  );
}
