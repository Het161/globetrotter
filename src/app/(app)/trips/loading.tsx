import { Skeleton, SkeletonGrid } from "@/components/ui/skeleton";

export default function TripsLoading() {
  return (
    <>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-56" />
      </div>
      <Skeleton className="mb-6 h-10 w-full max-w-xl" />
      <SkeletonGrid count={8} />
    </>
  );
}
