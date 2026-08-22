import { withApi } from "@/server/http/withApi";
import { updateStopSchema } from "@/lib/validators/stops";
import { deleteStop, updateStop } from "@/server/services/stops";
import { requireUser } from "@/server/auth/session";

export const PATCH = withApi(updateStopSchema, async ({ input, params }) => {
  const user = await requireUser();
  return updateStop(params.id, input, user);
});

export const DELETE = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return deleteStop(params.id, user);
});
