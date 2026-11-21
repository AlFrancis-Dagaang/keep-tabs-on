"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePhone } from "@/lib/use-phone";

// Below 768px: full screen, a ← back button in the header, and the form's footer (Save) pinned to the bottom edge.
const phone = [
  "max-md:inset-0 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:sm:max-w-none",
  "max-md:translate-x-0 max-md:translate-y-0 max-md:content-start max-md:rounded-none max-md:border-0 max-md:p-4",
  "max-md:[&>[data-slot=dialog-close]]:hidden",
  "max-md:[&_[data-slot=dialog-footer]]:sticky max-md:[&_[data-slot=dialog-footer]]:bottom-0 max-md:[&_[data-slot=dialog-footer]]:-mx-4",
  "max-md:[&_[data-slot=dialog-footer]]:border-t max-md:[&_[data-slot=dialog-footer]]:bg-background max-md:[&_[data-slot=dialog-footer]]:px-4",
  "max-md:[&_[data-slot=dialog-footer]]:pt-3 max-md:[&_[data-slot=dialog-footer]]:pb-[max(1rem,env(safe-area-inset-bottom))]",
  "max-md:[&_[data-slot=dialog-footer]_button]:h-12 max-md:[&_[data-slot=dialog-footer]_button]:w-full",
].join(" ");

/** The content of a form dialog: the usual centered dialog from 768px up, a full-screen page below it. */
export function FormSheetContent({ title, description, children }: { title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <DialogContent className={phone}>
      <DialogHeader className="max-md:grid max-md:grid-cols-[auto_1fr] max-md:items-center max-md:gap-x-2">
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="size-11 rounded-full max-md:-ml-2 md:hidden" aria-label="Back"><ChevronLeft className="size-6" /></Button>
        </DialogClose>
        <DialogTitle className="max-md:font-serif max-md:text-lg max-md:font-medium">{title}</DialogTitle>
        <DialogDescription className="max-md:col-span-2">{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}

/** On a phone, opening the sheet adds a history entry so the back gesture closes it instead of leaving the page. */
export function useBackToClose(open: boolean, setOpen: (open: boolean) => void) {
  const phone = usePhone();
  useEffect(() => {
    if (!open || !phone) return;
    // Keep Next's own history state so its popstate handler still recognises the entry.
    history.pushState({ ...history.state, sheet: true }, "");
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    return () => {
      window.removeEventListener("popstate", close);
      if (history.state?.sheet) history.back(); // closed some other way: drop the entry we added
    };
  }, [open, phone, setOpen]);
}
