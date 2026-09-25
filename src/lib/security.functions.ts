import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard.server";
import {
  canTransition,
  FINDING_STATUSES,
  MAX_RAW_INPUT,
  nextVerification,
  parseFindings,
  VERIFICATIONS,
} from "./security-triage";

export const adminListSecurity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const s = context.supabase;
    const [scans, findings] = await Promise.all([
      s.from("security_scans").select("id, title, source, ai_guidance, ai_generated_at, created_at").order("created_at", { ascending: false }).limit(50),
      s.from("security_findings").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (scans.error) throw new Error(scans.error.message);
    if (findings.error) throw new Error(findings.error.message);
    return { scans: scans.data ?? [], findings: findings.data ?? [] };
  });

export const adminCreateScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(2).max(120),
        source: z.string().trim().max(60).default("manual"),
        raw: z.string().max(MAX_RAW_INPUT),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const parsed = parseFindings(data.raw);
    if (parsed.length === 0) throw new Error("No findings recognised. Paste JSON or lines like “HIGH: title — details”.");
    const s = context.supabase;
    const { data: scan, error } = await s
      .from("security_scans")
      .insert({ title: data.title, source: data.source || "manual", raw_input: data.raw, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: fErr } = await s.from("security_findings").insert(parsed.map((f) => ({ ...f, scan_id: scan.id })));
    if (fErr) {
      await s.from("security_scans").delete().eq("id", scan.id);
      throw new Error(fErr.message);
    }
    return { id: scan.id, count: parsed.length };
  });

export const adminUpdateFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        expectedUpdatedAt: z.string().max(64),
        status: z.enum(FINDING_STATUSES).optional(),
        verification: z.enum(VERIFICATIONS).optional(),
        note: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const s = context.supabase;
    const { data: cur, error } = await s.from("security_findings").select("status, verification, verification_note, updated_at").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const status = data.status ?? cur.status;
    if (!canTransition(cur.status, status)) throw new Error(`Cannot move from ${cur.status} to ${status}.`);
    const verification = nextVerification(status, data.verification, cur.verification);
    // Optimistic concurrency: the update only lands if nobody changed the row since it was loaded.
    const { data: rows, error: uErr } = await s
      .from("security_findings")
      .update({
        status,
        verification,
        verification_note: data.note ?? cur.verification_note,
        verified_at: verification === "unverified" ? null : new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("updated_at", data.expectedUpdatedAt)
      .select("id");
    if (uErr) throw new Error(uErr.message);
    if (!rows || rows.length === 0) throw new Error("This finding was changed in another tab. Refresh and try again.");
    return { ok: true, status, verification };
  });

export const adminDeleteScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("security_scans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGenerateGuidance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "AI is not configured on this deployment. Add LOVABLE_API_KEY to the server environment." };
    const s = context.supabase;
    const { data: findings, error } = await s
      .from("security_findings")
      .select("id, title, severity, category, description, remediation, status, verification, created_at")
      .eq("scan_id", data.scanId);
    if (error) throw new Error(error.message);
    if (!findings?.length) return { ok: false as const, error: "This scan has no findings." };
    const { generateRemediationGuidance, describeAiError } = await import("./security-ai.server");
    let guidance: string;
    try {
      guidance = await generateRemediationGuidance(apiKey, findings);
    } catch (e) {
      console.error("[security-ai]", e instanceof Error ? e.message : e);
      return { ok: false as const, error: describeAiError(e) };
    }
    const { error: uErr } = await s
      .from("security_scans")
      .update({ ai_guidance: guidance, ai_generated_at: new Date().toISOString() })
      .eq("id", data.scanId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true as const, guidance };
  });
