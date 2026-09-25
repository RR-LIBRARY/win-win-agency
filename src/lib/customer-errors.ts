/**
 * Customer-safe error messages.
 *
 * Server functions throw plain Errors and TanStack ships the message to the
 * browser. Infrastructure failures (a missing key, a database hiccup, a
 * provider outage) must never reach a customer as "SUPABASE_SERVICE_ROLE_KEY
 * is missing" — they get a calm, actionable sentence plus a short reference
 * code the team can look up in the server logs.
 */

export const STORE_UNAVAILABLE_MESSAGE =
  "The store is temporarily unavailable. Please try again in a few minutes — nothing has been charged.";

const INTERNAL_PATTERNS: { code: string; test: RegExp }[] = [
  { code: "CONFIG", test: /environment variable|SERVICE_ROLE|SUPABASE_|LOVABLE_API_KEY|RAZORPAY_(KEY|WEBHOOK)|is not configured|not set/i },
  { code: "AUTHZ", test: /JWT|permission denied|row-level security|apikey|invalid api key|Expected 3 parts/i },
  { code: "DB", test: /PGRST\d*|relation .* does not exist|column .* does not exist|duplicate key|violates|syntax error at|schema cache|connection (refused|reset|terminated)/i },
  { code: "NET", test: /fetch failed|ECONN|ENOTFOUND|ETIMEDOUT|socket hang up|network request failed|502|503|504/i },
];

export function classifyInternalError(message: string): string | null {
  for (const { code, test } of INTERNAL_PATTERNS) {
    if (test.test(message)) return code;
  }
  return null;
}

type ZodLikeIssue = { path?: (string | number)[]; message?: string };

function isZodLike(error: unknown): error is { name: string; issues: ZodLikeIssue[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ZodError" &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

/**
 * Returns the error a customer may see. Business-rule errors ("This coupon
 * has expired") pass through untouched; infrastructure errors are replaced.
 */
export function toCustomerError(error: unknown): unknown {
  // Redirects / Response objects / anything that is not an Error travel as-is.
  if (!(error instanceof Error)) return error;

  if (isZodLike(error)) {
    const first = error.issues[0];
    const field = first?.path?.filter((p) => typeof p === "string").join(".") ?? "";
    const friendly = new Error(
      field ? `Please check the "${humanise(field)}" field and try again.` : "Please check the details you entered and try again.",
    );
    friendly.name = "ValidationError";
    return friendly;
  }

  const code = classifyInternalError(error.message);
  if (!code) return error;

  console.error(`[customer-safe:${code}]`, error);
  const safe = new Error(`${STORE_UNAVAILABLE_MESSAGE} (ref: STORE-${code})`);
  safe.name = "ServiceUnavailableError";
  return safe;
}

function humanise(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_.]/g, " ")
    .toLowerCase();
}
