import { withApi } from "@/server/http/withApi";
import { getCityBySlug } from "@/server/services/cities";
import { getSession } from "@/server/auth/session";

export const GET = withApi(null, async ({ params }) => {
  const viewer = await getSession();
  return getCityBySlug(params.slug, viewer?.id);
});
