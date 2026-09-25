import { describe, expect, it } from "vitest";
import { REVIEW_CRITERIA, canReviewOrder, displayAuthor, formatRating, summariseRatings, validateReview } from "@/lib/review-rules";

const good = {
  rating: 5,
  title: "Saved me a week",
  body: "Set up the CRM template in one evening and the onboarding guide answered every question I had.",
  author_name: "Naveen Bharat",
  accepted_terms: true,
};

describe("canReviewOrder", () => {
  it("only paid or delivered orders", () => {
    expect(canReviewOrder({ status: "paid" })).toBe(true);
    expect(canReviewOrder({ status: "delivered" })).toBe(true);
    expect(canReviewOrder({ status: "pending_payment" })).toBe(false);
    expect(canReviewOrder({ status: "refunded" })).toBe(false);
    expect(canReviewOrder({ status: "cancelled" })).toBe(false);
    expect(canReviewOrder(null)).toBe(false);
  });
});

describe("validateReview", () => {
  it("accepts a good review and never changes the rating", () => {
    const r = validateReview(good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.rating).toBe(5);
      expect(r.value.author_name).toBe("Naveen Bharat");
    }
  });

  it("requires a 1–5 integer rating", () => {
    expect(validateReview({ ...good, rating: 0 }).ok).toBe(false);
    expect(validateReview({ ...good, rating: 6 }).ok).toBe(false);
    expect(validateReview({ ...good, rating: 4.5 }).ok).toBe(false);
  });

  it("requires a minimum body and blocks contact details / links (BIS 19000 personal-data rule)", () => {
    expect(validateReview({ ...good, body: "Great!" }).ok).toBe(false);
    expect(validateReview({ ...good, body: `${good.body} Call me on +91 98765 43210.` }).ok).toBe(false);
    expect(validateReview({ ...good, body: `${good.body} mail me at a@b.co` }).ok).toBe(false);
    expect(validateReview({ ...good, body: `${good.body} see https://spam.example` }).ok).toBe(false);
  });

  it("requires a display name and consent to the published criteria", () => {
    expect(validateReview({ ...good, author_name: "  " }).ok).toBe(false);
    const r = validateReview({ ...good, accepted_terms: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/guidelines/);
    expect(REVIEW_CRITERIA.length).toBeGreaterThanOrEqual(4);
  });

  it("trims and caps long fields", () => {
    const r = validateReview({ ...good, title: "x".repeat(200), body: `${good.body}   with   spaces` });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title.length).toBe(80);
      expect(r.value.body).toContain("with spaces");
    }
  });
});

describe("summariseRatings / display", () => {
  it("averages to one decimal with a distribution", () => {
    const s = summariseRatings([5, 5, 4, 3, 9, 0]);
    expect(s.count).toBe(4);
    expect(s.average).toBe(4.3);
    expect(s.distribution).toEqual([0, 0, 1, 1, 2]);
    expect(summariseRatings([]).average).toBe(0);
  });
  it("formats ratings and shortens names", () => {
    expect(formatRating(5)).toBe("5.0");
    expect(formatRating(4.66)).toBe("4.7");
    expect(displayAuthor("Naveen Bharat Prism")).toBe("Naveen P.");
    expect(displayAuthor("Priya")).toBe("Priya");
    expect(displayAuthor("")).toBe("Verified buyer");
  });
});
