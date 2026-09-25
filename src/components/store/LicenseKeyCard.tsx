import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

export function LicenseKeyCard({ licenseKey, maxActivations }: { licenseKey: string; maxActivations: number | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      toast.success("Licence key copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the key and copy it manually");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <KeyRound className="h-3.5 w-3.5" /> Your licence key
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm tracking-wider text-foreground select-all">
          {licenseKey}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-secondary"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {maxActivations && maxActivations > 0
          ? `Activates on up to ${maxActivations} device${maxActivations === 1 ? "" : "s"}. Keep it private — it's tied to this order.`
          : "Unlimited activations. Keep it private — it's tied to this order."}
      </p>
    </div>
  );
}
