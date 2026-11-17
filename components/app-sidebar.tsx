"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ArrowLeftRight, CalendarClock, CalendarRange, HandCoins, Landmark, LayoutDashboard, PiggyBank, Settings, Target, Vault } from "lucide-react";
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
  { href: "/set-aside", label: "Set aside", icon: Vault },
  { href: "/settings", label: "Settings", icon: Settings },
];

// The left sidebar, md and up; below that, MobileNav shows the same links in a drawer.
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
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<Links pathname={null} onNavigate={onNavigate} />}>
      <CurrentLinks onNavigate={onNavigate} />
    </Suspense>
  );
}

function CurrentLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <Links pathname={usePathname()} onNavigate={onNavigate} />;
}

function Links({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return pages.map(({ href, label, icon: Icon }) => {
    const current = pathname === href || !!pathname?.startsWith(`${href}/`); // keeps Debts lit on /debts/[id]
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm max-md:min-h-11 whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground",
          current && "bg-accent font-medium text-foreground",
        )}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    );
  });
}
