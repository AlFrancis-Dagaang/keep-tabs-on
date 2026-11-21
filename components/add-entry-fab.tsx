import { asc, eq } from "drizzle-orm";
import { FloatingAdd } from "@/components/floating-add";
import { categories } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { loadSetAsideItems } from "@/lib/set-aside";

/** The floating Add entry shortcut on phone pages. Loads what the Add entry sheet needs, as the Activity page does. */
export async function AddEntryFab() {
  const userId = await getUserId();
  const { balances, choices, setAsideItems } = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    choices: await tx.select({ id: categories.id, name: categories.name, kind: categories.kind })
      .from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name)),
    setAsideItems: await loadSetAsideItems(tx, userId),
  }));
  if (balances.accounts.length === 0) return null; // nothing to add an entry to yet
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  return <FloatingAdd accounts={balances.accounts} categories={choices} today={today} setAsideItems={setAsideItems} />;
}
