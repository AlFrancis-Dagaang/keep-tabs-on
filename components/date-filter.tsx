import { MonthPicker } from "@/components/month-picker";

/** The month picker with its custom range, above a list. `keep` carries other params through; `min` is the earliest entry's date. */
export function DateFilter(props: React.ComponentProps<typeof MonthPicker>) {
  return <div className="mb-4"><MonthPicker {...props} /></div>;
}
