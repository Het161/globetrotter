import { z } from "zod";
import { isoDate } from "./trips";

export const expenseCategory = z.enum(["TRANSPORT", "STAY", "ACTIVITIES", "MEALS", "OTHER"]);

export const createExpenseSchema = z.object({
  category: expenseCategory,
  label: z.string().trim().min(2, "What was it for?").max(80),
  amount: z.coerce
    .number()
    .min(0.01, "Enter an amount above zero.")
    .max(1_000_000, "That's larger than we can record."),
  /** Undated expenses are spread evenly across the trip by the budget engine. */
  date: isoDate.nullable().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
