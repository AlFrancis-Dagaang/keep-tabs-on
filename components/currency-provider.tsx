"use client";

import { createContext, type ReactNode, useContext } from "react";
import { type Currency, currencySymbol, formatMoney } from "@/lib/money";

const CurrencyContext = createContext<Currency>("PHP");

export function CurrencyProvider({ currency, children }: { currency: Currency; children: ReactNode }) {
  return <CurrencyContext value={currency}>{children}</CurrencyContext>;
}

/** formatMoney in the user's currency, and the symbol for form labels. */
export function useMoney() {
  const currency = useContext(CurrencyContext);
  return { money: (centavos: number) => formatMoney(centavos, currency), symbol: currencySymbol(currency) };
}
