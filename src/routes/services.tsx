import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { services, formatPrice, SETUP_FEE } from "@/data/services";
import { siteSettingsQuery } from "@/lib/settings.functions";

export const Route = createFileRoute("/services")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  head: () => ({
    meta: [
      { title: "Services & Packages — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Websites, apps, EdTech projects for coaching centres, Notion templates, software consulting and PDF storage — each with Basic, Standard and Premium packages and timelines.",
      },
      { property: "og:title", content: "Services & Packages — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Six service lines with what is included, who it is for, starting prices and delivery timelines.",
      },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);

  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Six service lines, fixed packages, written timelines."
        subtitle={`Every package price below is the build cost. A one-time setup charge of ${formatPrice(SETUP_FEE)} covers hosting, domain wiring, accounts and handover.`}
      />

      <div className="border-b border-border bg-secondary/50">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-5 py-4">
          {services.map((service) => (
            <a
              key={service.slug}
              href={`#${service.slug}`}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {service.name}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="space-y-24">
          {services.map((service) => {
            const Icon = service.icon;
            const isEdtech = service.slug === "educational-projects";
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

                    <p className="mt-5 text-xs font-semibold tracking-wider text-foreground uppercase">
                      Good for
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {service.forWhom.map((who) => (
                        <li
                          key={who}
                          className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"
                        >
                          {who}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-5 text-xs font-semibold tracking-wider text-foreground uppercase">
                      Every package includes
                    </p>
                    <ul className="mt-2 space-y-2">
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

                    {isEdtech ? (
                      <a
                        href={settings.edutech_demo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        {settings.edutech_demo_label} <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>

                  <div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {service.packages.map((pkg, index) => (
                        <div
                          key={pkg.id}
                          className={
                            index === 1
                              ? "relative flex flex-col rounded-2xl border-2 border-primary bg-card p-5"
                              : "flex flex-col rounded-2xl border border-border bg-card p-5"
                          }
                        >
                          {index === 1 ? (
                            <span className="absolute -top-3 left-5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                              Most picked
                            </span>
                          ) : null}
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

                    {service.faq.length > 0 ? (
                      <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
                        {service.faq.map((item) => (
                          <details key={item.q} className="group px-5 py-4">
                            <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                              {item.q}
                            </summary>
                            <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
                          </details>
                        ))}
                      </div>
                    ) : null}
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
