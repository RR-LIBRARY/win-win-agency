import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, isAdminUser } from "./admin-guard.server";
import type { BookingRow, OrderRow, ProfileRow } from "./db-types";

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = await isAdminUser(context.supabase, context.userId);
    return { userId: context.userId, isAdmin };
  });

export type AdminOverview = {
  orders: { total: number; pending: number; paid: number; delivered: number; revenue: number };
  bookings: { total: number; open: number; pipeline: number };
  templates: { total: number; published: number };
  customers: number;
  recentOrders: OrderRow[];
  recentBookings: BookingRow[];
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;

    const [ordersRes, bookingsRes, templatesRes, profilesRes] = await Promise.all([
      sb.from("orders").select("*").order("created_at", { ascending: false }).limit(1000),
      sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(1000),
      sb.from("templates").select("id, is_published"),
      sb.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const orders = ordersRes.data ?? [];
    const bookings = bookingsRes.data ?? [];
    const templates = templatesRes.data ?? [];

    const paidLike = orders.filter((o) => o.status === "paid" || o.status === "delivered");

    return {
      orders: {
        total: orders.length,
        pending: orders.filter((o) => o.status === "pending_payment").length,
        paid: orders.filter((o) => o.status === "paid").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
        revenue: paidLike.reduce((sum, o) => sum + o.amount, 0),
      },
      bookings: {
        total: bookings.length,
        open: bookings.filter((b) => b.status === "new" || b.status === "contacted").length,
        pipeline: bookings
          .filter((b) => b.status !== "cancelled" && b.status !== "completed")
          .reduce((sum, b) => sum + b.total, 0),
      },
      templates: {
        total: templates.length,
        published: templates.filter((t) => t.is_published).length,
      },
      customers: profilesRes.count ?? 0,
      recentOrders: orders.slice(0, 5),
      recentBookings: bookings.slice(0, 5),
    };
  });

export type TeamMember = ProfileRow & { isAdmin: boolean };

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamMember[]> => {
    await assertAdmin(context.supabase, context.userId);
    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").order("created_at", { ascending: true }).limit(500),
      context.supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    if (error) throw new Error(error.message);
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));
    return (profiles ?? []).map((p) => ({ ...p, isAdmin: adminIds.has(p.id) }));
  });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().trim().email() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", data.email)
      .maybeSingle();
    if (!profile) {
      throw new Error("No account with that email yet. Ask them to sign up first.");
    }
    const { error } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: profile.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true, userId: profile.id };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot remove your own admin access.");
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileRow | null> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.full_name, phone: data.phone })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
