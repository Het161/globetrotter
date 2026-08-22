import { withApi } from "@/server/http/withApi";
import { updateUserRoleSchema } from "@/lib/validators/admin";
import { deleteUser, setUserRole } from "@/server/services/admin";
import { requireAdmin } from "@/server/auth/session";

export const PATCH = withApi(updateUserRoleSchema, async ({ input, params }) => {
  const admin = await requireAdmin();
  return setUserRole(params.id, input.role, admin.id);
});

export const DELETE = withApi(null, async ({ params }) => {
  const admin = await requireAdmin();
  return deleteUser(params.id, admin.id);
});
