import { withApi, withMeta } from "@/server/http/withApi";
import { adminListQuery } from "@/lib/validators/admin";
import { listAdminUsers } from "@/server/services/admin";
import { requireAdmin } from "@/server/auth/session";

export const GET = withApi(adminListQuery, async ({ input }) => {
  await requireAdmin();
  const result = await listAdminUsers(input);
  return withMeta(result.items, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  });
});
