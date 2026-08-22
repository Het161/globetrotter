import { withApi, withMeta } from "@/server/http/withApi";
import { activityListQuery } from "@/lib/validators/activities";
import { listActivitiesForCity } from "@/server/services/activities";

export const GET = withApi(activityListQuery, async ({ input, params }) => {
  const result = await listActivitiesForCity(params.slug, input);
  return withMeta(result.items, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  });
});
