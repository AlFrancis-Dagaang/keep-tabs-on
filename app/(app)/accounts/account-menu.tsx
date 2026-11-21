"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AccountForm, DeleteAccount, type AccountRow } from "./account-form";

/** The ⋯ on a phone account card. The dialogs sit beside the menu, not in it: a dialog inside a menu item closes with the menu. */
export function AccountMenu({ account }: { account: AccountRow }) {
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="-mt-2 -mr-2 size-11 rounded-full text-white hover:bg-white/15 hover:text-white" aria-label={`Actions for ${account.name}`}>
            <Ellipsis className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="min-h-11" onSelect={() => setEdit(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => setRemove(true)}>
            <Trash2 />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountForm account={account} control={{ open: edit, onOpenChange: setEdit }} />
      <DeleteAccount account={account} control={{ open: remove, onOpenChange: setRemove }} />
    </>
  );
}
