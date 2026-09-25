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
        const [{ normalizeLicenseKey, isLicenseKeyFormat }, { supabaseAdmin }] = await Promise.all([
          import("@/lib/payments/license"),
          import("@/integrations/supabase/client.server"),
        ]);
        const key = normalizeLicenseKey(parsed.key);
        if (!isLicenseKeyFormat(key)) return json({ valid: false, reason: "malformed" }, 200);

        const { data: license, error } = await supabaseAdmin
          .from("license_keys")
          .select("id, status, activations, max_activations, template_id, created_at")
          .eq("key", key)
          .maybeSingle();
        if (error) return json({ valid: false, reason: "lookup_failed" }, 500);
        if (!license) return json({ valid: false, reason: "not_found" }, 200);

        const { data: product } = await supabaseAdmin
          .from("templates")
          .select("slug, title, version")
          .eq("id", license.template_id)
          .maybeSingle();

        if (parsed.product && product && parsed.product !== product.slug) {
          return json({ valid: false, reason: "wrong_product" }, 200);
        }
        if (license.status !== "active") return json({ valid: false, reason: "revoked" }, 200);

        let activations = license.activations;
        if (parsed.activate) {
          if (license.max_activations > 0 && activations >= license.max_activations) {
            return json(
              { valid: false, reason: "activation_limit", activations, max_activations: license.max_activations },
              200,
            );
          }
          activations += 1;
          await supabaseAdmin
            .from("license_keys")
            .update({ activations, last_activated_at: new Date().toISOString() })
            .eq("id", license.id);
        }
        return json({
          valid: true,
          product: product?.slug ?? null,
          product_name: product?.title ?? null,
          latest_version: product?.version ?? null,
          activations,
          max_activations: license.max_activations,
          issued_at: license.created_at,
        });
      },
    },
  },
});
