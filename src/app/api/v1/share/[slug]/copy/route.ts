import { withApi } from "@/server/http/withApi";
import { copyTrip } from "@/server/services/share";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return copyTrip(params.slug, user.id);
});
