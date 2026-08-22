import "server-only";
import { db } from "@/server/db";
import { toExpenseDTO, type ExpenseDTO, type UserDTO } from "@/server/dto";
import { NotFoundError } from "@/server/http/errors";
import { fromISODate } from "@/lib/dates";
import type { CreateExpenseInput } from "@/lib/validators/expenses";
import { assertTripAccess } from "./trips";
import { logEvent } from "./analytics";

export async function addExpense(
  tripId: string,
  input: CreateExpenseInput,
  user: Pick<UserDTO, "id" | "role">,
): Promise<ExpenseDTO> {
  await assertTripAccess(tripId, user, "EDIT");

  const expense = await db.tripExpense.create({
    data: {
      tripId,
      category: input.category,
      label: input.label,
      amount: input.amount,
      date: input.date ? fromISODate(input.date) : null,
    },
  });

  await db.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
  logEvent("expense.added", { userId: user.id, tripId });

  return toExpenseDTO(expense);
}

export async function deleteExpense(id: string, user: Pick<UserDTO, "id" | "role">) {
  const expense = await db.tripExpense.findUnique({ where: { id } });
  if (!expense) throw new NotFoundError("That expense was already removed.");

  await assertTripAccess(expense.tripId, user, "EDIT");
  await db.tripExpense.delete({ where: { id } });
  await db.trip.update({ where: { id: expense.tripId }, data: { updatedAt: new Date() } });

  return { id };
}
