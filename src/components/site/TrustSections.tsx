import { RefreshCcw, ShieldCheck, Star, Timer } from "lucide-react";

// Placeholder reviews — replace with real client feedback.
const reviews = [
  { name: "Coaching centre owner, Jaipur", text: "Fees, attendance and PDFs in one app. Parents stopped calling for every small update.", rating: 5 },
  { name: "Freelance designer, Pune", text: "Bought the client CRM template, got the link the same evening. Setup took ten minutes.", rating: 5 },
  { name: "Retail business, Delhi", text: "Clear price before we started and the site went live on the promised date.", rating: 5 },
];

const guarantees = [
  { icon: ShieldCheck, title: "Fixed price in writing", text: "The price you see at booking is what you pay. No hidden charges." },
  { icon: Timer, title: "Timeline you can hold us to", text: "Every project gets a written delivery date before work starts." },
  { icon: RefreshCcw, title: "Free revisions", text: "Revision rounds are included in every package until you are happy with the result." },
];

export function TrustSections() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">What clients say</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.name} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex gap-0.5 text-primary" aria-label={`${r.rating} out of 5`}>
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm text-foreground">“{r.text}”</blockquote>
                <figcaption className="mt-4 text-xs text-muted-foreground">{r.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
      <section className="border-b border-border bg-secondary/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          {guarantees.map((g) => (
            <div key={g.title} className="flex gap-4">
              <g.icon className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">{g.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
