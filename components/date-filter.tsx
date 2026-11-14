import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { monthRange } from "@/lib/money";

const pill = "rounded-full border px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground";

/** A GET form, so the range lives in the URL. A single day is From = To. `keep` carries other params (the type filter) through. */
export function DateFilter({ path, today, from, to, keep = {} }: { path: string; today: string; from?: string; to?: string; keep?: Record<string, string> }) {
  const thisMonth = monthRange(`${today.slice(0, 8)}01`);
  const [year, month] = today.split("-").map(Number);
  const lastMonth = monthRange(new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10));
  const href = (range: { from?: string; to?: string } = {}) => {
    const query = new URLSearchParams({ ...keep, ...(range.from && { from: range.from }), ...(range.to && { to: range.to }) }).toString();
    return query ? `${path}?${query}` : path;
  };
  return (
    <form method="get" action={path} className="mb-4 flex flex-wrap items-end gap-2">
      {Object.entries(keep).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <label className="grid gap-1 text-sm text-muted-foreground">From<Input type="date" name="from" defaultValue={from} className="w-auto" /></label>
      <label className="grid gap-1 text-sm text-muted-foreground">To<Input type="date" name="to" defaultValue={to} className="w-auto" /></label>
      <Button type="submit" variant="outline">Apply</Button>
      <Link href={href(thisMonth)} className={pill}>This month</Link>
      <Link href={href(lastMonth)} className={pill}>Last month</Link>
      {(from || to) && <Link href={href()} className={pill}>Clear</Link>}
    </form>
  );
}
