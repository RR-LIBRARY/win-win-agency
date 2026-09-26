import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SETUP_FEE, findAddOns, findService } from "@/data/services";
import { createOptionalUserClient, makeReference } from "./supabase-public.server";
import { assertAdmin } from "./admin-guard.server";
import { enforceRateLimit } from "./rate-limit.server";
import { BOOKING_STATUSES, type BookingRow } from "./db-types";

const bookingSchema = z.object({
  serviceSlug: z.string().min(1),
  packageId: z.string().min(1),
  addOnIds: z.array(z.string()).max(20),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
  company: z.string().trim().max(160),
  deadline: z.string().trim().max(40),
  details: z.string().trim().min(10).max(5000),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    enforceRateLimit("booking");
    const service = findService(data.serviceSlug);
    const pkg = service?.packages.find((p) => p.id === data.packageId);
    if (!service || !pkg) throw new Error("Unknown service or package");

    const addOns = findAddOns(data.addOnIds);
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
    const total = pkg.price + addOnsTotal + SETUP_FEE;

    const { supabase, userId } = await createOptionalUserClient();
    // Guests are insert-only under RLS, so avoid RETURNING: generate ids here.
    const reference = makeReference("WW");
    const createdAt = new Date().toISOString();

    const { error } = await supabase.from("bookings").insert({
      id: crypto.randomUUID(),
      reference,
      user_id: userId,
      service_slug: service.slug,
      service_name: service.name,
      package_id: pkg.id,
      package_name: pkg.name,
      add_on_ids: addOns.map((a) => a.id),
      package_price: pkg.price,
      add_ons_total: addOnsTotal,
      setup_fee: SETUP_FEE,
      total,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      company: data.company,
      deadline: data.deadline,
      details: data.details,
      status: "new",
      created_at: createdAt,
    });
    if (error) throw new Error(error.message);

    return {
      reference,
      receivedAt: createdAt,
      total,
      linkedToAccount: Boolean(userId),
    };
  });

export const myBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BookingRow[]> => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- admin ----------

export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BookingRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const updateBookingSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES),
  admin_note: z.string().max(2000),
});

export const adminUpdateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateBookingSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status, admin_note: data.admin_note.trim() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
