"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export type Choice = { value: string; label: string; detail?: string };

/**
 * A big button showing the chosen row that opens a bottom sheet of rows; choosing one closes it.
 * Phone forms use it instead of a dropdown. It sends nothing itself: the form holds the value in a hidden input.
 * `compact` stacks the caption over the choice, for two side by side.
 */
export function ChoiceSheet({ id, title, value, onChange, choices, placeholder, invalid, compact, empty }: {
  id?: string; title: string; value: string; onChange: (value: string) => void; choices: Choice[]; placeholder: string;
  invalid?: boolean; compact?: boolean; empty?: React.ReactNode; // shown instead of rows when there are none
}) {
  const [open, setOpen] = useState(false);
  const chosen = choices.find((choice) => choice.value === value);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid}
          className={cn(
            "flex min-h-16 w-full items-center justify-between gap-2 rounded-xl border bg-surface px-3.5 py-2 text-left data-[invalid=true]:border-destructive",
            compact && "flex-col items-start justify-center gap-0"
          )}
        >
          {compact && <span className="text-xs text-muted-foreground">{title}</span>}
          <span className="grid min-w-0">
            <span className={cn("truncate font-semibold", !chosen && "font-normal text-muted-foreground")}>{chosen?.label ?? placeholder}</span>
            {chosen?.detail && <span className="text-xs text-muted-foreground tabular-nums">{chosen.detail}</span>}
          </span>
          {!compact && <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="max-h-[75dvh] gap-0 overflow-y-auto rounded-t-2xl bg-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 flex items-center justify-between">
          <SheetTitle className="font-serif text-lg font-medium">{title}</SheetTitle>
          <SheetClose className="grid size-11 place-items-center rounded-full hover:bg-secondary" aria-label="Close"><X className="size-5" /></SheetClose>
        </div>
        {choices.length === 0 && empty}
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-pressed={choice.value === value}
            onClick={() => {
              onChange(choice.value);
              setOpen(false);
            }}
            className="flex min-h-14 items-center justify-between gap-3 border-b py-2 text-left last:border-0"
          >
            <span className="grid">
              <span className="font-semibold">{choice.label}</span>
              {choice.detail && <span className="text-sm text-muted-foreground tabular-nums">{choice.detail}</span>}
            </span>
            {choice.value === value && <span className="font-bold text-primary" aria-hidden>✓</span>}
          </button>
        ))}
      </SheetContent>
    </Sheet>
  );
}
