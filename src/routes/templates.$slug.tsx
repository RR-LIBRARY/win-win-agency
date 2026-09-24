import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, ExternalLink, ShieldCheck, Star } from "lucide-react";
import { TemplateCard } from "@/components/store/TemplateCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatPrice } from "@/data/services";
import { templateCover } from "@/data/template-covers";
import { categoryLabel, parseFaq } from "@/lib/db-types";
import { templateQuery } from "@/lib/templates.functions";

export const Route = createFileRoute("/templates/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(templateQuery(params.slug));
    if (!data) throw notFound();
    return { title: data.template.title, tagline: data.template.tagline, cover: data.template.cover_image_url };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — Notion template by Win Win Digital` : "Notion template";
    const description = loaderData?.tagline ?? "A Notion template from the Win Win Digital store.";
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
        ...image,
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">This template didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">Template not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been unpublished.</p>
      <Link to="/templates" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        Back to the store
      </Link>
    </div>
  ),
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(templateQuery(slug));
  const [activeImage, setActiveImage] = useState(0);

  if (!data) return null;
  const { template, related } = data;
  const images = [templateCover(template), ...template.gallery_urls];
  const faq = parseFaq(template.faq);
  const discount =
    template.compare_at_price && template.compare_at_price > template.price
      ? Math.round(100 - (template.price / template.compare_at_price) * 100)
      : 0;

  return (
    <>
      <div className="border-b border-border bg-secondary/60">
        <div className="mx-auto max-w-6xl px-5 py-4 text-sm">
          <Link to="/templates" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All templates
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
              <img
                src={images[activeImage] ?? images[0]}
                alt={template.title}
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

            <div className="mt-10 space-y-10">
              <section>
                <h2 className="font-display text-xl font-semibold text-foreground">About this template</h2>
                <p className="mt-3 whitespace-pre-line text-muted-foreground">{template.description}</p>
                {template.highlights.length > 0 ? (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                    {template.highlights.map((item) => (
                      <li key={item} className="rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {template.includes.length > 0 ? (
                <section>
                  <h2 className="font-display text-xl font-semibold text-foreground">What's included</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {template.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                      </li>
                    ))}
                  </ul>
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
              <p className="text-xs text-muted-foreground">{categoryLabel(template.category)} · Notion template</p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">{template.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{template.tagline}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-current text-chart-4" /> {Number(template.rating).toFixed(1)} ·{" "}
                {template.sales_count.toLocaleString("en-IN")} copies in use
              </p>

              <div className="mt-5 flex items-baseline gap-3">
                <span className="font-display text-3xl font-semibold text-foreground">{formatPrice(template.price)}</span>
                {template.compare_at_price && template.compare_at_price > template.price ? (
                  <>
                    <span className="text-muted-foreground line-through">{formatPrice(template.compare_at_price)}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                      {discount}% off
                    </span>
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">One-time payment · no setup charge on templates</p>

              <Link
                to="/checkout"
                search={{ template: template.slug }}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Buy now
              </Link>
              {template.preview_url ? (
                <a
                  href={template.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Preview <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}

              <ul className="mt-6 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                {[
                  "Duplicate link unlocked after payment",
                  "Works on the free Notion plan",
                  "Setup guide in Hindi and English",
                  "Lifetime updates included",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-semibold text-foreground">You may also like</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <TemplateCard key={item.id} template={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
