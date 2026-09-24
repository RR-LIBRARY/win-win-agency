import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { projects } from "@/data/projects";
import { services } from "@/data/services";

export const Route = createFileRoute("/portfolio/")({
  head: () => ({
    meta: [
      { title: "Project Showcase — Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Websites, apps, Notion systems and coaching-centre platforms we have designed and shipped, with the results each one delivered.",
      },
      { property: "og:title", content: "Project Showcase — Win Win Digital Agency" },
      {
        property: "og:description",
        content: "Case studies across six service lines, with what we built and what changed.",
      },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const [filter, setFilter] = useState<string>("all");
  const shown = filter === "all" ? projects : projects.filter((p) => p.serviceSlug === filter);

  return (
    <>
      <PageHeader
        eyebrow="Showcase"
        title="Work we are happy to be judged on."
        subtitle="Six projects across our service lines — what the client was stuck with, what we built, and what changed afterwards."
      />

      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={
              filter === "all"
                ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                : "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            All work
          </button>
          {services.map((service) => (
            <button
              key={service.slug}
              type="button"
              onClick={() => setFilter(service.slug)}
              className={
                filter === service.slug
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {service.name}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {shown.map((project) => (
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
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{project.serviceName}</span>
                  <span>·</span>
                  <span>{project.year}</span>
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
                  {project.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{project.summary}</p>
                <p className="mt-4 text-sm font-medium text-primary">Read the case study</p>
              </div>
            </Link>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            Nothing published in this category yet — ask us and we will share private examples.
          </p>
        ) : null}
      </div>
    </>
  );
}
