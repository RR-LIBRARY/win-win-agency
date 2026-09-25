export type CouponResult = { code: string; discount: number; label: string };

/** Looks up a coupon with the privileged client (coupons are admin-only under RLS). */
export async function resolveCoupon(rawCode: string, price: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("coupons").select("*").eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !data.is_active) throw new Error("This coupon code is not valid");
  if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error("This coupon has expired");
  if (data.max_uses !== null && data.used_count >= data.max_uses) throw new Error("This coupon has been fully used");
  const raw = data.kind === "percent" ? Math.round((price * Math.min(data.value, 100)) / 100) : data.value;
  const discount = Math.min(raw, price);
  const label = data.kind === "percent" ? `${data.value}% off` : `₹${data.value} off`;
  return { code, discount, label };
}

// Usage is counted once the order is actually paid — see payments/fulfillment.server.ts.
