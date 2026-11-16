"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useMoney } from "@/components/currency-provider";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, Transaction } from "@/db/schema";
import { toInput } from "@/lib/money";
import { deleteEntry, editPayment, saveEntry, type FormState } from "./actions";

type Options = {
  accounts: { id: string; name: string; balance: number }[];
  categories: Pick<Category, "id" | "name" | "kind">[];
  today: string; // YYYY-MM-DD in Asia/Manila, from the server
};

type EditableEntry = Pick<Transaction, "id" | "type" | "amount" | "date" | "accountId" | "toAccountId" | "toName" | "categoryId" | "payee" | "note">;

/** "Add entry" with no entry; "Edit" with one. */
export function EntryForm({ entry, ...options }: Options & { entry?: EditableEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={entry ? "ghost" : "default"} size="sm">
          {entry ? <Pencil /> : <Plus />}
          {entry ? "Edit" : "Add entry"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "Add entry"}</DialogTitle>
          <DialogDescription>{entry ? "Change this entry. The account balances follow." : "Money in, money out, or a move between your accounts."}</DialogDescription>
        </DialogHeader>
        <Fields {...options} entry={entry} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function Fields({ accounts, categories, today, entry, onSaved }: Options & { entry?: EditableEntry; onSaved: () => void }) {
  const { symbol } = useMoney();
  const [saved, action, pending] = useActionState(saveEntry, {});
  // Until a save fails, the form shows the entry being edited; after one, what was typed.
  const state: FormState = { ...saved, values: saved.values ?? (entry && {
    type: entry.type, accountId: entry.accountId, toAccountId: entry.toAccountId ?? "", toName: entry.toName ?? "", categoryId: entry.categoryId ?? "",
    amount: toInput(entry.amount), date: entry.date, payee: entry.payee ?? "", note: entry.note ?? "",
  }) };
  const [type, setType] = useState<Transaction["type"]>(entry?.type ?? "expense");
  const [toOther, setToOther] = useState(!!entry?.toName); // a transfer to someone outside your accounts
  useEffect(() => {
    if (saved.ok) onSaved();
  }, [saved, onSaved]);

  const kind = type === "income" ? "income" : "spending";
  const choices = categories.filter((category) => category.kind === kind);
  return (
    // Remounts after a failed save, so the selects show the refilled values once React resets the form.
    <form key={JSON.stringify(saved.values ?? {})} action={action} className="grid grid-cols-1 gap-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <Field label="Type" name="type" state={state}>
        <Select name="type" value={type} onValueChange={(value) => setType(value as Transaction["type"])}>
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <AccountSelect label={type === "transfer" ? "From" : "Account"} name="accountId" accounts={accounts} state={state} />
      {type === "transfer" ? (
        <>
          <AccountSelect label="To" name="toAccountId" accounts={accounts} state={state} other={{ chosen: toOther, onChange: setToOther, name: state.values?.toName }} />
          {toOther && (
            <Field label="Name" name="toName" state={state}>
              <Input id="toName" name="toName" placeholder="Mom" defaultValue={state.values?.toName} {...invalid(state, "toName")} />
            </Field>
          )}
        </>
      ) : (
        <Field label="Category" name="categoryId" state={state}>
          <Select key={kind} name="categoryId" defaultValue={choices.some((category) => category.id === state.values?.categoryId) ? state.values?.categoryId : undefined}>
            <SelectTrigger id="categoryId" className="w-full" aria-invalid={!!state.errors?.categoryId}>
              <SelectValue placeholder={choices.length ? "Pick a category" : "No categories yet"} />
            </SelectTrigger>
            <SelectContent>
              {choices.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {choices.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add {kind} categories in <Link href="/settings" className="underline">Settings</Link>.
            </p>
          )}
        </Field>
      )}
      <Field label={`Amount (${symbol})`} name="amount" state={state}>
        <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" className="tabular-nums" defaultValue={state.values?.amount} {...invalid(state, "amount")} />
      </Field>
      <Field label="Date" name="date" state={state}>
        <Input id="date" name="date" type="date" defaultValue={state.values?.date ?? today} {...invalid(state, "date")} />
      </Field>
      <Field label="Payee (optional)" name="payee" state={state}>
        <Input id="payee" name="payee" placeholder={type === "income" ? "Employer" : "Jollibee"} defaultValue={state.values?.payee} {...invalid(state, "payee")} />
      </Field>
      <Field label="Note (optional)" name="note" state={state}>
        <Input id="note" name="note" defaultValue={state.values?.note} {...invalid(state, "note")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>{entry ? "Save changes" : "Add entry"}</Button>
      </DialogFooter>
    </form>
  );
}

type FieldName = keyof NonNullable<FormState["errors"]>;

function invalid(state: FormState, name: FieldName) {
  return { "aria-invalid": !!state.errors?.[name], "aria-describedby": state.errors?.[name] ? `${name}-error` : undefined };
}

function Field({ label, name, state, children }: { label: string; name: FieldName; state: FormState; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {state.errors?.[name] && <p id={`${name}-error`} className="text-sm text-destructive">{state.errors[name]}</p>}
    </div>
  );
}

const OTHER = "other";

// With `other`, the list ends in "Someone else…", which swaps the account for a free-text name (the select then sends nothing).
function AccountSelect({ label, name, accounts, state, other }: {
  label: string; name: "accountId" | "toAccountId"; accounts: Options["accounts"]; state: FormState;
  other?: { chosen: boolean; onChange: (chosen: boolean) => void; name?: string };
}) {
  const { money } = useMoney();
  return (
    <Field label={label} name={name} state={state}>
      <Select
        name={other?.chosen ? undefined : name}
        defaultValue={(other?.chosen ? OTHER : state.values?.[name]) || undefined}
        onValueChange={other && ((value) => other.onChange(value === OTHER))}
      >
        <SelectTrigger id={name} className="w-full" {...invalid(state, name)}>
          <SelectValue placeholder="Pick an account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name} <span className="text-muted-foreground tabular-nums">{money(account.balance)}</span>
            </SelectItem>
          ))}
          {other && <SelectItem value={OTHER}>Someone else…</SelectItem>}
        </SelectContent>
      </Select>
    </Field>
  );
}

