import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Loader2, LogIn, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/data/services";
import { templateCover } from "@/data/template-covers";
import { useAuth } from "@/hooks/useAuth";
import { placeOrder } from "@/lib/orders.functions";
import { checkCoupon } from "@/lib/inbox.functions";
import { siteSettingsQuery } from "@/lib/settings.functions";
import { templateQuery } from "@/lib/templates.functions";

type CheckoutSearch = { template?: string | undefined };

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    template: typeof search["template"] === "string" ? search["template"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ template: search.template ?? "" }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(siteSettingsQuery);
    if (deps.template) {
      await context.queryClient.ensureQueryData(templateQuery(deps.template));
    }
  },
  head: () => ({
    meta: [
      { title: "Checkout — Win Win Digital Templates" },
      { name: "description", content: "Place your order for a Notion template. Pay by UPI or bank transfer, get the duplicate link in your account." },
      { property: "og:title", content: "Checkout — Win Win Digital Templates" },
      { property: "og:description", content: "Order a Notion template in a minute." },
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
      <PageHeader eyebrow="Checkout" title="Pick a template first." />
      <div className="mx-auto max-w-2xl px-5 py-14">
        <Link to="/templates" className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Browse templates
        </Link>
      </div>
    </>
  );
}

type Placed = { reference: string; amount: number; title: string; linkedToAccount: boolean };

function CheckoutPage() {
  const { template: slug } = Route.useSearch();
  if (!slug) return <EmptyCheckout />;
  return <CheckoutForm slug={slug} />;
}

function CheckoutForm({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(templateQuery(slug));
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  const auth = useAuth();
  const submit = useServerFn(placeOrder);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const verifyCoupon = useServerFn(checkCoupon);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [checking, setChecking] = useState(false);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setChecking(true);
    try {
      const result = await verifyCoupon({ data: { code: couponInput, templateSlug: slug } });
      setCoupon(result);
      toast.success(`Coupon applied: ${result.label}`);
    } catch (error) {
      setCoupon(null);
      toast.error(error instanceof Error ? error.message : "Coupon not valid");
    } finally {
      setChecking(false);
    }
  }

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
  const { template } = data;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await submit({
        data: { templateSlug: slug, name, email, phone, note, ...(coupon ? { couponCode: coupon.code } : {}) },
      });
      setPlaced(result);
      toast.success("Order placed", { description: `Reference ${result.reference}` });
    } catch (error) {
      toast.error("Could not place the order", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (placed) {
    const whatsapp = `https://wa.me/${settings.contact_whatsapp}?text=${encodeURIComponent(
      `Hi Win Win Digital, I placed order ${placed.reference} for "${placed.title}" (${formatPrice(placed.amount)}). Please share payment details.`,
    )}`;
    return (
      <>
        <PageHeader eyebrow="Order placed" title="Almost yours." />
        <div className="mx-auto max-w-2xl px-5 py-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <p className="text-sm text-muted-foreground">Your order reference</p>
            <p className="mt-1 font-display text-3xl font-semibold text-foreground">{placed.reference}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{placed.title}</span> · {formatPrice(placed.amount)}
            </p>

            <ol className="mt-6 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-display font-semibold text-primary">1</span>
                We send UPI / bank payment details to <span className="font-medium text-foreground">{email}</span>
                {phone ? <> and WhatsApp</> : null} within a few hours ({settings.business_hours}).
              </li>
              <li className="flex gap-3">
                <span className="font-display font-semibold text-primary">2</span>
                Pay and reply with the screenshot or transaction ID.
              </li>
              <li className="flex gap-3">
                <span className="font-display font-semibold text-primary">3</span>
                {placed.linkedToAccount
                  ? "The duplicate link unlocks under My orders in your account."
                  : "We email you the duplicate link. Create an account with the same email to see it under My orders."}
              </li>
            </ol>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp us the reference
              </a>
              {placed.linkedToAccount ? (
                <Link to="/account/orders" className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
                  Go to my orders
                </Link>
              ) : (
                <Link
                  to="/auth"
                  search={{ mode: "signup", redirect: "/account/orders" }}
                  className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Create an account
                </Link>
              )}
              <Link to="/templates" className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
                Keep browsing
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Checkout" title="Order your template." subtitle="No card needed now. Place the order, we send payment details, the link unlocks once paid." />
      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <section className="space-y-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Your details</h2>

            {!auth.loading && !auth.user ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/60 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground">
                  Sign in so this order shows up in your account with the download link.
                </p>
                <Link
                  to="/auth"
                  search={{ redirect: `/checkout?template=${slug}` }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground hover:bg-secondary"
                >
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (link is sent here)</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="phone">WhatsApp number (optional, faster)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="note">Anything we should know? (optional)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Team use, invoice details, questions…" />
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-base font-semibold text-foreground">Order summary</h2>
              <div className="mt-4 flex gap-4">
                <img
                  src={templateCover(template)}
                  alt={template.title}
                  width={1200}
                  height={800}
                  className="h-16 w-24 shrink-0 rounded-lg border border-border object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{template.title}</p>
                  <p className="text-xs text-muted-foreground">Notion template · lifetime access</p>
                </div>
              </div>
              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Template</dt>
                  <dd className="text-foreground">{formatPrice(template.price)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Setup charge</dt>
                  <dd className="text-foreground">{formatPrice(0)}</dd>
                </div>
                {coupon ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Coupon {coupon.code}</dt>
                    <dd className="text-primary">−{formatPrice(coupon.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-3">
                  <dt className="font-display font-semibold text-foreground">Total</dt>
                  <dd className="font-display text-xl font-semibold text-foreground">{formatPrice(template.price - (coupon?.discount ?? 0))}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Input
                  aria-label="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={checking}
                  className="shrink-0 rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
                >
                  {checking ? "Checking" : "Apply"}
                </button>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Placing order" : "Place order"}
              </button>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {["Pay by UPI or bank transfer after ordering", "Link unlocked once payment is confirmed", "Questions? WhatsApp us any time"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}
