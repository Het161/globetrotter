import { withApi } from "@/server/http/withApi";
import { unsaveCity } from "@/server/services/cities";
import { requireUser } from "@/server/auth/session";

export const DELETE = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return unsaveCity(user.id, params.cityId);
});
