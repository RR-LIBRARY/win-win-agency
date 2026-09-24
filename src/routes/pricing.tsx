import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { services, addOns, formatPrice, SETUP_FEE } from "@/data/services";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Transparent package pricing for websites, apps, Notion templates, ecommerce stores, landing pages and learning platforms, including the one-time setup charge.",
      },
      { property: "og:title", content: "Pricing — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Package prices, add-ons and the one-time setup charge, all in one place.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [activeSlug, setActiveSlug] = useState(services[0]!.slug);
  const active = services.find((s) => s.slug === activeSlug) ?? services[0]!;

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Package prices, plus one setup charge. Nothing hidden."
        subtitle={`Build cost depends on the package you pick. Every project also carries a one-time setup charge of ${formatPrice(SETUP_FEE)} for hosting, domain, accounts and handover.`}
      />

      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <button
              key={service.slug}
              type="button"
              onClick={() => setActiveSlug(service.slug)}
              className={
                service.slug === activeSlug
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {service.name}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {active.packages.map((pkg, index) => (
            <div
              key={pkg.id}
              className={
                index === 1
                  ? "flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-[var(--shadow-card)]"
                  : "flex flex-col rounded-2xl border border-border bg-card p-6"
              }
            >
              {index === 1 ? (
                <span className="mb-3 self-start rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                  Most booked
                </span>
              ) : null}
              <p className="font-display text-base font-semibold text-foreground">{pkg.name}</p>
              <p className="mt-3 font-display text-3xl font-semibold text-foreground">
                {formatPrice(pkg.price)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                + {formatPrice(SETUP_FEE)} setup · {pkg.timeline}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                {pkg.includes.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <Link
                to="/book"
                search={{ service: active.slug, pkg: pkg.id }}
                className="mt-6 inline-flex justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Buy this package
              </Link>
            </div>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="font-display text-xl font-semibold text-foreground">Add-ons</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bolt any of these onto a package during booking.
          </p>
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {addOns.map((addOn) => (
              <div key={addOn.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{addOn.label}</p>
                  <p className="text-xs text-muted-foreground">{addOn.note}</p>
                </div>
                <p className="shrink-0 text-sm font-medium text-foreground">
                  {formatPrice(addOn.price)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-secondary/60 p-6 md:p-8">
          <h2 className="font-display text-lg font-semibold text-foreground">
            How payment works right now
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Booking is free. Once you send a booking we confirm the scope, then share a payment link
            for 50% to start and 50% on launch. The setup charge is billed with the first payment.
          </p>
        </section>
      </div>
    </>
  );
}
