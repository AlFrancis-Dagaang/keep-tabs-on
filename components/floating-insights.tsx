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
      className="fixed right-5 bottom-[calc(9.25rem+env(safe-area-inset-bottom))] z-20 grid size-12 place-items-center rounded-full border bg-surface shadow-lg md:hidden"
    >
      <ChartNoAxesColumn className="size-5" />
    </Link>
  );
}
