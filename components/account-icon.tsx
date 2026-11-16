import { Banknote, Wallet } from "lucide-react";
import { cashKey, logos, parseIcon, tileColors, type TileColor } from "@/lib/account-icons";

const box = "inline-grid size-[22px] shrink-0 place-items-center rounded-md text-xs font-semibold text-white";

/** The icon before an account's name: a bank logo, a colour tile with the name's first letter, a banknote for cash, or a wallet when none is picked. Decorative; the name sits next to it. */
export function AccountIcon({ icon, name }: { icon?: string | null; name: string }) {
  const value = parseIcon(icon);
  const logo = logos.find((item) => item.key === value);
  // A plain img: the logos are small static files in public/banks/, so next/image adds nothing.
  // eslint-disable-next-line @next/next/no-img-element
  if (logo) return <img src={`/banks/${logo.file}`} alt="" className="size-[22px] shrink-0 rounded-md object-contain" />;
  if (value === cashKey) return <span className={box} style={{ background: tileColors.grey }} aria-hidden><Banknote className="size-3.5" /></span>;
  if (value?.startsWith("tile:")) {
    return <span className={box} style={{ background: tileColors[value.slice(5) as TileColor] }} aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>;
  }
  return <span className="inline-grid size-[22px] shrink-0 place-items-center text-muted-foreground" aria-hidden><Wallet className="size-4" /></span>;
}
