import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { formatPrice } from "@/data/services";
import { templateCover } from "@/data/template-covers";
import { categoryLabel } from "@/lib/db-types";
import { adminListTemplates } from "@/lib/templates.functions";

export const Route = createFileRoute("/_authenticated/admin/templates/")({
  component: AdminTemplatesPage,
});

function AdminTemplatesPage() {
  const templates = useQuery({ queryKey: ["admin-templates"], queryFn: () => adminListTemplates() });

  if (templates.isLoading) return <PanelLoading rows={4} />;
  if (templates.error) return <PanelError error={templates.error} />;
  const list = templates.data ?? [];

  return (
    <PanelCard
      title="Templates"
      description={`${list.filter((t) => t.is_published).length} live · ${list.length} total`}
      actions={
        <Link to="/admin/templates/$id" params={{ id: "new" }} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New template
        </Link>
      }
    >
      {list.length === 0 ? (
        <PanelEmpty title="No templates yet" text="Add your first Notion template to open the store." />
      ) : (
        <ul className="divide-y divide-border">
          {list.map((template) => (
            <li key={template.id} className="flex items-center gap-4 py-3">
              <img
                src={templateCover(template)}
                alt=""
                loading="lazy"
                width={1200}
                height={800}
                className="h-12 w-[72px] shrink-0 rounded-md border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {template.title}
                  {template.is_featured ? <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">Featured</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  /{template.slug} · {categoryLabel(template.category)} · {template.sales_count} sold · order {template.sort_order}
                </p>
              </div>
              <span className="hidden text-sm text-foreground sm:block">{formatPrice(template.price)}</span>
              <span
                className={
                  template.is_published
                    ? "rounded-full bg-chart-2/15 px-2.5 py-1 text-[11px] font-semibold text-foreground"
                    : "rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                }
              >
                {template.is_published ? "Live" : "Draft"}
              </span>
              <Link
                to="/admin/templates/$id"
                params={{ id: template.id }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}
