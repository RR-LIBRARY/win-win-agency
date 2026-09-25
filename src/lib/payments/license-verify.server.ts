/**
 * Licence verification used by shipped software (see /api/public/license/verify).
 *
 * Activation is a compare-and-swap: the UPDATE only applies when the row still
 * has the activation count we read, so two devices activating the same key at
 * the same instant can never both squeeze through the last free slot.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isLicenseKeyFormat, normalizeLicenseKey } from "./license";

type Admin = SupabaseClient<Database>;

export type LicenseVerifyInput = { key: string; activate?: boolean | undefined; product?: string | undefined };

export type LicenseVerifyResult = {
  status: number;
  body:
    | { valid: false; reason: string; activations?: number; max_activations?: number }
    | {
        valid: true;
        product: string | null;
        product_name: string | null;
        latest_version: string | null;
        activations: number;
        max_activations: number;
        issued_at: string;
      };
};

const MAX_CAS_ATTEMPTS = 4;

export async function verifyLicense(admin: Admin, input: LicenseVerifyInput): Promise<LicenseVerifyResult> {
  const key = normalizeLicenseKey(input.key);
  if (!isLicenseKeyFormat(key)) return { status: 200, body: { valid: false, reason: "malformed" } };

  const { data: license, error } = await admin
    .from("license_keys")
    .select("id, status, activations, max_activations, template_id, created_at")
    .eq("key", key)
    .maybeSingle();
  if (error) return { status: 500, body: { valid: false, reason: "lookup_failed" } };
  if (!license) return { status: 200, body: { valid: false, reason: "not_found" } };

  const { data: product } = await admin
    .from("templates")
    .select("slug, title, version")
    .eq("id", license.template_id)
    .maybeSingle();

  if (input.product && product && input.product !== product.slug) {
    return { status: 200, body: { valid: false, reason: "wrong_product" } };
  }
  if (license.status !== "active") return { status: 200, body: { valid: false, reason: "revoked" } };

  let activations = license.activations;
  const max = license.max_activations;

  if (input.activate) {
    let claimed = false;
    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS && !claimed; attempt++) {
      if (max > 0 && activations >= max) {
        return { status: 200, body: { valid: false, reason: "activation_limit", activations, max_activations: max } };
      }
      const { data: updated, error: updateError } = await admin
        .from("license_keys")
        .update({ activations: activations + 1, last_activated_at: new Date().toISOString() })
        .eq("id", license.id)
        .eq("status", "active")
        .eq("activations", activations)
        .select("activations");
      if (updateError) return { status: 500, body: { valid: false, reason: "activation_failed" } };
      if (updated && updated.length > 0) {
        activations = updated[0]!.activations;
        claimed = true;
        break;
      }
      // Lost the race — re-read and try again against the fresh count.
      const { data: fresh } = await admin
        .from("license_keys")
        .select("status, activations")
        .eq("id", license.id)
        .maybeSingle();
      if (!fresh) return { status: 200, body: { valid: false, reason: "not_found" } };
      if (fresh.status !== "active") return { status: 200, body: { valid: false, reason: "revoked" } };
      activations = fresh.activations;
    }
    if (!claimed) {
      return { status: 200, body: { valid: false, reason: "activation_limit", activations, max_activations: max } };
    }
  }

  return {
    status: 200,
    body: {
      valid: true,
      product: product?.slug ?? null,
      product_name: product?.title ?? null,
      latest_version: product?.version ?? null,
      activations,
      max_activations: max,
      issued_at: license.created_at,
    },
  };
}
