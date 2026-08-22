import { Skeleton } from "@/components/ui/skeleton";

export default function TripLoading() {
  return (
    <>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-[420px]" />
      </div>
    </>
  );
}
