/**
 * All trip dates are calendar dates, not instants. Postgres stores them as
 * `@db.Date`, Prisma hands them back as a Date pinned to UTC midnight, and we
 * pass them around the app as plain "YYYY-MM-DD" strings.
 *
 * Every helper here does UTC math on purpose. Doing this with local-time Date
 * methods is the classic "my trip starts a day early in IST" bug.
 */

export type ISODate = string; // "YYYY-MM-DD"

const MS_PER_DAY = 86_400_000;

/** Prisma Date -> "YYYY-MM-DD". */
export function toISODate(d: Date | string): ISODate {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> Date at UTC midnight, safe to hand to Prisma. */
export function fromISODate(s: ISODate): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Whole days from a to b. Negative when b is before a. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / MS_PER_DAY);
}

export function addDays(s: ISODate, n: number): ISODate {
  return toISODate(new Date(fromISODate(s).getTime() + n * MS_PER_DAY));
}

/** Nights slept at a stop. Arriving and leaving the same day is still 0 nights. */
export function nights(arrival: ISODate, departure: ISODate): number {
  return Math.max(0, daysBetween(arrival, departure));
}

/** A trip from the 1st to the 3rd is 3 days, not 2 — both ends are inclusive. */
export function tripDays(start: ISODate, end: ISODate): number {
  return Math.max(1, daysBetween(start, end) + 1);
}

/** Every calendar day in an inclusive range. */
export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const total = daysBetween(start, end);
  for (let i = 0; i <= total; i++) out.push(addDays(start, i));
  return out;
}

export function isBefore(a: ISODate, b: ISODate) {
  return a < b;
}
export function isAfter(a: ISODate, b: ISODate) {
  return a > b;
}
export function isWithin(day: ISODate, start: ISODate, end: ISODate) {
  return day >= start && day <= end;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

/* -------------------------------------------------------------------------- */
/* Display                                                                    */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "12 Mar 2027" — formatted from UTC parts so it never shifts by locale. */
export function formatDate(s: ISODate): string {
  const d = fromISODate(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "12 Mar" — the compact form used inside dense rows. */
export function formatDateShort(s: ISODate): string {
  const d = fromISODate(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function weekday(s: ISODate): string {
  return WEEKDAYS[fromISODate(s).getUTCDay()];
}

export function monthLabel(s: ISODate): string {
  const d = fromISODate(s);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "12 – 19 Mar 2027", collapsing the parts the two dates share. */
export function formatDateRange(start: ISODate, end: ISODate): string {
  const a = fromISODate(start);
  const b = fromISODate(end);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();

  if (sameMonth) {
    return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** "in 12 days" / "today" / "8 days ago" — the departure-board countdown. */
export function countdown(target: ISODate, from: ISODate = todayISO()): string {
  const d = daysBetween(from, target);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  if (d > 0) return `in ${d} days`;
  return `${Math.abs(d)} days ago`;
}

/** "Morning" / "Afternoon" / "Evening" for the dashboard greeting. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

/** 570 -> "09:30". Minutes from midnight is how we store activity start times. */
export function formatMinute(min: number | null | undefined): string {
  if (min === null || min === undefined) return "—";
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:30" -> 570. Returns null when the string isn't a valid time. */
export function parseMinute(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 150 -> "2h 30m". Durations are stored in minutes. */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
