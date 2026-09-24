import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bookingSchema = z.object({
  serviceSlug: z.string().min(1),
  packageId: z.string().min(1),
  addOnIds: z.array(z.string()),
  total: z.number().nonnegative(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  company: z.string(),
  deadline: z.string(),
  details: z.string().min(10),
});

export type BookingInput = z.infer<typeof bookingSchema>;

function makeReference() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `WW-${stamp}${rand}`;
}

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    const reference = makeReference();
    console.log("[booking] new request", {
      reference,
      service: data.serviceSlug,
      package: data.packageId,
      addOns: data.addOnIds,
      total: data.total,
      name: data.name,
      email: data.email,
      phone: data.phone,
      deadline: data.deadline,
    });
    return { reference, receivedAt: new Date().toISOString() };
  });
