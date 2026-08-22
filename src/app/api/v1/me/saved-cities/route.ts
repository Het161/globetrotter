import { withApi } from "@/server/http/withApi";
import { savedCitySchema } from "@/lib/validators/profile";
import { listSavedCities, saveCity } from "@/server/services/cities";
import { requireUser } from "@/server/auth/session";

export const GET = withApi(null, async () => {
  const user = await requireUser();
  return listSavedCities(user.id);
});

export const POST = withApi(savedCitySchema, async ({ input }) => {
  const user = await requireUser();
  return saveCity(user.id, input.cityId);
});
