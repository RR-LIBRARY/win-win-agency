import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, MessageCircle } from "lucide-react";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { OrderStatusBadge, formatDate } from "@/components/site/StatusBadge";
import { formatPrice } from "@/data/services";
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
        text="Templates you buy will show up here with their duplicate links."
        action={
          <Link to="/templates" className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Browse templates
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
                  {order.reference} · ordered {formatDate(order.created_at)} · {formatPrice(order.amount)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            {order.status === "pending_payment" ? (
              <div className="mt-4 rounded-xl border border-border bg-secondary/60 p-4 text-sm text-muted-foreground">
                We send UPI / bank details to your email and WhatsApp. Already paid? Send us the screenshot and we'll unlock the link.
                <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp about this order
                </a>
              </div>
            ) : null}

            {order.status === "paid" ? (
              <p className="mt-4 rounded-xl border border-border bg-secondary/60 p-4 text-sm text-muted-foreground">
                Payment received — we're preparing your link. It usually appears within a few hours.
              </p>
            ) : null}

            {order.status === "delivered" ? (
              <div className="mt-4 rounded-xl border border-primary/30 bg-accent/40 p-4">
                <p className="text-sm font-medium text-foreground">Your template is ready</p>
                {order.deliverable?.duplicate_url ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={order.deliverable.duplicate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Duplicate in Notion <ExternalLink className="h-4 w-4" />
                    </a>
                    {order.deliverable.guide_url ? (
                      <a
                        href={order.deliverable.guide_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <BookOpen className="h-4 w-4" /> Setup guide
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    The link was sent to your email. Can't find it? WhatsApp us with reference {order.reference}.
                  </p>
                )}
                {order.deliverable?.notes ? (
                  <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">{order.deliverable.notes}</p>
                ) : null}
              </div>
            ) : null}

            {order.status === "cancelled" && order.admin_note ? (
              <p className="mt-4 text-sm text-muted-foreground">Note: {order.admin_note}</p>
            ) : null}
          </PanelCard>
        );
      })}
    </div>
  );
}
