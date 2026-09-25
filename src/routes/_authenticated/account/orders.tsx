import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CreditCard, MessageCircle, Receipt } from "lucide-react";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { OrderStatusBadge, formatDate } from "@/components/site/StatusBadge";
import { DeliveryPanel } from "@/components/store/DeliveryPanel";
import { OrderDocs } from "@/components/store/OrderDocs";
import { ReviewForm } from "@/components/store/ReviewForm";
import { formatPrice } from "@/data/services";
import { productTypeLabel } from "@/lib/db-types";
import { myOrders } from "@/lib/orders.functions";
import { siteSettingsQuery } from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/account/orders")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteSettingsQuery),
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: () => myOrders() });
  const { data: settings } = useSuspenseQuery(siteSettingsQuery);

  if (orders.isLoading) return <PanelLoading rows={3} />;
  if (orders.error) return <PanelError error={orders.error} />;
  const list = orders.data ?? [];

  if (list.length === 0) {
    return (
      <PanelEmpty
        title="No orders yet"
        text="Software, source code and templates you buy will show up here with downloads and licence keys."
        action={
          <Link to="/store" className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Browse the store
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {list.map((order) => {
        const whatsapp = `https://wa.me/${settings.contact_whatsapp}?text=${encodeURIComponent(
          `Hi, about my order ${order.reference} (${order.template_title}).`,
        )}`;
        return (
          <PanelCard key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold text-foreground">{order.template_title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.reference} · {productTypeLabel(order.product_type)}
                  {order.tier_name ? ` · ${order.tier_name}` : ""} · ordered {formatDate(order.created_at)} · {formatPrice(order.amount)}
                  {order.invoice_number ? ` · Invoice ${order.invoice_number}` : ""}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            {order.status === "pending_payment" ? (
              <div className="mt-4 rounded-xl border border-border bg-secondary/60 p-4 text-sm text-muted-foreground">
                This order isn't paid yet — files and links unlock the moment payment is confirmed.
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/orders/$reference"
                    params={{ reference: order.reference }}
                    search={{}}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Pay now
                  </Link>
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp about this order
                  </a>
                </div>
              </div>
            ) : null}

            {order.status === "paid" || order.status === "delivered" ? (
              <div className="mt-4 rounded-xl border border-primary/30 bg-accent/40 p-4">
                <p className="text-sm font-medium text-foreground">
                  {order.status === "delivered" ? "Your product is ready" : "Payment received"}
                </p>
                <div className="mt-3 space-y-3">
                  <DeliveryPanel
                    orderId={order.id}
                    deliverable={order.deliverable}
                    licenseKey={order.license_key}
                    licenseMaxActivations={order.license_max_activations}
                    deliveryType={order.delivery_type}
                    status={order.status}
                  />
                  <OrderDocs orderId={order.id} />
                </div>
                {order.status === "delivered" && !order.deliverable ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    The files were sent to your email. Can't find them? WhatsApp us with reference {order.reference}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {order.status === "paid" || order.status === "delivered" ? (
              <div className="mt-4">
                <ReviewForm orderId={order.id} />
              </div>
            ) : null}

            {order.status === "refunded" ? (
              <p className="mt-4 text-sm text-muted-foreground">Refunded{order.refunded_at ? ` on ${formatDate(order.refunded_at)}` : ""}. Any licence key from this order is inactive.</p>
            ) : null}
            {order.status === "cancelled" && order.admin_note ? (
              <p className="mt-4 text-sm text-muted-foreground">Note: {order.admin_note}</p>
            ) : null}

            <div className="mt-4">
              <Link
                to="/orders/$reference"
                params={{ reference: order.reference }}
                search={{}}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Receipt className="h-3.5 w-3.5" /> Order page &amp; receipt
              </Link>
            </div>
          </PanelCard>
        );
      })}
    </div>
  );
}
