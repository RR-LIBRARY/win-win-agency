import { Link } from "@tanstack/react-router";
import { BadgeCheck, RefreshCcw, ShieldCheck, Timer } from "lucide-react";
import { RatingStars } from "@/components/site/RatingStars";
import { formatDate } from "@/components/site/StatusBadge";
import type { PublicReview } from "@/lib/reviews.functions";

const guarantees = [
  { icon: ShieldCheck, title: "Fixed price in writing", text: "The price you see at booking is what you pay. No hidden charges." },
  { icon: Timer, title: "Timeline you can hold us to", text: "Every project gets a written delivery date before work starts." },
  { icon: RefreshCcw, title: "Free revisions", text: "Revision rounds are included in every package until you are happy with the result." },
];

/**
 * "What clients say" shows only real, approved reviews from verified buyers
 * (BIS IS 19000-style: no placeholder testimonials). When there are none yet
 * the section is skipped and only the guarantees render.
 */
export function TrustSections({ reviews }: { reviews: PublicReview[] }) {
  return (
    <>
      {reviews.length > 0 ? (
        <section className="border-b border-border" aria-labelledby="client-reviews">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="client-reviews" className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                  What clients say
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">Every review is from a verified purchase and published unedited.</p>
              </div>
              <Link to="/store" className="text-sm font-medium text-primary hover:underline">
                Browse the store
              </Link>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {reviews.slice(0, 6).map((r) => (
                <figure key={r.id} className="flex flex-col rounded-2xl border border-border bg-card p-6">
                  <RatingStars value={r.rating} size="sm" />
                  {r.title ? <p className="mt-3 font-display text-base font-semibold text-foreground">{r.title}</p> : null}
                  <blockquote className="mt-2 flex-1 text-sm text-foreground">“{r.body}”</blockquote>
                  <figcaption className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{r.author}</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified buyer
                    </span>
                    <span>· {formatDate(r.created_at)}</span>
                    {r.product ? (
                      <Link to="/store/$slug" params={{ slug: r.product.slug }} className="basis-full text-primary hover:underline">
                        on {r.product.title}
                      </Link>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}
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
