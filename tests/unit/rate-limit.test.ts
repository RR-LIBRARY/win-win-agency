import { describe, expect, it } from "vitest";
import { RATE_LIMIT_RULES, RateLimitError, RateLimiter, clientIpFromHeaders, rateLimitMessage } from "@/lib/rate-limit";

const rule = { limit: 3, windowMs: 60_000 };

describe("RateLimiter — fixed window", () => {
  it("allows exactly `limit` requests in a window, then blocks", () => {
    const rl = new RateLimiter();
    const t0 = 1_000_000;
    expect(rl.consume("a", rule, t0)).toMatchObject({ allowed: true, remaining: 2 });
    expect(rl.consume("a", rule, t0 + 1)).toMatchObject({ allowed: true, remaining: 1 });
    expect(rl.consume("a", rule, t0 + 2)).toMatchObject({ allowed: true, remaining: 0 });
    const blocked = rl.consume("a", rule, t0 + 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(59);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("keeps separate buckets per key", () => {
    const rl = new RateLimiter();
    for (let i = 0; i < 3; i++) rl.consume("ip-1", rule, 0);
    expect(rl.consume("ip-1", rule, 0).allowed).toBe(false);
    expect(rl.consume("ip-2", rule, 0).allowed).toBe(true);
  });

  it("resets once the window has elapsed", () => {
    const rl = new RateLimiter();
    for (let i = 0; i < 3; i++) rl.consume("a", rule, 0);
    expect(rl.consume("a", rule, 59_999).allowed).toBe(false);
    expect(rl.consume("a", rule, 60_000).allowed).toBe(true);
  });

  it("blocked calls do not extend the window (no penalty creep)", () => {
    const rl = new RateLimiter();
    for (let i = 0; i < 3; i++) rl.consume("a", rule, 0);
    for (let t = 1; t < 50_000; t += 5_000) expect(rl.consume("a", rule, t).allowed).toBe(false);
    expect(rl.consume("a", rule, 60_001).allowed).toBe(true);
  });

  it("survives a burst of 200 concurrent-style calls with only `limit` passing", () => {
    const rl = new RateLimiter();
    const results = Array.from({ length: 200 }, () => rl.consume("burst", { limit: 6, windowMs: 1_000 }, 0));
    expect(results.filter((r) => r.allowed)).toHaveLength(6);
  });

  it("prunes expired buckets so memory stays bounded", () => {
    const rl = new RateLimiter();
    for (let i = 0; i < 6_000; i++) rl.consume(`k${i}`, { limit: 1, windowMs: 10 }, 0);
    expect(rl.size()).toBeLessThanOrEqual(5_000);
    rl.prune(1_000);
    expect(rl.size()).toBe(0);
  });

  it("guards against silly rules (limit 0 / negative window) instead of dividing by zero", () => {
    const rl = new RateLimiter();
    expect(rl.consume("x", { limit: 0, windowMs: -5 }, 0).allowed).toBe(true);
    expect(rl.consume("x", { limit: 0, windowMs: -5 }, 0).allowed).toBe(false);
  });
});

describe("clientIpFromHeaders", () => {
  it("prefers the platform-set real IP over a spoofable forwarded chain", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.1", "x-real-ip": "1.2.3.4" });
    expect(clientIpFromHeaders(h)).toBe("1.2.3.4");
  });
  it("falls back to the first forwarded-for hop", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
  });
  it("returns 'unknown' when nothing usable is present (shared bucket, fail-closed)", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
    expect(clientIpFromHeaders(null)).toBe("unknown");
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "x".repeat(200) }))).toBe("unknown");
  });
  it("accepts plain header objects too", () => {
    expect(clientIpFromHeaders({ "X-Real-IP": "5.5.5.5" })).toBe("5.5.5.5");
  });
});

describe("RateLimitError + rules", () => {
  it("carries 429 semantics and a customer-safe message with no infra words", () => {
    const err = new RateLimitError(45);
    expect(err.status).toBe(429);
    expect(err.message).toMatch(/wait a minute/i);
    expect(err.message).not.toMatch(/50[234]|SUPABASE|RAZORPAY/);
    expect(rateLimitMessage(600)).toMatch(/10 minutes/);
  });

  it("every public action has a sane rule", () => {
    for (const [name, r] of Object.entries(RATE_LIMIT_RULES)) {
      expect(r.limit, name).toBeGreaterThan(0);
      expect(r.windowMs, name).toBeGreaterThanOrEqual(60_000);
    }
    // Money-moving and mail-sending actions are the tightest.
    expect(RATE_LIMIT_RULES.contact.limit).toBeLessThanOrEqual(5);
    expect(RATE_LIMIT_RULES.placeOrder.limit).toBeLessThanOrEqual(10);
  });
});
