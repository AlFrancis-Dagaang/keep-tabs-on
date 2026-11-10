import type { Account } from "@/db/schema";

// shortcut: PHP for everyone, until T-09 adds the currency setting.
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** "1,234.56" → 123456 centavos. Null for anything else, including negatives: accounts hold money you have. */
export function parseMoney(input: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim().replaceAll(",", ""));
  if (!match) return null;
  const centavos = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

export function formatMoney(centavos: number): string {
  return peso.format(centavos / 100);
}

/** For a form field: 123456 → "1234.56". */
export function toInput(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

// T-03 adds income, expenses and transfers here.
export function balanceOf(account: Pick<Account, "startingBalance">): number {
  return account.startingBalance;
}

/** The starting balance that makes balanceOf(account) equal target. */
export function startingForBalance(account: Pick<Account, "startingBalance">, target: number): number {
  return account.startingBalance + (target - balanceOf(account));
}
