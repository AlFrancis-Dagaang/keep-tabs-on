import { formatDate, formatTime } from "@/lib/money";

/** An entry's date in words, a "Today" tag when it is today, and (when given) the time it was logged as a muted second line. */
export function EntryDate({ date, today, loggedAt }: { date: string; today: string; loggedAt?: Date }) {
  return (
    <>
      {formatDate(date)}
      {date === today && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-foreground">Today</span>}
      {loggedAt && <span title={`Logged at ${formatTime(loggedAt)}`} className="block text-xs text-muted-foreground">{formatTime(loggedAt)}</span>}
    </>
  );
}
