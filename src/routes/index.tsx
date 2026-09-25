import { FitFinder } from "@/components/site/FitFinder";
import { TrustSections } from "@/components/site/TrustSections";
import { VideoSection } from "@/components/site/VideoSection";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Check, ExternalLink } from "lucide-react";
import heroImage from "@/assets/hero-workspace.jpg";
import { services, formatPrice } from "@/data/services";
import { projects } from "@/data/projects";
import { templatesQuery } from "@/lib/templates.functions";
import { siteSettingsQuery } from "@/lib/settings.functions";
import { featuredReviewsQuery } from "@/lib/reviews.functions";
import { siteVideosQuery } from "@/lib/videos.functions";
import { ProductCard } from "@/components/store/ProductCard";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(templatesQuery),
      context.queryClient.ensureQueryData(siteSettingsQuery),
      context.queryClient.ensureQueryData(featuredReviewsQuery),
      context.queryClient.ensureQueryData(siteVideosQuery("home")),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Win Win Digital Agency — Websites, Apps, EdTech & Notion Templates" },
      {
        name: "description",
        content:
          "We build websites, apps and EdTech systems for coaching centres, sell ready-to-use Notion templates, and offer software consulting and secure PDF storage. Fixed packages, clear prices in INR.",
      },
      {
        property: "og:title",
        content: "Win Win Digital Agency — Websites, Apps, EdTech & Notion Templates",
      },
      {
        property: "og:description",
        content:
          "A small studio that ships: fixed packages for websites, apps and coaching-centre software, plus a Notion template store.",
      },
      { property: "og:image", content: "https://winwinagency.vercel.app/og-image.jpg" },
      { name: "twitter:image", content: "https://winwinagency.vercel.app/og-image.jpg" },
    ],
  }),
  component: Home,
});

const steps = [
  { n: "01", title: "Pick and book", text: "Choose a service and package, see the total, send it." },
  { n: "02", title: "Kickoff call", text: "We agree scope, content and dates within 48 hours." },
  { n: "03", title: "Build in the open", text: "You get a live link from week one, not at the end." },
  { n: "04", title: "Launch and handover", text: "We ship it, then show you how to run it yourself." },
];

const edtechModules = [
  "Courses, batches and timetable",
  "Student admissions and profiles",
  "Fee collection, dues and receipts",
  "Attendance with parent updates",
  "Tests, marks and report cards",
  "Study material and PDF notes",
  "Notices and announcements",
  "WhatsApp enquiry and follow-ups",
];

function Home() {
  const featured = projects.slice(0, 3);
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  const { data: reviews } = useSuspenseQuery(featuredReviewsQuery);
  const featuredTemplates = [...templates]
    .sort(
      (a, b) =>
        Number(b.is_featured) - Number(a.is_featured) ||
        Number(b.product_type !== "notion_template") - Number(a.product_type !== "notion_template"),
    )
    .slice(0, 3);
  const edtech = services.find((s) => s.slug === "educational-projects");
  const edtechFrom = edtech ? Math.min(...edtech.packages.map((p) => p.price)) : 0;

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Win Win Digital Agency
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] font-semibold tracking-tight text-foreground md:text-6xl">
              We build the thing that makes you money.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              Websites, apps and coaching-centre software built to fixed packages — plus a store of
              ready-made software, source code and Notion systems you can buy and use today.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Book your work <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/store"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Shop the software store
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
              {[
                ["Fixed price", "in writing, before any work starts"],
                ["1-day reply", "a straight answer within one working day"],
                ["7-day refund", "on store purchases not as described"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-lg font-semibold text-foreground md:text-xl">{value}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]">
            <img
              src={heroImage}
              alt="Desk with a laptop showing a project dashboard"
              width={1600}
              height={1104}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/50">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
              Six things we do properly
            </h2>
            <Link to="/services" className="text-sm font-medium text-primary hover:underline">
              All services and inclusions
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              const from = Math.min(...service.packages.map((p) => p.price));
              return (
                <Link
                  key={service.slug}
                  to="/services"
                  hash={service.slug}
                  className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-[var(--shadow-card)]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{service.tagline}</p>
                  <p className="mt-4 text-sm font-medium text-foreground">
                    From {formatPrice(from)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <FitFinder whatsapp={settings.contact_whatsapp} />

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="grid gap-10 rounded-3xl border border-border bg-card p-8 md:grid-cols-[1.1fr_1fr] md:p-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                Our specialty
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-foreground md:text-3xl">
                EdTech apps for coaching centres and tuition classes.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Admissions, batches, fees, attendance, tests and study material — one system your
                staff can run from a phone, and parents can trust. Built many times, so yours ships
                fast.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={settings.edutech_demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {settings.edutech_demo_label} <ExternalLink className="h-4 w-4" />
                </a>
                <Link
                  to="/book"
                  search={{ service: "educational-projects" }}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Book an EdTech project
                </Link>
              </div>
              {edtechFrom ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Packages from {formatPrice(edtechFrom)} plus a one-time setup charge.
                </p>
              ) : null}
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {edtechModules.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {featuredTemplates.length > 0 ? (
        <section className="border-b border-border bg-secondary/50">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  Software store
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground md:text-3xl">
                  Ready-made software you can start using tonight
                </h2>
              </div>
              <Link
                to="/store"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Browse the store <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTemplates.map((template) => (
                <ProductCard key={template.id} product={template} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
              Recent work
            </h2>
            <Link to="/portfolio" className="text-sm font-medium text-primary hover:underline">
              Full showcase
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((project) => (
              <Link
                key={project.slug}
                to="/portfolio/$slug"
                params={{ slug: project.slug }}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[var(--shadow-card)]"
              >
                <img
                  src={project.cover}
                  alt={project.title}
                  loading="lazy"
                  width={1200}
                  height={848}
                  className="aspect-[3/2] w-full object-cover"
                />
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">{project.serviceName}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{project.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/50">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
            How a project runs
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n}>
                <p className="font-display text-sm font-semibold text-primary">{step.n}</p>
                <h3 className="mt-2 font-display text-base font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <VideoSection placement="home" heading="See how we work" intro="Short walkthroughs of real projects and products — no sales pitch." />

      <TrustSections reviews={reviews} />

      <section>
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                  Know what it costs before you talk to us.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Pick a package, add what you need, and the booking page shows your total including
                  the one-time setup charge.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  {["Fixed package pricing", "Written timeline before we start", "No retainer lock-in"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" /> {item}
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <Link
                to="/book"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start your booking <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
