import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { findProject } from "@/data/projects";

export const Route = createFileRoute("/portfolio/$slug")({
  loader: ({ params }) => {
    const project = findProject(params.slug);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Project not found — Win Win Digital" }, { name: "robots", content: "noindex" }],
      };
    }
    const { project } = loaderData;
    const title = `${project.title} — ${project.serviceName} case study`;
    return {
      meta: [
        { title },
        { name: "description", content: project.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: project.summary },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { project } = Route.useLoaderData();

  return (
    <article>
      <section className="border-b border-border bg-secondary/60">
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All work
          </Link>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {project.serviceName} · {project.year}
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-5xl">
            {project.title}
          </h1>
          <p className="mt-3 text-muted-foreground">{project.client}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <img
          src={project.cover}
          alt={`${project.title} interface`}
          width={1200}
          height={848}
          className="w-full rounded-2xl border border-border object-cover"
        />

        <div className="mt-10 grid grid-cols-3 gap-6 rounded-2xl border border-border bg-card p-6">
          {project.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-xl font-semibold text-foreground md:text-2xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">The problem</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{project.problem}</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">What we built</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {project.built.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-12 rounded-2xl border border-border bg-secondary/60 p-6 md:p-8">
          <h2 className="font-display text-lg font-semibold text-foreground">The result</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {project.result}
          </p>
          <Link
            to="/book"
            search={{ service: project.serviceSlug, pkg: undefined }}
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Book something like this
          </Link>
        </section>
      </div>
    </article>
  );
}
