import {
  SkeletonFilters,
  SkeletonPageHeader,
  SkeletonPhotoGrid,
} from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonPageHeader />
      <SkeletonFilters />
      <SkeletonPhotoGrid count={12} />
    </div>
  );
}
