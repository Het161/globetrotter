import { addDays, daysBetween, eachDay, type ISODate } from "@/lib/dates";

/**
 * The budget engine.
 *
 * Pure: it takes the plain numbers a single Prisma query produced and returns
 * every figure the Budget, Calendar and Dashboard screens need. No I/O, no
 * Decimal, no Date objects — which is what makes it testable and fast.
 *
 * Everything is USD. Display currency is applied by the UI.
 *
 * Invariant worth knowing for the code review: `sum(byDay.spend) === total`.
 * Meals are therefore charged per *night* (arrival … departure-1), not per
 * calendar day, so the daily allocation and the category total can't drift.
 */

export type BudgetCategory = "TRANSPORT" | "STAY" | "ACTIVITIES" | "MEALS" | "OTHER";

export type BudgetStopInput = {
  id: string;
  cityName: string;
  arrivalDate: ISODate;
  departureDate: ISODate;
  stayCostPerNight: number;
  transportCostToNext: number;
  avgMealCost: number;
  activities: { id: string; name: string; date: ISODate; cost: number }[];
};

export type BudgetExpenseInput = {
  id: string;
  category: BudgetCategory;
  label: string;
  amount: number;
  date: ISODate | null;
};

export type BudgetInput = {
  startDate: ISODate;
  endDate: ISODate;
  budgetLimit: number | null;
  stops: BudgetStopInput[];
  expenses: BudgetExpenseInput[];
};

export type DayStatus = "under" | "near" | "over";

export type DayBudget = {
  date: ISODate;
  spend: number;
  status: DayStatus;
  /** The three biggest line items that day, for the alert list and tooltips. */
  topItems: { label: string; amount: number }[];
};

export type StopBudget = {
  stopId: string;
  cityName: string;
  nights: number;
  stay: number;
  transport: number;
  activities: number;
  meals: number;
  total: number;
};

/** `message` carries a `{money}` placeholder so the UI can format the currency. */
export type SavingTip = { id: string; message: string; amountUSD: number | null };

export type BudgetBreakdown = {
  total: number;
  byCategory: Record<BudgetCategory, number>;
  byStop: StopBudget[];
  byDay: DayBudget[];
  tripDays: number;
  avgPerDay: number;
  budgetLimit: number | null;
  dailyLimit: number | null;
  /** Days whose spend exceeds the daily limit. Empty when no limit is set. */
  overBudgetDays: ISODate[];
  savingTips: SavingTip[];
};

/** Spend above this share of the daily limit is "near", above 100% is "over". */
const NEAR_THRESHOLD = 0.85;

