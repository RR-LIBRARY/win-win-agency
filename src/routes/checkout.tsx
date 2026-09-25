import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { Building2, Check, CreditCard, ExternalLink, Landmark, Loader2, Lock, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/data/services";
import { productCover } from "@/data/template-covers";
import { useAuth } from "@/hooks/useAuth";
import { parseTiers, productTypeLabel } from "@/lib/db-types";
import { isExternalProduct, resolvePlatform, safeExternalUrl } from "@/lib/external-platforms";
import { checkCoupon } from "@/lib/inbox.functions";
import { placeOrder, type PlacedOrder } from "@/lib/orders.functions";
import { createRazorpayCheckout, paymentConfigQuery, verifyRazorpayPayment } from "@/lib/payments.functions";
import { openRazorpayCheckout } from "@/lib/payments/razorpay-client";
import { applyDiscount, discountPercent } from "@/lib/payments/pricing";
import { siteSettingsQuery } from "@/lib/settings.functions";
import { templateQuery, type PublicTemplate } from "@/lib/templates.functions";

type CheckoutSearch = { product?: string | undefined; tier?: string | undefined; template?: string | undefined };

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    product: typeof search["product"] === "string" && search["product"] ? search["product"] : undefined,
    tier: typeof search["tier"] === "string" && search["tier"] ? search["tier"] : undefined,
    template: typeof search["template"] === "string" && search["template"] ? search["template"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ product: search.product ?? search.template ?? "" }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(siteSettingsQuery),
      context.queryClient.ensureQueryData(paymentConfigQuery),
      deps.product ? context.queryClient.ensureQueryData(templateQuery(deps.product)) : Promise.resolve(null),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Secure checkout — Win Win Digital Store" },
      {
        name: "description",
        content: "Pay securely by UPI, card, net banking or wallet. Files, licence keys and links unlock instantly after payment.",
      },
      { property: "og:title", content: "Secure checkout — Win Win Digital Store" },
      { property: "og:description", content: "One page. One payment. Instant delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">Checkout didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <EmptyCheckout />,
  component: CheckoutPage,
});

function EmptyCheckout() {
  return (
    <>
      <PageHeader eyebrow="Checkout" title="Pick a product first." />
      <div className="mx-auto max-w-2xl px-5 py-14">
        <Link to="/store" className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Browse the store
        </Link>
      </div>
    </>
  );
}

function CheckoutPage() {
  const search = Route.useSearch();
  const slug = search.product ?? search.template;
  if (!slug) return <EmptyCheckout />;
  return <CheckoutForm slug={slug} initialTier={search.tier ?? null} />;
}

type PayMode = "online" | "manual";
type Stage = "form" | "paying" | "verifying" | "interrupted";

/** Products sold on Gumroad / Amazon / Fiverr etc. never go through our checkout. */
function ExternalCheckout({ product }: { product: PublicTemplate }) {
  const platform = resolvePlatform(product);
  const url = safeExternalUrl(product.external_url);
  return (
    <>
      <PageHeader eyebrow="Sold elsewhere" title={`${product.title} is sold on ${platform.label}`} subtitle="Checkout, payment and delivery happen on their site — we don't take payment for it here." />
      <div className="mx-auto max-w-xl px-5 py-12 text-center md:py-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <ExternalLink className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{product.tagline}</p>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {platform.cta} <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          <Link to="/store/$slug" params={{ slug: product.slug }} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary">
            Back to the product
          </Link>
        </div>
      </div>
    </>
  );
}

