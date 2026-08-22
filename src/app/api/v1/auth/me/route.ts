import { withApi } from "@/server/http/withApi";
import { getSession } from "@/server/auth/session";

export const GET = withApi(null, async () => {
  return { user: await getSession() };
});
