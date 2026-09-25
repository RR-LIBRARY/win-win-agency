import { parseTiers, type ProductTier } from "@/lib/db-types";

export type PriceableProduct = {
  price: number;
  compare_at_price: number | null;
  tiers: unknown;
};

export type ResolvedPrice = {
  tierId: string;
  tierName: string;
  price: number;
  compareAtPrice: number | null;
};

/**
 * Resolves the unit price for a product + optional tier id, server-side.
 * Never trust a client-provided price; only the tier *id* is accepted.
 */
export function resolvePrice(product: PriceableProduct, tierId?: string | null): ResolvedPrice {
  const tiers = parseTiers(product.tiers);
  if (tiers.length === 0) {
    return { tierId: "", tierName: "", price: product.price, compareAtPrice: product.compare_at_price };
  }
  const wanted = tierId ? tiers.find((t) => t.id === tierId) : undefined;
  const tier: ProductTier = wanted ?? tiers[0]!;
  if (tierId && !wanted) {
    throw new Error("That pricing option is no longer available");
  }
  return { tierId: tier.id, tierName: tier.name, price: tier.price, compareAtPrice: tier.compare_at_price };
}

/** Lowest tier price, used for "from ₹X" labels. */
export function startingPrice(product: PriceableProduct): number {
  const tiers = parseTiers(product.tiers);
  if (tiers.length === 0) return product.price;
  return Math.min(...tiers.map((t) => t.price));
}

export function applyDiscount(price: number, discount: number): number {
  const safeDiscount = Math.max(0, Math.min(Math.round(discount), price));
  return Math.max(0, price - safeDiscount);
}

/** Razorpay wants the smallest currency unit as an integer. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function discountPercent(price: number, compareAt: number | null): number {
  if (!compareAt || compareAt <= price || compareAt <= 0) return 0;
  return Math.round(100 - (price / compareAt) * 100);
}
