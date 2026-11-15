"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLinks } from "@/components/app-sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// A top bar with a drawer below md; the sidebar takes over from md up. A link click closes the drawer.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <header className="sticky top-0 z-30 flex h-13 items-center gap-1 border-b bg-surface px-2 md:hidden">
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-lg" className="size-11" aria-label="Open menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <span className="font-serif text-lg">Keep tabs on</span>
      </header>
      <SheetContent side="left" showCloseButton={false} className="w-72 gap-0 bg-surface p-3">
        <SheetHeader className="flex-row items-center justify-between py-0 pr-0 pl-3">
          <SheetTitle className="font-serif text-xl font-medium">Keep tabs on</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-lg" className="size-11" aria-label="Close menu">
              <X />
            </Button>
          </SheetClose>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <NavLinks onNavigate={() => setOpen(false)} />
        </nav>
        <div className="flex flex-col gap-1 border-t pt-2">
          <SignOutButton />
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
