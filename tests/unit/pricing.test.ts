import { describe, expect, it } from "vitest";
import { applyDiscount, discountPercent, resolvePrice, startingPrice, toPaise } from "@/lib/payments/pricing";

const tiers = [
  { id: "personal", name: "Personal", price: 1499, compare_at_price: 2499, description: "", includes: [] },
  { id: "business", name: "Business", price: 3999, compare_at_price: null, description: "", includes: [] },
  { id: "agency", name: "Agency", price: 8999, compare_at_price: 12999, description: "", includes: [] },
];

describe("resolvePrice", () => {
  it("uses the base price when the product has no tiers", () => {
    expect(resolvePrice({ price: 999, compare_at_price: 1299, tiers: null })).toEqual({
      tierId: "",
      tierName: "",
      price: 999,
      compareAtPrice: 1299,
    });
  });

  it("falls back to the first tier when no tier id is given", () => {
    expect(resolvePrice({ price: 0, compare_at_price: null, tiers }, null).tierId).toBe("personal");
  });

  it("resolves the requested tier by id and ignores any client-sent price", () => {
    const resolved = resolvePrice({ price: 1, compare_at_price: null, tiers }, "business");
    expect(resolved).toEqual({ tierId: "business", tierName: "Business", price: 3999, compareAtPrice: null });
  });

  it("throws for an unknown tier id (stale or tampered checkout)", () => {
    expect(() => resolvePrice({ price: 1, compare_at_price: null, tiers }, "enterprise")).toThrow(/no longer available/);
  });

  it("ignores malformed tier rows instead of pricing them at zero", () => {
    const dirty = [{ id: "x" }, { id: "ok", name: "OK", price: -5 }, { id: "real", name: "Real", price: 250.7 }];
    expect(resolvePrice({ price: 100, compare_at_price: null, tiers: dirty })).toMatchObject({ tierId: "real", price: 251 });
  });
});

describe("startingPrice", () => {
  it("returns the cheapest tier for 'from ₹X' labels", () => {
    expect(startingPrice({ price: 0, compare_at_price: null, tiers })).toBe(1499);
  });
  it("returns the base price without tiers", () => {
    expect(startingPrice({ price: 799, compare_at_price: null, tiers: [] })).toBe(799);
  });
});

describe("applyDiscount", () => {
  it("subtracts the discount", () => {
    expect(applyDiscount(1499, 300)).toBe(1199);
  });
  it("never goes below zero and never exceeds the price", () => {
    expect(applyDiscount(1499, 5000)).toBe(0);
    expect(applyDiscount(1499, -50)).toBe(1499);
  });
  it("rounds fractional discounts to whole rupees", () => {
    expect(applyDiscount(1000, 333.4)).toBe(667);
    expect(applyDiscount(1000, 333.6)).toBe(666);
  });
});

describe("toPaise", () => {
  it("converts rupees to an integer number of paise", () => {
    expect(toPaise(1499)).toBe(149900);
    expect(toPaise(0)).toBe(0);
  });
  it("is immune to binary floating point noise", () => {
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise(1499.99)).toBe(149999);
    expect(toPaise(19.995)).toBe(2000);
  });
});

describe("discountPercent", () => {
  it("computes the saving against the compare-at price", () => {
    expect(discountPercent(1499, 2499)).toBe(40);
  });
  it("returns 0 when there is no real saving", () => {
    expect(discountPercent(1499, null)).toBe(0);
    expect(discountPercent(1499, 1499)).toBe(0);
    expect(discountPercent(1499, 999)).toBe(0);
    expect(discountPercent(1499, 0)).toBe(0);
  });
});
