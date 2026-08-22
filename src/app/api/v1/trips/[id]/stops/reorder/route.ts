import { withApi } from "@/server/http/withApi";
import { reorderSchema } from "@/lib/validators/stops";
import { reorderStops } from "@/server/services/stops";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(reorderSchema, async ({ input, params }) => {
  const user = await requireUser();
  return reorderStops(params.id, input.ids, user);
});
