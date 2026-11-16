"use client";

import { MoreHorizontal } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Below md a card's Edit and Remove sit behind a "⋯" in its top-right corner, so they take two taps.
// RowActions is the desktop buttons in the actions cell: they stay mounted (hidden on phones) so their
// dialogs don't unmount when the menu closes. RowMenu goes in the first cell; a menu item clicks the
// matching button in the same row.

export function RowActions({ items }: { items: { label: string; node: React.ReactNode }[] }) {
  return items.filter((item) => item.node).map((item) => (
    <span key={item.label} data-row-action={item.label} className="max-md:hidden">{item.node}</span>
  ));
}

export function RowMenu({ name, labels }: { name: string; labels: string[] }) {
  const trigger = useRef<HTMLButtonElement>(null);
  // Deferred a tick so the menu has closed and given focus back before the dialog opens.
  const open = (label: string) => setTimeout(() => trigger.current?.closest("tr")?.querySelector<HTMLButtonElement>(`[data-row-action="${label}"] button`)?.click(), 0);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button ref={trigger} data-row-menu variant="ghost" size="icon" className="absolute top-1 right-1 z-10 size-11 md:hidden" aria-label={`More actions for ${name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {labels.map((label) => <DropdownMenuItem key={label} onSelect={() => open(label)}>{label}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
