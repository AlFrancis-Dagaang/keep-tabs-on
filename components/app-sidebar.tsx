"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ArrowLeftRight, CalendarClock, CalendarRange, HandCoins, Landmark, LayoutDashboard, PiggyBank, Settings, Target, Vault } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export const pages = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/activity", label: "Activity", icon: ArrowLeftRight },
  { href: "/bills", label: "Recurring bills", short: "Bills", icon: CalendarClock },
  { href: "/installments", label: "Installments", icon: CalendarRange },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/debts", label: "Debts", icon: HandCoins },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/set-aside", label: "Set aside", icon: Vault },
  { href: "/settings", label: "Settings", icon: Settings },
];

// The left sidebar, md and up; below that, MobileNav is a bottom tab bar.
export function AppSidebar() {
  return (
    <aside className="hidden border-r bg-surface px-3 py-6 md:sticky md:top-0 md:flex md:h-screen md:w-56 md:shrink-0 md:flex-col">
      <span className="px-3 pb-4 font-serif text-xl">Keep tabs on</span>
      <nav className="flex min-w-0 flex-1 flex-col gap-1">
        <NavLinks />
      </nav>
      <SignOutButton />
      <ThemeToggle />
    </aside>
  );
}

// usePathname suspends on routes with unknown params (/debts/[id]); the fallback is the same links, unlit
export function NavLinks() {
  return (
    <Suspense fallback={<Links pathname={null} />}>
      <CurrentLinks />
    </Suspense>
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
