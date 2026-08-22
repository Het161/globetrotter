import { withApi } from "@/server/http/withApi";
import { reorderSchema } from "@/lib/validators/stops";
import { reorderStopActivities } from "@/server/services/stopActivities";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(reorderSchema, async ({ input, params }) => {
  const user = await requireUser();
  return reorderStopActivities(params.id, input.ids, user);
});
