import { withApi } from "@/server/http/withApi";
import { getAdminOverview } from "@/server/services/admin";
import { requireAdmin } from "@/server/auth/session";

export const GET = withApi(null, async () => {
  await requireAdmin();
  return getAdminOverview();
});
