import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Win Win Digital Agency" },
      {
        name: "description",
        content:
          "Who we are, how we price, and how a project runs from booking to handover at Win Win Digital Agency.",
      },
      { property: "og:title", content: "About Win Win Digital Agency" },
      {
        property: "og:description",
        content: "A small studio that ships: fixed packages, weekly builds, real handover.",
      },
    ],
  }),
  component: AboutPage,
});

const beliefs = [
  {
    title: "A price before a proposal",
    text: "You should be able to see a number on the website. Packages and the setup charge are published, so the first call is about your project, not about budget guessing.",
  },
  {
    title: "Weekly, visible progress",
    text: "You get a live link in week one and it updates as we build. No month of silence followed by a big reveal.",
  },
  {
    title: "You own everything",
    text: "Code, accounts, domain, content. At handover we walk you through editing it yourself, and we write it down.",
  },
  {
    title: "Small scope, shipped",
    text: "We would rather launch a tight version and grow it than spend six months on a version nobody has used.",
  },
];

const timeline = [
  { when: "Day 0", what: "You book online and pick a package. Booking costs nothing." },
  { when: "Within 48 hrs", what: "Kickoff call. We confirm scope, content, dates and the total." },
  { when: "Week 1", what: "Design direction plus a live link you can open on your phone." },
  { when: "Build weeks", what: "Feature-by-feature progress with a short update every few days." },
  { when: "Launch week", what: "Testing, content load, go live, and a recorded walkthrough." },
  { when: "After launch", what: "Support window as per your package, then optional maintenance." },
];

function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="A small studio that would rather ship than pitch."
        subtitle="Win Win Digital Agency builds websites, apps, coaching-centre software and Notion systems for founders, local businesses and institutes who need the thing working, not a deck about it."
      />

      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <section className="grid gap-6 sm:grid-cols-2">
          {beliefs.map((belief) => (
            <div key={belief.title} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">{belief.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{belief.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            What the weeks look like
          </h2>
          <ol className="mt-8 space-y-5 border-l border-border pl-6">
            {timeline.map((item) => (
              <li key={item.when} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="font-display text-sm font-semibold text-foreground">{item.when}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.what}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-secondary/60 p-6 md:p-8">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Ready when you are
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Tell us what you want built and by when. If it is not a fit, we will say so on the first
            call.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/book"
              className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Book your work
            </Link>
            <Link
              to="/contact"
              className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Just ask a question
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
