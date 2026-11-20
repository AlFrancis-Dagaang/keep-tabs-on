"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, monthRange } from "@/lib/money";

const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const rowLink = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent";

/** A month grid in a popover. Each month is a link to the same page with that month's from/to, so the range stays in the URL. min is the earliest entry's date; today is on the Manila calendar. defaultsToToday is for a page that opens on today: it gets a Today row, and its All dates link says all=1. */
export function MonthPicker({ path, today, min, from, to, keep = {}, defaultsToToday }: { path: string; today: string; min: string; from?: string; to?: string; keep?: Record<string, string>; defaultsToToday?: boolean }) {
  const thisYear = Number(today.slice(0, 4));
  const minYear = Number(min.slice(0, 4));
  const fromMonth = from && monthRange(`${from.slice(0, 8)}01`);
  const selectedMonth = fromMonth && fromMonth.from === from && fromMonth.to === to ? from!.slice(0, 7) : undefined;
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number((selectedMonth ?? today).slice(0, 4)));
  const href = (range: { from?: string; to?: string; all?: string } = {}) => {
    const query = new URLSearchParams({ ...keep, ...(range.from && { from: range.from }), ...(range.to && { to: range.to }), ...(range.all && { all: range.all }) }).toString();
    return query ? `${path}?${query}` : path;
  };
  const label = selectedMonth
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${selectedMonth}-01T00:00:00Z`))
    : defaultsToToday && from === today && to === today ? "Today"
    : from || to ? `${from ? formatDate(from) : "Start"} – ${to ? formatDate(to) : "Today"}` : "All dates";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between max-md:h-11"><span className="flex items-center gap-2"><CalendarDays />{label}</span><ChevronDown /></Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="mb-2 flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" aria-label="Previous year" disabled={year <= minYear} onClick={() => setYear(year - 1)}><ChevronLeft /></Button>
          <span className="font-medium tabular-nums">{year}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Next year" disabled={year >= thisYear} onClick={() => setYear(year + 1)}><ChevronRight /></Button>
        </div>
        <div className="mb-2 grid grid-cols-4 gap-1">
          {names.map((name, index) => {
            const value = `${year}-${String(index + 1).padStart(2, "0")}`;
            const disabled = value < min.slice(0, 7) || value > today.slice(0, 7);
            const className = cn(
              "rounded-md px-2 py-2 text-center text-sm",
              value === today.slice(0, 7) && "font-semibold underline underline-offset-4",
              value === selectedMonth && "bg-primary text-primary-foreground",
              disabled ? "text-muted-foreground/40" : value !== selectedMonth && "hover:bg-accent",
            );
            return disabled
              ? <span key={value} aria-disabled="true" className={className}>{name}</span>
              : <Link key={value} href={href(monthRange(`${value}-01`))} aria-current={value === selectedMonth ? "date" : undefined} onClick={() => setOpen(false)} className={className}>{name}</Link>;
          })}
        </div>
        {defaultsToToday && <Link href={href()} onClick={() => setOpen(false)} className={rowLink}><CalendarDays className="size-4" />Today</Link>}
        <Link href={href(monthRange(`${today.slice(0, 8)}01`))} onClick={() => setOpen(false)} className={rowLink}><RotateCcw className="size-4" />This month</Link>
        <Link href={href(defaultsToToday ? { all: "1" } : {})} onClick={() => setOpen(false)} className={rowLink}>All dates</Link>
      </PopoverContent>
    </Popover>
  );
}
