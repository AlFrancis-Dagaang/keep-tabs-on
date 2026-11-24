import type { ReactNode } from "react";
import { cn } from "cn";

/** The phone page header: a solid clay block with the page's one big number (docs/design.md). Hidden from 768px up, where PageHeader shows. */
export function HeroBlock({ top, label, value, chip, className }: { top: ReactNode; label: string; value: string; chip?: string; className?: string }) {
  return (
    <div className={cn("-mx-4 -mt-6 rounded-b-[28px] bg-primary px-5 pt-[34px] pb-6 text-primary-foreground md:hidden", className)}>
      <div className="mb-3.5 flex items-center justify-between font-medium">{top}</div>
      <div className="text-[13px] opacity-85">{label}</div>
      {/* 8 or more characters shrink so ₱123,456.78 fits at 390px */}
      <div className={cn("my-1 font-serif leading-[1.05] font-medium tabular-nums", value.length >= 8 ? "text-[36px]" : "text-[46px]")}>{value}</div>
      {chip && <span className="inline-block rounded-full bg-white/20 px-2.5 py-1 text-xs">{chip}</span>}
    </div>
  );
}
