import { z } from "zod";
import { isoDate } from "./trips";
import { MAX_ACTIVITY_MINUTES, MIN_ACTIVITY_MINUTES } from "@/server/engine/stop-dates";

export const activityCategory = z.enum([
  "SIGHTSEEING",
  "FOOD",
  "CULTURE",
  "ADVENTURE",
  "NATURE",
  "NIGHTLIFE",
  "SHOPPING",
  "RELAXATION",
]);

const duration = z.coerce
  .number()
  .int()
  .min(MIN_ACTIVITY_MINUTES, `Give it at least ${MIN_ACTIVITY_MINUTES} minutes.`)
  .max(MAX_ACTIVITY_MINUTES, "A single activity can't run longer than a day.");

const startMinute = z.coerce
  .number()
  .int()
  .min(0, "Use a time between 00:00 and 23:59.")
  .max(1439, "Use a time between 00:00 and 23:59.")
  .nullable();

export const addStopActivitySchema = z
  .object({
    /** Either a catalogue activity… */
    activityId: z.string().min(1).optional(),
    /** …or a custom one the user typed in. */
    customName: z.string().trim().min(2, "Name the activity.").max(80).optional(),
    date: isoDate,
    startMinute: startMinute.optional(),
    durationMin: duration.optional(),
    cost: z.coerce.number().min(0, "Cost can't be negative.").max(1_000_000).optional(),
    notes: z.string().trim().max(400).optional(),
  })
  .refine((v) => Boolean(v.activityId) || Boolean(v.customName), {
    message: "Pick an activity or give your own a name.",
    path: ["customName"],
  });

export const updateStopActivitySchema = z.object({
  customName: z.string().trim().min(2).max(80).optional(),
  date: isoDate.optional(),
  startMinute: startMinute.optional(),
  durationMin: duration.optional(),
  cost: z.coerce.number().min(0, "Cost can't be negative.").max(1_000_000).optional(),
  notes: z.string().trim().max(400).nullable().optional(),
});

export const moveActivitySchema = z.object({ date: isoDate });

export const cityListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  region: z.string().trim().max(40).optional(),
  country: z.string().trim().max(60).optional(),
  cost: z.enum(["low", "mid", "high"]).optional(),
  sort: z.enum(["popular", "cost", "name"]).default("popular"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const activityListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: activityCategory.optional(),
  maxCost: z.coerce.number().min(0).max(100_000).optional(),
  maxDuration: z.coerce.number().int().min(0).max(1440).optional(),
  sort: z.enum(["popular", "cost", "duration", "name"]).default("popular"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type AddStopActivityInput = z.infer<typeof addStopActivitySchema>;
export type CityListQuery = z.infer<typeof cityListQuery>;
export type ActivityListQuery = z.infer<typeof activityListQuery>;
