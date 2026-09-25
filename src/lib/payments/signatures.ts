/**
 * Razorpay signature helpers. Pure Web Crypto so they run in the edge
 * runtime, Node and the test runner alike. No secrets are stored here.
 */

const encoder = new TextEncoder();

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time comparison of two hex strings. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (left.length === 0 || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

/** Checkout callback: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export async function verifyPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  keySecret: string;
}): Promise<boolean> {
  if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.signature) return false;
  const expected = await hmacSha256Hex(input.keySecret, `${input.razorpayOrderId}|${input.razorpayPaymentId}`);
  return timingSafeEqualHex(expected, input.signature);
}

/** Webhook: HMAC_SHA256(raw request body, webhook_secret) sent as x-razorpay-signature. */
export async function verifyWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  webhookSecret: string;
}): Promise<boolean> {
  if (!input.signature) return false;
  const expected = await hmacSha256Hex(input.webhookSecret, input.rawBody);
  return timingSafeEqualHex(expected, input.signature);
}
