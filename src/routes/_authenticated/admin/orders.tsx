import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail, MessageCircle, Receipt, RefreshCw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { OrderStatusBadge, formatDate } from "@/components/site/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/data/services";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/db-types";
import { adminListOrders, adminUpdateOrder, type AdminOrder } from "@/lib/orders.functions";
import { adminMarkOrderPaid, adminReconcileOrder, adminRefundOrder } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrdersPage,
});

type Filter = "all" | OrderStatus;

function AdminOrdersPage() {
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => adminListOrders() });
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders.data ?? []).filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return [o.reference, o.buyer_name, o.buyer_email, o.buyer_phone, o.template_title, o.invoice_number ?? "", o.razorpay_payment_id ?? "", o.license_key ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [orders.data, filter, search]);

  if (orders.isLoading) return <PanelLoading rows={4} />;
  if (orders.error) return <PanelError error={orders.error} />;

  const all = orders.data ?? [];
  const counts = all.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const revenue = all.filter((o) => o.status === "paid" || o.status === "delivered").reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Collected" value={formatPrice(revenue)} />
        <Stat label="Awaiting payment" value={String(counts["pending_payment"] ?? 0)} />
        <Stat label="Delivered" value={String(counts["delivered"] ?? 0)} />
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", ...ORDER_STATUSES] as Filter[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={
                filter === status
                  ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              {status === "all" ? `All (${all.length})` : `${ORDER_STATUS_LABEL[status]} (${counts[status] ?? 0})`}
            </button>
          ))}
        </div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, buyer, payment id, licence" className="md:w-80" />
      </div>

      {list.length === 0 ? (
        <PanelEmpty title="No orders here" text="Orders placed from the store will appear in this list." />
      ) : (
        list.map((order) => <OrderRow key={order.id} order={order} />)
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function OrderRow({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(order.status as OrderStatus);
  const [paymentRef, setPaymentRef] = useState(order.payment_reference);
  const [note, setNote] = useState(order.admin_note);

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-counts"] });
  };

  const save = useMutation({
    mutationFn: () => adminUpdateOrder({ data: { id: order.id, status, payment_reference: paymentRef, admin_note: note } }),
    onSuccess: async () => {
      toast.success("Order updated");
      setOpen(false);
      await refreshAll();
    },
    onError: (error) => toast.error("Could not update", { description: error.message }),
  });

  const markPaid = useMutation({
    mutationFn: () => adminMarkOrderPaid({ data: { orderId: order.id, paymentReference: paymentRef, note } }),
    onSuccess: async (result) => {
      toast.success(result.status === "delivered" ? "Marked paid and delivered" : "Marked paid", {
        description: result.licenseKey ? `Licence ${result.licenseKey}` : result.invoiceNumber ? `Invoice ${result.invoiceNumber}` : undefined,
      });
      setOpen(false);
      await refreshAll();
    },
    onError: (error) => toast.error("Could not mark paid", { description: error.message }),
  });

  const reconcile = useMutation({
    mutationFn: () => adminReconcileOrder({ data: { orderId: order.id } }),
    onSuccess: async (result) => {
      if (result.found) toast.success("Payment found at Razorpay — order fulfilled");
      else toast.message("No captured payment at Razorpay", { description: result.payments.length ? result.payments.join(", ") : "No attempts yet" });
      await refreshAll();
    },
    onError: (error) => toast.error("Could not check Razorpay", { description: error.message }),
  });

  const refund = useMutation({
    mutationFn: () => adminRefundOrder({ data: { orderId: order.id, note } }),
    onSuccess: async (result) => {
      toast.success("Order refunded", { description: result.refundId ? `Razorpay refund ${result.refundId}` : "Marked refunded (manual payment)" });
      setOpen(false);
      await refreshAll();
    },
    onError: (error) => toast.error("Refund failed", { description: error.message }),
  });

  const whatsapp = order.buyer_phone
    ? `https://wa.me/${order.buyer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${order.buyer_name}, about your Win Win Digital order ${order.reference} (${order.template_title}, ${formatPrice(order.amount)}).`)}`
    : null;
  const busy = save.isPending || markPaid.isPending || reconcile.isPending || refund.isPending;

  return (
    <PanelCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground">
            {order.template_title}
            {order.tier_name ? <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{order.tier_name}</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.reference} · {formatDate(order.created_at)} · {formatPrice(order.amount)}
            {order.discount > 0 ? ` (coupon ${order.coupon_code} −${formatPrice(order.discount)})` : ""}
            {order.user_id ? " · has account" : " · guest"} · {order.payment_provider === "razorpay" ? "Razorpay" : "Bank transfer"}
            {order.payment_method ? ` / ${order.payment_method}` : ""}
          </p>
          <p className="mt-2 text-sm text-foreground">
            {order.buyer_name}
            {order.buyer_company ? ` (${order.buyer_company}${order.buyer_gstin ? `, GSTIN ${order.buyer_gstin}` : ""})` : ""} ·{" "}
            <a href={`mailto:${order.buyer_email}`} className="text-primary hover:underline">{order.buyer_email}</a>
            {order.buyer_phone ? <> · {order.buyer_phone}</> : null}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {order.invoice_number ? <span>Invoice {order.invoice_number}</span> : null}
            {order.razorpay_payment_id ? <span className="font-mono">{order.razorpay_payment_id}</span> : null}
            {order.payment_reference && !order.razorpay_payment_id ? <span>Ref {order.payment_reference}</span> : null}
            {order.license_key ? (
              <span className="inline-flex items-center gap-1 font-mono">
                <KeyRound className="h-3 w-3" /> {order.license_key}
              </span>
            ) : null}
            {order.failure_reason && order.status === "pending_payment" ? <span className="text-destructive">Last attempt: {order.failure_reason}</span> : null}
          </p>
          {order.note ? <p className="mt-1 text-sm text-muted-foreground">"{order.note}"</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            {open ? "Close" : "Manage"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`mailto:${order.buyer_email}?subject=${encodeURIComponent(`Your order ${order.reference} — ${order.template_title}`)}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
          <Mail className="h-3.5 w-3.5" /> Email buyer
        </a>
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp buyer
          </a>
        ) : null}
        <Link to="/orders/$reference" params={{ reference: order.reference }} search={{}} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
          <Receipt className="h-3.5 w-3.5" /> Receipt
        </Link>
        {order.status === "pending_payment" && order.razorpay_order_id ? (
          <button type="button" disabled={busy} onClick={() => reconcile.mutate()} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${reconcile.isPending ? "animate-spin" : ""}`} /> Check Razorpay
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-4 space-y-4 rounded-xl border border-border bg-secondary/50 p-4">
          {order.status === "pending_payment" ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">Received a bank transfer / UPI for this order?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="UTR / UPI transaction id" />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => markPaid.mutate()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {markPaid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark paid &amp; deliver
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Issues the invoice number, licence key (if enabled) and unlocks downloads instantly.</p>
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor={`status-${order.id}`}>Status</Label>
              <select
                id={`status-${order.id}`}
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {ORDER_STATUSES.filter((s) => s !== "refunded").map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">"Delivered" unlocks downloads and links for the buyer. Refunds use the button below.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pay-${order.id}`}>Payment reference / UTR</Label>
              <Input id={`pay-${order.id}`} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="UPI txn id" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`note-${order.id}`}>Internal note (shown to buyer only if cancelled)</Label>
              <Textarea id={`note-${order.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
              </button>
              {order.status === "paid" || order.status === "delivered" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Refund ${formatPrice(order.amount)} for ${order.reference}? This revokes any licence key.`)) refund.mutate();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
                >
                  {refund.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  {order.payment_provider === "razorpay" ? "Refund via Razorpay" : "Mark refunded"}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </PanelCard>
  );
}
