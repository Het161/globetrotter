import { z } from "zod";
import { isValidISODate } from "@/lib/dates";

export const isoDate = z
  .string()
  .refine(isValidISODate, "Use a real calendar date.");

export const tripStatus = z.enum(["PLANNING", "UPCOMING", "ONGOING", "COMPLETED"]);

const baseTrip = {
  name: z
    .string()
    .trim()
    .min(3, "Give the trip a name of at least 3 characters.")
    .max(80, "Trip names are capped at 80 characters."),
  description: z.string().trim().max(500, "Keep the description under 500 characters.").optional().or(z.literal("")),
  startDate: isoDate,
  endDate: isoDate,
  coverImageUrl: z.string().trim().max(400).optional().or(z.literal("")),
  budgetLimit: z.coerce
    .number()
    .min(0, "A budget can't be negative.")
    .max(10_000_000)
    .nullable()
    .optional(),
  status: tripStatus.optional(),
};

export const createTripSchema = z
  .object(baseTrip)
  .refine((v) => v.endDate >= v.startDate, {
    message: "The trip can't end before it starts.",
    path: ["endDate"],
  });

export const updateTripSchema = z
  .object({
    ...baseTrip,
    name: baseTrip.name.optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    /** Set when the user accepts "Shift all stops" on a date conflict. */
    shiftStops: z.boolean().optional(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: "The trip can't end before it starts.",
    path: ["endDate"],
  });

export const tripListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  status: tripStatus.optional(),
  tab: z.enum(["mine", "shared"]).default("mine"),
  sort: z.enum(["start", "updated", "cost", "name"]).default("updated"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const shareSchema = z.object({ isPublic: z.boolean() });

export const collaboratorSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter the collaborator's email address."),
  role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type TripListQuery = z.infer<typeof tripListQuery>;
