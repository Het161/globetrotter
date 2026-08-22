import { withApi, withMeta } from "@/server/http/withApi";
import { cityListQuery } from "@/lib/validators/activities";
import { listCities } from "@/server/services/cities";
import { getSession } from "@/server/auth/session";

export const GET = withApi(cityListQuery, async ({ input }) => {
  const viewer = await getSession();
  const result = await listCities(input, viewer?.id);
  return withMeta(result.items, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  });
});
