import { withApi } from "@/server/http/withApi";
import { forgotSchema } from "@/lib/validators/auth";
import { requestPasswordReset } from "@/server/services/users";

export const POST = withApi(forgotSchema, async ({ input }) => {
  const result = await requestPasswordReset(input.email);
  // Always the same message, whether or not the account exists.
  return { message: "If that email exists, we sent a reset link.", ...result };
});
