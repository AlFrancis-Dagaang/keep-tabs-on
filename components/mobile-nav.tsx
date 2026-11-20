"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { cn } from "cn";
import { pages } from "@/components/app-sidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const tabHrefs = ["/", "/accounts", "/activity", "/bills"];
const tabs = pages.filter((page) => tabHrefs.includes(page.href));
const more = pages.filter((page) => !tabHrefs.includes(page.href));
const isCurrent = (pathname: string | null, href: string) => pathname === href || !!pathname?.startsWith(`${href}/`); // keeps Bills lit on /bills/[id]

const tab = "flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground";

// A bottom tab bar below md; the sidebar takes over from md up. More opens a sheet with the other pages, and choosing one closes it.
// usePathname suspends on routes with unknown params; the fallback is the same bar, unlit.
export function MobileNav() {
  return (
    <Suspense fallback={<Bar pathname={null} />}>
      <CurrentBar />
    </Suspense>
  );
}

function CurrentBar() {
  return <Bar pathname={usePathname()} />;
}

function Bar({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const moreCurrent = more.some((page) => isCurrent(pathname, page.href));
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {tabs.map(({ href, label, short, icon: Icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <Link key={href} href={href} aria-current={current ? "page" : undefined} className={cn(tab, current && "font-medium text-foreground")}>
              <span className={cn("flex rounded-full px-4 py-1", current && "bg-accent")}><Icon className="size-5" /></span>
              {short ?? label}
            </Link>
          );
        })}
        <SheetTrigger asChild>
          <button type="button" className={cn(tab, moreCurrent && "font-medium text-foreground")}>
            <span className={cn("flex rounded-full px-4 py-1", moreCurrent && "bg-accent")}><Ellipsis className="size-5" /></span>
            More
          </button>
        </SheetTrigger>
      </nav>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-2xl bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <SheetTitle className="sr-only">More pages</SheetTitle>
        <div className="grid grid-cols-3 gap-2">
          {more.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(pathname, href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn("flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl bg-accent text-sm", isCurrent(pathname, href) && "font-medium ring-2 ring-primary")}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
