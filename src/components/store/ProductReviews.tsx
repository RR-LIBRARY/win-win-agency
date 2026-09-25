import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, MessageSquareReply } from "lucide-react";
import { RatingStars } from "@/components/site/RatingStars";
import { formatDate } from "@/components/site/StatusBadge";
import { formatRating } from "@/lib/review-rules";
import { productReviewsQuery } from "@/lib/reviews.functions";

/**
 * Product-page reviews: honest summary + verified reviews + admin replies.
 * Hidden entirely until the reviews table exists; shows a clear "no reviews
 * yet" state instead of placeholder testimonials. Loader must prefetch
 * `productReviewsQuery(templateId)`.
 */
export function ProductReviews({ templateId, productTitle }: { templateId: string; productTitle: string }) {
  const { data } = useSuspenseQuery(productReviewsQuery(templateId));
  if (!data.available) return null;
  const { summary, reviews } = data;

  return (
    <section id="reviews" className="scroll-mt-24" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="reviews-heading" className="font-display text-xl font-semibold text-foreground">
          Reviews
        </h2>
        <p className="text-xs text-muted-foreground">Only verified buyers can review · ratings are never edited</p>
      </div>

      {summary.count === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No reviews yet</p>
          <p className="mt-1">
            {productTitle} hasn't been reviewed yet. After you buy, you'll get a link to leave the first honest review — we
            publish every approved review, good or bad.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-6 rounded-2xl border border-border bg-card p-6 sm:grid-cols-[auto_1fr]">
            <div className="text-center sm:pr-6 sm:text-left">
              <p className="font-display text-4xl font-semibold text-foreground">{formatRating(summary.average)}</p>
              <RatingStars value={summary.average} size="md" className="mt-1" />
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.count} verified {summary.count === 1 ? "review" : "reviews"}
              </p>
            </div>
            <ul className="space-y-1.5" aria-label="Rating breakdown">
              {[5, 4, 3, 2, 1].map((stars) => {
                const n = summary.distribution[stars - 1] ?? 0;
                const pct = summary.count ? Math.round((n / summary.count) * 100) : 0;
                return (
                  <li key={stars} className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="w-12 shrink-0">{stars} star{stars === 1 ? "" : "s"}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                      <span className="block h-full rounded-full bg-chart-4" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right tabular-nums">{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <ul className="mt-6 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RatingStars value={r.rating} size="sm" />
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
                {r.title ? <h3 className="mt-2 font-display text-base font-semibold text-foreground">{r.title}</h3> : null}
                <p className="mt-1.5 text-sm whitespace-pre-line text-foreground">{r.body}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{r.author}</span>
                  {r.verified_purchase ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified purchase
                    </span>
                  ) : null}
                </p>
                {r.admin_reply ? (
                  <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <MessageSquareReply className="h-4 w-4 text-primary" aria-hidden="true" /> Reply from Win Win Digital
                      {r.replied_at ? <span className="font-normal text-muted-foreground">· {formatDate(r.replied_at)}</span> : null}
                    </p>
                    <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">{r.admin_reply}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        How reviews work: buyers get a review link after payment, agree to our{" "}
        <Link to="/review-policy" className="text-primary hover:underline">
          review guidelines
        </Link>
        , and we moderate only against those guidelines — we never change a rating.
      </p>
    </section>
  );
}
