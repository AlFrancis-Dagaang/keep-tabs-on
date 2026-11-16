"use client";

import { useActionState, useEffect, useState } from "react";
import { useMoney } from "@/components/currency-provider";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AccountIcon } from "@/components/account-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Account } from "@/db/schema";
import { cashKey, logos, tileColors } from "@/lib/account-icons";
import { toInput } from "@/lib/money";
import { deleteAccount, saveAccount } from "./actions";

type AccountRow = Pick<Account, "id" | "name" | "includeInNetWorth" | "icon"> & { balance: number };

/** "Add account" with no account; "Edit" (name and balance) with one. */
export function AccountForm({ account }: { account?: AccountRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={account ? "ghost" : "default"} size="sm">
          {account ? <Pencil /> : <Plus />}
          {account ? "Edit" : "Add account"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "Add account"}</DialogTitle>
          <DialogDescription>Enter what the account holds today.</DialogDescription>
        </DialogHeader>
        <Fields account={account} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function Fields({ account, onSaved }: { account?: AccountRow; onSaved: () => void }) {
  const { symbol } = useMoney();
  const [state, action, pending] = useActionState(saveAccount, {});
  const [name, setName] = useState(account?.name ?? "");
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form action={action} className="grid grid-cols-1 gap-4">
      {account && <input type="hidden" name="id" value={account.id} />}
      <div className="grid grid-cols-1 gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="BPI savings"
          defaultValue={state.values?.name ?? account?.name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!!state.errors?.name}
          aria-describedby={state.errors?.name ? "name-error" : undefined}
        />
        {state.errors?.name && <p id="name-error" className="text-sm text-destructive">{state.errors.name}</p>}
      </div>
      <div className="grid grid-cols-1 gap-2">
        <Label htmlFor="balance">Balance today ({symbol})</Label>
        <Input
          id="balance"
          name="balance"
          inputMode="decimal"
          placeholder="0.00"
          className="tabular-nums"
          defaultValue={state.values?.balance ?? (account ? toInput(account.balance) : "")}
          aria-invalid={!!state.errors?.balance}
          aria-describedby={state.errors?.balance ? "balance-error" : undefined}
        />
        {state.errors?.balance && <p id="balance-error" className="text-sm text-destructive">{state.errors.balance}</p>}
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Icon <span className="font-normal text-muted-foreground">(optional)</span></legend>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "", label: "None" },
            ...logos.map((logo) => ({ value: logo.key, label: logo.label })),
            { value: cashKey, label: "Cash" },
            ...Object.keys(tileColors).map((color) => ({ value: `tile:${color}`, label: `${color} tile` })),
          ].map((option) => (
            <label key={option.value} title={option.label} className="relative grid size-11 cursor-pointer place-items-center rounded-lg border bg-surface has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
              <input
                type="radio"
                name="icon"
                value={option.value}
                aria-label={option.label}
                className="absolute inset-0 cursor-pointer opacity-0"
                defaultChecked={option.value === (state.values?.icon ?? account?.icon ?? "")}
              />
              {option.value === "" ? <span className="text-xs text-muted-foreground">None</span> : <AccountIcon icon={option.value} name={name || "A"} />}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-start gap-2">
        <input
          id="include"
          name="include"
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          defaultChecked={state.values?.include ?? account?.includeInNetWorth ?? true}
        />
        <div className="grid gap-1">
          <Label htmlFor="include">Include in net worth</Label>
          <p className="text-sm text-muted-foreground">Turn off for savings you don&apos;t count, like a tuition fund.</p>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {account ? "Save" : "Add account"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteAccount({ account }: { account: AccountRow }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Dialog open={open} onOpenChange={(next) => {
        setOpen(next);
        setError(undefined);
      }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 />
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {account.name}?</DialogTitle>
          <DialogDescription>This removes the account and its balance from your net worth. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const result = await deleteAccount(formData);
            if (result.error) setError(result.error);
            else setOpen(false);
          }}
        >
          <input type="hidden" name="id" value={account.id} />
          {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive">
              Remove account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
