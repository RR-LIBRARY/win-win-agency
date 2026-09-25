import { describe, expect, it } from "vitest";
import {
  hmacSha256Hex,
  timingSafeEqualHex,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "@/lib/payments/signatures";

const SECRET = "test_secret_key_123";

describe("hmacSha256Hex", () => {
  it("matches a known RFC 4231 test vector", async () => {
    // HMAC-SHA256("key", "The quick brown fox jumps over the lazy dog")
    expect(await hmacSha256Hex("key", "The quick brown fox jumps over the lazy dog")).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("produces 64 lowercase hex characters", async () => {
    const digest = await hmacSha256Hex(SECRET, "order_1|pay_1");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes completely when one byte of the message changes", async () => {
    const a = await hmacSha256Hex(SECRET, "order_1|pay_1");
    const b = await hmacSha256Hex(SECRET, "order_1|pay_2");
    expect(a).not.toBe(b);
  });
});

describe("timingSafeEqualHex", () => {
  it("accepts equal strings regardless of case and surrounding whitespace", () => {
    expect(timingSafeEqualHex("ABCDEF", " abcdef ")).toBe(true);
  });
  it("rejects different lengths and empty input", () => {
    expect(timingSafeEqualHex("abc", "abcd")).toBe(false);
    expect(timingSafeEqualHex("", "")).toBe(false);
  });
  it("rejects a single-character difference", () => {
    expect(timingSafeEqualHex("deadbeef", "deadbeee")).toBe(false);
  });
  it("works for uuid-style order access tokens", () => {
    const token = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(timingSafeEqualHex(token, token.toUpperCase())).toBe(true);
    expect(timingSafeEqualHex(token, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeef")).toBe(false);
  });
});

describe("verifyPaymentSignature (checkout callback)", () => {
  it("accepts HMAC(order_id|payment_id) signed with the key secret", async () => {
    const signature = await hmacSha256Hex(SECRET, "order_ABC|pay_XYZ");
    await expect(
      verifyPaymentSignature({ razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_XYZ", signature, keySecret: SECRET }),
    ).resolves.toBe(true);
  });

  it("rejects a signature produced for a different order", async () => {
    const signature = await hmacSha256Hex(SECRET, "order_OTHER|pay_XYZ");
    await expect(
      verifyPaymentSignature({ razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_XYZ", signature, keySecret: SECRET }),
    ).resolves.toBe(false);
  });

  it("rejects a signature produced with a different secret", async () => {
    const signature = await hmacSha256Hex("wrong", "order_ABC|pay_XYZ");
    await expect(
      verifyPaymentSignature({ razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_XYZ", signature, keySecret: SECRET }),
    ).resolves.toBe(false);
  });

  it("rejects missing identifiers instead of hashing empty strings", async () => {
    const signature = await hmacSha256Hex(SECRET, "|");
    await expect(
      verifyPaymentSignature({ razorpayOrderId: "", razorpayPaymentId: "", signature, keySecret: SECRET }),
    ).resolves.toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });

  it("accepts the HMAC of the exact raw body", async () => {
    const signature = await hmacSha256Hex(SECRET, body);
    await expect(verifyWebhookSignature({ rawBody: body, signature, webhookSecret: SECRET })).resolves.toBe(true);
  });

  it("rejects when the body was re-serialised (whitespace differs)", async () => {
    const signature = await hmacSha256Hex(SECRET, body);
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    await expect(verifyWebhookSignature({ rawBody: pretty, signature, webhookSecret: SECRET })).resolves.toBe(false);
  });

  it("rejects a missing header", async () => {
    await expect(verifyWebhookSignature({ rawBody: body, signature: null, webhookSecret: SECRET })).resolves.toBe(false);
  });
});
