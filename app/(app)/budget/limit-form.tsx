"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toInput } from "@/lib/money";
import { saveLimit } from "./actions";

type Limit = { id: string; name: string; budget: number | null };

/** "Set limit" for a category with none; "Edit limit" with one. */
export function LimitForm({ category }: { category: Limit }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {category.budget === null ? "Set limit" : "Edit limit"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category.name} limit</DialogTitle>
          <DialogDescription>How much you plan to spend on {category.name} each month, from this month on. Leave blank for no limit.</DialogDescription>
        </DialogHeader>
        <Fields category={category} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function Fields({ category, onSaved }: { category: Limit; onSaved: () => void }) {
  const [state, action, pending] = useActionState(saveLimit, {});
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="categoryId" value={category.id} />
      <div className="grid gap-2">
        <Label htmlFor="budget">Monthly limit</Label>
        <Input
          id="budget"
          name="budget"
          inputMode="decimal"
          defaultValue={state.values?.budget ?? (category.budget === null ? "" : toInput(category.budget))}
          aria-invalid={!!state.errors?.budget}
          aria-describedby={state.errors?.budget ? "budget-error" : undefined}
        />
        {state.errors?.budget && <p id="budget-error" className="text-sm text-destructive">{state.errors.budget}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Save limit
        </Button>
      </DialogFooter>
    </form>
  );
}
