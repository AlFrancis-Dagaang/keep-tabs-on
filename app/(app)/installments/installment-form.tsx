"use client";

import { useActionState, useEffect, useState } from "react";
import { useMoney } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Installment } from "@/db/schema";
import { toInput } from "@/lib/money";
import { deleteInstallment, type FormState, payInstallment, saveInstallment } from "./actions";

type Accounts = { id: string; name: string; balance: number }[];
type EditableInstallment = Pick<Installment, "id" | "name" | "monthlyAmount" | "months" | "paidBefore" | "nextDueDate" | "accountId" | "note">;

export function InstallmentForm({ today, accounts, installment }: { today: string; accounts: Accounts; installment?: EditableInstallment }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {installment ? <Button variant="ghost" size="sm">Edit</Button> : <Button size="sm">Add installment</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{installment ? "Edit installment" : "Add installment"}</DialogTitle>
          <DialogDescription>A purchase paid in equal monthly payments. You can change the due date anytime.</DialogDescription>
        </DialogHeader>
        <Fields today={today} accounts={accounts} installment={installment} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function Fields({ today, accounts, installment, onSaved }: { today: string; accounts: Accounts; installment?: EditableInstallment; onSaved: () => void }) {
  const { money, symbol } = useMoney();
  const [state, action, pending] = useActionState(saveInstallment, {});
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  const values = state.values;
  return (
    // Remounts after a failed save, so the select shows the refilled value once React resets the form.
    <form key={JSON.stringify(values ?? {})} action={action} className="grid gap-4">
      <input type="hidden" name="id" value={installment?.id ?? ""} />
      <Field label="Name" name="name" state={state}>
        <Input id="name" name="name" placeholder="Phone" defaultValue={values?.name ?? installment?.name} {...invalid(state, "name")} />
      </Field>
      <Field label={`Monthly amount (${symbol})`} name="monthlyAmount" state={state}>
        <Input id="monthlyAmount" name="monthlyAmount" inputMode="decimal" placeholder="0.00" className="tabular-nums"
          defaultValue={values?.monthlyAmount ?? (installment && toInput(installment.monthlyAmount))} {...invalid(state, "monthlyAmount")} />
      </Field>
      <Field label="Months" name="months" state={state}>
        <Input id="months" name="months" inputMode="numeric" placeholder="12" className="tabular-nums"
          defaultValue={values?.months ?? installment?.months} {...invalid(state, "months")} />
        {installment && <p className="text-sm text-muted-foreground">Total {money(installment.monthlyAmount * installment.months)}</p>}
      </Field>
      <Field label="Months paid before tracking" name="paidBefore" state={state}>
        <Input id="paidBefore" name="paidBefore" inputMode="numeric" placeholder="0" className="tabular-nums"
          defaultValue={values?.paidBefore ?? (installment?.paidBefore ? installment.paidBefore : undefined)} {...invalid(state, "paidBefore")} />
      </Field>
      <Field label="Next due date" name="nextDueDate" state={state}>
        <Input id="nextDueDate" name="nextDueDate" type="date" defaultValue={values?.nextDueDate ?? installment?.nextDueDate ?? today} {...invalid(state, "nextDueDate")} />
      </Field>
      <Field label="Paid from" name="accountId" state={state}>
        <Select name="accountId" defaultValue={values?.accountId ?? installment?.accountId}>
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
      <Field label="Note (optional)" name="note" state={state}>
        <Input id="note" name="note" defaultValue={values?.note ?? installment?.note ?? undefined} {...invalid(state, "note")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>{installment ? "Save installment" : "Add installment"}</Button>
      </DialogFooter>
    </form>
  );
}

export function PayInstallment(props: { installment: { id: string; name: string; monthlyAmount: number; account: string }; today: string }) {
  const { money } = useMoney();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">Record payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>{props.installment.name}: {money(props.installment.monthlyAmount)} from {props.installment.account}.</DialogDescription>
        </DialogHeader>
        <PayFields {...props} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PayFields({ installment, today, onSaved }: { installment: { id: string }; today: string; onSaved: () => void }) {
  const [state, action, pending] = useActionState(payInstallment, {});
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form key={JSON.stringify(state.values ?? {})} action={action} className="grid gap-4">
      <input type="hidden" name="installmentId" value={installment.id} />
      <Field label="Date" name="date" state={state}>
        <Input id="date" name="date" type="date" defaultValue={state.values?.date ?? today} {...invalid(state, "date")} />
      </Field>
      {state.errors?.installmentId && <p role="alert" className="text-sm text-destructive">{state.errors.installmentId}</p>}
      <DialogFooter>
        <Button type="submit" disabled={pending}>Record payment</Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteInstallment({ id, name }: { id: string; name: string }) {
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
        <form action={deleteInstallment}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive">Delete installment</Button>
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
