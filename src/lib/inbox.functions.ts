import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOptionalUserClient } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { resolveCoupon } from "./coupons.server";
import { asExt } from "./db-ext";

// ---------- contact messages ----------

const messageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30),
  message: z.string().trim().min(5).max(4000),
});

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => messageSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await createOptionalUserClient();
    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), is_read: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("contact_messages").update({ is_read: data.is_read }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- new-item counts ----------

export const adminCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const s = context.supabase;
    const [orders, bookings, messages, reviews] = await Promise.all([
      s.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
      s.from("bookings").select("id", { count: "exact", head: true }).eq("status", "new"),
      s.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
      // Tolerates the reviews table not existing yet (count → 0).
      asExt(s).from("product_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    return {
      orders: orders.count ?? 0,
      bookings: bookings.count ?? 0,
      messages: messages.count ?? 0,
      reviews: reviews.error ? 0 : (reviews.count ?? 0),
    };
  });

// ---------- coupons ----------

export const checkCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(1).max(40),
        templateSlug: z.string().min(1).max(120),
        tierId: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabase } = await createOptionalUserClient();
    const { data: template } = await supabase
      .from("templates")
      .select("price, compare_at_price, tiers")
      .eq("slug", data.templateSlug)
      .eq("is_published", true)
      .maybeSingle();
    if (!template) throw new Error("Product not found");
    const { resolvePrice } = await import("./payments/pricing");
    const { price } = resolvePrice(template, data.tierId || null);
    return resolveCoupon(data.code, price);
  });

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const couponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _"),
  kind: z.enum(["percent", "flat"]),
  value: z.number().int().positive().max(1000000),
  expires_at: z.string().nullable(),
  max_uses: z.number().int().positive().nullable(),
  is_active: z.boolean(),
});

export const adminSaveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => couponSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.kind === "percent" && data.value > 100) throw new Error("Percent discount can't be above 100");
    const row = {
      code: data.code.toUpperCase(),
      kind: data.kind,
      value: data.value,
      expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      max_uses: data.max_uses,
      is_active: data.is_active,
    };
    const { error } = data.id
      ? await context.supabase.from("coupons").update(row).eq("id", data.id)
      : await context.supabase.from("coupons").insert(row);
    if (error) throw new Error(error.code === "23505" ? "A coupon with this code already exists" : error.message);
    return { ok: true };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
