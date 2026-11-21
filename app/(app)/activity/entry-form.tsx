"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { ChoiceSheet } from "@/components/choice-sheet";
import { FormSheetContent, useBackToClose } from "@/components/form-sheet";
import { useMoney } from "@/components/currency-provider";
import { ArrowRight, ChevronDown, ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, Transaction } from "@/db/schema";
import { setAsideOf, toInput } from "@/lib/money";
import { usePhone } from "@/lib/use-phone";
import { deleteEntry, editPayment, saveEntry, type FormState } from "./actions";

type Options = {
  accounts: { id: string; name: string; balance: number }[];
  categories: Pick<Category, "id" | "name" | "kind">[];
  today: string; // YYYY-MM-DD in Asia/Manila, from the server
  setAsideItems: { value: string; label: string; name: string; group: string }[]; // what a transfer can be set aside for: value is "kind:id"
};

type EditableEntry = Pick<Transaction, "id" | "type" | "amount" | "date" | "accountId" | "toAccountId" | "toName" | "categoryId" | "payee" | "note" | "setAsideBillId" | "setAsideDebtId" | "setAsideGoalId" | "setAsideInstallmentId">;

// Below 768px the dialog is a full-screen sheet with big touch targets (PhoneFields); from 768px up it is the dialog with selects (Fields).
const phoneSheet = "inset-0 top-0 left-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none";

