"use client";

import { ChartNoAxesColumn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

// A phone shortcut stacked above the floating Add entry button. Same Suspense dance as FloatingAdd.
export function FloatingInsights() {
  return (
    <Suspense>
      <OffInsights />
    </Suspense>
  );
}

function OffInsights() {
  const pathname = usePathname();
  if (pathname === "/insights" || pathname?.startsWith("/insights/")) return null;
  return (
    <Link
      href="/insights"
      aria-label="Insights"
      className="fixed right-[18px] bottom-[calc(9.25rem+env(safe-area-inset-bottom))] z-20 grid size-[52px] place-items-center rounded-full bg-foreground text-background shadow-xl ring-4 ring-background md:hidden"
    >
      <ChartNoAxesColumn className="size-6" strokeWidth={2.5} />
    </Link>
  );
}
