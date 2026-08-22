import { withApi, withMeta } from "@/server/http/withApi";
import { createTripSchema, tripListQuery } from "@/lib/validators/trips";
import { createTrip, listTrips } from "@/server/services/trips";
import { requireUser } from "@/server/auth/session";

export const GET = withApi(tripListQuery, async ({ input }) => {
  const user = await requireUser();
  const result = await listTrips(input, user);
  return withMeta(result.items, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  });
});

export const POST = withApi(createTripSchema, async ({ input }) => {
  const user = await requireUser();
  return createTrip(input, user.id);
});
