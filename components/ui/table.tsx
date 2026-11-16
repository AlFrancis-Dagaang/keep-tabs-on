"use client"

import * as React from "react"
import { cn } from "cn"

// Below md each body row is a card: the first cell is the title, a cell with data-label shows
// "label  value", data-card="end" sits top right, data-card="actions" is the bottom row. `list`
// is the compact variant (Overview): rows stay lines, no labels. Selectors live here so the
// pages only add data-label / data-card to their cells.
const cards = [
  "max-md:block max-md:[&_tbody]:block max-md:[&_thead]:sr-only",
  "max-md:[&_tbody_tr]:mb-2.5 max-md:[&_tbody_tr]:grid max-md:[&_tbody_tr]:grid-cols-[1fr_auto] max-md:[&_tbody_tr]:gap-x-3 max-md:[&_tbody_tr]:gap-y-1.5 max-md:[&_tbody_tr]:rounded-xl max-md:[&_tbody_tr]:border max-md:[&_tbody_tr]:bg-surface max-md:[&_tbody_tr]:p-3",
  // the "⋯" button sits in the card's top-right corner; the title and the amount leave room for it
  "max-md:[&_tbody_tr]:relative max-md:[&_tbody_tr:has([data-row-menu])_td:first-child]:pr-12 max-md:[&_tbody_tr:has([data-row-menu])_td[data-card=end]]:pr-12",
  "max-md:[&_tbody_td]:col-span-full max-md:[&_tbody_td]:p-0 max-md:[&_tbody_td]:whitespace-normal max-md:[&_tbody_td:empty]:hidden",
  "max-md:[&_tbody_td:first-child]:col-span-1 max-md:[&_tbody_td:first-child]:col-start-1 max-md:[&_tbody_td:first-child]:block",
  "max-md:[&_td[data-label]]:flex max-md:[&_td[data-label]]:items-baseline max-md:[&_td[data-label]]:justify-between max-md:[&_td[data-label]]:gap-3 max-md:[&_td[data-label]]:before:shrink-0 max-md:[&_td[data-label]]:before:text-muted-foreground max-md:[&_td[data-label]]:before:content-[attr(data-label)]",
  "max-md:[&_td[data-card=end]]:col-span-1 max-md:[&_td[data-card=end]]:col-start-2 max-md:[&_td[data-card=end]]:row-start-1 max-md:[&_td[data-card=end]]:justify-end max-md:[&_td[data-card=end]]:text-base max-md:[&_td[data-card=end]]:font-semibold",
  "max-md:[&_td[data-card=actions]]:mt-1 max-md:[&_td[data-card=actions]]:flex max-md:[&_td[data-card=actions]]:flex-wrap max-md:[&_td[data-card=actions]]:justify-start max-md:[&_td[data-card=actions]]:gap-2 max-md:[&_td[data-card=actions]]:border-t max-md:[&_td[data-card=actions]]:pt-3 max-md:[&_td[data-card=actions]_button]:min-h-11",
  // the Accounts net worth footer: one line, its empty actions cell dropped
  "max-md:[&_tfoot]:block max-md:[&_tfoot_tr]:flex max-md:[&_tfoot_tr]:justify-between max-md:[&_tfoot_tr]:px-3 max-md:[&_tfoot_tr]:py-2 max-md:[&_tfoot_td]:p-0 max-md:[&_tfoot_td:empty]:hidden",
].join(" ")

const list =
  "max-md:[&_tr]:flex max-md:[&_tr]:flex-wrap max-md:[&_tr]:items-baseline max-md:[&_tr]:justify-between max-md:[&_tr]:gap-x-3 max-md:[&_tr]:px-3 max-md:[&_tr]:py-2 max-md:[&_td]:min-w-0 max-md:[&_td]:p-0 max-md:[&_td]:break-words max-md:[&_td]:whitespace-normal"

function Table({ className, list: compact, ...props }: React.ComponentProps<"table"> & { list?: boolean }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        role="table"
        className={cn("w-full caption-bottom text-sm", compact ? list : cards, className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      role="rowgroup"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      role="rowgroup"
      className={cn("md:[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      role="rowgroup"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      role="row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      role="columnheader"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, children, ...props }: React.ComponentProps<"td"> & { "data-label"?: string }) {
  return (
    <td
      data-slot="table-cell"
      role="cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    >
      {/* one flex item on phones, so a value made of text, tags and bars stays together; invisible from md up */}
      {props["data-label"] ? <span className="md:contents max-md:min-w-0 max-md:text-right">{children}</span> : children}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
