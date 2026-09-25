/**
 * Server-only Razorpay REST client. Reads secrets inside functions (never at
 * module scope) and never leaks the key secret to callers.
 */

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
};

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env["RAZORPAY_KEY_ID"]?.trim();
  const keySecret = process.env["RAZORPAY_KEY_SECRET"]?.trim();
  if (!keyId || !keySecret) return null;
  const webhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"]?.trim() || null;
  return { keyId, keySecret, webhookSecret };
}

export function getWebhookSecret(): string | null {
  return process.env["RAZORPAY_WEBHOOK_SECRET"]?.trim() || null;
}

const BASE = "https://api.razorpay.com/v1";

export class RazorpayApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "RazorpayApiError";
    this.status = status;
    this.code = code;
  }
}

async function razorpayFetch<T>(config: RazorpayConfig, path: string, init?: RequestInit): Promise<T> {
  const auth = btoa(`${config.keyId}:${config.keySecret}`);
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const err = (body as { error?: { code?: string; description?: string } } | null)?.error;
    console.error(`[razorpay] ${init?.method ?? "GET"} ${path} failed [${response.status}] ${err?.code ?? ""} ${err?.description ?? text.slice(0, 200)}`);
    throw new RazorpayApiError(
      response.status,
      err?.code ?? "RAZORPAY_ERROR",
      err?.description ?? `Razorpay request failed (${response.status})`,
    );
  }
  return body as T;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: "created" | "attempted" | "paid";
  notes: Record<string, string>;
  created_at: number;
};

export type RazorpayPayment = {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id: string | null;
  method: string;
  captured: boolean;
  email: string | null;
  contact: string | null;
  description: string | null;
  error_code: string | null;
  error_description: string | null;
  notes: Record<string, string>;
  created_at: number;
};

export function createRazorpayOrder(
  config: RazorpayConfig,
  input: { amountPaise: number; receipt: string; notes: Record<string, string> },
): Promise<RazorpayOrder> {
  return razorpayFetch<RazorpayOrder>(config, "/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
      payment_capture: 1,
    }),
  });
}

export function fetchRazorpayPayment(config: RazorpayConfig, paymentId: string): Promise<RazorpayPayment> {
  return razorpayFetch<RazorpayPayment>(config, `/payments/${encodeURIComponent(paymentId)}`);
}

export async function fetchRazorpayOrderPayments(
  config: RazorpayConfig,
  razorpayOrderId: string,
): Promise<RazorpayPayment[]> {
  const result = await razorpayFetch<{ items: RazorpayPayment[] }>(
    config,
    `/orders/${encodeURIComponent(razorpayOrderId)}/payments`,
  );
  return result.items ?? [];
}
