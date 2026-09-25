import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { DocList } from "@/components/store/ProductDocs";
import { orderDocsQuery } from "@/lib/docs.functions";

/** Every guide (public + buyers-only) for a paid order. Quiet when there are none. */
export function OrderDocs({ orderId, accessToken }: { orderId: string; accessToken?: string | undefined }) {
  const docs = useQuery(orderDocsQuery(orderId, accessToken));
  if (docs.isLoading) return <p className="text-xs text-muted-foreground">Loading your guides…</p>;
  if (docs.error || !docs.data || docs.data.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" /> Guides &amp; documentation
      </p>
      <div className="mt-3">
        <DocList docs={docs.data} />
      </div>
    </div>
  );
}
