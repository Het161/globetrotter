import { withApi } from "@/server/http/withApi";
import { createExpenseSchema } from "@/lib/validators/expenses";
import { addExpense } from "@/server/services/expenses";
import { requireUser } from "@/server/auth/session";

export const POST = withApi(createExpenseSchema, async ({ input, params }) => {
  const user = await requireUser();
  return addExpense(params.id, input, user);
});
