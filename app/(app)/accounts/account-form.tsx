"use client";

import { useActionState, useEffect, useState } from "react";
import { useMoney } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Account } from "@/db/schema";
import { toInput } from "@/lib/money";
import { deleteAccount, saveAccount } from "./actions";

type AccountRow = Pick<Account, "id" | "name" | "includeInNetWorth"> & { balance: number };

/** "Add account" with no account; "Edit" (name and balance) with one. */
export function AccountForm({ account }: { account?: AccountRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={account ? "ghost" : "default"} size="sm">
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
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form action={action} className="grid gap-4">
      {account && <input type="hidden" name="id" value={account.id} />}
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="BPI savings"
          defaultValue={state.values?.name ?? account?.name}
          aria-invalid={!!state.errors?.name}
          aria-describedby={state.errors?.name ? "name-error" : undefined}
        />
        {state.errors?.name && <p id="name-error" className="text-sm text-destructive">{state.errors.name}</p>}
      </div>
      <div className="grid gap-2">
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
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {account.name}?</DialogTitle>
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
              Delete account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
