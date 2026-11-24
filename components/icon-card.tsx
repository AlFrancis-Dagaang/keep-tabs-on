import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";

/** The 42px tile at the left of an IconCard. */
export function Tile({ children, tone }: { children: ReactNode; tone?: "income" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-grid size-[42px] shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground",
        tone === "income" && "bg-[#0F7A47]/15 text-[#0F7A47] dark:text-[#4CC38A]",
        tone === "warning" && "bg-primary/15 text-primary",
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** A phone list row: icon tile, title and a muted line, amount at the right. The row is a link when `href` is given; `actions` sit under it. Phone only: callers hide it from 768px up. */
export function IconCard({ icon, title, sub, amount, amountSub, href, tone, actions, children }: {
  icon: ReactNode; title: string; sub?: ReactNode; amount?: string; amountSub?: string; href?: string; tone?: "income" | "warning"; actions?: ReactNode; children?: ReactNode;
}) {
  const body = (
    <>
      {icon}
      <span className="grid min-w-0 flex-1">
        <span className="truncate font-semibold">{title}</span>
        {sub && <span className="truncate text-sm text-muted-foreground">{sub}</span>}
        {children}
      </span>
      {amount && (
        <span className="grid shrink-0 text-right tabular-nums">
          <span className={cn("font-semibold", tone === "income" && "text-[#0F7A47] dark:text-[#4CC38A]")}>{amount}</span>
          {amountSub && <span className="text-xs text-muted-foreground">{amountSub}</span>}
        </span>
      )}
    </>
  );
  const row = "flex min-h-16 items-center gap-3 py-3";
  return (
    <div className="rounded-2xl border bg-surface px-3.5">
      {href ? <Link href={href} className={cn(row, "active:bg-accent")}>{body}</Link> : <div className={row}>{body}</div>}
      {actions && <div className="flex justify-end gap-1 border-t py-1 [&_button]:min-h-11">{actions}</div>}
    </div>
  );
}
