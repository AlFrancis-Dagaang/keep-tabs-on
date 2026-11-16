"use client";

import { CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, monthRange } from "@/lib/money";

const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const rowLink = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent";

/** A month grid in a popover. Each month is a link to the same page with that month's from/to, so the range stays in the URL. min is the earliest entry's date; today is on the Manila calendar. */
export function MonthPicker({ path, today, min, from, to, keep = {} }: { path: string; today: string; min: string; from?: string; to?: string; keep?: Record<string, string> }) {
  const thisYear = Number(today.slice(0, 4));
  const minYear = Number(min.slice(0, 4));
  const fromMonth = from && monthRange(`${from.slice(0, 8)}01`);
  const selectedMonth = fromMonth && fromMonth.from === from && fromMonth.to === to ? from!.slice(0, 7) : undefined;
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(!!(from || to) && !selectedMonth);
  const [year, setYear] = useState(Number((selectedMonth ?? today).slice(0, 4)));
  const href = (range: { from?: string; to?: string } = {}) => {
    const query = new URLSearchParams({ ...keep, ...(range.from && { from: range.from }), ...(range.to && { to: range.to }) }).toString();
    return query ? `${path}?${query}` : path;
  };
  const label = selectedMonth
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${selectedMonth}-01T00:00:00Z`))
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
        <Link href={href(monthRange(`${today.slice(0, 8)}01`))} onClick={() => setOpen(false)} className={rowLink}><RotateCcw className="size-4" />This month</Link>
        <Link href={href({ from: `${today.slice(0, 8)}01`, to: today })} onClick={() => setOpen(false)} className={rowLink}><CalendarDays className="size-4" />Month to date</Link>
        <Link href={href()} onClick={() => setOpen(false)} className={rowLink}>All dates</Link>
        <button type="button" onClick={() => setCustom(!custom)} aria-expanded={custom} className={cn(rowLink, "w-full")}><CalendarRange className="size-4" />Custom range…</button>
        {custom && (
          <form method="get" action={path} className="mt-1 grid gap-2 px-2 pb-1">
            {Object.entries(keep).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <label className="grid gap-1 text-sm text-muted-foreground">From<Input type="date" name="from" defaultValue={from} /></label>
            <label className="grid gap-1 text-sm text-muted-foreground">To<Input type="date" name="to" defaultValue={to} /></label>
            <Button type="submit" variant="outline">Apply</Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
