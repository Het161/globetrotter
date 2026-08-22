import { withApi } from "@/server/http/withApi";
import { addStopActivitySchema } from "@/lib/validators/activities";
import { addActivityToStop } from "@/server/services/stopActivities";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(addStopActivitySchema, async ({ input, params }) => {
  const user = await requireUser();
  return addActivityToStop(params.id, input, user);
});
