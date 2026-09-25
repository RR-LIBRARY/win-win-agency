import { useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Clock, EyeOff, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { RatingStars } from "@/components/site/RatingStars";
import { REVIEW_CRITERIA, REVIEW_LIMITS, validateReview } from "@/lib/review-rules";
import { orderReviewQuery, submitReview } from "@/lib/reviews.functions";

type Props = { orderId: string; accessToken?: string | undefined };

const STAR_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"] as const;

/**
 * Buyer review card for a paid order. States: not available (table missing) →
 * nothing; already reviewed → status card; eligible → form. One review per order.
 */
export function ReviewForm({ orderId, accessToken }: Props) {
  const queryClient = useQueryClient();
  const state = useQuery(orderReviewQuery(orderId, accessToken));
  const submit = useServerFn(submitReview);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groupId = useId();

  useEffect(() => {
    if (state.data?.suggestedName && !name) setName(state.data.suggestedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data?.suggestedName]);

  if (state.isLoading || state.error || !state.data || !state.data.available) return null;
  const { review, canReview, productTitle } = state.data;

  if (review) {
    const tone =
      review.status === "approved"
        ? { icon: BadgeCheck, label: "Published", text: "Thanks — your review is live on the product page." }
        : review.status === "hidden"
          ? { icon: EyeOff, label: "Not published", text: "This review didn't meet the review guidelines, so it isn't shown publicly. Your rating was not changed." }
          : { icon: Clock, label: "Awaiting moderation", text: "Thanks! We check every review against the published guidelines (usually within one business day) and publish it unedited." };
    const Icon = tone.icon;
    return (
      <section className="rounded-xl border border-border bg-card p-4" aria-labelledby={`${groupId}-done`}>
        <p id={`${groupId}-done`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Star className="h-4 w-4 text-primary" aria-hidden="true" /> Your review
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <RatingStars value={review.rating} size="sm" />
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {tone.label}
          </span>
        </div>
        {review.title ? <p className="mt-2 text-sm font-medium text-foreground">{review.title}</p> : null}
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{review.body}</p>
        <p className="mt-3 text-xs text-muted-foreground">{tone.text}</p>
        {review.admin_reply ? (
          <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Our reply: </span>
            {review.admin_reply}
          </p>
        ) : null}
        {review.status === "approved" && review.product_slug ? (
          <Link to="/store/$slug" params={{ slug: review.product_slug }} hash="reviews" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            See it on the product page
          </Link>
        ) : null}
      </section>
    );
  }

  if (!canReview) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const checked = validateReview({ rating, title, body, author_name: name, accepted_terms: accepted });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setSaving(true);
    try {
      await submit({ data: { orderId, ...(accessToken ? { accessToken } : {}), ...checked.value } });
      toast.success("Review sent — thank you!", { description: "We'll publish it after a quick check against the guidelines." });
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the review");
    } finally {
      setSaving(false);
    }
  }

  const shown = hover || rating;

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-4" aria-labelledby={`${groupId}-heading`} noValidate>
      <p id={`${groupId}-heading`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Star className="h-4 w-4 text-primary" aria-hidden="true" /> Review {productTitle}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Verified purchase · published unedited after moderation · helps other buyers decide honestly.
      </p>

      <fieldset className="mt-4">
        <legend className="text-xs font-medium text-foreground">Your rating</legend>
        <div className="mt-1.5 flex items-center gap-3">
          <div role="radiogroup" aria-label="Star rating" className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"} — ${STAR_LABELS[n - 1]}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(0)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setRating(Math.min(5, (rating || 0) + 1));
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                    e.preventDefault();
                    setRating(Math.max(1, (rating || 1) - 1));
                  }
                }}
                tabIndex={rating === n || (rating === 0 && n === 1) ? 0 : -1}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Star className={`h-6 w-6 ${n <= shown ? "fill-current text-chart-4" : "text-border"}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {shown ? STAR_LABELS[shown - 1] : "Tap a star"}
          </span>
        </div>
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-foreground">
          Name to show
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={REVIEW_LIMITS.maxName}
            autoComplete="name"
            className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
          />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Shown as “First L.”</span>
        </label>
        <label className="block text-xs font-medium text-foreground">
          Headline <span className="font-normal text-muted-foreground">(optional)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={REVIEW_LIMITS.maxTitle}
            placeholder="e.g. Set up in one evening"
            className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
      </div>
      <label className="mt-3 block text-xs font-medium text-foreground">
        Your experience
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={REVIEW_LIMITS.maxBody}
          placeholder="What did you use it for? What worked, what didn't?"
          className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
          {body.trim().length}/{REVIEW_LIMITS.maxBody} · at least {REVIEW_LIMITS.minBody} characters · no phone numbers, emails or links
        </span>
      </label>

      <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-3">
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
          <span>
            I confirm the review guidelines below.
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {REVIEW_CRITERIA.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </span>
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {saving ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
