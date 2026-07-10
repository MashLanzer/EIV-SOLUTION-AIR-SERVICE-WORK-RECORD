import { AeroMark } from "@/components/brand/AeroMark";
import { AeroWordmark } from "@/components/brand/AeroWordmark";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-neutral-900 dark:text-neutral-100",
        className
      )}
    >
      <AeroMark className="h-7 w-7" />
      <AeroWordmark className="text-lg leading-none" />
    </span>
  );
}
