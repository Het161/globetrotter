"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ExpenseDTO } from "@/server/dto";
import { api, errorMessage } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";
import { Input, MoneyInput, NativeSelect } from "@/components/ui/field";
import { useCurrency } from "@/hooks/use-currency";
import { formatDateShort } from "@/lib/dates";
import { categoryLabel, type BudgetCategory } from "@/server/engine/budget";

const CATEGORIES: BudgetCategory[] = ["TRANSPORT", "STAY", "ACTIVITIES", "MEALS", "OTHER"];

/**
 * Manual expenses — visas, rail passes, anything the stop and activity costs
 * don't already cover.
 *
 * Leaving the date blank is meaningful: the engine spreads an undated expense
 * evenly across the trip instead of spiking one day.
 */
export function ExpensePanel({
  tripId,
  expenses: initial,
  canEdit,
}: {
  tripId: string;
  expenses: ExpenseDTO[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const money = useCurrency();

  const [expenses, setExpenses] = React.useState(initial);
  const [label, setLabel] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<BudgetCategory>("OTHER");
  const [date, setDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setExpenses(initial), [initial]);

  async function addExpense(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(amount);
    if (label.trim().length < 2 || !Number.isFinite(value) || value <= 0) {
      toast.error("Give the expense a name and an amount above zero.");
      return;
    }

    setSaving(true);
    try {
      const expense = await api.post<ExpenseDTO>(
        `/trips/${tripId}/expenses`,
        {
          category,
          label: label.trim(),
          amount: money.toUSD(value),
          date: date || null,
        },
        { toastOnError: false },
      );

      setExpenses((current) => [...current, expense]);
      setLabel("");
      setAmount("");
      setDate("");
      toast.success("Expense added");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't add that expense."));
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(expense: ExpenseDTO) {
    const snapshot = expenses;
    setExpenses((current) => current.filter((e) => e.id !== expense.id));

    try {
      await api.delete(`/expenses/${expense.id}`, { toastOnError: false });
      router.refresh();
    } catch (error) {
      setExpenses(snapshot);
      toast.error(errorMessage(error, "We couldn't remove that expense."));
    }
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <section className="surface p-5" aria-labelledby="expenses-heading">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 id="expenses-heading" className="placard">
          Other expenses
        </h2>
        <span className="font-mono text-xs font-semibold tabular-nums text-solar">
          {money.format(total, { decimals: false })}
        </span>
      </header>

      {expenses.length === 0 ? (
        <p className="mb-4 text-sm text-fog">
          Nothing added yet. Visas, rail passes and insurance go here.
        </p>
      ) : (
        <ul className="mb-4 space-y-1">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="group flex items-center gap-3 rounded-[var(--radius-input)] px-2 py-2 transition-colors hover:bg-deck/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-cloud">{expense.label}</span>
                <span className="mt-0.5 block font-mono text-2xs text-fog">
                  {categoryLabel(expense.category)} ·{" "}
                  {expense.date ? formatDateShort(expense.date) : "spread across the trip"}
                </span>
              </span>

              <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-cloud">
                {money.format(expense.amount, { decimals: false })}
              </span>

              {canEdit ? (
                <button
                  type="button"
                  onClick={() => removeExpense(expense)}
                  aria-label={`Remove ${expense.label}`}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-fog opacity-0 transition-opacity hover:text-ember focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <form onSubmit={addExpense} className="space-y-2.5 border-t border-line pt-4">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="What was it for?"
            aria-label="Expense description"
            maxLength={80}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <MoneyInput
              symbol={money.symbol}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              aria-label={`Amount in ${money.currency}`}
            />

            <NativeSelect
              value={category}
              onChange={(event) => setCategory(event.target.value as BudgetCategory)}
              aria-label="Expense category"
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {categoryLabel(value)}
                </option>
              ))}
            </NativeSelect>
          </div>

          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Expense date, optional"
          />

          <DeckButton type="submit" variant="secondary" size="sm" className="w-full" loading={saving}>
            <Plus />
            Add expense
          </DeckButton>

          <p className="text-2xs text-fog-dim">
            Leave the date empty to spread it evenly across every day.
          </p>
        </form>
      ) : null}
    </section>
  );
}
