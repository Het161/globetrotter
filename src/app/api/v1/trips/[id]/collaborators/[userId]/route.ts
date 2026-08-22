import { withApi } from "@/server/http/withApi";
import { removeCollaborator } from "@/server/services/collaborators";
import { requireUser } from "@/server/auth/session";

export const DELETE = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return removeCollaborator(params.id, params.userId, user);
});
