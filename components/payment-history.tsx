import { DeleteEntry, EditPayment } from "@/app/(app)/activity/entry-form";
import { RowActions } from "@/components/row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/money";

// `locked` keeps the amount from changing; `consequence` is what removing the payment does, shown in its confirm.
type Payment = { id: string; date: string; account: string; accountId: string; amount: number; note: string | null; locked: boolean; consequence: string };

/** The payment history of a bill or an installment: newest first, as the caller sorted it. */
export function PaymentHistory({ rows, money, accounts }: {
  rows: Payment[]; money: (centavos: number) => string; accounts: { id: string; name: string; balance: number }[];
}) {
  return (
    <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Date</TableHead>
            <TableHead>Paid from</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-4 tabular-nums">
                {formatDate(row.date)}
              </TableCell>
              <TableCell data-label="Paid from">{row.account}</TableCell>
              <TableCell data-label={row.note ? "Note" : undefined} className="text-muted-foreground">{row.note}</TableCell>
              <TableCell data-card="end" className="text-right tabular-nums">{money(row.amount)}</TableCell>
              <TableCell data-card="actions" className="pr-4 text-right">
                <RowActions
                  items={[
                    { label: "Edit", node: <EditPayment payment={row} accounts={accounts} amountLocked={row.locked} /> },
                    { label: "Remove", node: <DeleteEntry id={row.id} what="payment" label={`${formatDate(row.date)} · ${row.account} · ${money(row.amount)}`} consequence={row.consequence} /> },
                  ]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