function CheckoutForm({ slug, initialTier }: { slug: string; initialTier: string | null }) {
  const { data } = useSuspenseQuery(templateQuery(slug));
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  const { data: payment } = useSuspenseQuery(paymentConfigQuery);
  const auth = useAuth();
  // This form sits inside a Suspense boundary, which React hydrates on its own
  // schedule; expose a per-form readiness flag for tests and enhancement CSS.
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const submit = useServerFn(placeOrder);
  const startRazorpay = useServerFn(createRazorpayCheckout);
  const verify = useServerFn(verifyRazorpayPayment);
  const verifyCoupon = useServerFn(checkCoupon);

  const [stage, setStage] = useState<Stage>("form");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [wantsGst, setWantsGst] = useState(false);
  const [company, setCompany] = useState("");
  const [gstin, setGstin] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<PayMode>(payment.online ? "online" : "manual");

  const tiers = useMemo(() => parseTiers(data?.template.tiers), [data]);
  const [tierId, setTierId] = useState<string | null>(initialTier);
  const selectedTier = tiers.length > 0 ? (tiers.find((t) => t.id === tierId) ?? tiers[0]!) : null;

  const profileQuery = useQuery({
    queryKey: ["checkout-prefill", auth.user?.id ?? "anon"],
    enabled: Boolean(auth.user),
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", auth.user!.id)
        .maybeSingle();
      return profile;
    },
  });

  useEffect(() => {
    if (!auth.user) return;
    const profile = profileQuery.data;
    setName((v) => v || profile?.full_name || auth.displayName);
    setEmail((v) => v || profile?.email || auth.user?.email || "");
    setPhone((v) => v || profile?.phone || "");
  }, [auth.user, auth.displayName, profileQuery.data]);

  if (!data) return <EmptyCheckout />;
  const { template: product } = data;
  if (isExternalProduct(product)) return <ExternalCheckout product={product} />;
  const basePrice = selectedTier ? selectedTier.price : product.price;
  const compareAt = selectedTier ? selectedTier.compare_at_price : product.compare_at_price;
  const total = applyDiscount(basePrice, coupon?.discount ?? 0);
  const savings = discountPercent(basePrice, compareAt);
  const busy = stage === "paying" || stage === "verifying";

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setChecking(true);
    try {
      const result = await verifyCoupon({
        data: { code: couponInput, templateSlug: slug, ...(selectedTier ? { tierId: selectedTier.id } : {}) },
      });
      setCoupon(result);
      toast.success(`Coupon applied: ${result.label}`);
    } catch (error) {
      setCoupon(null);
      toast.error(error instanceof Error ? error.message : "Coupon not valid");
    } finally {
      setChecking(false);
    }
  }

  function goToOrder(reference: string, accessToken: string, extra?: Record<string, string>) {
    return navigate({ to: "/orders/$reference", params: { reference }, search: { key: accessToken, ...extra } });
  }

  async function payOnline(order: PlacedOrder) {
    setStage("paying");
    setLastError(null);
    try {
      const session = await startRazorpay({ data: { orderId: order.id, accessToken: order.accessToken } });
      if (session.kind === "free") {
        toast.success("Order unlocked — no payment needed");
        await goToOrder(order.reference, order.accessToken);
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
      if (outcome.kind === "dismissed") {
        setStage("interrupted");
        setLastError(null);
        return;
      }
      if (outcome.kind === "failed") {
        setStage("interrupted");
        setLastError(outcome.message);
        return;
      }
      setStage("verifying");
      const result = await verify({
        data: {
          orderId: order.id,
          accessToken: order.accessToken,
          razorpayOrderId: outcome.payload.razorpay_order_id,
          razorpayPaymentId: outcome.payload.razorpay_payment_id,
          razorpaySignature: outcome.payload.razorpay_signature,
        },
      });
      if (result.state === "fulfilled") toast.success("Payment received", { description: `Order ${order.reference} is unlocked.` });
      else toast.message("Payment is being confirmed", { description: "This usually takes under a minute." });
      await goToOrder(order.reference, order.accessToken, result.state === "processing" ? { pending: "1" } : undefined);
    } catch (error) {
      setStage("interrupted");
      setLastError(error instanceof Error ? error.message : "Payment could not be started. Please try again.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setStage("paying");
    setLastError(null);
    let order = placed;
    try {
      if (!order) {
        order = await submit({
          data: {
            templateSlug: slug,
            ...(selectedTier ? { tierId: selectedTier.id } : {}),
            name,
            email,
            phone,
            note,
            ...(wantsGst ? { company, gstin } : {}),
            ...(coupon ? { couponCode: coupon.code } : {}),
            paymentMode: mode,
          },
        });
        setPlaced(order);
      }
    } catch (error) {
      setStage("form");
      toast.error("Could not create the order", { description: error instanceof Error ? error.message : "Please try again." });
      return;
    }
    if (mode === "manual") {
      toast.success("Order created", { description: `Reference ${order.reference}` });
      await goToOrder(order.reference, order.accessToken);
      return;
    }
    await payOnline(order);
  }

  if (stage === "interrupted" && placed) {
    return (
      <>
        <PageHeader eyebrow="Payment not completed" title="Your order is saved — finish paying whenever you're ready." />
        <div className="mx-auto max-w-2xl px-5 py-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <p className="text-sm text-muted-foreground">Order reference</p>
            <p className="mt-1 font-display text-3xl font-semibold text-foreground">{placed.reference}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{placed.title}</span>
              {placed.tierName ? ` · ${placed.tierName}` : ""} · {formatPrice(placed.amount)}
            </p>
            {lastError ? (
              <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{lastError}</p>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                The payment window was closed before the payment finished. Nothing has been charged.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void payOnline(placed)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <CreditCard className="h-4 w-4" /> Try paying again
              </button>
              <button
                type="button"
                onClick={() => void goToOrder(placed.reference, placed.accessToken)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
              >
                <Landmark className="h-4 w-4" /> Pay by bank transfer instead
              </button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Money deducted but this page says not paid? Don't pay again — open your order page; it re-checks with the bank automatically.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Secure checkout"
        title={payment.online ? "One page. One payment. Instant delivery." : "Order now, pay by UPI or bank transfer."}
        subtitle={
          payment.online
            ? "Pay with UPI, card, net banking or wallet. Your files, licence key and guide unlock the moment payment is confirmed."
            : "Place the order, we share payment details instantly on the order page, and your files unlock once we confirm the payment."
        }
      />
      <form
        onSubmit={handleSubmit}
        method="get"
        action="/checkout"
        className="mx-auto max-w-6xl px-5 py-12 md:py-16"
        aria-busy={busy}
        data-ready={hydrated ? "true" : undefined}
      >
        {/* If the form is submitted before React is interactive, the browser
            performs a plain GET: keep the product so the buyer lands back on
            this same checkout instead of "Pick a product first". */}
        <input type="hidden" name="product" value={slug} />
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <section className="space-y-8">
            <div className="space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">Your details</h2>

              {!auth.loading && !auth.user ? (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/60 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground">Sign in so every purchase shows up under My orders. Guest checkout works too.</p>
                  <Link
                    to="/auth"
                    search={{ redirect: `/checkout?product=${slug}${selectedTier ? `&tier=${selectedTier.id}` : ""}` }}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground hover:bg-secondary"
                  >
                    <LogIn className="h-4 w-4" /> Sign in
                  </Link>
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="min-h-11 text-base md:text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (receipt + download link)</Label>
                  <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="min-h-11 text-base md:text-sm" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Mobile / WhatsApp number</Label>
                  <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" className="min-h-11 text-base md:text-sm" />
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={wantsGst} onChange={(e) => setWantsGst(e.target.checked)} className="h-4 w-4 accent-primary" />
                  <Building2 className="h-4 w-4 text-muted-foreground" /> I need a GST invoice in my business name
                </label>
                {wantsGst ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company">Business name</Label>
                      <Input id="company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Registered name" className="min-h-11 text-base md:text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstin">GSTIN (optional)</Label>
                      <Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} className="min-h-11 font-mono text-base uppercase md:text-sm" />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Anything we should know? (optional)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Team size, hosting questions, customisation…" className="text-base md:text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Payment method</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {payment.online ? (
                  <label
                    className={
                      mode === "online"
                        ? "flex cursor-pointer gap-3 rounded-xl border-2 border-primary bg-accent/40 p-4"
                        : "flex cursor-pointer gap-3 rounded-xl border border-border p-4 hover:border-primary/50"
                    }
                  >
                    <input type="radio" name="mode" value="online" checked={mode === "online"} onChange={() => setMode("online")} className="mt-1 h-4 w-4 accent-primary" />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <CreditCard className="h-4 w-4" /> Pay online — instant delivery
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">UPI (GPay, PhonePe, Paytm), cards, net banking, wallets. Secured by Razorpay.</span>
                    </span>
                  </label>
                ) : null}
                <label
                  className={
                    mode === "manual"
                      ? "flex cursor-pointer gap-3 rounded-xl border-2 border-primary bg-accent/40 p-4"
                      : "flex cursor-pointer gap-3 rounded-xl border border-border p-4 hover:border-primary/50"
                  }
                >
                  <input type="radio" name="mode" value="manual" checked={mode === "manual"} onChange={() => setMode("manual")} className="mt-1 h-4 w-4 accent-primary" />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Landmark className="h-4 w-4" /> Bank transfer / UPI to our account
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {payment.online ? "We confirm manually within business hours, then unlock your order." : "Details are shown right after you order. Unlocked once we confirm."}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-base font-semibold text-foreground">Order summary</h2>
              <div className="mt-4 flex gap-4">
                <img
                  src={productCover(product)}
                  alt={product.title}
                  width={1200}
                  height={800}
                  className="h-16 w-24 shrink-0 rounded-lg border border-border object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{product.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {productTypeLabel(product.product_type)}
                    {product.version ? ` · v${product.version}` : ""} · lifetime licence
                  </p>
                </div>
              </div>

              {tiers.length > 1 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Edition</p>
                  {tiers.map((tier) => {
                    const active = tier.id === selectedTier?.id;
                    return (
                      <label
                        key={tier.id}
                        className={
                          active
                            ? "flex cursor-pointer items-center justify-between rounded-lg border-2 border-primary px-3 py-2 text-sm"
                            : "flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/50"
                        }
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="tier"
                            value={tier.id}
                            checked={active}
                            disabled={Boolean(placed)}
                            onChange={() => {
                              setTierId(tier.id);
                              setCoupon(null);
                            }}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="font-medium text-foreground">{tier.name}</span>
                        </span>
                        <span className="text-foreground">{formatPrice(tier.price)}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{selectedTier ? selectedTier.name : "Price"}</dt>
                  <dd className="text-foreground">{formatPrice(basePrice)}</dd>
                </div>
                {compareAt && compareAt > basePrice ? (
                  <div className="flex justify-between text-xs">
                    <dt className="text-muted-foreground">Launch discount</dt>
                    <dd className="text-primary">{savings}% off {formatPrice(compareAt)}</dd>
                  </div>
                ) : null}
                {coupon ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Coupon {coupon.code}</dt>
                    <dd className="text-primary">−{formatPrice(coupon.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-3">
                  <dt className="font-display font-semibold text-foreground">Total to pay</dt>
                  <dd className="font-display text-xl font-semibold text-foreground">{formatPrice(total)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">Inclusive of all taxes · no hidden fees</p>

              <div className="mt-4 flex gap-2">
                <Input
                  aria-label="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  disabled={Boolean(placed)}
                  className="min-h-11 text-base md:text-sm"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={checking || Boolean(placed)}
                  className="min-h-11 shrink-0 rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
                >
                  {checking ? "Checking" : "Apply"}
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {stage === "verifying"
                  ? "Confirming payment…"
                  : stage === "paying"
                    ? mode === "online"
                      ? "Opening secure payment…"
                      : "Creating order…"
                    : mode === "online"
                      ? `Pay ${formatPrice(total)} securely`
                      : `Place order · ${formatPrice(total)}`}
              </button>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {[
                  mode === "online" ? "256-bit encrypted checkout by Razorpay" : "Payment details shown on the next page",
                  "Instant unlock after payment is confirmed",
                  settings.refund_policy || "Refund if the product doesn't work as described",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> We never see or store your card or UPI credentials.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                By {mode === "online" ? "paying" : "placing this order"} you agree to our{" "}
                <Link to="/terms" className="underline hover:text-foreground">Terms</Link>,{" "}
                <Link to="/refund-policy" className="underline hover:text-foreground">Refund policy</Link> and{" "}
                <Link to="/delivery-policy" className="underline hover:text-foreground">Delivery policy</Link>.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}
