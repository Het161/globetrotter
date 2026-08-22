import { describe, expect, it } from "vitest";
import { computeBudget, type BudgetInput } from "./budget";

/** Tokyo 3 nights → Kyoto 2 nights, over a 6-day trip. */
function sampleTrip(overrides: Partial<BudgetInput> = {}): BudgetInput {
  return {
    startDate: "2027-03-01",
    endDate: "2027-03-06",
    budgetLimit: null,
    stops: [
      {
        id: "tokyo",
        cityName: "Tokyo",
        arrivalDate: "2027-03-01",
        departureDate: "2027-03-04",
        stayCostPerNight: 100,
        transportCostToNext: 80,
        avgMealCost: 40,
        activities: [
          { id: "a1", name: "Senso-ji", date: "2027-03-02", cost: 0 },
          { id: "a2", name: "teamLab", date: "2027-03-03", cost: 30 },
        ],
      },
      {
        id: "kyoto",
        cityName: "Kyoto",
        arrivalDate: "2027-03-04",
        departureDate: "2027-03-06",
        stayCostPerNight: 90,
        transportCostToNext: 120,
        avgMealCost: 35,
        activities: [{ id: "a3", name: "Fushimi Inari", date: "2027-03-05", cost: 0 }],
      },
    ],
    expenses: [],
    ...overrides,
  };
}

describe("computeBudget", () => {
  it("totals each category from the stops", () => {
    const b = computeBudget(sampleTrip());

    expect(b.byCategory.STAY).toBe(3 * 100 + 2 * 90); // 480
    expect(b.byCategory.MEALS).toBe(3 * 40 + 2 * 35); // 190
    expect(b.byCategory.TRANSPORT).toBe(80 + 120); // 200
    expect(b.byCategory.ACTIVITIES).toBe(30);
    expect(b.total).toBe(900);
  });

  it("keeps the daily allocation consistent with the total", () => {
    const b = computeBudget(sampleTrip());
    const daySum = b.byDay.reduce((sum, d) => sum + d.spend, 0);
    expect(Math.round(daySum * 100) / 100).toBe(b.total);
  });

  it("spreads an average across the whole trip length", () => {
    const b = computeBudget(sampleTrip());
    expect(b.tripDays).toBe(6);
    expect(b.avgPerDay).toBe(150);
  });

  it("buckets manual expenses into their category and their day", () => {
    const b = computeBudget(
      sampleTrip({
        expenses: [
          { id: "e1", category: "OTHER", label: "Pocket wifi", amount: 45, date: "2027-03-01" },
        ],
      }),
    );

    expect(b.byCategory.OTHER).toBe(45);
    expect(b.total).toBe(945);
    expect(b.byDay[0].topItems.some((i) => i.label === "Pocket wifi")).toBe(true);
  });

  it("spreads an undated expense evenly without losing money", () => {
    const b = computeBudget(
      sampleTrip({
        expenses: [{ id: "e1", category: "OTHER", label: "Visa", amount: 100, date: null }],
      }),
    );

    const daySum = b.byDay.reduce((sum, d) => sum + d.spend, 0);
    expect(b.total).toBe(1000);
    expect(Math.round(daySum)).toBe(1000);
  });

  it("marks days over and near the daily limit", () => {
    // 900 total over 6 days with a 600 limit = 100/day allowed.
    const b = computeBudget(sampleTrip({ budgetLimit: 600 }));

    expect(b.dailyLimit).toBe(100);
    expect(b.overBudgetDays.length).toBeGreaterThan(0);

    const firstDay = b.byDay[0]; // stay 100 + meals 40 = 140 > 100
    expect(firstDay.status).toBe("over");
    expect(firstDay.topItems[0]).toEqual({ label: "Tokyo · stay", amount: 100 });
  });

  it("reports no over-budget days when there is no limit", () => {
    const b = computeBudget(sampleTrip());
    expect(b.dailyLimit).toBeNull();
    expect(b.overBudgetDays).toEqual([]);
  });

  it("suggests dropping a night in the most expensive city", () => {
    const b = computeBudget(sampleTrip({ budgetLimit: 600 }));
    const tip = b.savingTips.find((t) => t.id === "drop-night");
    expect(tip?.message).toContain("Tokyo");
    expect(tip?.amountUSD).toBe(140); // one night plus one day of food
  });

  it("handles an empty trip without dividing by zero", () => {
    const b = computeBudget({
      startDate: "2027-03-01",
      endDate: "2027-03-01",
      budgetLimit: null,
      stops: [],
      expenses: [],
    });

    expect(b.total).toBe(0);
    expect(b.avgPerDay).toBe(0);
    expect(b.byDay).toHaveLength(1);
  });
});
