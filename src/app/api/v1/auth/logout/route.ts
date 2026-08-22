import { withApi } from "@/server/http/withApi";
import { clearSessionCookie } from "@/server/auth/session";

export const POST = withApi(null, async () => {
  await clearSessionCookie();
  return { ok: true };
});
