import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, KeyRound, Loader2, RotateCcw, ShieldCheck, ShieldOff, Webhook } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { formatDate } from "@/components/site/StatusBadge";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/data/services";
import { adminListLicenses, adminListPaymentEvents, adminUpdateLicense, paymentConfigQuery, type AdminLicense } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  loader: ({ context }) => context.queryClient.ensureQueryData(paymentConfigQuery),
  component: AdminPaymentsPage,
});

const eventTone: Record<string, string> = {
  processed: "bg-chart-2/15 text-foreground",
  received: "bg-chart-4/15 text-foreground",
  ignored: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
};

function AdminPaymentsPage() {
  const config = useQuery(paymentConfigQuery);
  const events = useQuery({ queryKey: ["admin-payment-events"], queryFn: () => adminListPaymentEvents(), refetchInterval: 30_000 });
  const licenses = useQuery({ queryKey: ["admin-licenses"], queryFn: () => adminListLicenses() });
  const [licenseSearch, setLicenseSearch] = useState("");
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/webhooks/razorpay` : "/api/public/webhooks/razorpay";

  const filteredLicenses = (licenses.data ?? []).filter((l) => {
    const q = licenseSearch.trim().toLowerCase();
    if (!q) return true;
    return [l.key, l.buyer_email, l.order_reference ?? "", l.product_title ?? ""].some((v) => v.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <PanelCard title="Razorpay status" description="Keys live in the project's secret store — never in the database.">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusTile
            ok={Boolean(config.data?.online)}
            label="Online payments"
            text={config.data?.online ? (config.data.testMode ? "Enabled (TEST keys)" : "Enabled (LIVE keys)") : "Off — bank transfer only"}
          />
          <StatusTile
            ok={Boolean(config.data?.webhookConfigured)}
            label="Webhook secret"
            text={config.data?.webhookConfigured ? "Configured" : "Missing — orders rely on the browser callback + auto re-check"}
          />
          <StatusTile ok={true} label="Fulfilment" text="Idempotent: checkout, webhook and admin all share one path" />
        </div>
        <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Webhook className="h-4 w-4 text-primary" /> Webhook URL for the Razorpay dashboard
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 truncate rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground">{webhookUrl}</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(webhookUrl).then(() => toast.success("Webhook URL copied"));
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Razorpay Dashboard → Settings → Webhooks → Add: events <span className="font-mono">payment.captured</span>,{" "}
            <span className="font-mono">order.paid</span>, <span className="font-mono">payment.failed</span>, <span className="font-mono">refund.processed</span>. Use the same secret you saved as RAZORPAY_WEBHOOK_SECRET.
          </p>
        </div>
        {!config.data?.online ? (
          <p className="mt-3 text-xs text-muted-foreground">
            To switch on online payments, add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (plus RAZORPAY_WEBHOOK_SECRET) in the project's secrets. Bank-transfer orders keep working either way.
          </p>
        ) : null}
      </PanelCard>

      <PanelCard title="Licence keys" description={`${licenses.data?.length ?? 0} issued`} actions={<Input value={licenseSearch} onChange={(e) => setLicenseSearch(e.target.value)} placeholder="Search key, email, order" className="w-64" />}>
        {licenses.isLoading ? (
          <PanelLoading rows={3} />
        ) : licenses.error ? (
          <PanelError error={licenses.error} />
        ) : filteredLicenses.length === 0 ? (
          <PanelEmpty title="No licence keys yet" text="Keys are issued automatically when a product with licensing enabled is paid for." />
        ) : (
          <ul className="divide-y divide-border">
            {filteredLicenses.map((license) => (
              <LicenseRow key={license.id} license={license} />
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard title="Payment events" description="Every webhook Razorpay sent us, de-duplicated by event id.">
        {events.isLoading ? (
          <PanelLoading rows={3} />
        ) : events.error ? (
          <PanelError error={events.error} />
        ) : (events.data ?? []).length === 0 ? (
          <PanelEmpty title="No events yet" text="Once the webhook is configured, captured payments, failures and refunds show up here." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(events.data ?? []).map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${eventTone[event.status] ?? eventTone["received"]}`}>{event.status}</span>
                <span className="font-mono text-xs text-foreground">{event.event_type}</span>
                {event.order_reference ? (
                  <Link to="/admin/orders" className="text-xs text-primary hover:underline">
                    {event.order_reference}
                  </Link>
                ) : null}
                {event.amount != null ? <span className="text-xs text-muted-foreground">{formatPrice(Math.round(event.amount) / 100)}</span> : null}
                {event.razorpay_payment_id ? <span className="font-mono text-[11px] text-muted-foreground">{event.razorpay_payment_id}</span> : null}
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                {event.error ? <p className="w-full text-xs text-destructive">{event.error}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}

function StatusTile({ ok, label, text }: { ok: boolean; label: string; text: string }) {
  const Icon = ok ? ShieldCheck : ShieldOff;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ok ? "text-primary" : "text-muted-foreground"}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{text}</p>
      </div>
    </div>
  );
}

function LicenseRow({ license }: { license: AdminLicense }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (patch: { status?: "active" | "revoked"; resetActivations?: boolean }) => adminUpdateLicense({ data: { id: license.id, ...patch } }),
    onSuccess: async () => {
      toast.success("Licence updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-licenses"] });
    },
    onError: (error) => toast.error("Could not update licence", { description: error.message }),
  });
  const active = license.status === "active";
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <KeyRound className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <code className="font-mono text-sm text-foreground">{license.key}</code>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? "bg-chart-2/15 text-foreground" : "bg-destructive/10 text-destructive"}`}>{license.status}</span>
      <span className="text-xs text-muted-foreground">
        {license.product_title ?? "Product"} · {license.order_reference ?? "—"} · {license.buyer_email}
      </span>
      <span className="text-xs text-muted-foreground">
        {license.activations}/{license.max_activations || "∞"} activations{license.last_activated_at ? ` · last ${formatDate(license.last_activated_at)}` : ""}
      </span>
      <div className="ml-auto flex gap-2">
        <button type="button" disabled={update.isPending} onClick={() => update.mutate({ resetActivations: true })} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60">
          {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Reset activations
        </button>
        <button
          type="button"
          disabled={update.isPending}
          onClick={() => update.mutate({ status: active ? "revoked" : "active" })}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${active ? "border-destructive/40 text-destructive hover:bg-destructive/5" : "border-border text-foreground hover:bg-secondary"}`}
        >
          {active ? "Revoke" : "Re-activate"}
        </button>
      </div>
    </li>
  );
}
