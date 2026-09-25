import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { AssistantMarkdown } from "@/components/assistant/AssistantMarkdown";
import {
  adminCreateScan,
  adminDeleteScan,
  adminGenerateGuidance,
  adminListSecurity,
  adminUpdateFinding,
} from "@/lib/security.functions";
import { isUnresolved, prioritize, summarize, type FindingStatus, type Verification } from "@/lib/security-triage";

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => ({
    meta: [
      { title: "Security — Win Win Admin" },
      { name: "description", content: "Record security scan results, track open vulnerabilities and verify fixes." },
      { property: "og:title", content: "Security — Win Win Admin" },
      { property: "og:description", content: "Security findings and remediation tracker." },
    ],
  }),
  component: SecurityPage,
});

const SEV_CLASS: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-destructive/15 text-destructive",
  medium: "bg-accent text-accent-foreground",
  low: "bg-secondary text-secondary-foreground",
  info: "bg-muted text-muted-foreground",
};
const VER_LABEL: Record<string, string> = { unverified: "Not verified", verified: "Verified ✓", failed: "Verification failed" };

function SecurityPage() {
  const list = useServerFn(adminListSecurity);
  const create = useServerFn(adminCreateScan);
  const update = useServerFn(adminUpdateFinding);
  const remove = useServerFn(adminDeleteScan);
  const guide = useServerFn(adminGenerateGuidance);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-security"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("Lovable security scan");
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"unresolved" | "all">("unresolved");

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-security"] });

  const findings = q.data?.findings ?? [];
  const ranked = useMemo(() => prioritize(findings), [findings]);
  const shown = filter === "all" ? ranked : ranked.filter((f) => isUnresolved(f));
  const stats = summarize(findings);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await create({ data: { title, source, raw } });
      toast.success(`${r.count} findings saved`);
      setTitle("");
      setRaw("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function change(f: (typeof findings)[number], patch: { status?: FindingStatus; verification?: Verification; note?: string }) {
    try {
      await update({ data: { id: f.id, expectedUpdatedAt: f.updated_at, ...patch } });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
      await refresh();
    }
  }

  async function runAi(scanId: string) {
    setAiBusy(scanId);
    try {
      const r = await guide({ data: { scanId } });
      if (!r.ok) toast.error(r.error);
      else toast.success("Guidance ready");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate guidance");
    } finally {
      setAiBusy(null);
    }
  }

  if (q.isLoading) return <PanelLoading rows={4} />;
  if (q.error) return <PanelError error={q.error} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Unresolved", stats.unresolved],
          ["Critical + high open", stats.bySeverity.critical + stats.bySeverity.high],
          ["Verified fixes", stats.verified],
          ["Failed checks", stats.failed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <PanelCard title="Add scan results" description="Paste JSON from a scanner, or one finding per line like “HIGH: Missing rate limit — details”.">
        <form onSubmit={onCreate} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Scan name (e.g. Sept production audit)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
            <input maxLength={60} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source" className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <textarea required value={raw} onChange={(e) => setRaw(e.target.value)} rows={6} maxLength={50000} placeholder={'[{"title":"…","severity":"high","description":"…"}]'} className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-foreground" />
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Save findings
          </button>
        </form>
      </PanelCard>

      <PanelCard
        title="Findings — fix in this order"
        description={`${shown.length} shown`}
        actions={
          <select value={filter} onChange={(e) => setFilter(e.target.value as "unresolved" | "all")} className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground">
            <option value="unresolved">Unresolved only</option>
            <option value="all">All</option>
          </select>
        }
      >
        {shown.length === 0 ? (
          <PanelEmpty title="Nothing open" text="No unresolved findings. Add a new scan after each audit." />
        ) : (
          <ol className="space-y-3">
            {shown.map((f, i) => (
              <li key={f.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      <span className="text-muted-foreground">#{i + 1} </span>
                      {f.title}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${SEV_CLASS[f.severity] ?? SEV_CLASS["info"]}`}>{f.severity}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{f.category}</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{VER_LABEL[f.verification]}</span>
                    </div>
                  </div>
                  <select aria-label="Status" value={f.status} onChange={(e) => change(f, { status: e.target.value as FindingStatus })} className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground">
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="fixed">Fixed</option>
                    <option value="wont_fix">Won't fix</option>
                  </select>
                </div>
                {f.description ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{f.description}</p> : null}
                {f.remediation ? <p className="mt-2 text-xs text-foreground"><strong>Fix hint:</strong> {f.remediation}</p> : null}
                {f.status === "fixed" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => change(f, { verification: "verified", note: prompt("How did you verify it?", f.verification_note) ?? f.verification_note })} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary">Mark verified</button>
                    <button type="button" onClick={() => change(f, { verification: "failed" })} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-destructive hover:bg-secondary">Verification failed</button>
                    {f.verification_note ? <span className="text-xs text-muted-foreground">Note: {f.verification_note}</span> : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </PanelCard>

      <PanelCard title="Scans & AI remediation guidance" description="AI runs only when you press the button (uses AI credits).">
        {(q.data?.scans ?? []).length === 0 ? (
          <PanelEmpty title="No scans yet" text="Saved scans appear here." />
        ) : (
          <ul className="space-y-4">
            {q.data!.scans.map((s) => (
              <li key={s.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.source} · {new Date(s.created_at).toLocaleString("en-IN")} · {findings.filter((f) => f.scan_id === s.id).length} findings</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={aiBusy !== null} onClick={() => runAi(s.id)} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
                      {aiBusy === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {s.ai_guidance ? "Regenerate" : "Get AI guidance"}
                    </button>
                    <button type="button" aria-label="Delete scan" onClick={async () => { if (!confirm("Delete this scan and its findings?")) return; await remove({ data: { id: s.id } }); await refresh(); }} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-secondary">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {s.ai_guidance ? (
                  <div className="prose prose-sm mt-3 max-w-none rounded-lg bg-secondary/50 p-3 text-sm text-foreground">
                    <AssistantMarkdown text={s.ai_guidance} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
