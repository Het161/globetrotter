import { withApi } from "@/server/http/withApi";
import { loginSchema } from "@/lib/validators/auth";
import { login } from "@/server/services/users";
import { setSessionCookie } from "@/server/auth/session";

export const POST = withApi(loginSchema, async ({ input }) => {
  const user = await login(input);
  await setSessionCookie({ sub: user.id, email: user.email, role: user.role });
  return user;
});
