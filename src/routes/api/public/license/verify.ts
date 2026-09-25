import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Public license check used by shipped software.
 *   POST /api/public/license/verify  { "key": "WWD-….", "activate": true }
 * Returns whether the key is active and, when `activate` is true, consumes
 * one activation slot (up to the plan's limit). Never reveals buyer details.
 */
const bodySchema = z.object({
  key: z.string().min(8).max(64),
  activate: z.boolean().optional(),
  product: z.string().max(120).optional(),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors });
}

export const Route = createFileRoute("/api/public/license/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ valid: false, reason: "invalid_request" }, 400);
        }
        const [{ verifyLicense }, { supabaseAdmin }] = await Promise.all([
          import("@/lib/payments/license-verify.server"),
          import("@/integrations/supabase/client.server"),
        ]);
        const result = await verifyLicense(supabaseAdmin, parsed);
        return json(result.body, result.status);
      },
    },
  },
});
