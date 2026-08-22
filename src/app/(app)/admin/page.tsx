import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getAdminOverview, listAdminTrips, listAdminUsers } from "@/server/services/admin";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/menu";
import { KpiTiles } from "@/components/admin/kpi-tiles";
import { UsersTable } from "@/components/admin/users-table";
import { TripsTable } from "@/components/admin/trips-table";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Admin" };

/** recharts stays off the server and off every other route. */
const TrendChart = dynamic(() => import("@/components/admin/admin-charts").then((m) => m.TrendChart), {
  loading: () => <Skeleton className="h-48" />,
});
const TopCitiesChart = dynamic(
  () => import("@/components/admin/admin-charts").then((m) => m.TopCitiesChart),
  { loading: () => <Skeleton className="h-64" /> },
);
const CategoryMixChart = dynamic(
  () => import("@/components/admin/admin-charts").then((m) => m.CategoryMixChart),
  { loading: () => <Skeleton className="h-48" /> },
);

export default async function AdminPage() {
  // The layout already guards this route. Repeating the check here as a
  // redirect (rather than a throw) keeps defence in depth without Next logging
  // an unhandled error when it renders layout and page concurrently.
  const admin = await getSession();
  if (!admin) redirect("/login");
  if (admin.role !== "ADMIN") redirect("/dashboard");

  const [overview, users, trips] = await Promise.all([
    getAdminOverview(),
    listAdminUsers({ page: 1, pageSize: 20 }),
    listAdminTrips({ page: 1, pageSize: 20 }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Admin"
        description="Live aggregates across every account, trip and activity on this instance."
      />

      <KpiTiles kpis={overview.kpis} />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="surface p-5" aria-labelledby="trips-trend">
          <h2 id="trips-trend" className="placard mb-4">
            Trips created · last 30 days
          </h2>
          <TrendChart data={overview.tripsPerDay} label="trips" />
        </section>

        <section className="surface p-5" aria-labelledby="signups-trend">
          <h2 id="signups-trend" className="placard mb-4">
            Signups · last 30 days
          </h2>
          <TrendChart data={overview.signupsPerDay} colour="var(--color-solar)" label="signups" />
        </section>

        <section className="surface p-5" aria-labelledby="top-cities">
          <h2 id="top-cities" className="placard mb-4">
            Most-planned cities
          </h2>
          <TopCitiesChart data={overview.topCities} />
        </section>

        <section className="surface p-5" aria-labelledby="category-mix">
          <h2 id="category-mix" className="placard mb-4">
            Activity category mix
          </h2>
          <CategoryMixChart data={overview.categoryMix} />
        </section>
      </div>

      <section className="surface mt-6 p-5" aria-label="Directory">
        <Tabs defaultValue="users">
          <TabsList className="mb-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTable
              initial={{ items: users.items, total: users.total }}
              currentUserId={admin.id}
            />
          </TabsContent>

          <TabsContent value="trips">
            <TripsTable initial={{ items: trips.items, total: trips.total }} />
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}
