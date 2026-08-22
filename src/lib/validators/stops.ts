import { z } from "zod";
import { isoDate } from "./trips";

export const transportMode = z.enum(["FLIGHT", "TRAIN", "BUS", "CAR", "FERRY"]);

export const createStopSchema = z.object({
  cityId: z.string().min(1, "Pick a city."),
  // Both optional: leaving them out asks the engine to pick smart defaults.
  arrivalDate: isoDate.optional(),
  departureDate: isoDate.optional(),
  nights: z.coerce.number().int().min(1).max(60).optional(),
});

export const updateStopSchema = z
  .object({
    arrivalDate: isoDate.optional(),
    departureDate: isoDate.optional(),
    stayCostPerNight: z.coerce.number().min(0, "Cost can't be negative.").max(100_000).optional(),
    transportCostToNext: z.coerce.number().min(0, "Cost can't be negative.").max(100_000).optional(),
    transportMode: transportMode.nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => !v.arrivalDate || !v.departureDate || v.departureDate >= v.arrivalDate, {
    message: "Departure can't be before arrival. Pick a later date.",
    path: ["departureDate"],
  });

export const reorderSchema = z.object({
  /** The full ordered list of stop ids, so the server never has to guess. */
  ids: z.array(z.string().min(1)).min(1, "Nothing to reorder."),
});

export type CreateStopInput = z.infer<typeof createStopSchema>;
export type UpdateStopInput = z.infer<typeof updateStopSchema>;
