import { withApi } from "@/server/http/withApi";
import { collaboratorSchema } from "@/lib/validators/trips";
import { addCollaborator, listCollaborators } from "@/server/services/collaborators";
import { requireUser } from "@/server/auth/session";

export const GET = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return listCollaborators(params.id, user);
});

export const POST = withApi(collaboratorSchema, async ({ input, params }) => {
  const user = await requireUser();
  return addCollaborator(params.id, input.email, input.role, user);
});
