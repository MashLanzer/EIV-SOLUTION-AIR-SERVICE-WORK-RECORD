import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

// A read-only 1–5 star rating. Presentational only (no hooks) so it renders in
// both server and client components. Filled amber up to `rating`, muted after.
export function StarRating({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-0.5", className)} aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(
            "h-4 w-4",
            n <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-600"
          )}
        />
      ))}
    </span>
  );
}
