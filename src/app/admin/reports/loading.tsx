import {
  SkeletonCard,
  SkeletonFilters,
  SkeletonPageHeader,
} from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonPageHeader />
      <SkeletonFilters />
      <SkeletonCard lines={6} />
    </div>
  );
}
