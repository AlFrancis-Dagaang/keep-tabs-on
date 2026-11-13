import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categories, type Category } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { currencies, currencySymbol } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { saveCurrency } from "./actions";
import { CategoryForm, DeleteCategory } from "./category-form";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Currency and categories." />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <div className="grid gap-8">
          <Currency />
          <Categories />
        </div>
      </Suspense>
    </>
  );
}

async function Currency() {
  const { currency } = await getSettings();
  return (
    <section>
      <h2 className="mb-3 font-serif text-xl">Currency</h2>
      <form action={saveCurrency} className="flex items-center gap-3">
        <select name="currency" aria-label="Currency" defaultValue={currency} className="h-9 rounded-md border bg-transparent px-3 text-sm">
          {currencies.map((code) => <option key={code} value={code}>{code} ({currencySymbol(code)})</option>)}
        </select>
        <Button type="submit" size="sm">Save</Button>
      </form>
      <p className="mt-2 text-sm text-muted-foreground">Changes how amounts are shown. It doesn&apos;t convert them.</p>
    </section>
  );
}

async function Categories() {
  const userId = await getUserId();
  const rows = await withUser(userId, (tx) =>
    tx.select({ id: categories.id, name: categories.name, kind: categories.kind })
      .from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name)),
  );
  return (
    <div className="grid gap-8">
      <CategoryTable title="Spending categories" kind="spending" rows={rows.filter((row) => row.kind === "spending")} />
      <CategoryTable title="Income categories" kind="income" rows={rows.filter((row) => row.kind === "income")} />
    </div>
  );
}

function CategoryTable({ title, kind, rows }: { title: string; kind: Category["kind"]; rows: Pick<Category, "id" | "name" | "kind">[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl">{title}</h2>
        <CategoryForm kind={kind} />
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No {kind} categories yet. Add one with Add category.</p>
      ) : (
        <div className="rounded-xl border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="pl-4">{category.name}</TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap">
                    <CategoryForm kind={kind} category={category} />
                    <DeleteCategory category={category} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
