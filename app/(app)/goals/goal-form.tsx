"use client";

import { useActionState, useEffect, useState } from "react";
import { useMoney } from "@/components/currency-provider";
import { announceCompleted, PixelBar, useCompletedFlash } from "@/components/pixel-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Goal } from "@/db/schema";
import { progressBlocks, toInput } from "@/lib/money";
import { addToGoal, deleteGoal, type FormState, saveGoal } from "./actions";

type Accounts = { id: string; name: string; balance: number }[];
type EditableGoal = Pick<Goal, "id" | "name" | "target" | "deadline" | "accountId" | "savedBefore">;

export function GoalProgress({ id, name, saved, target }: { id: string; name: string; saved: number; target: number }) {
  const { money } = useMoney();
  const flashing = useCompletedFlash(id);
  return <PixelBar blocks={progressBlocks(saved, target)} flash={flashing} label={`${name}: ${money(saved)} of ${money(target)} saved`} />;
}

export function GoalForm({ today, accounts, goal }: { today: string; accounts: Accounts; goal?: EditableGoal }) {
  const [open, setOpen] = useState(false);
  const title = goal ? "Edit goal" : "Create goal";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {goal ? <Button variant="ghost" size="sm">Edit</Button> : <Button size="sm">Create goal</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Something you&apos;re saving for, and the account the money sits in.</DialogDescription>
        </DialogHeader>
        <GoalFields today={today} accounts={accounts} goal={goal} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function GoalFields({ today, accounts, goal, onSaved }: { today: string; accounts: Accounts; goal?: EditableGoal; onSaved: () => void }) {
  const { symbol } = useMoney();
  const [state, action, pending] = useActionState(saveGoal, {});
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  const values = state.values;
  return (
    <form key={JSON.stringify(values ?? {})} action={action} className="grid gap-4">
      <input type="hidden" name="id" value={goal?.id ?? ""} />
      <Field label="Name" name="name" state={state}>
        <Input id="name" name="name" placeholder="Emergency fund" defaultValue={values?.name ?? goal?.name} {...invalid(state, "name")} />
      </Field>
      <Field label={`Target (${symbol})`} name="target" state={state}>
        <Input id="target" name="target" inputMode="decimal" placeholder="0.00" className="tabular-nums"
          defaultValue={values?.target ?? (goal && toInput(goal.target))} {...invalid(state, "target")} />
      </Field>
      <Field label="Deadline" name="deadline" state={state}>
        <Input id="deadline" name="deadline" type="date" defaultValue={values?.deadline ?? goal?.deadline ?? today} {...invalid(state, "deadline")} />
      </Field>
      <Field label="Saved in" name="accountId" state={state}>
        <AccountSelect id="accountId" accounts={accounts} defaultValue={values?.accountId || goal?.accountId} state={state} />
      </Field>
      <Field label={`Already saved (${symbol})`} name="savedBefore" state={state}>
        <Input id="savedBefore" name="savedBefore" inputMode="decimal" placeholder="0.00" className="tabular-nums"
          defaultValue={values?.savedBefore ?? (goal?.savedBefore ? toInput(goal.savedBefore) : undefined)} {...invalid(state, "savedBefore")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>{goal ? "Save goal" : "Create goal"}</Button>
      </DialogFooter>
    </form>
  );
}

export function AddMoney(props: { goal: { id: string; name: string; accountId: string; left: number }; accounts: Accounts; today: string }) {
  const { money } = useMoney();
  const [open, setOpen] = useState(false);
  // Disabled rather than hidden at target: hiding it would unmount the form before it announces the flash.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={props.goal.left === 0}>Add money</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add money</DialogTitle>
          <DialogDescription>{props.goal.name}: {money(props.goal.left)} left to reach the target.</DialogDescription>
        </DialogHeader>
        <AddFields {...props} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddFields({ goal, accounts, today, onSaved }: { goal: { id: string; accountId: string; left: number }; accounts: Accounts; today: string; onSaved: () => void }) {
  const { symbol } = useMoney();
  const [state, action, pending] = useActionState(addToGoal, {});
  useEffect(() => {
    if (!state.ok) return;
    if (state.completed) announceCompleted(goal.id);
    onSaved();
  }, [state, goal.id, onSaved]);

  const values = state.values;
  return (
    <form key={JSON.stringify(values ?? {})} action={action} className="grid gap-4">
      <input type="hidden" name="goalId" value={goal.id} />
      <Field label="From account" name="fromAccountId" state={state}>
        <AccountSelect id="fromAccountId" accounts={accounts.filter((account) => account.id !== goal.accountId)}
          defaultValue={values?.fromAccountId} state={state} />
      </Field>
      <Field label={`Amount (${symbol})`} name="amount" state={state}>
        <Input id="amount" name="amount" inputMode="decimal" className="tabular-nums" defaultValue={values?.amount ?? toInput(goal.left)} {...invalid(state, "amount")} />
      </Field>
      <Field label="Date" name="date" state={state}>
        <Input id="date" name="date" type="date" defaultValue={values?.date ?? today} {...invalid(state, "date")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>Add money</Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteGoal({ id, name }: { id: string; name: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>Its transfers stay in Activity. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <form action={deleteGoal}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive">Delete goal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountSelect({ id, accounts, defaultValue, state }: { id: "accountId" | "fromAccountId"; accounts: Accounts; defaultValue?: string; state: FormState }) {
  const { money } = useMoney();
  return (
    <Select name={id} defaultValue={defaultValue || undefined}>
      <SelectTrigger id={id} className="w-full" {...invalid(state, id)}>
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
