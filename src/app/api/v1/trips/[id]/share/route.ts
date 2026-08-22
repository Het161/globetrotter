import { withApi } from "@/server/http/withApi";
import { shareSchema } from "@/lib/validators/trips";
import { setShareState } from "@/server/services/share";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(shareSchema, async ({ input, params }) => {
  const user = await requireUser();
  return setShareState(params.id, input.isPublic, user);
});
