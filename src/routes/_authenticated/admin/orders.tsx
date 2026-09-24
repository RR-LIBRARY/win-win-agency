import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { OrderStatusBadge, formatDate } from "@/components/site/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/data/services";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/db-types";
import { adminListOrders, adminUpdateOrder, type AdminOrder } from "@/lib/orders.functions";

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
      return [o.reference, o.buyer_name, o.buyer_email, o.buyer_phone, o.template_title].some((v) => v.toLowerCase().includes(q));
    });
  }, [orders.data, filter, search]);

  if (orders.isLoading) return <PanelLoading rows={4} />;
  if (orders.error) return <PanelError error={orders.error} />;

  const counts = (orders.data ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
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
              {status === "all" ? `All (${orders.data?.length ?? 0})` : `${ORDER_STATUS_LABEL[status]} (${counts[status] ?? 0})`}
            </button>
          ))}
        </div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, name, email" className="md:w-72" />
      </div>

      {list.length === 0 ? (
        <PanelEmpty title="No orders here" text="Orders placed from the templates store will appear in this list." />
      ) : (
        list.map((order) => <OrderRow key={order.id} order={order} />)
      )}
    </div>
  );
}

function OrderRow({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(order.status as OrderStatus);
  const [paymentRef, setPaymentRef] = useState(order.payment_reference);
  const [note, setNote] = useState(order.admin_note);

  const save = useMutation({
    mutationFn: () => adminUpdateOrder({ data: { id: order.id, status, payment_reference: paymentRef, admin_note: note } }),
    onSuccess: async () => {
      toast.success("Order updated");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error) => toast.error("Could not update", { description: error.message }),
  });

  const whatsapp = order.buyer_phone
    ? `https://wa.me/${order.buyer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${order.buyer_name}, about your Win Win Digital order ${order.reference} (${order.template_title}, ${formatPrice(order.amount)}).`)}`
    : null;

  return (
    <PanelCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-foreground">{order.template_title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.reference} · {formatDate(order.created_at)} · {formatPrice(order.amount)}
            {order.user_id ? " · has account" : " · guest"}
          </p>
          <p className="mt-2 text-sm text-foreground">
            {order.buyer_name} · <a href={`mailto:${order.buyer_email}`} className="text-primary hover:underline">{order.buyer_email}</a>
            {order.buyer_phone ? <> · {order.buyer_phone}</> : null}
          </p>
          {order.note ? <p className="mt-1 text-sm text-muted-foreground">"{order.note}"</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            {open ? "Close" : "Update"}
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
      </div>

      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="mt-4 grid gap-4 rounded-xl border border-border bg-secondary/50 p-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor={`status-${order.id}`}>Status</Label>
            <select
              id={`status-${order.id}`}
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">"Delivered" unlocks the duplicate link in the buyer's account.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pay-${order.id}`}>Payment reference / UTR</Label>
            <Input id={`pay-${order.id}`} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="UPI txn id" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`note-${order.id}`}>Internal note (shown to buyer only if cancelled)</Label>
            <Textarea id={`note-${order.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
            </button>
          </div>
        </form>
      ) : null}
    </PanelCard>
  );
}
