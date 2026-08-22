import type {
  Activity,
  ActivityCategory,
  City,
  CollaboratorRole,
  ExpenseCategory,
  Prisma,
  Role,
  StopActivity,
  TransportMode,
  Trip,
  TripExpense,
  TripStatus,
  TripStop,
  User,
} from "@prisma/client";
import { toISODate, type ISODate } from "@/lib/dates";

/**
 * Prisma hands back `Decimal` and `Date` objects. Neither survives the
 * server → client component boundary in Next.js — `Decimal` is a class
 * instance and `Date` silently becomes a string with a timezone attached.
 *
 * So nothing Prisma-shaped ever leaves this file. Services return DTOs:
 * plain numbers and "YYYY-MM-DD" strings.
 */

export function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : Number(d);
}

export function numOrNull(d: Prisma.Decimal | number | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return typeof d === "number" ? d : Number(d);
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type UserDTO = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  language: string;
  currency: string;
  role: Role;
  createdAt: string;
};

export type CityDTO = {
  id: string;
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  lat: number;
  lng: number;
  costIndex: number;
  popularity: number;
  currency: string;
  timezone: string | null;
  description: string;
  imageUrl: string | null;
  avgStayCost: number;
  avgMealCost: number;
  activityCount?: number;
  saved?: boolean;
};

export type ActivityDTO = {
  id: string;
  cityId: string;
  cityName?: string;
  citySlug?: string;
  name: string;
  category: ActivityCategory;
  description: string;
  estimatedCost: number;
  durationMin: number;
  imageUrl: string | null;
  popularity: number;
};

export type StopActivityDTO = {
  id: string;
  stopId: string;
  activityId: string | null;
  name: string;
  category: ActivityCategory | null;
  description: string | null;
  date: ISODate;
  startMinute: number | null;
  durationMin: number;
  cost: number;
  orderIndex: number;
  notes: string | null;
};

export type StopDTO = {
  id: string;
  tripId: string;
  cityId: string;
  city: CityDTO;
  orderIndex: number;
  arrivalDate: ISODate;
  departureDate: ISODate;
  nights: number;
  stayCostPerNight: number;
  transportCostToNext: number;
  transportMode: TransportMode | null;
  notes: string | null;
  activities: StopActivityDTO[];
};

export type TripDTO = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  startDate: ISODate;
  endDate: ISODate;
  days: number;
  coverImageUrl: string | null;
  budgetLimit: number | null;
  status: TripStatus;
  isPublic: boolean;
  shareSlug: string | null;
  viewCount: number;
  copiedFromId: string | null;
  createdAt: string;
  updatedAt: string;
  stops: StopDTO[];
  expenses: ExpenseDTO[];
  owner?: { id: string; name: string; avatarUrl: string | null };
  /** Present on list rows so cards can show a total without a second query. */
  summary?: TripSummary;
  myRole?: "OWNER" | CollaboratorRole;
};

export type TripSummary = {
  stopCount: number;
  nights: number;
  activityCount: number;
  total: number;
  cities: string[];
};

export type ExpenseDTO = {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  date: ISODate | null;
};

export type CollaboratorDTO = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: CollaboratorRole;
};

/* -------------------------------------------------------------------------- */
/* Mappers                                                                    */
/* -------------------------------------------------------------------------- */

export function toUserDTO(u: User): UserDTO {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    language: u.language,
    currency: u.currency,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toCityDTO(c: City, extra: { activityCount?: number; saved?: boolean } = {}): CityDTO {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    country: c.country,
    countryCode: c.countryCode,
    region: c.region,
    lat: c.lat,
    lng: c.lng,
    costIndex: c.costIndex,
    popularity: c.popularity,
    currency: c.currency,
    timezone: c.timezone,
    description: c.description,
    imageUrl: c.imageUrl,
    avgStayCost: num(c.avgStayCost),
    avgMealCost: num(c.avgMealCost),
    ...extra,
  };
}

export function toActivityDTO(
  a: Activity & { city?: { name: string; slug: string } | null },
): ActivityDTO {
  return {
    id: a.id,
    cityId: a.cityId,
    cityName: a.city?.name,
    citySlug: a.city?.slug,
    name: a.name,
    category: a.category,
    description: a.description,
    estimatedCost: num(a.estimatedCost),
    durationMin: a.durationMin,
    imageUrl: a.imageUrl,
    popularity: a.popularity,
  };
}

export function toStopActivityDTO(
  sa: StopActivity & { activity?: Activity | null },
): StopActivityDTO {
  return {
    id: sa.id,
    stopId: sa.stopId,
    activityId: sa.activityId,
    // A custom activity has no catalogue row, so its name lives on the join.
    name: sa.customName ?? sa.activity?.name ?? "Untitled activity",
    category: sa.activity?.category ?? null,
    description: sa.activity?.description ?? null,
    date: toISODate(sa.date),
    startMinute: sa.startMinute,
    durationMin: sa.durationMin,
    cost: num(sa.cost),
    orderIndex: sa.orderIndex,
    notes: sa.notes,
  };
}

type StopWithRelations = TripStop & {
  city: City;
  activities?: (StopActivity & { activity?: Activity | null })[];
};

export function toStopDTO(s: StopWithRelations): StopDTO {
  const arrival = toISODate(s.arrivalDate);
  const departure = toISODate(s.departureDate);
  return {
    id: s.id,
    tripId: s.tripId,
    cityId: s.cityId,
    city: toCityDTO(s.city),
    orderIndex: s.orderIndex,
    arrivalDate: arrival,
    departureDate: departure,
    nights: Math.max(
      0,
      Math.round(
        (new Date(`${departure}T00:00:00Z`).getTime() -
          new Date(`${arrival}T00:00:00Z`).getTime()) /
          86_400_000,
      ),
    ),
    stayCostPerNight: num(s.stayCostPerNight),
    transportCostToNext: num(s.transportCostToNext),
    transportMode: s.transportMode,
    notes: s.notes,
    activities: (s.activities ?? [])
      .map(toStopActivityDTO)
      .sort((a, b) => a.date.localeCompare(b.date) || a.orderIndex - b.orderIndex),
  };
}

export function toExpenseDTO(e: TripExpense): ExpenseDTO {
  return {
    id: e.id,
    tripId: e.tripId,
    category: e.category,
    label: e.label,
    amount: num(e.amount),
    date: e.date ? toISODate(e.date) : null,
  };
}

type TripWithRelations = Trip & {
  stops?: StopWithRelations[];
  expenses?: TripExpense[];
  user?: User | null;
};

export function toTripDTO(t: TripWithRelations): TripDTO {
  const startDate = toISODate(t.startDate);
  const endDate = toISODate(t.endDate);
  const stops = (t.stops ?? [])
    .map(toStopDTO)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return {
    id: t.id,
    userId: t.userId,
    name: t.name,
    description: t.description,
    startDate,
    endDate,
    days:
      Math.round(
        (new Date(`${endDate}T00:00:00Z`).getTime() -
          new Date(`${startDate}T00:00:00Z`).getTime()) /
          86_400_000,
      ) + 1,
    coverImageUrl: t.coverImageUrl,
    budgetLimit: numOrNull(t.budgetLimit),
    status: t.status,
    isPublic: t.isPublic,
    shareSlug: t.shareSlug,
    viewCount: t.viewCount,
    copiedFromId: t.copiedFromId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    stops,
    expenses: (t.expenses ?? []).map(toExpenseDTO),
    owner: t.user
      ? { id: t.user.id, name: t.user.name, avatarUrl: t.user.avatarUrl }
      : undefined,
  };
}
