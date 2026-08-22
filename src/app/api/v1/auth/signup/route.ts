import { withApi } from "@/server/http/withApi";
import { signupSchema } from "@/lib/validators/auth";
import { signup } from "@/server/services/users";
import { setSessionCookie } from "@/server/auth/session";

export const POST = withApi(signupSchema, async ({ input }) => {
  const user = await signup(input);
  await setSessionCookie({ sub: user.id, email: user.email, role: user.role });
  return user;
});
