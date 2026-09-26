import { getRequest } from "@tanstack/react-start/server";
import {
  RATE_LIMIT_RULES,
  RateLimitError,
  RateLimiter,
  clientIpFromHeaders,
  type RateLimitAction,
  type RateLimitDecision,
} from "./rate-limit";

const limiter = new RateLimiter();

function currentRequest(): Request | null {
  try {
    return getRequest();
  } catch {
    return null;
  }
}

/** Caller IP for the request that invoked the current server function / route. */
export function requestClientIp(request?: Request | null): string {
  const req = request === undefined ? currentRequest() : request;
  return clientIpFromHeaders(req?.headers ?? null);
}

/**
 * Consumes one token for `action` on behalf of the current caller and throws a
 * customer-safe RateLimitError (HTTP 429 semantics) when the window is spent.
 * `extraKey` scopes the bucket further (e.g. a user id or an email) so one
 * abusive account cannot lock out a whole office behind a single IP.
 */
export function enforceRateLimit(
  action: RateLimitAction,
  opts: { extraKey?: string | undefined; request?: Request | null | undefined } = {},
): RateLimitDecision {
  const ip = requestClientIp(opts.request);
  const key = `${action}:${ip}${opts.extraKey ? `:${opts.extraKey.toLowerCase()}` : ""}`;
  const decision = limiter.consume(key, RATE_LIMIT_RULES[action]);
  if (!decision.allowed) {
    console.warn(`[rate-limit] ${action} blocked for ${ip}${opts.extraKey ? ` (${opts.extraKey})` : ""}`);
    throw new RateLimitError(decision.retryAfterSec);
  }
  return decision;
}

/** Same check for raw HTTP routes — returns a 429 Response instead of throwing. */
export function rateLimitResponse(action: RateLimitAction, request: Request, extraKey?: string): Response | null {
  try {
    enforceRateLimit(action, { request, extraKey });
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(error.retryAfterSec) },
      });
    }
    throw error;
  }
}

export { RateLimitError };
