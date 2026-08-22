import { withApi } from "@/server/http/withApi";
import { resetSchema } from "@/lib/validators/auth";
import { resetPassword } from "@/server/services/users";
import { setSessionCookie } from "@/server/auth/session";

export const POST = withApi(resetSchema, async ({ input }) => {
  const user = await resetPassword(input.token, input.password);
  await setSessionCookie({ sub: user.id, email: user.email, role: user.role });
  return user;
});
