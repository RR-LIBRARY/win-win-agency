import { describe, expect, it, vi } from "vitest";
import { STORE_UNAVAILABLE_MESSAGE, classifyInternalError, toCustomerError } from "@/lib/customer-errors";

describe("toCustomerError", () => {
  it("lets business-rule errors through unchanged", () => {
    const error = new Error("This coupon has expired");
    expect(toCustomerError(error)).toBe(error);
  });

  it("replaces infrastructure errors with a calm message and a reference code", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = toCustomerError(
      new Error("Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY. Connect Supabase in Lovable Cloud."),
    ) as Error;
    expect(result.message).toBe(`${STORE_UNAVAILABLE_MESSAGE} (ref: STORE-CONFIG)`);
    expect(result.message).not.toMatch(/SUPABASE|SERVICE_ROLE/);
  });

  it.each([
    ["Expected 3 parts in JWT; got 1", "AUTHZ"],
    ["permission denied for table orders", "AUTHZ"],
    ['relation "public.coupons" does not exist', "DB"],
    ["PGRST301: JWT expired", "AUTHZ"],
    ["fetch failed", "NET"],
    ["RAZORPAY_KEY_SECRET is not set", "CONFIG"],
    ["This product is no longer available", null],
    ["Amount mismatch: expected ₹1499, received ₹1", null],
  ])("classifies %j as %s", (message, code) => {
    expect(classifyInternalError(message)).toBe(code);
  });

  it("turns validation failures into a field-level hint", () => {
    const zodLike = Object.assign(new Error('[{"path":["buyerEmail"],"message":"Invalid email"}]'), {
      name: "ZodError",
      issues: [{ path: ["buyerEmail"], message: "Invalid email" }],
    });
    const result = toCustomerError(zodLike) as Error;
    expect(result.message).toBe('Please check the "buyer email" field and try again.');
  });

  it("never touches redirects or Response objects", () => {
    const response = new Response("Unauthorized", { status: 401 });
    expect(toCustomerError(response)).toBe(response);
    const redirectLike = { isRedirect: true, statusCode: 302 };
    expect(toCustomerError(redirectLike)).toBe(redirectLike);
  });
});
