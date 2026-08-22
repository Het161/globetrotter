import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/** Mirrors the bento so nothing jumps when the real thing arrives. */
export default function DashboardLoading() {
  return (
    <>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="order-1 h-[320px] lg:order-2 lg:col-span-4" />
        <Skeleton className="order-3 h-[320px] lg:order-1 lg:col-span-8 lg:row-span-2 lg:h-[660px]" />
        <Skeleton className="order-4 h-[320px] lg:order-3 lg:col-span-4" />
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </>
  );
}
