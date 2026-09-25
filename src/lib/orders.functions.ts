import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOptionalUserClient, makeReference } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { markCouponUsed, resolveCoupon } from "./coupons.server";
import { ORDER_STATUSES, type DeliverableRow, type OrderRow } from "./db-types";

const placeOrderSchema = z.object({
  templateSlug: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30),
  note: z.string().trim().max(2000),
  couponCode: z.string().trim().max(40).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => placeOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await createOptionalUserClient();

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, title, price, is_published")
      .eq("slug", data.templateSlug)
      .eq("is_published", true)
      .maybeSingle();
    if (templateError) throw new Error(templateError.message);
    if (!template) throw new Error("This template is no longer available");

    const coupon = data.couponCode ? await resolveCoupon(data.couponCode, template.price) : null;
    const amount = template.price - (coupon?.discount ?? 0);

    // Guests have insert-only access (no read policy), so RETURNING would be
    // rejected by RLS. Generate the identifiers here and insert without a select.
    const id = crypto.randomUUID();
    const reference = makeReference("WWT");
    const createdAt = new Date().toISOString();
    const { error } = await supabase.from("orders").insert({
      id,
      reference,
      user_id: userId,
      template_id: template.id,
      template_title: template.title,
      amount,
      coupon_code: coupon?.code ?? "",
      discount: coupon?.discount ?? 0,
      buyer_name: data.name,
      buyer_email: data.email.toLowerCase(),
      buyer_phone: data.phone,
      note: data.note,
      status: "pending_payment",
      created_at: createdAt,
    });
    if (error) throw new Error(error.message);
    if (coupon) await markCouponUsed(coupon.code);

    return {
      id,
      reference,
      amount,
      title: template.title,
      createdAt,
      linkedToAccount: Boolean(userId),
    };
  });

export type MyOrder = OrderRow & {
  template_slug: string | null;
  deliverable: Pick<DeliverableRow, "duplicate_url" | "guide_url" | "notes"> | null;
};

export const myOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrder[]> => {
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!orders || orders.length === 0) return [];

    const templateIds = Array.from(new Set(orders.map((o) => o.template_id)));
    const [{ data: templates }, { data: deliverables }] = await Promise.all([
      context.supabase.from("templates").select("id, slug").in("id", templateIds),
      context.supabase
        .from("template_deliverables")
        .select("template_id, duplicate_url, guide_url, notes")
        .in("template_id", templateIds),
    ]);

    const slugById = new Map((templates ?? []).map((t) => [t.id, t.slug]));
    const deliverableById = new Map((deliverables ?? []).map((d) => [d.template_id, d]));

    return orders.map((order) => {
      const deliverable =
        order.status === "delivered" ? (deliverableById.get(order.template_id) ?? null) : null;
      return {
        ...order,
        template_slug: slugById.get(order.template_id) ?? null,
        deliverable: deliverable
          ? { duplicate_url: deliverable.duplicate_url, guide_url: deliverable.guide_url, notes: deliverable.notes }
          : null,
      };
    });
  });

// ---------- admin ----------

export type AdminOrder = OrderRow & { template_slug: string | null };

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOrder[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    if (!orders || orders.length === 0) return [];
    const templateIds = Array.from(new Set(orders.map((o) => o.template_id)));
    const { data: templates } = await context.supabase
      .from("templates")
      .select("id, slug")
      .in("id", templateIds);
    const slugById = new Map((templates ?? []).map((t) => [t.id, t.slug]));
    return orders.map((o) => ({ ...o, template_slug: slugById.get(o.template_id) ?? null }));
  });

const updateOrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  payment_reference: z.string().max(200),
  admin_note: z.string().max(2000),
});

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: existing, error: readError } = await context.supabase
      .from("orders")
      .select("id, status, template_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error("Order not found");

    const justDelivered = data.status === "delivered" && existing.status !== "delivered";
    const patch = {
      status: data.status,
      payment_reference: data.payment_reference.trim(),
      admin_note: data.admin_note.trim(),
      ...(justDelivered ? { delivered_at: new Date().toISOString() } : {}),
    };

    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    if (justDelivered) {
      const { data: template } = await context.supabase
        .from("templates")
        .select("sales_count")
        .eq("id", existing.template_id)
        .maybeSingle();
      if (template) {
        await context.supabase
          .from("templates")
          .update({ sales_count: template.sales_count + 1 })
          .eq("id", existing.template_id);
      }
    }

    return { ok: true };
  });
