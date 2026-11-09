import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/lib/auth/server";
import { withUser } from "@/lib/db";

export default function OverviewPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl">Overview</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <SignedInUser />
      </Suspense>
    </main>
  );
}

async function SignedInUser() {
  await connection(); // render per request, so Neon Auth never reads cookies during prerender
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  // shortcut: T-01 proof that the app connects as the restricted role with the user's claims; replace in T-02.
  const { rows } = await withUser(session.user.id, (tx) =>
    tx.execute<{ role: string; bypass_rls: boolean; sub: string }>(sql`
      select current_user as role,
        (select rolbypassrls from pg_roles where rolname = current_user) as bypass_rls,
        current_setting('request.jwt.claims', true)::json->>'sub' as sub`),
  );
  const db = rows[0];

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <dt>Signed in as</dt>
      <dd>{session.user.email}</dd>
      <dt>Database role</dt>
      <dd>{db.role}</dd>
      <dt>Bypasses RLS</dt>
      <dd>{String(db.bypass_rls)}</dd>
      <dt>Claims user id matches</dt>
      <dd>{String(db.sub === session.user.id)}</dd>
    </dl>
  );
}
