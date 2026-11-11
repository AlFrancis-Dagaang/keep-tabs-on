"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, Transaction } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { deleteEntry, saveEntry, type FormState } from "./actions";

type Options = {
  accounts: { id: string; name: string; balance: number }[];
  categories: Pick<Category, "id" | "name" | "kind">[];
  today: string; // YYYY-MM-DD in Asia/Manila, from the server
};

export function EntryForm(options: Options) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add entry</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add entry</DialogTitle>
          <DialogDescription>Money in, money out, or a move between your accounts.</DialogDescription>
        </DialogHeader>
        <Fields {...options} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function Fields({ accounts, categories, today, onSaved }: Options & { onSaved: () => void }) {
  const [state, action, pending] = useActionState(saveEntry, {});
  const [type, setType] = useState<Transaction["type"]>("expense");
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  const kind = type === "income" ? "income" : "spending";
  const choices = categories.filter((category) => category.kind === kind);
  return (
    // Remounts after a failed save, so the selects show the refilled values once React resets the form.
    <form key={JSON.stringify(state.values ?? {})} action={action} className="grid gap-4">
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
        <AccountSelect label="To" name="toAccountId" accounts={accounts} state={state} />
      ) : (
        <Field label="Category" name="categoryId" state={state}>
          <Select key={kind} name="categoryId" defaultValue={state.values?.categoryId || undefined}>
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
      <Field label="Amount (₱)" name="amount" state={state}>
        <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" className="tabular-nums" defaultValue={state.values?.amount} {...invalid(state, "amount")} />
      </Field>
      <Field label="Date" name="date" state={state}>
        <Input id="date" name="date" type="date" defaultValue={state.values?.date ?? today} {...invalid(state, "date")} />
      </Field>
      <Field label="Payee (optional)" name="payee" state={state}>
        <Input id="payee" name="payee" placeholder={type === "income" ? "Employer" : "Jollibee"} defaultValue={state.values?.payee} {...invalid(state, "payee")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>Add entry</Button>
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
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {state.errors?.[name] && <p id={`${name}-error`} className="text-sm text-destructive">{state.errors[name]}</p>}
    </div>
  );
}

function AccountSelect({ label, name, accounts, state }: { label: string; name: "accountId" | "toAccountId"; accounts: Options["accounts"]; state: FormState }) {
  return (
    <Field label={label} name={name} state={state}>
      <Select name={name} defaultValue={state.values?.[name] || undefined}>
        <SelectTrigger id={name} className="w-full" {...invalid(state, name)}>
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
  );
}

export function DeleteEntry({ id, label }: { id: string; label: string }) {
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
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this entry?</DialogTitle>
          <DialogDescription>{label}. The account balances change back.</DialogDescription>
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
              Delete entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
