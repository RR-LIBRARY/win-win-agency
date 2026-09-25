import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Download, KeyRound, RefreshCw, Search, ShieldCheck, Zap } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { ProductCard } from "@/components/store/ProductCard";
import { templatesQuery } from "@/lib/templates.functions";
import { siteSettingsQuery } from "@/lib/settings.functions";
import { paymentConfigQuery } from "@/lib/payments.functions";
import { PRODUCT_TYPES, TEMPLATE_CATEGORIES } from "@/lib/db-types";
import { startingPrice } from "@/lib/payments/pricing";

type StoreSearch = { type?: string | undefined; q?: string | undefined };

export const Route = createFileRoute("/store/")({
  validateSearch: (search: Record<string, unknown>): StoreSearch => ({
    type: typeof search["type"] === "string" && search["type"] ? search["type"] : undefined,
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(templatesQuery),
      context.queryClient.ensureQueryData(siteSettingsQuery),
      context.queryClient.ensureQueryData(paymentConfigQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Software Store — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Buy ready-made software, source code, mobile apps and Notion systems built for Indian businesses and coaching institutes. Pay securely by UPI, card or net banking — instant download and licence key.",
      },
      { property: "og:title", content: "Software Store — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Coaching ERP, GST billing, WhatsApp lead bots, secure PDF storage and Notion templates — priced in ₹, delivered instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">The store didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">Nothing here</h1>
    </div>
  ),
  component: StorePage,
});

type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "newest";

const sortOptions: { id: SortKey; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
];

const trust = [
  { icon: Zap, title: "Instant delivery", text: "Download links, licence keys and Notion links unlock the moment payment is confirmed." },
  { icon: ShieldCheck, title: "Secure payments", text: "UPI, cards, net banking and wallets via Razorpay. We never see your card details." },
  { icon: KeyRound, title: "Licence you control", text: "Per-device activation limits, transfer on request, and revocation protection." },
  { icon: RefreshCw, title: "Free updates", text: "Every version we ship for a product you own lands in the same download." },
];

function StorePage() {
  const { data: products } = useSuspenseQuery(templatesQuery);
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  const { data: payment } = useSuspenseQuery(paymentConfigQuery);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const type = search.type ?? "all";
  const query = search.q ?? "";

  const availableTypes = useMemo(() => {
    const present = new Set(products.map((p) => p.product_type));
    return PRODUCT_TYPES.filter((t) => present.has(t.id));
  }, [products]);

  const availableCategories = useMemo(() => {
    const present = new Set(products.filter((p) => type === "all" || p.product_type === type).map((p) => p.category));
    return TEMPLATE_CATEGORIES.filter((c) => present.has(c.id));
  }, [products, type]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => {
      if (type !== "all" && p.product_type !== type) return false;
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      const haystack = [p.title, p.tagline, p.description, ...p.tech_stack, ...p.platforms].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => startingPrice(a) - startingPrice(b));
      case "price-desc":
        return [...list].sort((a, b) => startingPrice(b) - startingPrice(a));
      case "rating":
        return [...list].sort((a, b) => Number(b.rating) - Number(a.rating) || b.sales_count - a.sales_count);
      case "newest":
        return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
      default:
        return list;
    }
  }, [products, type, category, query, sort]);

  const setType = (next: string) => {
    setCategory("all");
    void navigate({ search: (prev) => ({ ...prev, type: next === "all" ? undefined : next }), replace: true });
  };
  const setQuery = (next: string) => {
    void navigate({ search: (prev) => ({ ...prev, q: next || undefined }), replace: true });
  };

  const totalSales = products.reduce((sum, p) => sum + p.sales_count, 0);
  const pill = (active: boolean) =>
    active
      ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      : "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground";

  return (
    <>
      {settings.store_announcement ? (
        <div className="border-b border-border bg-primary text-center text-sm font-medium text-primary-foreground">
          <div className="mx-auto max-w-6xl px-5 py-2.5">{settings.store_announcement}</div>
        </div>
      ) : null}

      <PageHeader
        eyebrow="Software store"
        title="Software that's ready on day one."
        subtitle="Coaching-institute ERP, GST billing, WhatsApp lead bots, secure PDF storage and Notion systems — built by the same team that ships custom apps. Pay once in ₹, download instantly, own it."
      >
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span>
            <strong className="font-display text-foreground">{products.length}</strong> products
          </span>
          <span>
            <strong className="font-display text-foreground">{totalSales.toLocaleString("en-IN")}+</strong> customers
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="h-4 w-4 text-primary" />
            {payment.online ? "UPI · Cards · Net banking" : "Bank transfer · UPI"}
          </span>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setType("all")} className={pill(type === "all")}>
            Everything
          </button>
          {availableTypes.map((t) => (
            <button key={t.id} type="button" onClick={() => setType(t.id)} className={pill(type === t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {availableCategories.length > 1 ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={category === "all" ? "rounded-full bg-secondary px-3 py-1.5 font-medium text-foreground" : "rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"}
              >
                All categories
              </button>
              {availableCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={category === c.id ? "rounded-full bg-secondary px-3 py-1.5 font-medium text-foreground" : "rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <label className="relative flex-1 md:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, tech, platform"
                aria-label="Search products"
                className="h-10 w-full rounded-full border border-border bg-card pr-4 pl-9 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary md:text-sm"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort products"
              className="h-10 rounded-full border border-border bg-card px-4 text-sm text-foreground outline-none focus:border-primary"
            >
              {sortOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="font-display text-lg font-semibold text-foreground">No products match</p>
            <p className="mt-2 text-sm text-muted-foreground">Try another type or clear the search.</p>
          </div>
        ) : (
          <section aria-labelledby="store-products-heading" className="mt-8">
            <h2 id="store-products-heading" className="sr-only">
              Products
            </h2>
            <p className="sr-only" aria-live="polite">
              {shown.length} {shown.length === 1 ? "product" : "products"} shown
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground">How buying works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["01", "Pick a plan", "Choose the product and edition. Every price is the final price — no setup fee, no subscription."],
            ["02", "Pay securely", payment.online ? "UPI, card, net banking or wallet through Razorpay. Takes under a minute." : "We share UPI / bank details right after you order. Pay and send the reference."],
            ["03", "Download and install", "Your order page unlocks the files, licence key and guide instantly. Everything also stays under My orders."],
          ].map(([n, title, text]) => (
            <div key={n} className="rounded-2xl border border-border bg-card p-6">
              <p className="font-display text-sm font-semibold text-primary">{n}</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-6 rounded-3xl border border-border bg-card p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-xl">
            <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">
              Need it customised, white-labelled or hosted for you?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every product here started as a client build. We adapt them to your workflows, brand and hosting — with training and support.
            </p>
          </div>
          <Link
            to="/book"
            search={{ service: "software-consulting" }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Talk to us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Download className="h-3.5 w-3.5" /> {settings.refund_policy}
        </p>
      </section>
    </>
  );
}
