"use client";

import { useActionState, useEffect, useState } from "react";
import { useMoney } from "@/components/currency-provider";
import { FormSheetContent, useBackToClose } from "@/components/form-sheet";
import { PixelBar } from "@/components/pixel-bar";
import { Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Goal } from "@/db/schema";
import { progressBlocks, toInput } from "@/lib/money";
import { deleteGoal, type FormState, saveGoal, setGoalDone } from "./actions";

type EditableGoal = Pick<Goal, "id" | "name" | "target" | "deadline" | "setAsideBefore" | "note">;

export function GoalProgress({ name, saved, target }: { name: string; saved: number; target: number }) {
  const { money } = useMoney();
  return <PixelBar blocks={progressBlocks(saved, target)} label={`${name}: ${money(saved)} of ${money(target)} saved`} />;
}

export function GoalForm({ today, goal }: { today: string; goal?: EditableGoal }) {
  const [open, setOpen] = useState(false);
  useBackToClose(open, setOpen);
  const title = goal ? "Edit goal" : "Create goal";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {goal ? <Button variant="ghost" size="sm"><Pencil />Edit</Button> : <Button size="sm"><Plus />Create goal</Button>}
      </DialogTrigger>
      <FormSheetContent title={title} description="Something you&apos;re saving for. Fill it with transfers in Activity: pick this goal under For.">
        <GoalFields today={today} goal={goal} onSaved={() => setOpen(false)} />
      </FormSheetContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function GoalFields({ today, goal, onSaved }: { today: string; goal?: EditableGoal; onSaved: () => void }) {
  const { symbol } = useMoney();
  const [state, action, pending] = useActionState(saveGoal, {});
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  const values = state.values;
  return (
    <form key={JSON.stringify(values ?? {})} action={action} className="grid grid-cols-1 gap-4">
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
      <Field label={`Already saved (${symbol})`} name="setAsideBefore" state={state}>
        <Input id="setAsideBefore" name="setAsideBefore" inputMode="decimal" placeholder="0.00" className="tabular-nums"
          defaultValue={values?.setAsideBefore ?? (goal?.setAsideBefore ? toInput(goal.setAsideBefore) : undefined)} {...invalid(state, "setAsideBefore")} />
      </Field>
      <Field label="Note (optional)" name="note" state={state}>
        <Input id="note" name="note" defaultValue={values?.note ?? goal?.note ?? undefined} {...invalid(state, "note")} />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending}>{goal ? "Save goal" : "Create goal"}</Button>
      </DialogFooter>
    </form>
  );
}

export function DonePill() {
  return <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-foreground">Done</span>;
}

export function MarkDone({ id, done }: { id: string; done: boolean }) {
  return (
    <form action={setGoalDone} className="contents">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="done" value={done ? "0" : "1"} />
      <Button type="submit" variant="ghost" size="sm">{done ? <RotateCcw /> : <Check />}{done ? "Reopen" : "Mark done"}</Button>
    </form>
  );
}

export function DeleteGoal({ id, name }: { id: string; name: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Trash2 />Remove</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>Its transfers stay in Activity. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <form action={deleteGoal}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive">Remove goal</Button>
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
    <div className="grid grid-cols-1 gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {state.errors?.[name] && <p id={`${name}-error`} className="text-sm text-destructive">{state.errors[name]}</p>}
    </div>
  );
}
