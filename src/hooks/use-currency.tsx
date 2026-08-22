"use client";

import * as React from "react";
import { formatMoney, formatMoneyDigits, fromUSD, symbolFor, toUSD } from "@/lib/currency";

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
      /**
       * A bare number in the display currency — what a numeric <input> needs
       * as its value. `format` returns a decorated string and can't be used
       * for that.
       */
      toDisplay: (amountUSD: number) => Math.round(fromUSD(amountUSD, currency) * 100) / 100,
    }),
    [currency],
  );
}
