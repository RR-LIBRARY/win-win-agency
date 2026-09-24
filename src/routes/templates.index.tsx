import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Languages, RefreshCw, Search, Zap } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { TemplateCard } from "@/components/store/TemplateCard";
import { templatesQuery } from "@/lib/templates.functions";
import { siteSettingsQuery } from "@/lib/settings.functions";
import { TEMPLATE_CATEGORIES } from "@/lib/db-types";

export const Route = createFileRoute("/templates/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(templatesQuery),
      context.queryClient.ensureQueryData(siteSettingsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Notion Templates Store — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Ready-made Notion templates for productivity, freelancing, content, money and studies. Pay once in INR, get the duplicate link in your account.",
      },
      { property: "og:title", content: "Notion Templates Store — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Second Brain, Freelancer CRM, Content Calendar, Money Tracker, Study Planner and more — priced in ₹.",
      },
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
  component: TemplatesStorePage,
});

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

const sortOptions: { id: SortKey; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
];

const trust = [
  { icon: Zap, title: "Instant duplicate link", text: "Unlocked in your account as soon as payment is confirmed." },
  { icon: BadgeCheck, title: "Works on free Notion", text: "No paid plan needed for any template we sell." },
  { icon: Languages, title: "Hindi + English guide", text: "Every template ships with a setup walkthrough." },
  { icon: RefreshCw, title: "Lifetime updates", text: "Pay once. Improvements land in the same link." },
];

function TemplatesStorePage() {
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");

  const availableCategories = useMemo(() => {
    const present = new Set(templates.map((t) => t.category));
    return TEMPLATE_CATEGORIES.filter((c) => present.has(c.id));
  }, [templates]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = templates.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...list].sort((a, b) => b.price - a.price);
      case "rating":
        return [...list].sort((a, b) => Number(b.rating) - Number(a.rating) || b.sales_count - a.sales_count);
      default:
        return list;
    }
  }, [templates, category, query, sort]);

  return (
    <>
      {settings.store_announcement ? (
        <div className="border-b border-border bg-primary text-center text-sm font-medium text-primary-foreground">
          <div className="mx-auto max-w-6xl px-5 py-2.5">{settings.store_announcement}</div>
        </div>
      ) : null}

      <PageHeader
        eyebrow="Templates store"
        title="Notion systems you can duplicate in a minute."
        subtitle="Designed by the same team that builds apps for coaching centres and small businesses. Pay once in ₹, get the duplicate link in your account, keep it forever."
      >
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span>
            <strong className="font-display text-foreground">{templates.length}</strong> templates
          </span>
          <span>
            <strong className="font-display text-foreground">
              {templates.reduce((sum, t) => sum + t.sales_count, 0).toLocaleString("en-IN")}+
            </strong>{" "}
            copies in use
          </span>
          <span>
            <strong className="font-display text-foreground">4.8★</strong> average rating
          </span>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={
                category === "all"
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              All
            </button>
            {availableCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={
                  category === c.id
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    : "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <label className="relative flex-1 md:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                className="h-10 w-full rounded-full border border-border bg-card pr-4 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort templates"
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
            <p className="font-display text-lg font-semibold text-foreground">No templates match</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another category or clear the search.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
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
            ["01", "Place your order", "Pick a template, enter your name and email. No card needed at this step."],
            ["02", "Pay the way you like", "We send UPI or bank details to your email and WhatsApp within a few hours."],
            ["03", "Duplicate and go", "Once payment is confirmed, the Notion link unlocks in your account."],
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
              Need a template built for your team or institute?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We design custom Notion systems — dashboards, linked databases, training and a guide.
            </p>
          </div>
          <Link
            to="/book"
            search={{ service: "notion-templates" }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Book a custom template <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
