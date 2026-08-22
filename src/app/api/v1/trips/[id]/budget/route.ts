import { withApi } from "@/server/http/withApi";
import { getTripBudget } from "@/server/services/trips";
import { requireUser } from "@/server/auth/session";

export const GET = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return getTripBudget(params.id, user);
});
