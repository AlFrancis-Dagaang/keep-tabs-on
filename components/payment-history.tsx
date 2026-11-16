import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/money";

type Payment = { id: string; date: string; account: string; amount: number; note: string | null };

/** The payment history of a bill or an installment: newest first, as the caller sorted it. */
export function PaymentHistory({ rows, money }: { rows: Payment[]; money: (centavos: number) => string }) {
  return (
    <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Date</TableHead>
            <TableHead>Paid from</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="pr-4 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-4 tabular-nums">{formatDate(row.date)}</TableCell>
              <TableCell data-label="Paid from">{row.account}</TableCell>
              <TableCell data-label={row.note ? "Note" : undefined} className="text-muted-foreground">{row.note}</TableCell>
              <TableCell data-card="end" className="pr-4 text-right tabular-nums">{money(row.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
