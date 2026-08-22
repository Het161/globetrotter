/**
 * The three demo trips the reviewers will actually click through.
 *
 * Trip 1 is the showcase: it is public on a fixed slug, and its budget limit is
 * chosen so exactly one day lands over budget — which is how the alert, the
 * ember day-tab dot and the calendar heat all get demonstrated in one screen.
 */

export type DemoActivity = {
  /** Matches an activity name from seed-data/activities.ts for that city. */
  activity: string;
  /** Day offset from the stop's arrival date. */
  dayOffset: number;
  startMinute: number;
  /** Overrides the catalogue cost when the demo needs a specific figure. */
  cost?: number;
};

export type DemoStop = {
  citySlug: string;
  nights: number;
  stayCostPerNight: number;
  transportCostToNext: number;
  transportMode: "FLIGHT" | "TRAIN" | "BUS" | "CAR" | "FERRY";
  activities: DemoActivity[];
};

export type DemoExpense = {
  category: "TRANSPORT" | "STAY" | "ACTIVITIES" | "MEALS" | "OTHER";
  label: string;
  amount: number;
  dayOffset: number | null;
};

export type DemoTrip = {
  name: string;
  description: string;
  /** Days from "today" when the trip starts. Negative means it already happened. */
  startsInDays: number;
  status: "PLANNING" | "UPCOMING" | "ONGOING" | "COMPLETED";
  budgetLimit: number | null;
  isPublic: boolean;
  shareSlug?: string;
  stops: DemoStop[];
  expenses: DemoExpense[];
};

export const demoTrips: DemoTrip[] = [
  {
    name: "Japan Cherry Blossom '27",
    description:
      "Eight nights chasing the sakura front from Tokyo down to Osaka, mostly on the Shinkansen.",
    startsInDays: 214,
    status: "UPCOMING",
    // 8 nights over 9 days, totalling $2,632 against a $2,900 limit — so the
    // trip reads "under budget" overall while the $322/day allowance is still
    // blown on exactly one day (the flight home). Two more days land in the
    // "near" band, which means one screen demonstrates all three day states.
    budgetLimit: 2900,
    isPublic: true,
    shareSlug: "japan-sakura-27",
    stops: [
      {
        citySlug: "tokyo",
        nights: 3,
        stayCostPerNight: 145,
        transportCostToNext: 95,
        transportMode: "TRAIN",
        activities: [
          { activity: "Senso-ji Temple, Asakusa", dayOffset: 0, startMinute: 570 },
          { activity: "Tsukiji outer market breakfast", dayOffset: 1, startMinute: 420 },
          { activity: "Meiji Jingū forest walk", dayOffset: 1, startMinute: 660 },
          { activity: "teamLab Borderless", dayOffset: 2, startMinute: 600 },
          { activity: "Shibuya Sky observation deck", dayOffset: 2, startMinute: 1020 },
          { activity: "Shinjuku izakaya night", dayOffset: 2, startMinute: 1140 },
        ],
      },
      {
        citySlug: "kyoto",
        nights: 3,
        stayCostPerNight: 128,
        transportCostToNext: 38,
        transportMode: "TRAIN",
        activities: [
          { activity: "Fushimi Inari torii climb", dayOffset: 0, startMinute: 450 },
          { activity: "Nishiki Market", dayOffset: 0, startMinute: 750 },
          { activity: "Kinkaku-ji, the Golden Pavilion", dayOffset: 1, startMinute: 540 },
          { activity: "Arashiyama bamboo grove", dayOffset: 1, startMinute: 780 },
          { activity: "Tea ceremony in Gion", dayOffset: 2, startMinute: 900 },
        ],
      },
      {
        citySlug: "osaka",
        nights: 2,
        stayCostPerNight: 108,
        transportCostToNext: 620,
        transportMode: "FLIGHT",
        activities: [
          { activity: "Osaka Castle and park", dayOffset: 0, startMinute: 600 },
          { activity: "Dōtonbori street food", dayOffset: 0, startMinute: 1110 },
          { activity: "Kuromon Ichiba Market", dayOffset: 1, startMinute: 630 },
        ],
      },
    ],
    expenses: [
      // Undated on purpose: a rail pass is used across the whole trip, so the
      // engine spreads it evenly rather than spiking day one.
      { category: "TRANSPORT", label: "JR Pass, 7 days", amount: 235, dayOffset: null },
      { category: "OTHER", label: "Pocket wifi rental", amount: 42, dayOffset: null },
    ],
  },
  {
    name: "Euro Summer",
    description: "Three capitals, no fixed budget yet — first pass at the route.",
    startsInDays: 96,
    status: "UPCOMING",
    budgetLimit: null,
    isPublic: false,
    stops: [
      {
        citySlug: "paris",
        nights: 3,
        stayCostPerNight: 168,
        transportCostToNext: 120,
        transportMode: "TRAIN",
        activities: [
          { activity: "Louvre Museum", dayOffset: 0, startMinute: 600 },
          { activity: "Seine evening cruise", dayOffset: 1, startMinute: 1200 },
        ],
      },
      {
        citySlug: "barcelona",
        nights: 3,
        stayCostPerNight: 124,
        transportCostToNext: 90,
        transportMode: "FLIGHT",
        activities: [
          { activity: "Sagrada Família", dayOffset: 0, startMinute: 570 },
          { activity: "La Boqueria market", dayOffset: 1, startMinute: 660 },
        ],
      },
      {
        citySlug: "rome",
        nights: 3,
        stayCostPerNight: 132,
        transportCostToNext: 540,
        transportMode: "FLIGHT",
        activities: [
          { activity: "Colosseum and Roman Forum", dayOffset: 0, startMinute: 540 },
          { activity: "Trastevere dinner crawl", dayOffset: 1, startMinute: 1170 },
        ],
      },
    ],
    expenses: [],
  },
  {
    name: "Goa long weekend",
    description: "Three nights south Goa, done and dusted.",
    startsInDays: -68,
    status: "COMPLETED",
    budgetLimit: 400,
    isPublic: false,
    stops: [
      {
        citySlug: "goa",
        nights: 3,
        stayCostPerNight: 46,
        transportCostToNext: 78,
        transportMode: "FLIGHT",
        activities: [
          { activity: "Palolem beach day", dayOffset: 0, startMinute: 600 },
          { activity: "Dudhsagar Falls jeep trip", dayOffset: 1, startMinute: 480 },
          { activity: "Mandovi sunset cruise", dayOffset: 2, startMinute: 1080 },
        ],
      },
    ],
    expenses: [
      { category: "MEALS", label: "Beach shack dinners", amount: 62, dayOffset: 1 },
      { category: "OTHER", label: "Scooter hire, 3 days", amount: 24, dayOffset: 0 },
    ],
  },
];

/** Event types written to ActivityEvent so the admin charts have real shape. */
export const EVENT_TYPES = [
  "login",
  "trip.created",
  "stop.added",
  "activity.added",
  "trip.shared",
  "share.viewed",
  "trip.copied",
] as const;
