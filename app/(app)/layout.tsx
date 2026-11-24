import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { AddEntryFab } from "@/components/add-entry-fab";
import { AppSidebar } from "@/components/app-sidebar";
import { CurrencyProvider } from "@/components/currency-provider";
import { FloatingInsights } from "@/components/floating-insights";
import { LoadingBar } from "@/components/loading-bar";
import { MobileNav } from "@/components/mobile-nav";
import { getSettings } from "@/lib/settings";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen md:flex-row">
      <AppSidebar />
      <MobileNav />
      <FloatingInsights />
      {/* min-w-0 lets wide tables scroll inside their panel instead of widening the page; pb-24 clears the phone tab bar */}
      <main className="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-10 md:py-10">
        <Suspense fallback={<LoadingBar />}>
          <SetupGate>{children}</SetupGate>
        </Suspense>
      </main>
    </div>
  );
}

// New users go to setup first; everyone else gets their currency for the client components.
async function SetupGate({ children }: { children: ReactNode }) {
  const { currency, setupDone } = await getSettings();
  if (!setupDone) redirect("/setup");
  return (
    <CurrencyProvider currency={currency}>
      {children}
      <Suspense>
        <AddEntryFab />
      </Suspense>
    </CurrencyProvider>
  );
}
