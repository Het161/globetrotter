"use client";

import * as React from "react";
import { formatMoney, formatMoneyDigits, symbolFor, toUSD } from "@/lib/currency";

/**
 * The user's display currency, threaded down from the session so every screen
 * formats money the same way without each one importing the whole table.
 */
const CurrencyContext = React.createContext<string>("USD");

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string;
  children: React.ReactNode;
}) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const currency = React.useContext(CurrencyContext);

  return React.useMemo(
    () => ({
      currency,
      symbol: symbolFor(currency),
      /** Format a USD amount for display. */
      format: (amountUSD: number, options?: { compact?: boolean; decimals?: boolean }) =>
        formatMoney(amountUSD, currency, options),
      /** Digits only, for the SplitFlap which draws its own symbol. */
      digits: (amountUSD: number) => formatMoneyDigits(amountUSD, currency),
      /** Convert what the user typed back into the USD we store. */
      toUSD: (amount: number) => toUSD(amount, currency),
    }),
    [currency],
  );
}
