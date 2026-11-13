import { eq } from "drizzle-orm";
import { cache } from "react";
import { settings } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { type Currency, formatMoney } from "@/lib/money";

/** The user's settings; no row yet means a new user. Cached so the layout and the page share one query per request. */
export const getSettings = cache(async () => {
  const userId = await getUserId();
  const [row] = await withUser(userId, (tx) => tx.select().from(settings).where(eq(settings.userId, userId)));
  return { currency: (row?.currency ?? "PHP") as Currency, setupDone: row?.setupDone ?? false };
});

/** formatMoney in the user's currency, for server components and actions. Client components use useMoney(). */
export async function getMoney() {
  const { currency } = await getSettings();
  return (centavos: number) => formatMoney(centavos, currency);
}
