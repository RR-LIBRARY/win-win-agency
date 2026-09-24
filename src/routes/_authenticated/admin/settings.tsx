import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SETTING_DEFAULTS,
  SETTING_LABELS,
  getSiteSettings,
  updateSiteSettings,
  type SettingKey,
  type SiteSettings,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-6"
    >
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

      <PanelCard title="Contact details" description="Used in the footer, contact page, order confirmations and WhatsApp buttons.">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("contact_email", { type: "email" })}
          {field("contact_whatsapp", { placeholder: "919876543210", hint: "Digits only, with country code — used for wa.me links" })}
          {field("business_hours")}
        </div>
      </PanelCard>

      <PanelCard title="Store" description="Optional announcement shown at the top of the templates store.">
        {field("store_announcement", { placeholder: "Diwali offer: 20% off all templates till Sunday" })}
      </PanelCard>

      <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save settings
      </button>
    </form>
  );
}