/** "Add entry" with no entry; "Edit" with one. */
export function EntryForm({ entry, ...options }: Options & { entry?: EditableEntry }) {
  const [open, setOpen] = useState(false);
  useBackToClose(open, setOpen);
  const phone = usePhone();
  const title = entry ? "Edit entry" : "Add entry";
  const description = entry ? "Change this entry. The account balances follow." : "Money in, money out, or a move between your accounts.";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={entry ? "ghost" : "default"} size="sm">
          {entry ? <Pencil /> : <Plus />}
          {entry ? "Edit" : "Add entry"}
        </Button>
      </DialogTrigger>
      {phone ? (
        // The amount takes focus itself (autoFocus on an Add), so the dialog doesn't move it to the first button.
        <DialogContent showCloseButton={false} className={phoneSheet} onOpenAutoFocus={entry ? undefined : (event) => event.preventDefault()}>
          <DialogHeader className="flex-row items-center gap-2 px-2 pt-3 pb-1">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="Back"><ChevronLeft className="size-6" /></Button>
            </DialogClose>
            <DialogTitle className="font-serif text-lg font-medium">{title}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">{description}</DialogDescription>
          <PhoneFields {...options} entry={entry} onSaved={() => setOpen(false)} />
        </DialogContent>
      ) : (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Fields {...options} entry={entry} onSaved={() => setOpen(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function Fields({ accounts, categories, today, setAsideItems, entry, onSaved }: Options & { entry?: EditableEntry; onSaved: () => void }) {
  const { symbol } = useMoney();
  const [saved, action, pending] = useActionState(saveEntry, {});
  // Until a save fails, the form shows the entry being edited; after one, what was typed.
  const state: FormState = { ...saved, values: saved.values ?? (entry && {
    type: entry.type, accountId: entry.accountId, toAccountId: entry.toAccountId ?? "", toName: entry.toName ?? "", categoryId: entry.categoryId ?? "",
    amount: toInput(entry.amount), date: entry.date, payee: entry.payee ?? "", note: entry.note ?? "", setAside: linkOf(entry), paidTo: "",
  }) };
  const [type, setType] = useState<Transaction["type"]>(entry?.type ?? "expense");
  const [toOther, setToOther] = useState(!!entry?.toName); // a transfer to someone outside your accounts
  const [setAside, setSetAside] = useState((saved.values?.setAside ?? (entry && linkOf(entry))) || "");
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
          <SetAsideField state={state} items={setAsideItems} value={setAside} onChange={setSetAside} />
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

function SetAsideField({ state, items, value, onChange }: { state: FormState; items: Options["setAsideItems"]; value: string; onChange: (value: string) => void }) {
  return (
    <Field label="For (optional)" name="setAside" state={state}>
      {/* An item can't have an empty value, so "None" is sent as blank by the hidden input. */}
      <input type="hidden" name="setAside" value={value} />
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
        <SelectTrigger id="setAside" className="w-full" {...invalid(state, "setAside")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {[...new Set(items.map((item) => item.group))].map((group) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {items.filter((item) => item.group === group).map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">Counts toward its Set aside bar. Nothing is paid.</p>
    </Field>
  );
}

const LAST_ACCOUNT = "lastAccountId";

// The account the last new entry used, if it is still one of yours. localStorage can be blocked, so a miss is just "none".
function lastAccount(accounts: Options["accounts"]) {
  try {
    const id = localStorage.getItem(LAST_ACCOUNT);
    return accounts.find((account) => account.id === id)?.id ?? "";
  } catch {
    return "";
  }
}

// The phone form: same fields and the same saveEntry as Fields, but the choices are big buttons that open bottom sheets.
// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function PhoneFields({ accounts, categories, today, setAsideItems, entry, onSaved }: Options & { entry?: EditableEntry; onSaved: () => void }) {
  const { symbol, money } = useMoney();
  const [saved, action, pending] = useActionState(saveEntry, {});
  const state: FormState = { ...saved, values: saved.values ?? (entry && {
    type: entry.type, accountId: entry.accountId, toAccountId: entry.toAccountId ?? "", toName: entry.toName ?? "", categoryId: entry.categoryId ?? "",
    amount: toInput(entry.amount), date: entry.date, payee: entry.payee ?? "", note: entry.note ?? "", setAside: linkOf(entry), paidTo: "",
  }) };
  const [type, setType] = useState<Transaction["type"]>(entry?.type ?? "expense");
  const [accountId, setAccountId] = useState(() => entry?.accountId ?? lastAccount(accounts));
  const [to, setTo] = useState(entry?.toName ? OTHER : entry?.toAccountId ?? ""); // an account id, OTHER for a name, or none yet
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? "");
  const [setAside, setSetAside] = useState(entry ? linkOf(entry) : "");
  const [amountLength, setAmountLength] = useState(state.values?.amount?.length ?? 0);
  const [more, setMore] = useState(!!(entry?.payee || entry && linkOf(entry))); // an entry that has them shows them
  useEffect(() => {
    if (!saved.ok) return;
    if (!entry) {
      try {
        localStorage.setItem(LAST_ACCOUNT, accountId);
      } catch {}
    }
    onSaved();
  }, [saved, onSaved, entry, accountId]);

  const kind = type === "income" ? "income" : "spending";
  const transfer = type === "transfer";
  const amountSize = amountLength <= 8 ? "text-6xl" : amountLength <= 11 ? "text-5xl" : "text-4xl"; // so 18,900.00 and more still fit
  const accountChoices = accounts.map((account) => ({ value: account.id, label: account.name, detail: money(account.balance) }));
  return (
    <form key={JSON.stringify(saved.values ?? {})} action={action} className="flex min-h-0 flex-1 flex-col">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="toAccountId" value={to === OTHER ? "" : to} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="grid flex-1 grid-cols-1 content-start gap-4 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-3 rounded-xl bg-secondary p-1">
          {(["expense", "income", "transfer"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={type === option}
              onClick={() => {
                setType(option);
                setCategoryId("");
              }}
              className="min-h-11 rounded-lg text-sm font-medium text-muted-foreground capitalize aria-pressed:bg-surface aria-pressed:text-foreground aria-pressed:shadow-xs"
            >
              {option}
            </button>
          ))}
        </div>
        <div className="grid gap-1">
          <div className="flex items-baseline justify-center gap-1.5 pt-4">
            <span className="font-serif text-3xl text-muted-foreground">{symbol}</span>
            <Input
              id="amount"
              name="amount"
              inputMode="decimal"
              placeholder="0.00"
              aria-label={`Amount (${symbol})`}
              autoFocus={!entry}
              className={`h-auto w-full min-w-0 border-0 bg-transparent p-0 text-center font-serif shadow-none tabular-nums focus-visible:ring-0 dark:bg-transparent ${amountSize}`}
              defaultValue={state.values?.amount}
              onChange={(event) => setAmountLength(event.target.value.length)}
              {...invalid(state, "amount")}
            />
          </div>
          {state.errors?.amount && <p id="amount-error" className="text-center text-sm text-destructive">{state.errors.amount}</p>}
        </div>
        {transfer ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1">
              <ChoiceSheet id="accountId" title="From" compact value={accountId} onChange={setAccountId} choices={accountChoices} placeholder="Pick…" invalid={!!state.errors?.accountId} />
              <ArrowRight className="size-4 self-center text-muted-foreground" aria-hidden />
              <ChoiceSheet
                id="toAccountId"
                title="To"
                compact
                value={to}
                onChange={setTo}
                choices={[...accountChoices, { value: OTHER, label: "Someone else…", detail: "Not one of your accounts" }]}
                placeholder="Pick…"
                invalid={!!state.errors?.toAccountId}
              />
            </div>
            {(["accountId", "toAccountId"] as const).map((name) => state.errors?.[name] && <p key={name} id={`${name}-error`} className="text-sm text-destructive">{state.errors[name]}</p>)}
          </div>
        ) : (
          <Field label="Account" name="accountId" state={state}>
            <ChoiceSheet id="accountId" title="Account" value={accountId} onChange={setAccountId} choices={accountChoices} placeholder="Pick an account" invalid={!!state.errors?.accountId} />
          </Field>
        )}
        {transfer && to === OTHER && (
          <Field label="Name" name="toName" state={state}>
            <Input id="toName" name="toName" placeholder="Mom" className="h-12" defaultValue={state.values?.toName} {...invalid(state, "toName")} />
          </Field>
        )}
        {!transfer && (
          <Field label="Category" name="categoryId" state={state}>
            <ChoiceSheet
              id="categoryId"
              title="Category"
              value={categoryId}
              onChange={setCategoryId}
              choices={categories.filter((category) => category.kind === kind).map((category) => ({ value: category.id, label: category.name }))}
              placeholder="Pick a category"
              invalid={!!state.errors?.categoryId}
              empty={
                <p className="py-3 text-sm text-muted-foreground">
                  No categories yet. Add {kind} categories in <Link href="/settings" className="underline">Settings</Link>.
                </p>
              }
            />
          </Field>
        )}
        <div className="grid gap-2">
          <Input id="date" name="date" type="date" aria-label="Date" className="h-12" defaultValue={state.values?.date ?? today} {...invalid(state, "date")} />
          {state.errors?.date && <p id="date-error" className="text-sm text-destructive">{state.errors.date}</p>}
          <Input id="note" name="note" aria-label="Note (optional)" placeholder="Add a note" className="h-12" defaultValue={state.values?.note} {...invalid(state, "note")} />
          {state.errors?.note && <p id="note-error" className="text-sm text-destructive">{state.errors.note}</p>}
        </div>
        <div className="border-t">
          <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="flex min-h-11 w-full items-center justify-between text-sm text-muted-foreground">
            More: {transfer ? "For (set aside)" : "Payee"}
            <ChevronDown className={more ? "size-4 rotate-180" : "size-4"} aria-hidden />
          </button>
          {/* Hidden, not unmounted, so what was typed is still sent. */}
          <div className={more ? "grid gap-2 pt-2" : "hidden"}>
            {transfer ? (
              <SetAsideField state={state} items={setAsideItems} value={setAside} onChange={setSetAside} />
            ) : (
              <Field label="Payee (optional)" name="payee" state={state}>
                <Input id="payee" name="payee" placeholder={type === "income" ? "Employer" : "Jollibee"} className="h-12" defaultValue={state.values?.payee} {...invalid(state, "payee")} />
              </Field>
            )}
          </div>
        </div>
      </div>
      <div className="border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" className="h-14 w-full rounded-xl text-base font-semibold" disabled={pending}>{entry ? "Save changes" : "Add entry"}</Button>
      </div>
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
const NONE = "none";

function linkOf(entry: Parameters<typeof setAsideOf>[0]) {
  const link = setAsideOf(entry);
  return link ? `${link.kind}:${link.id}` : "";
}

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

// paidTo is left out for goals: Add money goes into the goal's own account, so there is no one to name.
type PaymentToEdit = { id: string; amount: number; date: string; accountId: string; note: string | null; paidTo?: string | null };

/** Edit on a bill, installment, debt or goal payment: amount, date, account and note. `amountLocked` shows the amount but can't change it. */
export function EditPayment({ payment, accounts, accountLabel = "Paid from", paidToLabel = "To (optional)", amountLocked = false }: {
  payment: PaymentToEdit; accounts: Options["accounts"]; accountLabel?: string; paidToLabel?: string; amountLocked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useBackToClose(open, setOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil />
          Edit
        </Button>
      </DialogTrigger>
      <FormSheetContent title="Edit payment" description="Change this payment. The account balances and progress follow.">
        <PaymentFields payment={payment} accounts={accounts} accountLabel={accountLabel} paidToLabel={paidToLabel} amountLocked={amountLocked} onSaved={() => setOpen(false)} />
      </FormSheetContent>
    </Dialog>
  );
}

function PaymentFields({ payment, accounts, accountLabel, paidToLabel, amountLocked, onSaved }: {
  payment: PaymentToEdit; accounts: Options["accounts"]; accountLabel: string; paidToLabel: string; amountLocked: boolean; onSaved: () => void;
}) {
  const { symbol } = useMoney();
  const [saved, action, pending] = useActionState(editPayment, {});
  const state: FormState = { ...saved, values: saved.values ?? {
    type: "", accountId: payment.accountId, toAccountId: "", toName: "", categoryId: "", amount: toInput(payment.amount), date: payment.date, payee: "", note: payment.note ?? "", setAside: "", paidTo: payment.paidTo ?? "",
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
      {payment.paidTo !== undefined && (
        <Field label={paidToLabel} name="paidTo" state={state}>
          <Input id="paidTo" name="paidTo" placeholder="Landlord" defaultValue={state.values?.paidTo} {...invalid(state, "paidTo")} />
        </Field>
      )}
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
