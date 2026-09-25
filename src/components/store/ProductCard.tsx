import { Link } from "@tanstack/react-router";
import { ExternalLink, Star } from "lucide-react";
import { formatPrice } from "@/data/services";
import { productCover } from "@/data/template-covers";
import { parseTiers, productTypeShort } from "@/lib/db-types";
import { isExternalProduct, resolvePlatform } from "@/lib/external-platforms";
import { discountPercent, startingPrice } from "@/lib/payments/pricing";
import type { PublicTemplate } from "@/lib/templates.functions";

export function ProductCard({ product }: { product: PublicTemplate }) {
  const tiers = parseTiers(product.tiers);
  const from = startingPrice(product);
  const compare = tiers.length > 0 ? (tiers.find((t) => t.price === from)?.compare_at_price ?? null) : product.compare_at_price;
  const discount = discountPercent(from, compare);
  const platforms = product.platforms.slice(0, 3);
  const external = isExternalProduct(product);
  const platform = external ? resolvePlatform(product) : null;

  return (
    <Link
      to="/store/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative overflow-hidden bg-secondary">
        <img
          src={productCover(product)}
          alt={product.title}
          loading="lazy"
          width={1200}
          height={800}
          className="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-3 left-3 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
          {productTypeShort(product.product_type)}
        </span>
        {platform ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background shadow-sm">
            <ExternalLink className="h-3 w-3" /> {platform.label}
          </span>
        ) : product.is_featured ? (
          <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            Best seller
          </span>
        ) : discount > 0 ? (
          <span className="absolute top-3 right-3 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
            {discount}% off
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="truncate">
            {platform
              ? `Sold on ${platform.label}`
              : platforms.length > 0
                ? platforms.join(" · ")
                : product.version
                  ? `v${product.version}`
                  : "Digital download"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-current text-chart-4" />
            {Number(product.rating).toFixed(1)}
            <span className="text-muted-foreground/70">({product.sales_count})</span>
          </span>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold text-foreground">{product.title}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{product.tagline}</p>
        <div className="mt-4 flex items-baseline gap-2">
          {external && from <= 0 ? (
            <span className="text-sm font-medium text-foreground">See price on {platform?.label}</span>
          ) : (
            <>
              <span className="font-display text-xl font-semibold text-foreground">
                {tiers.length > 1 ? <span className="mr-1 text-xs font-normal text-muted-foreground">from</span> : null}
                {formatPrice(from)}
              </span>
              {compare && compare > from ? (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(compare)}</span>
              ) : null}
            </>
          )}
          <span className="ml-auto text-xs font-medium text-primary group-hover:underline">{external ? "View & buy" : "View details"}</span>
        </div>
      </div>
    </Link>
  );
}
