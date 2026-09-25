/**
 * Browser-side helper around Razorpay Checkout.js. Loads the script once and
 * resolves with the callback payload (which is then verified server-side).
 */
export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: { code?: string; description?: string; reason?: string; metadata?: { order_id?: string; payment_id?: string } };
};

type RazorpayInstance = {
  open: () => void;
  close: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
};

type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<RazorpayCtor> | null = null;

export function loadRazorpay(): Promise<RazorpayCtor> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay can only load in the browser"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;
  loading = new Promise<RazorpayCtor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const done = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay failed to initialise"));
    };
    script.addEventListener("load", done, { once: true });
    script.addEventListener(
      "error",
      () => {
        loading = null;
        reject(new Error("Could not load the payment window. Check your connection and try again."));
      },
      { once: true },
    );
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return loading;
}

export type OpenCheckoutInput = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  themeColor?: string;
};

export type CheckoutOutcome =
  | { kind: "success"; payload: RazorpaySuccess }
  | { kind: "dismissed" }
  | { kind: "failed"; message: string; paymentId: string | null };

/** Opens Razorpay Checkout and resolves once the buyer finishes, fails or closes it. */
export async function openRazorpayCheckout(input: OpenCheckoutInput): Promise<CheckoutOutcome> {
  const Razorpay = await loadRazorpay();
  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    const instance = new Razorpay({
      key: input.keyId,
      order_id: input.razorpayOrderId,
      amount: input.amountPaise,
      currency: input.currency,
      name: input.name,
      description: input.description,
      prefill: input.prefill,
      notes: input.notes ?? {},
      theme: { color: input.themeColor ?? "#0f3d3e" },
      retry: { enabled: true, max_count: 3 },
      remember_customer: false,
      handler: (response: RazorpaySuccess) => finish({ kind: "success", payload: response }),
      modal: {
        ondismiss: () => finish({ kind: "dismissed" }),
        escape: true,
        confirm_close: true,
      },
    });
    instance.on("payment.failed", (response) => {
      finish({
        kind: "failed",
        message: response.error?.description ?? response.error?.reason ?? "Payment failed",
        paymentId: response.error?.metadata?.payment_id ?? null,
      });
      instance.close();
    });
    instance.open();
  });
}
