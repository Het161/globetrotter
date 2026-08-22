import { withApi } from "@/server/http/withApi";
import { changePasswordSchema } from "@/lib/validators/profile";
import { changePassword } from "@/server/services/users";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(changePasswordSchema, async ({ input }) => {
  const user = await requireUser();
  return changePassword(user.id, input);
});