export function computeBudget(input: BudgetInput): BudgetBreakdown {
  const days = eachDay(input.startDate, input.endDate);
  const tripDays = days.length;

  const byCategory: Record<BudgetCategory, number> = {
    TRANSPORT: 0,
    STAY: 0,
    ACTIVITIES: 0,
    MEALS: 0,
    OTHER: 0,
  };

  // date -> line items charged to that date
  const ledger = new Map<ISODate, { label: string; amount: number }[]>();
  for (const day of days) ledger.set(day, []);

  /** Charge an amount to a day, clamping to the trip so nothing is lost. */
  const charge = (date: ISODate, label: string, amount: number) => {
    if (amount === 0) return;
    const key = date < input.startDate ? input.startDate : date > input.endDate ? input.endDate : date;
    ledger.get(key)?.push({ label, amount });
  };

  const byStop: StopBudget[] = [];

  for (const stop of input.stops) {
    const nights = Math.max(0, daysBetween(stop.arrivalDate, stop.departureDate));
    // A same-day stop still costs you a day of food.
    const chargeableNights = Math.max(1, nights);

    const stay = nights * stop.stayCostPerNight;
    const meals = chargeableNights * stop.avgMealCost;
    const transport = stop.transportCostToNext;
    const activities = stop.activities.reduce((sum, a) => sum + a.cost, 0);

    byCategory.STAY += stay;
    byCategory.MEALS += meals;
    byCategory.TRANSPORT += transport;
    byCategory.ACTIVITIES += activities;

    // One night's bed and one day's food land on each night you're there.
    for (let i = 0; i < chargeableNights; i++) {
      const day = addDays(stop.arrivalDate, i);
      if (i < nights) charge(day, `${stop.cityName} · stay`, stop.stayCostPerNight);
      charge(day, `${stop.cityName} · meals`, stop.avgMealCost);
    }

    // Transport is spent on the day you leave.
    charge(stop.departureDate, `${stop.cityName} · transport`, transport);

    for (const activity of stop.activities) {
      charge(activity.date, activity.name, activity.cost);
    }

    byStop.push({
      stopId: stop.id,
      cityName: stop.cityName,
      nights,
      stay,
      meals,
      transport,
      activities,
      total: stay + meals + transport + activities,
    });
  }

  // Manual expenses bucket into the same five categories.
  const undated = input.expenses.filter((e) => !e.date);
  for (const expense of input.expenses) {
    byCategory[expense.category] += expense.amount;
    if (expense.date) charge(expense.date, expense.label, expense.amount);
  }

  // Undated expenses spread evenly; the remainder lands on day one so the
  // per-day figures still add up to the total exactly.
  if (undated.length > 0 && tripDays > 0) {
    const undatedTotal = undated.reduce((sum, e) => sum + e.amount, 0);
    const perDay = undatedTotal / tripDays;
    for (const day of days) charge(day, "Other expenses", perDay);
  }

  const total =
    byCategory.STAY +
    byCategory.MEALS +
    byCategory.TRANSPORT +
    byCategory.ACTIVITIES +
    byCategory.OTHER;

  const dailyLimit = input.budgetLimit !== null ? input.budgetLimit / tripDays : null;

  const byDay: DayBudget[] = days.map((date) => {
    const items = ledger.get(date) ?? [];
    const spend = items.reduce((sum, i) => sum + i.amount, 0);
    return {
      date,
      spend: round2(spend),
      status: dayStatus(spend, dailyLimit),
      topItems: [...items]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
        .map((i) => ({ label: i.label, amount: round2(i.amount) })),
    };
  });

  const overBudgetDays = byDay.filter((d) => d.status === "over").map((d) => d.date);

  return {
    total: round2(total),
    byCategory: {
      TRANSPORT: round2(byCategory.TRANSPORT),
      STAY: round2(byCategory.STAY),
      ACTIVITIES: round2(byCategory.ACTIVITIES),
      MEALS: round2(byCategory.MEALS),
      OTHER: round2(byCategory.OTHER),
    },
    byStop: byStop.map((s) => ({
      ...s,
      stay: round2(s.stay),
      meals: round2(s.meals),
      transport: round2(s.transport),
      activities: round2(s.activities),
      total: round2(s.total),
    })),
    byDay,
    tripDays,
    avgPerDay: round2(total / tripDays),
    budgetLimit: input.budgetLimit,
    dailyLimit: dailyLimit === null ? null : round2(dailyLimit),
    overBudgetDays,
    savingTips: buildSavingTips(input, byStop, byCategory, total),
  };
}

function dayStatus(spend: number, dailyLimit: number | null): DayStatus {
  if (dailyLimit === null || dailyLimit <= 0) return "under";
  if (spend > dailyLimit) return "over";
  if (spend > dailyLimit * NEAR_THRESHOLD) return "near";
  return "under";
}

/**
 * Three concrete, checkable suggestions — never generic advice.
 * Each one names a real number the user can act on.
 */
function buildSavingTips(
  input: BudgetInput,
  byStop: StopBudget[],
  byCategory: Record<BudgetCategory, number>,
  total: number,
): SavingTip[] {
  const tips: SavingTip[] = [];

  // 1. The single most expensive night in the trip.
  const priciest = input.stops
    .filter((s) => daysBetween(s.arrivalDate, s.departureDate) > 1)
    .sort((a, b) => b.stayCostPerNight - a.stayCostPerNight)[0];
  if (priciest && priciest.stayCostPerNight > 0) {
    tips.push({
      id: "drop-night",
      message: `Dropping 1 night in ${priciest.cityName} saves {money}.`,
      amountUSD: round2(priciest.stayCostPerNight + priciest.avgMealCost),
    });
  }

  // 2. Expensive activities, if there are any worth reviewing.
  const pricey = input.stops
    .flatMap((s) => s.activities)
    .filter((a) => a.cost >= 100);
  if (pricey.length >= 2) {
    tips.push({
      id: "pricey-activities",
      message: `${pricey.length} activities cost over $100 each — {money} in total.`,
      amountUSD: round2(pricey.reduce((sum, a) => sum + a.cost, 0)),
    });
  }

  // 3. The category that dominates, when one clearly does.
  const [topCategory, topAmount] = (
    Object.entries(byCategory) as [BudgetCategory, number][]
  ).sort((a, b) => b[1] - a[1])[0] ?? ["OTHER", 0];
  if (total > 0 && topAmount / total > 0.4) {
    tips.push({
      id: "dominant-category",
      message: `${categoryLabel(topCategory)} is ${Math.round((topAmount / total) * 100)}% of this trip — {money}.`,
      amountUSD: round2(topAmount),
    });
  }

  return tips.slice(0, 3);
}

export function categoryLabel(c: BudgetCategory): string {
  return { TRANSPORT: "Transport", STAY: "Stay", ACTIVITIES: "Activities", MEALS: "Meals", OTHER: "Other" }[c];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
