import { cn } from "@/lib/utils";

// Up to two initials from a name (monochrome), used as the leading chip on the
// mobile list rows (customers, workers, pay) to give them app-like depth.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = (parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "");
  return letters.toUpperCase();
}

export function AvatarInitials({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm font-semibold text-neutral-700 dark:text-neutral-200",
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
