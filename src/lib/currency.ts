/**
 * Everything in the database is stored and computed in USD. The user's display
 * currency is a presentation concern only, applied at the edges.
 *
 * Rates are a static table on purpose: the app must run with zero internet
 * (§1.5 of the brief). They are labelled "indicative" wherever money is shown.
 */

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "THB", symbol: "฿", label: "Thai Baht" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

/** Units of the currency per 1 USD. Snapshot, indicative only. */
const RATES: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 83.4,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 151.2,
  AED: 3.67,
  SGD: 1.34,
  AUD: 1.52,
  THB: 35.6,
};

/** Currencies people don't write decimals in. */
const ZERO_DECIMAL: ReadonlySet<string> = new Set(["JPY"]);

export function isCurrencyCode(code: string): code is CurrencyCode {
  return code in RATES;
}

function normalize(code: string): CurrencyCode {
  return isCurrencyCode(code) ? code : "USD";
}

export function symbolFor(code: string): string {
  return CURRENCIES.find((c) => c.code === normalize(code))?.symbol ?? "$";
}

export function fromUSD(amountUSD: number, code: string): number {
  return amountUSD * RATES[normalize(code)];
}

export function toUSD(amount: number, code: string): number {
  return amount / RATES[normalize(code)];
}

/**
 * Format a USD amount in the user's currency.
 * `compact` gives "₹1.2L" / "$12.4K" for tiles where space is tight.
 */
export function formatMoney(
  amountUSD: number,
  code: string = "USD",
  options: { compact?: boolean; decimals?: boolean } = {},
): string {
  const currency = normalize(code);
  const value = fromUSD(amountUSD, currency);
  const zeroDecimal = ZERO_DECIMAL.has(currency);
  const decimals = options.decimals ?? (!zeroDecimal && Math.abs(value) < 1000);

  if (options.compact) {
    return `${symbolFor(currency)}${compactNumber(value, currency)}`;
  }

  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(value);
}

/** Money with no symbol — for the SplitFlap, which draws its own. */
export function formatMoneyDigits(amountUSD: number, code: string = "USD"): string {
  const currency = normalize(code);
  const value = fromUSD(amountUSD, currency);
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** Indian numbering uses lakh/crore; everyone else uses K/M. */
function compactNumber(value: number, currency: CurrencyCode): string {
  const abs = Math.abs(value);
  if (currency === "INR") {
    if (abs >= 1e7) return `${(value / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
    if (abs >= 1e5) return `${(value / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
    if (abs >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toFixed(0);
  }
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return value.toFixed(0);
}

/** "$" / "₹" prefix plus the raw number — used in inputs where the user types. */
export function moneyInputPrefix(code: string): string {
  return symbolFor(code);
}

export const RATE_NOTE = "Rates are indicative and stored in USD.";
