"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/db/schema";
import { deleteCategory, saveCategory } from "./actions";

type CategoryRow = Pick<Category, "id" | "name" | "kind">;

/** "Add category" for a kind with no category; "Rename" with one. */
export function CategoryForm({ kind, category }: { kind: Category["kind"]; category?: CategoryRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={category ? "ghost" : "default"} size="sm">
          {category ? "Rename" : "Add category"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Rename category" : `Add ${kind} category`}</DialogTitle>
          <DialogDescription>{kind === "spending" ? "Where your money goes, like Food or Rent." : "Where your money comes from, like Salary."}</DialogDescription>
        </DialogHeader>
        <Fields kind={kind} category={category} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which unmounts on close, so each open starts with a clean form.
function Fields({ kind, category, onSaved }: { kind: Category["kind"]; category?: CategoryRow; onSaved: () => void }) {
  const [state, action, pending] = useActionState(saveCategory, {});
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form action={action} className="grid gap-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={state.values?.name ?? category?.name}
          aria-invalid={!!state.errors?.name}
          aria-describedby={state.errors?.name ? "name-error" : undefined}
        />
        {state.errors?.name && <p id="name-error" className="text-sm text-destructive">{state.errors.name}</p>}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {category ? "Save" : "Add category"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteCategory({ category }: { category: CategoryRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {category.name}?</DialogTitle>
          <DialogDescription>Entries keep their amounts and show as Uncategorized. Its budget history goes too. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await deleteCategory(formData);
            setOpen(false);
          }}
        >
          <input type="hidden" name="id" value={category.id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive">
              Delete category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
