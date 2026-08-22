import { withApi } from "@/server/http/withApi";
import { updateProfileSchema } from "@/lib/validators/profile";
import { deleteAccount, updateProfile } from "@/server/services/users";
import { clearSessionCookie, requireUser, setSessionCookie } from "@/server/auth/session";

export const PATCH = withApi(updateProfileSchema, async ({ input }) => {
  const user = await requireUser();
  const updated = await updateProfile(user.id, input);
  // The session carries the email, so re-issue it when the email changes.
  await setSessionCookie({ sub: updated.id, email: updated.email, role: updated.role });
  return updated;
});

export const DELETE = withApi(null, async () => {
  const user = await requireUser();
  const result = await deleteAccount(user.id);
  await clearSessionCookie();
  return result;
});
