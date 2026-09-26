/**
 * Fixed-window rate limiter (pure, no I/O) shared by the public write
 * endpoints — order placement, contact form, bookings, reviews, coupon
 * checks, licence verification and the assistant.
 *
 * State lives in process memory: on serverless hosting every warm instance
 * keeps its own counters, so this is a best-effort brake against floods and
 * credential-stuffing style loops rather than a hard global quota. It costs
 * zero database reads, which is what matters on the free tier.
 */

export type RateLimitDecision = {
  allowed: boolean;
  /** Requests remaining in the current window (0 when blocked). */
  remaining: number;
  /** Whole seconds until the window resets — send as Retry-After. */
  retryAfterSec: number;
};

export type RateLimitRule = {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 5_000;

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  consume(key: string, rule: RateLimitRule, now: number = Date.now()): RateLimitDecision {
    const limit = Math.max(1, Math.floor(rule.limit));
    const windowMs = Math.max(1, Math.floor(rule.windowMs));

    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (this.buckets.size >= MAX_BUCKETS) this.prune(now);
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }

    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    if (bucket.count >= limit) {
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    bucket.count += 1;
    return { allowed: true, remaining: limit - bucket.count, retryAfterSec };
  }

  /** Drop expired buckets; if still over capacity, drop the oldest. */
  prune(now: number = Date.now()) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    if (this.buckets.size >= MAX_BUCKETS) {
      const overflow = this.buckets.size - Math.floor(MAX_BUCKETS / 2);
      let removed = 0;
      for (const key of this.buckets.keys()) {
        if (removed++ >= overflow) break;
        this.buckets.delete(key);
      }
    }
  }

  size() {
    return this.buckets.size;
  }

  reset() {
    this.buckets.clear();
  }
}

export class RateLimitError extends Error {
  status = 429 as const;
  retryAfterSec: number;
  constructor(retryAfterSec: number, message?: string) {
    super(message ?? rateLimitMessage(retryAfterSec));
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

export function rateLimitMessage(retryAfterSec: number) {
  if (retryAfterSec <= 60) return "Too many attempts from your connection. Please wait a minute and try again.";
  const minutes = Math.ceil(retryAfterSec / 60);
  return `Too many attempts from your connection. Please try again in about ${minutes} minutes.`;
}

/**
 * Picks the caller's IP from the usual proxy headers. Returns "unknown" when
 * nothing is present (local dev, some tests) — those callers share a bucket,
 * which is the conservative choice.
 */
export function clientIpFromHeaders(headers: Headers | Record<string, string | undefined> | null | undefined): string {
  const get = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower) return v;
    }
    return undefined;
  };
  const candidates = [
    get("x-real-ip"),
    get("x-vercel-forwarded-for"),
    get("cf-connecting-ip"),
    get("x-forwarded-for")?.split(",")[0],
  ];
  for (const c of candidates) {
    const ip = c?.trim();
    if (ip && ip.length <= 64) return ip;
  }
  return "unknown";
}

/** Per-action rules. Windows are generous for humans, tight for scripts. */
export const RATE_LIMIT_RULES = {
  placeOrder: { limit: 6, windowMs: 10 * 60_000 },
  checkout: { limit: 10, windowMs: 10 * 60_000 },
  verifyPayment: { limit: 20, windowMs: 10 * 60_000 },
  couponCheck: { limit: 15, windowMs: 10 * 60_000 },
  contact: { limit: 4, windowMs: 10 * 60_000 },
  booking: { limit: 4, windowMs: 10 * 60_000 },
  review: { limit: 6, windowMs: 60 * 60_000 },
  licenseVerify: { limit: 30, windowMs: 10 * 60_000 },
  assistant: { limit: 30, windowMs: 10 * 60_000 },
  orderLookup: { limit: 60, windowMs: 10 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitAction = keyof typeof RATE_LIMIT_RULES;
