"use client";

import { useActionState, useEffect, useState } from "react";
import { useMoney } from "@/components/currency-provider";
import { announceCompleted, PixelBar, useCompletedFlash } from "@/components/pixel-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Debt } from "@/db/schema";
import { progressBlocks, toInput } from "@/lib/money";
import { deleteDebt, type FormState, payDebt, saveDebt } from "./actions";

type Accounts = { id: string; name: string; balance: number }[];
type EditableDebt = Pick<Debt, "id" | "name" | "total" | "deadline" | "paidBefore">;

export function DebtProgress({ id, name, paid, total }: { id: string; name: string; paid: number; total: number }) {
  const { money } = useMoney();
  const flashing = useCompletedFlash(id);
  return <PixelBar blocks={progressBlocks(paid, total)} flash={flashing} label={`${name}: ${money(paid)} of ${money(total)} paid`} />;
}

export function DebtForm({ today, debt }: { today: string; debt?: EditableDebt }) {
  const [open, setOpen] = useState(false);
  const title = debt ? "Edit debt" : "Add debt";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {debt ? <Button variant="ghost" size="sm">Edit</Button> : <Button size="sm">Add debt</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Money you owe: a credit card, a loan, or a friend.</DialogDescription>
        </DialogHeader>
        <DebtFields today={today} debt={debt} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function DebtFields({ today, debt, onSaved }: { today: string; debt?: EditableDebt; onSaved: () => void }) {
  const { symbol } = useMoney();
  const [state, action, pending] = useActionState(saveDebt, {});
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  const values = state.values;
  return (
    <form key={JSON.stringify(values ?? {})} action={action} className="grid gap-4">
      <input type="hidden" name="id" value={debt?.id ?? ""} />
      <Field label="Name" name="name" state={state}>
        <Input id="name" name="name" placeholder="Credit card" defaultValue={values?.name ?? debt?.name} {...invalid(state, "name")} />
      </Field>
      <Field label={`Total owed (${symbol})`} name="total" state={state}>
        <Input id="total" name="total" inputMode="decimal" placeholder="0.00" className="tabular-nums"
          defaultValue={values?.total ?? (debt && toInput(debt.total))} {...invalid(state, "total")} />
      </Field>
      <Field label="Deadline" name="deadline" state={state}>
        <Input id="deadline" name="deadline" type="date" defaultValue={values?.deadline ?? debt?.deadline ?? today} {...invalid(state, "deadline")} />
      </Field>
      <Field label={`Paid before tracking (${symbol})`} name="paidBefore" state={state}>
        <Input id="paidBefore" name="paidBefore" inputMode="decimal" placeholder="0.00" className="tabular-nums"
          defaultValue={values?.paidBefore ?? (debt?.paidBefore ? toInput(debt.paidBefore) : undefined)} {...invalid(state, "paidBefore")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>{debt ? "Save debt" : "Add debt"}</Button>
      </DialogFooter>
    </form>
  );
}

export function PayDebt(props: { debt: { id: string; name: string; left: number }; accounts: Accounts; today: string }) {
  const { money } = useMoney();
  const [open, setOpen] = useState(false);
  // Disabled rather than hidden once paid off: hiding it would unmount the form before it announces the flash.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={props.debt.left === 0}>Record payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>{props.debt.name}: {money(props.debt.left)} left to pay. Partial payments are fine.</DialogDescription>
        </DialogHeader>
        <PayFields {...props} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PayFields({ debt, accounts, today, onSaved }: { debt: { id: string; left: number }; accounts: Accounts; today: string; onSaved: () => void }) {
  const { money, symbol } = useMoney();
  const [state, action, pending] = useActionState(payDebt, {});
  useEffect(() => {
    if (!state.ok) return;
    if (state.completed) announceCompleted(debt.id);
    onSaved();
  }, [state, debt.id, onSaved]);

  const values = state.values;
  return (
    <form key={JSON.stringify(values ?? {})} action={action} className="grid gap-4">
      <input type="hidden" name="debtId" value={debt.id} />
      <Field label="From account" name="accountId" state={state}>
        <Select name="accountId" defaultValue={values?.accountId || undefined}>
          <SelectTrigger id="accountId" className="w-full" {...invalid(state, "accountId")}>
            <SelectValue placeholder="Pick an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} <span className="text-muted-foreground tabular-nums">{money(account.balance)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={`Amount (${symbol})`} name="amount" state={state}>
        <Input id="amount" name="amount" inputMode="decimal" className="tabular-nums" defaultValue={values?.amount ?? toInput(debt.left)} {...invalid(state, "amount")} />
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

export function DeleteDebt({ id, name }: { id: string; name: string }) {
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
        <form action={deleteDebt}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive">Delete debt</Button>
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
