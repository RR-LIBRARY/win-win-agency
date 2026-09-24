import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminDeleteCoupon, adminListCoupons, adminSaveCoupon } from "@/lib/inbox.functions";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons — Win Win Admin" },
      { name: "description", content: "Create discount codes for Notion templates." },
      { property: "og:title", content: "Coupons — Win Win Admin" },
      { property: "og:description", content: "Manage template discount codes." },
    ],
  }),
  component: CouponsPage,
});

function CouponsPage() {
  const list = useServerFn(adminListCoupons);
  const save = useServerFn(adminSaveCoupon);
  const remove = useServerFn(adminDeleteCoupon);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-coupons"], queryFn: () => list() });

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("10");
  const [expires, setExpires] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-coupons"] });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        data: {
          code,
          kind,
          value: Number(value),
          expires_at: expires || null,
          max_uses: maxUses ? Number(maxUses) : null,
          is_active: true,
        },
      });
      toast.success("Coupon created");
      setCode("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  type Coupon = NonNullable<typeof q.data>[number];
  async function toggle(c: Coupon, is_active: boolean) {
    try {
      await save({
        data: { id: c.id, code: c.code, kind: c.kind as "percent" | "flat", value: c.value, expires_at: c.expires_at, max_uses: c.max_uses, is_active },
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this coupon?")) return;
    try {
      await remove({ data: { id } });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-6">
      <PanelCard title="New coupon" description="Buyers type this code at checkout.">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="cp-code">Code</Label>
            <Input id="cp-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="LAUNCH20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-kind">Type</Label>
            <select
              id="cp-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "flat")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="percent">% off</option>
              <option value="flat">₹ off</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-value">{kind === "percent" ? "Percent" : "Amount (₹)"}</Label>
            <Input id="cp-value" type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-exp">Expires (optional)</Label>
            <Input id="cp-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-max">Max uses (optional)</Label>
            <Input id="cp-max" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" disabled={busy} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy ? "Saving" : "Create coupon"}
            </button>
          </div>
        </form>
      </PanelCard>

      {q.isLoading ? (
        <PanelLoading rows={3} />
      ) : q.error ? (
        <PanelError error={q.error} />
      ) : (q.data ?? []).length === 0 ? (
        <PanelEmpty title="No coupons yet" text="Create your first launch discount above." />
      ) : (
        <PanelCard title="All coupons">
          <ul className="divide-y divide-border">
            {(q.data ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-display font-semibold text-foreground">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.kind === "percent" ? `${c.value}% off` : `₹${c.value} off`} · used {c.used_count}
                    {c.max_uses ? ` / ${c.max_uses}` : ""}
                    {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString("en-IN")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={c.is_active} onCheckedChange={(v) => toggle(c, v)} /> Active
                  </label>
                  <button type="button" onClick={() => del(c.id)} className="text-xs font-medium text-destructive hover:underline">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </PanelCard>
      )}
    </div>
  );
}
