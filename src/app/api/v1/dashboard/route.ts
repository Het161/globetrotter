import { withApi } from "@/server/http/withApi";
import { requireUser } from "@/server/auth/session";
import { getDashboard } from "@/server/services/dashboard";

export const GET = withApi(null, async () => {
  const user = await requireUser();
  return getDashboard(user.id);
});
