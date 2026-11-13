import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getSettings } from "@/lib/settings";
import { SetupForm } from "./setup-form";

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Set up keep tabs on" description="A few minutes now, and your overview is ready." />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Setup />
      </Suspense>
    </main>
  );
}

async function Setup() {
  const { currency, setupDone } = await getSettings();
  if (setupDone) redirect("/");
  return <SetupForm currency={currency} />;
}
