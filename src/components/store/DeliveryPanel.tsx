import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Download, ExternalLink, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { getOrderDownload, type OrderDeliverableView } from "@/lib/payments.functions";
import { LicenseKeyCard } from "./LicenseKeyCard";

type Props = {
  orderId: string;
  accessToken?: string | undefined;
  deliverable: OrderDeliverableView | null;
  licenseKey: string | null;
  licenseMaxActivations: number | null;
  deliveryType: string;
  status: string;
};

/** Everything a paid buyer gets: links, download, licence key, notes. */
export function DeliveryPanel({ orderId, accessToken, deliverable, licenseKey, licenseMaxActivations, deliveryType, status }: Props) {
  const download = useServerFn(getOrderDownload);
  const [downloading, setDownloading] = useState(false);

  async function startDownload() {
    setDownloading(true);
    try {
      const result = await download({ data: { orderId, ...(accessToken ? { accessToken } : {}) } });
      window.open(result.url, "_blank", "noopener");
      toast.success("Download started", { description: result.expiresAt ? "This link is valid for one hour." : undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the download link");
    } finally {
      setDownloading(false);
    }
  }

  if (status === "paid") {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Payment received — delivery in progress</p>
        <p className="mt-1">
          {deliveryType === "access"
            ? "We're provisioning your access and will email the login details within business hours."
            : "We're preparing your files. They'll appear here and in your email shortly."}
        </p>
        {licenseKey ? (
          <div className="mt-3">
            <LicenseKeyCard licenseKey={licenseKey} maxActivations={licenseMaxActivations} />
          </div>
        ) : null}
      </div>
    );
  }

  if (status !== "delivered" || !deliverable) return null;

  const buttonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60";
  const secondaryClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {deliverable.has_download ? (
          <button type="button" onClick={startDownload} disabled={downloading} className={buttonClass}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? "Preparing…" : "Download files"}
          </button>
        ) : null}
        {deliverable.duplicate_url ? (
          <a href={deliverable.duplicate_url} target="_blank" rel="noreferrer" className={deliverable.has_download ? secondaryClass : buttonClass}>
            <ExternalLink className="h-4 w-4" /> Duplicate to Notion
          </a>
        ) : null}
        {deliverable.access_url ? (
          <a href={deliverable.access_url} target="_blank" rel="noreferrer" className={deliverable.has_download || deliverable.duplicate_url ? secondaryClass : buttonClass}>
            <Link2 className="h-4 w-4" /> Open your access
          </a>
        ) : null}
        {deliverable.guide_url ? (
          <a href={deliverable.guide_url} target="_blank" rel="noreferrer" className={secondaryClass}>
            <BookOpen className="h-4 w-4" /> Setup guide
          </a>
        ) : null}
      </div>
      {licenseKey ? <LicenseKeyCard licenseKey={licenseKey} maxActivations={licenseMaxActivations} /> : null}
      {deliverable.notes ? (
        <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm whitespace-pre-line text-muted-foreground">{deliverable.notes}</div>
      ) : null}
    </div>
  );
}
