import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { RowActions } from "@/components/row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { goals } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { goalSetAside } from "@/lib/set-aside";
import { withUser } from "@/lib/db";

import { DeleteGoal, DonePill, GoalForm, GoalProgress, MarkDone } from "./goal-form";
import { formatDate } from "@/lib/money";
import { getMoney } from "@/lib/settings";

export default function GoalsPage() {
  return (
    <Suspense fallback={<LoadingBar />}>
      <Goals />
    </Suspense>
  );
}

async function Goals() {
  const money = await getMoney();
  const userId = await getUserId();
  const rows = await withUser(userId, (tx) => tx
    .select({
      id: goals.id, name: goals.name, target: goals.target, deadline: goals.deadline,
      setAsideBefore: goals.setAsideBefore, note: goals.note, doneAt: goals.doneAt, saved: goalSetAside,
    })
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(sql`${goals.doneAt} is not null`, asc(goals.deadline), asc(goals.createdAt)));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <PageHeader title="Goals" description="What you're saving for.">
        <GoalForm today={today} />
      </PageHeader>
      {rows.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No goals yet. Create one: an emergency fund, a trip, a new phone.</p>
      ) : (
        <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Goal</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* The name's link stretches over the row; the actions cell sits above it so its buttons stay clickable. */}
              {rows.map((row) => (
                <TableRow key={row.id} className="relative">
                  <TableCell className="pl-4">
                    <Link href={`/goals/${row.id}`} className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline">{row.name}</Link>
                    {row.doneAt && <span className="ml-2 align-middle"><DonePill /></span>}
                    <div className="text-sm text-muted-foreground tabular-nums">{money(row.target)}</div>
                    <div className="text-sm text-muted-foreground">{row.note}</div>
                  </TableCell>
                  <TableCell data-label="Deadline" className="tabular-nums">{formatDate(row.deadline)}</TableCell>
                  <TableCell data-label="Saved">
                    <GoalProgress name={row.name} saved={row.saved} target={row.target} />
                    <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                      {money(row.saved)} of {money(row.target)}
                    </div>
                  </TableCell>
                  <TableCell data-card="actions" className="relative z-10 pr-4 text-right whitespace-nowrap">
                    <RowActions items={[{ label: "Done", node: <MarkDone id={row.id} done={!!row.doneAt} /> }, { label: "Edit", node: <GoalForm today={today} goal={row} /> }, { label: "Remove", node: <DeleteGoal id={row.id} name={row.name} /> }]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
