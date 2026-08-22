import { withApi } from "@/server/http/withApi";
import { createStopSchema } from "@/lib/validators/stops";
import { addStop } from "@/server/services/stops";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(createStopSchema, async ({ input, params }) => {
  const user = await requireUser();
  return addStop(params.id, input, user);
});
