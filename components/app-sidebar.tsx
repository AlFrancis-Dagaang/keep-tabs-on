"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ArrowLeftRight, CalendarClock, CalendarRange, HandCoins, Landmark, LayoutDashboard, PiggyBank, Settings, Target } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

const pages = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/activity", label: "Activity", icon: ArrowLeftRight },
  { href: "/bills", label: "Recurring bills", icon: CalendarClock },
  { href: "/installments", label: "Installments", icon: CalendarRange },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/debts", label: "Debts", icon: HandCoins },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/settings", label: "Settings", icon: Settings },
];

// A left sidebar from md up; below that, a top bar that scrolls sideways on its own.
export function AppSidebar() {
  return (
    <aside className="flex items-center gap-2 border-b bg-surface px-2 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:flex-col md:items-stretch md:border-r md:border-b-0 md:px-3 md:py-6">
      <span className="hidden px-3 pb-4 font-serif text-xl md:block">Keep tabs on</span>
      <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-2 md:flex-col md:overflow-visible md:py-0">
        {/* usePathname suspends on routes with unknown params (/debts/[id]); the fallback is the same links, unlit */}
        <Suspense fallback={<Links pathname={null} />}>
          <CurrentLinks />
        </Suspense>
      </nav>
      <SignOutButton />
      <ThemeToggle />
    </aside>
  );
}

function CurrentLinks() {
  return <Links pathname={usePathname()} />;
}

function Links({ pathname }: { pathname: string | null }) {
  return pages.map(({ href, label, icon: Icon }) => {
    const current = pathname === href || !!pathname?.startsWith(`${href}/`); // keeps Debts lit on /debts/[id]
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground",
          current && "bg-accent font-medium text-foreground",
        )}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    );
  });
}
