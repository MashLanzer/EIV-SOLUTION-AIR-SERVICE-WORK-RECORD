import { Skeleton } from "@/components/ui/skeleton";

// Composable loading placeholders shared by the route-level loading.tsx files,
// so every screen fades in the same shapes it's about to render instead of a
// blank flash. Kept intentionally generic - a page tunes the pieces via props.

export function SkeletonPageHeader({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-7 w-40" />
      {action && <Skeleton className="hidden h-10 w-32 sm:block" />}
    </div>
  );
}

export function SkeletonFilters() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  );
}

// A vertical list of card rows (customers, records, projects, ...).
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatTiles({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
        >
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMap() {
  return <Skeleton className="h-64 w-full rounded-xl sm:h-80" />;
}

export function SkeletonPhotoGrid({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? "w-40" : "w-full"}`} />
      ))}
    </div>
  );
}

// A back link + an identity header card, the common top of every detail page.
export function SkeletonDetailHeader() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

// Whole-page compositions.
export function ListPageSkeleton({
  filters = false,
  rows = 5,
  action = false,
}: {
  filters?: boolean;
  rows?: number;
  action?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonPageHeader action={action} />
      {filters && <SkeletonFilters />}
      <SkeletonRows count={rows} />
    </div>
  );
}

export function DetailPageSkeleton({
  map = false,
  cards = 2,
}: {
  map?: boolean;
  cards?: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonDetailHeader />
      {map && <SkeletonMap />}
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} lines={i === 0 ? 4 : 3} />
      ))}
    </div>
  );
}