type PaymentToEdit = { id: string; amount: number; date: string; accountId: string; note: string | null };

/** Edit on a bill, installment, debt or goal payment: amount, date, account and note. `amountLocked` shows the amount but can't change it. */
export function EditPayment({ payment, accounts, accountLabel = "Paid from", amountLocked = false }: {
  payment: PaymentToEdit; accounts: Options["accounts"]; accountLabel?: string; amountLocked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
          <DialogDescription>Change this payment. The account balances and progress follow.</DialogDescription>
        </DialogHeader>
        <PaymentFields payment={payment} accounts={accounts} accountLabel={accountLabel} amountLocked={amountLocked} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PaymentFields({ payment, accounts, accountLabel, amountLocked, onSaved }: {
  payment: PaymentToEdit; accounts: Options["accounts"]; accountLabel: string; amountLocked: boolean; onSaved: () => void;
}) {
  const { symbol } = useMoney();
  const [saved, action, pending] = useActionState(editPayment, {});
  const state: FormState = { ...saved, values: saved.values ?? {
    type: "", accountId: payment.accountId, toAccountId: "", toName: "", categoryId: "", amount: toInput(payment.amount), date: payment.date, payee: "", note: payment.note ?? "",
  } };
  useEffect(() => {
    if (saved.ok) onSaved();
  }, [saved, onSaved]);

  return (
    <form key={JSON.stringify(saved.values ?? {})} action={action} className="grid grid-cols-1 gap-4">
      <input type="hidden" name="id" value={payment.id} />
      <Field label={`Amount (${symbol})`} name="amount" state={state}>
        {/* readOnly, not disabled, so the amount is still sent */}
        <Input id="amount" name="amount" inputMode="decimal" className="tabular-nums" defaultValue={state.values?.amount} readOnly={amountLocked} {...invalid(state, "amount")} />
        {amountLocked && <p className="text-sm text-muted-foreground">Locked: this payment is in a finished cycle. Remove it and record it again to change the amount.</p>}
      </Field>
      <Field label="Date" name="date" state={state}>
        <Input id="date" name="date" type="date" defaultValue={state.values?.date} {...invalid(state, "date")} />
      </Field>
      <AccountSelect label={accountLabel} name="accountId" accounts={accounts} state={state} />
      <Field label="Note (optional)" name="note" state={state}>
        <Input id="note" name="note" defaultValue={state.values?.note} {...invalid(state, "note")} />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>Save</Button>
      </DialogFooter>
    </form>
  );
}

/** `what` and `consequence` word the confirm for a payment ("Remove this payment?", what changes) instead of an entry. */
export function DeleteEntry({ id, label, what = "entry", consequence }: { id: string; label: string; what?: string; consequence?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 />
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this {what}?</DialogTitle>
          <DialogDescription>{label}. {consequence ?? "The account balances change back."} This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await deleteEntry(formData);
            if (result.error) setError(result.error);
            else setOpen(false);
          }}
        >
          <input type="hidden" name="id" value={id} />
          {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive">
              Remove {what}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
