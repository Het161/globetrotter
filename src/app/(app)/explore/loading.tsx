import { Skeleton, SkeletonGrid } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="mb-4 h-11 w-full" />
      <Skeleton className="mb-6 h-7 w-full max-w-lg" />
      <SkeletonGrid count={8} />
    </>
  );
}
