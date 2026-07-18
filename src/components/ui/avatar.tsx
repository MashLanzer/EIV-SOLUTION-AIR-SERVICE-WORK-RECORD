import { cn } from "@/lib/utils";

// Up to two initials from a name (monochrome), used as the fallback when there
// is no photo.
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = (parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "");
  return letters.toUpperCase();
}

// A person's avatar: the photo when there is one, otherwise a monochrome
// initials chip. The image is always decorative (the name is shown alongside
// it in every usage), so it carries an empty alt + aria-hidden and lazy-loads.
// Sizing follows the project convention — pass Tailwind size classes via
// `className` (defaults to h-10 w-10); `size` sets the intrinsic pixel
// dimensions on the <img> so it reserves space and avoids layout shift.
export function Avatar({
  name,
  avatarUrl,
  size = 40,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={cn("h-10 w-10 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
