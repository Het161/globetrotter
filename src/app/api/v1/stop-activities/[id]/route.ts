import { withApi } from "@/server/http/withApi";
import { updateStopActivitySchema } from "@/lib/validators/activities";
import { deleteStopActivity, updateStopActivity } from "@/server/services/stopActivities";
import { requireUser } from "@/server/auth/session";

export const PATCH = withApi(updateStopActivitySchema, async ({ input, params }) => {
  const user = await requireUser();
  return updateStopActivity(params.id, input, user);
});

export const DELETE = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return deleteStopActivity(params.id, user);
});
