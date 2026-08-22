import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="max-w-3xl space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </>
  );
}
