import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getCityBySlug } from "@/server/services/cities";
import { getActivityFacets, listActivitiesForCityId } from "@/server/services/activities";
import { isAppError } from "@/server/http/errors";
import { CrumbLabel } from "@/components/layout/breadcrumbs";
import { Postcard } from "@/components/ui/postcard";
import { CostIndexBar } from "@/components/explore/city-card";
import { ActivityBrowser } from "@/components/explore/activity-browser";
import { SaveCityButton } from "@/components/explore/save-city-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}): Promise<Metadata> {
  const { citySlug } = await params;
  try {
    const city = await getCityBySlug(citySlug);
    return { title: city.name, description: city.description };
  } catch {
    return { title: "Destination" };
  }
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}) {
  const { citySlug } = await params;
  const user = await getSession();

  try {
    const city = await getCityBySlug(citySlug, user?.id);

    const [activities, facets] = await Promise.all([
      listActivitiesForCityId(city.id, { sort: "popular", page: 1, pageSize: 30 }),
      getActivityFacets(city.id),
    ]);

    return (
      <>
        <CrumbLabel value={city.slug} label={city.name} />

        {/* Hero */}
        <section className="surface mb-8 overflow-hidden">
          <div className="tear-line relative">
            <Postcard city={city} size="hero" tilt={false} />
            <div className="absolute right-4 top-4">
              <SaveCityButton cityId={city.id} cityName={city.name} saved={Boolean(city.saved)} />
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-cloud">
                {city.name}
              </h1>
              <p className="mt-1 font-mono text-2xs text-fog">
                {city.country} · {city.region}
                {city.timezone ? ` · ${city.timezone}` : ""}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fog text-pretty">
                {city.description}
              </p>
            </div>

            <dl className="space-y-4">
              <CostIndexBar value={city.costIndex} />

              <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
                <div>
                  <dt className="placard mb-1">Stay / night</dt>
                  <dd className="font-mono text-sm font-semibold tabular-nums text-solar">
                    ${city.avgStayCost.toFixed(0)}
                  </dd>
                </div>
                <div>
                  <dt className="placard mb-1">Food / day</dt>
                  <dd className="font-mono text-sm font-semibold tabular-nums text-solar">
                    ${city.avgMealCost.toFixed(0)}
                  </dd>
                </div>
                <div>
                  <dt className="placard mb-1">Local currency</dt>
                  <dd className="font-mono text-sm text-cloud">{city.currency}</dd>
                </div>
                <div>
                  <dt className="placard mb-1">Popularity</dt>
                  <dd className="font-mono text-sm tabular-nums text-cloud">
                    {city.popularity}/100
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </section>

        <h2 className="placard mb-4">Things to do</h2>
        <ActivityBrowser city={city} initial={activities.items} facets={facets} />
      </>
    );
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
