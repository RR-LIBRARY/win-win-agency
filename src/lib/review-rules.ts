/**
 * Review policy — written to follow BIS IS 19000:2022 (India's standard for
 * online consumer reviews): only verified buyers, published criteria the
 * author agrees to, moderation against those criteria (never editing the
 * rating), and a visible admin response. Pure functions; unit-tested.
 */
export const REVIEW_CRITERIA = [
  "I bought this product and I'm sharing my own experience with it.",
  "My review is factual, in my own words and contains no abusive or defamatory language.",
  "I have no financial or personal interest in this product and wasn't paid for this review.",
  "I won't include personal data (phone numbers, emails) or payment details.",
] as const;

export const REVIEW_LIMITS = {
  minBody: 20,
  maxBody: 1500,
  maxTitle: 80,
  maxName: 60,
} as const;

export type ReviewableOrder = {
  status: string;
  /** ISO timestamp of payment/delivery; reviews open right after payment. */
  paid_at?: string | null;
};

/** Which orders may be reviewed: paid or delivered ones only (never pending/cancelled/refunded). */
export function canReviewOrder(order: ReviewableOrder | null | undefined): boolean {
  if (!order) return false;
  return order.status === "paid" || order.status === "delivered";
}

export type ReviewDraft = {
  rating: number;
  title: string;
  body: string;
  author_name: string;
  accepted_terms: boolean;
};

export type ReviewValidation = { ok: true; value: ReviewDraft } | { ok: false; error: string };

const CONTACT_PATTERN = /(\+?\d[\d\s-]{8,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)/;
const URL_PATTERN = /https?:\/\/|www\./i;

/** Validate + normalise a submitted review. Never alters the rating. */
export function validateReview(input: Partial<ReviewDraft>): ReviewValidation {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Pick a star rating from 1 to 5." };
  const title = (input.title ?? "").trim().replace(/\s+/g, " ").slice(0, REVIEW_LIMITS.maxTitle);
  const body = (input.body ?? "").trim().replace(/[ \t]+/g, " ");
  if (body.length < REVIEW_LIMITS.minBody) return { ok: false, error: `Tell us a little more — at least ${REVIEW_LIMITS.minBody} characters.` };
  if (body.length > REVIEW_LIMITS.maxBody) return { ok: false, error: `Keep it under ${REVIEW_LIMITS.maxBody} characters.` };
  if (CONTACT_PATTERN.test(body) || CONTACT_PATTERN.test(title)) {
    return { ok: false, error: "Please don't include phone numbers or email addresses in a review." };
  }
  if (URL_PATTERN.test(body) || URL_PATTERN.test(title)) return { ok: false, error: "Links aren't allowed in reviews." };
  const author_name = (input.author_name ?? "").trim().replace(/\s+/g, " ").slice(0, REVIEW_LIMITS.maxName);
  if (!author_name) return { ok: false, error: "Add the name to show with your review (first name is fine)." };
  if (!input.accepted_terms) return { ok: false, error: "Please confirm the review guidelines." };
  return { ok: true, value: { rating, title, body, author_name, accepted_terms: true } };
}

/** "Naveen B." style public display name from a full name. */
export function displayAuthor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Verified buyer";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

export type RatingSummary = {
  average: number;
  count: number;
  /** Index 0 = 1 star … index 4 = 5 stars. */
  distribution: [number, number, number, number, number];
};

export function summariseRatings(ratings: number[]): RatingSummary {
  const distribution: RatingSummary["distribution"] = [0, 0, 0, 0, 0];
  let sum = 0;
  let count = 0;
  for (const r of ratings) {
    if (!Number.isInteger(r) || r < 1 || r > 5) continue;
    distribution[(r - 1) as 0 | 1 | 2 | 3 | 4] += 1;
    sum += r;
    count += 1;
  }
  return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
}

/** Round to one decimal and render like "4.8" (or "5" → "5.0"). */
export function formatRating(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}
