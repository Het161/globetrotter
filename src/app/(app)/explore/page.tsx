import type { Metadata } from "next";
import { getSession } from "@/server/auth/session";
import { getCityFacets, listCities } from "@/server/services/cities";
import { PageHeader } from "@/components/layout/page-header";
import { ExploreBrowser } from "@/components/explore/explore-browser";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const user = await getSession();

  const [initial, facets] = await Promise.all([
    listCities({ sort: "popular", page: 1, pageSize: 12 }, user?.id),
    getCityFacets(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Destinations"
        title="Explore"
        description="Forty-eight cities with real costs attached. Save the ones you like, or drop them straight into a trip."
      />

      <ExploreBrowser
        initial={{ items: initial.items, total: initial.total }}
        facets={facets}
      />
    </>
  );
}
