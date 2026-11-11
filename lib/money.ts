import type { Account, Transaction } from "@/db/schema";

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

export type Entry = Pick<Transaction, "type" | "amount" | "accountId" | "toAccountId">;

/** starting + income − expenses + transfers in − transfers out. */
export function balanceOf(account: Pick<Account, "id" | "startingBalance">, entries: Entry[]): number {
  return entries.reduce((balance, { type, amount, accountId, toAccountId }) => {
    if (type === "transfer" && toAccountId === account.id) return balance + amount;
    if (accountId !== account.id) return balance;
    return type === "income" ? balance + amount : balance - amount;
  }, account.startingBalance);
}

/** The starting balance that makes balanceOf(account) equal target. Can go below zero: it's only an adjustment. */
export function startingForBalance(account: Pick<Account, "id" | "startingBalance">, entries: Entry[], target: number): number {
  return account.startingBalance + (target - balanceOf(account, entries));
}
