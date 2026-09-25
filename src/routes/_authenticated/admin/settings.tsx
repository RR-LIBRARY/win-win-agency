import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SETTING_DEFAULTS,
  SETTING_LABELS,
  getSiteSettings,
  updateSiteSettings,
  type SettingKey,
  type SiteSettings,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Site settings — Admin — Win Win Digital Agency" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const [form, setForm] = useState<SiteSettings>({ ...SETTING_DEFAULTS });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      updateSiteSettings({
        data: { entries: (Object.keys(form) as SettingKey[]).map((key) => ({ key, value: form[key] })) },
      }),
    onSuccess: async () => {
      toast.success("Settings saved — live on the site now");
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (error) => toast.error("Could not save", { description: error.message }),
  });

  if (settings.isLoading) return <PanelLoading rows={3} />;
  if (settings.error) return <PanelError error={settings.error} />;

  function field(key: SettingKey, props?: { type?: string; placeholder?: string; hint?: string }) {
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{SETTING_LABELS[key]}</Label>
        <Input
          id={key}
          type={props?.type ?? "text"}
          value={form[key]}
          onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))}
          placeholder={props?.placeholder ?? ""}
        />
        {props?.hint ? <p className="text-xs text-muted-foreground">{props.hint}</p> : null}
      </div>
    );
  }

  function area(key: SettingKey, props?: { placeholder?: string; hint?: string; rows?: number }) {
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{SETTING_LABELS[key]}</Label>
        <Textarea
          id={key}
          rows={props?.rows ?? 3}
          value={form[key]}
          onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))}
          placeholder={props?.placeholder ?? ""}
        />
        {props?.hint ? <p className="text-xs text-muted-foreground">{props.hint}</p> : null}
      </div>
    );
  }

  const saveButton = (
    <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
      {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save settings
    </button>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-6"
    >
      <PanelCard
        title="Business identity"
        description="Printed on every invoice and receipt, shown on the contact and policy pages, and told to customers by the AI assistant. Razorpay's reviewers look for the legal name, a physical address and contact details on the website."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {field("business_legal_name", { placeholder: "Win Win Digital Agency" })}
          {field("business_gstin", { placeholder: "22AAAAA0000A1Z5", hint: "15 characters. Leave empty if not GST-registered — receipts then say 'no GST charged'." })}
        </div>
        <div className="mt-4 grid gap-4">
          {area("business_address", { rows: 2, placeholder: "Shop no., street, area, city, state — PIN" })}
          {field("business_landmark", { placeholder: "Opposite City Mall, 2nd floor" })}
        </div>
      </PanelCard>

      <PanelCard
        title="Location on map"
        description="Fills the map and the 'Get directions' button on the contact page; the assistant uses the same link when someone asks for directions."
        actions={
          form.business_map_url ? (
            <a href={form.business_map_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
              Open map <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null
        }
      >
        <div className="grid gap-4">
          {field("business_map_url", { type: "url", placeholder: "https://maps.app.goo.gl/…", hint: "Google Maps → Share → Copy link" })}
          {field("business_map_embed_url", { type: "url", placeholder: "https://www.google.com/maps/embed?pb=…", hint: "Google Maps → Share → Embed a map → copy only the URL inside src=\"…\"" })}
        </div>
      </PanelCard>

      <PanelCard title="Contact details" description="Used in the footer, contact page, order confirmations and WhatsApp buttons.">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("contact_email", { type: "email" })}
          {field("contact_whatsapp", { placeholder: "919876543210", hint: "Digits only, with country code — used for wa.me links" })}
          {field("business_hours")}
        </div>
      </PanelCard>

      <PanelCard
        title="Policies & grievance officer"
        description="The refund line appears at checkout, on receipts and on the Refund policy page. Indian e-commerce rules require a named grievance officer who acknowledges complaints within 48 hours — shown in the footer and on every policy page."
        actions={
          <Link to="/refund-policy" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            View policy pages <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="grid gap-4">
          {area("refund_policy", { rows: 2, hint: "One or two sentences. Keep it consistent with the 7-day window described on the Refund policy page." })}
          <div className="grid gap-4 sm:grid-cols-3">
            {field("grievance_officer_name", { placeholder: "Full name" })}
            {field("grievance_officer_email", { type: "email", placeholder: "Falls back to the contact email" })}
            {field("grievance_officer_phone", { placeholder: "+91 98765 43210" })}
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Bank-transfer payments"
        description="Shown to customers who choose 'Bank transfer / UPI' at checkout. Orders paid this way stay 'awaiting payment' until you mark them paid in Orders."
      >
        <div className="grid gap-4">
          {field("payment_upi_id", { placeholder: "business@upi" })}
          {area("payment_bank_details", { rows: 3, placeholder: "Account name, account number, IFSC, bank & branch" })}
        </div>
      </PanelCard>

      <PanelCard title="Store" description="Optional announcement shown at the top of the software store.">
        {field("store_announcement", { placeholder: "Diwali offer: 20% off all templates till Sunday" })}
      </PanelCard>

      <PanelCard
        title="EdTech live demo"
        description="Shown on the home page, the Educational Projects service and the booking page. Change it here any time."
        actions={
          form.edutech_demo_url ? (
            <a href={form.edutech_demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
              Open link <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
          {field("edutech_demo_url", { type: "url", placeholder: "https://…", hint: "Must start with https://" })}
          {field("edutech_demo_label", { placeholder: "JSR Coaching — live demo" })}
        </div>
      </PanelCard>

      <PanelCard
        title="AI assistant knowledge"
        description="Anything the assistant should know that is not already in the catalogue or settings — coaching fees, batch timings, FAQs. One fact per line."
      >
        {area("assistant_extra_knowledge", { rows: 6, placeholder: "Class 10 maths batch: Mon/Wed/Fri 5–6:30pm, ₹1,500/month\nWe also build Shopify stores on request" })}
      </PanelCard>

      <div className="sticky bottom-4 z-10 flex justify-end">{saveButton}</div>
    </form>
  );
}
