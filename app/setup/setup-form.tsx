"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Currency, currencies, currencySymbol, directionLabels, repeatLabels } from "@/lib/money";
import { finishSetup, type SetupRows } from "./actions";

type Kind = "text" | "money" | "date" | "repeat" | "account" | "direction";
type Section = {
  key: keyof SetupRows;
  title: string;
  hint: string;
  add: string;
  fields: { name: string; label: string; kind: Kind; placeholder?: string }[];
  start: Record<string, string>[];
};

const blank = (section: Section) => Object.fromEntries(section.fields.map((field) => [field.name, field.kind === "repeat" ? "monthly" : field.kind === "direction" ? "owe" : ""]));
const named = (names: string[]) => names.map((name) => ({ name, budget: "" }));

const sections: Section[] = [
  { key: "accounts", title: "Accounts", hint: "Where your money is: banks, e-wallets, cash. Enter what each holds today.", add: "Add account",
    fields: [{ name: "name", label: "Name", kind: "text", placeholder: "BPI savings" }, { name: "balance", label: "Balance today", kind: "money" }],
    start: [{ name: "", balance: "" }] },
  { key: "spending", title: "Spending categories", hint: "What your money goes to. A monthly budget is optional.", add: "Add category",
    fields: [{ name: "name", label: "Name", kind: "text" }, { name: "budget", label: "Monthly budget (optional)", kind: "money" }],
    start: named(["Food", "Transport", "Bills", "Shopping", "Health"]) },
  { key: "income", title: "Income categories", hint: "Where your money comes from.", add: "Add category",
    fields: [{ name: "name", label: "Name", kind: "text" }],
    start: [{ name: "Salary" }, { name: "Other" }] },
  { key: "bills", title: "Recurring bills (optional)", hint: "Rent, internet, subscriptions. You can add these later.", add: "Add bill",
    fields: [
      { name: "name", label: "Name", kind: "text", placeholder: "Internet" }, { name: "amount", label: "Amount", kind: "money" },
      { name: "nextDueDate", label: "Next due", kind: "date" }, { name: "repeat", label: "Repeats", kind: "repeat" },
    ],
    start: [] },
  { key: "goals", title: "Goals (optional)", hint: "Something you're saving for. Pick the account the money sits in.", add: "Add goal",
    fields: [
      { name: "name", label: "Name", kind: "text", placeholder: "Emergency fund" }, { name: "target", label: "Target", kind: "money" },
      { name: "deadline", label: "Deadline", kind: "date" }, { name: "account", label: "Account", kind: "account" },
      { name: "savedBefore", label: "Already saved (optional)", kind: "money" },
    ],
    start: [] },
  { key: "debts", title: "Debts (optional)", hint: "Money you owe, like a loan or a credit card, or money owed to you.", add: "Add debt",
    fields: [
      { name: "direction", label: "Type", kind: "direction" },
      { name: "name", label: "Name", kind: "text", placeholder: "Credit card" }, { name: "total", label: "Total owed", kind: "money" },
      { name: "deadline", label: "Pay off by", kind: "date" }, { name: "paidBefore", label: "Paid so far (optional)", kind: "money" },
    ],
    start: [] },
];

const selectClass = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function SetupForm({ currency: initial }: { currency: Currency }) {
  const [currency, setCurrency] = useState(initial);
  const [rows, setRows] = useState<SetupRows>(() => Object.fromEntries(sections.map((section) => [section.key, section.start])) as SetupRows);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const change = (key: keyof SetupRows, index: number, field: string, value: string) =>
    setRows((current) => ({ ...current, [key]: current[key].map((row, i) => (i === index ? { ...row, [field]: value } : row)) }));

  // Goals pick an account by its row number, so removing an account row clears those picks.
  const remove = (key: keyof SetupRows, index: number) =>
    setRows((current) => ({
      ...current,
      [key]: current[key].filter((_, i) => i !== index),
      ...(key === "accounts" && { goals: current.goals.map((goal) => ({ ...goal, account: "" })) }),
    }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await finishSetup({ currency, rows }); // on success the action redirects to Overview
      if (result) setErrors(result.errors);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-10">
      <section className="grid gap-2">
        <h2 className="font-serif text-xl">Currency</h2>
        <select aria-label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} className={`${selectClass} max-w-48`}>
          {currencies.map((code) => <option key={code} value={code}>{code} ({currencySymbol(code)})</option>)}
        </select>
        {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
      </section>

      {sections.map((section) => (
        <section key={section.key} className="grid gap-3">
          <div>
            <h2 className="font-serif text-xl">{section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.hint}</p>
          </div>
          {errors[`${section.key}.none`] && <p role="alert" className="text-sm text-destructive">{errors[`${section.key}.none`]}</p>}
          {rows[section.key].map((row, index) => (
            <div key={index} className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
              {section.fields.map((field) => {
                const id = `${section.key}-${index}-${field.name}`;
                const error = errors[`${section.key}.${index}.${field.name}`];
                const value = row[field.name] ?? "";
                return (
                  <div key={field.name} className="grid gap-2">
                    <Label htmlFor={id}>{field.kind === "money" ? `${field.label} (${currencySymbol(currency)})` : field.label}</Label>
                    {field.kind === "direction" ? (
                      <select id={id} value={value} onChange={(event) => change(section.key, index, field.name, event.target.value)} className={selectClass}>
                        {Object.entries(directionLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                      </select>
                    ) : field.kind === "repeat" ? (
                      <select id={id} value={value} onChange={(event) => change(section.key, index, field.name, event.target.value)} className={selectClass}>
                        {Object.entries(repeatLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                      </select>
                    ) : field.kind === "account" ? (
                      <select id={id} value={value} onChange={(event) => change(section.key, index, field.name, event.target.value)} aria-invalid={!!error} className={selectClass}>
                        <option value="">Pick an account</option>
                        {rows.accounts.map((account, i) => account.name.trim() && <option key={i} value={i}>{account.name}</option>)}
                      </select>
                    ) : (
                      <Input
                        id={id}
                        type={field.kind === "date" ? "date" : "text"}
                        inputMode={field.kind === "money" ? "decimal" : undefined}
                        className={field.kind === "money" ? "tabular-nums" : undefined}
                        placeholder={field.kind === "money" ? "0.00" : field.placeholder}
                        value={value}
                        onChange={(event) => change(section.key, index, field.name, event.target.value)}
                        aria-invalid={!!error}
                      />
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
                );
              })}
              <div className="sm:col-span-2">
                <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${row.name?.trim() || `row ${index + 1}`}`} onClick={() => remove(section.key, index)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setRows((current) => ({ ...current, [section.key]: [...current[section.key], blank(section)] }))}>
              {section.add}
            </Button>
          </div>
        </section>
      ))}

      <div>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Finish setup"}</Button>
      </div>
    </form>
  );
}
