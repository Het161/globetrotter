import { withApi } from "@/server/http/withApi";
import { updateTripSchema } from "@/lib/validators/trips";
import { deleteTrip, getTrip, updateTrip } from "@/server/services/trips";
import { requireUser } from "@/server/auth/session";

export const GET = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return getTrip(params.id, user);
});

export const PATCH = withApi(updateTripSchema, async ({ input, params }) => {
  const user = await requireUser();
  return updateTrip(params.id, input, user);
});

export const DELETE = withApi(null, async ({ params }) => {
  const user = await requireUser();
  return deleteTrip(params.id, user);
});
