import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  History,
  KeyRound,
  MonitorSmartphone,
  PlayCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatPrice } from "@/data/services";
import { productCover } from "@/data/template-covers";
import { categoryLabel, DELIVERY_TYPES, parseChangelog, parseFaq, parseTiers, productTypeLabel } from "@/lib/db-types";
import { isExternalProduct, resolvePlatform, safeExternalUrl } from "@/lib/external-platforms";
import { discountPercent } from "@/lib/payments/pricing";
import { paymentConfigQuery } from "@/lib/payments.functions";
import { templateQuery } from "@/lib/templates.functions";

export const Route = createFileRoute("/store/$slug")({
  loader: async ({ context, params }) => {
    const [data] = await Promise.all([
      context.queryClient.ensureQueryData(templateQuery(params.slug)),
      context.queryClient.ensureQueryData(paymentConfigQuery),
    ]);
    if (!data) throw notFound();
    return {
      title: data.template.title,
      tagline: data.template.tagline,
      cover: data.template.cover_image_url,
      type: data.template.product_type,
    };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.title} — ${productTypeLabel(loaderData.type)} by Win Win Digital`
      : "Product — Win Win Digital";
    const description = loaderData?.tagline ?? "A product from the Win Win Digital software store.";
    const image =
      loaderData?.cover && /^https:\/\//.test(loaderData.cover)
        ? [
            { property: "og:image", content: loaderData.cover },
            { name: "twitter:image", content: loaderData.cover },
          ]
        : [];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...image,
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">This product didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">Product not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been unpublished.</p>
      <Link to="/store" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        Back to the store
      </Link>
    </div>
  ),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(templateQuery(slug));
  const { data: payment } = useSuspenseQuery(paymentConfigQuery);
  const [activeImage, setActiveImage] = useState(0);
  const [tierId, setTierId] = useState<string | null>(null);

  if (!data) return null;
  const { template: product, related } = data;
  const images = [productCover(product), ...product.gallery_urls];
  const faq = parseFaq(product.faq);
  const tiers = parseTiers(product.tiers);
  const changelog = parseChangelog(product.changelog);
  const selectedTier = tiers.length > 0 ? (tiers.find((t) => t.id === tierId) ?? tiers[0]!) : null;
  const price = selectedTier ? selectedTier.price : product.price;
  const compare = selectedTier ? selectedTier.compare_at_price : product.compare_at_price;
  const discount = discountPercent(price, compare);
  const delivery = DELIVERY_TYPES.find((d) => d.id === product.delivery_type);
  const isNotion = product.product_type === "notion_template";
  const external = isExternalProduct(product);
  const platform = resolvePlatform(product);
  const externalUrl = safeExternalUrl(product.external_url);

  const deliveryBullets = external
    ? [
        `Purchase and delivery happen on ${platform.label}`,
        `${platform.label}'s own checkout, refunds and support apply`,
        "Made by the Win Win Digital team",
        "WhatsApp us if you need help choosing",
      ]
    : isNotion
      ? ["Duplicate link unlocked instantly after payment", "Works on the free Notion plan", "Setup guide in Hindi and English", "Lifetime updates included"]
      : [
          product.delivery_type === "license"
            ? "Licence key + download unlock instantly after payment"
            : product.delivery_type === "access"
              ? "Access is provisioned within business hours"
              : "Download unlocks instantly after payment",
          product.docs_url ? "Documentation and setup guide included" : "Setup guide included",
          "Free updates for the version line you buy",
          "Email + WhatsApp support from the team that built it",
        ];

  const specs: { icon: typeof Cpu; label: string; value: string }[] = [];
  if (product.version) specs.push({ icon: History, label: "Version", value: `v${product.version}` });
  if (product.platforms.length) specs.push({ icon: MonitorSmartphone, label: "Platforms", value: product.platforms.join(", ") });
  if (product.tech_stack.length) specs.push({ icon: Cpu, label: "Built with", value: product.tech_stack.join(", ") });
  if (product.file_size) specs.push({ icon: Download, label: "Download size", value: product.file_size });
  if (external) specs.push({ icon: ExternalLink, label: "Available on", value: platform.label });
  else if (delivery) specs.push({ icon: KeyRound, label: "Delivery", value: delivery.label });

  return (
    <>
      <div className="border-b border-border bg-secondary/60">
        <div className="mx-auto max-w-6xl px-5 py-4 text-sm">
          <Link to="/store" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All products
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
              <img
                src={images[activeImage] ?? images[0]}
                alt={product.title}
                width={1200}
                height={800}
                className="aspect-[3/2] w-full object-cover"
              />
            </div>
            {images.length > 1 ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {images.map((src, index) => (
                  <button
                    key={src + index}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    className={
                      index === activeImage
                        ? "shrink-0 overflow-hidden rounded-lg border-2 border-primary"
                        : "shrink-0 overflow-hidden rounded-lg border border-border opacity-70 hover:opacity-100"
                    }
                  >
                    <img src={src} alt="" loading="lazy" width={160} height={107} className="h-16 w-24 object-cover" />
                  </button>
                ))}
              </div>
            ) : null}

            {(product.demo_url || product.video_url || product.docs_url || product.preview_url) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {product.demo_url ? (
                  <a href={product.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                    <ExternalLink className="h-4 w-4" /> Live demo
                  </a>
                ) : null}
                {product.video_url ? (
                  <a href={product.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                    <PlayCircle className="h-4 w-4" /> Watch walkthrough
                  </a>
                ) : null}
                {product.docs_url ? (
                  <a href={product.docs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                    <BookOpen className="h-4 w-4" /> Documentation
                  </a>
                ) : null}
                {product.preview_url && isNotion ? (
                  <a href={product.preview_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                    <ExternalLink className="h-4 w-4" /> Preview template
                  </a>
                ) : null}
              </div>
            )}

            {specs.length > 0 ? (
              <dl className="mt-8 grid gap-3 sm:grid-cols-2">
                {specs.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">{s.label}</dt>
                        <dd className="text-sm font-medium text-foreground">{s.value}</dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            ) : null}

            <div className="mt-10 space-y-10">
              <section>
                <h2 className="font-display text-xl font-semibold text-foreground">About {product.title}</h2>
                <p className="mt-3 whitespace-pre-line text-muted-foreground">{product.description}</p>
                {product.highlights.length > 0 ? (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                    {product.highlights.map((item) => (
                      <li key={item} className="rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {product.includes.length > 0 ? (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground">What's included</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {product.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {product.requirements.length > 0 ? (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground">Requirements</h2>
                  <ul className="mt-4 space-y-2">
                    {product.requirements.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {tiers.length > 1 ? (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground">Compare editions</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {tiers.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setTierId(tier.id)}
                        className={
                          tier.id === selectedTier?.id
                            ? "rounded-2xl border-2 border-primary bg-card p-5 text-left"
                            : "rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50"
                        }
                      >
                        <p className="font-display text-base font-semibold text-foreground">{tier.name}</p>
                        <p className="mt-1 font-display text-2xl font-semibold text-foreground">{formatPrice(tier.price)}</p>
                        {tier.description ? <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p> : null}
                        {tier.includes.length > 0 ? (
                          <ul className="mt-4 space-y-1.5">
                            {tier.includes.map((item) => (
                              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {item}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {changelog.length > 0 ? (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground">Release notes</h2>
                  <ol className="mt-4 space-y-4 border-l border-border pl-5">
                    {changelog.map((entry) => (
                      <li key={entry.version} className="relative">
                        <span className="absolute top-1.5 -left-[26px] h-2.5 w-2.5 rounded-full bg-primary" />
                        <p className="text-sm font-semibold text-foreground">
                          v{entry.version}
                          {entry.date ? <span className="ml-2 font-normal text-muted-foreground">{entry.date}</span> : null}
                        </p>
                        {entry.notes.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                            {entry.notes.map((n) => (
                              <li key={n}>· {n}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {product.license_terms ? (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground">Licence</h2>
                  <p className="mt-3 flex items-start gap-2 text-sm whitespace-pre-line text-muted-foreground">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {product.license_terms}
                  </p>
                </section>
              ) : null}

              {faq.length > 0 ? (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground">Questions</h2>
                  <Accordion type="single" collapsible className="mt-4 rounded-2xl border border-border bg-card px-5">
                    {faq.map((item, index) => (
                      <AccordionItem key={item.q} value={`faq-${index}`}>
                        <AccordionTrigger className="text-left text-sm font-medium text-foreground">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              ) : null}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs text-muted-foreground">
                {categoryLabel(product.category)} · {productTypeLabel(product.product_type)}
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">{product.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{product.tagline}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-current text-chart-4" /> {Number(product.rating).toFixed(1)} ·{" "}
                {product.sales_count.toLocaleString("en-IN")} customers
              </p>

              {tiers.length > 0 ? (
                <fieldset className="mt-5">
                  <legend className="text-xs font-medium text-muted-foreground">Choose an edition</legend>
                  <div className="mt-2 space-y-2">
                    {tiers.map((tier) => {
                      const active = tier.id === selectedTier?.id;
                      return (
                        <label
                          key={tier.id}
                          className={
                            active
                              ? "flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-primary bg-accent/40 px-4 py-3"
                              : "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 hover:border-primary/50"
                          }
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="tier"
                              value={tier.id}
                              checked={active}
                              onChange={() => setTierId(tier.id)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span>
                              <span className="block text-sm font-medium text-foreground">{tier.name}</span>
                              {tier.description ? <span className="block text-xs text-muted-foreground">{tier.description}</span> : null}
                            </span>
                          </span>
                          <span className="font-display text-sm font-semibold text-foreground">{formatPrice(tier.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              {external && price <= 0 ? (
                <p className="mt-5 text-sm font-medium text-foreground">Price shown on {platform.label}</p>
              ) : (
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-3xl font-semibold text-foreground">{formatPrice(price)}</span>
                  {compare && compare > price ? (
                    <>
                      <span className="text-muted-foreground line-through">{formatPrice(compare)}</span>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{discount}% off</span>
                    </>
                  ) : null}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {external ? `Sold and delivered by ${platform.label}` : "One-time payment · GST invoice included · no subscription"}
              </p>

              {external ? (
                externalUrl ? (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {platform.cta} <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="mt-5 rounded-xl border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
                    The external link for this product is not set yet — please{" "}
                    <Link to="/contact" className="text-primary hover:underline">
                      contact us
                    </Link>
                    .
                  </p>
                )
              ) : (
                <Link
                  to="/checkout"
                  search={{ product: product.slug, ...(selectedTier ? { tier: selectedTier.id } : {}) }}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {payment.online ? "Buy now — pay securely" : "Buy now"}
                </Link>
              )}
              {product.demo_url ? (
                <a
                  href={product.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Try the demo <ExternalLink className="h-4 w-4" />
                </a>
              ) : product.preview_url ? (
                <a
                  href={product.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Preview <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}

              <ul className="mt-6 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                {deliveryBullets.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                {external
                  ? `You'll complete the purchase on ${platform.label}. Questions? WhatsApp or email us anytime.`
                  : payment.online
                    ? "Payments secured by Razorpay · UPI, cards, net banking, wallets"
                    : "Pay by UPI or bank transfer after ordering"}
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-semibold text-foreground">You may also like</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
