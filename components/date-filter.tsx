import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/month-picker";

/** A month picker, and a GET form for single days and ranges so the range lives in the URL (a single day is From = To). `keep` carries other params (the type filter) through; `min` is the earliest entry's date. */
export function DateFilter({ path, today, min, from, to, keep = {} }: { path: string; today: string; min: string; from?: string; to?: string; keep?: Record<string, string> }) {
  return (
    <div className="mb-4">
      <MonthPicker path={path} today={today} min={min} from={from} to={to} keep={keep} />
      <details className="mt-2" open={!!(from || to)}>
        <summary className="cursor-pointer text-sm text-muted-foreground">Custom range</summary>
        <form method="get" action={path} className="mt-2 flex flex-wrap items-end gap-2">
          {Object.entries(keep).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <label className="grid gap-1 text-sm text-muted-foreground">From<Input type="date" name="from" defaultValue={from} className="w-auto" /></label>
          <label className="grid gap-1 text-sm text-muted-foreground">To<Input type="date" name="to" defaultValue={to} className="w-auto" /></label>
          <Button type="submit" variant="outline">Apply</Button>
        </form>
      </details>
    </div>
  );
}
