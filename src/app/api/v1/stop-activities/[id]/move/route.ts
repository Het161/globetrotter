import { withApi } from "@/server/http/withApi";
import { moveActivitySchema } from "@/lib/validators/activities";
import { moveStopActivity } from "@/server/services/stopActivities";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(moveActivitySchema, async ({ input, params }) => {
  const user = await requireUser();
  return moveStopActivity(params.id, input.date, user);
});
