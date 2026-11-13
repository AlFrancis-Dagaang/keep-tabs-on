"use client";

import { useActionState, useEffect, useState } from "react";
import { announceCompleted, PixelBar, useCompletedFlash } from "@/components/pixel-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Bill } from "@/db/schema";
import { formatMoney, progressBlocks, repeatLabels, toInput } from "@/lib/money";
import { deleteBill, type FormState, payBill, saveBill } from "./actions";

type Accounts = { id: string; name: string; balance: number }[];
type EditableBill = Pick<Bill, "id" | "name" | "amount" | "nextDueDate" | "repeat">;

export function BillProgress({ id, name, paid, amount }: { id: string; name: string; paid: number; amount: number }) {
  const flashing = useCompletedFlash(id);
  // While flashing, show the cycle that just closed; after that, the new cycle's bar.
  return flashing
    ? <PixelBar blocks={12} flash label={`${name}: paid in full`} />
    : <PixelBar key="cycle" blocks={progressBlocks(paid, amount)} label={`${name}: ${formatMoney(paid)} of ${formatMoney(amount)} paid this cycle`} />;
}

export function BillForm({ today, bill }: { today: string; bill?: EditableBill }) {
  const [open, setOpen] = useState(false);
  const title = bill ? "Edit bill" : "Add bill";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {bill ? <Button variant="ghost" size="sm">Edit</Button> : <Button size="sm">Add bill</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>A bill that repeats. You can change the due date anytime.</DialogDescription>
        </DialogHeader>
        <BillFields today={today} bill={bill} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function BillFields({ today, bill, onSaved }: { today: string; bill?: EditableBill; onSaved: () => void }) {
  const [state, action, pending] = useActionState(saveBill, {});
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  const values = state.values;
  return (
    // Remounts after a failed save, so the select shows the refilled value once React resets the form.
    <form key={JSON.stringify(values ?? {})} action={action} className="grid gap-4">
      <input type="hidden" name="id" value={bill?.id ?? ""} />
      <Field label="Name" name="name" state={state}>
        <Input id="name" name="name" placeholder="Internet" defaultValue={values?.name ?? bill?.name} {...invalid(state, "name")} />
      </Field>
      <Field label="Amount (₱)" name="amount" state={state}>
        <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" className="tabular-nums"
          defaultValue={values?.amount ?? (bill && toInput(bill.amount))} {...invalid(state, "amount")} />
      </Field>
      <Field label="Next due date" name="nextDueDate" state={state}>
        <Input id="nextDueDate" name="nextDueDate" type="date" defaultValue={values?.nextDueDate ?? bill?.nextDueDate ?? today} {...invalid(state, "nextDueDate")} />
      </Field>
      <Field label="Repeats" name="repeat" state={state}>
        <Select name="repeat" defaultValue={values?.repeat || bill?.repeat || "monthly"}>
          <SelectTrigger id="repeat" className="w-full" {...invalid(state, "repeat")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(repeatLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>{bill ? "Save bill" : "Add bill"}</Button>
      </DialogFooter>
    </form>
  );
}

export function PayBill(props: { bill: { id: string; name: string; left: number }; accounts: Accounts; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">Record payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>{props.bill.name}: {formatMoney(props.bill.left)} left this cycle. Partial payments are fine.</DialogDescription>
        </DialogHeader>
        <PayFields {...props} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PayFields({ bill, accounts, today, onSaved }: { bill: { id: string; left: number }; accounts: Accounts; today: string; onSaved: () => void }) {
  const [state, action, pending] = useActionState(payBill, {});
  useEffect(() => {
    if (!state.ok) return;
    if (state.completed) announceCompleted(bill.id);
    onSaved();
  }, [state, bill.id, onSaved]);

  const values = state.values;
  return (
    <form key={JSON.stringify(values ?? {})} action={action} className="grid gap-4">
      <input type="hidden" name="billId" value={bill.id} />
      <Field label="From account" name="accountId" state={state}>
        <Select name="accountId" defaultValue={values?.accountId || undefined}>
          <SelectTrigger id="accountId" className="w-full" {...invalid(state, "accountId")}>
            <SelectValue placeholder="Pick an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} <span className="text-muted-foreground tabular-nums">{formatMoney(account.balance)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Amount (₱)" name="amount" state={state}>
        <Input id="amount" name="amount" inputMode="decimal" className="tabular-nums" defaultValue={values?.amount ?? toInput(bill.left)} {...invalid(state, "amount")} />
      </Field>
      <Field label="Date" name="date" state={state}>
        <Input id="date" name="date" type="date" defaultValue={values?.date ?? today} {...invalid(state, "date")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>Record payment</Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteBill({ id, name }: { id: string; name: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>Its payments stay in Activity as expenses. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <form action={deleteBill}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive">Delete bill</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type FieldName = keyof NonNullable<FormState["errors"]>;

function invalid(state: FormState, name: FieldName) {
  return { "aria-invalid": !!state.errors?.[name], "aria-describedby": state.errors?.[name] ? `${name}-error` : undefined };
}

function Field({ label, name, state, children }: { label: string; name: FieldName; state: FormState; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {state.errors?.[name] && <p id={`${name}-error`} className="text-sm text-destructive">{state.errors[name]}</p>}
    </div>
  );
}
