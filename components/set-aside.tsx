import { PixelBar } from "@/components/pixel-bar";
import { progressBlocks } from "@/lib/money";

/** The Set aside bar and figure, then the label of the Paid or Saved bar that follows it. Nothing when nothing is linked. The two are never added. */
export function SetAside({ name, amount, target, money, next = "Paid", nextTarget = false }: {
  name: string; amount: number; target: number; money: (centavos: number) => string; next?: "Paid" | "Saved"; nextTarget?: boolean;
}) {
  if (amount <= 0) return null;
  return (
    <div className="mb-2 grid grid-cols-1 gap-1">
      <div className="text-xs text-muted-foreground">Set aside</div>
      <PixelBar aside blocks={progressBlocks(amount, target)} label={`${name}: ${money(amount)} of ${nextTarget ? "next " : ""}${money(target)} set aside`} />
      <div className="text-sm text-muted-foreground tabular-nums">{money(amount)} of {nextTarget && "next "}{money(target)}</div>
      <div className="mt-1 text-xs text-muted-foreground">{next}</div>
    </div>
  );
}
