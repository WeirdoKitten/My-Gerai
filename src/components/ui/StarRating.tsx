import { StarIcon } from "@/components/ui/icons";
import { formatRating } from "@/lib/review/rating";
import { cn } from "@/lib/utils/cn";

/**
 * Tampilan 5 bintang (read-only) untuk Rating & Ulasan. Nilai dibulatkan ke
 * bintang utuh terdekat — tanpa setengah bintang (KISS); angka pastinya
 * ditampilkan terpisah lewat `formatRating` bila perlu.
 */
export function StarRating({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const filledCount = Math.round(value);
  return (
    <span
      role="img"
      aria-label={`Rating ${formatRating(value)} dari 5`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          filled={star <= filledCount}
          className={cn(
            size === "md" ? "size-5" : "size-3.5",
            star <= filledCount ? "text-brand" : "text-line",
          )}
        />
      ))}
    </span>
  );
}
