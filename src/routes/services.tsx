import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { services, formatPrice, SETUP_FEE } from "@/data/services";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Packages — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Software websites, mobile and web apps, Notion templates, ecommerce stores, landing pages and educational projects, each with fixed packages and timelines.",
      },
      { property: "og:title", content: "Services & Packages — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Six service lines with what is included, starting prices and delivery timelines.",
      },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Six service lines, fixed packages, written timelines."
        subtitle={`Every package price below is the build cost. A one-time setup charge of ${formatPrice(SETUP_FEE)} covers hosting, domain wiring, accounts and handover.`}
      />

      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="space-y-20">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <section key={service.slug} id={service.slug} className="scroll-mt-24">
                <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
                  <div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">
                      {service.name}
                    </h2>
                    <p className="mt-1 text-sm text-primary">{service.tagline}</p>
                    <p className="mt-4 text-sm text-muted-foreground">{service.description}</p>
                    <ul className="mt-5 space-y-2">
                      {service.deliverables.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {service.packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex flex-col rounded-2xl border border-border bg-card p-5"
                      >
                        <p className="font-display text-sm font-semibold text-foreground">
                          {pkg.name}
                        </p>
                        <p className="mt-2 font-display text-xl font-semibold text-foreground">
                          {formatPrice(pkg.price)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{pkg.timeline}</p>
                        <ul className="mt-4 flex-1 space-y-1.5 text-xs text-muted-foreground">
                          {pkg.includes.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                        <Link
                          to="/book"
                          search={{ service: service.slug, pkg: pkg.id }}
                          className="mt-5 inline-flex justify-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          Book this
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
