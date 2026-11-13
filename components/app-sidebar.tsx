"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ThemeToggle } from "@/components/theme-toggle";

const pages = [
  { href: "/", label: "Overview" },
  { href: "/accounts", label: "Accounts" },
  { href: "/activity", label: "Activity" },
  { href: "/bills", label: "Recurring bills" },
  { href: "/goals", label: "Goals" },
  { href: "/debts", label: "Debts" },
  { href: "/budget", label: "Budget" },
  { href: "/settings", label: "Settings" },
];

// A left sidebar from md up; below that, a top bar that scrolls sideways on its own.
export function AppSidebar() {
  return (
    <aside className="flex items-center gap-2 border-b bg-surface px-2 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:flex-col md:items-stretch md:border-r md:border-b-0 md:px-3 md:py-6">
      <span className="hidden px-3 pb-4 font-serif text-xl md:block">Kinsenas</span>
      <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-2 md:flex-col md:overflow-visible md:py-0">
        {/* usePathname suspends on routes with unknown params (/debts/[id]); the fallback is the same links, unlit */}
        <Suspense fallback={<Links pathname={null} />}>
          <CurrentLinks />
        </Suspense>
      </nav>
      <ThemeToggle />
    </aside>
  );
}

function CurrentLinks() {
  return <Links pathname={usePathname()} />;
}

function Links({ pathname }: { pathname: string | null }) {
  return pages.map(({ href, label }) => {
    const current = pathname === href || !!pathname?.startsWith(`${href}/`); // keeps Debts lit on /debts/[id]
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn(
          "shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground",
          current && "bg-accent font-medium text-foreground",
        )}
      >
        {label}
      </Link>
    );
  });
}
