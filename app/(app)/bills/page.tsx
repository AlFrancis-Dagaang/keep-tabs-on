import { PageHeader } from "@/components/page-header";

export default function BillsPage() {
  return (
    <>
      <PageHeader title="Recurring bills" description="What's due, and what's paid this cycle." />
      <p className="text-muted-foreground">Coming in T-04.</p>
    </>
  );
}
