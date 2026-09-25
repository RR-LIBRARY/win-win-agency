import { Star } from "lucide-react";
import { formatRating } from "@/lib/review-rules";

type Props = {
  /** 0–5, decimals allowed (half-filled stars render as partial fill). */
  value: number;
  size?: "sm" | "md" | "lg";
  /** Visually-hidden label; defaults to "Rated X out of 5". */
  label?: string;
  className?: string;
};

const sizes = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;

/** Read-only star row. The score is announced once via aria-label (stars are decorative). */
export function RatingStars({ value, size = "md", label, className }: Props) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <span className={`inline-flex items-center gap-0.5 ${className ?? ""}`} role="img" aria-label={label ?? `Rated ${formatRating(clamped)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <span key={i} className={`relative inline-block ${sizes[size]}`} aria-hidden="true">
            <Star className={`absolute inset-0 ${sizes[size]} text-border`} />
            {fill > 0 ? (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={`${sizes[size]} fill-current text-chart-4`} />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
