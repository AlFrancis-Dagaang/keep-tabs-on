import { PageHeader } from "@/components/page-header";

export default function BudgetPage() {
  return (
    <>
      <PageHeader title="Budget" description="This month's spending against your limits." />
      <p className="text-muted-foreground">Coming in T-07.</p>
    </>
  );
}
