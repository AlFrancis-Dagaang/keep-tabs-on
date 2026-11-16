"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** A dropdown of links, so the choice stays in the URL. `items` are built by the page (it knows the other params to keep). */
export function TypeFilter({ items }: { items: { label: string; href: string; current: boolean }[] }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Filter by type" className="justify-between capitalize max-md:h-11">{items.find((item) => item.current)?.label}<ChevronDown /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((item) => (
          <DropdownMenuItem key={item.label} asChild className="capitalize">
            <Link href={item.href} aria-current={item.current ? "page" : undefined} className={item.current ? "font-medium" : undefined}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
