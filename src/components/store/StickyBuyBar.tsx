import { useEffect, useState, type ReactNode } from "react";

/**
 * Phone-only bar pinned to the bottom of the screen once the main buy panel
 * has scrolled out of view, so the price and the buy button are never more
 * than a thumb away. Hidden on large screens where the panel is sticky.
 */
export function StickyBuyBar({
  watchId,
  price,
  note,
  children,
}: {
  /** id of the element whose visibility hides the bar */
  watchId: string;
  price: string;
  note: string;
  children: ReactNode;
}) {
  const [pastPanel, setPastPanel] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const show = pastPanel && !footerVisible;

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Show only once the panel is above the viewport (user scrolled past it).
        setPastPanel(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
      },
      { threshold: 0 },
    );
    observer.observe(target);

    // Step aside when the footer arrives so it never hides the last links on the page.
    const footer = document.querySelector("footer");
    const footerObserver =
      footer &&
      new IntersectionObserver(([entry]) => setFooterVisible(Boolean(entry?.isIntersecting)), { threshold: 0 });
    footerObserver?.observe(footer!);

    return () => {
      observer.disconnect();
      footerObserver?.disconnect();
    };
  }, [watchId]);

  return (
    <div
      aria-hidden={!show}
      className={
        show
          ? "fixed inset-x-0 bottom-0 z-40 translate-y-0 border-t border-border bg-card/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden"
          : "pointer-events-none fixed inset-x-0 bottom-0 z-40 translate-y-full border-t border-border bg-card/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-200 motion-reduce:transition-none lg:hidden"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 pt-3 pr-20">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-semibold text-foreground">{price}</p>
          <p className="truncate text-[11px] text-muted-foreground">{note}</p>
        </div>
        <div className="shrink-0" {...(show ? {} : { inert: true })}>
          {children}
        </div>
      </div>
    </div>
  );
}
