import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { formatPrice } from "@/data/services";
import { templateCover } from "@/data/template-covers";
import { categoryLabel } from "@/lib/db-types";
import type { PublicTemplate } from "@/lib/templates.functions";

export function TemplateCard({ template }: { template: PublicTemplate }) {
  const discount =
    template.compare_at_price && template.compare_at_price > template.price
      ? Math.round(100 - (template.price / template.compare_at_price) * 100)
      : 0;

  return (
    <Link
      to="/templates/$slug"
      params={{ slug: template.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative overflow-hidden bg-secondary">
        <img
          src={templateCover(template)}
          alt={template.title}
          loading="lazy"
          width={1200}
          height={800}
          className="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {template.is_featured ? (
          <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            Best seller
          </span>
        ) : null}
        {discount > 0 ? (
          <span className="absolute top-3 right-3 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
            {discount}% off
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{categoryLabel(template.category)}</span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-current text-chart-4" />
            {Number(template.rating).toFixed(1)}
            <span className="text-muted-foreground/70">({template.sales_count})</span>
          </span>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold text-foreground">{template.title}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{template.tagline}</p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold text-foreground">
            {formatPrice(template.price)}
          </span>
          {template.compare_at_price && template.compare_at_price > template.price ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(template.compare_at_price)}
            </span>
          ) : null}
          <span className="ml-auto text-xs font-medium text-primary group-hover:underline">
            View template
          </span>
        </div>
      </div>
    </Link>
  );
}
