import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Link2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/data/services";
import { templateCover } from "@/data/template-covers";
import { categoryLabel, productTypeShort } from "@/lib/db-types";
import { detectPlatform, resolvePlatform } from "@/lib/external-platforms";
import { adminListTemplates } from "@/lib/templates.functions";

export const Route = createFileRoute("/_authenticated/admin/templates/")({
  component: AdminTemplatesPage,
});

function AdminTemplatesPage() {
  const templates = useQuery({ queryKey: ["admin-templates"], queryFn: () => adminListTemplates() });
  const navigate = useNavigate();
  const [pasted, setPasted] = useState("");
  const detected = pasted.trim() ? detectPlatform(pasted.trim()) : null;

  function startFromLink() {
    const url = pasted.trim();
    if (!/^https:\/\/[^\s]+$/i.test(url)) {
      toast.error("Paste a full https:// link", { description: "Example: https://yourname.gumroad.com/l/product" });
      return;
    }
    void navigate({ to: "/admin/templates/$id", params: { id: "new" }, search: { url } });
  }

  if (templates.isLoading) return <PanelLoading rows={4} />;
  if (templates.error) return <PanelError error={templates.error} />;
  const list = templates.data ?? [];

  return (
    <div className="space-y-6">
      <PanelCard title="Add a product from a link" description="Sell something you already list on Gumroad, Amazon, Fiverr, Udemy, Play Store or anywhere else — the store sends buyers there.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startFromLink();
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={pasted} onChange={(e) => setPasted(e.target.value)} type="url" inputMode="url" placeholder="https://yourname.gumroad.com/l/product" className="pl-9" aria-label="External product link" />
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <ExternalLink className="h-4 w-4" /> Create listing
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          {detected ? (
            <>
              Detected platform: <span className="font-medium text-foreground">{detected.label}</span> — you can change it in the editor.
            </>
          ) : (
            "Works with Gumroad, Amazon/Kindle, Fiverr, Upwork, Udemy, YouTube, Google Play, App Store, Etsy, Payhip, Lemon Squeezy, Instamojo, Topmate, GitHub and any https:// page."
          )}
        </p>
      </PanelCard>

      <PanelCard
        title="Products"
        description={`${list.filter((t) => t.is_published).length} live · ${list.length} total · ${list.filter((t) => t.delivery_type === "external").length} external`}
        actions={
          <Link to="/admin/templates/$id" params={{ id: "new" }} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New product
          </Link>
        }
      >
        {list.length === 0 ? (
          <PanelEmpty title="No products yet" text="Add your first software product, Notion template or external listing to open the store." />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((template) => {
              const external = template.delivery_type === "external";
              const platform = external ? resolvePlatform(template) : null;
              return (
                <li key={template.id} className="flex items-center gap-4 py-3">
                  <img src={templateCover(template)} alt="" loading="lazy" width={1200} height={800} className="h-12 w-[72px] shrink-0 rounded-md border border-border object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {template.title}
                      {template.is_featured ? <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">Featured</span> : null}
                      {platform ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
                          <ExternalLink className="h-2.5 w-2.5" /> {platform.label}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      /store/{template.slug} · {productTypeShort(template.product_type)} · {categoryLabel(template.category)} · {template.sales_count} sold · order {template.sort_order}
                    </p>
                  </div>
                  <span className="hidden text-sm text-foreground sm:block">{external && template.price <= 0 ? "—" : formatPrice(template.price)}</span>
                  <span className={template.is_published ? "rounded-full bg-chart-2/15 px-2.5 py-1 text-[11px] font-semibold text-foreground" : "rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"}>
                    {template.is_published ? "Live" : "Draft"}
                  </span>
                  <Link to="/admin/templates/$id" params={{ id: template.id }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
