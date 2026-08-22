import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </>
  );
}
